/* ЕДИНЫЙ ПРАЙС СТУДИИ — источник правды для всего проекта.

   Правило владелицы, 13.08.2026: «Мы можем подправить прайс на сайте
   и забыть про бота. Это должно быть автоматическое обновление. Цена
   по пакетам, по акциям везде одинаковая — в макетах, в рекламе».

   ПРАВИТЬ ЦЕНУ ИЛИ СРОК ТОЛЬКО ЗДЕСЬ. Дальше само:

     api/brief.js          прайс бота на сайте и во ВКонтакте
     marketing/creatives.js цена и срок на рекламных макетах
     src/pages.js          разметка Offer для поисковиков
     build.js              подстановка {{цена:id}} и {{срок:id}}
                           в страницы и проверка блоков «Цена» и «Срок»

   Почему это понадобилось. До 13.08.2026 одна цена была записана
   в четырёх местах руками, и они разъезжались по очереди:
   11.08 уехали цены на макетах, 13.08 — нижние границы калькулятора
   и сроки во всех четырёх макетах. Каждый раз замечал человек,
   а не проверка.

   ЦЕНА И РЕГИОН. Сегодня цены одинаковые во всех регионах, и это
   осознанно: сайт продаёт по всей России, а разная цена на гео-страницах
   читается как обман, если человек откроет две. Поле `poRegionam`
   оставлено на случай, если решение изменится, — тогда цена будет
   меняться ЗДЕСЬ, а не в тексте страницы. */

/* ── Услуги ──────────────────────────────────────────────────────
   `ot: true`  — цена стартовая, пишется «от 35 000 ₽».
   `srok`      — ровно тем текстом, каким он стоит в блоке «Срок»
                 на странице услуги. Пусто — срок не обещаем.
   `stranica`  — адрес страницы услуги, по нему сверяются блоки
                 «Цена» и «Срок» при сборке. */
const USLUGI = [
  {
    id: 'lid-bot',
    nazvanie: 'Лид-бот (заявка, частые вопросы, уведомление)',
    cena: 15000, ot: true, srok: 'от 7 дней',
    stranica: '/uslugi/telegram-bot/',
  },
  {
    id: 'bot-zapis',
    nazvanie: 'Бот для записи и продаж (ветвления, напоминания)',
    cena: 35000, ot: true, srok: 'от 7 дней',
  },
  {
    id: 'agent',
    nazvanie: 'ИИ-агент с базой знаний',
    cena: 60000, ot: true, srok: 'от 14 дней',
    stranica: '/uslugi/ai-agent/',
  },
  {
    id: 'lending-start',
    nazvanie: 'Лендинг «Старт»',
    cena: 35000, ot: true, srok: 'от 7 дней',
    stranica: '/uslugi/razrabotka-sajta/',
  },
  {
    id: 'lending-prodazhi',
    nazvanie: 'Лендинг «Продажи» (воронка, квиз или калькулятор)',
    cena: 65000, ot: true, srok: 'от 10 дней',
    stranica: '/vibecoding/',
  },
  {
    id: 'sajt-5-10',
    nazvanie: 'Сайт на 5–10 страниц',
    cena: 90000, ot: true, srok: 'от трёх недель',
  },
  {
    id: 'prilozhenie',
    nazvanie: 'Сервис, MVP, приложение',
    cena: 150000, ot: true, srok: 'от 30 дней',
    stranica: '/uslugi/prilozheniya/',
    primechanie: 'только после оценки',
  },
  {
    id: 'avtomatizaciya',
    nazvanie: 'Автоматизация одной связки',
    cena: 30000, ot: true, srok: '',
    /* На самой странице в блоке «Цена» стоит «По брифу»: связки бывают
       от одной таблицы до цепочки из пяти сервисов. 30 000 ₽ — нижняя
       граница, она стоит в прайсе и у бота. Поэтому `stranica` здесь
       не указана: сверять «По брифу» с числом нечем. */
  },
  {
    id: 'audit',
    nazvanie: 'SEO-аудит с проверкой по 152-ФЗ',
    cena: 15000, ot: false, srok: '3 дня',
    stranica: '/uslugi/seo-audit-152fz/',
    akciya: { bylo: 20000, tekst: 'по акции' },
  },
  {
    id: 'karty',
    nazvanie: 'Интеграция Яндекс Карт',
    cena: 15000, ot: true, srok: 'от 3 дней',
  },
];

/* ── Пакеты ──────────────────────────────────────────────────────
   Цена пакета — РОВНО сумма позиций, скидки внутри нет. Выигрыш
   в сроке: один разбор задачи, один дизайн, один запуск. Поэтому
   `sostav` — не описание, а формула: сумма считается из неё, и пакет
   не может разойтись с услугами, из которых собран. */
const PAKETY = [
  {
    id: 'start', nazvanie: '«Старт»', srok: 'от 10 дней',
    komu: 'Небольшая команда до 15 человек.',
    sostav: ['lending-start', 'lid-bot'],
    soprovozhdenie: 5000, chasy: '1 час правок',
  },
  {
    id: 'potok', nazvanie: '«Поток»', srok: 'от трёх недель',
    komu: 'Команда до 100 человек, стабильный поток обращений.',
    sostav: ['lending-prodazhi', 'bot-zapis'],
    soprovozhdenie: 8000, chasy: '2 часа правок',
  },
  {
    id: 'sistema', nazvanie: '«Система»', srok: 'от пяти недель',
    komu: 'Растущая компания до 250 человек.',
    sostav: ['sajt-5-10', 'agent'],
    soprovozhdenie: 15000, chasy: '3 часа правок',
  },
];

/* ── Помощники ───────────────────────────────────────────────── */

const rub = (n) => n.toLocaleString('ru-RU') + ' ₽';

const usluga = (id) => {
  const u = USLUGI.find((x) => x.id === id);
  if (!u) throw new Error(`Нет услуги «${id}» в src/prices.js`);
  return u;
};

/* Цена строкой, как её показывают человеку: «от 35 000 ₽», «15 000 ₽». */
const cena = (id) => (usluga(id).ot ? 'от ' : '') + rub(usluga(id).cena);

const srok = (id) => usluga(id).srok;

/* Сумма пакета — из состава, а не из отдельного числа. */
const cenaPaketa = (p) => p.sostav.reduce((s, id) => s + usluga(id).cena, 0);

/* Готовый блок прайса для промпта бота. Отступ в два пробела — чтобы
   в промпте он читался списком, как читался написанный руками. */
function prajsDlyaBota() {
  return USLUGI.map((u) => {
    const chasti = [(u.ot ? 'от ' : '') + rub(u.cena)];
    if (u.akciya) chasti[0] = `${rub(u.cena)} ${u.akciya.tekst}`;
    if (u.srok) chasti.push(u.srok);
    if (u.primechanie) chasti.push(u.primechanie);
    return `  ${u.nazvanie} — ${chasti.join(', ')}`;
  }).join('\n');
}

function paketyDlyaBota() {
  return PAKETY.map((p) => {
    const sostav = p.sostav.map((id) => usluga(id).nazvanie.replace(/ \(.*\)$/, '')).join(' + ');
    return `  ${p.nazvanie} — от ${rub(cenaPaketa(p))}, ${p.srok}. ${p.komu}\n    ${sostav}.`;
  }).join('\n');
}

function soprovozhdenieDlyaBota() {
  return PAKETY.map((p) => `  к пакету ${p.nazvanie} — ${rub(p.soprovozhdenie)} в месяц, ${p.chasy}`).join('\n');
}

module.exports = {
  USLUGI, PAKETY,
  rub, usluga, cena, srok, cenaPaketa,
  prajsDlyaBota, paketyDlyaBota, soprovozhdenieDlyaBota,
};
