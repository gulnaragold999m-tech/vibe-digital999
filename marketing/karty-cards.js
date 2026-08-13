/* Карточки пакетов для Яндекс Карт — картинки к позициям прайса.

   Три квадрата 1080×1080: «Старт», «Поток», «Система». Шрифты и цвета —
   с сайта, поэтому карточка, сайт и реклама выглядят одним целым,
   а не «похоже».

   ПОЧЕМУ НА КАРТИНКЕ НЕТ ЦЕНЫ. Две причины, обе важные.

   Первая: в карточке товара у Яндекса цена — ОТДЕЛЬНОЕ ПОЛЕ, рядом
   с картинкой. Цифра на картинке её дублирует, а дубль рано или поздно
   разъезжается: поле поправят, картинку забудут перерисовать. Ровно так
   13.08.2026 разъехались цены между сайтом и прайсом для Карт.

   Вторая: модерация Яндекса снимает изображения с рекламными
   наложениями — надписи допускаются как часть логотипа. Где проходит
   граница между «состав пакета» и «рекламной фразой», по документации
   точно не понять, а проверить первоисточник не удалось: yandex.ru
   закрыт из песочницы ассистента. Поэтому карточка сделана сдержанной:
   что входит, кому подходит, срок. Ни цены, ни призыва, ни «звоните».

   ВСЁ СОДЕРЖИМОЕ БЕРЁТСЯ ИЗ src/prices.js. Название пакета, состав,
   кому подходит и срок здесь не записаны — они читаются из прайса.
   Поменялся состав пакета — перерисовали, и карточка совпала.

   Запуск:

       npm run karty-kartinki

   Первый запуск попросит поставить playwright — им рисуются картинки:

       npm install --no-save playwright

   Почему его нет в package.json — та же причина, что у creatives.js:
   Amvera ставит зависимости при каждой сборке сайта, а playwright тянет
   браузер на сотни мегабайт. Готовые картинки лежат в out/ и закоммичены,
   чтобы ими можно было пользоваться, ничего не устанавливая. */

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('\nНе найден playwright — без него рисовать нечем.\n');
  console.error('Выполните в папке проекта:\n');
  console.error('    npm install --no-save playwright\n');
  console.error('и запустите снова: npm run karty-kartinki\n');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');
const PRICES = require(path.join(__dirname, '..', 'src', 'prices'));
const { fontCss } = require('./shrifty');

const S = 1080;                       /* квадрат: 1:1 показывается целиком
                                         и в Картах, и в ленте ВК */
const OUT = path.join(__dirname, 'out');

/* Свой цвет каждому пакету — иначе три карточки рядом читаются как одна
   повторённая. Цвета те же, что у рекламных макетов: голубой у сайтов,
   синий у ботов, фиолетовый у агента. */
const CVETA = { start: '#00F0FF', potok: '#2D9CFF', sistema: '#A855F7' };

/* Строки доверия. Это факты, которые есть на сайте и в договоре,
   а не обещания: исходники действительно передаются, ИП действительно
   оформлено. Ничего, чего нет, сюда не писать. */
const FAKTY = ['Исходники передаём вам', 'Договор и ИП', 'Сопровождение после сдачи'];

const kartochka = (p) => {
  const sostav = p.sostav.map((id) => PRICES.usluga(id));
  return {
    id: `paket-${p.id}`,
    color: CVETA[p.id] || '#00F0FF',
    nazvanie: p.nazvanie.replace(/[«»]/g, ''),
    komu: p.komu,
    srok: p.srok,
    /* Скобки с пояснением убираем: на карточке они съедают строку,
       а суть уже в названии услуги. */
    sostav: sostav.map((u) => u.nazvanie.replace(/ \(.*\)$/, '')),
  };
};

const html = (k) => `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<style>
${fontCss}
</style>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

  /* Цвета из :root сайта — карточка и сайт должны быть одним целым. */
  :root{
    --ink:#020813; --white:#E8F0FF; --mist:#8A9BC4;
    --acc:${k.color};
  }

  body{width:${S}px;height:${S}px;background:var(--ink);color:var(--white);
    font-family:'Manrope',sans-serif;overflow:hidden;position:relative}

  /* Свечение и сетка — тот же приём, что на рекламных макетах:
     ощущение объёма без картинки, которая отвлекает от текста. */
  body::before{content:'';position:absolute;top:-22%;left:50%;transform:translateX(-50%);
    width:1000px;height:760px;border-radius:50%;
    background:radial-gradient(ellipse at center,
      color-mix(in srgb, var(--acc) 40%, transparent) 0%,
      color-mix(in srgb, var(--acc) 15%, transparent) 40%,
      transparent 70%);
    filter:blur(70px)}
  body::after{content:'';position:absolute;inset:0;opacity:.45;
    background-image:
      linear-gradient(color-mix(in srgb, var(--acc) 15%, transparent) 1px, transparent 1px),
      linear-gradient(90deg, color-mix(in srgb, var(--acc) 15%, transparent) 1px, transparent 1px);
    background-size:54px 54px;
    mask-image:radial-gradient(ellipse at 50% 38%, #000 22%, transparent 76%)}

  .sheet{position:relative;z-index:2;height:100%;
    padding:72px 76px 64px;display:flex;flex-direction:column}

  .eyebrow{font-size:26px;font-weight:600;letter-spacing:.16em;
    text-transform:uppercase;color:var(--acc)}

  /* Средний блок занимает всю свободную высоту и центрируется в ней.
     Без этого пустота собиралась в одном месте: сначала посередине
     кадра, после первой правки — внизу под сроком. */
  .main{flex:1;display:flex;flex-direction:column;justify-content:center}

  h1{font-size:118px;line-height:1.02;font-weight:800;letter-spacing:-.02em}

  .komu{margin-top:20px;font-size:31px;line-height:1.35;color:var(--mist);
    max-width:820px}

  /* «Что входит» — середина карточки и главное, ради чего её открывают.
     Раньше блок прижимался к низу через margin-top:auto, и посередине
     кадра оставалась пустая дыра в треть высоты. */
  .vhodit{margin-top:56px;font-size:24px;font-weight:700;letter-spacing:.14em;
    text-transform:uppercase;color:color-mix(in srgb, var(--white) 55%, transparent)}

  .sostav{margin-top:26px;display:flex;flex-direction:column;gap:22px}
  .sostav div{display:flex;align-items:flex-start;gap:22px;
    font-size:42px;line-height:1.22;font-weight:700}
  .sostav i{flex:0 0 auto;width:52px;height:52px;border-radius:14px;
    background:color-mix(in srgb, var(--acc) 20%, transparent);
    border:2px solid color-mix(in srgb, var(--acc) 55%, transparent);
    display:flex;align-items:center;justify-content:center;
    font-style:normal;font-size:28px;color:var(--acc);margin-top:4px}

  .srok{margin-top:40px;display:inline-flex;align-self:flex-start;
    padding:16px 30px;border-radius:999px;font-size:31px;font-weight:700;
    color:var(--ink);background:var(--acc)}

  .fakty{margin-top:auto;padding-top:30px;
    border-top:1px solid color-mix(in srgb, var(--white) 14%, transparent);
    display:flex;gap:34px;font-size:23px;color:var(--mist)}
  .fakty span{display:flex;align-items:center;gap:11px}
  .fakty b{color:var(--acc);font-size:20px}

  /* Подпись студии мелкая и одна: у Яндекса логотип на изображении
     не должен занимать больше пятой части кадра. Здесь он занимает
     примерно сороковую. */
  .mark{margin-top:26px;font-family:'Cinzel',serif;font-size:22px;
    letter-spacing:.3em;color:color-mix(in srgb, var(--white) 45%, transparent)}
</style></head><body>
  <div class="sheet">
    <div class="eyebrow">Пакет под ключ</div>

    <div class="main">
      <h1>${k.nazvanie}</h1>
      <div class="komu">${k.komu}</div>

      <div class="vhodit">Что входит</div>
      <div class="sostav">
        ${k.sostav.map((s) => `<div><i>✓</i><span>${s}</span></div>`).join('\n        ')}
      </div>

      <div class="srok">Срок ${k.srok}</div>
    </div>

    <div class="fakty">
      ${FAKTY.map((f) => `<span><b>●</b>${f}</span>`).join('\n      ')}
    </div>

    <div class="mark">VIBE DIGITAL 999</div>
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
  for (const p of PRICES.PAKETY) {
    const k = kartochka(p);
    if (only && k.id !== `paket-${only}` && only !== p.id) continue;

    const ctx = await browser.newContext({ viewport: { width: S, height: S }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(html(k), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);

    /* Контроль: ничего не должно вылезать за холст. Текст берётся
       из прайса, а он меняется — длинное название состава молча
       уехало бы за край, и увидели бы это уже в карточке у Яндекса. */
    const perepolnenie = await page.evaluate(() => {
      const s = document.querySelector('.sheet');
      return Math.round(s.scrollHeight - s.clientHeight);
    });

    await page.screenshot({ path: path.join(OUT, `${k.id}.png`) });

    if (perepolnenie > 0) {
      console.error(`  ✗ ${k.id.padEnd(14)} текст вылез за край на ${perepolnenie}px — укоротите состав или название`);
      bed++;
    } else {
      console.log(`  ${k.id.padEnd(14)} → marketing/out/${k.id}.png`);
    }
    await ctx.close();
  }
  await browser.close();

  if (bed) {
    console.error('\nКарточки нарисованы, но текст не помещается. Смотреть выше.\n');
    process.exit(1);
  }
  console.log('\nГотово. Цена на картинку намеренно не ставится — она отдельным полем в карточке.\n');
})();
