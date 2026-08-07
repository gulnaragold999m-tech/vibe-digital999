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

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Сайт запущен: http://localhost:${PORT}`);

  /* Бот в ВК живёт в этом же процессе: отдельное приложение на Amvera —
     это второй счёт и второй деплой ради одного долгого запроса.
     Если он не настроен или упадёт, сайт продолжит работать. */
  startVkBot();
});
