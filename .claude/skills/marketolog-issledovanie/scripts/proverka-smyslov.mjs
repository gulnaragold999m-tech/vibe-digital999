#!/usr/bin/env node
/**
 * proverka-smyslov.mjs — доехали ли выводы исследования до сайта.
 * Node 18+, без зависимостей.
 *
 *   node proverka-smyslov.mjs docs/marketing/issledovanie.md
 *   node proverka-smyslov.mjs docs/marketing/issledovanie.md --site site/public
 *   node proverka-smyslov.mjs docs/marketing/issledovanie.md --json
 *
 * Скрипт читает таблицу «Карта смыслов» из файла исследования и по каждой
 * строке смотрит СОБРАННУЮ страницу в public/: существует ли она и есть ли
 * на ней опорная фраза. Печатает то, что на сайт не доехало.
 *
 * Что скрипт НЕ проверяет: уместность блока, его место на странице и то,
 * читается ли он вообще. Это смотрит человек. Проверка ловит только то,
 * что ей велели смотреть.
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ─────────────────────────── аргументы ───────────────────────────
const argv = process.argv.slice(2);
let issledovanie = null, site = 'public', asJson = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--json') asJson = true;
  else if (a === '--site' || a === '-s') site = argv[++i];
  else if (!a.startsWith('-')) issledovanie = a;
}
if (!issledovanie) issledovanie = 'docs/marketing/issledovanie.md';

if (!existsSync(issledovanie)) {
  console.error(`Не найден файл исследования: ${issledovanie}`);
  console.error('Шаблон — .claude/skills/marketolog-issledovanie/references/shablon-issledovaniya.md');
  process.exit(2);
}
if (!existsSync(site)) {
  console.error(`Не найдена папка собранного сайта: ${site}`);
  console.error('Сначала «npm run build», либо укажите путь: --site site/public');
  process.exit(2);
}

// ─────────────────────────── помощники ───────────────────────────
// ё и е — одна буква для человека, но разные для строки. Приводим к одной,
// иначе «оформляем на вас, всё включено» не найдётся из-за одной точки.
const norm = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/[ \s]+/g, ' ').trim();

// Из HTML вынимаем видимый текст: скрипты и стили выкидываем целиком,
// иначе фраза найдётся внутри JSON-разметки и проверка соврёт.
function tekstStranicy(html) {
  return norm(html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&laquo;|&raquo;|&quot;/g, '"')
    .replace(/&mdash;|&ndash;/g, '—')
    .replace(/&amp;/g, '&'));
}

// Адрес страницы, как он выглядит в браузере, → файл в собранном сайте.
function fajlStranicy(adres) {
  let p = String(adres).trim().replace(/^https?:\/\/[^/]+/i, '');
  if (!p || p === '/') return join(site, 'index.html');
  p = p.replace(/^\/+/, '').replace(/[?#].*$/, '');
  if (/\.html?$/i.test(p)) return join(site, p);
  return join(site, p.replace(/\/+$/, ''), 'index.html');
}

// ─────────────────── таблица «Карта смыслов» ───────────────────
const stroki = readFileSync(issledovanie, 'utf8').split(/\r?\n/);

let i = stroki.findIndex((s) => /^#{1,6}\s.*карта\s+смыслов/i.test(s));
if (i === -1) {
  console.error(`В файле ${issledovanie} нет заголовка «Карта смыслов».`);
  console.error('Шаблон — references/shablon-issledovaniya.md, раздел 6.');
  process.exit(2);
}

const tablica = [];
for (i++; i < stroki.length; i++) {
  const s = stroki[i].trim();
  if (!s) { if (tablica.length) break; else continue; }
  if (s.startsWith('|')) tablica.push(s);
  else if (tablica.length) break;
  else if (/^#{1,6}\s/.test(s)) break; // дошли до следующего раздела — таблицы нет
}
if (tablica.length < 3) {
  console.error('Под заголовком «Карта смыслов» нет таблицы со строками.');
  process.exit(2);
}

const kletki = (s) => s.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const shapka = kletki(tablica[0]).map(norm);

// Колонки ищем по названию, а не по номеру: порядок в шаблоне может
// поменяться, а «Опорная фраза» останется «опорной фразой».
const najti = (...slova) => shapka.findIndex((h) => slova.some((w) => h.includes(w)));
const kol = {
  nomer: najti('№', 'номер'),
  segment: najti('сегмент'),
  smysl: najti('смысл'),
  tip: najti('тип'),
  stranica: najti('страниц'),
  blok: najti('блок'),
  fraza: najti('фраз'),
};
if (kol.stranica === -1 || kol.fraza === -1) {
  console.error('В таблице «Карта смыслов» нет колонок «Страница» и «Опорная фраза».');
  console.error('Шаблон — references/shablon-issledovaniya.md, раздел 6.');
  process.exit(2);
}

const zapisi = tablica.slice(1)
  .filter((s) => !/^\|[\s:|-]+\|?$/.test(s)) // строка-разделитель под шапкой
  .map(kletki)
  .filter((c) => c.length > 1 && c.some((v) => v))
  .map((c, n) => ({
    nomer: kol.nomer > -1 ? c[kol.nomer] || String(n + 1) : String(n + 1),
    segment: kol.segment > -1 ? c[kol.segment] || '' : '',
    smysl: kol.smysl > -1 ? c[kol.smysl] || '' : '',
    tip: kol.tip > -1 ? c[kol.tip] || '' : '',
    stranica: c[kol.stranica] || '',
    blok: kol.blok > -1 ? c[kol.blok] || '' : '',
    fraza: c[kol.fraza] || '',
  }));

// ─────────────────────────── проверка ───────────────────────────
const kesh = new Map();
function tekst(fajl) {
  if (kesh.has(fajl)) return kesh.get(fajl);
  let t = null;
  if (existsSync(fajl) && statSync(fajl).isFile()) t = tekstStranicy(readFileSync(fajl, 'utf8'));
  kesh.set(fajl, t);
  return t;
}

const itog = [];
for (const z of zapisi) {
  const fajl = fajlStranicy(z.stranica);
  const zapis = { ...z, fajl };

  if (!z.fraza || /^[—–-]+$/.test(z.fraza)) {
    zapis.status = 'пропущено';
    zapis.pochemu = 'опорная фраза не задана — проверяется глазами';
    itog.push(zapis); continue;
  }
  const t = tekst(fajl);
  if (t === null) {
    zapis.status = 'нет';
    zapis.pochemu = `страницы нет: ${fajl}`;
    itog.push(zapis); continue;
  }
  const varianty = z.fraza.split(/\s+или\s+/i).map(norm).filter(Boolean);
  const najdeno = varianty.find((v) => t.includes(v));
  zapis.status = najdeno ? 'есть' : 'нет';
  zapis.pochemu = najdeno ? `найдено: «${najdeno}»` : `фразы нет на ${z.stranica}`;
  itog.push(zapis);
}

const est = itog.filter((z) => z.status === 'есть');
const net = itog.filter((z) => z.status === 'нет');
const propusk = itog.filter((z) => z.status === 'пропущено');

// ─────────────────────────── вывод ───────────────────────────
if (asJson) {
  console.log(JSON.stringify({
    issledovanie: resolve(issledovanie), sajt: resolve(site),
    vsego: itog.length, est: est.length, net: net.length, propuscheno: propusk.length,
    smysly: itog,
  }, null, 2));
  process.exit(net.length ? 1 : 0);
}

console.log(`\nКарта смыслов: ${issledovanie}`);
console.log(`Собранный сайт: ${site}`);
console.log(`Смыслов в карте: ${itog.length}\n`);

if (net.length) {
  console.log('НЕ ДОЕХАЛИ ДО САЙТА:');
  for (const z of net) {
    console.log(`  ✗ ${z.nomer}. ${z.smysl || z.fraza}${z.segment ? ` — ${z.segment}` : ''}`);
    console.log(`      ${z.tip ? z.tip + ', ' : ''}ждали на ${z.stranica}${z.blok ? `, блок «${z.blok}»` : ''}`);
    console.log(`      ${z.pochemu}`);
  }
  console.log('');
}
if (propusk.length) {
  console.log('ПРОВЕРЯЮТСЯ ГЛАЗАМИ (опорной фразы нет):');
  for (const z of propusk) console.log(`  ? ${z.nomer}. ${z.smysl || '—'} → ${z.stranica}${z.blok ? `, блок «${z.blok}»` : ''}`);
  console.log('');
}
if (est.length) {
  console.log('НА САЙТЕ:');
  for (const z of est) console.log(`  ✓ ${z.nomer}. ${z.smysl || z.fraza} → ${z.stranica}`);
  console.log('');
}

console.log(`Итог: на сайте ${est.length}, не доехало ${net.length}, глазами ${propusk.length}.`);
if (net.length) {
  console.log('\nКаждый пропущенный смысл — это либо блок, который забыли поставить,');
  console.log('либо строчка исследования, которую пора вычеркнуть. Третьего нет.');
}
process.exit(net.length ? 1 : 0);
