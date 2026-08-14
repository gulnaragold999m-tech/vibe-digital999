/**
 * Бот в Telegram.
 *
 * Тот же ассистент, что в чате на сайте и во ВКонтакте: тот же промпт,
 * те же вопросы, тот же бриф владельцу. Отличается только дверь, в которую
 * вошёл человек. Мозг один и лежит в api/brief.js — правка там меняет
 * ответы сразу во всех трёх каналах. Три разных промпта неизбежно
 * разъедутся и начнут отвечать по-разному.
 *
 * ── ОТДЕЛЬНЫЙ ТОКЕН, И ЭТО НЕ ПРИХОТЬ ──────────────────────────────
 * Один токен Telegram слушать может только ОДНО приложение. Если два
 * процесса одновременно позовут getUpdates с одним токеном, Telegram
 * ответит 409 Conflict, и перестанут работать оба.
 *
 * Токен @GranatJarvis_bot уже слушает приложение jarvis-bot соседнего
 * проекта. Поэтому здесь нужен СВОЙ бот от @BotFather и своя переменная
 * TG_BOT_TOKEN.
 *
 * При этом BOT_TOKEN (тот же GranatJarvis) продолжает использоваться
 * для отправки заявок владельцу — обычный sendMessage конфликта не даёт,
 * слушать может только один, а писать могут все.
 *
 * ── ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ ───────────────────────────────────────────
 *   TG_BOT_TOKEN — токен бота этого сайта, от @BotFather
 *
 * Переменной нет — модуль молчит, сайт и ВК работают как раньше.
 *
 * ── ПОЧЕМУ LONG POLLING, А НЕ ВЕБХУК ───────────────────────────────
 * Вебхук требует, чтобы Telegram стучался к нам снаружи: отдельный
 * открытый адрес, сертификат и перенастройка при каждом переезде.
 * Long polling работает изнутри и переживает смену хостинга молча.
 */

const { askOnce, findContact, notifyOwner, systemFor } = require('./brief');

const API = 'https://api.telegram.org';
const POLL_TIMEOUT_S = 25;          // сколько Telegram держит запрос открытым
const FETCH_TIMEOUT_MS = 40_000;    // наш предохранитель: чуть больше, чем ждёт Telegram

/* ── Память диалогов ──────────────────────────────────────────────
   Как и в ВК: без истории бот на второй фразе забудет, что человеку
   нужна гостиница, и спросит заново. Хранится в оперативной памяти —
   при перезапуске обнуляется, и это осознанный размен. Бриф с контактом
   к тому моменту уже ушёл владельцу и записан на диск. */
const dialogs = new Map();
const MAX_HISTORY = 20;
const DIALOG_TTL_MS = 6 * 60 * 60 * 1000;
const LIMIT_PER_HOUR = 30;

function getDialog(chatId) {
  const now = Date.now();
  const rec = dialogs.get(chatId);

  if (!rec || now - rec.updatedAt > DIALOG_TTL_MS) {
    const fresh = { messages: [], count: 0, windowStart: now, updatedAt: now };
    dialogs.set(chatId, fresh);
    return fresh;
  }

  if (now - rec.windowStart > 60 * 60 * 1000) {
    rec.count = 0;
    rec.windowStart = now;
  }

  return rec;
}

setInterval(() => {
  const now = Date.now();
  for (const [chatId, rec] of dialogs) {
    if (now - rec.updatedAt > DIALOG_TTL_MS) dialogs.delete(chatId);
  }
}, 60 * 60 * 1000).unref();

/* ── Отправка ─────────────────────────────────────────────────── */

async function tgApi(method, payload) {
  const token = process.env.TG_BOT_TOKEN;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) throw new Error(data.description || `HTTP ${res.status}`);
    return data.result;
  } finally {
    clearTimeout(timer);
  }
}

async function send(chatId, text) {
  return tgApi('sendMessage', {
    chat_id: chatId,
    text,
    /* Разметку не включаем намеренно. Ответ пишет модель, и если в нём
       окажется одиночная звёздочка или подчёркивание — Telegram отвергнет
       всё сообщение целиком, а человек не получит ответа вовсе. Простой
       текст доходит всегда. */
    disable_web_page_preview: true,
  });
}

/* ── Приветствие ──────────────────────────────────────────────────
   Описывает ровно то, что бот сделает следующим шагом, и ничего сверх.
   В соседнем проекте приветствие обещало спросить имя, хотя бот его
   не спрашивал, — человек написал имя и получил приветствие снова.

   Про обработку данных сказано ДО того, как человек назовёт телефон,
   а не кнопкой «согласен». Отдельная кнопка согласия там же обернулась
   петлёй: человек писал «да», бот не засчитывал и здоровался заново. */
const GREETING = [
  'Здравствуйте! Я ассистент студии Vibe Digital 999.',
  '',
  'Расскажите, чем занимается ваш бизнес и что нужно сделать — подберу',
  'формат, назову цену и срок. Если решим работать, передам заявку',
  'Гульнаре, она свяжется с вами сама.',
  '',
  'Оставляя телефон или почту, вы соглашаетесь на обработку этих данных.',
  'Политика: https://vibe-digital999.ru/privacy.html',
].join('\n');

/* ── Обработка одного сообщения ───────────────────────────────── */

async function handleMessage(message) {
  const chatId = message.chat?.id;
  const text = String(message.text || '').trim();

  if (!chatId || !text) return;
  if (message.from?.is_bot) return;          // разговор двух ботов никому не нужен

  /* /start — приветствие и чистый лист. Всё остальное, включая первую
     фразу без команды, идёт прямо в разговор: человек приходит не с
     пустыми руками, он сразу пишет, что ему нужно, и заставлять его
     повторяться — верный способ потерять его на втором сообщении. */
  if (text === '/start') {
    dialogs.delete(chatId);
    await send(chatId, GREETING);
    return;
  }

  const dialog = getDialog(chatId);

  if (dialog.count >= LIMIT_PER_HOUR) {
    console.warn('[tg-bot] Превышен лимит сообщений, чат:', chatId);
    return;
  }
  dialog.count += 1;

  dialog.messages.push({ role: 'user', content: text.slice(0, 2000) });
  dialog.messages = dialog.messages.slice(-MAX_HISTORY);
  dialog.updatedAt = Date.now();

  /* Контакт появился — бриф уходит сразу, не дожидаясь ответа модели.
     Откажет модель — заявка всё равно у нас. */
  const contact = findContact(text);
  if (contact) {
    notifyOwner(dialog.messages, contact, 'tg|' + chatId)
      .catch(err => console.error('[tg-bot] Бриф не ушёл:', err.message));
  }

  /* «Печатает…» — человек видит, что его услышали, и не уходит,
     пока модель думает свои три секунды. */
  tgApi('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});

  try {
    const answer = await askOnce(dialog.messages, systemFor('telegram'));
    if (!answer) throw new Error('модель вернула пустой ответ');

    dialog.messages.push({ role: 'assistant', content: answer });
    dialog.messages = dialog.messages.slice(-MAX_HISTORY);

    await send(chatId, answer);
    console.log(`[tg-bot] Ответ отправлен, чат: ${chatId}`);
  } catch (err) {
    console.error('[tg-bot] Не удалось ответить:', err.message);
    /* Человек не должен остаться в тишине из-за нашей поломки:
       отдаём живые контакты, чтобы разговор не оборвался. */
    await send(chatId,
      'Извините, у меня сейчас сбой. Позвоните на +7 999 244 99 99 ' +
      'или напишите в WhatsApp: https://wa.me/79992449999 — ответим быстро.'
    ).catch(() => {});
  }
}

/* ── Главный цикл ─────────────────────────────────────────────── */

async function loop() {
  let offset = 0;
  let failures = 0;

  while (true) {
    try {
      const updates = await tgApi('getUpdates', {
        offset,
        timeout: POLL_TIMEOUT_S,
        /* Просим только сообщения: без этого Telegram шлёт ещё и правки,
           реакции и прочее, что нам разбирать нечем. */
        allowed_updates: ['message'],
      });

      failures = 0;

      for (const update of updates || []) {
        offset = update.update_id + 1;
        if (!update.message) continue;
        await handleMessage(update.message).catch(err =>
          console.error('[tg-bot] Ошибка обработки сообщения:', err.message));
      }
    } catch (err) {
      failures += 1;

      /* 409 — тот же токен слушает второе приложение. Пауза не поможет,
         поможет только отдельный бот. Говорим об этом прямо, иначе
         в журнале будет бесконечная лента одинаковых ошибок. */
      if (/409|Conflict|terminated by other/i.test(err.message)) {
        console.error(
          '[tg-bot] ❌ 409 Conflict: этот токен уже слушает другое приложение.\n' +
          '         Заведите отдельного бота у @BotFather для этого сайта\n' +
          '         и положите его токен в переменную TG_BOT_TOKEN.\n' +
          '         Бот остановлен, сайт и ВКонтакте продолжают работать.'
        );
        return;                      // дальше опрашивать бессмысленно
      }

      /* Пауза растёт с числом неудач, но не больше минуты. Telegram
         в России ложится регулярно — это норма, а не авария: он вернётся,
         и бот должен продолжить сам, без перезапуска сайта. */
      const pause = Math.min(60_000, 2_000 * failures);
      console.error(`[tg-bot] Сбой (${failures}): ${err.message}. Повтор через ${pause / 1000} с`);
      await new Promise(r => setTimeout(r, pause));
    }
  }
}

/**
 * Запускает бота, если он настроен.
 *
 * НИЧЕГО НЕ ПРОБРАСЫВАЕТ НАВЕРХ. В соседнем проекте ошибка запуска
 * Telegram дошла до верха и остановила процесс — а вместе с ним умер
 * бот ВКонтакте, то есть ровно тот канал, который и заведён на случай
 * смерти Telegram. Здесь всё в одном процессе с сайтом, и цена такой
 * ошибки — весь сайт.
 */
function startTgBot() {
  const token = (process.env.TG_BOT_TOKEN || '').trim();

  if (!token) {
    console.log('[tg-bot] Не настроен (нет TG_BOT_TOKEN) — пропускаем');
    return;
  }

  tgApi('getMe', {})
    .then((me) => {
      console.log(`[tg-bot] Подключился: @${me.username}`);
      return loop();
    })
    .catch((err) => {
      console.error(
        `[tg-bot] Не удалось запустить: ${err.message}\n` +
        '         Сайт и ВКонтакте работают дальше.'
      );
    });
}

module.exports = { startTgBot };
