#!/usr/bin/env node
/* Собирает из site/ один файл для показа заказчику: стили, скрипты и фото
   вкладываются внутрь. Нужен, потому что предпросмотр открывается по ссылке,
   а не с диска — внешних файлов рядом нет.
       node sobrat-prosmotr.mjs           → prosmotr.html
   На настоящий сайт уезжает site/, а не этот файл. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const koren = join(dirname(fileURLToPath(import.meta.url)), 'site');
let html = readFileSync(join(koren, 'index.html'), 'utf8');

const css = readFileSync(join(koren, 'assets/css/site.css'), 'utf8');
const dannye = readFileSync(join(koren, 'assets/js/dannye.js'), 'utf8');
const skript = readFileSync(join(koren, 'assets/js/site.js'), 'utf8');
const foto = readFileSync(join(koren, 'assets/img/stakan.jpg')).toString('base64');

html = html
  .replace('<link rel="stylesheet" href="assets/css/site.css">', `<style>\n${css}\n</style>`)
  .replace('<script src="assets/js/dannye.js"></script>', `<script>\n${dannye}\n</script>`)
  .replace('<script src="assets/js/site.js"></script>', `<script>\n${skript}\n</script>`)
  .replace('src="assets/img/stakan.jpg"', `src="data:image/jpeg;base64,${foto}"`);

// предпросмотр вставляется в готовую обвязку, свои <html>/<head>/<body> там лишние
const golova = html.slice(html.indexOf('<title>'), html.indexOf('</head>'));
const telo = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'prosmotr.html'), golova + telo);

console.log('prosmotr.html собран, КБ:', Math.round((golova + telo).length / 1024));
