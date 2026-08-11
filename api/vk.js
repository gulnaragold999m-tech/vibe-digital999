/**
 * ВКонтакте: доставка заявок владельцу.
 *
 * ЗАЧЕМ ВТОРОЙ КАНАЛ. 03.08.2026 Telegram перестал принимать сообщения
 * (мёртвый токен), и заявки уходили в пустоту. Один мессенджер — это одна
 * точка отказа: пока она лежит, бизнес не знает, что к нему приходили.
 * ВК живёт на отдельном токене и отдельной инфраструктуре, поэтому
 * одновременный отказ обоих каналов почти невероятен.
 *
 * Заявка считается доставленной, если её принял ХОТЬ ОДИН канал.
 *
 * ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ (Amvera → Настройки → Переменные окружения):
 *   VK_TOKEN   — ключ доступа сообщества с правом «Сообщения сообщества».
 *                Сообщество → Управление → Работа с API → Ключи доступа.
 *   VK_PEER_ID — куда слать заявки. Личный id получателя (число, узнать
 *                у @userinfobot нельзя — это Telegram; в ВК свой id видно
 *                в адресе страницы vk.com/idXXXXXXX).
 *   VK_API_VERSION — необязательно, по умолчанию 5.199.
 *
 * ВАЖНО ПРО ВК: сообщество не может написать человеку первым, пока тот
 * сам не написал сообществу хотя бы раз. Логика ровно как с кнопкой
 * «Старт» в Telegram. Поэтому после настройки надо один раз написать
 * своему же сообществу «привет» — иначе VK ответит ошибкой 901.
 *
 * Ключ живёт только на сервере, в браузер не уходит. Зависимостей нет.
 */

const VK_API = 'https://api.vk.com/method';
const API_VERSION = process.env.VK_API_VERSION || '5.199';

/** Настроен ли канал. Без этого не пытаемся слать — и не пишем в лог панику. */
function vkConfigured() {
  return Boolean(process.env.VK_TOKEN && process.env.VK_PEER_ID);
}

/**
 * Вызов метода VK API.
 *
 * ВК отвечает 200 OK даже на ошибку — причина лежит внутри тела в поле
 * `error`. Проверять по HTTP-коду здесь бесполезно, поэтому разбираем тело.
 *
 * @returns {Promise<{ok: boolean, response?: any, error?: string, code?: number}>}
 */
async function vkApi(method, params) {
  const body = new URLSearchParams({
    ...params,
    access_token: process.env.VK_TOKEN,
    v: API_VERSION,
  });

  const res = await fetch(`${VK_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await res.json();

  if (data.error) {
    /* Расшифровываем частые коды прямо в логе: без этого «ошибка 901»
       ничего не говорит тому, кто откроет логи Amvera через месяц. */
    const code = data.error.error_code;
    const msg = data.error.error_msg || '';
    /* Один код ВК может значить разное — 100 приходит и на кривой peer_id,
       и на выключенный Long Poll. Поэтому подсказка бывает функцией
       от текста ошибки: неверная подсказка хуже, чем никакой. */
    const rule = VK_ERRORS[code];
    const text = typeof rule === 'function' ? rule(msg) : rule;
    const hint = text ? ` — ${text}` : '';
    return { ok: false, code, error: `${code} ${msg}${hint}` };
  }

  return { ok: true, response: data.response };
}

const VK_ERRORS = {
  5: 'ключ доступа недействителен или отозван, получить новый в настройках сообщества',
  15: 'у ключа доступа не хватает прав — пересоздайте ключ и отметьте нужные галочки',
  27: 'ключ выдан не тому сообществу либо отозван',
  901: 'получатель ни разу не писал сообществу — напишите сообществу любое сообщение со своей страницы',
  902: 'настройки приватности получателя запрещают сообществу писать ему',
  912: 'у сообщества выключены «Возможности ботов»: Управление → Сообщения → ' +
       'Настройки для бота → включить и нажать «Сохранить»',
  914: 'сообщение длиннее допустимого',
  100: msg => /longpoll/i.test(msg)
    ? 'Long Poll у сообщества выключен. Бот включает его сам при запуске, ' +
      'но для этого ключу доступа нужно право «Управление сообществом» — ' +
      'проверьте его у ключа или включите Long Poll вручную'
    : 'неверный параметр запроса (чаще всего peer_id)',
};

/**
 * random_id обязателен: ВК по нему отбрасывает дубли, если сеть моргнула
 * и запрос ушёл дважды. Должен помещаться в int32 — отсюда остаток.
 */
function randomId() {
  return (Date.now() % 1e9) * 10 + Math.floor(Math.random() * 10);
}

/**
 * Отправляет сообщение владельцу (на VK_PEER_ID).
 *
 * Разметки в ВК нет — ни жирного, ни курсива. Текст приходит как есть,
 * поэтому структуру держим переносами строк и эмодзи, а HTML-теги
 * сюда передавать нельзя: они отобразятся буквально.
 *
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function sendVkToOwner(text) {
  if (!vkConfigured()) return { ok: false, error: 'ВК не настроен' };
  return sendVk(process.env.VK_PEER_ID, text);
}

/** Отправка в произвольный диалог — нужна боту, чтобы отвечать посетителям. */
async function sendVk(peerId, text) {
  if (!process.env.VK_TOKEN) return { ok: false, error: 'VK_TOKEN не задан' };

  try {
    const result = await vkApi('messages.send', {
      peer_id: String(peerId),
      random_id: String(randomId()),
      /* 4096 — предел ВК на длину сообщения. Режем сами: обрезанный бриф
         полезнее, чем ошибка 914 и полностью потерянная заявка. */
      message: String(text).slice(0, 4000),
    });

    if (!result.ok) {
      console.error('[vk] Отказ:', result.error, '| peer_id:', peerId);
      return { ok: false, error: result.error };
    }

    return { ok: true };
  } catch (err) {
    console.error('[vk] Сбой при отправке:', err.name, err.message);
    if (err.cause) console.error('[vk] Причина:', err.cause.code || err.cause.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { vkApi, vkConfigured, sendVk, sendVkToOwner, API_VERSION };
