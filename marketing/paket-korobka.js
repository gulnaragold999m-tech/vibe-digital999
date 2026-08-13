/* Коробка пакета — три видимые грани: лицо, левый бок, верхняя крышка.

   ЧЕМ ОТЛИЧАЕТСЯ ОТ karty-korobka.js. Там книга собрана плоским скосом:
   у неё две грани, и скос гарантирует ровный нижний край. Здесь граней
   ТРИ, и крышку скосом не показать — нужен честный разворот в 3D.

   Значит, возвращаются и его сложности: грани сходятся только если
   каждая выдвинута на ПОЛОВИНУ глубины и повёрнута вокруг своего ребра.
   Схема ниже проверена на картинке, а не на словах:

     лицо     translateZ(половина)
     бок      left:0,  origin left center,  translateZ(половина) rotateY(-90deg)
     крышка   top:0,   origin top center,   translateZ(половина) rotateX(90deg)

   ПОРЯДОК В СТРОКЕ transform РЕШАЕТ ВСЁ. Сначала выдвинуть грань
   вперёд, потом повернуть вокруг ребра. Наоборот — rotateY(-90deg)
   translateZ(...) — сдвиг пойдёт уже по ПОВЁРНУТОЙ оси и уведёт грань
   вбок: боковина отлетает от коробки, крышка улетает вверх. Именно так
   и вышло на первой сборке.

   Обе схемы правильные, каждая для своей задачи. Порядок выбора
   и разобранные грабли — навык .claude/skills/karta-tovara-3d.

   Запуск:

       npm run paket-korobka          все пакеты
       npm run paket-korobka start    один

   Первый запуск попросит поставить playwright:

       npm install --no-save playwright                                    */

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('\nНе найден playwright — без него рисовать нечем.\n');
  console.error('Выполните в папке проекта:\n');
  console.error('    npm install --no-save playwright\n');
  console.error('и запустите снова: npm run paket-korobka\n');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');
const PRICES = require(path.join(__dirname, '..', 'src', 'prices'));
const { fontCss } = require('./shrifty');

const W = 1080, H = 1440;
const OUT = path.join(__dirname, 'out');

/* Пропорции коробки взяты из задания владелицы — 280×380×100 — и
   пересчитаны под наш холст с тем же отношением сторон. */
const SHIR = 560, VYS = 760, GLUB = 200;

/* Заголовок на лице и цвета — единственное, что задаётся здесь.
   Название пакета, состав, срок и цена берутся из src/prices.js. */
const PAKETY = {
  start:   { zagolovok: 'WEB-РАЗРАБОТКА',  acc: '#8B5CF6', acc2: '#3B82F6' },
  potok:   { zagolovok: 'ВОРОНКА ПРОДАЖ',  acc: '#00F0FF', acc2: '#2D9CFF' },
  sistema: { zagolovok: 'СИСТЕМА ПОД КЛЮЧ', acc: '#FF4D7D', acc2: '#A855F7' },
};

/* Монограмма на крышке. Рисуется линиями, а не шрифтом: футуристичного
   шрифта у нас в проекте нет, а тащить чужой файл — это лицензия
   и лишние килобайты ради двух букв. Геометрия читается «хай-теком»
   лучше, чем любой текстовый глиф в нашем Manrope. */
const MONOGRAMMA = `
  <svg viewBox="0 0 120 120" fill="none"
       stroke="rgba(255,255,255,.92)" stroke-width="3"
       stroke-linecap="round" stroke-linejoin="round">
    <circle cx="60" cy="60" r="46" stroke-width="2" opacity=".85"/>
    <path d="M34 44 L47 76 L60 44"/>
    <path d="M70 44 L70 76 L79 76 A16 16 0 0 0 79 44 Z"/>
  </svg>`;

const html = (p) => {
  const nastr = PAKETY[p.id];
  const sostav = p.sostav
    .map((id) => PRICES.usluga(id).nazvanie.replace(/ \(.*\)$/, ''))
    .join('  /  ');

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<style>
${fontCss}
</style>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

  :root{
    --ink:#04060C; --white:#E8F0FF; --mist:#8A9BC4;
    --acc:${nastr.acc}; --acc2:${nastr.acc2};
    --shir:${SHIR}px; --vys:${VYS}px; --glub:${GLUB}px;
    --pol:${GLUB / 2}px;              /* половина глубины */
  }

  body{width:${W}px;height:${H}px;background:var(--ink);color:var(--white);
    font-family:'Manrope',sans-serif;overflow:hidden;position:relative;
    display:flex;align-items:center;justify-content:center}

  /* Свечение «от микросхемы» за коробкой. */
  body::before{content:'';position:absolute;top:50%;left:50%;
    transform:translate(-50%,-58%);width:1100px;height:900px;border-radius:50%;
    background:radial-gradient(ellipse at center,
      color-mix(in srgb, var(--acc) 30%, transparent) 0%,
      color-mix(in srgb, var(--acc2) 14%, transparent) 42%,
      transparent 72%);
    filter:blur(90px)}
  body::after{content:'';position:absolute;inset:0;opacity:.35;
    background-image:
      linear-gradient(color-mix(in srgb, var(--acc2) 16%, transparent) 1px, transparent 1px),
      linear-gradient(90deg, color-mix(in srgb, var(--acc2) 16%, transparent) 1px, transparent 1px);
    background-size:60px 60px;
    mask-image:radial-gradient(ellipse at 50% 48%, #000 22%, transparent 76%)}

  .box-scene{position:relative;perspective:1500px;perspective-origin:50% 42%;
    width:var(--shir);height:var(--vys)}

  /* След на «полу» — отдельным пятном, а не тенью коробки: тень
     поворачивается вместе с телом, а лежать должна на плоскости. */
  .box-scene::after{content:'';position:absolute;z-index:0;
    left:-34%;right:-24%;bottom:-124px;height:150px;border-radius:50%;
    background:radial-gradient(ellipse at 46% 50%,
      color-mix(in srgb, var(--acc) 42%, transparent) 0%,
      color-mix(in srgb, var(--acc2) 18%, transparent) 40%,
      transparent 72%);
    filter:blur(46px)}
  .box-scene::before{content:'';position:absolute;z-index:0;
    left:-14%;right:-4%;bottom:-96px;height:96px;border-radius:50%;
    background:radial-gradient(ellipse at 46% 50%,
      rgba(0,0,0,.92) 0%, rgba(0,0,0,.5) 44%, transparent 74%);
    filter:blur(30px)}

  /* КАРКАС. Поворачивается целиком, грани внутри не двигаются
     сами по себе — только выдвигаются на половину глубины. */
  .box{position:relative;z-index:1;width:100%;height:100%;
    transform-style:preserve-3d;
    transform:rotateX(12deg) rotateY(-30deg)}

  .gran{position:absolute;
    background:linear-gradient(155deg,#161A22 0%,#0C1017 55%,#070A10 100%)}

  /* Лицо */
  .box-front{width:var(--shir);height:var(--vys);left:0;top:0;
    transform:translateZ(var(--pol));
    padding:52px 44px 44px;display:flex;flex-direction:column;
    /* Глянец: широкая мягкая полоса через грань. */
    background:
      linear-gradient(112deg,
        rgba(255,255,255,.10) 0%,
        rgba(255,255,255,.02) 22%,
        transparent 46%),
      radial-gradient(ellipse 110% 70% at 46% 30%,
        color-mix(in srgb, var(--acc) 12%, transparent) 0%, transparent 62%),
      linear-gradient(155deg,#171B24 0%,#0C1017 55%,#06090E 100%)}

  /* Левый бок */
  .box-left{width:var(--glub);height:var(--vys);left:0;top:0;
    transform-origin:left center;
    transform:translateZ(var(--pol)) rotateY(-90deg);
    background:
      linear-gradient(90deg, rgba(255,255,255,.05), transparent 60%),
      linear-gradient(180deg,#12161E 0%,#0A0E14 100%);
    display:flex;align-items:center;justify-content:center}
  /* Бок повёрнут наружу, к зрителю обращён изнанкой — надпись
     зеркалится. Гасится разворотом на 180° вокруг вертикальной оси.
     rotate(180deg) тут не годится: он не снимает зеркало, а только
     переворачивает строку снизу вверх. */
  .box-left span{writing-mode:vertical-lr;transform:rotateY(180deg);
    white-space:nowrap;font-size:26px;font-weight:800;letter-spacing:.24em;
    color:rgba(255,255,255,.5)}

  /* Верхняя крышка */
  .box-top{width:var(--shir);height:var(--glub);left:0;top:0;
    transform-origin:top center;
    transform:translateZ(var(--pol)) rotateX(90deg);
    background:
      linear-gradient(180deg, rgba(255,255,255,.12), transparent 55%),
      linear-gradient(160deg,#1B212C 0%,#10151D 60%,#0A0E14 100%);
    display:flex;align-items:center;justify-content:center}
  /* Крышка после rotateX(90deg) обращена к зрителю обратной стороной
     плоскости: содержимое на ней переворачивается по вертикали, и «V»
     читается как «Λ». Разворот на 180° вокруг горизонтальной оси
     это гасит. Тот же класс ошибок, что зеркальный текст на торце
     книги, — проверять на увеличенном куске. */
  .box-top svg{width:118px;height:118px;transform:rotateX(180deg);
    filter:drop-shadow(0 0 12px color-mix(in srgb, var(--acc) 60%, transparent))}

  /* Блики на рёбрах: тонкие светлые полосы по стыкам граней.
     Именно они читаются как глянцевый пластик. */
  .box-front::before{content:'';position:absolute;left:0;top:0;
    width:2px;height:100%;
    background:linear-gradient(180deg,
      rgba(255,255,255,.55), rgba(255,255,255,.10));
    pointer-events:none}
  .box-front::after{content:'';position:absolute;left:0;top:0;
    width:100%;height:2px;
    background:linear-gradient(90deg,
      rgba(255,255,255,.55), rgba(255,255,255,.12) 60%, transparent);
    pointer-events:none}
  .box-top::after{content:'';position:absolute;left:0;bottom:0;
    width:100%;height:2px;
    background:linear-gradient(90deg,
      rgba(255,255,255,.5), rgba(255,255,255,.1) 65%, transparent);
    pointer-events:none}

  /* ── Содержимое лицевой грани ─────────────────────────── */
  .marka{font-size:19px;font-weight:800;letter-spacing:.3em;
    color:rgba(255,255,255,.62)}

  .glavnoe{margin:auto 0;display:flex;flex-direction:column;gap:26px}

  h1{font-size:54px;line-height:1.02;font-weight:800;letter-spacing:-.01em;
    text-shadow:0 0 10px var(--acc), 0 0 20px var(--acc2)}

  .paket{font-size:27px;font-weight:700;color:rgba(255,255,255,.9)}

  .cena{display:inline-flex;align-self:flex-start;align-items:baseline;gap:14px;
    padding:12px 22px;border-radius:16px;
    border:2px solid color-mix(in srgb, var(--acc) 62%, transparent);
    background:color-mix(in srgb, var(--acc) 14%, transparent);
    box-shadow:0 0 30px color-mix(in srgb, var(--acc) 30%, transparent)}
  .cena b{font-size:34px;font-weight:800}
  .cena span{font-size:20px;color:var(--mist)}

  .niz{font-size:21px;line-height:1.4;color:rgba(255,255,255,.62)}
</style></head><body>
  <div class="box-scene">
    <div class="box">
      <div class="gran box-left"><span>ПАКЕТ ${p.nazvanie.replace(/[«»]/g, '')}</span></div>
      <div class="gran box-top">${MONOGRAMMA}</div>
      <div class="gran box-front">
        <div class="marka">ВАЙБ ДИДЖИТАЛ 999</div>
        <div class="glavnoe">
          <h1>${nastr.zagolovok}</h1>
          <div class="paket">Пакет ${p.nazvanie}</div>
          <div class="cena">
            <b>от ${PRICES.rub(PRICES.cenaPaketa(p))}</b><span>${p.srok}</span>
          </div>
        </div>
        <div class="niz">${sostav}</div>
      </div>
    </div>
  </div>
</body></html>`;
};

fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const CHROME = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(
    fs.existsSync(CHROME) ? { executablePath: CHROME } : {});

  const only = process.argv[2];
  let bed = 0;

  console.log('');
  for (const p of PRICES.PAKETY) {
    if (only && p.id !== only) continue;
    if (!PAKETY[p.id]) {
      console.error(`  ✗ для пакета «${p.id}» не задан заголовок в PAKETY`);
      bed++; continue;
    }

    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(html(p), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    /* Контроль: текст не должен вылезать за лицевую грань, а сама
       коробка — за холст. Состав пакета читается из прайса и может
       удлиниться, тогда нижняя строка молча уедет за край. */
    const check = await page.evaluate(() => {
      const f = document.querySelector('.box-front');
      const s = document.querySelector('.box-scene').getBoundingClientRect();
      return {
        perepolnenie: Math.round(f.scrollHeight - f.clientHeight),
        levo: Math.round(s.left), pravo: Math.round(s.right),
        verh: Math.round(s.top), niz: Math.round(s.bottom),
      };
    });

    await page.screenshot({ path: path.join(OUT, `paket-box-${p.id}.png`) });

    if (check.perepolnenie > 0) {
      console.error(`  ✗ paket-box-${p.id}: текст не помещается на грани (+${check.perepolnenie}px)`);
      bed++;
    } else {
      console.log(`  paket-box-${p.id.padEnd(8)} → marketing/out/paket-box-${p.id}.png`);
      console.log(`    сцена: слева ${check.levo}, справа ${check.pravo}, верх ${check.verh}, низ ${check.niz}`);
    }
    await ctx.close();
  }
  await browser.close();

  if (bed) {
    console.error('\nЕсть неудачные коробки — смотреть выше.\n');
    process.exit(1);
  }
  console.log('');
})();
