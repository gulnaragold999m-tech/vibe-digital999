/**
 * Журнал разговоров — и закрытых, и «молчунов».
 *
 * ЗАЧЕМ. Разговор, в котором человек не назвал контакт, сегодня исчезает
 * бесследно: бриф не уходит, в заявках пусто, и владелица не знает даже
 * того, что человек приходил. Особенно обидно во ВКонтакте — там
 * собеседник известен по номеру страницы, написать ему можно руками,
 * но узнать о нём неоткуда.
 *
 * Этот журнал отвечает на три вопроса:
 *   сколько разговоров кончились ничем;
 *   на каком вопросе брифа люди чаще всего замолкают;
 *   кому во ВКонтакте можно написать самой.
 *
 * ЧТО ХРАНИМ И ЧЕГО НЕ ХРАНИМ. Слов клиента здесь нет намеренно. Лежат
 * только счётчики, время, канал, номер страницы во ВКонтакте — и
 * ПОСЛЕДНИЙ ВОПРОС БОТА, то есть наш собственный текст. Этого хватает,
 * чтобы понять, где рвётся разговор, и не хватает, чтобы восстановить
 * переписку. Правило из docs/17, раздел 4: чем меньше лежит, тем меньше
 * отвечать, если что-то утечёт.
 *
 * ФОРМАТ. Тот же JSONL, что у заявок: строка на событие, дописывается
 * одной операцией, переживает обрыв записи и читается чем угодно.
 * Событий на разговор столько, сколько сообщений, — свод по ним
 * сворачивается при чтении.
 */

const fs = require('fs');
const path = require('path');

/* Тот же постоянный диск, что у заявок (см. amvera.yaml, persistenceMount).
   Локально его нет, поэтому при разработке пишем рядом с проектом. */
const DATA_DIR = fs.existsSync('/data') ? '/data' : path.join(__dirname, '..', '.leads');
const SESSII_FILE = path.join(DATA_DIR, 'sessii.jsonl');

/** Обрезаем и чистим — в журнал не должно попадать ничего длинного. */
function korotko(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Записывает одно событие разговора.
 *
 * Ошибку глотаем и пишем в журнал приложения: этот файл — удобство
 * для разбора, а не доставка заявки. Отказ диска не должен ронять
 * ответ живому человеку.
 */
function zapisatSobytie(sobytie) {
  const stroka = {
    at: new Date().toISOString(),
    key: korotko(sobytie.key, 80),
    kanal: korotko(sobytie.kanal, 20),
    peer: sobytie.peer ? korotko(sobytie.peer, 40) : null,
    n: Number(sobytie.n) || 0,
    /* Последний вопрос БОТА — по нему видно, на чём разговор встал.
       Слов клиента здесь нет. */
    vopros: sobytie.vopros ? korotko(sobytie.vopros, 160) : null,
    contact: sobytie.contact ? korotko(sobytie.contact, 60) : null,
    istochnik: sobytie.istochnik ? korotko(sobytie.istochnik, 30) : null,
  };

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(SESSII_FILE, JSON.stringify(stroka) + '\n', 'utf8');
  } catch (err) {
    console.error('[sessii] Не удалось записать событие:', err.message);
  }
}

/** Разговор дозрел до заявки — помечаем закрытым. */
function zakrytSessiyu(key, kanal, contact) {
  zapisatSobytie({ key, kanal, contact, n: 0 });
}

/**
 * Сворачивает события в свод по разговорам.
 *
 * Вынесено отдельной функцией от чтения файла нарочно: так свод
 * проверяется тестом на выдуманных строках, без диска и без сети.
 *
 * @param {object[]} sobytiya события в порядке записи
 */
function svodkaIz(sobytiya) {
  const razgovory = new Map();

  for (const s of sobytiya) {
    if (!s || !s.key) continue;

    const est = razgovory.get(s.key) || {
      key: s.key,
      kanal: s.kanal || null,
      peer: null,
      istochnik: null,
      nachalo: s.at,
      konec: s.at,
      soobshchenij: 0,
      vopros: null,
      contact: null,
    };

    est.konec = s.at || est.konec;
    if (s.kanal) est.kanal = s.kanal;
    if (s.peer) est.peer = s.peer;
    if (s.istochnik) est.istochnik = s.istochnik;
    if (s.vopros) est.vopros = s.vopros;
    /* Контакт, однажды появившийся, разговор уже не теряет: событие
       закрытия приходит отдельной строкой и не должно затираться
       следующими сообщениями того же разговора. */
    if (s.contact) est.contact = s.contact;
    if (s.n > est.soobshchenij) est.soobshchenij = s.n;

    razgovory.set(s.key, est);
  }

  return [...razgovory.values()];
}

/** Читает журнал с диска. Файла нет — пустой список, это не ошибка. */
function chitatSobytiya() {
  try {
    return fs.readFileSync(SESSII_FILE, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((s) => { try { return JSON.parse(s); } catch (e) { return null; } })
      .filter(Boolean);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    console.error('[sessii] Не удалось прочитать журнал:', err.message);
    return [];
  }
}

/** Ссылка на собеседника, если по каналу её можно построить. */
function ssylkaNaSobesednika(razgovor) {
  if (razgovor.kanal === 'vk' && razgovor.peer) return 'https://vk.com/id' + razgovor.peer;
  return null;
}

/**
 * Отчёт по молчунам. Закрыт тем же ключом, что и выгрузка заявок:
 * заводить второй секрет ради одного отчёта незачем.
 *
 * Отвечаем 404 без ключа и с чужим ключом — тому, кто подбирает,
 * не подсказываем, что по этому адресу вообще что-то есть.
 */
function handleMolchuny(req, res) {
  const key = process.env.LEADS_KEY;
  if (!key || req.query?.key !== key) {
    return res.status(404).json({ ok: false, error: 'Не найдено' });
  }

  const vse = svodkaIz(chitatSobytiya());
  const molchuny = vse
    .filter((r) => !r.contact)
    .sort((a, b) => b.soobshchenij - a.soobshchenij);

  /* На каком вопросе замолкают чаще всего. Считаем по последнему
     вопросу бота — это и есть место обрыва. */
  const poVoprosam = {};
  for (const r of molchuny) {
    const v = r.vopros || 'вопроса не было — ушли сразу';
    poVoprosam[v] = (poVoprosam[v] || 0) + 1;
  }

  const poKanalam = {};
  for (const r of molchuny) {
    const k = r.kanal || 'не указан';
    poKanalam[k] = (poKanalam[k] || 0) + 1;
  }

  res.json({
    ok: true,
    vsego_razgovorov: vse.length,
    s_kontaktom: vse.length - molchuny.length,
    molchunov: molchuny.length,
    po_kanalam: poKanalam,
    gde_zamolkayut: poVoprosam,
    molchuny: molchuny.slice(0, 200).map((r) => ({
      kanal: r.kanal,
      istochnik: r.istochnik,
      soobshchenij: r.soobshchenij,
      nachalo: r.nachalo,
      konec: r.konec,
      poslednij_vopros: r.vopros,
      napisat: ssylkaNaSobesednika(r),
    })),
  });
}

module.exports = {
  zapisatSobytie, zakrytSessiyu, svodkaIz, chitatSobytiya, handleMolchuny,
};
