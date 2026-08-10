/**
 * Определение региона посетителя по IP — мягкая подсказка, не переадресация.
 *
 * ЗАЧЕМ. Реклама идёт на три очень разных региона, но в Яндекс Бизнесе метку
 * в ссылку не поставишь: там автоматическая реклама от карточки организации.
 * Значит человек приходит на общую главную, и единственные способы узнать
 * его регион — спросить или определить по адресу.
 *
 * ЧТО ЭТОТ ФАЙЛ ДЕЛАЕТ И ЧЕГО НЕ ДЕЛАЕТ.
 *   делает:    возвращает браузеру предполагаемые город и регион;
 *   не делает:  никуда не переадресовывает и ничего не подменяет в HTML.
 *
 * Второе важнее первого. IP-определение врёт: на мобильном интернете адрес
 * принадлежит опорной сети оператора и может указывать на соседний край,
 * через VPN — на другую страну, в корпоративной сети — на головной офис.
 * Точность у любого сервиса — порядка города, и та не гарантирована.
 * Поэтому решение всегда остаётся за человеком: сайт показывает полоску
 * «похоже, вы из Краснодарского края» с двумя кнопками, и пока кнопку не
 * нажали, страница остаётся прежней.
 *
 * ПОЧЕМУ ЭТО НА СЕРВЕРЕ, А НЕ В БРАУЗЕРЕ. Если запрашивать геосервис прямо
 * из браузера, IP посетителя уходит туда напрямую, а какой это сервис и в
 * какой стране — мы не контролируем. Здесь запрос делает наш сервер, к
 * российскому оператору данных, и в браузер уходит только название города.
 *
 * ПОЧЕМУ DADATA. Российский сервис, данные не уезжают за границу — при
 * работе с персональными данными по 152-ФЗ это принципиально. Бесплатного
 * тарифа (10 000 запросов в сутки) для сайта такого размера хватает
 * с запасом.
 *
 * КАК ВКЛЮЧИТЬ. Переменная окружения DADATA_TOKEN в Amvera. Без неё
 * определение просто выключено: адрес отвечает «не знаю», полоска не
 * появляется, выбор региона руками работает как работал. Ничего
 * не ломается — просто нет подсказки.
 */

const ENDPOINT = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/iplocate/address';
const TIMEOUT_MS = 2500;

/* Кэш ответов. Один посетитель за сессию открывает несколько страниц, и
   спрашивать сервис на каждой — платить за один и тот же ответ. Сутки
   держать смысла нет: у мобильных операторов адрес меняется чаще. */
const CACHE_TTL = 6 * 60 * 60 * 1000;
const CACHE_MAX = 5000;
const cache = new Map();

function cacheGet(ip) {
  const hit = cache.get(ip);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL) {
    cache.delete(ip);
    return null;
  }
  return hit.value;
}

function cacheSet(ip, value) {
  /* Простое ограничение размера: дошли до потолка — выбрасываем самую
     старую запись. Map хранит порядок вставки, поэтому первая же —
     она и есть. */
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(ip, { at: Date.now(), value });
}

const unwrap = (ip) => String(ip || '').trim().replace(/^::ffff:/, '');  // IPv4 в IPv6-обёртке

/* Адрес посетителя за обратным прокси.
 *
 * Первая версия брала X-Forwarded-For и из него первую запись — так учат
 * все руководства. На Amvera это дало «локальный адрес» каждому живому
 * человеку: то ли заголовок называется иначе, то ли первым в цепочке
 * стоит внутренний адрес самого прокси.
 *
 * Поэтому здесь не один заголовок, а перебор. Берём все известные места,
 * где может лежать адрес, и возвращаем ПЕРВЫЙ НЕ ВНУТРЕННИЙ. Порядок
 * значения не имеет: внутренние адреса всё равно отсеиваются, а внешний
 * в цепочке ровно один — тот, с которого пришёл человек.
 */
function clientIp(req) {
  const candidates = [];

  /* X-Forwarded-For — цепочка «клиент, прокси1, прокси2». Разбираем целиком:
     первым может оказаться внутренний адрес, и тогда нужен следующий. */
  String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .forEach((part) => candidates.push(unwrap(part)));

  /* X-Real-IP ставит nginx, на котором построено большинство ingress'ов.
     CF-Connecting-IP — на случай, если перед сайтом окажется Cloudflare. */
  candidates.push(unwrap(req.headers['x-real-ip']));
  candidates.push(unwrap(req.headers['cf-connecting-ip']));

  /* req.ip — последним. С app.set('trust proxy', true) он уже разбирает
     X-Forwarded-For сам, но если заголовков нет вовсе, здесь окажется
     адрес прокси, то есть внутренний. */
  candidates.push(unwrap(req.ip));

  return candidates.find((ip) => ip && !isPrivate(ip)) || '';
}

/* Один раз пишем в журнал, какие заголовки с адресом вообще пришли.
 *
 * Без этого «локальный адрес» неотличим от «сервис недоступен»: и то,
 * и другое выглядит как отсутствие подсказки, и чинить приходится вслепую.
 * Пишем только ИМЕНА заголовков и число записей в цепочке — сами адреса
 * это персональные данные, им в журнале не место. */
let diagnosed = false;
function diagnoseOnce(req) {
  if (diagnosed) return;
  diagnosed = true;

  const seen = ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip', 'forwarded']
    .filter((h) => req.headers[h]);
  const chain = String(req.headers['x-forwarded-for'] || '').split(',').filter(Boolean).length;

  console.warn(
    '[geo] Не удалось определить внешний адрес посетителя.\n' +
    `      Заголовки с адресом: ${seen.length ? seen.join(', ') : 'ни одного'}\n` +
    `      Записей в X-Forwarded-For: ${chain}\n` +
    '      Если заголовков нет вовсе — прокси их не проставляет, и определение\n' +
    '      по IP на этом хостинге работать не будет. Подсказка региона просто\n' +
    '      не появится, остальной сайт это не затрагивает.'
  );
}

/* Локальные и служебные адреса спрашивать бесполезно: на них геосервис
   ответит пустотой, а запрос из суточной квоты вычтется. Это же и есть
   поведение при разработке — на localhost подсказки не будет. */
function isPrivate(ip) {
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === '::1') return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true;
  if (/^(fc|fd)/i.test(ip)) return true;
  return false;
}

/* Города Кавминвод. Регион у них общий — Ставропольский край, — но работаем
   мы не по всему краю: до Ставрополя от Лермонтова четыре часа, и обещать
   там встречу в офисе нельзя. Поэтому КМВ определяем по городу, а не
   по региону. */
const KMV = [
  'лермонтов', 'пятигорск', 'ессентуки', 'кисловодск',
  'минеральные воды', 'железноводск', 'георгиевск',
];

/**
 * Город и регион → ключ раздела сайта. Ключи те же, что в адресе
 * ?region=... и в скрипте подмены первого экрана на главной.
 */
function regionKey(city, region) {
  const c = String(city || '').toLowerCase().trim();
  const r = String(region || '').toLowerCase();

  if (KMV.includes(c)) return 'kmv';
  if (r.includes('краснодар') || c === 'сочи') return 'krasnodar';
  if (r.includes('краснояр')) return 'krasnoyarsk';
  return null;
}

async function handleGeo(req, res) {
  /* Ответ зависит от адреса посетителя — кэшировать его нельзя ни браузеру,
     ни прокси: иначе один человек получит подсказку, рассчитанную на другого. */
  res.setHeader('Cache-Control', 'no-store, private');

  const token = (process.env.DADATA_TOKEN || '').trim();
  if (!token) return res.json({ ok: false, reason: 'off' });

  const ip = clientIp(req);
  if (!ip) {
    diagnoseOnce(req);
    return res.json({ ok: false, reason: 'local' });
  }

  const cached = cacheGet(ip);
  if (cached) return res.json(cached);

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    const upstream = await fetch(`${ENDPOINT}?ip=${encodeURIComponent(ip)}`, {
      headers: { Accept: 'application/json', Authorization: `Token ${token}` },
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));

    if (!upstream.ok) return res.json({ ok: false, reason: 'upstream' });

    const json = await upstream.json();
    const data = json?.location?.data || {};

    const city = data.city || data.settlement || '';
    const region = data.region_with_type || data.region || '';
    const value = { ok: true, city, region, key: regionKey(city, region) };

    cacheSet(ip, value);
    return res.json(value);
  } catch (err) {
    /* Сервис не ответил или ответил слишком долго — это не ошибка сайта.
       Подсказки просто не будет, выбор региона руками никуда не делся.
       В журнал пишем причину без адреса: адрес — персональные данные. */
    console.warn('Геоопределение недоступно:', err.name === 'AbortError' ? 'таймаут' : err.message);
    return res.json({ ok: false, reason: 'error' });
  }
}

module.exports = { handleGeo, regionKey };
