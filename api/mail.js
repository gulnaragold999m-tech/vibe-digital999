/**
 * Почта: третий канал доставки заявок.
 *
 * ЗАЧЕМ ТРЕТИЙ. Telegram и ВК — оба мессенджеры, и оба чужие. 3 августа
 * Telegram перестал принимать сообщения, и заявки уходили в пустоту.
 * Почта устроена иначе: письмо остаётся в ящике, его видно с любого
 * устройства, оно не теряется в ленте чатов и его можно переслать
 * бухгалтеру или клиенту. Для заявки, за которую заплачены деньги
 * за рекламу, это разница между «нашли» и «не нашли».
 *
 * Заявка считается доставленной, если её принял ХОТЬ ОДИН канал.
 *
 * ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ (Amvera → Настройки → Переменные окружения):
 *   MAIL_TO    — куда слать заявки. Можно несколько адресов через запятую.
 *   SMTP_USER  — ящик, ОТ которого уходит письмо (он же логин).
 *   SMTP_PASS  — пароль приложения, НЕ основной пароль от почты.
 *   SMTP_HOST  — необязательно, по умолчанию smtp.yandex.ru
 *   SMTP_PORT  — необязательно, по умолчанию 465 (шифрование сразу)
 *
 * ПРО ПАРОЛЬ ПРИЛОЖЕНИЯ. Яндекс не пускает программы по обычному паролю.
 * Нужен отдельный пароль приложения: id.yandex.ru → Безопасность →
 * Пароли приложений → Почта. Он даёт доступ только к отправке писем,
 * и его можно отозвать, не меняя основной пароль.
 *
 * ПРО ЗАКОН. Ящик на Яндексе — сервер в России, поэтому персональные
 * данные из заявки границу не пересекают. Если однажды поменяете
 * SMTP_HOST на зарубежный (Gmail, Mailgun), это станет трансграничной
 * передачей — с уведомлением в Роскомнадзор и правкой политики,
 * ровно как описано в .env.example про LLM_BASE_URL.
 *
 * Если переменных нет — модуль молчит, и всё работает как раньше.
 */

const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.yandex.ru';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;

/** Настроен ли канал. Без этого не пытаемся слать — и не пишем в лог панику. */
function mailConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_TO);
}

/* Транспорт создаём один раз и держим: nodemailer переиспользует
   соединение, а пересоздание на каждое письмо — лишнее рукопожатие
   с сервером на каждой заявке. */
let transport = null;

function getTransport() {
  if (transport) return transport;

  transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,        // 465 — шифрование сразу, 587 — после STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    /* Ограничения по времени обязательны. Без них зависший SMTP держит
       заявку в воздухе неограниченно долго, а человек в это время уже
       ждёт ответа. Лучше признать отказ и отдать заявку другим каналам. */
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });

  return transport;
}

/**
 * Отправляет заявку на почту владельцу.
 *
 * Ошибку не бросаем наверх, а возвращаем описанием: вызывающий код
 * рассылает в несколько каналов сразу и должен узнать судьбу каждого,
 * а не прерваться на первом же отказе.
 *
 * @param {string} subject тема письма — по ней заявку ищут в ящике
 * @param {string} text    тело письма, тот же простой текст, что уходит в ВК
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function sendMailToOwner(subject, text) {
  if (!mailConfigured()) {
    return { ok: false, error: 'почта не настроена' };
  }

  try {
    await getTransport().sendMail({
      from: process.env.SMTP_USER,    // Яндекс отвергает письмо, если From не равен логину
      to: process.env.MAIL_TO,
      subject,
      text,
    });

    return { ok: true };
  } catch (err) {
    /* Расшифровываем частое: без этого «535» в логах Amvera через месяц
       ничего не скажет тому, кто будет разбираться. */
    const hint = MAIL_ERRORS.find(rule => rule.test(err));
    console.error('[mail] Не отправилось:', err.message, hint ? `— ${hint.hint}` : '');
    return { ok: false, error: err.message };
  }
}

const MAIL_ERRORS = [
  {
    test: err => /535|Invalid user or password|authentication failed/i.test(err.message || ''),
    hint: 'логин или пароль не подошли. Нужен пароль приложения с id.yandex.ru, ' +
          'а не обычный пароль от почты',
  },
  {
    test: err => /ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(err.code || err.message || ''),
    hint: 'не достучались до почтового сервера — проверьте SMTP_HOST и SMTP_PORT',
  },
  {
    test: err => /553|554|not allowed|From/i.test(err.message || ''),
    hint: 'адрес отправителя не совпадает с логином: SMTP_USER должен быть тем же ящиком',
  },
];

module.exports = { mailConfigured, sendMailToOwner };
