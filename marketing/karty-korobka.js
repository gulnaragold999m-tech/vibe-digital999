/* Карточка услуги «коробкой» — для Товаров и услуг в Яндекс Бизнесе.

   Манера взята с макета, который прислала владелица 13.08.2026: товар
   стоит коробкой, слева корешок, справа столбец коротких выгод. Приём
   маркетплейсов, и он работает: услугу видно как вещь, которую покупают.

   ЧТО ИСПРАВЛЕНО ПРОТИВ ТОГО МАКЕТА. На нём было три ошибки, и все три
   такого рода, что их замечает клиент, а не мы:

     1. Штрафы «до 300 000 ₽» и «до 60 000 ₽» — устаревшие. Верные
        цифры «до 700 000 ₽» и «до 100 000 ₽» проставлены в макетах
        13.08, а картинка собрана раньше.
     2. «Отчёт за 3–5 дней» против «3 дня» в прайсе. Ровно то
        расхождение сроков, которое чинили 13.08.
     3. Правый столбец «Подходит для изучения», «Понятная подача
        материала», «Актуальная веб-разработка» — описание учебного
        курса, оставшееся от чужого шаблона. К услуге отношения нет.

   Поэтому здесь ЦЕНА И СРОК НЕ ЗАПИСАНЫ — они читаются из src/prices.js
   по идентификатору услуги. Устареть, как на том макете, им нечем.

   Запуск:

       npm run karty-korobka              все услуги, для которых заведён текст
       npm run karty-korobka lending      одна

   Первый запуск попросит поставить playwright:

       npm install --no-save playwright

   ПРО МОДЕРАЦИЮ. На этой карточке цена есть — так её просила владелица,
   и так устроен образец. Помнить: Яндекс снимает изображения
   с рекламными наложениями, а проверить границу по документации
   не удалось — yandex.ru закрыт из песочницы ассистента. Отклонят —
   рядом лежит сдержанный вариант без цены, karty-cards.js. */

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('\nНе найден playwright — без него рисовать нечем.\n');
  console.error('Выполните в папке проекта:\n');
  console.error('    npm install --no-save playwright\n');
  console.error('и запустите снова: npm run karty-korobka\n');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');
const PRICES = require(path.join(__dirname, '..', 'src', 'prices'));
const { fontCss } = require('./shrifty');

const W = 1080, H = 1440;             /* 3:4 — пропорция образца; в карточке
                                         товара и в ленте показывается целиком */
const OUT = path.join(__dirname, 'out');

/* Значки правого столбца. Рисуются линиями, а не шрифтом иконок:
   шрифт пришлось бы вшивать четвёртым файлом, а линий тут на десять
   строк. `currentColor` — чтобы значок красился цветом услуги. */
const ZNAK = {
  kod: '<path d="M9 8 3 14l6 6M19 8l6 6-6 6M16 5l-4 22"/>',
  telefon: '<rect x="8" y="3" width="12" height="22" rx="3"/><path d="M12 21h4"/>',
  shchit: '<path d="M14 3 5 7v7c0 6 4 9.5 9 11 5-1.5 9-5 9-11V7l-9-4Z"/><path d="M10 14l3 3 5-6"/>',
  klyuch: '<circle cx="10" cy="10" r="5"/><path d="M13.5 13.5 25 25M21 21l3-3M18 18l3-3"/>',
  soobshchenie: '<path d="M4 6h20v14H12l-6 5v-5H4V6Z"/>',
  chasy: '<circle cx="14" cy="14" r="11"/><path d="M14 7v7l5 3"/>',
  papka: '<path d="M3 8h8l3 3h11v13H3V8Z"/>',
  glaz: '<path d="M2 14s4.5-7 12-7 12 7 12 7-4.5 7-12 7-12-7-12-7Z"/><circle cx="14" cy="14" r="3.5"/>',
};

/* Текст карточек. Цена и срок сюда НЕ вписываются — берутся из прайса
   по полю `usluga`. Всё остальное — то, что мы действительно делаем:
   ни одного обещания, которого нет на сайте и в договоре. */
const KARTOCHKI = [
  {
    id: 'lending',
    usluga: 'lending-start',
    color: '#00F0FF',
    color2: '#2D9CFF',
    eyebrow: 'Сайты · Кавминводы и по всей России',
    title: 'Сайт-лендинг',
    srokPrefix: 'запуск',
    /* Три строки на самой коробке — то же, что на рекламном макете
       лендинга в creatives.js. Расходиться им нельзя: человек видит
       и то и другое. */
    ticks: [
      'Исходники и доступы передаём вам',
      'Договор, ИП, закрывающие документы',
      'Заявка приходит в Telegram за секунды',
    ],
    /* Правый столбец. На образце тут стояло «подходит для изучения»
       и «понятная подача материала» — чужой шаблон про учебный курс.
       Здесь только то, что отличает нашу работу от конструктора. */
    vygody: [
      { znak: 'kod', text: 'Чистый код,<br>без конструктора' },
      { znak: 'telefon', text: 'Сначала телефон,<br>потом компьютер' },
      { znak: 'shchit', text: 'Форма по 152-ФЗ:<br>согласие и политика' },
      { znak: 'klyuch', text: 'Исходники<br>передаём вам' },
      { znak: 'soobshchenie', text: 'Заявка приходит<br>в Telegram' },
      { znak: 'chasy', text: 'Нет абонентской<br>платы за хостинг' },
    ],
    /* Что видно «в окне» на коробке — результат, а не абстракция.

       ЦИФР ЗДЕСЬ НЕТ НАМЕРЕННО. В первой версии стояли «загрузка 1,1 с»
       и «PageSpeed 92» — я их выдумал, замеров под эти числа у нас нет.
       Выдуманный замер на карточке товара — это то же самое, что
       выдуманная цена: клиент придёт с ним и попросит показать.
       Поэтому строки только про то, что мы действительно отдаём
       и что видно в договоре и на сайте. */
    okno: {
      zagolovok: 'Что получаете при сдаче',
      stroki: [
        { text: 'Согласие на обработку данных', hvost: 'есть' },
        { text: 'Заявка уходит в Telegram', hvost: 'да' },
        { text: 'Исходники и доступы', hvost: 'вам' },
        { text: 'Абонентская плата за сайт', hvost: 'нет' },
      ],
    },
  },
];

const svg = (d, color) =>
  `<svg viewBox="0 0 28 28" fill="none" stroke="${color}" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

const html = (k) => `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<style>
${fontCss}
</style>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

  :root{
    --ink:#020813; --white:#E8F0FF; --mist:#8A9BC4;
    --acc:${k.color}; --acc2:${k.color2};
  }

  body{width:${W}px;height:${H}px;background:var(--ink);color:var(--white);
    font-family:'Manrope',sans-serif;overflow:hidden;position:relative}

  /* Свечение и сетка — как на рекламных макетах и карточках пакетов:
     объём без картинки, которая отвлекала бы от текста. */
  body::before{content:'';position:absolute;top:-14%;left:50%;transform:translateX(-50%);
    width:1240px;height:1000px;border-radius:50%;
    background:radial-gradient(ellipse at center,
      color-mix(in srgb, var(--acc) 34%, transparent) 0%,
      color-mix(in srgb, var(--acc2) 16%, transparent) 42%,
      transparent 72%);
    filter:blur(80px)}
  body::after{content:'';position:absolute;inset:0;opacity:.4;
    background-image:
      linear-gradient(color-mix(in srgb, var(--acc) 14%, transparent) 1px, transparent 1px),
      linear-gradient(90deg, color-mix(in srgb, var(--acc) 14%, transparent) 1px, transparent 1px);
    background-size:58px 58px;
    mask-image:radial-gradient(ellipse at 50% 42%, #000 24%, transparent 78%)}

  .sheet{position:relative;z-index:2;height:100%;padding:64px 60px 52px;
    display:flex;flex-direction:column}

  /* ── Шапка ─────────────────────────────────────────────── */
  h1{font-size:104px;line-height:.96;font-weight:800;letter-spacing:-.025em}
  h1 em{font-style:normal;color:var(--acc)}

  .plashka{margin-top:26px;display:inline-flex;align-self:flex-start;
    align-items:center;gap:22px;padding:16px 30px;border-radius:20px;
    border:2px solid color-mix(in srgb, var(--acc) 60%, transparent);
    background:color-mix(in srgb, var(--acc) 12%, transparent);
    box-shadow:0 0 40px color-mix(in srgb, var(--acc) 26%, transparent)}
  .plashka b{font-size:46px;font-weight:800;letter-spacing:-.01em}
  .plashka i{width:2px;height:38px;background:color-mix(in srgb, var(--white) 22%, transparent)}
  .plashka span{font-size:30px;color:var(--mist)}

  /* ── Сцена с коробкой ──────────────────────────────────── */
  .scena{margin-top:44px;flex:1;display:flex;gap:34px;align-items:stretch}

  /* ГЛУБИНА КОРОБКИ — одно число, от него считаются боковая и верхняя
     грани. Первая версия была 64px при развороте 15°: боковина в кадре
     занимала 64·sin15° ≈ 16 пикселей, и предмет читался плоской панелью,
     а не коробкой. Владелица сказала прямо — «книга не выходит».
     Теперь 118px при 24°: боковина ≈ 48px, ребро видно. */
  .scena{--glub:118px}

  /* align-items:stretch, а не center: коробка занимает всю высоту сцены,
     и тень внизу оказывается прямо под дном. При center коробка висела
     посередине, а тень оставалась у нижнего края контейнера — в полусотне
     пикселей под ней, и предмет всё равно не стоял. */
  .box3d{position:relative;perspective:1800px;perspective-origin:50% 38%;
    flex:0 0 600px;display:flex;align-items:stretch;padding-bottom:58px}

  /* Тень на поверхности. Без неё коробка висит в пустоте: объём есть,
     а стоять ей не на чем — глаз это замечает раньше, чем разбирает
     грани. Две тени: чёрная под дном и цветной отсвет пошире. */
  .box3d::after{content:'';position:absolute;z-index:0;
    left:2%;right:6%;bottom:14px;height:54px;border-radius:50%;
    background:radial-gradient(ellipse at 50% 50%,
      rgba(0,0,0,.85) 0%, rgba(0,0,0,.45) 45%, transparent 72%);
    filter:blur(20px)}
  .box3d::before{content:'';position:absolute;z-index:0;
    left:-4%;right:-2%;bottom:0;height:88px;border-radius:50%;
    background:radial-gradient(ellipse at 50% 50%,
      color-mix(in srgb, var(--acc) 26%, transparent) 0%, transparent 70%);
    filter:blur(34px)}

  .box{position:relative;z-index:1;transform-style:preserve-3d;flex:1;display:flex;
    transform:rotateY(-24deg) rotateX(2deg)}

  /* Верхняя грань — отгибается назад от верхнего ребра лица. Видна
     узкой полосой, потому что смотрим чуть сверху (perspective-origin
     выше середины). Именно она превращает «панель с боковиной»
     в закрытый объём. */
  .top{position:absolute;left:0;bottom:100%;width:100%;height:var(--glub);
    transform-origin:bottom center;transform:rotateX(-90deg);
    background:linear-gradient(180deg,#12203C,#0A1426);
    border:1px solid color-mix(in srgb, var(--acc) 22%, transparent);
    border-radius:8px 8px 2px 2px}

  /* Корешок — боковая грань, отогнутая назад от левого ребра лица.

     Как считается. Элемент ставится ЛЕВЕЕ лица (right:100%), значит его
     правое ребро совпадает с левым ребром лица. Точка вращения — это
     самое правое ребро, поворот на -90° уводит левый край назад ровно
     на свою ширину, то есть на глубину коробки.

     Первая версия вращалась вокруг точки внутри лица и с лишним
     сдвигом — корешок ложился поперёк передней грани и перечёркивал
     цену. На глаз это видно сразу, но только если посмотреть картинку,
     а не поверить, что «CSS правильный». */
  .spine{position:absolute;top:0;right:100%;width:var(--glub);height:100%;
    transform-origin:right center;transform:rotateY(90deg);
    /* Боковина темнее лица: плоскость уходит от света, и без этого
       перепада грани сливаются в одну картонку. Слева по ребру —
       светлая полоса, это сгиб. */
    background:linear-gradient(90deg,#040A16 0%,#0A1426 62%,#101E38 100%);
    border:1px solid color-mix(in srgb, var(--acc) 22%, transparent);
    border-radius:8px 0 0 8px;
    box-shadow:inset -18px 0 34px rgba(0,0,0,.55);
    display:flex;align-items:center;justify-content:center}
  /* Корешок повёрнут наружу, то есть к зрителю он обращён ИЗНАНКОЙ,
     и текст на нём выходит зеркальным. Первая версия так и вышла:
     «Сайт-лендинг» читался вывернутыми буквами снизу вверх. Поворот
     содержимого на 180° вокруг вертикальной оси гасит зеркало —
     буквы встают как надо. Проверять такое можно только глазами
     на увеличенном куске картинки: на общем плане надпись мелкая
     и выглядит правдоподобно. */
  .spine span{writing-mode:vertical-rl;
    font-size:22px;font-weight:700;letter-spacing:.12em;
    color:color-mix(in srgb, var(--white) 72%, transparent)}

  .face{position:relative;flex:1;padding:34px 32px 30px;border-radius:8px;
    background:linear-gradient(155deg,#0C1830 0%,#060E1E 55%,#040A16 100%);
    border:1px solid color-mix(in srgb, var(--acc) 30%, transparent);
    box-shadow:0 40px 90px rgba(0,0,0,.6),
               0 0 70px color-mix(in srgb, var(--acc) 14%, transparent);
    display:flex;flex-direction:column}
  /* Блик по левому краю — от него коробка читается объёмной. */
  .face::before{content:'';position:absolute;inset:0;border-radius:8px;
    background:linear-gradient(100deg,
      color-mix(in srgb, var(--white) 9%, transparent) 0%,
      transparent 26%);
    pointer-events:none}

  .f-eye{font-size:15px;font-weight:700;letter-spacing:.16em;
    text-transform:uppercase;color:var(--acc)}
  .f-title{margin-top:14px;font-size:56px;line-height:1;font-weight:800;
    letter-spacing:-.02em}
  .f-cena{margin-top:16px;display:flex;align-items:baseline;gap:16px}
  .f-cena b{font-size:44px;font-weight:800;color:var(--acc)}
  .f-cena span{font-size:23px;color:var(--mist)}
  .f-line{margin-top:20px;height:1px;
    background:color-mix(in srgb, var(--acc) 34%, transparent)}

  /* Окно тянется на всю свободную высоту лица, а строки внутри делят её
     поровну. Без этого свободное место собиралось одной пустой полосой
     между окном и галочками — примерно в четверть коробки. */
  .okno{margin-top:22px;flex:1;border-radius:10px;padding:16px;
    display:flex;flex-direction:column;
    background:rgba(2,8,19,.72);
    border:1px solid color-mix(in srgb, var(--white) 10%, transparent)}
  .okno .bar{display:flex;align-items:center;gap:8px;
    font-size:16px;color:var(--mist);margin-bottom:14px}
  .okno .bar u{width:8px;height:8px;border-radius:50%;
    background:color-mix(in srgb, var(--white) 22%, transparent)}
  .okno .rows{flex:1;display:flex;flex-direction:column;gap:10px}
  .okno .row{flex:1;display:flex;align-items:center;gap:12px;padding:10px 14px;
    border-radius:8px;font-size:18px;
    background:color-mix(in srgb, var(--acc) 9%, transparent);
    border:1px solid color-mix(in srgb, var(--acc) 22%, transparent)}
  .okno .row em{flex:0 0 auto;width:24px;height:24px;border-radius:7px;
    display:flex;align-items:center;justify-content:center;font-style:normal;
    font-size:14px;font-weight:800;color:var(--ink);background:var(--acc)}
  .okno .row span{flex:1}
  .okno .row b{color:var(--acc);font-size:17px}

  .ticks{margin-top:auto;padding-top:22px;display:flex;flex-direction:column;gap:11px}
  .ticks div{display:flex;gap:12px;font-size:20px;line-height:1.25}
  .ticks em{font-style:normal;color:var(--acc);font-weight:800}

  .cta{margin-top:24px;padding:18px 22px;border-radius:12px;
    border:2px solid var(--acc);display:flex;align-items:center;
    justify-content:space-between;
    box-shadow:0 0 34px color-mix(in srgb, var(--acc) 24%, transparent)}
  .cta b{font-size:24px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
  .cta span{font-size:19px;color:var(--acc)}

  .f-foot{margin-top:16px;display:flex;align-items:center;
    justify-content:space-between}
  .f-foot .mark{font-family:'Cinzel',serif;font-size:19px;letter-spacing:.28em;
    color:color-mix(in srgb, var(--white) 55%, transparent)}
  .f-foot .tel{font-size:19px;color:var(--mist)}

  /* ── Правый столбец выгод ──────────────────────────────── */
  .vygody{flex:1;display:flex;flex-direction:column;justify-content:space-between;
    padding:16px 0 8px}
  .vygody div{display:flex;flex-direction:column;gap:10px}
  .vygody .ikona{width:66px;height:66px;border-radius:17px;
    border:2px solid color-mix(in srgb, var(--acc) 45%, transparent);
    background:color-mix(in srgb, var(--acc) 10%, transparent);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 26px color-mix(in srgb, var(--acc) 18%, transparent)}
  .vygody .ikona svg{width:32px;height:32px}
  .vygody p{font-size:23px;line-height:1.24;font-weight:600}
</style></head><body>
  <div class="sheet">
    <h1>${k.title}</h1>

    <div class="plashka">
      <b>${k.cena}</b><i></i><span>${k.srokPrefix} ${k.srok}</span>
    </div>

    <div class="scena">
      <div class="box3d">
        <div class="box">
          <div class="top"></div>
          <div class="spine"><span>${k.title} · ${k.cena}</span></div>
          <div class="face">
            <div class="f-eye">${k.eyebrow}</div>
            <div class="f-title">${k.title}</div>
            <div class="f-cena"><b>${k.cena}</b><span>${k.srokPrefix} ${k.srok}</span></div>
            <div class="f-line"></div>

            <div class="okno">
              <div class="bar"><u></u><u></u><u></u>${k.okno.zagolovok}</div>
              <div class="rows">
                ${k.okno.stroki.map((s) => `<div class="row"><em>✓</em><span>${s.text}</span><b>${s.hvost}</b></div>`).join('\n                ')}
              </div>
            </div>

            <div class="ticks">
              ${k.ticks.map((t) => `<div><em>✓</em><span>${t}</span></div>`).join('\n              ')}
            </div>

            <div class="cta">
              <b>Оставить заявку</b><span>vibe-digital999.ru</span>
            </div>

            <div class="f-foot">
              <span class="mark">VIBE DIGITAL 999</span>
              <span class="tel">+7 999 244 99 99</span>
            </div>
          </div>
        </div>
      </div>

      <div class="vygody">
        ${k.vygody.map((v) => `<div>
          <span class="ikona">${svg(ZNAK[v.znak], k.color)}</span>
          <p>${v.text}</p>
        </div>`).join('\n        ')}
      </div>
    </div>
  </div>
</body></html>`;

fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const CHROME = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(
    fs.existsSync(CHROME) ? { executablePath: CHROME } : {});

  const only = process.argv[2];
  let bed = 0;

  console.log('');
  for (const k of KARTOCHKI) {
    if (only && k.id !== only) continue;

    /* Цена и срок дописываются из прайса ДО отрисовки — так их
       физически нельзя записать в текст карточки руками. */
    k.cena = PRICES.cena(k.usluga);
    k.srok = PRICES.srok(k.usluga);

    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(html(k), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    const check = await page.evaluate(() => {
      const s = document.querySelector('.sheet');
      const f = document.querySelector('.face').getBoundingClientRect();
      return {
        perepolnenie: Math.round(s.scrollHeight - s.clientHeight),
        nizKorobki: Math.round(f.bottom),
      };
    });

    await page.screenshot({ path: path.join(OUT, `tovar-${k.id}.png`) });

    if (check.perepolnenie > 0 || check.nizKorobki > H) {
      console.error(`  ✗ tovar-${k.id}: не помещается (за краем ${Math.max(check.perepolnenie, check.nizKorobki - H)}px)`);
      bed++;
    } else {
      console.log(`  tovar-${k.id.padEnd(10)} → marketing/out/tovar-${k.id}.png   низ коробки ${check.nizKorobki}px из ${H}`);
    }
    await ctx.close();
  }
  await browser.close();

  if (bed) {
    console.error('\nКарточка нарисована, но текст не помещается. Смотреть выше.\n');
    process.exit(1);
  }
  console.log('');
})();
