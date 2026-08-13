/* Шрифты сайта, вшитые в разметку — общие для всех генераторов картинок.

   Лежат отдельным файлом, потому что генераторов уже два:
   creatives.js (реклама для ВК) и karty-cards.js (карточки для Яндекс
   Карт). Скопировать этот код во второй файл значило бы завести второй
   источник правды — ровно то, из-за чего в проекте разъезжались цены.

   Почему вшиваем, а не тянем ссылкой. Так генератор не зависит
   ни от запущенного сервера, ни от того, по какому пути лежит проект:
   запустится в любой папке и на любой машине. Файлы те же самые, что
   отдаёт сайт, — значит буквы в рекламе и на сайте одинаковые
   до пикселя.

   Cinzel берём только латинский: кириллицы в нём нет вовсе, русский
   текст в нём уехал бы в запасной шрифт и разъехался по начертанию.
   Поэтому Cinzel только на «VIBE DIGITAL 999», всё русское — Manrope.

   Объявления @font-face берутся прямо из fonts.css сайта, подменяется
   только ссылка на файл. Так сохраняется unicode-range — а он тут
   главное. Без него побеждает последнее подходящее объявление,
   и кириллица уезжает в латинский файл, где её нет: заголовок молча
   набирается системным шрифтом и выглядит тоньше и шире. На глаз это
   ловится не сразу, а буквы уже не те, что на сайте. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FAMILIES = ['Manrope', 'Cinzel'];

const fontCss = fs.readFileSync(path.join(ROOT, 'public/assets/fonts/fonts.css'), 'utf8')
  .split('@font-face')
  .filter(block => FAMILIES.some(f => block.includes(`'${f}'`)))
  .map(block => '@font-face' + block.slice(0, block.indexOf('}') + 1))
  .map(block => block.replace(/url\(\/assets\/fonts\/([^)]+)\)/, (_, file) => {
    const data = fs.readFileSync(path.join(ROOT, 'public/assets/fonts', file)).toString('base64');
    return `url(data:font/woff2;base64,${data})`;
  }))
  /* На макетах шрифт обязан быть готов ДО снимка: со swap браузер успеет
     нарисовать кадр запасным шрифтом, и в PNG попадёт он. */
  .map(block => block.replace('font-display: swap;', 'font-display: block;'))
  .join('\n');

module.exports = { fontCss };
