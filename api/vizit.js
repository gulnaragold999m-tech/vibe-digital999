/**
 * Что известно про визит: откуда человек пришёл.
 *
 * Отдельным модулем и без зависимостей — чтобы разбор меток можно было
 * проверять на любом компьютере, без ключа модели и без почты.
 * Проверки: npm run test-kontakt.
 */

/* ── Откуда пришёл человек ────────────────────────────────────────
   Тот же разбор меток, что у заявок с формы (api/lead.js, utmFrom),
   но сведённый к четырём словам для отчёта по воронке. Заявка с формы
   несёт источник с 10.08, а разговор в чате не нёс его никогда: фронт
   отправлял только переписку. Из-за этого срез «канал → заявка»
   обрывался ровно на чате — записано в docs/20, раздел 2. ── */
function istochnik(page, ref) {
  const q = String(page || '').split('?')[1];
  const p = new URLSearchParams(q || '');
  const utm = (p.get('utm_source') || '').toLowerCase();

  if ((p.get('utm_referer') || '').toLowerCase().startsWith('geoadv') || p.get('yclid')) {
    return 'yandex_business';
  }
  if (utm === '2gis') return '2gis';
  if (['whatsapp', 'telegram', 'vk'].includes(utm)) return 'stories';
  if (utm) return utm;

  /* Поиск отличается от прямого захода только адресом предыдущей
     страницы — меток у органики нет. Пустой адрес честнее записать
     «не определён», чем выдать за SEO. */
  const otkuda = String(ref || '').toLowerCase();
  if (/yandex\.|google\.|mail\.ru|bing\./.test(otkuda)) return 'seo';
  if (otkuda && !otkuda.includes('vibe-digital999')) return 'ssylka';
  return 'ne_opredelen';
}

module.exports = { istochnik };
