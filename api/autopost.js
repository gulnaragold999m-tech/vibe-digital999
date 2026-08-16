/**
 * Автопостинг на стену сообщества ВКонтакте по расписанию.
 *
 * ЗАЧЕМ ЗДЕСЬ, А НЕ В «ГЕНЕРАЛЕ». Первая версия расписания писалась под
 * телеграм-бота: и публикация в каналы, и доклады владелице шли туда.
 * У Гульнары Telegram не открывается — это записано в `STATUS.md`, раздел
 * «Чего ещё НЕТ». Значит, канал управления не должен зависеть от Telegram
 * вообще. Здесь всё стоит на том, что уже работает и проверено живьём:
 * ВК для публикации, ВК и почта — для докладов.
 *
 * ЧТО ДЕЛАЕТ. Раз в полминуты сверяется с планом постов и публикует то,
 * чему подошёл срок. План — обычный JSON, тот самый, что утверждается
 * в воскресенье.
 *
 * ПРАВИЛА, ПО КОТОРЫМ ЭТО РАБОТАЕТ:
 *   · публикуется только помеченное `"approved": true` — бот не сочиняет
 *     на ходу и не постит непрочитанное;
 *   · один пост уходит ровно один раз: перезапуск приложения при выкатке
 *     этого не ломает, память лежит на постоянном диске;
 *   · если приложение лежало и слот проспан больше чем на полтора часа,
 *     пост не выходит задним числом — утренний пост, вышедший в обед,
 *     выглядит как сбой. Вместо публикации приходит доклад;
 *   · любой сбой уходит докладом, а не в тишину.
 *
 * ДВА СООБЩЕСТВА. Агентство (240607590) и типография Гранат (238836731)
 * публикуются каждое своим ключом. У поста Гранат в плане стоит
 * `"vk_group": "granat"`, у остальных пометки нет.
 *
 * ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ (Amvera → Настройки → Переменные окружения):
 *   VK_TOKEN         — ключ сообщества агентства. Нужны права «Стена»
 *                      и «Фотографии»: ключ с одними «Сообщениями
 *                      сообщества» вернёт ошибку 15.
 *   VK_GROUP_ID      — номер сообщества агентства, без минуса.
 *   VK_TOKEN_GRANAT  — ОТДЕЛЬНЫЙ ключ сообщества Гранат. Не пересоздавайте
 *                      ключ тамошнего бота: старый умрёт, и бот замолчит.
 *                      Заведите второй ключ, права те же — «Стена»
 *                      и «Фотографии».
 *   VK_GROUP_ID_GRANAT — 238836731
 *   AUTOPOST        — "on", чтобы расписание работало. По умолчанию
 *                     выключено: выкатка не должна начать публиковать
 *                     сама по себе.
 *   AUTOPOST_PLAN   — путь к плану, по умолчанию /data/plan.json
 *   AUTOPOST_STATE  — что уже опубликовано, по умолчанию
 *                     /data/autopost-state.json
 *
 * Доклады идут владелице в ВК (`sendVkToOwner`) и на почту
 * (`sendMailToOwner`) — какой канал настроен, тот и сработает.
 */

const fs = require('fs');
const path = require('path');

const { vkApi, vkConfigured, sendVkToOwner } = require('./vk');
const { sendMailToOwner, mailConfigured } = require('./mail');

/* В России нет перевода часов с 2014 года, поэтому Москва — ровно UTC+3.
   Библиотека часовых поясов ради одного смещения не нужна. */
const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

const PLAN_PATH = process.env.AUTOPOST_PLAN || '/data/plan.json';
const STATE_PATH = process.env.AUTOPOST_STATE || '/data/autopost-state.json';

const TICK_MS = 30 * 1000;
const LATE_LIMIT_MS = 90 * 60 * 1000;
const MAX_TRIES = 3;

/**
 * Включено ли расписание и есть ли чем публиковать.
 *
 * Намеренно НЕ проверяем `VK_PEER_ID`: он про доклады владелице, а не про
 * публикацию. Иначе расписание молча не поднималось бы из-за переменной,
 * которая к постам отношения не имеет.
 */
function autopostConfigured() {
  return (
    process.env.AUTOPOST === 'on' &&
    Boolean(process.env.VK_TOKEN) &&
    Boolean(process.env.VK_GROUP_ID)
  );
}

// ------------------------------------------------------------------ план и память

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

/* План в репозитории — только заготовка для первого запуска. Живёт он
   на постоянном диске: там его можно править между выкатками, чтобы
   утвердить пост за минуту до слота, не пересобирая сайт. */
const PLAN_SEED = path.join(__dirname, '..', 'content', 'plan.json');

function seedPlanIfMissing() {
  if (fs.existsSync(PLAN_PATH) || !fs.existsSync(PLAN_SEED)) return;
  try {
    fs.mkdirSync(path.dirname(PLAN_PATH), { recursive: true });
    fs.copyFileSync(PLAN_SEED, PLAN_PATH);
    console.log('[autopost] План скопирован из репозитория в', PLAN_PATH);
  } catch (err) {
    console.error('[autopost] не удалось положить план на диск:', err.message);
  }
}

function loadPlan() {
  const plan = readJson(PLAN_PATH, { posts: [] });
  return Array.isArray(plan.posts) ? plan.posts : [];
}

function loadState() {
  const state = readJson(STATE_PATH, {});
  return { published: state.published || {}, tries: state.tries || {} };
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  const tmp = `${STATE_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  /* Через временный файл: перезапуск при выкатке не должен застать
     память недописанной, иначе пост уйдёт вторым заходом. */
  fs.renameSync(tmp, STATE_PATH);
}

// ------------------------------------------------------------------ время слота

/** Время слота «2026-08-17 13:00» по Москве в миллисекундах. */
function slotTime(when) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(String(when || '').trim());
  if (!m) return NaN;
  const [, y, mo, d, h, mi] = m.map(Number);
  return Date.UTC(y, mo - 1, d, h, mi) - MSK_OFFSET_MS;
}

function mskLabel(ms) {
  return new Date(ms + MSK_OFFSET_MS).toISOString().slice(0, 16).replace('T', ' ');
}

// ------------------------------------------------------------------ доклады

/** Пишет владелице во все настроенные каналы. Молчание — не вариант. */
async function report(subject, text) {
  const full = `${subject}\n\n${text}`;
  const results = [];

  if (vkConfigured() && process.env.VK_PEER_ID) {
    results.push(sendVkToOwner(full).catch((err) => console.error('[autopost] ВК-доклад не ушёл:', err.message)));
  }
  if (mailConfigured()) {
    results.push(sendMailToOwner(subject, text).catch((err) => console.error('[autopost] письмо не ушло:', err.message)));
  }

  if (results.length === 0) console.warn('[autopost] доклад некуда слать:', subject);
  await Promise.all(results);
}

// ------------------------------------------------------------------ публикация

/** Текст под площадку: строкой — общий, словарём — свой на каждую. */
function textFor(post) {
  const body = post.text;
  if (body && typeof body === 'object') return body.vk || body.default || '';
  return typeof body === 'string' ? body : '';
}

/**
 * Куда публиковать этот пост: сообщество и ключ к нему.
 *
 * У поста может стоять `"vk_group": "granat"` — тогда берём переменные
 * `VK_GROUP_ID_GRANAT` и `VK_TOKEN_GRANAT`. Без пометки — сообщество
 * агентства из `VK_GROUP_ID`.
 *
 * Если названного сообщества в переменных нет, возвращаем null и пост
 * НЕ публикуется. Это важнее, чем «опубликовать хоть куда-то»: пост
 * типографии, уехавший в сообщество агентства, придётся удалять руками,
 * а подписчики его уже увидят.
 */
function targetFor(post) {
  const name = post.vk_group ? String(post.vk_group).toUpperCase().replace(/[^A-Z0-9]+/g, '_') : '';
  const groupId = name ? process.env[`VK_GROUP_ID_${name}`] : process.env.VK_GROUP_ID;
  const token = name ? process.env[`VK_TOKEN_${name}`] : process.env.VK_TOKEN;

  if (!groupId || !token) return null;
  return { groupId: String(groupId).replace(/^-/, ''), token, name: name || 'основное' };
}

/** Вызов ВК с разбором ответа: vkApi не бросает, он возвращает {ok}. */
async function call(method, params, token) {
  const res = await vkApi(method, params, token);
  if (!res.ok) throw new Error(res.error || `метод ${method} не выполнен`);
  return res.response;
}

/**
 * Публикует запись от имени сообщества. Возвращает ссылку на пост.
 * Картинка необязательна: пост без неё уходит текстом.
 */
async function publishToVk(post, target) {
  const params = {
    owner_id: `-${target.groupId}`,
    from_group: 1,
    message: textFor(post).slice(0, 16000),
  };

  if (post.image) {
    const file = path.isAbsolute(post.image)
      ? post.image
      : path.join(path.dirname(PLAN_PATH), post.image);
    params.attachments = await uploadPhoto(target, file);
  }

  const res = await call('wall.post', params, target.token);
  return `https://vk.com/wall-${target.groupId}_${res.post_id}`;
}

/** Загружает картинку на стену и возвращает строку вложения photo-123_456. */
async function uploadPhoto(target, file) {
  if (!fs.existsSync(file)) throw new Error(`картинки нет на диске: ${file}`);

  const server = await call('photos.getWallUploadServer', { group_id: target.groupId }, target.token);

  const form = new FormData();
  form.append('photo', new Blob([fs.readFileSync(file)]), path.basename(file));
  const uploaded = await (await fetch(server.upload_url, { method: 'POST', body: form })).json();

  if (!uploaded.photo || uploaded.photo === '[]') {
    throw new Error('ВКонтакте не принял картинку: нужен JPG или PNG до 50 МБ');
  }

  const saved = await call(
    'photos.saveWallPhoto',
    { group_id: target.groupId, server: uploaded.server, photo: uploaded.photo, hash: uploaded.hash },
    target.token,
  );
  return `photo${saved[0].owner_id}_${saved[0].id}`;
}

// ------------------------------------------------------------------ один проход

async function tick(now = Date.now()) {
  const state = loadState();
  let changed = false;

  for (const post of loadPlan()) {
    const id = post.id;
    const when = slotTime(post.when);
    if (!id || Number.isNaN(when)) continue;

    const done = state.published[id] || {};
    if (done.vk) continue;

    /* Поле `platforms` уважаем строго: в плане лежат и посты типографии,
       у которых свой канал. Пост без пометки «vk» здесь не наш — молча
       пропускаем, без докладов о пропущенном слоте. */
    const platforms = Array.isArray(post.platforms) ? post.platforms : ['vk'];
    if (!platforms.includes('vk')) continue;

    if (now >= when + LATE_LIMIT_MS) {
      if (!done.skipped) {
        await report(
          `Пропущен слот ${post.when}`,
          `Пост ${id} не вышел: приложение проспало слот больше чем на полтора часа.\n` +
            'Задним числом не публикую. Решите сами — перенести на свободный слот или отменить.',
        );
        state.published[id] = { ...done, skipped: true };
        changed = true;
      }
      continue;
    }

    if (now < when) continue;

    if (!post.approved) {
      if (!done.unapproved) {
        await report(
          `Слот ${post.when}: пост не утверждён`,
          `Пост ${id} стоит в плане, но у него не проставлено "approved": true. Не публикую.`,
        );
        state.published[id] = { ...done, unapproved: true };
        changed = true;
      }
      continue;
    }

    const body = textFor(post);
    if (!body.trim()) {
      await report(`Пост ${id} без текста`, 'В плане у поста пустой текст для ВКонтакте.');
      state.published[id] = { ...done, skipped: true };
      changed = true;
      continue;
    }

    const target = targetFor(post);
    if (!target) {
      if (!done.noTarget) {
        await report(
          `Пост ${id}: некуда публиковать`,
          `В плане указано сообщество «${post.vk_group}», но в переменных окружения ` +
            `нет пары VK_GROUP_ID_${String(post.vk_group).toUpperCase()} и VK_TOKEN_${String(post.vk_group).toUpperCase()}.\n\n` +
            'В чужое сообщество не публикую — удалять оттуда пришлось бы руками.',
        );
        state.published[id] = { ...done, noTarget: true };
        changed = true;
      }
      continue;
    }

    try {
      const link = await publishToVk(post, target);
      state.published[id] = { ...done, vk: link, at: mskLabel(now) };
      delete state.tries[id];
      changed = true;
      await report(`Опубликовано · ${post.when}`, link);
    } catch (err) {
      const tries = (state.tries[id] || 0) + 1;
      state.tries[id] = tries;
      changed = true;

      /* Временные сбои — сеть, флуд-контроль, «слишком много запросов» —
         повторяем молча. Докладываем, только когда попытки исчерпаны:
         иначе каждая моргнувшая сеть будит владелицу. */
      const transient = /1|6|9|сеть|network|fetch/i.test(err.message) && tries < MAX_TRIES;
      if (!transient) {
        await report(
          `Сбой публикации · ${post.when}`,
          `Пост: ${id}\nЧто случилось: ${err.message}\n\n` +
            'Частые причины: у ключа нет права «Стена», ключ сервисный вместо ключа ' +
            'сообщества, или стена закрыта в настройках сообщества.\n\n' +
            'Этот пост не опубликован, остальные идут своим чередом.',
        );
      }
    }
  }

  if (changed) saveState(state);
}

// ------------------------------------------------------------------ запуск

/** Поднимает расписание. Вызывать один раз при старте сервера. */
function startAutopost() {
  if (!autopostConfigured()) {
    console.log('[autopost] Выключен (нет AUTOPOST=on, VK_TOKEN или VK_GROUP_ID)');
    return null;
  }

  seedPlanIfMissing();
  console.log('[autopost] Расписание работает, план:', PLAN_PATH);

  const timer = setInterval(() => {
    tick().catch((err) => console.error('[autopost] проход споткнулся:', err));
  }, TICK_MS);

  timer.unref();
  return timer;
}

module.exports = { startAutopost, autopostConfigured, tick, slotTime, textFor, targetFor };
