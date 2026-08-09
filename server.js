require('dotenv').config();

const path = require('path');
const express = require('express');
const compression = require('compression');
const { handleLead, handleLeadsExport } = require('./api/lead');
const { handleBrief } = require('./api/brief');
const { startVkBot } = require('./api/vk-bot');

const app = express();
const PORT = process.env.PORT || 3000;

/* Сжатие. Страница у нас одна и очень насыщенная — 248 КБ текста,
   потому что весь HTML, CSS и скрипты лежат в одном файле. В сжатом
   виде это 63 КБ: вчетверо меньше, и разница целиком приходится
   на первый экран, до которого посетитель ждёт.
   Особенно заметно на мобильном интернете, а к нам приходят с телефонов.

   Ставится первой строкой: middleware работает на ответ, и всё, что
   зарегистрировано ниже, — статика, страницы, ошибки — пройдёт через
   неё. Картинки и шрифты compression пропускает сам: woff2, png и jpg
   уже сжаты, второй проход только тратит процессор.

   ВАЖНО: не сжимаем поток чата. Он отдаётся через text/event-stream
   по кусочку, а сжатие копит буфер перед отправкой — ответ ассистента
   приходил бы одним куском в конце, и вся идея живой печати пропадает. */
app.use(compression({
  filter(req, res) {
    if (res.getHeader('Content-Type')?.toString().includes('text/event-stream')) return false;
    return compression.filter(req, res);
  },
}));

app.use(express.json({ limit: '32kb' }));

/* Простая защита от спама: не больше 5 заявок с одного адреса за 10 минут. */
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now - record.start > WINDOW_MS) {
    attempts.set(ip, { start: now, count: 1 });
    return next();
  }

  if (record.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ ok: false, error: 'Слишком много заявок. Попробуйте позже.' });
  }

  record.count += 1;
  return next();
}

/* Чистим старые записи раз в час, чтобы память не росла. */
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of attempts) {
    if (now - record.start > WINDOW_MS) attempts.delete(ip);
  }
}, 60 * 60 * 1000).unref();

app.post('/api/lead', rateLimit, handleLead);

/* ИИ-брифер чата. Свой лимитер внутри: у диалога другой ритм, чем у заявки —
   пять сообщений за десять минут здесь мало, разговор оборвётся на середине. */
app.post('/api/brief', handleBrief);

app.get('/health', (req, res) => res.json({ ok: true }));

/* Выгрузка сохранённых заявок. Закрыта ключом из переменной LEADS_KEY,
   без неё адрес отвечает 404 — внутри персональные данные посетителей. */
app.get('/api/leads', handleLeadsExport);

/* Короткие адреса для сторис.

   ЗАЧЕМ. В историях WhatsApp, Telegram и ВК ссылку нельзя нажать — адрес
   нарисован на картинке, и человек набирает его руками. Метку в такой адрес
   не впишешь: `?utm_source=whatsapp&utm_medium=stories` никто не наберёт.
   Мессенджеры при этом не сообщают сайту, откуда пришёл посетитель, поэтому
   Метрика видит визит без источника и относит его к прямым заходам. Все три
   канала сливаются в одну строку, и понять, какой из них работает, нельзя.

   КАК РЕШАЕМ. На картинке пишем vibe-digital999.ru/wa — два лишних символа,
   их наберут. Сервер отвечает переадресацией на главную с метками, и в
   Метрике (Отчёты → Источники → Метки UTM) каждый канал виден отдельно.

   Переадресация временная, 302: если завтра поменяем метки, браузер не будет
   держать у себя старый адрес. 301 закэшируется навсегда, и у тех, кто уже
   заходил, метки останутся прежними.

   Регистрируем ДО express.static: у статики включено extensions: ['html'],
   и без этого запрос /wa ушёл бы искать файл public/wa.html.

   utm_medium=stories отделяет истории от кликабельных ссылок в постах — там
   ставим ту же метку с utm_medium=post. Подробнее: docs/11-STORIES-METKI.md */
const STORY_SOURCES = {
  wa: 'whatsapp',
  tg: 'telegram',
  vk: 'vk',
};

for (const [shortPath, source] of Object.entries(STORY_SOURCES)) {
  app.get(`/${shortPath}`, (req, res) => {
    res.redirect(302, `/?utm_source=${source}&utm_medium=stories`);
  });
}

/* Картинки и шрифты кэшируем надолго, а HTML — никогда:
   иначе после обновления сайта посетители ещё час видят старую страницу. */
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  maxAge: '7d',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html') || filePath.endsWith('.xml') || filePath.endsWith('.txt')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

/* Несуществующий адрес.

   Раньше здесь отдавалась главная страница с кодом 404. Пока страница была
   одна, разницы не было. Теперь адресов много, ошибиться в них легко — и
   человек, набравший /uslugi/telegram-bota, видел бы главную и решил, что
   раздел просто исчез. Страница 404 говорит прямо: адреса нет, вот разделы.

   Код именно 404, а не 200 с текстом «не найдено»: по коду робот понимает,
   что страницу не надо держать в индексе. Страница 404 закрыта от индексации
   мета-тегом и в sitemap.xml не входит.

   Запасной путь на случай, если файла нет (сборка не отработала): отдаём
   главную. Пустой ответ хуже неточного. */
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'), (err) => {
    if (err) res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
  });
});

app.listen(PORT, () => {
  console.log(`Сайт запущен: http://localhost:${PORT}`);

  /* Бот в ВК живёт в этом же процессе: отдельное приложение на Amvera —
     это второй счёт и второй деплой ради одного долгого запроса.
     Если он не настроен или упадёт, сайт продолжит работать. */
  startVkBot();
});
