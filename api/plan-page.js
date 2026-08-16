/**
 * Страница плана: что выйдет и когда. Открывается с телефона.
 *
 * ЗАЧЕМ. Посты пишутся и публикуются сами (`redaktor.js` → `autopost.js`),
 * одобрять их владелице не нужно — так решено 16.08.2026. Но «не нужно
 * одобрять» не значит «нельзя посмотреть»: иногда пост попадает в день,
 * когда о таком писать не стоит, и тогда нужен способ его снять. Без
 * Telegram и без правки JSON на диске — с телефона, в браузере.
 *
 * ЧТО МОЖНО. Посмотреть очередь и снять пост с публикации. Снятый пост
 * остаётся в плане с `"approved": false` и слот не освобождает: редакция
 * не должна тут же написать на это время новый. Вернуть обратно — той же
 * кнопкой.
 *
 * ЧЕГО ЗДЕСЬ НЕТ. Правки текста. Соблазн был, но поле ввода на 2500 знаков
 * с телефона — это способ испортить пост, а не починить. Не нравится пост —
 * снимаем, слот пропускаем.
 *
 * ЗАКРЫТО КЛЮЧОМ. Переменная PLAN_KEY на Amvera. Пока её нет, адрес
 * отвечает 404: забыть включить защиту безопаснее, чем забыть выключить.
 * Ключ — любая длинная строка, её видно в адресе, поэтому он не должен
 * совпадать ни с одним рабочим паролем.
 */

const fs = require('fs');

const { PLAN_PATH, STATE_PATH, slotTime, textFor } = require('./autopost');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

/** Ключ верный? Отвечаем 404, а не 403: не подсказываем, что здесь что-то есть. */
function dostup(req, res) {
  const key = process.env.PLAN_KEY;
  if (!key) {
    res.status(404).send('Не настроено');
    return false;
  }
  const dan = req.method === 'POST' ? req.body?.key : req.query?.key;
  if (dan !== key) {
    res.status(404).send('Не найдено');
    return false;
  }
  return true;
}

function escape(text) {
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sostoyanie(post, published, now) {
  const done = published[post.id] || {};
  if (done.vk) return { label: 'вышел', link: done.vk, cvet: '#2f7d32' };
  if (done.skipped) return { label: 'слот проспан', cvet: '#8a6d00' };
  if (post.approved === false) return { label: 'снят', cvet: '#8a1f1f' };
  const when = slotTime(post.when);
  if (!Number.isNaN(when) && when < now) return { label: 'выходит', cvet: '#2f7d32' };
  return { label: 'в очереди', cvet: '#274b8f' };
}

function handlePlanPage(req, res) {
  if (!dostup(req, res)) return;

  const key = process.env.PLAN_KEY;
  const now = Date.now();
  const plan = readJson(PLAN_PATH, { posts: [] });
  const published = readJson(STATE_PATH, {}).published || {};

  const posts = (Array.isArray(plan.posts) ? plan.posts : [])
    .filter((p) => {
      const when = slotTime(p.when);
      /* Прошлое показываем за сутки: увидеть, что вчера вышло, полезно,
         а лента на месяц назад с телефона только мешает. */
      return Number.isNaN(when) || when > now - 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => slotTime(a.when) - slotTime(b.when));

  const kartochki = posts.map((post) => {
    const s = sostoyanie(post, published, now);
    const text = textFor(post).trim();
    const gruppa = post.vk_group === 'granat' ? 'Гранат' : 'агентство';
    const snyat = post.approved === false;
    const vyshel = Boolean((published[post.id] || {}).vk);

    return `<article>
      <header>
        <time>${escape(post.when)}</time>
        <span class="gruppa">${gruppa}</span>
        <span class="sost" style="color:${s.cvet}">${s.label}</span>
      </header>
      <p class="text">${escape(text)}</p>
      ${s.link ? `<p><a href="${escape(s.link)}" target="_blank" rel="noopener">Открыть во ВКонтакте</a></p>` : ''}
      ${vyshel ? '' : `<button data-id="${escape(post.id)}" data-vernut="${snyat ? '1' : ''}">${snyat ? 'Вернуть в план' : 'Снять с публикации'}</button>`}
    </article>`;
  }).join('\n');

  res.set('Cache-Control', 'no-store').send(`<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>План постов</title>
<style>
  body { font: 16px/1.5 -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 16px; background: #f6f6f7; color: #16161a; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .pod { color: #5a5a63; margin: 0 0 20px; font-size: 14px; }
  article { background: #fff; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  header { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; margin-bottom: 8px; }
  time { font-weight: 600; }
  .gruppa { font-size: 13px; color: #5a5a63; }
  .sost { font-size: 13px; margin-left: auto; font-weight: 600; }
  .text { white-space: pre-wrap; margin: 0 0 10px; }
  button { font: inherit; padding: 9px 14px; border: 1px solid #c9c9d1; background: #fff; border-radius: 9px; cursor: pointer; }
  button:active { background: #eee; }
  a { color: #274b8f; }
</style>
</head><body>
<h1>План постов</h1>
<p class="pod">Посты пишутся и выходят сами. Здесь — только посмотреть и снять лишнее. Записей: ${posts.length}.</p>
${kartochki || '<p>План пуст. Редакция допишет его в ближайшие часы.</p>'}
<script>
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  btn.disabled = true;
  const res = await fetch('/api/plan/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: ${JSON.stringify(key)}, id: btn.dataset.id, vernut: Boolean(btn.dataset.vernut) }),
  });
  if (res.ok) location.reload(); else { btn.disabled = false; alert('Не получилось. Обновите страницу.'); }
});
</script>
</body></html>`);
}

/** Снять пост с публикации или вернуть обратно. */
function handlePlanCancel(req, res) {
  if (!dostup(req, res)) return;

  const { id, vernut } = req.body || {};
  const plan = readJson(PLAN_PATH, null);
  if (!plan || !Array.isArray(plan.posts)) return res.status(500).json({ ok: false, error: 'План не читается' });

  const post = plan.posts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ ok: false, error: 'Поста нет в плане' });

  post.approved = Boolean(vernut);

  try {
    const tmp = `${PLAN_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(plan, null, 2));
    fs.renameSync(tmp, PLAN_PATH);
  } catch (err) {
    console.error('[plan] не удалось записать план:', err.message);
    return res.status(500).json({ ok: false, error: 'Не записалось' });
  }

  console.log(`[plan] Пост ${id} ${post.approved ? 'возвращён в план' : 'снят с публикации'}`);
  return res.json({ ok: true, approved: post.approved });
}

module.exports = { handlePlanPage, handlePlanCancel };
