/**
 * Проверка распознавания контакта. Запуск: npm run test-kontakt
 *
 * Зачем она есть. 14.08.2026 нашлись две дыры, каждая из которых
 * теряла заявку МОЛЧА — бот отвечал как обычно, человек считал, что
 * оставил телефон, а владелице не приходило ничего:
 *
 *   «+7 (999) 244-99-99» — самая частая запись номера — не ловилась
 *   вовсе, потому что после кода страны шли пробел И скобка сразу;
 *
 *   из почты «mail@yandex.ru» доставалось «@yandex», и в бриф уходил
 *   контакт несуществующего аккаунта.
 *
 * Такую поломку не видно ни на сайте, ни в логах. Значит, её должна
 * ловить проверка, а не человек.
 *
 * Правило при правке: сначала допиши сюда случай, который сломался,
 * убедись, что тест на нём падает, и только потом чини код.
 */

const { findContact, normalizeKontakt, mozhetBytKontakt } = require('./kontakt');
const { istochnik } = require('./vizit');

/* Как люди пишут контакт на самом деле. Каждая строка — из тех,
   что реально приходят в переписке. */
const LOVIM = [
  ['+79992449999', '+79992449999'],
  ['8 999 244 99 99', '+79992449999'],
  ['+7 (999) 244-99-99', '+79992449999'],
  ['+7-999-244-99-99', '+79992449999'],
  ['телефон 8(999)2449999', '+79992449999'],
  ['мой телефон 79992449999', '+79992449999'],
  ['вотсап 89992449999', '+79992449999'],
  ['позвоните 8 999 244 99 99 после обеда', '+79992449999'],
  ['9992449999', '+79992449999'],
  ['999 244 99 99', '+79992449999'],
  ['@granat_jarvis', '@granat_jarvis'],
  ['ник @gulnara_vd', '@gulnara_vd'],
  ['почта mail@yandex.ru', 'mail@yandex.ru'],
  ['Ivanov.A@mail.ru', 'ivanov.a@mail.ru'],
];

/* Числа, которые контактом не являются. Ложный контакт хуже пропуска:
   владелице уходит бриф, она звонит — и попадает не туда. */
const NE_LOVIM = [
  'бюджет 150 000 ₽, срок 3 месяца',
  'у нас 12 номеров и 300 000 бюджет',
  'сайт за 35 000 и бот за 150 000',
  'бюджет 80 000-250 000',
  'это стоит 1 500 000 рублей',
  'работаем с 9:00 до 18:00',
  'дом 8, кв 999',
  '@ab',
  'напишите мне в телеграм, ник как в профиле',
];

let oshibok = 0;

console.log('\nДОЛЖНО ЛОВИТЬСЯ:');
for (const [text, zhdyom] of LOVIM) {
  const bylo = findContact(text);
  const ok = bylo === zhdyom;
  if (!ok) oshibok++;
  console.log(`  ${ok ? '✓' : '✗'} ${JSON.stringify(text)} → ${bylo}${ok ? '' : `  (ждали ${zhdyom})`}`);
}

console.log('\nКОНТАКТОМ НЕ ЯВЛЯЕТСЯ:');
for (const text of NE_LOVIM) {
  const bylo = findContact(text);
  const ok = bylo === null;
  if (!ok) oshibok++;
  console.log(`  ${ok ? '✓' : '✗'} ${JSON.stringify(text)}${ok ? '' : `  (приняли за контакт: ${bylo})`}`);
}

/* ── Второй слой: когда зовём модель ──────────────────────────────
   Разбор знаками не понимает «мой номер восемь девятьсот…» и ник без
   собаки. На таких сообщениях подключается модель — но звать её на
   каждое «сколько стоит» нельзя, это лишние деньги за каждый запрос.
   Здесь проверяется именно решение «звать или не звать». */
const ZVAT_MODEL = [
  'мой номер восемь девятьсот девяносто девять два сорок четыре',
  'пишите в тг granatjarvis',
  'телефон 8 999 12',
  'моя почта на майле, ivanov собака mail точка ru',
];

const NE_ZVAT = [
  'сколько стоит сайт',                    // ни цифр, ни намёка
  'а бот дороже?',
  '+7 999 244 99 99',                      // уже нашли знаками, модель не нужна
  'нам нужно к 15 сентября',
];

/* ── Источник визита ──────────────────────────────────────────────
   По нему в карте воронки считается конверсия каждого входа. */
const ISTOCHNIKI = [
  ['/?utm_referer=geoadv_12', '', 'yandex_business'],
  ['/?yclid=99', '', 'yandex_business'],
  ['/?utm_source=2gis', '', '2gis'],
  ['/?utm_source=whatsapp&utm_medium=stories', '', 'stories'],
  ['/', 'https://yandex.ru/search/', 'seo'],
  ['/', 'https://vk.com/feed', 'ssylka'],
  ['/pakety/', 'https://vibe-digital999.ru/', 'ne_opredelen'],
  ['/', '', 'ne_opredelen'],
];

console.log('\nМОДЕЛЬ НУЖНА:');
for (const text of ZVAT_MODEL) {
  const ok = mozhetBytKontakt(text) === true;
  if (!ok) oshibok++;
  console.log(`  ${ok ? '✓' : '✗'} ${JSON.stringify(text)}`);
}

console.log('\nМОДЕЛЬ НЕ НУЖНА:');
for (const text of NE_ZVAT) {
  const ok = mozhetBytKontakt(text) === false;
  if (!ok) oshibok++;
  console.log(`  ${ok ? '✓' : '✗'} ${JSON.stringify(text)}`);
}

console.log('\nОТВЕТ МОДЕЛИ ПРИВОДИТСЯ К ОБЩЕМУ ВИДУ:');
const OTVETY = [
  ['+7 999 244 99 99', '+79992449999'],
  ['89992449999', '+79992449999'],
  ['granatjarvis', '@granatjarvis'],       // ник без собаки
  ['@granatjarvis', '@granatjarvis'],
  ['mail@yandex.ru', 'mail@yandex.ru'],
  ['НЕТ', null],                           // модель не нашла контакта
  ['не могу определить, уточните у клиента', null],
];
for (const [otvet, zhdyom] of OTVETY) {
  const bylo = normalizeKontakt(otvet);
  const ok = bylo === zhdyom;
  if (!ok) oshibok++;
  console.log(`  ${ok ? '✓' : '✗'} ${JSON.stringify(otvet)} → ${bylo}${ok ? '' : `  (ждали ${zhdyom})`}`);
}

console.log('\nИСТОЧНИК ВИЗИТА:');
for (const [page, ref, zhdyom] of ISTOCHNIKI) {
  const bylo = istochnik(page, ref);
  const ok = bylo === zhdyom;
  if (!ok) oshibok++;
  console.log(`  ${ok ? '✓' : '✗'} ${JSON.stringify(page)} ${ref ? 'от ' + ref : ''} → ${bylo}${ok ? '' : `  (ждали ${zhdyom})`}`);
}

const vsego = LOVIM.length + NE_LOVIM.length + ZVAT_MODEL.length
  + NE_ZVAT.length + OTVETY.length + ISTOCHNIKI.length;

if (oshibok) {
  console.error(`\n✗ ПРОВЕРКА НЕ ПРОШЛА: ${oshibok} из ${vsego}.`);
  console.error('  Пока это не исправлено, часть заявок из чата теряется молча.\n');
  process.exit(1);
}

console.log(`\n✓ Распознавание контакта: все ${vsego} проверки прошли.\n`);
