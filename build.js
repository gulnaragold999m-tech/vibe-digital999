/**
 * Сборка страниц сайта.
 *
 * ЗАЧЕМ ЭТО ВООБЩЕ НУЖНО
 * Пока страница была одна, всё лежало в одном файле, и это было правильно:
 * искать нечего, править негде. Страниц стало двенадцать — и шапка, подвал
 * с формой заявки размножились бы двенадцать раз. Меняешь телефон в подвале —
 * правишь двенадцать файлов, забываешь один, и на нём висит старый номер.
 *
 * Поэтому общие куски лежат в src/partials/ по одному разу, тексты страниц —
 * в src/pages/, а этот скрипт собирает из них готовые файлы в public/.
 *
 * ЭТО НЕ СБОРЩИК ФРОНТЕНДА. Ни зависимостей, ни node_modules, ни конфигов:
 * чистый Node, читает файлы и склеивает строки. Ничего не минифицирует и
 * не транспилирует — на выходе тот же HTML, который вы написали.
 *
 * КАК ЗАПУСКАТЬ
 *   npm run build      — собрать вручную
 *   npm start          — соберёт сам, перед запуском сервера
 *
 * Собранные файлы лежат в репозитории вместе с исходниками. Это сделано
 * намеренно: если сборка когда-нибудь упадёт, на сервере останется рабочая
 * прошлая версия, а не пустой сайт.
 *
 * ВАЖНО: файлы в public/uslugi/, public/portfolio/, public/o-nas/,
 * public/kontakty/ и public/404.html править бессмысленно — следующая сборка
 * их перезапишет. Исходники в src/.
 */

const fs = require('fs');
const path = require('path');
const { PAGES, SITE, BUILD, VERIFY } = require('./src/pages');
const { cityDatalist } = require('./src/cities');

const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'public');

const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');

const PARTIALS = {
  head: read(SRC, 'partials', 'head.html'),
  header: read(SRC, 'partials', 'header.html'),
  order: read(SRC, 'partials', 'order.html'),
  footer: read(SRC, 'partials', 'footer.html'),
};

/** Экранируем то, что уходит в атрибуты: title и description пишутся людьми. */
const attr = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

/** Снимаем теги — нужно, когда текст из разметки уходит в JSON-LD. */
const stripTags = (s) => s
  .replace(/<[^>]+>/g, '')
  .replace(/\s+/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&mdash;/g, '—')
  .replace(/&amp;/g, '&')
  .trim();

const byUrl = new Map(PAGES.map((p) => [p.url, p]));

/* ── Меню ────────────────────────────────────────────────────────
   Собирается из карты сайта, а не пишется руками в шапке: иначе новая
   страница появляется в sitemap.xml, но не в меню, и человек её не находит. */
function navLinks(current) {
  return PAGES.filter((p) => p.nav).map((p) => {
    /* Ровно эта страница — aria-current="page". Раздел, внутри которого
       мы находимся, подсвечиваем классом, но БЕЗ aria-current: для
       скринридера «текущая страница» — это одна страница, а не две.
       Со страницы /uslugi/telegram-bot/ пункт «Услуги» виден глазом
       как активный, но не объявляется как текущий. */
    let mark = '';
    if (current.url === p.url) mark = ' aria-current="page"';
    else if (p.url !== '/' && current.url.startsWith(p.url)) mark = ' class="is-section"';
    return `      <li><a href="${p.url}"${mark}>${p.crumb}</a></li>`;
  }).join('\n');
}

/* ── Хлебные крошки ──────────────────────────────────────────────
   Цепочка строится по полю parent. Последний элемент — текущая страница,
   без ссылки: ссылка на саму себя сбивает с толку и человека, и робота. */
function crumbChain(page) {
  const chain = [];
  let cur = page;
  while (cur) {
    chain.unshift(cur);
    cur = cur.parent ? byUrl.get(cur.parent) : null;
  }
  return chain;
}

function crumbsHtml(page) {
  return crumbChain(page).map((p, i, all) => {
    const last = i === all.length - 1;
    const inner = last
      ? `<span aria-current="page">${p.crumb}</span>`
      : `<a href="${p.url}">${p.crumb}</a>`;
    return `    <li>${inner}</li>`;
  }).join('\n');
}

function crumbsSchema(page) {
  const chain = crumbChain(page);
  if (chain.length < 2) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: chain.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.crumb,
      item: SITE + p.url,
    })),
  };
}

/* ── Вопросы и ответы ────────────────────────────────────────────
   Разметку FAQPage собираем ИЗ ТЕКСТА страницы, а не пишем отдельно.
   Иначе рано или поздно ответ на странице поправят, а в разметке забудут —
   и Яндекс покажет в выдаче то, чего на странице уже нет. Это прямой путь
   к потере расширенного сниппета: поисковики сверяют одно с другим. */
function faqSchema(html) {
  const items = [];
  const re = /<details class="faq-item">\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g;
  let m;
  while ((m = re.exec(html))) {
    const q = stripTags(m[1]);
    const a = stripTags(m[2]);
    if (q && a) items.push({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } });
  }
  if (!items.length) return null;
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items };
}

/* ── Разметка услуги ─────────────────────────────────────────────
   Цена в разметке — не украшение: по ней страницу показывают тем, кто
   ищет с указанием бюджета, и она попадает в товарные блоки выдачи. */
function serviceSchema(page) {
  if (!page.offer) return null;
  const offer = page.offer.price
    ? {
      '@type': 'Offer',
      price: page.offer.price,
      priceCurrency: 'RUB',
      /* Цены «от» размечаются как минимальная в диапазоне: указать её
         как точную — значит пообещать то, чего не обещали. */
      priceSpecification: {
        '@type': 'PriceSpecification',
        minPrice: page.offer.price,
        priceCurrency: 'RUB',
      },
      availability: 'https://schema.org/InStock',
      url: SITE + page.url,
    }
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: page.offer.name || page.crumb,
    serviceType: page.offer.name || page.crumb,
    description: page.description,
    url: SITE + page.url,
    provider: { '@id': SITE + '/#organization' },
    areaServed: { '@type': 'Country', name: 'Россия' },
    ...(offer ? { offers: offer } : {}),
  };
}

/* Мета-теги подтверждения прав. Пустой код — тега нет вовсе: Вебмастер
   читает пустой content как неверный код, и подтверждение не проходит. */
function verifyTags() {
  const tags = [];
  if (VERIFY.yandex) tags.push(`  <meta name="yandex-verification" content="${attr(VERIFY.yandex)}" />`);
  if (VERIFY.google) tags.push(`  <meta name="google-site-verification" content="${attr(VERIFY.google)}" />`);
  return tags.join('\n');
}

/* ── Разметка самой страницы ─────────────────────────────────────
   Две вещи, которых не было на одностраничнике.

   Даты. Модели ИИ-поиска и поисковые подсказки при прочих равных цитируют
   то, у чего дата проставлена явно: свежее вытесняет старое. Дата правки
   берётся из того же поля lastmod, что уходит в sitemap.xml, — одно число
   в одном месте, разойтись нечему.

   Автор. Для ИИ-поиска экспертиза привязана к человеку сильнее, чем к
   бренду: «кто это написал» — отдельный вопрос, на который у страницы
   должен быть ответ. Ссылаемся по @id на карточку основателя, описанную
   один раз на главной, а не переписываем её на каждой странице. */
function webPageSchema(page) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': SITE + page.url + '#webpage',
    url: SITE + page.url,
    name: page.title,
    description: page.description,
    inLanguage: 'ru-RU',
    isPartOf: { '@id': SITE + '/#website' },
    about: { '@id': SITE + '/#organization' },
    author: { '@id': SITE + '/o-nas/#founder' },
    publisher: { '@id': SITE + '/#organization' },
    datePublished: page.published || page.lastmod,
    dateModified: page.lastmod,
  };
}

/* ── Разметка статьи ─────────────────────────────────────────────
   Только для страниц внутри /blog/. У статьи в разметке есть то, чего нет
   у страницы услуги: автор, дата публикации и дата правки как свойства
   самого материала. По ним поиск отличает статью от коммерческой страницы
   и показывает её на информационные запросы — те самые «как», «чем
   отличается», «нужно ли», на которые коммерческая страница не отвечает. */
function articleSchema(page) {
  if (page.parent !== '/blog/') return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': SITE + page.url + '#article',
    headline: page.title,
    description: page.description,
    url: SITE + page.url,
    inLanguage: 'ru-RU',
    mainEntityOfPage: { '@id': SITE + page.url + '#webpage' },
    author: { '@id': SITE + '/o-nas/#founder' },
    publisher: { '@id': SITE + '/#organization' },
    datePublished: page.published || page.lastmod,
    dateModified: page.lastmod,
  };
}

function ldJson(obj) {
  return `  <script type="application/ld+json">${JSON.stringify(obj, null, 2)}</script>`;
}

/* ── Сборка одной страницы ───────────────────────────────────── */
function buildPage(page) {
  const body = read(SRC, 'pages', page.file);

  const schemas = [
    webPageSchema(page),
    crumbsSchema(page),
    faqSchema(body),
    serviceSchema(page),
    articleSchema(page),
  ].filter(Boolean);

  const head = PARTIALS.head
    .replace('{{TITLE}}', attr(page.title))
    .replace(/\{\{DESCRIPTION\}\}/g, attr(page.description))
    .replace(/\{\{TITLE\}\}/g, attr(page.title))
    .replace(/\{\{CANONICAL\}\}/g, SITE + page.url)
    .replace('{{ROBOTS}}', page.noindex ? 'noindex, follow' : 'index, follow')
    .replace('{{VERIFY}}', verifyTags())
    .replace('{{BUILD}}', BUILD)
    .replace('{{HEAD_EXTRA}}', schemas.map(ldJson).join('\n'));

  /* Форму подставляем только там, где в тексте страницы стоит метка.
     Странице 404 форма заявки не нужна: человек попал не туда, ему нужен
     выход, а не анкета. */
  const hasForm = body.includes('{{ORDER_FORM}}');
  const order = PARTIALS.order
    .replace('{{SERVICE}}', attr(page.service || 'Не указана'))
    .replace('{{CITY_OPTIONS}}', cityDatalist());
  const withOrder = body.replace('{{ORDER_FORM}}', order);

  const header = PARTIALS.header
    .replace('{{NAV_LINKS}}', navLinks(page))
    .replace('{{CRUMBS}}', crumbsHtml(page))
    /* Кнопка «Заказать» в шапке ведёт к форме на этой же странице. Если
       формы на странице нет, якорь никуда не ведёт и кнопка молча не
       работает — тогда отправляем на контакты. */
    .replace('{{CTA_HREF}}', hasForm ? '#order-section' : '/kontakty/');

  const warning = `<!-- ═══════════════════════════════════════════════════════════\n`
    + `     ФАЙЛ СОБРАН АВТОМАТИЧЕСКИ. Правки здесь пропадут.\n`
    + `     Текст страницы:  src/pages/${page.file}\n`
    + `     Шапка и подвал:  src/partials/\n`
    + `     Адрес и мета:    src/pages.js\n`
    + `     Пересобрать:     npm run build\n`
    + `     ═══════════════════════════════════════════════════════════ -->\n`;

  return warning + head + header + withOrder + PARTIALS.footer;
}

/* ── Карта сайта ─────────────────────────────────────────────────
   Собирается из того же списка, что и страницы. Раньше её правили руками,
   и это главный источник ошибок в Вебмастере: адрес в карте есть, страницы
   нет — робот получает 404 и снижает доверие ко всей карте. */
function buildSitemap() {
  const urls = PAGES.filter((p) => !p.noindex).map((p) => [
    '  <url>',
    `    <loc>${SITE}${p.url}</loc>`,
    `    <lastmod>${p.lastmod}</lastmod>`,
    `    <changefreq>${p.changefreq}</changefreq>`,
    `    <priority>${p.priority}</priority>`,
    '  </url>',
  ].join('\n')).join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  sitemap.xml для vibe-digital999.ru

  СОБРАН АВТОМАТИЧЕСКИ из src/pages.js. Руками не править — перезапишется.
  Добавить страницу: внести её в src/pages.js и запустить npm run build.

  Хранить в UTF-8 без BOM, отдавать с Content-Type: application/xml.
  Даты lastmod правятся в src/pages.js при каждой заметной правке текста:
  робот смотрит на них, решая, перечитывать ли страницу.
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${urls}

</urlset>
`;
}

/* ── llms.txt ────────────────────────────────────────────────────
   Короткая карта сайта для тех, кто собирает ответы нейросетью: Алиса,
   ChatGPT, Perplexity. Обычный обходчик читает разметку, а этим удобнее
   готовый список «что здесь есть и где что лежит».

   Стандарт молодой, показов он не гарантирует и обязательным не является.
   Но собирается из того же списка страниц, что и всё остальное, поэтому
   стоит ровно ноль усилий на поддержку — и не может разойтись с сайтом. */
function buildLlms() {
  /* Страницы, попавшие хоть в одну группу. Нужны для последней,
     подбирающей группы: без неё новая страница молча не попадала
     в llms.txt — так уже случилось с тремя региональными страницами
     и пакетами. Список групп статический, а страницы добавляются
     постоянно, и заметить пропажу невозможно: файл всё равно
     собирается и выглядит целым. */
  const seen = new Set();

  const group = (title, filter) => {
    const items = PAGES.filter((p) => !p.noindex && !seen.has(p.url) && filter(p))
      .map((p) => {
        seen.add(p.url);
        return `- [${p.crumb}](${SITE}${p.url}): ${p.description || ''}`.trim();
      });
    return items.length ? `## ${title}\n\n${items.join('\n')}\n` : '';
  };

  /* Пустые группы отбрасываем, пустые строки между блоками — нет:
     они и разделяют блоки. Поэтому фильтруем только группы. */
  const groups = [
    group('Услуги', (p) => (p.url.startsWith('/uslugi/') && p.url !== '/uslugi/') || p.url === '/vibecoding/'),
    group('Пакеты', (p) => p.url === '/pakety/'),
    group('Разделы', (p) => ['/uslugi/', '/portfolio/', '/blog/', '/o-nas/', '/kontakty/'].includes(p.url)),
    group('Кейсы', (p) => p.parent === '/portfolio/'),
    group('Статьи', (p) => p.parent === '/blog/'),
    group('География', (p) => ['/kmv/', '/krasnodar-krai/', '/krasnoyarsk-krai/', '/pyatigorsk/', '/essentuki/'].includes(p.url)),
    /* Подбирающая группа. Всё, что не описали выше, попадает сюда,
       а не исчезает. Страница главной сюда не идёт: она описана
       заголовком файла. */
    group('Ещё', (p) => p.url !== '/' && p.file),
  ].filter(Boolean);

  return [
    '# Vibe Digital 999',
    '',
    '> Студия разработки сайтов, Telegram-ботов, ИИ-агентов и автоматизации',
    '> для бизнеса на Кавказских Минеральных Водах и по всей России.',
    '> Пишем на чистом коде без конструкторов, исходники передаём заказчику.',
    '> ИП Мелконян Г.Р., Лермонтов, Ставропольский край. Телефон +7 999 244 99 99.',
    '',
    ...groups,
    '## Цены',
    '',
    '- Лид-бот для Telegram и ВКонтакте: от 15 000 ₽, срок от 7 дней',
    '- SEO-аудит сайта с проверкой по 152-ФЗ: 15 000 ₽, срок 3 дня',
    '- Интеграция Яндекс Карт (карта, подсказки адреса, расчёт доставки): от 15 000 ₽, срок от 3 дней',
    '- Автоматизация одной связки: от 30 000 ₽',
    '- Лендинг «Старт»: от 35 000 ₽, срок от 7 дней',
    '- Бот для записи и продаж: от 35 000 ₽, срок от 7 дней',
    '- ИИ-агент с базой знаний: от 60 000 ₽, один канал, запуск от 14 дней',
    '- Лендинг «Продажи» с воронкой и квизом: от 65 000 ₽',
    '- Сайт на 5–10 страниц: от 90 000 ₽, срок от трёх недель',
    '- Сервис, приложение, MVP: от 150 000 ₽, после предпроектной оценки',
    '',
    '## Пакеты по масштабу бизнеса',
    '',
    '> Цена пакета — сумма позиций прайса, скидки внутри нет.',
    '> Размер команды — ориентир для подбора, а не формальная проверка.',
    '',
    '- «Старт», от 50 000 ₽, срок от 10 дней: небольшая команда до 15 человек. Лендинг «Старт» плюс лид-бот.',
    '- «Поток», от 100 000 ₽, срок от трёх недель: команда до 100 человек, стабильный поток обращений. Лендинг «Продажи» плюс бот записи и продаж.',
    '- «Система», от 150 000 ₽, срок от пяти недель: растущая компания до 250 человек. Сайт на 5–10 страниц плюс ИИ-агент с базой знаний.',
    '',
    '> Итоговая стоимость зависит от сценариев, интеграций, числа страниц и каналов.',
    '> База знаний, CRM, оплаты, WhatsApp, API, хостинг и расходы на нейросеть',
    '> считаются отдельно, если не включены в согласованный пакет.',
    '> Для компаний больше 250 человек готового пакета нет: берём отдельный',
    '> участок с понятной зоной ответственности.',
    '',
  ].join('\n');
}

/* ── Проверка мета-тегов ─────────────────────────────────────────
   Ловим до публикации то, что иначе всплывёт в Вебмастере через месяц:
   обрезанный в выдаче заголовок, два одинаковых описания на разных
   страницах, страницу-сироту без родителя и битые падежи вроде
   «в Краснодарский край».

   Сборку при этом не роняем. Файлы уже написаны, сайт работает, а вот
   молчать о найденном нельзя — иначе проверка бесполезна. Поэтому
   выводим списком и просим поправить. */
function validate() {
  const problems = [];
  const seenTitle = new Map();
  const seenDesc = new Map();
  const urls = new Set(PAGES.map((p) => p.url));

  for (const page of PAGES) {
    if (!page.file) continue;                 // главная и политика собраны вручную
    const at = page.url;

    if (!page.title) problems.push(`${at} — нет заголовка`);
    else if (page.title.length > 65) {
      problems.push(`${at} — заголовок ${page.title.length} символов, в выдаче обрежется (максимум 65)`);
    }

    if (!page.description) problems.push(`${at} — нет описания`);
    else if (page.description.length > 160) {
      problems.push(`${at} — описание ${page.description.length} символов, обрежется (максимум 160)`);
    } else if (page.description.length < 110 && !page.noindex) {
      problems.push(`${at} — описание короткое, ${page.description.length} символов (лучше 120–160)`);
    }

    if (page.parent && !urls.has(page.parent)) {
      problems.push(`${at} — родитель ${page.parent} не найден, крошки соберутся неверно`);
    }

    /* Типовые ошибки падежа. Шаблон без падежей даёт «в Краснодарский край»
       вместо «в Краснодарском крае» — читается как машинный текст. */
    const badCase = /\bв (Краснодарский край|Красноярский край|Кисловодск|Пятигорск|Лермонтов|Железноводск|Новороссийск|Красноярск|Краснодар)\b/;
    for (const [what, text] of [['заголовке', page.title], ['описании', page.description]]) {
      const m = text && text.match(badCase);
      if (m) problems.push(`${at} — в ${what} падеж: «${m[0]}»`);
    }

    /* Дубли. Два одинаковых заголовка означают, что поиск выберет одну
       страницу из двух, а вторую посчитает лишней. */
    for (const [map, value, what] of [
      [seenTitle, page.title, 'заголовок'],
      [seenDesc, page.description, 'описание'],
    ]) {
      if (!value) continue;
      if (map.has(value)) problems.push(`${at} — ${what} совпадает с ${map.get(value)}`);
      else map.set(value, at);
    }
  }

  if (!problems.length) {
    console.log('Проверка мета-тегов: чисто.');
    return;
  }
  console.log(`\n⚠ Проверка мета-тегов — замечаний: ${problems.length}`);
  problems.forEach((p) => console.log('   •', p));
  console.log('   Правится в src/pages.js.\n');
}

/* ── Запуск ──────────────────────────────────────────────────── */
function main() {
  let built = 0;

  for (const page of PAGES) {
    if (!page.file) continue;          // главная и политика собраны вручную

    const target = page.url.endsWith('.html')
      ? path.join(OUT, page.url.slice(1))
      : path.join(OUT, page.url.slice(1), 'index.html');

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buildPage(page), 'utf8');
    built += 1;
    console.log(`  ${page.url.padEnd(30)} → ${path.relative(__dirname, target)}`);
  }

  const sitemap = buildSitemap();
  /* Карта сайта одна и лежит в public/ — оттуда её отдаёт сервер по
     адресу /sitemap.xml.

     Вторая копия в корне репозитория была наследством от одностраничника,
     и она мешала: сборка переписывала её при каждом запуске, git считал
     это правкой владельца и отказывался обновлять проект, пока правку
     не отменят. Файл, который никто не открывает, останавливал работу
     раз в неделю. */
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap, 'utf8');

  fs.writeFileSync(path.join(OUT, 'llms.txt'), buildLlms(), 'utf8');

  console.log(`\nСобрано страниц: ${built}. Карта сайта и llms.txt обновлены.`);
  validate();
}

main();
