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
  {
    id: 'audit',
    usluga: 'audit',
    color: '#FF4D7D',
    color2: '#A855F7',
    eyebrow: 'Аудит сайта · Кавминводы и по всей России',
    title: 'SEO-аудит и 152-ФЗ',
    srokPrefix: 'отчёт за',
    ticks: [
      'Почему сайт не в поиске — по пунктам',
      'Проверка форм на закон о персональных данных',
      'Список правок, а не список замечаний',
    ],
    vygody: [
      { znak: 'shchit', text: 'Проверка форм<br>по 152-ФЗ' },
      { znak: 'glaz', text: 'Почему сайт<br>не в поиске' },
      { znak: 'papka', text: 'Список правок,<br>а не замечаний' },
      { znak: 'kod', text: 'Скорость, robots.txt,<br>карта сайта' },
      { znak: 'soobshchenie', text: 'Разбор результатов<br>голосом' },
      { znak: 'chasy', text: 'Успеть до запуска<br>рекламы' },
    ],
    /* Штрафы сверены с калькулятором на главной, `public/index.html`.
       Формулировки нарушений оттуда же. На макете, который прислала
       владелица, стояли 300 000 ₽ и 60 000 ₽ — обе цифры неверные. */
    okno: {
      zagolovok: 'Отчёт по вашему сайту',
      stroki: [
        { tip: 'bad', text: 'В форме нет галочки согласия', hvost: 'до 700 000 ₽' },
        { tip: 'bad', text: 'Нет политики конфиденциальности', hvost: 'до 100 000 ₽' },
        { text: 'Скорость загрузки в норме', hvost: 'ок' },
        { text: 'robots.txt и sitemap.xml на месте', hvost: 'ок' },
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
    /* Цвет тревоги для строк нарушений. Отдельной переменной, а не
       через --acc: нарушение должно оставаться красным и на карточке
       другого цвета. На аудите совпадает с фирменным розовым. */
    --trevoga:#FF4D7D;
    --korshok:"${k.title} · ${k.cena}";
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

  .sheet{position:relative;z-index:2;height:100%;padding:64px 48px 52px;
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

  /* Акция подписывается отдельной строкой, а не втискивается в плашку:
     «15 000 ₽ вместо 20 000 ₽» в одной рамке читается как две цены
     за одно и то же. Текст собирается из поля akciya в src/prices.js —
     руками сюда старую цену не вписать. */
  .akciya{margin-top:14px;font-size:26px;color:var(--mist)}
  .akciya s{color:color-mix(in srgb, var(--white) 40%, transparent)}

  /* ── Сцена с коробкой ──────────────────────────────────── */
  .scena{margin-top:44px;flex:1;display:flex;gap:20px;align-items:stretch}

  /* ── КНИГА ────────────────────────────────────────────────

     Собирается ОДНИМ блоком, а не тремя гранями. Разница
     принципиальная, и предыдущие версии на ней и валились:
     три отдельные грани браузер поворачивает независимо, между ними
     появляются щели и провалы, а угол читается раскрытой обложкой.

     Здесь тело одно — .book. Корешок и блик на сгибе — его
     псевдоэлементы, то есть части того же тела. Разъехаться нечему.

     Пропорции взяты из образца владелицы и пересчитаны под наш холст:
     у неё книга 320px и корешок 45px, это 14% толщины. У нас книга
     600px, значит корешок 84px. Оставить 45px как есть было нельзя:
     на нашем размере это 7%, и книга снова стала бы плоской —
     то самое, на что она жаловалась двумя правками раньше. */
  .scena{--tolshchina:84px}

  .book-container{position:relative;
    flex:0 0 676px;display:flex;align-items:stretch;
    justify-content:center;padding:52px 0 56px 88px}

  /* Тень на «полу». Отдельными пятнами под контейнером, а не только
     через box-shadow книги: box-shadow поворачивается вместе с телом
     и ложится на его плоскость, а лежать она должна на полу. */
  .book-container::after{content:'';position:absolute;z-index:0;
    left:-10%;right:10%;bottom:10px;height:62px;border-radius:50%;
    background:radial-gradient(ellipse at 42% 50%,
      rgba(0,0,0,.9) 0%, rgba(0,0,0,.5) 42%, transparent 74%);
    filter:blur(26px)}
  .book-container::before{content:'';position:absolute;z-index:0;
    left:-4%;right:-2%;bottom:0;height:88px;border-radius:50%;
    background:radial-gradient(ellipse at 50% 50%,
      color-mix(in srgb, var(--acc) 26%, transparent) 0%, transparent 70%);
    filter:blur(34px)}

  .book{position:relative;z-index:1;flex:1;
    padding:34px 32px 30px;
    border-radius:0 12px 12px 0;
    transform:skewY(-6deg);

    /* Обложка — материал, а не заливка: середина светлее, углы уходят
       в тень. Поверх — едва заметный отсвет цветом услуги. */
    background:
      radial-gradient(ellipse 90% 70% at 42% 34%,
        color-mix(in srgb, var(--acc) 9%, transparent) 0%,
        transparent 62%),
      radial-gradient(ellipse 120% 90% at 45% 40%,
        #16243F 0%, #0B1428 48%, #050C1A 100%);

    box-shadow:
      -10px 20px 40px rgba(0,0,0,.6),
      -25px 40px 60px rgba(0,0,0,.4),
      0 0 80px color-mix(in srgb, var(--acc) 12%, transparent);

    display:flex;flex-direction:column}

  /* КОРЕШОК — СКОСОМ, а не разворотом грани.

     Почему отказались от честного rotateY(-90deg). Развёрнутая грань
     живёт в своей плоскости, и перспектива искажает её отдельно
     от обложки: нижнее ребро корешка идёт под другим углом, чем нижнее
     ребро лица, и в левом нижнем углу вылезает лишний серый клин.
     Пять правок подряд его не закрыли, потому что это не ошибка кода,
     а следствие честной перспективы.

     Скос решает задачу иначе: корешок лежит В ТОЙ ЖЕ плоскости,
     что обложка, и просто сдвинут по вертикали. Значит, его нижний
     край параллелен нижнему краю лица по построению — щели и клину
     взяться неоткуда. Объём даёт сам скос плюс тёмный градиент.

     Плюс два побочных выигрыша: у плоской грани нет изнанки,
     поэтому надпись не зеркалится (ловили три раза за вечер),
     и writing-mode работает напрямую, без разворотов. */
  .book::before{content:var(--korshok);
    position:absolute;right:100%;top:0;
    width:var(--tolshchina);height:100%;
    /* Перекрытие в пиксель: при дробном масштабе между гранью
       и обложкой оставался субпиксельный просвет. Виден он был
       только на бирюзовой карточке — светлый отсвет подсвечивал
       щель, на розовой она терялась в тени. */
    margin-right:-1px;
    transform-origin:right center;
    transform:skewY(-12deg);

    /* Тёмное на дальнем ребре, светлее к сгибу — грань уходит от света. */
    background:linear-gradient(90deg,#090D14 0%,#161F2B 100%);

    display:flex;align-items:center;justify-content:center;
    writing-mode:vertical-lr;white-space:nowrap;
    color:rgba(255,255,255,.82);font-size:26px;font-weight:800;
    letter-spacing:.12em}

  /* БЛИК НА СГИБЕ. Тонкая полоса ровно по ребру между обложкой
     и корешком — от неё угол читается сгибом, а не стыком двух картонок. */
  /* Блик на сгибе. Приглушён: с ярким свечением он читался не ребром,
     а светящейся ЩЕЛЬЮ между гранями — и только на бирюзовой карточке,
     потому что бирюзовый отсвет ярче розового. Геометрия у карточек
     одинаковая до пикселя, расходилось именно восприятие. */
  .book::after{content:'';position:absolute;left:0;top:0;width:1px;height:100%;
    background:linear-gradient(to bottom,
      rgba(255,255,255,.20), rgba(255,255,255,.05));
    pointer-events:none}

  .f-eye{font-size:15px;font-weight:700;letter-spacing:.16em;
    text-transform:uppercase;color:var(--acc)}
  .f-title{margin-top:14px;font-size:50px;line-height:1;font-weight:800;
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
  /* Значения справа светятся цветом услуги. Раньше у нарушений стоял
     бледный #FF7D9E: рядом с ярким бирюзовым на соседней карточке он
     читался белёсым, и карточки выглядели собранными по-разному. */
  .okno .row b{color:var(--acc);font-size:17px;
    text-shadow:0 0 10px color-mix(in srgb, var(--acc) 45%, transparent)}

  /* Строка нарушения. Цифра штрафа рядом с формулировкой — единственное
     место на карточке, где мы пугаем, и пугаем законом, а не собой.
     Цифры сверены с калькулятором на главной: ч. 2 ст. 13.11 КоАП —
     до 700 000 ₽, ч. 3 — до 100 000 ₽. На макете владелицы стояли
     300 000 и 60 000: первое из другой части статьи, второе устарело. */
  .okno .row.bad{background:color-mix(in srgb, var(--trevoga) 11%, transparent);
    border-color:color-mix(in srgb, var(--trevoga) 42%, transparent)}
  .okno .row.bad em{background:var(--trevoga);color:#fff}
  .okno .row.bad b{color:var(--trevoga);
    text-shadow:0 0 10px color-mix(in srgb, var(--trevoga) 50%, transparent)}

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
    ${k.akciya ? `<div class="akciya">${k.akciya}</div>` : ''}

    <div class="scena">
      <div class="book-container">
        <div class="book">
            <div class="f-eye">${k.eyebrow}</div>
            <div class="f-title">${k.title}</div>
            <div class="f-cena"><b>${k.cena}</b><span>${k.srokPrefix} ${k.srok}</span></div>
            <div class="f-line"></div>

            <div class="okno">
              <div class="bar"><u></u><u></u><u></u>${k.okno.zagolovok}</div>
              <div class="rows">
                ${k.okno.stroki.map((s) => `<div class="row${s.tip === 'bad' ? ' bad' : ''}"><em>${s.tip === 'bad' ? '!' : '✓'}</em><span>${s.text}</span><b>${s.hvost}</b></div>`).join('\n                ')}
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

    /* Акция тоже из прайса: и текст, и прежняя цена. Кончится акция —
       строка исчезнет сама, вычёркивать её на картинке не придётся. */
    const u = PRICES.usluga(k.usluga);
    k.akciya = u.akciya
      ? `${u.akciya.tekst[0].toUpperCase()}${u.akciya.tekst.slice(1)} — обычная цена <s>${PRICES.rub(u.akciya.bylo)}</s>`
      : '';

    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(html(k), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    const check = await page.evaluate(() => {
      const s = document.querySelector('.sheet');
      const b = document.querySelector('.book');
      const f = b.getBoundingClientRect();
      const st = getComputedStyle(b, '::before');
      return {
        perepolnenie: Math.round(s.scrollHeight - s.clientHeight),
        nizKorobki: Math.round(f.bottom),
        /* Геометрия книги — печатается, чтобы карточки нельзя было
           развести незаметно: разъедутся числа, а не только картинка. */
        levo: Math.round(f.left), pravo: Math.round(f.right),
        shirina: Math.round(f.width), verh: Math.round(f.top),
        korshok: st.width + ' / ' + st.transform + ' / ' + st.fontSize,
      };
    });

    await page.screenshot({ path: path.join(OUT, `tovar-${k.id}.png`) });

    if (check.perepolnenie > 0 || check.nizKorobki > H) {
      console.error(`  ✗ tovar-${k.id}: не помещается (за краем ${Math.max(check.perepolnenie, check.nizKorobki - H)}px)`);
      bed++;
    } else {
      console.log(`  tovar-${k.id.padEnd(10)} → marketing/out/tovar-${k.id}.png`);
      console.log(`    книга: слева ${check.levo}, справа ${check.pravo}, ширина ${check.shirina}, верх ${check.verh}, низ ${check.nizKorobki}`);
      console.log(`    корешок: ${check.korshok}`);
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
