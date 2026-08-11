#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   СБОРКА ПОСАДОЧНЫХ СТРАНИЦ

       node tools/build-pages.js

   Берёт тексты из tools/pages-data.js и раскладывает готовые HTML-файлы
   по public/uslugi и public/portfolio. Заодно переписывает sitemap.xml.

   ЭТО НЕ СБОРЩИК ФРОНТЕНДА. Ни зависимостей, ни трансляции, ни минификации:
   на выходе обычный HTML, который читается глазами и правится руками.
   Скрипт нужен ровно затем, чтобы шапка, подвал, форма и разметка для
   поисковиков не разъехались по семи файлам. Правка телефона в шести
   местах из семи — вопрос времени, а не аккуратности.

   ПРАВИТЬ ТЕКСТ СТРАНИЦ — в tools/pages-data.js, потом перезапустить сборку.
   Прямая правка собранных index.html пропадёт при следующем запуске.
═══════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const { SITE, STEPS, COMMON_FAQ, CASES, LABELS, pages } = require('./pages-data');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

/* Дата берётся из аргумента или из системных часов. Она уходит в
   lastmod карты сайта: робот смотрит на неё, решая, перечитывать ли
   страницу, — со вчерашней датой свежий текст пролежит непрочитанным. */
const TODAY = process.argv[2] || new Date().toISOString().slice(0, 10);

/* Экранируем только то, что ломает JSON: в разметку для поисковиков
   тексты уходят строками, и незакрытая кавычка убивает весь блок. */
const j = s => JSON.stringify(String(s).replace(/<[^>]+>/g, ''));

/* Текст без тегов — для description и разметки. */
const plain = s => String(s).replace(/<[^>]+>/g, '');

const HEAD = p => `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${p.title}</title>
<meta name="description" content="${p.description}" />
<meta name="keywords" content="${p.keywords}" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="${SITE}/${p.slug}/" />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="Vibe Digital 999" />
<meta property="og:locale" content="ru_RU" />
<meta property="og:url" content="${SITE}/${p.slug}/" />
<meta property="og:title" content="${p.title}" />
<meta property="og:description" content="${p.description}" />
<meta property="og:image" content="${SITE}/assets/logo-g.png" />
<meta name="twitter:card" content="summary_large_image" />

<link rel="icon" href="/assets/favicon.ico" sizes="any" />
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#020813" />

<link rel="preload" href="/assets/fonts/manrope-cyrillic-xn7gYHE41ni1AdIRggOxSuXd.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="/assets/fonts/fonts.css" />
<link rel="stylesheet" href="/assets/site.css" />
</head>
<body>`;

const TOP = `
<header class="top">
  <a class="top-logo" href="/">Vibecoding</a>
  <div class="top-right">
    <a class="top-phone" href="tel:+79992449999" data-goal="click_tel">+7 999 244 99 99</a>
    <a class="top-cta" href="#zayavka">Оставить заявку</a>
  </div>
</header>`;

const crumbs = p => `
<nav class="crumbs wrap" aria-label="Хлебные крошки">
  <ol>
    <li><a href="/">Главная</a></li>
    <li><a href="/#${p.type === 'case' ? 'portfolio' : 'services'}">${p.type === 'case' ? 'Портфолио' : 'Услуги'}</a></li>
    <li>${p.crumb}</li>
  </ol>
</nav>`;

const facts = p => !p.facts ? '' : `
    <ul class="phero-facts">
      ${p.facts.map(f => `<li>${f.k}: <b>${f.v}</b></li>`).join('\n      ')}
    </ul>`;

const hero = p => `
<section class="phero">
  <div class="wrap">
    <h1>${p.h1}<span class="accent">${p.accent}</span></h1>
    <p class="phero-pain">${p.pain}</p>${facts(p)}
    <div class="actions">
      <a class="btn" href="#zayavka">Получить расчёт</a>
      ${p.liveLink
        ? `<a class="btn btn-ghost" href="${p.liveLink.href}" target="_blank" rel="noopener" data-goal="case_link">${p.liveLink.text}</a>`
        : `<a class="btn btn-ghost" href="/#portfolio">Посмотреть кейсы</a>`}
    </div>
    ${p.status ? `<p class="status">${p.status}</p>` : ''}
  </div>
</section>`;

const block = (eyebrow, b) => !b ? '' : `
<section>
  <div class="wrap">
    <div class="eyebrow">${eyebrow}</div>
    <h2>${b.title}</h2>
    ${b.lead ? `<p class="lead">${b.lead}</p>` : ''}
    <ul class="ticks" ${b.lead ? 'style="margin-top:1.4rem"' : ''}>
      ${b.items.map(i => `<li>${i}</li>`).join('\n      ')}
    </ul>
  </div>
</section>`;

const price = p => !p.price ? '' : `
<section>
  <div class="wrap">
    <div class="eyebrow">Сколько стоит</div>
    <h2>Цена и что в неё входит</h2>
    <div class="pricebox">
      <div class="sum">${p.price.sum}</div>
      <p class="note">${p.price.note}</p>
    </div>
  </div>
</section>`;

const steps = p => p.type === 'case' ? '' : `
<section>
  <div class="wrap">
    <div class="eyebrow">Без сюрпризов</div>
    <h2>Как идёт работа</h2>
    <ol class="steps">
      ${STEPS.map(s => `<li><b>${s.b}</b><span>${s.s}</span></li>`).join('\n      ')}
    </ol>
  </div>
</section>`;

const caseBlock = p => {
  const c = p.caseKey && CASES[p.caseKey];
  if (!c) return '';
  return `
<section>
  <div class="wrap">
    <div class="eyebrow">Из работ</div>
    <h2>Похожий проект</h2>
    <div class="casebox">
      <div class="tag">${c.tag}</div>
      <h3>${c.name}</h3>
      <p>${c.text}</p>
      <p class="stack">${c.stack}</p>
      ${c.link ? `<p><a class="more" href="${c.link}" target="_blank" rel="noopener" data-goal="case_link">${c.linkText} →</a></p>` : ''}
      ${c.status ? `<p class="status">${c.status}</p>` : ''}
      <p><a class="more" href="${c.more}">Разбор проекта →</a></p>
    </div>
  </div>
</section>`;
};

const faqBlock = p => {
  const items = p.faq.concat(p.type === 'case' ? [] : COMMON_FAQ);
  return {
    html: `
<section>
  <div class="wrap">
    <div class="eyebrow">Отвечаем честно</div>
    <h2>Частые вопросы</h2>
    <div class="faq">
      ${items.map(f => `<details>
        <summary>${f.q}</summary>
        <p>${f.a}</p>
      </details>`).join('\n      ')}
    </div>
  </div>
</section>`,
    items,
  };
};

const form = p => `
<section id="zayavka">
  <div class="wrap">
    <div class="eyebrow">Следующий шаг</div>
    <h2>Оставить заявку</h2>
    <p class="lead" style="margin-bottom:1.6rem">Опишите задачу в двух словах. Ответим в день обращения и назовём вилку цены — до этого момента вы ничего не должны.</p>

    <div class="formbox">
      <form id="lead-form" novalidate>
        <div class="field">
          <label for="lf-name">Ваше имя</label>
          <input type="text" id="lf-name" name="name" placeholder="Как к вам обращаться?" autocomplete="name" required />
        </div>

        <div class="field">
          <label for="lf-contact">Телефон или Telegram</label>
          <input type="text" id="lf-contact" name="contact" placeholder="+7... или @ник" required />
        </div>

        <div class="field">
          <label for="lf-comment">Задача</label>
          <textarea id="lf-comment" name="comment" rows="3" placeholder="Что нужно сделать и к какому сроку"></textarea>
        </div>

        <input type="hidden" id="lf-service" name="service" value="${p.service}" />

        <!-- Две галочки, а не одна. Согласие на обработку данных и
             ознакомление с политикой — разные действия, и закон разводит
             их намеренно. Обе пустые: предзаполненное согласие согласием
             не является, отметить его должен человек. -->
        <label class="consent">
          <input type="checkbox" id="lf-consent" required />
          <span>Даю <a href="/privacy.html#consent" target="_blank" rel="noopener">согласие на обработку персональных данных</a> — имени и контакта, чтобы со мной связались по этой заявке</span>
        </label>

        <label class="consent">
          <input type="checkbox" id="lf-policy" required />
          <span>Ознакомлен с <a href="/privacy.html" target="_blank" rel="noopener">политикой конфиденциальности</a></span>
        </label>

        <p class="err" id="lead-error" role="alert" hidden></p>

        <button type="submit" class="submit">Отправить заявку</button>
      </form>

      <div class="done" id="lead-done">
        <b>Заявка принята</b>
        <span>Ответим на ваш контакт в день обращения.</span>
      </div>

      <p class="form-under">Не любите формы — напишите в <a href="https://wa.me/79992449999" target="_blank" rel="noopener" data-goal="click_wa">WhatsApp</a> или <a href="https://t.me/GranatJarvis_bot" target="_blank" rel="noopener" data-goal="click_tg">Telegram</a>.</p>
    </div>
  </div>
</section>`;

const also = p => !p.also ? '' : `
<section>
  <div class="wrap">
    <div class="eyebrow">Смотрите также</div>
    <h2>Другие услуги и работы</h2>
    <ul class="also">
      ${p.also.map(s => `<li><a href="/${s}/">${LABELS[s]}</a></li>`).join('\n      ')}
    </ul>
  </div>
</section>`;

const FOOT = `
<footer class="foot">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <div class="foot-brand">Vibe Digital 999</div>
        <p class="req">Сайты, Telegram-боты и ИИ-автоматизация на чистом коде. Исходники передаём заказчику.</p>
      </div>
      <div>
        <h4>Связаться</h4>
        <a href="tel:+79992449999" data-goal="click_tel">+7 999 244 99 99</a>
        <a href="mailto:gulnaravibecoder999@yandex.ru" data-goal="click_email">gulnaravibecoder999@yandex.ru</a>
        <a href="https://wa.me/79992449999" target="_blank" rel="noopener" data-goal="click_wa">WhatsApp</a>
        <a href="https://t.me/GranatJarvis_bot" target="_blank" rel="noopener" data-goal="click_tg">Telegram</a>
        <a href="https://vk.ru/club240607590" target="_blank" rel="noopener" data-goal="click_vk">ВКонтакте</a>
      </div>
      <div>
        <h4>Реквизиты</h4>
        <p class="req">ИП Мелконян Гульнара Рифкатовна</p>
        <p class="req">ИНН 490600091128</p>
        <p class="req">ОГРНИП 326490000005218</p>
        <p class="req">Ставропольский край, г. Лермонтов, ул. Нагорная, д. 2/1</p>
      </div>
    </div>

    <div class="foot-bottom">
      <span>© 2026 Vibe Digital 999</span>
      <a href="/">Главная</a>
      <a href="/privacy.html">Политика конфиденциальности</a>
      <a href="/privacy.html#consent">Согласие на обработку персональных данных</a>
      <a href="/privacy.html#cookies">Использование cookie</a>
    </div>
  </div>
</footer>

<div class="rail" role="group" aria-label="Связаться с нами">
  <a href="tel:+79992449999" data-goal="click_tel" aria-label="Позвонить: +7 999 244 99 99"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg></a>
  <a href="https://wa.me/79992449999" target="_blank" rel="noopener" data-goal="click_wa" aria-label="Написать в WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.21-8.24 8.21z"/></svg></a>
  <a href="https://t.me/GranatJarvis_bot" target="_blank" rel="noopener" data-goal="click_tg" aria-label="Написать в Telegram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.94 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.64 6.86-1.55 7.33c-.12.52-.42.65-.85.4l-2.35-1.73-1.13 1.09c-.13.13-.24.24-.48.24l.17-2.4 4.37-3.95c.19-.17-.04-.26-.29-.09l-5.4 3.4-2.33-.73c-.5-.16-.51-.5.11-.75l9.1-3.51c.42-.15.79.1.63.7z"/></svg></a>
  <a href="https://vk.me/club240607590" target="_blank" rel="noopener" data-goal="click_vk" aria-label="Написать во ВКонтакте"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.79 16.95c-5.24 0-8.4-3.63-8.52-9.66h2.65c.08 4.43 2.09 6.32 3.64 6.7V7.29h2.52v3.83c1.51-.16 3.1-1.9 3.63-3.83h2.49a7.24 7.24 0 0 1-3.34 4.73c1.72.79 3.09 2.24 3.72 4.93h-2.74c-.5-1.62-1.55-2.88-3.76-3.08v3.08h-.29z"/></svg></a>
</div>

<div class="ck" id="ck" role="dialog" aria-label="Согласие на обработку данных" hidden>
  <p><span class="ck-full">Яндекс.Метрика считает посещения сайта обезличенно. Запись экрана и карта кликов включаются только с вашего согласия. Подробнее — в</span><span class="ck-short">Метрика считает посещения обезличенно. Запись экрана — только с вашего согласия. Подробнее — в</span> <a href="/privacy.html#cookies">разделе о cookie</a>.</p>
  <div class="ck-btns">
    <button type="button" id="ck-yes">Принять</button>
    <button type="button" class="no" id="ck-no">Только необходимые</button>
  </div>
</div>

<script src="/assets/site.js" defer></script>
</body>
</html>`;

/* ── Разметка для поисковиков ────────────────────────────────────
   Три блока: хлебные крошки (Яндекс показывает их в сниппете вместо
   голого адреса), сама услуга и вопросы. FAQPage даёт шанс на
   раскрытые вопросы прямо в выдаче. */
function schema(p, faqItems) {
  const crumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: p.type === 'case' ? 'Портфолио' : 'Услуги', item: SITE + '/#' + (p.type === 'case' ? 'portfolio' : 'services') },
      { '@type': 'ListItem', position: 3, name: p.crumb, item: `${SITE}/${p.slug}/` },
    ],
  };

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(f => ({
      '@type': 'Question',
      name: plain(f.q),
      acceptedAnswer: { '@type': 'Answer', text: plain(f.a) },
    })),
  };

  const main = p.type === 'case'
    ? {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: plain(p.h1),
        description: p.description,
        url: `${SITE}/${p.slug}/`,
        creator: { '@type': 'Organization', name: 'Vibe Digital 999', url: SITE + '/' },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: plain(p.h1),
        description: p.description,
        url: `${SITE}/${p.slug}/`,
        serviceType: p.crumb,
        provider: {
          '@type': 'Organization',
          name: 'Vibe Digital 999',
          url: SITE + '/',
          telephone: '+7 999 244 99 99',
          email: 'gulnaravibecoder999@yandex.ru',
        },
        areaServed: [
          { '@type': 'Country', name: 'Россия' },
          { '@type': 'City', name: 'Лермонтов' },
          { '@type': 'City', name: 'Пятигорск' },
          { '@type': 'City', name: 'Ессентуки' },
          { '@type': 'City', name: 'Кисловодск' },
          { '@type': 'City', name: 'Железноводск' },
          { '@type': 'City', name: 'Минеральные Воды' },
        ],
      };

  return [crumbList, main, faqPage]
    .map(o => `<script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n</script>`)
    .join('\n');
}

/* ── Сборка ──────────────────────────────────────────────────── */
let built = 0;
for (const p of pages) {
  const faq = faqBlock(p);

  const html = [
    HEAD(p),
    `<!-- ═══════════════════════════════════════════════════════════
     СТРАНИЦА СОБРАНА АВТОМАТИЧЕСКИ. Правки здесь пропадут.
     Текст живёт в tools/pages-data.js, сборка — node tools/build-pages.js
     Собрано: ${TODAY}
════════════════════════════════════════════════════════════════ -->`,
    TOP,
    crumbs(p),
    '<main>',
    hero(p),
    block(p.type === 'case' ? 'Задача' : 'Кому это нужно', p.who),
    block(p.type === 'case' ? 'Результат' : 'Результат', p.result),
    block(p.type === 'case' ? 'Подробности' : 'Состав работ', p.includes),
    price(p),
    steps(p),
    caseBlock(p),
    faq.html,
    form(p),
    also(p),
    '</main>',
    FOOT.replace('<script src="/assets/site.js" defer></script>', schema(p, faq.items) + '\n<script src="/assets/site.js" defer></script>'),
  ].join('\n');

  const dir = path.join(PUBLIC, p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html.trimStart() + '\n', 'utf8');
  console.log('  /' + p.slug + '/');
  built++;
}

/* ── Карта сайта ─────────────────────────────────────────────── */
const urls = [
  { loc: SITE + '/', freq: 'weekly', pri: '1.0' },
  ...pages.map(p => ({
    loc: `${SITE}/${p.slug}/`,
    freq: 'monthly',
    pri: p.type === 'case' ? '0.7' : '0.9',
  })),
  { loc: SITE + '/privacy.html', freq: 'yearly', pri: '0.1' },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  sitemap.xml для vibe-digital999.ru

  СОБИРАЕТСЯ АВТОМАТИЧЕСКИ: node tools/build-pages.js
  Руками не правьте — перезапишется. Новая страница появляется здесь
  сама, как только её добавили в tools/pages-data.js.

  Дата в lastmod ставится днём сборки. Робот смотрит на неё, решая,
  перечитывать ли страницу: со старой датой свежий текст может
  пролежать непрочитанным неделями.

  Сохранять в UTF-8 без BOM, отдавать с Content-Type: application/xml.
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(PUBLIC, 'sitemap.xml'), sitemap, 'utf8');

console.log(`\nСобрано страниц: ${built}. Карта сайта: ${urls.length} адресов, дата ${TODAY}.`);
