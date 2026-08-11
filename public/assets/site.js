/* ═══════════════════════════════════════════════════════════════
   СКРИПТ ВНУТРЕННИХ СТРАНИЦ

   Делает ровно три вещи: считает визиты, спрашивает про cookie и
   отправляет заявку. Всё остальное на посадочных страницах не нужно —
   человек пришёл из поиска с готовым вопросом, ему нужен ответ и форма.

   Правила проверки контакта и тексты ошибок повторяют главную
   намеренно: заявка уходит в один и тот же обработчик /api/lead,
   и «телефон подошёл здесь, но не подошёл там» было бы враньём.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var YM_ID = 110416869;

  /* ── Метрика ──────────────────────────────────────────────────
     Счёт визитов идёт всегда: это обезличенная статистика, ради
     которой счётчик и ставят. Запись экрана Вебвизором и карта
     кликов — только по согласию: они снимают поведение конкретного
     человека, а на это нужно разрешение. */
  function startMetrika() {
    if (!YM_ID || window.__ymStarted) return;
    window.__ymStarted = true;

    var consent = null;
    try { consent = localStorage.getItem('cookie-consent'); } catch (e) {}
    var full = consent === 'yes';

    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      for (var j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === r) return;
      }
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');

    window.ym(YM_ID, 'init', {
      trackLinks: true,
      accurateTrackBounce: true,
      clickmap: full,
      webvisor: full
    });
  }
  startMetrika();

  /* Любое обращение — ещё и зонтичная цель lead. Автостратегии Директа
     учатся на ОДНОЙ цели: девять редких не наберут статистики ни одна. */
  var LEAD_GOALS = ['click_tel', 'click_tg', 'click_vk', 'click_wa', 'click_email', 'lead_sent'];

  function reachGoal(name) {
    if (YM_ID && typeof window.ym === 'function') {
      window.ym(YM_ID, 'reachGoal', name);
      if (LEAD_GOALS.indexOf(name) !== -1) window.ym(YM_ID, 'reachGoal', 'lead');
    }
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-goal]');
    if (el) reachGoal(el.getAttribute('data-goal'));
  });

  /* ── Плашка cookie ────────────────────────────────────────────── */
  (function () {
    var bar = document.getElementById('ck');
    if (!bar) return;

    var saved = null;
    try { saved = localStorage.getItem('cookie-consent'); } catch (e) {}
    if (saved) return;                       /* уже ответил — не спрашиваем снова */

    bar.hidden = false;

    function answer(value) {
      try { localStorage.setItem('cookie-consent', value); } catch (e) {}
      bar.hidden = true;
      /* Согласились — перезапускаем счётчик уже с записью экрана.
         Флаг сбрасываем, иначе startMetrika выйдет на первой строке. */
      if (value === 'yes') { window.__ymStarted = false; startMetrika(); }
    }

    document.getElementById('ck-yes').addEventListener('click', function () { answer('yes'); });
    document.getElementById('ck-no').addEventListener('click', function () { answer('no'); });
  })();

  /* ── Форма заявки ─────────────────────────────────────────────── */
  var RE_PHONE = /^(?:\+7|8|7)[\s(-]?\d{3}[\s)-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;
  var RE_NICK  = /^@?[a-zA-Z0-9_]{4,32}$/;
  var RE_MAIL  = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

  function contactLooksReal(value) {
    var v = value.replace(/\s+/g, ' ').trim();
    return RE_PHONE.test(v.replace(/\s/g, '')) || RE_NICK.test(v) || RE_MAIL.test(v);
  }

  function fail(errEl, field, text) {
    if (field) {
      field.classList.add('invalid');
      field.setAttribute('aria-invalid', 'true');
      field.focus({ preventScroll: false });
    }
    errEl.textContent = text;
    errEl.hidden = false;
    return false;
  }

  /* Начал исправлять — пометка уходит. Держать красным поле, которое
     человек уже правит, значит ругаться на него дважды за одну ошибку. */
  document.addEventListener('input', function (e) {
    if (e.target.classList && e.target.classList.contains('invalid')) {
      e.target.classList.remove('invalid');
      e.target.removeAttribute('aria-invalid');
    }
  }, true);
  document.addEventListener('change', function (e) {
    if (e.target.type === 'checkbox' && e.target.classList.contains('invalid')) {
      e.target.classList.remove('invalid');
      e.target.removeAttribute('aria-invalid');
    }
  }, true);

  var form = document.getElementById('lead-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var errEl    = document.getElementById('lead-error');
    var nameEl   = document.getElementById('lf-name');
    var contact  = document.getElementById('lf-contact');
    var comment  = document.getElementById('lf-comment');
    var consent  = document.getElementById('lf-consent');
    var policy   = document.getElementById('lf-policy');
    var service  = document.getElementById('lf-service');

    errEl.hidden = true;
    Array.prototype.forEach.call(form.querySelectorAll('.invalid'), function (el) {
      el.classList.remove('invalid');
      el.removeAttribute('aria-invalid');
    });

    if (nameEl.value.trim().length < 2) {
      return fail(errEl, nameEl, 'Напишите, как к вам обращаться.');
    }
    if (!contact.value.trim()) {
      return fail(errEl, contact, 'Оставьте телефон или ник в Telegram — иначе мы не сможем ответить.');
    }
    if (!contactLooksReal(contact.value)) {
      return fail(errEl, contact, 'Проверьте контакт: нужен телефон, @ник в Telegram или почта.');
    }
    /* Про каждую галочку говорим своими словами. «Поставьте все галочки»
       читается как придирка, «нужно согласие на обработку данных» —
       как понятное требование. */
    if (!consent.checked) {
      return fail(errEl, consent, 'Без согласия на обработку персональных данных мы не имеем права принять заявку.');
    }
    if (!policy.checked) {
      return fail(errEl, policy, 'Отметьте, что ознакомились с политикой конфиденциальности.');
    }

    send({
      name: nameEl.value.trim(),
      contact: contact.value.trim(),
      service: service ? service.value : 'Не указана',
      comment: comment ? comment.value.trim() : ''
    }, errEl);
  });

  function send(payload, errEl) {
    var btn = form.querySelector('.submit');
    btn.disabled = true;

    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().catch(function () { return {}; })
        .then(function (data) {
          if (!res.ok || !data.ok) throw new Error(data.error || 'Ошибка сервера');
        }); })
      .then(function () {
        form.style.display = 'none';
        document.getElementById('lead-done').classList.add('visible');
        reachGoal('lead_sent');
      })
      .catch(function () {
        /* Заявку человек уже написал — не хватало ещё системного окна,
           которое закроет её собой и не подскажет запасной путь. */
        errEl.textContent = 'Не удалось отправить заявку. Напишите в WhatsApp или Telegram — кнопки в правом нижнем углу.';
        errEl.hidden = false;
      })
      .then(function () { btn.disabled = false; });
  }
})();
