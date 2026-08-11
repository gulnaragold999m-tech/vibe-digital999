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

/* ── Номер заявки ────────────────────────────────────────────────
   Заявке нужен номер: по нему её ищут в переписке, на неё ссылаются
   в разговоре с клиентом и по нему видно, сколько пришло за месяц.
   Без номера единственный способ сослаться на заявку — «та, где про
   гостиницу», и это работает ровно до второй гостиницы.

   Счётчик лежит отдельным файлом на том же постоянном диске. Если файл
   потеряется, номер восстанавливается пересчётом строк в leads.jsonl —
   поэтому нумерация не начнётся заново с единицы после сбоя.

   Синхронные операции здесь намеренно: заявок единицы в день, а гонка
   за номером при асинхронной записи дала бы двум заявкам один номер. */
const COUNTER_FILE = path.join(DATA_DIR, 'lead-counter.json');

function nextLeadNumber() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });

    let last = 0;
    try {
      last = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8')).last || 0;
    } catch (e) {
      /* Счётчика нет — первый запуск или файл потеряли. Восстанавливаем
         по журналу заявок, чтобы не начать нумерацию заново. */
      try {
        const lines = fs.readFileSync(LEADS_FILE, 'utf8').split('\n').filter(Boolean);
        last = lines.filter((l) => !l.includes('delivered_mark_for')).length;
      } catch (e2) { last = 0; }
    }

    const num = last + 1;
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ last: num }), 'utf8');
    return num;
  } catch (err) {
    console.error('[lead] Счётчик недоступен:', err.message);
    return null;      // без номера заявка всё равно уйдёт
  }
}

/* ── Заметки к заявке ────────────────────────────────────────────
   Не скоринг и не отказ. Автоматически отклонять заявку по тому, как
   человек пишет, — верный способ потерять живого заказчика: половина
   малого бизнеса пишет коротко, голосовыми и без запятых, и платит
   ровно так же, как тот, кто прислал ТЗ в Notion.

   Поэтому здесь только пометки: что в заявке есть, а чего не хватает.
   Решение принимает человек, видя те же данные, что и раньше. */
function leadNotes({ comment, contact }) {
  const notes = [];
  const text = comment.toLowerCase();

  if (!comment) notes.push('задача не описана — спросить первым делом');
  else if (comment.length < 40) notes.push('описание короткое');

  if (/\d[\d\s]{2,}\s*(₽|р\b|руб|тыс|к\b)|бюджет|до \d+/i.test(comment)) {
    notes.push('назван бюджет');
  }
  /* Месяцы ловим по корню слова: «к сентябрю», «в сентябре», «до сентября» —
     одна и та же мысль в трёх падежах, и человек пишет любым из них. */
  if (/срочно|как можно скорее|горит|поскорее|вчера|дедлайн|недел|месяц|январ|феврал|март|апрел|ма[йея]|июн|июл|август|сентябр|октябр|ноябр|декабр|\bк \d|\bдо \d/i.test(text)) {
    notes.push('назван срок');
  }
  if (/^\+?[78]/.test(contact.replace(/[\s()-]/g, ''))) notes.push('контакт — телефон');
  else if (contact.startsWith('@')) notes.push('контакт — Telegram');
  else if (contact.includes('@')) notes.push('контакт — почта');

  return notes;
}

/** Читаем рекламные метки из адреса страницы, с которой пришла заявка. */
function utmFrom(pageUrl) {
  const q = pageUrl.split('?')[1];
  if (!q) return '';
  const p = new URLSearchParams(q);
  const parts = [p.get('utm_source'), p.get('utm_medium'), p.get('utm_campaign')]
    .filter(Boolean);
  return parts.join(' / ');
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
  /* Город человек пишет сам. В Яндекс Бизнесе меток из рекламы нет,
     и это единственный честный ответ на вопрос, какой регион приносит
     заявки. Поле необязательное: пустое оно ничего не ломает. */
  const city = clean(req.body?.city, 80);

  /* Кто вписал город. 'ip' — подставило определение по интернет-адресу,
     'user' — написал человек (или подтвердил подставленное, начав править).

     Разница не косметическая. Определение по IP на мобильном интернете
     показывает город опорной сети оператора, через VPN — вообще другой
     регион. Заявка «Краснодар», которую никто не подтвердил, — это
     догадка сервиса, и звонить по ней с «вы же из Краснодара» нельзя.
     В сообщении такой город помечен отдельно. */
  const citySource = clean(req.body?.city_source, 10) === 'ip' ? 'ip' : 'user';
  const cityGuessed = Boolean(city) && citySource === 'ip';

  /* Пакет. Приходит только если человек нажал кнопку пакета на /pakety/ —
     то есть сам отнёс себя к масштабу, ничего не подтверждая. Пустое поле
     означает «не знаем», и это честнее догадки.

     Масштаб пишем словами про команду, а не «малый бизнес»: у ФНС малый —
     это от 16 человек, и назвать так салон из пяти мастеров значит
     сбить с толку и себя, и клиента. */
  const pkg = clean(req.body?.package, 40);
  const segment = clean(req.body?.segment, 80);
  const pkgParts = clean(req.body?.package_parts, 120);

  if (!name || !contact) {
    return res.status(400).json({ ok: false, error: 'Заполните имя и контакт' });
  }

  /* Адрес страницы, с которой отправили форму. Присылает браузер: сервер
     сам его не знает — заголовок referer показывает предыдущую страницу,
     а не текущую, и рекламных меток в нём может не быть вовсе. */
  const page = clean(req.body?.page, 300);

  /* Бот общий с Гранат, поэтому метка источника обязательна:
     иначе в одном чате смешаются заявки двух разных бизнесов. */
  const site = process.env.SITE_NAME || 'vibe-digital999.ru';

  const num = nextLeadNumber();
  const notes = leadNotes({ comment, contact });
  const utm = utmFrom(page);

  /* ── Шаг 1: сохранить. Раньше всего остального ──────────────────
     Проверку токена намеренно сдвинули НИЖЕ записи на диск: если
     переменные окружения слетели, заявка всё равно должна уцелеть.
     Раньше при пустом токене обработчик выходил сразу, и человек,
     заполнивший форму, исчезал вместе с ней. */
  const saved = saveLead({
    at: new Date().toISOString(),
    num,
    site,
    name,
    contact,
    service,
    comment: comment || null,
    city: city || null,
    city_source: city ? citySource : null,
    package: pkg || null,
    segment: segment || null,
    package_parts: pkgParts || null,
    /* Страница и рекламные метки. По ним потом видно, какая страница
       и какая реклама приводят клиентов, а какая жжёт бюджет. */
    page: page || null,
    utm: utm || null,
    notes,
    referer: clean(req.headers?.referer, 300) || null,
    delivered: false,     // проставим true, если примет хотя бы один канал
  });

  /* Один и тот же текст в двух видах. В Telegram уходит разметка,
     в ВК её нет вовсе — теги там отобразятся буквально, как «<b>».

     Порядок строк — по тому, в каком порядке это нужно читать: сначала
     кто и как с ним связаться, потом что нужно, и только в конце откуда
     пришёл. Контекст важен, но он для разбора, а не для ответа. */
  const head = num ? `🔵 ВАЙБКОДИНГ — заявка № ${num}` : '🔵 ВАЙБКОДИНГ — новая заявка';
  const lines = [
    [head, `🔵 <b>${escapeHtml(head.replace('🔵 ', ''))}</b>`],
    [`🌐 ${site}`, `🌐 ${escapeHtml(site)}`],
    ['', ''],
    [`👤 Имя: ${name}`, `👤 Имя: ${escapeHtml(name)}`],
    [`📱 Контакт: ${contact}`, `📱 Контакт: ${escapeHtml(contact)}`],
    /* Пакет вместо услуги: строка «Услуга: Пакет «Поток»» и строка
       «Пакет: Поток» рядом — это одно и то же дважды. */
    pkg ? null : [`💼 Услуга: ${service}`, `💼 Услуга: ${escapeHtml(service)}`],
    pkg ? [`🏷 Пакет: ${pkg}`, `🏷 Пакет: ${escapeHtml(pkg)}`] : null,
    pkg && segment ? [`🏢 Ориентир масштаба: ${segment}`, `🏢 Ориентир масштаба: ${escapeHtml(segment)}`] : null,
    pkg && pkgParts ? [`🧩 Состав: ${pkgParts}`, `🧩 Состав: ${escapeHtml(pkgParts)}`] : null,
    city ? [
      `📍 Город: ${city}${cityGuessed ? ' (определён по IP, не подтверждён)' : ''}`,
      `📍 Город: ${escapeHtml(city)}${cityGuessed ? ' <i>(определён по IP, не подтверждён)</i>' : ''}`,
    ] : null,
    comment ? [`💬 Задача: ${comment}`, `💬 Задача: ${escapeHtml(comment)}`] : null,
    ['', ''],
    page ? [`📄 Страница: ${page}`, `📄 Страница: ${escapeHtml(page)}`] : null,
    utm ? [`📣 Реклама: ${utm}`, `📣 Реклама: ${escapeHtml(utm)}`] : null,
    notes.length ? [`🔎 Заметки: ${notes.join(' · ')}`, `🔎 Заметки: ${escapeHtml(notes.join(' · '))}`] : null,
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
    console.log(`[lead] Заявка № ${num ?? "—"} принята: ${name} / ${service}`,
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
  res.json({
    ok: true,
    total: leads.length,
    ne_dostavleny: lost,
    svodka: summarize(leads),
    leads,
  });
}

/* ── Сводка по заявкам ───────────────────────────────────────────
   Список заявок отвечает на вопрос «что пришло», но не на вопрос
   «откуда идут клиенты». А именно он и решает, куда вести рекламу:
   реклама идёт на три очень разных региона, и без разбивки по городам
   деньги делятся вслепую.

   Считаем прямо здесь, а не отдельной таблицей: заявок единицы в день,
   пересчитать весь файл дешевле, чем поддерживать вторую копию цифр,
   которая рано или поздно разойдётся с первой.

   Города НЕ приводим к общему виду. «Пятигорск» и «пятигорск» —
   один город, а вот «Мин-Воды» и «Минеральные Воды» свести автоматически
   нельзя, не начав угадывать. Приводим регистр и убираем пробелы;
   остальное человек увидит глазами и не перепутает. */
function countBy(items, pick) {
  const map = new Map();
  for (const item of items) {
    const key = pick(item);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  /* От частого к редкому: первым идёт то, что приносит больше всего. */
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1]));
}

function summarize(leads) {
  const cityName = (l) => {
    const c = String(l.city || '').trim();
    if (!c) return '';
    /* Город, определённый по IP и не подтверждённый человеком, помечаем.
       Иначе в сводке догадка сервиса встанет рядом с ответом клиента,
       и по ней будут принимать решения о рекламном бюджете. */
    const name = c[0].toUpperCase() + c.slice(1).toLowerCase();
    return l.city_source === 'ip' ? name + ' (не подтверждён)' : name;
  };

  const month = (l) => String(l.at || '').slice(0, 7);   // 2026-08

  return {
    po_gorodam: countBy(leads, cityName),
    bez_goroda: leads.filter((l) => !l.city).length,
    po_uslugam: countBy(leads, (l) => l.package
      ? `Пакет «${l.package}»`
      : (l.service || '')),
    po_kanalu: countBy(leads, (l) => (l.source === 'chat' ? 'Чат на сайте' : 'Форма')),
    po_reklame: countBy(leads, (l) => l.utm || ''),
    po_mesyacam: countBy(leads, month),
  };
}

/* saveLead и nextLeadNumber отдаём наружу для брифов из чата.
   Разговор в чате — такая же заявка: ей нужен тот же номер из общего
   счётчика и та же запись на диск раньше отправки. Иначе счёт заявок
   за месяц не видит чат вовсе, а при отказе мессенджеров разговор
   с живым человеком пропадает бесследно. */
module.exports = { handleLead, handleLeadsExport, saveLead, nextLeadNumber, leadNotes };
