/**
 * Бот в сообществе ВКонтакте.
 *
 * Тот же ассистент, что и в чате на сайте: тот же системный промпт, те же
 * вопросы, тот же бриф владельцу, когда человек назвал телефон. Отличается
 * только дверь, в которую вошёл посетитель.
 *
 * ЗАЧЕМ ЭТО ВООБЩЕ. В ВК человек пишет прямо из ленты, не переходя на сайт.
 * Если ему никто не отвечает полчаса, он уходит к следующему подрядчику —
 * а сообщение так и висит непрочитанным до вечера. Бот отвечает за секунды
 * и, главное, успевает собрать бриф, пока интерес не остыл.
 *
 * КАК УСТРОЕНО. Long Poll: приложение само держит открытым запрос к ВК
 * и ждёт события. Вебхук (Callback API) не подошёл бы — он требует, чтобы
 * ВК стучался к нам снаружи, а это лишний открытый адрес и лишняя настройка
 * при каждом переезде.
 *
 * ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ (Amvera → Настройки → Переменные окружения):
 *   VK_TOKEN    — ключ доступа сообщества (тот же, что и для заявок)
 *   VK_GROUP_ID — номер сообщества, без минуса. Виден в адресе
 *                 vk.com/club229358... или в Управление → Настройки.
 *
 * НАСТРОЙКА В САМОМ ВК (без неё бот не увидит ни одного сообщения).
 * Порядок важен: следующий пункт не появится, пока не сделан предыдущий.
 *   1. Управление → Сообщения → включить «Сообщения сообщества».
 *   2. Управление → Сообщения → Настройки для бота → «Возможности ботов»
 *      переключить в «Включены» и нажать «Сохранить». Без этого ВК отвечает
 *      ошибкой 912, и бот молча не может писать людям.
 *   3. Там же отметить «Добавить кнопку „Начать“» и снова «Сохранить».
 *      Человек нажимает кнопку вместо того, чтобы придумывать первую фразу.
 *      Галочку «Разрешать добавлять сообщество в чаты» не трогаем: бот
 *      рассчитан на личную переписку, в групповом чате он будет мешать.
 *
 * Long Poll и подписку на входящие сообщения бот включает сам при запуске
 * (см. ensureLongPollSettings ниже) — руками в интерфейс лезть не нужно.
 * Для этого у ключа доступа должны быть отмечены две галочки:
 * «Сообщения сообщества» и «Управление сообществом».
 *
 * Если переменных нет — модуль просто молчит, и сайт работает как раньше.
 */

const { vkApi, sendVk, API_VERSION } = require('./vk');
const { askOnce, findContact, notifyOwner } = require('./brief');

/* ── Память диалогов ──────────────────────────────────────────────
   Держим последние сообщения по каждому собеседнику: без истории бот
   на второй фразе забудет, что человеку нужна гостиница, и спросит
   заново. Хранится в оперативной памяти — при перезапуске сайта
   диалоги обнуляются, и это осознанный размен: постоянное хранилище
   ради болтовни не окупается, а бриф с контактом всё равно уже ушёл. */
const dialogs = new Map();
const MAX_HISTORY = 20;
const DIALOG_TTL_MS = 6 * 60 * 60 * 1000;   // 6 часов молчания — разговор закрыт

/* Лимит на человека: 30 сообщений в час. Защищает счёт за модель
   от шутника, который решит поговорить с ботом до утра. */
const LIMIT_PER_HOUR = 30;

function getDialog(peerId) {
  const now = Date.now();
  const rec = dialogs.get(peerId);

  if (!rec || now - rec.updatedAt > DIALOG_TTL_MS) {
    const fresh = { messages: [], count: 0, windowStart: now, updatedAt: now };
    dialogs.set(peerId, fresh);
    return fresh;
  }

  if (now - rec.windowStart > 60 * 60 * 1000) {
    rec.count = 0;
    rec.windowStart = now;
  }

  return rec;
}

/* Раз в час выбрасываем разговоры, в которые никто не вернулся. */
setInterval(() => {
  const now = Date.now();
  for (const [peerId, rec] of dialogs) {
    if (now - rec.updatedAt > DIALOG_TTL_MS) dialogs.delete(peerId);
  }
}, 60 * 60 * 1000).unref();

/* ── Обработка одного входящего сообщения ─────────────────────── */
async function handleMessage(message) {
  const peerId = message.peer_id;
  const text = String(message.text || '').trim();

  if (!peerId || !text) return;

  /* Отрицательный from_id — это сообщение от самого сообщества
     (например, ответ администратора из чата ВК). Отвечать на него
     значит разговаривать с самим собой.

     Пишем это в лог, а не молчим. 12.08.2026 бота проверяли, отправив
     сообщение от имени сообщества: бот, как и задумано, промолчал,
     и со стороны это выглядело как «бот сломался». Строка в логе
     сразу показывает, что сообщение пришло не с той стороны.

     Проверять бота надо со СВОЕЙ личной страницы ВК, а не из чата
     сообщества: только тогда from_id положительный. */
  if (message.from_id < 0) {
    console.log('[vk-bot] Пропустил: сообщение от самого сообщества, а не от клиента. ' +
                'Для проверки напишите боту с личной страницы ВК.');
    return;
  }

  const dialog = getDialog(peerId);

  if (dialog.count >= LIMIT_PER_HOUR) {
    console.warn('[vk-bot] Превышен лимит сообщений, peer:', peerId);
    return;
  }
  dialog.count += 1;

  dialog.messages.push({ role: 'user', content: text.slice(0, 2000) });
  dialog.messages = dialog.messages.slice(-MAX_HISTORY);
  dialog.updatedAt = Date.now();

  /* Контакт появился — бриф владельцу уходит сразу, не дожидаясь ответа
     модели. Если модель откажет, заявка всё равно будет у нас. */
  const contact = findContact(text);
  if (contact) {
    notifyOwner(dialog.messages, contact, 'vk|' + peerId)
      .catch(err => console.error('[vk-bot] Бриф не ушёл:', err.message));
  }

  try {
    const answer = await askOnce(dialog.messages);
    if (!answer) throw new Error('модель вернула пустой ответ');

    dialog.messages.push({ role: 'assistant', content: answer });
    dialog.messages = dialog.messages.slice(-MAX_HISTORY);

    await sendVk(peerId, answer);
    console.log(`[vk-bot] Ответ отправлен, peer: ${peerId}`);
  } catch (err) {
    console.error('[vk-bot] Не удалось ответить:', err.message);
    /* Человек не должен остаться без ответа из-за нашей поломки:
       отдаём живые контакты, чтобы разговор не оборвался в тишину. */
    await sendVk(peerId,
      'Извините, у меня сейчас сбой. Напишите, пожалуйста, в Telegram ' +
      't.me/GranatJarvis_bot или позвоните на +7 999 244 99 99 — ответим быстро.'
    ).catch(() => {});
  }
}

/* ── Long Poll ────────────────────────────────────────────────── */

/**
 * Включает Long Poll и подписку на входящие сообщения через API.
 *
 * ЗАЧЕМ. Те же две настройки есть в интерфейсе сообщества, но раздел
 * «Работа с API» ВК время от времени переносит, и найти его вслепую тяжело.
 * Метод groups.setLongPollSettings делает ровно то же самое одним запросом,
 * поэтому настройку берёт на себя код: при переезде на другое сообщество
 * достаточно поменять токен и номер группы.
 *
 * Требует у ключа доступа право «Управление сообществом». Если права нет,
 * это не смертельно: настройки могли быть уже выставлены руками, поэтому
 * пишем понятное предупреждение и всё равно пробуем подключиться.
 *
 * @returns {Promise<'ok'|'denied'|'error'>} denied — ВК ответил отказом,
 *          повторять бесполезно; error — не дозвонились, есть смысл повторить.
 */
async function ensureLongPollSettings(groupId) {
  try {
    const res = await vkApi('groups.setLongPollSettings', {
      group_id: String(groupId),
      enabled: '1',
      api_version: API_VERSION,
      message_new: '1',
    });

    if (!res.ok) {
      console.warn('[vk-bot] Long Poll не включился автоматически:', res.error);
      console.warn('[vk-bot] Проверьте, что у ключа доступа отмечено ' +
                   '«Управление сообществом», либо включите Long Poll вручную: ' +
                   'Управление → Работа с API → Long Poll API, версия ' + API_VERSION +
                   ', и тип события «Входящее сообщение».');
      return 'denied';
    }

    console.log('[vk-bot] Long Poll включён, подписка на входящие сообщения есть');
    return 'ok';
  } catch (err) {
    console.error('[vk-bot] Не дозвонились до ВК при включении Long Poll:', err.message);
    return 'error';
  }
}

async function connect(groupId) {
  const res = await vkApi('groups.getLongPollServer', { group_id: String(groupId) });
  if (!res.ok) throw new Error(res.error);
  return res.response;         // { key, server, ts }
}

/**
 * Главный цикл. Живёт всё время работы сайта.
 *
 * Внутри всё обёрнуто в try: необработанная ошибка здесь уронила бы
 * весь процесс, а вместе с ботом — и сайт. Сайт важнее бота, поэтому
 * при любой поломке цикл просто ждёт и переподключается.
 */
async function loop(groupId) {
  let conn = null;
  let failures = 0;
  /* Настройки выставляем один раз за запуск. Повторяем только если ВК не
     ответил: на отказ по правам повтор ничего не изменит, а лог засорит. */
  let settingsDone = false;

  while (true) {
    try {
      if (!conn) {
        if (!settingsDone) {
          settingsDone = (await ensureLongPollSettings(groupId)) !== 'error';
        }
        conn = await connect(groupId);
        console.log('[vk-bot] Подключился к сообществу', groupId);
        failures = 0;
      }

      const url = `${conn.server}?act=a_check&key=${conn.key}&ts=${conn.ts}&wait=25`;
      const res = await fetch(url);
      const data = await res.json();

      /* failed:1 — устарел ts, ВК прислал новый.
         failed:2 и 3 — протух ключ или пропала история: нужен новый сервер. */
      if (data.failed) {
        if (data.failed === 1 && data.ts) {
          conn.ts = data.ts;
        } else {
          console.warn('[vk-bot] Переподключение, код:', data.failed);
          conn = null;
        }
        continue;
      }

      conn.ts = data.ts;
      failures = 0;

      for (const update of data.updates || []) {
        if (update.type !== 'message_new') continue;
        /* Структура ответа зависит от версии API: в 5.103+ сообщение лежит
           в object.message, в старых — прямо в object. Поддерживаем обе,
           чтобы смена версии в настройках сообщества ничего не сломала. */
        const message = update.object?.message || update.object;
        await handleMessage(message).catch(err =>
          console.error('[vk-bot] Ошибка обработки сообщения:', err.message));
      }
    } catch (err) {
      failures += 1;
      conn = null;

      /* Пауза растёт с числом неудач, но не больше минуты: если ВК лежит,
         долбить его каждую секунду бессмысленно, а сдаваться насовсем
         нельзя — он вернётся, и бот должен продолжить работу сам. */
      const pause = Math.min(60_000, 2_000 * failures);
      console.error(`[vk-bot] Сбой (${failures}): ${err.message}. Повтор через ${pause / 1000} с`);
      await new Promise(r => setTimeout(r, pause));
    }
  }
}

/**
 * Запускает бота, если он настроен. Вызывается из server.js при старте.
 * Ничего не ждёт и ничего не возвращает: сайт не должен зависеть
 * от того, поднялся бот или нет.
 */
function startVkBot() {
  const groupId = process.env.VK_GROUP_ID;

  if (!process.env.VK_TOKEN || !groupId) {
    console.log('[vk-bot] Не настроен (нет VK_TOKEN или VK_GROUP_ID) — пропускаем');
    return;
  }

  if (!process.env.LLM_API_KEY) {
    console.warn('[vk-bot] Нет LLM_API_KEY — бот не сможет отвечать, запуск отменён');
    return;
  }

  loop(groupId).catch(err => console.error('[vk-bot] Цикл остановлен:', err.message));
}

module.exports = { startVkBot };
