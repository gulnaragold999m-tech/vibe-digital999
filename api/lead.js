/**
 * Обработка заявки с сайта.
 * Токены берутся из переменных окружения и никогда не уходят в браузер.
 *
 * ТРИ КАНАЛА, И ПОРЯДОК ВАЖЕН: заявка сначала пишется на диск, и только
 * потом уходит в Telegram и ВКонтакте — одновременно, независимо друг
 * от друга. Раньше диска не было вовсе, и Telegram оставался единственным
 * каналом. 03.08.2026 он перестал принимать сообщения, и каждая заявка
 * исчезала бесследно: человек видел ошибку и уходил, а мы не узнавали
 * даже о том, что он приходил.
 *
 * Теперь потеря доставки — это неудобство, а не потеря клиента.
 */

const fs = require('fs');
const path = require('path');
const { sendVkToOwner, vkConfigured } = require('./vk');

const TELEGRAM_API = 'https://api.telegram.org';

/* Amvera монтирует постоянное хранилище в /data (см. amvera.yaml):
   пересборка приложения его не стирает. Локально такого пути нет,
   поэтому при разработке пишем рядом с проектом. */
const DATA_DIR = fs.existsSync('/data') ? '/data' : path.join(__dirname, '..', '.leads');
const LEADS_FILE = path.join(DATA_DIR, 'leads.jsonl');

/**
 * Пишет заявку на диск. Формат JSONL — одна заявка на строку:
 * файл можно дописывать одной операцией, он не ломается при обрыве
 * записи и читается любым инструментом, вплоть до Блокнота.
 *
 * Ошибку записи не пробрасываем наверх: если диск недоступен, заявка
 * всё равно должна попытаться уйти в Telegram. Два независимых канала
 * и нужны для того, чтобы отказ одного не уносил второй.
 *
 * @returns {boolean} удалось ли сохранить
 */
function saveLead(entry) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(LEADS_FILE, JSON.stringify(entry) + '\n', 'utf8');
    return true;
  } catch (err) {
    console.error('[lead] Не удалось записать заявку на диск:', err.message);
    return false;
  }
}

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

/** Экранируем символы, которые ломают разметку Telegram. */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function handleLead(req, res) {
  const token = process.env.BOT_TOKEN;
  const chatId = process.env.CHAT_ID;

  const name = clean(req.body?.name, 100);
  const contact = clean(req.body?.contact, 100);
  const service = clean(req.body?.service, 100) || 'Не указана';
  const comment = clean(req.body?.comment, 1500);

  if (!name || !contact) {
    return res.status(400).json({ ok: false, error: 'Заполните имя и контакт' });
  }

  /* Бот общий с Гранат, поэтому метка источника обязательна:
     иначе в одном чате смешаются заявки двух разных бизнесов. */
  const site = process.env.SITE_NAME || 'vibe-digital999.ru';

  /* ── Шаг 1: сохранить. Раньше всего остального ──────────────────
     Проверку токена намеренно сдвинули НИЖЕ записи на диск: если
     переменные окружения слетели, заявка всё равно должна уцелеть.
     Раньше при пустом токене обработчик выходил сразу, и человек,
     заполнивший форму, исчезал вместе с ней. */
  const saved = saveLead({
    at: new Date().toISOString(),
    site,
    name,
    contact,
    service,
    comment: comment || null,
    /* Откуда пришёл — пригодится, когда будем считать,
       какая реклама приводит клиентов, а какая жжёт бюджет. */
    referer: clean(req.headers?.referer, 300) || null,
    delivered: false,     // проставим true, если примет хотя бы один канал
  });

  /* Один и тот же текст в двух видах. В Telegram уходит разметка,
     в ВК её нет вовсе — теги там отобразятся буквально, как «<b>». */
  const lines = [
    ['🔵 ВАЙБКОДИНГ — новая заявка', '🔵 <b>ВАЙБКОДИНГ — новая заявка</b>'],
    [`🌐 ${site}`, `🌐 ${escapeHtml(site)}`],
    ['', ''],
    [`👤 Имя: ${name}`, `👤 Имя: ${escapeHtml(name)}`],
    [`📱 Контакт: ${contact}`, `📱 Контакт: ${escapeHtml(contact)}`],
    [`💼 Услуга: ${service}`, `💼 Услуга: ${escapeHtml(service)}`],
    comment ? [`💬 Комментарий: ${comment}`, `💬 Комментарий: ${escapeHtml(comment)}`] : null,
  ].filter(Boolean);

  const plainText = lines.map(pair => pair[0]).join('\n');
  const htmlText = lines.map(pair => pair[1]).join('\n');

  /* ── Шаг 2: разослать. Каналы независимы ────────────────────────
     Telegram и ВК идут одновременно и ничего не знают друг о друге:
     отказ одного не должен ни задерживать, ни отменять второй.
     Заявка считается доставленной, если её принял хотя бы один. */
  const [tg, vk] = await Promise.all([
    sendTelegram(htmlText, token, chatId),
    vkConfigured() ? sendVkToOwner(plainText) : Promise.resolve({ ok: false, error: 'не подключён' }),
  ]);

  if (tg.ok || vk.ok) {
    markDelivered();
    console.log(`[lead] Заявка принята: ${name} / ${service}`,
      `| Telegram: ${tg.ok ? 'доставлено' : tg.error}`,
      `| ВК: ${vk.ok ? 'доставлено' : vk.error}`);
    return res.json({ ok: true });
  }

  console.error('[lead] Ни один канал не принял заявку.',
    `Telegram: ${tg.error} | ВК: ${vk.error}`);
  return respondSaved(res, saved, name, service);

  /* Отмечаем в файле, что заявка дошла. Отдельной строкой-пометкой,
     а не переписыванием предыдущей: дописать в конец файла — операция
     атомарная, а переписывание середины может порвать файл, если
     приложение остановят в этот момент. */
  function markDelivered() {
    saveLead({ at: new Date().toISOString(), delivered_mark_for: contact, delivered: true });
  }
}

/**
 * Отправка в Telegram.
 *
 * Ошибку не бросаем наверх, а возвращаем описанием: вызывающий код
 * рассылает в два канала сразу и должен узнать судьбу каждого, а не
 * прерваться на первом же отказе.
 *
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function sendTelegram(text, token, chatId) {
  if (!token || !chatId) {
    return { ok: false, error: 'BOT_TOKEN или CHAT_ID не заданы' };
  }

  try {
    const tgRes = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });

    const data = await tgRes.json();

    if (!data.ok) {
      /* Описание от Telegram сохраняем целиком: именно в нём разница между
         «Unauthorized» (не тот токен) и «chat not found» (бот не может
         писать в этот чат, пока ему не нажали «Старт»). Без описания
         причину не отличить, а лечатся они по-разному. */
      return { ok: false, error: `${data.error_code} ${data.description}` };
    }

    return { ok: true };
  } catch (err) {
    const cause = err.cause ? ` (${err.cause.code || err.cause.message})` : '';
    return { ok: false, error: `сбой сети: ${err.message}${cause}` };
  }
}

/**
 * Отвечает браузеру, когда ни один канал не принял заявку.
 *
 * Если заявка на диске — для посетителя всё в порядке: он оставил
 * контакт, контакт у нас, ему ответят. Показывать ошибку значит
 * потерять человека из-за проблемы, к которой он не причастен.
 *
 * Если не сохранилась ни на диск, ни в мессенджеры — вот тогда честная
 * ошибка с запасным каналом связи.
 */
function respondSaved(res, saved, name, service) {
  if (saved) {
    console.warn(`[lead] ⚠ Заявка не ушла ни в Telegram, ни в ВК, но сохранена на диск: ${name} / ${service}. Файл: ${LEADS_FILE}`);
    return res.json({ ok: true });
  }
  console.error(`[lead] ❌ ЗАЯВКА ПОТЕРЯНА — ни Telegram, ни диск: ${name} / ${service}`);
  return res.status(500).json({ ok: false, error: 'Не удалось доставить заявку' });
}

/**
 * Отдаёт сохранённые заявки — чтобы до них можно было добраться,
 * не открывая консоль сервера.
 *
 * ЗАКРЫТО КЛЮЧОМ НАМЕРЕННО. В файле лежат имена и телефоны живых людей:
 * открытый адрес с такими данными — это утечка персональных данных
 * по 152-ФЗ, причём сделанная своими руками.
 *
 * Ключ задаётся переменной окружения LEADS_KEY на Amvera. Пока она
 * не задана, страница не работает вовсе: забыть включить защиту
 * безопаснее, чем забыть её выключить.
 */
function handleLeadsExport(req, res) {
  const key = process.env.LEADS_KEY;

  if (!key) {
    return res.status(404).json({ ok: false, error: 'Не настроено' });
  }
  if (req.query?.key !== key) {
    /* Отвечаем 404, а не 403: не подсказываем тому, кто подбирает ключ,
       что по этому адресу вообще что-то есть. */
    return res.status(404).json({ ok: false, error: 'Не найдено' });
  }

  let lines = [];
  try {
    lines = fs.readFileSync(LEADS_FILE, 'utf8').split('\n').filter(Boolean);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.json({ ok: true, total: 0, leads: [], note: 'Заявок пока нет' });
    }
    console.error('[leads] Не удалось прочитать файл:', err.message);
    return res.status(500).json({ ok: false, error: 'Ошибка чтения' });
  }

  const leads = [];
  const delivered = new Set();

  for (const line of lines) {
    try {
      const item = JSON.parse(line);
      /* Пометки о доставке лежат отдельными строками — собираем их
         в список, а в выдачу они сами по себе не попадают. */
      if (item.delivered_mark_for) { delivered.add(item.delivered_mark_for); continue; }
      leads.push(item);
    } catch (e) { /* битая строка — пропускаем, остальные читаются */ }
  }

  /* Новые сверху: свежая заявка нужнее позавчерашней. */
  leads.reverse();
  for (const lead of leads) lead.delivered = delivered.has(lead.contact);

  const lost = leads.filter(l => !l.delivered).length;
  res.json({ ok: true, total: leads.length, ne_dostavleny: lost, leads });
}

module.exports = { handleLead, handleLeadsExport };
