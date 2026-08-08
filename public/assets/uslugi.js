/* Общий скрипт страниц услуг: счётчик, цели, отправка заявки.

   Логика Метрики повторяет главную страницу намеренно — счётчик один и тот же,
   и режим должен совпадать. Обезличенный счёт визитов идёт всегда, а запись
   экрана Вебвизором и карта кликов включаются только при согласии,
   сохранённом на главной в localStorage под ключом cookie-consent. */

(function () {
  'use strict';

  var YM_ID = 110416869;

  function startMetrika() {
    if (!YM_ID || window.__ymStarted) return;
    window.__ymStarted = true;

    var consent = null;
    try { consent = localStorage.getItem('cookie-consent'); } catch (e) {}
    var full = consent === 'yes';

    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');

    ym(YM_ID, 'init', {
      trackLinks: true,
      accurateTrackBounce: true,
      clickmap: full,
      webvisor: full
    });
  }

  startMetrika();

  /* Зонтичная цель lead. Автостратегии Директа и Яндекс Бизнеса учатся на одной
     цели: девять редких целей не дают статистики ни по одной из них. */
  var LEAD_GOALS = ['click_tel', 'click_tg', 'click_vk', 'click_wa', 'click_email', 'lead_sent'];

  function reachGoal(name) {
    if (!YM_ID || typeof window.ym !== 'function') return;
    window.ym(YM_ID, 'reachGoal', name);
    if (LEAD_GOALS.indexOf(name) !== -1) window.ym(YM_ID, 'reachGoal', 'lead');
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-goal]').forEach(function (el) {
      el.addEventListener('click', function () { reachGoal(el.dataset.goal); });
    });

    var form = document.querySelector('[data-lead-form]');
    if (form) initForm(form);
  });

  function initForm(form) {
    var msg = form.querySelector('[data-form-msg]');
    var button = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var name = form.elements.name.value.trim();
      var contact = form.elements.contact.value.trim();
      var comment = form.elements.comment ? form.elements.comment.value.trim() : '';
      var consent = form.elements.consent;

      /* Проверяем до отправки: сообщение о пустом поле должно появиться
         мгновенно, а не после запроса к серверу. */
      if (name.length < 2) return fail('Напишите, как к вам обращаться');
      if (contact.length < 5) return fail('Оставьте телефон, почту или ник — иначе не сможем ответить');
      if (consent && !consent.checked) return fail('Нужно согласие на обработку данных');

      button.disabled = true;
      say('Отправляем…', '');

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          contact: contact,
          service: form.dataset.leadForm || 'Страница услуги',
          comment: comment
        })
      })
        .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
        .then(function (data) {
          if (!data.ok) throw new Error(data.error || 'Не удалось отправить заявку');
          form.reset();
          say('Заявка у нас. Ответим в течение часа в рабочее время.', 'ok');
          reachGoal('lead_sent');
        })
        .catch(function (err) {
          fail(err.message + '. Можно написать напрямую: +7 999 244 9999');
        })
        .finally(function () { button.disabled = false; });
    });

    function say(text, cls) {
      if (!msg) return;
      msg.textContent = text;
      msg.className = 'form-msg' + (cls ? ' ' + cls : '');
    }

    function fail(text) {
      say(text, 'err');
      return false;
    }
  }
})();
