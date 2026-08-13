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
const SHIR = 560, VYS = 740, GLUB = 260;

/* Заголовок на лице и цвета — единственное, что задаётся здесь.
   Название пакета, состав, срок и цена берутся из src/prices.js. */
const PAKETY = {
  start:   { zagolovok: 'WEB-РАЗРАБОТКА',  acc: '#8B5CF6', acc2: '#3B82F6' },
  potok:   { zagolovok: 'ВОРОНКА ПРОДАЖ',  acc: '#00F0FF', acc2: '#2D9CFF' },
  sistema: { zagolovok: 'СИСТЕМА ПОД КЛЮЧ', acc: '#FF4D7D', acc2: '#A855F7' },
};

/* ЛОГОТИП VD — по фирменному знаку, который прислала владелица:
   толстая «V» и сцепленная с ней «D», градиент от голубого
   к фиолетовому, свечение по контуру.

   Рисуется линиями в SVG, а не шрифтом: футуристичного шрифта
   в проекте нет, а тащить чужой файл ради двух букв — это лицензия
   и лишние килобайты. Знак геометрический, поэтому линии дают
   то же, что дал бы шрифт. */
const LOGO = (id) => `
  <svg viewBox="0 0 130 120" fill="none">
    <defs>
      <linearGradient id="vd${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#22D3EE"/>
        <stop offset="55%" stop-color="#6366F1"/>
        <stop offset="100%" stop-color="#A855F7"/>
      </linearGradient>
    </defs>
    <circle cx="65" cy="60" r="54" stroke="url(#vd${id})" stroke-width="2.5" opacity=".75"/>
    <path d="M26 30 L52 90 L78 30" stroke="url(#vd${id})" stroke-width="12"
          stroke-linejoin="miter" stroke-linecap="butt"/>
    <path d="M68 30 L68 90 M68 30 H80 A30 30 0 0 1 80 90 H68"
          stroke="url(#vd${id})" stroke-width="12"
          stroke-linejoin="miter" stroke-linecap="butt"/>
  </svg>`;

/* ПЛАТА. Дорожки нарисованы прямыми с прямыми углами и площадками
   на концах — так рисуют разводку на настоящей плате, и так она
   читается с первого взгляда. Симметрия намеренно неполная:
   идеально ровная сетка выглядит обоями, а не платой. */
const PLATA = (id) => {
  const doroshki = [
    'M120 540 H300 V300 H620 V180',
    'M120 640 H360 V760 H700 V880',
    'M1380 520 H1180 V300 H900 V190',
    'M1380 660 H1120 V800 H820 V900',
    'M300 300 V120 H760',
    'M1180 300 V140 H860',
    'M360 760 V960 H620',
    'M1120 800 V980 H900',
    'M620 180 H900',
    'M700 880 H820',
  ];
  /* ИМПУЛЬСЫ — яркие точки на дорожках. В задании просили бегущий ток
     анимацией; в статичной картинке анимации не видно, скриншот берёт
     один кадр. Поэтому импульсы расставлены как остановленный кадр:
     несколько точек в разных местах разводки. Нужна настоящая беготня —
     это другой формат вывода, видео или GIF, и другая задача. */
  const impulsy = [
    [300, 420], [520, 180], [360, 860], [700, 940],
    [1180, 220], [1050, 800], [820, 190], [1260, 660],
  ];
  const ploshchadki = [
    [300, 300], [620, 180], [360, 760], [700, 880],
    [1180, 300], [900, 190], [1120, 800], [820, 900],
    [760, 120], [860, 140], [620, 960], [900, 980],
  ];
  return `
  <svg viewBox="0 0 1500 1100" fill="none">
    <defs>
      <linearGradient id="pl${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="var(--acc)"/>
        <stop offset="100%" stop-color="var(--acc2)"/>
      </linearGradient>
      <radialGradient id="pm${id}" cx="50%" cy="50%">
        <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
        <stop offset="55%" stop-color="#fff" stop-opacity=".55"/>
        <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
      </radialGradient>
      <mask id="mk${id}">
        <rect width="1500" height="1100" fill="url(#pm${id})"/>
      </mask>
    </defs>
    <g mask="url(#mk${id})">
      <rect x="90" y="90" width="1320" height="920" rx="26"
            stroke="url(#pl${id})" stroke-width="3" opacity=".55"/>
      <rect x="150" y="150" width="1200" height="800" rx="18"
            stroke="url(#pl${id})" stroke-width="2" opacity=".3"/>
      ${doroshki.map((d) => `<path d="${d}" stroke="url(#pl${id})" stroke-width="6"
            stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`).join('\n      ')}
      ${ploshchadki.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11"
            fill="none" stroke="url(#pl${id})" stroke-width="5"/>`).join('\n      ')}
      ${impulsy.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#EAFBFF"/>
      <circle cx="${x}" cy="${y}" r="20" fill="url(#pl${id})" opacity=".45"/>`).join('\n      ')}
    </g>
  </svg>`;
};

const html = (p) => {
  const nastr = PAKETY[p.id];
  const chasti = p.sostav.map((id) => PRICES.usluga(id).nazvanie.replace(/ \(.*\)$/, ''));
  const sostav = chasti.join('  /  ');

  /* Чипы справа — состав пакета плюс две строки, которые есть
     в договоре. Не «Архитектура / Безопасность / Масштаб» из чужого
     макета: те слова ничего не обещают и ни к чему не привязаны. */
  const chipy = [...chasti, 'Исходники ваши', 'Договор и ИП'];

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
    /* Высота шва от верхнего ребра. Одна переменная на лицо и бок —
       иначе линии на соседних гранях встанут на разной высоте
       и колпак развалится. */
    --shov:84px;
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

  /* Сцена. perspective-origin выше середины — иначе крышку не видно. */
  .scena{position:relative;width:100%;height:100%;
    perspective:2000px;perspective-origin:50% 8%;
    display:flex;align-items:center;justify-content:center}

  /* ПЛАТА, на которой стоит коробка. Главное, чего не хватало против
     референса: без неё предмет висит в пустоте. Дорожки нарисованы
     линиями, а не картинкой, — их видно резко на любом размере
     и они красятся цветом пакета. */
  .plata{position:absolute;z-index:0;
    width:1560px;height:1160px;left:50%;top:72%;
    transform:translate(-50%,-50%) rotateX(76deg);
    transform-style:preserve-3d}
  .plata svg{width:100%;height:100%;
    filter:drop-shadow(0 0 14px color-mix(in srgb, var(--acc) 55%, transparent))}

  .box-scene{position:relative;z-index:1;
    width:var(--shir);height:var(--vys);
    transform-style:preserve-3d}

  /* След на «полу» — отдельным пятном, а не тенью коробки: тень
     поворачивается вместе с телом, а лежать должна на плоскости. */
  .box-scene::after{content:'';position:absolute;z-index:0;
    left:-34%;right:-24%;bottom:-124px;height:150px;border-radius:50%;
    background:radial-gradient(ellipse at 46% 50%,
      color-mix(in srgb, var(--acc) 42%, transparent) 0%,
      color-mix(in srgb, var(--acc2) 18%, transparent) 40%,
      transparent 72%);
    filter:blur(46px)}
  /* Контактная тень — узкая и плотная прямо под дном: без неё коробка
     не стоит на плате, а висит над ней. */
  .box-scene::before{content:'';position:absolute;z-index:0;
    left:-6%;right:2%;bottom:-34px;height:64px;border-radius:50%;
    background:radial-gradient(ellipse at 46% 50%,
      rgba(0,0,0,.95) 0%, rgba(0,0,0,.6) 40%, transparent 72%);
    filter:blur(20px)}

  /* КАРКАС. Поворачивается целиком, грани внутри не двигаются
     сами по себе — только выдвигаются на половину глубины. */
  .box{position:relative;z-index:1;width:100%;height:100%;
    transform-style:preserve-3d;
    transform:rotateX(12deg) rotateY(-30deg)}

  /* ГЛЯНЕЦ. Четыре остановки вместо двух: тёмное — светлое — тёмное —
     светлое. Так пластик ловит отражение неоновой подсветки пола,
     а не выглядит равномерной серой заливкой. */
  .gran{position:absolute;
    background:linear-gradient(135deg,#090D16 0%,#111724 40%,#05070B 70%,#161F33 100%)}

  /* ШОВ ОТКИДНОГО КОЛПАКА. Тёмная прорезь и светлый блик под ней —
     так читается стык двух панелей. Рисуется фоновым градиентом,
     а не элементом: у граней уже заняты оба псевдоэлемента бликами
     на рёбрах, а фоновый слой ещё и не мешает раскладке текста.

     Высота одна и та же на лице и на боку — грани начинаются от одного
     верхнего ребра, поэтому линия опоясывает коробку без ступеньки. */
  /* Лицо */
  .box-front{width:var(--shir);height:var(--vys);left:0;top:0;
    transform:translateZ(var(--pol));
    /* Отступ сверху = шов плюс воздух: надпись студии стоит НА колпаке,
       под линией сгиба, а не поперёк неё. */
    padding:calc(var(--shov) + 34px) 44px 44px;display:flex;flex-direction:column;
    /* Глянец: широкая мягкая полоса через грань. */
    background:
      radial-gradient(ellipse 110% 70% at 46% 30%,
        color-mix(in srgb, var(--acc) 10%, transparent) 0%, transparent 62%),
      linear-gradient(135deg,#090D16 0%,#111724 40%,#05070B 70%,#161F33 100%);
    /* Блик по верхнему и левому ребру плюс мягкий свет сверху —
       от этого грань читается монолитом, а не наклейкой. */
    box-shadow:inset 1px 1px 0 rgba(255,255,255,.15),
               inset 0 20px 30px rgba(255,255,255,.05)}

  /* Левый бок */
  .box-left{width:var(--glub);height:var(--vys);left:0;top:0;
    transform-origin:left center;
    transform:translateZ(var(--pol)) rotateY(-90deg);
    background:
      linear-gradient(90deg, rgba(255,255,255,.06), transparent 60%),
      linear-gradient(135deg,#0B101B 0%,#131B2B 40%,#06080E 70%,#111A2C 100%);
    display:flex;align-items:center;justify-content:center}
  /* Бок повёрнут наружу, к зрителю обращён изнанкой — надпись
     зеркалится. Гасится разворотом на 180° вокруг вертикальной оси.
     rotate(180deg) тут не годится: он не снимает зеркало, а только
     переворачивает строку снизу вверх. */
  .box-left span{writing-mode:vertical-lr;transform:rotateY(180deg);
    white-space:nowrap;font-size:26px;font-weight:800;letter-spacing:.24em;
    color:rgba(255,255,255,.5)}

  /* ЗАДНЕЙ И ПРАВОЙ ГРАНЕЙ ЗДЕСЬ НЕТ, И ЭТО НАМЕРЕННО.

     Пробовал добавить — ради пунктирного просвета по заднему ребру.
     Пунктир не ушёл, а силуэт сломался: задняя панель вылезла справа
     из-за коробки отдельным прямоугольником. Три грани при этом угле
     дают правильный контур, четвёртая и пятая только мешают.

     Правило: правка, которая не решила задачу, откатывается целиком,
     а не остаётся «на всякий случай». Иначе через неделю никто
     не вспомнит, зачем эти грани, и будут чинить последствия. */

  /* Верхняя крышка */
  .box-top{width:var(--shir);height:var(--glub);left:0;top:0;
    transform-origin:top center;
    transform:translateZ(var(--pol)) rotateX(90deg);
    /* КРЫШКА — ТЁМНОЕ ЗЕРКАЛО, а не «просто светлее».

       Резкие остановки градиента (45% → 46% и 52% → 53%) дают чёткую
       световую полосу поперёк грани — отражение софтбокса. Плавный
       градиент такой полосы не даёт: он читается серой заливкой,
       и грань выглядит матовой бумагой, а не глянцевым пластиком.
       Приём в том, что переход занимает ОДИН процент, а не двадцать. */
    background:linear-gradient(115deg,
      #05070A 0%, #090D14 45%, #222D42 46%, #2D3C59 52%, #090D14 53%, #05070A 100%);
    box-shadow:inset 0 0 20px rgba(255,255,255,.05),
               inset 1px 1px 0 rgba(255,255,255,.2);
    display:flex;align-items:center;justify-content:center}
  /* Крышка после rotateX(90deg) обращена к зрителю обратной стороной
     плоскости: содержимое на ней переворачивается по вертикали, и «V»
     читается как «Λ». Разворот на 180° вокруг горизонтальной оси
     это гасит. Тот же класс ошибок, что зеркальный текст на торце
     книги, — проверять на увеличенном куске. */
  /* Крышку видно под острым углом, поэтому знак на ней сплющивается.
     Размер и свечение подняты, чтобы он читался в кадре. */
  /* Логотип смешивается со светлением, а не кладётся сверху заплаткой:
     полоса отражения проходит сквозь буквы, и знак с крышкой читаются
     одним предметом. */
  .box-top svg{width:224px;height:224px;transform:rotateX(180deg);
    mix-blend-mode:screen;opacity:.9;
    filter:drop-shadow(0 0 8px #fff)
           drop-shadow(0 0 20px color-mix(in srgb, var(--acc) 95%, transparent))
           drop-shadow(0 0 42px color-mix(in srgb, var(--acc2) 70%, transparent))}

  /* НЕОНОВЫЙ ПОДИУМ — это нижняя грань коробки, а не отдельный
     прямоугольник на полу. Так он лежит ровно под дном при любом
     развороте: отдельный элемент пришлось бы совмещать вручную,
     и он разъезжался бы при каждой правке угла. */
  /* Рамка ШИРЕ дна на 70px с каждой стороны: ровно по дну её не видно —
     коробка её закрывает. Вынос вперёд даёт сдвиг translateY ДО поворота:
     после rotateX он превращается в сдвиг по плоскости пола. */
  .box-bottom{width:calc(var(--shir) + 140px);height:calc(var(--glub) + 140px);
    left:-70px;top:100%;
    transform-origin:top center;
    transform:translateZ(var(--pol)) rotateX(-90deg) translateY(-70px);
    background:color-mix(in srgb, var(--acc) 10%, transparent);
    border:3px solid color-mix(in srgb, var(--acc) 85%, transparent);
    border-radius:20px;
    box-shadow:0 0 60px color-mix(in srgb, var(--acc) 85%, transparent),
               0 0 120px color-mix(in srgb, var(--acc2) 55%, transparent),
               inset 0 0 44px color-mix(in srgb, var(--acc2) 60%, transparent)}

  /* ШОВ — вдавленная прорезь, а не белая черта. Три слоя:
     чёрная щель, тонкая подсветка ребра под ней и внутренняя тень,
     от которой колпак нависает над корпусом. Отсвет в пазу берётся
     цветом карточки — как будто неон снизу отражается в щели.

     Высота одна на лице и на боку: грани идут от общего верхнего
     ребра, поэтому линия опоясывает коробку без ступеньки. */
  .box-front::before,
  .box-left::before{content:'';position:absolute;left:0;right:0;
    top:var(--shov);height:3px;background:#000;
    box-shadow:0 2px 0 rgba(255,255,255,.14),
               0 4px 10px color-mix(in srgb, var(--acc) 30%, transparent),
               0 -6px 12px rgba(0,0,0,.55);
    pointer-events:none}
  .box-top::after{content:'';position:absolute;left:0;bottom:0;
    width:100%;height:2px;
    background:linear-gradient(90deg,
      rgba(255,255,255,.5), rgba(255,255,255,.1) 65%, transparent);
    pointer-events:none}

  /* ── Содержимое лицевой грани ─────────────────────────── */
  /* Полоса крышки: на референсе у коробки виден шов, и надпись студии
     стоит НА крышке, а не на лице. Повторяем швом поперёк лица. */
  /* Гравировка: тонкое начертание, широкий трекинг, приглушённая. */
  .marka{font-size:20px;font-weight:300;letter-spacing:6px;
    color:#fff;opacity:.6}

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

  /* Неоновая плашка с адресом — лежит на плате перед коробкой,
     поэтому наклонена вместе с ней. */
  .adres{position:absolute;z-index:2;left:50%;top:88.5%;
    transform:translate(-50%,-50%) rotateX(64deg) rotateZ(-5deg);
    padding:18px 46px;border-radius:14px;white-space:nowrap;
    font-size:34px;font-weight:800;letter-spacing:.06em;
    color:#EAF6FF;
    border:2px solid color-mix(in srgb, var(--acc) 75%, transparent);
    background:color-mix(in srgb, var(--acc) 12%, transparent);
    box-shadow:0 0 34px color-mix(in srgb, var(--acc) 55%, transparent),
               inset 0 0 22px color-mix(in srgb, var(--acc) 26%, transparent);
    text-shadow:0 0 14px color-mix(in srgb, var(--acc) 80%, transparent)}

  /* Чипы справа — как на референсе, но словами из состава пакета,
     а не «Архитектура / Безопасность / Масштаб» из чужого макета. */
  .chipy{position:absolute;z-index:2;right:64px;top:50%;
    transform:translateY(-50%);
    display:flex;flex-direction:column;gap:20px;align-items:flex-end}
  .chipy div{padding:13px 26px;border-radius:12px;white-space:nowrap;
    font-size:23px;font-weight:700;color:#E9F4FF;
    border:2px solid color-mix(in srgb, var(--acc) 62%, transparent);
    background:color-mix(in srgb, var(--acc) 10%, transparent);
    box-shadow:0 0 22px color-mix(in srgb, var(--acc) 32%, transparent)}
</style></head><body>
  <div class="scena">
    <div class="plata">${PLATA(p.id)}</div>
    <div class="box-scene">
    <div class="box">
      <div class="gran box-bottom"></div>
      <div class="gran box-left"><span>ПАКЕТ ${p.nazvanie.replace(/[«»]/g, '')}</span></div>
      <div class="gran box-top">${LOGO(p.id)}</div>
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

    <div class="chipy">
      ${chipy.map((c) => `<div>${c}</div>`).join('\n      ')}
    </div>
    <div class="adres">vibe-digital999.ru</div>
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
