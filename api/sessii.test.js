/**
 * Проверка свода по разговорам. Запуск: npm run test-sessii
 *
 * Свод считает главную цифру отчёта — сколько людей ушло молча.
 * Ошибка в нём не видна ниоткуда: отчёт открывается, цифры красивые,
 * и по ним принимают решения. Поэтому сворачивание событий проверяется
 * на выдуманных строках, без диска и без сети.
 */

const { svodkaIz } = require('./sessii');

let oshibok = 0;

function proverit(nazvanie, bylo, zhdyom) {
  const ok = JSON.stringify(bylo) === JSON.stringify(zhdyom);
  if (!ok) oshibok++;
  console.log(`  ${ok ? '✓' : '✗'} ${nazvanie}`);
  if (!ok) console.log(`      получили ${JSON.stringify(bylo)}, ждали ${JSON.stringify(zhdyom)}`);
}

console.log('\nСВОД ПО РАЗГОВОРАМ:');

/* Разговор из трёх сообщений, контакта нет — это молчун. */
const molchun = svodkaIz([
  { at: '2026-08-14T10:00:00Z', key: 'vk|77', kanal: 'vk', peer: '77', n: 1, vopros: null },
  { at: '2026-08-14T10:01:00Z', key: 'vk|77', kanal: 'vk', peer: '77', n: 2, vopros: 'Чем занимаетесь?' },
  { at: '2026-08-14T10:03:00Z', key: 'vk|77', kanal: 'vk', peer: '77', n: 3, vopros: 'В каком вы городе?' },
]);
proverit('один разговор из трёх событий', molchun.length, 1);
proverit('сообщений посчитано', molchun[0].soobshchenij, 3);
proverit('последний вопрос — последний', molchun[0].vopros, 'В каком вы городе?');
proverit('контакта нет', molchun[0].contact, null);
proverit('номер страницы ВК сохранён', molchun[0].peer, '77');
proverit('начало не съехало', molchun[0].nachalo, '2026-08-14T10:00:00Z');
proverit('конец — время последнего события', molchun[0].konec, '2026-08-14T10:03:00Z');

/* Контакт пришёл отдельным событием закрытия — и не должен потеряться,
   даже если человек написал что-то ещё после него. */
const zakryt = svodkaIz([
  { at: '2026-08-14T11:00:00Z', key: 'sajt|c1', kanal: 'sajt', n: 1, vopros: null },
  { at: '2026-08-14T11:02:00Z', key: 'sajt|c1', kanal: 'sajt', contact: '+79992449999', n: 0 },
  { at: '2026-08-14T11:05:00Z', key: 'sajt|c1', kanal: 'sajt', n: 2, vopros: 'Записал, ответим в течение часа' },
]);
proverit('контакт пережил следующие сообщения', zakryt[0].contact, '+79992449999');
proverit('счётчик не сбросился нулевым событием', zakryt[0].soobshchenij, 2);

/* Разные разговоры не должны слипаться. */
const dvoe = svodkaIz([
  { at: '2026-08-14T12:00:00Z', key: 'vk|1', kanal: 'vk', peer: '1', n: 1 },
  { at: '2026-08-14T12:00:00Z', key: 'vk|2', kanal: 'vk', peer: '2', n: 1 },
]);
proverit('два собеседника — два разговора', dvoe.length, 2);

/* Мусор в файле не должен ронять отчёт: строка могла оборваться. */
const musor = svodkaIz([null, {}, { key: '', n: 5 }, { at: 'x', key: 'vk|9', kanal: 'vk', n: 1 }]);
proverit('пустые строки пропущены', musor.length, 1);

if (oshibok) {
  console.error(`\n✗ ПРОВЕРКА НЕ ПРОШЛА: ${oshibok}.`);
  console.error('  Отчёт по молчунам будет считать неверно.\n');
  process.exit(1);
}

console.log('\n✓ Свод по разговорам: все проверки прошли.\n');
