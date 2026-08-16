/**
 * Разбор болей целевой аудитории по открытым сообществам ВКонтакте.
 *
 * ЗАЧЕМ. Посты, написанные «из головы», попадают в боль случайно. Здесь
 * боли берутся из того, что люди пишут сами: вопросы и жалобы в открытых
 * сообществах конкурентов и профильных пабликах КМВ. Раз в сутки модуль
 * читает свежие записи и комментарии, отдаёт их модели и получает список
 * болей с живыми цитатами. Дальше это — сырьё для недельного плана.
 *
 * ЧТО ЭТО НЕ ДЕЛАЕТ. Не публикует, не пишет людям, не собирает базу
 * подписчиков. Только читает открытое и складывает обезличенный текст.
 *
 * ПРО 152-ФЗ. Авторы не сохраняются: ни имени, ни id, ни ссылки на
 * страницу. В файл попадает только текст без опознавательных знаков —
 * это уже не персональные данные, а материал для анализа. Так и должно
 * остаться: если однажды понадобится «а кто это написал», ответ —
 * не храним намеренно.
 *
 * ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ:
 *   PARSE_GROUPS       — что читаем, через запятую. Короткий адрес или
 *                        номер: "granat_kmv, club123456789, 987654321".
 *                        Пусто — модуль спит и ничего не делает.
 *   PARSE_EVERY_HOURS  — как часто, по умолчанию 24.
 *   PARSE_POSTS        — сколько последних записей брать, по умолчанию 20.
 *   BOLI_PATH          — куда складывать, по умолчанию /data/boli.json
 *   VK_TOKEN           — ключ для чтения. Чужие ОТКРЫТЫЕ сообщества
 *                        читаются любым ключом сообщества; отдельных прав
 *                        на чтение чужой стены не нужно.
 *   LLM_API_KEY и прочее — те же, на которых работает брифер чата.
 */

const fs = require('fs');
const path = require('path');

const { vkApi, vkConfigured, sendVkToOwner } = require('./vk');
const { sendMailToOwner, mailConfigured } = require('./mail');
const { askOnce } = require('./brief');

const BOLI_PATH = process.env.BOLI_PATH || '/data/boli.json';
const POSTS_PER_GROUP = Number(process.env.PARSE_POSTS) || 20;
const EVERY_MS = (Number(process.env.PARSE_EVERY_HOURS) || 24) * 60 * 60 * 1000;

/* ВК не любит частых запросов подряд. Пауза между вызовами дешевле,
   чем разбираться с ошибкой 6 «слишком много запросов в секунду». */
const PAUSE_MS = 350;

/* Сколько текста отдаём модели за раз. Ограничение не про качество,
   а про счёт: без него один многословный паблик съест весь бюджет. */
const MAX_CHARS = 40000;

const SYSTEM = `Ты — исследователь аудитории. Тебе дают куски текста из открытых
сообществ ВКонтакте: записи и комментарии людей.

Найди 3–5 главных проблем (болей) людей, которые могли бы заказать сайт,
Telegram-бота, автоматизацию или полиграфию. Боль — это то, что человеку
мешает и стоит ему денег или времени, а не тема разговора.

Правила:
- Игнорируй спам, приветствия, поздравления, рекламу и переписку ни о чём.
- Не выдумывай. Если в тексте боли нет, верни пустой массив.
- Цитата должна быть дословной и короткой, до 200 знаков.
- Не указывай имён и не пытайся определить, кто это написал.

Ответ — строго JSON, без пояснений до и после:
[{"pain": "описание боли своими словами", "context": "дословная цитата"}]`;

function groupsFromEnv() {
  return (process.env.PARSE_GROUPS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseConfigured() {
  return Boolean(groupsFromEnv().length && vkConfigured() && process.env.LLM_API_KEY);
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Короткий адрес или номер — ВК ждёт их в разных полях. */
function groupParam(group) {
  const clean = String(group).replace(/^https?:\/\/vk\.(com|ru)\//i, '').replace(/^-/, '');
  if (/^\d+$/.test(clean)) return { owner_id: `-${clean}` };
  if (/^(club|public)(\d+)$/i.test(clean)) return { owner_id: `-${clean.replace(/\D/g, '')}` };
  return { domain: clean };
}

// ------------------------------------------------------------------ чтение

/**
 * Собирает тексты записей и комментариев одного сообщества.
 * Автор нигде не сохраняется — см. примечание про 152-ФЗ наверху.
 */
async function readGroup(group) {
  const texts = [];
  const where = groupParam(group);

  const wall = await vkApi('wall.get', { ...where, count: POSTS_PER_GROUP, filter: 'owner' });
  if (!wall.ok) throw new Error(`${group}: ${wall.error}`);

  const items = (wall.response && wall.response.items) || [];
  const ownerId = wall.response && wall.response.groups && wall.response.groups[0]
    ? -wall.response.groups[0].id
    : (items[0] && items[0].owner_id);

  for (const post of items) {
    if (post.text) texts.push(post.text);

    await pause(PAUSE_MS);
    const comments = await vkApi('wall.getComments', {
      owner_id: ownerId ?? post.owner_id,
      post_id: post.id,
      count: 50,
      thread_items_count: 0,
    });

    /* Комментарии могут быть закрыты — это не повод падать: запись
       уже прочитана, а закрытые обсуждения встречаются часто. */
    if (comments.ok) {
      for (const c of (comments.response && comments.response.items) || []) {
        if (c.text) texts.push(c.text);
      }
    }
  }

  return texts;
}

/** Чистит от того, что моделью читать бессмысленно, и убирает повторы. */
function clean(texts) {
  const seen = new Set();
  const out = [];

  for (const raw of texts) {
    const text = String(raw)
      .replace(/\[(id|club)\d+\|[^\]]*\]/gi, '')   // упоминания вида [id123|Имя]
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length < 25) continue;
    if (/^(спасибо|привет|здравствуйте|добрый день|\+|класс|огонь|👍|❤)/i.test(text)) continue;

    const key = text.toLowerCase().slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }

  return out;
}

// ------------------------------------------------------------------ разбор

/** Достаёт JSON из ответа модели: она любит обернуть его в ```json. */
function parseJson(answer) {
  const text = String(answer).replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) return [];

  try {
    const list = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(list)
      ? list.filter((x) => x && typeof x.pain === 'string' && x.pain.trim())
      : [];
  } catch {
    return [];
  }
}

async function findPains(texts) {
  let chunk = '';
  for (const t of texts) {
    if (chunk.length + t.length > MAX_CHARS) break;
    chunk += `${t}\n---\n`;
  }
  if (!chunk.trim()) return [];

  const answer = await askOnce([{ role: 'user', content: chunk }], SYSTEM);
  return parseJson(answer);
}

// ------------------------------------------------------------------ хранение

function loadBoli() {
  try {
    const data = JSON.parse(fs.readFileSync(BOLI_PATH, 'utf8'));
    return Array.isArray(data.runs) ? data.runs : [];
  } catch {
    return [];
  }
}

/** Держим последние восемь заходов: два месяца при разборе раз в неделю. */
function saveBoli(runs) {
  fs.mkdirSync(path.dirname(BOLI_PATH), { recursive: true });
  const tmp = `${BOLI_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ runs: runs.slice(-8) }, null, 2));
  fs.renameSync(tmp, BOLI_PATH);
}

// ------------------------------------------------------------------ проход

async function run(now = new Date()) {
  const groups = groupsFromEnv();
  const collected = [];
  const problems = [];

  for (const group of groups) {
    try {
      collected.push(...(await readGroup(group)));
    } catch (err) {
      problems.push(`${group}: ${err.message}`);
    }
    await pause(PAUSE_MS);
  }

  const texts = clean(collected);
  const pains = texts.length ? await findPains(texts) : [];

  const entry = {
    date: now.toISOString().slice(0, 10),
    groups,
    texts_read: texts.length,
    pains,
    problems,
  };

  const runs = loadBoli();
  runs.push(entry);
  saveBoli(runs);

  await tellOwner(entry);
  return entry;
}

async function tellOwner(entry) {
  const lines = [
    `Прочитано сообщений: ${entry.texts_read}, сообществ: ${entry.groups.length}`,
    '',
  ];

  if (entry.pains.length) {
    entry.pains.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.pain}`);
      if (p.context) lines.push(`   «${String(p.context).slice(0, 200)}»`);
      lines.push('');
    });
  } else {
    lines.push('Болей не нашлось. Обычно это значит, что сообщества выбраны не те:');
    lines.push('нужны те, где люди пишут о своих задачах, а не витрины с картинками.');
    lines.push('');
  }

  if (entry.problems.length) {
    lines.push('Не прочиталось:');
    entry.problems.forEach((p) => lines.push(`  ${p}`));
  }

  const subject = `Боли аудитории · ${entry.date}`;
  const text = lines.join('\n');

  if (vkConfigured() && process.env.VK_PEER_ID) {
    await sendVkToOwner(`${subject}\n\n${text}`).catch((e) => console.error('[boli] ВК:', e.message));
  }
  if (mailConfigured()) {
    await sendMailToOwner(subject, text).catch((e) => console.error('[boli] почта:', e.message));
  }
}

/** Поднимает разбор по расписанию. Первый заход — через минуту после старта. */
function startBoli() {
  if (!parseConfigured()) {
    console.log('[boli] Выключен (нет PARSE_GROUPS, VK_TOKEN или LLM_API_KEY)');
    return null;
  }

  console.log('[boli] Разбор болей раз в', EVERY_MS / 3600000, 'ч, сообществ:', groupsFromEnv().length);

  setTimeout(() => run().catch((e) => console.error('[boli] первый заход:', e)), 60 * 1000).unref();
  const timer = setInterval(() => run().catch((e) => console.error('[boli] заход:', e)), EVERY_MS);
  timer.unref();
  return timer;
}

module.exports = { startBoli, run, clean, parseJson, groupParam, parseConfigured };
