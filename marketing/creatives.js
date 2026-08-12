/* Рекламные макеты Vibe Digital 999 — рисуются в браузере, а не нейросетью.

   Почему так: шрифты и цвета берутся ровно те же, что на сайте, поэтому
   реклама и сайт выглядят одним целым. Текст настоящий и резкий, без
   нейросетевых артефактов вроде нечитаемых букв на «скриншоте».

   Формат 1080×1350 (4:5) — самый высокий, который лента ВК показывает
   целиком, не обрезая. Верхние 540px — зона превью: в ленте и в галерее
   2ГИС картинка сначала показывается маленькой, и видно только их.
   Поэтому услуга, цена и срок стоят там, а не внизу.
*/
/* Playwright намеренно НЕ прописан в package.json проекта: Amvera ставит
   зависимости при каждой сборке, а он тянет за собой браузер на сотни
   мегабайт. Сайту он не нужен, нужен только здесь и только когда
   перерисовываешь макеты. Ставится разово:

       npm install --no-save playwright

   Готовые картинки лежат в marketing/out и закоммичены — чтобы ими можно
   было пользоваться, ничего не устанавливая. */
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('\nНе найден playwright — без него рисовать нечем.\n');
  console.error('Выполните в папке проекта:\n');
  console.error('    npm install --no-save playwright\n');
  console.error('и запустите снова: node marketing/creatives.js\n');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');

const W = 1080, H = 1350;
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'out');

/* Шрифты вшиваем в разметку целиком, а не тянем ссылкой.

   Так генератор не зависит ни от запущенного сервера, ни от того,
   по какому пути лежит проект: запустится в любой папке и на любой
   машине. Файлы те же самые, что отдаёт сайт, — значит буквы в рекламе
   и на сайте одинаковые до пикселя.

   Cinzel берём только латинский: кириллицы в нём нет вовсе, русский
   текст в нём уехал бы в запасной шрифт и разъехался по начертанию.
   Поэтому Cinzel только на «VIBE DIGITAL 999», всё русское — Manrope. */
/* Берём объявления @font-face прямо из fonts.css сайта и подменяем
   в них ссылку на сам файл, вшитый в base64.

   Так сохраняется unicode-range — а он тут главное. Без него побеждает
   последнее подходящее объявление, и кириллица уезжает в латинский файл,
   где её нет: заголовок молча набирается системным шрифтом и выглядит
   тоньше и шире. На глаз это ловится не сразу, а буквы уже не те, что
   на сайте. */
const FAMILIES = ['Manrope', 'Cinzel'];

const fontCss = fs.readFileSync(path.join(ROOT, 'public/assets/fonts/fonts.css'), 'utf8')
  .split('@font-face')
  .filter(block => FAMILIES.some(f => block.includes(`'${f}'`)))
  .map(block => '@font-face' + block.slice(0, block.indexOf('}') + 1))
  .map(block => block.replace(/url\(\/assets\/fonts\/([^)]+)\)/, (_, file) => {
    const data = fs.readFileSync(path.join(ROOT, 'public/assets/fonts', file)).toString('base64');
    return `url(data:font/woff2;base64,${data})`;
  }))
  /* На макетах шрифт обязан быть готов ДО снимка: со swap браузер успеет
     нарисовать кадр запасным шрифтом, и в PNG попадёт он. */
  .map(block => block.replace('font-display: swap;', 'font-display: block;'))
  .join('\n');

/* У каждого макета свой доминирующий цвет и своя картинка в центре.
   Иначе серия из четырёх читается в ленте как одна повторённая.

   ЦЕНЫ БЕРУТСЯ ИЗ src/pages.js — там источник правды, оттуда же они
   попадают на сайт и в разметку для поисковиков. Скрипт сверяет их при
   сборке и не даёт разойтись: 11.08.2026 на макетах уехали цены бота
   и агента из старого прайса, и это чуть не разошлось с карточкой
   Яндекс Бизнеса. Расхождение сайта, рекламы и карточки читается
   клиентом как обман, а не как опечатка. */
const ITEMS = [
  {
    id: 'lending',
    color: '#00F0FF',
    eyebrow: 'Сайты · Кавминводы и по всей России',
    title: 'Сайт-лендинг',
    price: 'от 35 000 ₽',
    term: 'запуск от 3 дней',
    ticks: [
      'Исходники и доступы передаём вам',
      'Договор, ИП, закрывающие документы',
      'Заявка приходит в Telegram за секунды',
    ],
    mock: 'browser',
  },
  {
    id: 'bot',
    color: '#2D9CFF',
    eyebrow: 'Telegram-боты · Кавминводы и по всей России',
    title: 'Бот для заявок',
    price: 'от 15 000 ₽',
    term: 'срок 2–3 дня',
    ticks: [
      'Принимает заявки круглосуточно',
      'Отвечает на типовые вопросы',
      'Бот ваш: исходники и токен передаём',
    ],
    mock: 'telegram',
  },
  {
    id: 'agent',
    color: '#A855F7',
    eyebrow: 'ИИ-агенты · Кавминводы и по всей России',
    title: 'ИИ-агент<br>для бизнеса',
    price: 'от 60 000 ₽',
    term: 'запуск от 2 недель',
    ticks: [
      'Отвечает вашими словами, по вашему прайсу',
      'Квалифицирует заявку до вашего звонка',
      'Не знает ответа — зовёт человека',
    ],
    mock: 'chat',
  },
  {
    id: 'audit',
    color: '#FF4D7D',
    eyebrow: 'Аудит сайта · Кавминводы и по всей России',
    title: 'SEO-аудит<br>и 152-ФЗ',
    price: '15 000 ₽',
    term: 'отчёт за 3–5 дней',
    ticks: [
      'Почему сайт не в поиске — по пунктам',
      'Проверка форм на закон о персональных данных',
      'Список правок, а не список замечаний',
    ],
    mock: 'audit',
  },
];

/* ── Картинки в центре. Каждая показывает результат услуги,
      а не абстракцию: так человек понимает, что покупает. ── */
const MOCKS = {
  browser: `
    <div class="mock-win">
      <div class="mock-bar"><i></i><i></i><i></i><span>vibe-digital999.ru</span></div>
      <div class="mock-body">
        <div class="mk-top">
          <div class="mk-eye">Вайбкодинг · сайты и боты</div>
          <div class="mk-h">Сайты и Telegram-боты,<br><em>которые приводят заявки</em></div>
        </div>
        <div class="mk-btn">Получить расчёт проекта</div>
        <div class="mk-row">
          <span>ИП<br>и договор</span>
          <span>Исходники<br>отдаём</span>
          <span>Ответ<br>в тот же день</span>
        </div>
      </div>
    </div>`,

  telegram: `
    <div class="mock-win">
      <div class="mock-bar tg"><b>V</b><span>Бот заявок · Telegram</span></div>
      <div class="mock-body" style="justify-content:center;gap:16px">
        <div class="tg-msg">
          <b>Новая заявка с сайта</b>
          <p><i>Имя:</i> Андрей</p>
          <p><i>Телефон:</i> +7 928 ХХХ-ХХ-14</p>
          <p><i>Задача:</i> лендинг для автошколы</p>
          <time>12:04</time>
        </div>
        <div class="tg-msg">
          <b>Новая заявка с сайта</b>
          <p><i>Имя:</i> Марина</p>
          <p><i>Телефон:</i> +7 962 ХХХ-ХХ-08</p>
          <p><i>Задача:</i> бот для записи в салон</p>
          <time>12:41</time>
        </div>
      </div>
    </div>`,

  chat: `
    <div class="mock-win">
      <div class="mock-bar tg"><b>V</b><span>Ассистент · отвечает 24/7</span></div>
      <div class="mock-body chat">
        <div class="bub in">Сколько стоит бот и за сколько сделаете?</div>
        <div class="bub out">Бот со сценарием — от 15 000 ₽, срок 2–3 дня.
          Если нужны свободные ответы, это ИИ-агент, от 60 000 ₽.
          Подскажите нишу — назову точнее.</div>
        <div class="bub in">Автошкола, два филиала</div>
      </div>
    </div>`,

  audit: `
    <div class="mock-win">
      <div class="mock-bar"><i></i><i></i><i></i><span>Отчёт по сайту</span></div>
      <div class="mock-body audit">
        <div class="au bad"><em>!</em><span>Форма собирает данные без согласия</span><b>до 300 000 ₽</b></div>
        <div class="au bad"><em>!</em><span>Нет политики конфиденциальности</span><b>до 60 000 ₽</b></div>
        <div class="au ok"><em>✓</em><span>Скорость загрузки в норме</span></div>
        <div class="au ok"><em>✓</em><span>robots.txt и sitemap.xml на месте</span></div>
      </div>
    </div>`,
};

const html = it => `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<style>
${fontCss}
</style>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

  /* Цвета взяты из :root сайта — реклама и сайт должны выглядеть
     одним целым, а не «похоже». */
  :root{
    --ink:#020813; --deep:#050E1E; --white:#E8F0FF; --mist:#8A9BC4;
    --acc:${it.color};
  }

  body{width:${W}px;height:${H}px;background:var(--ink);color:var(--white);
    font-family:'Manrope',sans-serif;overflow:hidden;position:relative}

  /* Свечение и сетка вместо «киберпанк-фона» нейросети: то же ощущение,
     но ничего не отвлекает от текста и ничего не мылит. */
  body::before{content:'';position:absolute;top:-16%;left:50%;transform:translateX(-50%);
    width:1200px;height:900px;border-radius:50%;
    background:radial-gradient(ellipse at center,
      color-mix(in srgb, var(--acc) 42%, transparent) 0%,
      color-mix(in srgb, var(--acc) 17%, transparent) 38%,
      transparent 70%);
    filter:blur(70px)}
  body::after{content:'';position:absolute;inset:0;opacity:.5;
    background-image:
      linear-gradient(color-mix(in srgb, var(--acc) 16%, transparent) 1px, transparent 1px),
      linear-gradient(90deg, color-mix(in srgb, var(--acc) 16%, transparent) 1px, transparent 1px);
    background-size:56px 56px;
    mask-image:radial-gradient(ellipse at 50% 40%, #000 20%, transparent 78%)}

  /* Светящаяся дорожка по нижнему краю — приём из её макетов,
     единственное, что берём из них без изменений. */
  .glowline{position:absolute;left:0;right:0;bottom:0;height:190px;z-index:1;
    background:linear-gradient(0deg,
      color-mix(in srgb, var(--acc) 20%, transparent) 0%, transparent 100%)}

  .sheet{position:relative;z-index:2;height:100%;padding:66px 64px 56px;
    display:flex;flex-direction:column}

  /* ── Зона превью: всё главное в верхних 540px ── */
  .eyebrow{font-size:23px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;
    color:var(--acc);margin-bottom:26px}
  h1{font-size:98px;font-weight:600;line-height:1.0;letter-spacing:-.02em;
    color:#fff;margin-bottom:26px}
  .price{display:flex;align-items:baseline;gap:22px;flex-wrap:wrap}
  .price b{font-size:84px;font-weight:600;letter-spacing:-.02em;color:var(--acc);
    text-shadow:0 0 40px color-mix(in srgb, var(--acc) 55%, transparent)}
  .price span{font-size:31px;font-weight:500;color:var(--mist)}
  .rule{height:2px;margin:30px 0 0;
    background:linear-gradient(90deg,var(--acc),transparent)}

  /* ── Картинка результата ── */
  .mockwrap{flex:1;display:flex;align-items:stretch;padding:28px 0 8px;min-height:0}
  .mock-win{width:100%;display:flex;flex-direction:column;border-radius:18px;overflow:hidden;
    border:2px solid color-mix(in srgb, var(--acc) 34%, transparent);
    background:linear-gradient(180deg,rgba(5,14,30,.96),rgba(2,8,19,.96));
    box-shadow:0 26px 70px rgba(0,0,0,.6)}
  .mock-bar{display:flex;align-items:center;gap:11px;padding:16px 22px;
    background:color-mix(in srgb, var(--acc) 9%, transparent);
    border-bottom:1px solid color-mix(in srgb, var(--acc) 22%, transparent)}
  .mock-bar i{width:11px;height:11px;border-radius:50%;
    background:color-mix(in srgb, var(--acc) 45%, transparent)}
  .mock-bar span{margin-left:10px;font-size:22px;color:var(--mist);letter-spacing:.02em}
  .mock-bar.tg b{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;
    font-family:'Cinzel',serif;font-size:20px;color:var(--ink);
    background:linear-gradient(135deg,#fff,var(--acc))}
  .mock-bar.tg span{margin-left:2px;font-size:23px;color:var(--white);font-weight:600}
  .mock-body{flex:1;padding:28px 26px;display:flex;flex-direction:column;justify-content:space-between}

  .mk-eye{font-size:17px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;
    color:var(--acc);margin-bottom:14px}
  .mk-h{font-size:38px;font-weight:600;line-height:1.18;color:#fff;margin-bottom:20px}
  .mk-h em{font-style:normal;color:var(--acc)}
  .mk-btn{align-self:flex-start;margin:0;padding:14px 26px;border-radius:9px;
    font-size:20px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;
    color:var(--ink);background:var(--acc);
    box-shadow:0 0 30px color-mix(in srgb, var(--acc) 45%, transparent)}
  .mk-row{display:flex;gap:12px}
  .mk-row span{flex:1;padding:14px 12px;border-radius:10px;font-size:19px;line-height:1.35;
    color:var(--mist);text-align:center;background:rgba(138,155,196,.1);
    border:1px solid color-mix(in srgb, var(--acc) 20%, transparent)}

  .tg-msg{padding:20px 22px;border-radius:14px 14px 14px 3px;
    background:color-mix(in srgb, var(--acc) 12%, transparent);
    border:1px solid color-mix(in srgb, var(--acc) 26%, transparent)}
  .tg-msg b{display:block;font-size:29px;margin-bottom:12px}
  .tg-msg p{font-size:26px;line-height:1.5;color:var(--white)}
  .tg-msg i{font-style:normal;color:var(--mist)}
  .tg-msg time{display:block;text-align:right;font-size:19px;color:var(--acc);margin-top:8px}

  .chat{display:flex;flex-direction:column;gap:14px;justify-content:center}
  .bub{max-width:88%;padding:15px 19px;font-size:23px;line-height:1.45}
  .bub.in{align-self:flex-start;border-radius:14px 14px 14px 3px;
    background:rgba(138,155,196,.16);color:var(--white)}
  .bub.out{align-self:flex-end;border-radius:14px 14px 3px 14px;
    background:color-mix(in srgb, var(--acc) 15%, transparent);
    border:1px solid color-mix(in srgb, var(--acc) 30%, transparent)}

  .audit{display:flex;flex-direction:column;gap:14px;justify-content:center}
  .au{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:11px;
    font-size:22px;line-height:1.35}
  .au em{width:30px;height:30px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;
    font-style:normal;font-size:18px;font-weight:700}
  .au span{flex:1}
  .au b{font-size:21px;white-space:nowrap}
  .au.bad{background:rgba(255,77,125,.1);border:1px solid rgba(255,77,125,.3)}
  .au.bad em{background:#FF4D7D;color:#1a0009}
  .au.bad b{color:#FF9DB8}
  .au.ok{background:rgba(0,240,255,.07);border:1px solid rgba(0,240,255,.22)}
  .au.ok em{background:#00F0FF;color:var(--ink)}
  .au.ok span{color:var(--mist)}

  /* ── Что снимает тревогу перед обращением ── */
  .ticks{list-style:none;display:flex;flex-direction:column;gap:14px;margin:4px 0 26px}
  .ticks li{position:relative;padding-left:44px;font-size:27px;line-height:1.35;color:var(--white)}
  .ticks li::before{content:'';position:absolute;left:9px;top:.24em;
    width:12px;height:22px;border:solid var(--acc);border-width:0 4px 4px 0;
    transform:rotate(42deg)}

  /* ── Одно действие ── */
  .cta{display:flex;align-items:center;justify-content:space-between;gap:20px;
    padding:26px 32px;border-radius:16px;
    border:3px solid var(--acc);
    background:color-mix(in srgb, var(--acc) 11%, transparent);
    box-shadow:0 0 44px color-mix(in srgb, var(--acc) 30%, transparent)}
  .cta b{font-size:31px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#fff}
  .cta span{font-size:29px;font-weight:600;color:var(--acc)}

  .foot{display:flex;align-items:center;justify-content:space-between;margin-top:26px}
  /* Cinzel только на латинице: кириллицы в нём нет, русский текст в нём
     уйдёт в запасной шрифт и разъедется по начертанию. */
  .foot .mark{font-family:'Cinzel',serif;font-size:27px;font-weight:600;
    letter-spacing:.26em;color:var(--white)}
  .foot .tel{font-size:27px;font-weight:600;color:var(--mist);letter-spacing:.02em}
</style></head><body>
<div class="glowline"></div>
<div class="sheet">
  <div class="eyebrow">${it.eyebrow}</div>
  <h1>${it.title}</h1>
  <div class="price"><b>${it.price}</b><span>${it.term}</span></div>
  <div class="rule"></div>

  <div class="mockwrap">${MOCKS[it.mock]}</div>

  <ul class="ticks">${it.ticks.map(t => `<li>${t}</li>`).join('')}</ul>

  <div class="cta"><b>Оставить заявку</b><span>vibe-digital999.ru</span></div>

  <div class="foot">
    <div class="mark">VIBE DIGITAL 999</div>
    <div class="tel">+7 999 244 99 99</div>
  </div>
</div>
</body></html>`;

/* ── Сверка цен с сайтом ───────────────────────────────────────
   Макет с ценой, которой нет на сайте, хуже макета без цены: клиент
   приходит по рекламе, видит другую сумму и уходит. Поэтому сборка
   падает, а не рисует молча.

   11.08.2026 на макетах уехали цены бота (25 000 вместо 15 000) и
   агента (40 000 вместо 60 000) — взяты из старого прайса. Поймано
   случайно, когда цены уже уходили в карточку Яндекс Бизнеса.
   Расхождение сайта, рекламы и карточки клиент читает как обман. */
const OFFERS = require(path.join(ROOT, 'src/pages.js')).PAGES
  .filter(p => p.offer && p.offer.price)
  .reduce((m, p) => (m[p.url] = p.offer.price, m), {});

const CHECK = {
  lending: '/uslugi/razrabotka-sajta/',
  bot:     '/uslugi/telegram-bot/',
  agent:   '/uslugi/ai-agent/',
  audit:   '/uslugi/seo-audit-152fz/',
};

let mismatch = 0;
for (const it of ITEMS) {
  const want = OFFERS[CHECK[it.id]];
  const got = it.price.replace(/[^0-9]/g, '');
  if (want !== got) {
    console.error(`  ✗ ${it.id}: на макете ${got} ₽, на сайте ${want} ₽ (${CHECK[it.id]})`);
    mismatch++;
  }
}
if (mismatch) {
  console.error('\nЦены разошлись с сайтом. Правьте ITEMS или src/pages.js — но так, чтобы совпало.\n');
  process.exit(1);
}
console.log('  цены сверены с src/pages.js: совпадают\n');

fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const CHROME = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(
    fs.existsSync(CHROME) ? { executablePath: CHROME } : {});
  const only = process.argv[2];

  for (const it of ITEMS) {
    if (only && it.id !== only) continue;
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(html(it), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    /* Контроль: ничего не должно вылезать за холст и за зону превью */
    const check = await page.evaluate((H) => {
      const s = document.querySelector('.sheet');
      const price = document.querySelector('.price').getBoundingClientRect();
      return {
        высотаЛиста: Math.round(s.scrollHeight),
        переполнение: Math.round(s.scrollHeight - H),
        ценаЗаканчиваетсяНа: Math.round(price.bottom),
      };
    }, H);

    await page.screenshot({ path: path.join(OUT, `${it.id}.png`) });
    console.log(`  ${it.id.padEnd(8)} → marketing/out/${it.id}.png   переполнение: ${check.переполнение}px, цена заканчивается на ${check.ценаЗаканчиваетсяНа}px (зона превью 540)`);
    await ctx.close();
  }
  await browser.close();
})();
