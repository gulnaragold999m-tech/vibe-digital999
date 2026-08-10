/* ═══════════════════════════════════════════════════════════════
   site.js — общий скрипт внутренних страниц

   Что здесь есть: счётчик Метрики, цели, меню на телефоне, проверка
   и отправка формы заявки.

   Чего здесь нет и не будет: частиц, квиза, чата, калькуляторов.
   Всё это живёт на главной и там же останется. Внутренняя страница
   отвечает на один вопрос и ведёт к одной кнопке — лишний скрипт
   здесь только замедляет ответ.

   Логика повторяет главную намеренно, вплоть до текстов ошибок:
   человек, перешедший с главной на страницу услуги, не должен
   почувствовать, что попал на другой сайт.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════
     ЯНДЕКС.МЕТРИКА — счётчик 110416869

     Поставить YM_ID = 0 — счётчик замолчит, сайт продолжит работать.
  ═══════════════════════════════════════════ */
  var YM_ID = 110416869;

  /* Счёт посещений идёт всегда: это обезличенная статистика, ради которой
     счётчик и ставят. Запись экрана Вебвизором и карта кликов — то, что
     снимает поведение конкретного человека, — включаются только после
     «Принять» в плашке о куках. Плашка живёт на главной; выбор хранится
     в localStorage и действует на всех страницах сразу. */
  function startMetrika() {
    if (!YM_ID || window.__ymStarted) return;
    window.__ymStarted = true;

    /* localStorage падает в приватном режиме Safari — тогда считаем,
       что согласия нет, и остаёмся на щадящем режиме. */
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

    ym(YM_ID, 'init', {
      trackLinks: true,
      accurateTrackBounce: true,
      clickmap: full,
      webvisor: full
    });
  }

  startMetrika();

  /* Любое обращение — это ещё и зонтичная цель lead. Автостратегии Директа
     учатся на ОДНОЙ цели: если кормить их девятью редкими, статистики не
     наберётся ни по одной. Поэтому каждый контакт засчитывается дважды —
     своей узкой целью для отчётов и целью lead для обучения. */
  var LEAD_GOALS = ['click_tel', 'click_tg', 'click_vk', 'click_wa', 'click_email', 'lead_sent'];

  function reachGoal(name) {
    if (!name || !YM_ID || typeof window.ym !== 'function') return;
    window.ym(YM_ID, 'reachGoal', name);
    if (LEAD_GOALS.indexOf(name) !== -1) window.ym(YM_ID, 'reachGoal', 'lead');
  }

  /* Делегирование на document, а не подписка на каждую ссылку: обработчик
     не зависит от порядка загрузки и переживает перерисовку разметки. */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-goal]') : null;
    if (el) reachGoal(el.dataset.goal);
  });

  /* ═══════════════════════════════════════════
     МЕНЮ НА ТЕЛЕФОНЕ

     На одностраничнике меню на узком экране просто прятали: все разделы
     были на той же странице, до них доезжали прокруткой. Теперь разделы —
     отдельные страницы, и без меню с телефона до них не добраться.
  ═══════════════════════════════════════════ */
  var burger = document.querySelector('.nav-burger');
  var links = document.getElementById('nav-links');

  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      links.classList.toggle('open', !open);
    });

    /* Esc закрывает меню и возвращает фокус на кнопку — иначе фокус
       остаётся внутри спрятанного списка и «проваливается». */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (burger.getAttribute('aria-expanded') !== 'true') return;
      burger.setAttribute('aria-expanded', 'false');
      links.classList.remove('open');
      burger.focus();
    });

    /* Клик мимо меню закрывает его. Без этого открытое меню перекрывает
       начало страницы, и человек не понимает, куда делся текст. */
    document.addEventListener('click', function (e) {
      if (burger.getAttribute('aria-expanded') !== 'true') return;
      if (e.target.closest('.nav-burger') || e.target.closest('#nav-links')) return;
      burger.setAttribute('aria-expanded', 'false');
      links.classList.remove('open');
    });
  }

  /* ═══════════════════════════════════════════
     ПЛАШКА О КУКАХ

     Раньше жила только на главной: другого входа на сайт не было. Теперь
     человек приходит из поиска сразу на страницу услуги, и уведомление
     должно быть здесь же. Ответ хранится в localStorage и общий для всех
     страниц — спрашиваем один раз за посетителя, а не на каждой странице.

     Счётчик к этому моменту уже работает в щадящем режиме, поэтому здесь
     не «включаем Метрику», а запоминаем выбор. Вебвизор и карта кликов
     подхватят его при следующей загрузке страницы: переинициализировать
     уже запущенный счётчик Метрика не даёт.
  ═══════════════════════════════════════════ */
  (function cookieBar() {
    var bar = document.getElementById('cookie-bar');
    if (!bar) return;

    var answered = null;
    try { answered = localStorage.getItem('cookie-consent'); } catch (e) {}
    if (answered) return;

    /* Показываем не сразу: полсекунды человек смотрит на страницу,
       а не на плашку. Так меньше отказов и меньше раздражения. */
    setTimeout(function () { bar.hidden = false; }, 700);

    var decide = function (answer) {
      try { localStorage.setItem('cookie-consent', answer); } catch (e) {}
      bar.hidden = true;
    };

    bar.addEventListener('click', function (e) {
      if (e.target.closest('#cookie-yes')) { e.preventDefault(); decide('yes'); }
      else if (e.target.closest('#cookie-no')) { e.preventDefault(); decide('no'); }
    });
  })();

  /* ═══════════════════════════════════════════
     ФОРМА ЗАЯВКИ
  ═══════════════════════════════════════════ */

  /* Контакт принимаем в любом привычном виде: телефон с +7 или 8,
     ник в Telegram через @ или почту. Всё остальное — почти наверняка
     опечатка, и лучше сказать об этом до отправки, чем потерять заявку. */
  var RE_PHONE = /^(?:\+7|8|7)[\s(-]?\d{3}[\s)-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;
  var RE_NICK = /^@?[a-zA-Z0-9_]{4,32}$/;
  var RE_MAIL = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

  function contactLooksReal(value) {
    var v = value.replace(/\s+/g, ' ').trim();
    return RE_PHONE.test(v.replace(/\s/g, '')) || RE_NICK.test(v) || RE_MAIL.test(v);
  }

  /** Показать ошибку и увести фокус в проблемное поле. */
  function showError(errEl, field, text) {
    if (field) {
      field.classList.add('invalid');
      field.setAttribute('aria-invalid', 'true');
      field.focus({ preventScroll: false });
    }
    if (errEl) {
      errEl.textContent = text;
      errEl.hidden = false;
    }
    return false;
  }

  function clearErrors(formEl, errEl) {
    formEl.querySelectorAll('.invalid').forEach(function (el) {
      el.classList.remove('invalid');
      el.removeAttribute('aria-invalid');
    });
    if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
  }

  /* Начал исправлять — пометка уходит. Держать красным поле, которое
     человек уже правит, значит ругаться на него дважды за одну ошибку. */
  function forgiveOnEdit(e) {
    var t = e.target;
    if (t.classList && t.classList.contains('invalid')) {
      t.classList.remove('invalid');
      t.removeAttribute('aria-invalid');
    }
  }
  document.addEventListener('input', forgiveOnEdit, true);
  document.addEventListener('change', forgiveOnEdit, true);

  document.querySelectorAll('form[data-lead-form]').forEach(function (formEl) {
    var errEl = formEl.querySelector('.form-error');
    var successEl = formEl.parentNode.querySelector('.form-success');
    var nameEl = formEl.querySelector('[name="name"]');
    var contactEl = formEl.querySelector('[name="contact"]');
    var commentEl = formEl.querySelector('[name="comment"]');
    var serviceEl = formEl.querySelector('[name="service"]');
    var consentEl = formEl.querySelector('[data-consent]');
    var policyEl = formEl.querySelector('[data-policy]');

    formEl.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearErrors(formEl, errEl);

      if (nameEl.value.trim().length < 2) {
        return showError(errEl, nameEl, 'Напишите, как к вам обращаться.');
      }
      if (!contactEl.value.trim()) {
        return showError(errEl, contactEl, 'Оставьте телефон или ник в Telegram — иначе мы не сможем ответить.');
      }
      if (!contactLooksReal(contactEl.value)) {
        return showError(errEl, contactEl, 'Проверьте контакт: нужен телефон, @ник в Telegram или почта.');
      }
      /* Галочки проверяем по отдельности и говорим про каждую своими
         словами. «Поставьте все галочки» человек читает как придирку,
         «нужно согласие на обработку данных» — как понятное требование. */
      if (consentEl && !consentEl.checked) {
        return showError(errEl, consentEl, 'Без согласия на обработку персональных данных мы не имеем права принять заявку.');
      }
      if (policyEl && !policyEl.checked) {
        return showError(errEl, policyEl, 'Отметьте, что ознакомились с политикой конфиденциальности.');
      }

      var btn = formEl.querySelector('.btn-submit');
      btn.disabled = true;
      btn.classList.add('loading');

      try {
        /* Заявка уходит на наш сервер, а он уже отправляет её в Telegram
           и ВКонтакте. Токен бота живёт только на сервере и в браузер
           никогда не попадает. */
        var res = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameEl.value.trim(),
            contact: contactEl.value.trim(),
            service: serviceEl ? serviceEl.value : 'Не указана',
            comment: commentEl ? commentEl.value.trim() : '',
            /* Адрес страницы вместе с метками из рекламы: по нему потом
               видно, какая страница и какое объявление привели человека. */
            page: location.pathname + location.search
          })
        });

        var data = await res.json().catch(function () { return {}; });
        if (!res.ok || !data.ok) throw new Error(data.error || 'Ошибка сервера');

        formEl.style.display = 'none';
        if (successEl) successEl.classList.add('visible');
        reachGoal('lead_sent');
      } catch (err) {
        /* Сбой сети или сервера показываем там же, где ошибки полей.
           Заявку человек уже написал — не хватало ещё системного окна,
           которое закроет её собой и не подскажет запасной путь. */
        showError(errEl, null, 'Не удалось отправить заявку. Позвоните по +7 999 244 99 99 или напишите в WhatsApp — ссылка в подвале страницы.');
      } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
      }
    });
  });

  /* Кнопки «Обсудить задачу» на карточках: подставляют услугу в форму
     и прокручивают к ней. Отдельного окна на внутренних страницах нет —
     форма и так стоит внизу, на расстоянии одного экрана. */
  document.querySelectorAll('[data-service]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var form = document.querySelector('form[data-lead-form]');
      if (!form) return;
      var serviceEl = form.querySelector('[name="service"]');
      if (serviceEl) serviceEl.value = btn.dataset.service;
      reachGoal('click_order');
      var box = document.getElementById('order-section');
      if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var nameEl = form.querySelector('[name="name"]');
      if (nameEl) setTimeout(function () { nameEl.focus({ preventScroll: true }); }, 600);
    });
  });
})();
