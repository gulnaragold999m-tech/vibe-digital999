#!/usr/bin/env node
/**
 * audit.mjs — автоматическая техническая проверка сайта под Яндекс и Google.
 * Node 18+, без зависимостей.
 *
 *   node audit.mjs https://example.ru
 *   node audit.mjs https://example.ru --json
 *   node audit.mjs https://example.ru -o report.md
 *
 * Скрипт смотрит ИСХОДНЫЙ HTML с сервера — то же, что видит поисковый робот.
 * Если сайт рендерится на JS, здесь будет пусто, и это само по себе диагноз.
 */

// Многие сайты за WAF отдают 403 на незнакомый User-Agent. По умолчанию
// представляемся браузером — иначе весь отчёт превратится в ложные ошибки.
// Флаг --bot-ua переключает на UA робота: полезно проверить, не блокирует ли
// сайт поисковых ботов (это отдельная и очень дорогая проблема).
const UA_BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const UA_BOT = 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)';
let UA = UA_BROWSER;
const TIMEOUT = 20000;

// ─────────────────────────── аргументы ───────────────────────────
const argv = process.argv.slice(2);
let target = null, asJson = false, outFile = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--json') asJson = true;
  else if (a === '--bot-ua') UA = UA_BOT;
  else if (a === '-o' || a === '--out') outFile = argv[++i];
  else if (!a.startsWith('-')) target = a;
}
if (!target) {
  console.error('Использование: node audit.mjs https://example.ru [--json] [-o report.md]');
  process.exit(1);
}
if (!/^https?:\/\//i.test(target)) target = 'https://' + target;
const origin = new URL(target).origin;

// ─────────────────────────── помощники ───────────────────────────
async function get(url, { redirect = 'follow', method = 'GET' } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method, redirect, signal: ctrl.signal,
      headers: { 'User-Agent': UA, 'Accept-Language': 'ru-RU,ru' },
    });
    const body = method === 'HEAD' ? '' : await r.text();
    return { ok: true, status: r.status, url: r.url, headers: r.headers, body, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'таймаут' : e.message, ms: Date.now() - t0 };
  } finally { clearTimeout(timer); }
}

const findings = { critical: [], important: [], minor: [], good: [] };
const add = (level, title, detail) => findings[level].push({ title, detail });

const attr = (tag, name) => {
  const m = tag.match(new RegExp(name + '\\s*=\\s*["\']([^"\']*)["\']', 'i'));
  return m ? m[1] : null;
};
const metaContent = (html, key, prop = 'name') => {
  const re = new RegExp('<meta[^>]*' + prop + '\\s*=\\s*["\']' + key + '["\'][^>]*>', 'i');
  const m = html.match(re);
  return m ? attr(m[0], 'content') : null;
};
const stripTags = html => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// ─────────────────────────── проверки ───────────────────────────
const report = { url: target, origin, checkedAt: new Date().toISOString(), meta: {} };

// 1. Главная страница
let main = await get(target);
if (!main.ok) {
  console.error('Сайт недоступен: ' + main.error);
  process.exit(2);
}
// Защита от ложного отчёта: если сервер закрылся от нас (WAF, Cloudflare,
// антибот), остальные проверки посыплются каскадом и дадут выдуманные ошибки.
// Лучше честно сказать, что проверить не удалось, чем выдать красивый мусор.
if ([401, 403, 405, 429, 503].includes(main.status)) {
  if (UA !== UA_BROWSER) { UA = UA_BROWSER; main = await get(target); }
  if ([401, 403, 405, 429, 503].includes(main.status)) {
    console.error(
      `\nСайт ответил ${main.status} — автоматические запросы блокируются ` +
      `(защита от ботов, Cloudflare или ограничение по региону).\n\n` +
      `Технический аудит скриптом невозможен: любые дальнейшие проверки дали бы ` +
      `ложные ошибки. Варианты:\n` +
      `  • проверить сайт вручную через исходный код страницы в браузере;\n` +
      `  • попросить у клиента временно добавить ваш IP в исключения;\n` +
      `  • отдельно проверить, не блокируется ли так же робот Яндекса — ` +
      `запустите с флагом --bot-ua. Если бот тоже получает ${main.status}, ` +
      `это критическая проблема: сайт не сможет проиндексироваться.\n`
    );
    process.exit(3);
  }
}
const html = main.body;
report.meta.status = main.status;
report.meta.ttfbMs = main.ms;
report.meta.bytes = Buffer.byteLength(html, 'utf8');

if (main.status !== 200) add('critical', `Главная отдаёт ${main.status}`, 'Ожидается 200. Робот не проиндексирует страницу с другим кодом.');
else add('good', 'Главная отдаёт 200', null);

if (report.meta.ttfbMs > 600) add('important', `Медленный ответ сервера: ${main.ms} мс`, 'Норма — до 200 мс. Скорость влияет и на позиции, и на конверсию.');
else add('good', `Сервер отвечает за ${main.ms} мс`, null);

const kb = Math.round(report.meta.bytes / 1024);
if (kb > 1024) add('important', `HTML весит ${kb} КБ`, 'Больше мегабайта — тяжело для мобильного интернета.');
else add('good', `HTML весит ${kb} КБ`, null);

// 2. Редиректы
if (target.startsWith('https:')) {
  const httpRes = await get(target.replace(/^https:/, 'http:'), { redirect: 'manual' });
  if (httpRes.ok) {
    if (httpRes.status >= 300 && httpRes.status < 400) add('good', 'http → https редирект настроен', null);
    else if (httpRes.status === 200) add('critical', 'Сайт доступен и по http, и по https без редиректа', 'Для поисковика это два разных сайта. Нужен 301 с http на https.');
  }
} else {
  add('critical', 'Сайт работает по http без шифрования', 'Нужен сертификат и редирект на https. Браузеры помечают такие сайты как небезопасные, поисковики понижают.');
}
const host = new URL(target).host;
const altHost = host.startsWith('www.') ? host.slice(4) : 'www.' + host;
const altRes = await get(`https://${altHost}/`, { redirect: 'manual' });
if (altRes.ok && altRes.status === 200) {
  add('critical', `Сайт открывается и на ${host}, и на ${altHost}`, 'Дубль всего сайта. Нужен 301 на один выбранный вариант.');
} else if (altRes.ok && altRes.status >= 300 && altRes.status < 400) {
  add('good', `Зеркало ${altHost} редиректит на основной домен`, null);
}

// 3. lang
const htmlTag = (html.match(/<html[^>]*>/i) || [''])[0];
const lang = attr(htmlTag, 'lang');
report.meta.lang = lang;
if (!lang) add('important', 'У тега <html> нет атрибута lang', 'Добавить lang="ru". Влияет на определение языка и на доступность.');
else add('good', `Язык страницы указан: lang="${lang}"`, null);

// 4. title / description
const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1].trim();
report.meta.title = title;
report.meta.titleLen = title.length;
if (!title) add('critical', 'Нет тега <title>', 'Это синий заголовок в поисковой выдаче — главный элемент сниппета.');
else if (title.length < 30) add('important', `Короткий title (${title.length} симв.)`, 'Норма 40–70. Есть место для ключа и выгоды.');
else if (title.length > 75) add('minor', `Длинный title (${title.length} симв.)`, 'В выдаче обрежется. Норма 40–70.');
else add('good', `title в норме (${title.length} симв.)`, title);

const desc = metaContent(html, 'description');
report.meta.description = desc;
if (!desc) add('important', 'Нет meta description', 'Это серое описание под заголовком в выдаче. Без него поисковик соберёт его сам, как получится.');
else if (desc.length < 70) add('minor', `Короткий description (${desc.length} симв.)`, 'Норма 120–200.');
else if (desc.length > 250) add('minor', `Длинный description (${desc.length} симв.)`, 'Обрежется в выдаче.');
else add('good', `description в норме (${desc.length} симв.)`, null);

// 5. robots meta
const robotsMeta = metaContent(html, 'robots');
report.meta.robots = robotsMeta;
if (robotsMeta && /noindex/i.test(robotsMeta)) add('critical', 'Страница закрыта от индексации: meta robots noindex', 'Сайт не попадёт в поиск. Частая забытая настройка после разработки.');
else if (robotsMeta) add('good', `meta robots: ${robotsMeta}`, null);

const xRobots = main.headers.get('x-robots-tag');
if (xRobots && /noindex/i.test(xRobots)) add('critical', `Заголовок X-Robots-Tag запрещает индексацию: ${xRobots}`, 'Запрет стоит на уровне сервера.');

// 6. canonical
const canonTag = (html.match(/<link[^>]*rel\s*=\s*["']canonical["'][^>]*>/i) || [''])[0];
const canonical = canonTag ? attr(canonTag, 'href') : null;
report.meta.canonical = canonical;
if (!canonical) add('important', 'Нет canonical', 'Помогает избежать дублей, если страница доступна по нескольким адресам.');
else add('good', 'canonical указан', canonical);

// 7. Заголовки
const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => stripTags(m[1]));
const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => stripTags(m[1]));
report.meta.h1 = h1s;
report.meta.h2count = h2s.length;
if (h1s.length === 0) add('critical', 'На странице нет H1', 'Главный заголовок — сильный сигнал релевантности.');
else if (h1s.length > 1) add('critical', `На странице ${h1s.length} тегов H1`, 'Должен быть ровно один. Остальные перевести в H2.');
else add('good', 'Ровно один H1', h1s[0]);
if (h2s.length === 0) add('minor', 'Нет заголовков H2', 'Структура текста помогает и роботу, и человеку.');

// 8. Open Graph
const og = ['og:title', 'og:description', 'og:image', 'og:url'].filter(k => !metaContent(html, k, 'property'));
if (og.length === 4) add('important', 'Нет разметки Open Graph', 'Ссылка в Telegram, WhatsApp и ВК будет выглядеть голым текстом вместо карточки с картинкой.');
else if (og.length) add('minor', 'Неполный Open Graph: не хватает ' + og.join(', '), null);
else add('good', 'Open Graph заполнен полностью', null);

// 9. Микроразметка
const ldBlocks = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const ldTypes = [];
let ldBroken = 0;
for (const b of ldBlocks) {
  try {
    const o = JSON.parse(b);
    const arr = Array.isArray(o) ? o : (o['@graph'] || [o]);
    for (const it of arr) if (it && it['@type']) ldTypes.push(String(it['@type']));
  } catch { ldBroken++; }
}
report.meta.schema = ldTypes;
if (!ldBlocks.length) add('critical', 'Нет микроразметки Schema.org', 'Самая дешёвая победа в SEO: контент уже есть, нужно только описать его для робота. Минимум — Organization и FAQPage, если на сайте есть вопросы-ответы.');
else {
  if (ldBroken) add('critical', `${ldBroken} блок(ов) JSON-LD с синтаксической ошибкой`, 'Битая разметка не учитывается совсем.');
  add('good', 'Микроразметка есть: ' + ldTypes.join(', '), null);
  if (/вопрос|FAQ|Частые/i.test(html) && !ldTypes.some(t => /FAQPage/i.test(t)))
    add('important', 'На странице есть блок вопросов, но нет разметки FAQPage', 'С ней вопросы попадают в расширенный сниппет и занимают втрое больше места в выдаче.');
}

// 10. Изображения
const imgs = [...html.matchAll(/<img[^>]*>/gi)].map(m => m[0]);
const noAlt = imgs.filter(t => attr(t, 'alt') === null);
const noLazy = imgs.filter(t => !/loading\s*=\s*["']lazy["']/i.test(t));
report.meta.images = { total: imgs.length, noAlt: noAlt.length };
if (noAlt.length) add('important', `${noAlt.length} из ${imgs.length} изображений без alt`, 'Поисковик не понимает, что на картинке. Поиск по картинкам — отдельный источник трафика.');
else if (imgs.length) add('good', `У всех ${imgs.length} изображений есть alt`, null);
if (imgs.length > 5 && noLazy.length > imgs.length / 2) add('minor', 'Большинство изображений без loading="lazy"', 'Отложенная загрузка ускоряет первый экран.');

// 11. Favicon и manifest
const hasFavicon = /<link[^>]*rel\s*=\s*["'][^"']*icon[^"']*["']/i.test(html);
if (!hasFavicon) add('minor', 'Нет favicon', 'Иконка показывается рядом со сниппетом в выдаче Яндекса — выделяет среди конкурентов.');
else add('good', 'Favicon подключён', null);

// 12. Пустые ссылки
const emptyLinks = (html.match(/href\s*=\s*["']#["']/gi) || []).length;
if (emptyLinks > 2) add('minor', `${emptyLinks} ссылок с href="#"`, 'Ссылки в никуда. Если это кнопки — заменить на <button>.');

// 13. Счётчики и подтверждения
const hasMetrika = /mc\.yandex\.ru|ym\(/i.test(html);
const hasGA = /googletagmanager|gtag\(|google-analytics/i.test(html);
const hasYaVer = /yandex-verification/i.test(html);
const hasGoVer = /google-site-verification/i.test(html);
// Права в Вебмастере подтверждают и тегом в менеджере тегов — тогда в разметке нет
// ничего, а панель работает. Поэтому менеджер ищем отдельно и не пишем «прав нет»,
// когда он на странице стоит. Подробности — docs/12-PRAVA-VEBMASTER.md.
const hasTagManager = /googletagmanager\.com\/gtm\.js|["']GTM-[A-Z0-9]+["']|tag-?manager\.yandex/i.test(html);
report.meta.counters = { metrika: hasMetrika, ga: hasGA, yandexVerification: hasYaVer, googleVerification: hasGoVer, tagManager: hasTagManager };
if (!hasMetrika) add('critical', 'Не установлена Яндекс.Метрика', 'Без неё нельзя понять, что делают посетители. Вебвизор записывает экран каждого — видно, где человек застревает и почему не отправил заявку.');
else add('good', 'Яндекс.Метрика установлена', null);
if (hasYaVer) add('good', 'Права в Яндекс.Вебмастере подтверждены мета-тегом', null);
else if (hasTagManager) add('minor', 'Мета-тега Яндекс.Вебмастера нет, но на странице есть менеджер тегов', 'Права могли подтвердить тегом в менеджере, файлом или DNS-записью — в коде такого не видно. Проверить в Вебмастере руками.');
else add('important', 'Нет мета-тега подтверждения Яндекс.Вебмастера', 'Права могли подтвердить файлом, DNS-записью или тегом в менеджере тегов — проверить вручную. Без Вебмастера нельзя управлять индексацией.');
if (!hasGoVer && !hasGA) add('minor', 'Нет признаков Google Search Console', 'Права могли быть подтверждены другим способом — проверить.');

// 14. robots.txt
const rob = await get(origin + '/robots.txt');
report.meta.robotsTxt = { status: rob.status };
if (!rob.ok || rob.status !== 200) add('critical', 'robots.txt недоступен', 'Файл должен отдавать 200 по адресу /robots.txt.');
else {
  const rt = rob.body;
  if (/^\s*Disallow:\s*\/\s*$/im.test(rt) && !/Allow:/i.test(rt)) add('critical', 'robots.txt закрывает весь сайт от индексации', 'Строка Disallow: / — сайт не попадёт в поиск.');
  else add('good', 'robots.txt на месте', null);
  if (!/Sitemap:/i.test(rt)) add('important', 'В robots.txt нет строки Sitemap', 'Добавить: Sitemap: ' + origin + '/sitemap.xml');
  else add('good', 'В robots.txt указан Sitemap', null);
  if (!/Host:/i.test(rt)) add('minor', 'В robots.txt нет директивы Host', 'Полезна для Яндекса при выборе главного зеркала.');
}

// 15. sitemap.xml
const smUrl = (rob.ok && (rob.body.match(/Sitemap:\s*(\S+)/i) || [])[1]) || origin + '/sitemap.xml';
const sm = await get(smUrl);
report.meta.sitemap = { url: smUrl, status: sm.status };
if (!sm.ok || sm.status !== 200) {
  add('critical', 'sitemap.xml недоступен', `По адресу ${smUrl} ответ ${sm.status || sm.error}.`);
} else {
  const ct = (sm.headers.get('content-type') || '').toLowerCase();
  const looksXml = sm.body.trimStart().startsWith('<?xml') || /<urlset|<sitemapindex/i.test(sm.body);
  if (!looksXml) add('critical', 'sitemap.xml не является XML', 'Возможные причины: BOM в начале файла, двойное сжатие, отдаётся не тот файл.');
  else if (!/xml/.test(ct)) add('important', `sitemap.xml отдаётся с типом "${ct}"`, 'Нужен application/xml или text/xml.');
  else add('good', 'sitemap.xml отдаётся корректно', null);
  if (sm.body.charCodeAt(0) === 0xFEFF) add('critical', 'В sitemap.xml есть BOM', 'Пересохранить в UTF-8 без BOM — парсер XML на нём падает.');
  // Закомментированные <loc> — не адреса сайта, а заготовки. Убираем комментарии,
  // иначе счётчик URL и проверка доступности врут.
  const smClean = sm.body.replace(/<!--[\s\S]*?-->/g, '');
  const locs = [...smClean.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(m => m[1]);
  report.meta.sitemap.urls = locs.length;
  if (looksXml) add('good', `В карте сайта ${locs.length} URL`, null);
  // выборочно проверяем до 8 адресов
  const sample = locs.slice(0, 8);
  const bad = [];
  for (const u of sample) {
    const r = await get(u, { method: 'HEAD' });
    if (!r.ok || r.status !== 200) bad.push(`${u} → ${r.status || r.error}`);
  }
  if (bad.length) add('critical', `${bad.length} из ${sample.length} проверенных URL в карте сайта недоступны`, bad.join('; ') + '. Несуществующие адреса дают ошибки в Вебмастере.');
  else if (sample.length) add('good', `Проверено ${sample.length} URL из карты — все отвечают 200`, null);
  if (locs.length <= 3) add('critical', `В карте сайта всего ${locs.length} URL — сайт фактически одностраничный`, 'Одна страница не может ранжироваться по разным коммерческим запросам: это разные интенты, им нужны разные посадочные. Разбивка на страницы услуг — работа №1.');
}

// 16. 404
const notFound = await get(origin + '/__seo-audit-404-check__' + Date.now());
if (notFound.ok && notFound.status === 200) add('important', 'Несуществующий адрес отдаёт код 200', 'Это «мягкая 404»: поисковик наплодит мусорных страниц в индексе. Нужен код 404.');
else if (notFound.ok && notFound.status === 404) add('good', 'Несуществующие страницы отдают 404', null);

// 17. Объём текста и рендеринг
const text = stripTags(html);
report.meta.textLength = text.length;
if (text.length < 500) add('critical', `На странице всего ${text.length} знаков текста`, 'Похоже, контент подгружается через JavaScript. Робот видит примерно то же, что и этот скрипт, — то есть пустую страницу. Нужен серверный рендеринг или пререндер.');
else if (text.length < 2000) add('important', `Мало текста: ${text.length} знаков`, 'Для коммерческой посадочной норма — от 2000 знаков осмысленного текста.');
else add('good', `Объём текста: ${text.length} знаков`, null);

// ─────────────────────────── балл ───────────────────────────
const score = Math.max(0, 100 - findings.critical.length * 12 - findings.important.length * 5 - findings.minor.length * 2);
report.score = score;
report.findings = findings;

// ─────────────────────────── вывод ───────────────────────────
if (asJson) {
  const out = JSON.stringify(report, null, 2);
  if (outFile) { const { writeFileSync } = await import('fs'); writeFileSync(outFile, out); console.log('Сохранено: ' + outFile); }
  else console.log(out);
  process.exit(0);
}

const L = [];
L.push(`# Техническая проверка ${origin}`);
L.push('');
L.push(`Дата: ${new Date().toLocaleDateString('ru-RU')} · Балл: **${score}/100**`);
L.push('');
L.push(`Критично: ${findings.critical.length} · Важно: ${findings.important.length} · Мелочи: ${findings.minor.length} · В порядке: ${findings.good.length}`);
L.push('');
L.push('| Параметр | Значение |');
L.push('|---|---|');
L.push(`| Код ответа | ${report.meta.status} |`);
L.push(`| Ответ сервера | ${report.meta.ttfbMs} мс |`);
L.push(`| Вес HTML | ${kb} КБ |`);
L.push(`| Текста на странице | ${report.meta.textLength} знаков |`);
L.push(`| Title | ${title ? title.slice(0, 80) : '—'} |`);
L.push(`| H1 | ${h1s[0] ? h1s[0].slice(0, 80) : '—'} |`);
L.push(`| Микроразметка | ${ldTypes.length ? ldTypes.join(', ') : 'нет'} |`);
L.push(`| URL в карте сайта | ${report.meta.sitemap?.urls ?? '—'} |`);
L.push('');

const section = (key, heading) => {
  if (!findings[key].length) return;
  L.push(`## ${heading}`);
  L.push('');
  findings[key].forEach((f, i) => {
    L.push(`**${i + 1}. ${f.title}**`);
    if (f.detail) { L.push(''); L.push(f.detail); }
    L.push('');
  });
};
section('critical', '🔴 Критично');
section('important', '🟡 Важно');
section('minor', '⚪ Потом');

if (findings.good.length) {
  L.push('## ✅ Что в порядке');
  L.push('');
  findings.good.forEach(f => L.push(`- ${f.title}${f.detail ? ' — ' + f.detail.slice(0, 90) : ''}`));
  L.push('');
}

L.push('---');
L.push('');
L.push('Скрипт проверяет только техническую часть по исходному HTML. Структуру, семантику,');
L.push('соответствие H1 коммерческому спросу, качество текстов и индексацию в панелях');
L.push('вебмастеров нужно смотреть руками — см. references/checklist.md.');

const md = L.join('\n');
if (outFile) { const { writeFileSync } = await import('fs'); writeFileSync(outFile, md); console.log('Отчёт сохранён: ' + outFile); }
else console.log(md);
