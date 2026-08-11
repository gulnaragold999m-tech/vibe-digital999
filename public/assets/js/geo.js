/**
 * Регион посетителя: подсказка, а не решение за него.
 *
 * ПОРЯДОК ИСТОЧНИКОВ — от точного к предположительному:
 *   1. адрес страницы — ?region=kmv или utm_campaign=kmv_sites;
 *   2. выбор, сделанный на этой же вкладке раньше;
 *   3. определение по IP через /api/geo.
 *
 * Первый источник точный: человек пришёл по ссылке, в которой регион уже
 * написан. Третий — предположение, и обращаться с ним надо соответственно.
 *
 * ЧТО ЭТОТ СКРИПТ ДЕЛАЕТ:
 *   — подставляет город в поле «Ваш город», если оно пустое;
 *   — на главной показывает полоску «похоже, вы из…» с двумя кнопками.
 *
 * ЧЕГО НЕ ДЕЛАЕТ И ПОЧЕМУ:
 *   — не переадресовывает. Автоматический редирект по IP ломает обход
 *     сайта роботом и увозит человека со страницы, которую он открыл
 *     осознанно. Житель Красноярска, приехавший в Пятигорск, не должен
 *     объяснять сайту, что ему нужна общая версия;
 *   — не меняет заголовки и текст страницы. Всё, что видит человек без
 *     скрипта, и всё, что видит робот, — один и тот же HTML;
 *   — не спрашивает второй раз. Отказались — полоска не вернётся до
 *     конца сессии.
 *
 * Определение по IP ошибается: мобильный интернет, VPN, корпоративная
 * сеть. Поэтому подставленный город помечается как автоматический, и в
 * заявке видно, вписал его человек или угадал сервис. Заявка «Краснодар»,
 * которую никто не подтвердил, — это не адрес клиента, а догадка.
 */
(function () {
  'use strict';

  var REGIONS = {
    kmv:         { name: 'Кавминводы',          about: 'Лермонтов, Пятигорск, Ессентуки, Кисловодск', page: '/kmv/' },
    krasnodar:   { name: 'Краснодарский край',  about: 'Краснодар, Сочи, Анапа, Новороссийск',        page: '/krasnodar-krai/' },
    krasnoyarsk: { name: 'Красноярский край',   about: 'работаем полностью удалённо',                 page: '/krasnoyarsk-krai/' },
  };

  /* sessionStorage падает в приватном режиме Safari. Без него скрипт
     работает, просто ничего не запоминает между страницами. */
  function remember(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) {}
  }
  function recall(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }

  /* ── Город в форму ──────────────────────────────────────────────── */

  function fillCity(city, auto) {
    if (!city) return;

    document.querySelectorAll('[name="city"]').forEach(function (input) {
      if (input.value.trim()) return;         // человек уже написал — не трогаем

      input.value = city;
      if (auto) input.dataset.auto = '1';

      /* Говорим прямо, что город определён автоматически. Молча
         подставленное значение человек не перечитывает — и уезжает
         с чужим городом в заявке. */
      if (auto) {
        var hint = input.parentNode.querySelector('[data-city-hint]');
        if (hint) hint.textContent = 'Определили примерно, по вашему интернет-адресу. Не ваш город — исправьте.';
      }
    });
  }

  /* Правка руками снимает пометку «автоматически»: значение стало
     подтверждённым, и в заявку оно уйдёт уже как ответ человека. */
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (!el.name || el.name !== 'city' || !el.dataset.auto) return;

    delete el.dataset.auto;
    var hint = el.parentNode.querySelector('[data-city-hint]');
    if (hint) hint.textContent = 'Поможет быстрее рассчитать стоимость и предложить подходящий формат работы.';
  }, true);

  /* ── Полоска «похоже, вы из…» ───────────────────────────────────── */

  function offerRegion(key) {
    var r = REGIONS[key];
    if (!r) return;
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;
    if (recall('geo-bar') === 'done') return;
    if (document.querySelector('.geo-bar')) return;

    var bar = document.createElement('div');
    bar.className = 'geo-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Версия сайта для вашего региона');

    var text = document.createElement('p');
    text.className = 'geo-bar-text';
    text.textContent = 'Похоже, вы из ' + (key === 'kmv' ? 'Кавминвод' : r.name) +
      '. Показать цены и условия для вашего региона?';

    var actions = document.createElement('div');
    actions.className = 'geo-bar-actions';

    var go = document.createElement('a');
    go.className = 'geo-bar-btn geo-bar-yes';
    go.href = r.page;
    go.textContent = 'Показать';
    go.addEventListener('click', function () {
      remember('geo-bar', 'done');
      remember('geo-region', key);
    });

    var stay = document.createElement('button');
    stay.type = 'button';
    stay.className = 'geo-bar-btn geo-bar-no';
    stay.textContent = 'Остаться';
    stay.addEventListener('click', function () {
      remember('geo-bar', 'done');
      bar.remove();
    });

    actions.appendChild(go);
    actions.appendChild(stay);
    bar.appendChild(text);
    bar.appendChild(actions);
    document.body.appendChild(bar);
  }

  /* ── Что откуда берём ───────────────────────────────────────────── */

  var q = new URLSearchParams(location.search);

  /* 1. Регион прямо в адресе. Так приходят с рекламы и с наших же
        региональных страниц. Спрашивать тут нечего. */
  var fromUrl = (q.get('region') || '').toLowerCase();
  if (!fromUrl) {
    var camp = (q.get('utm_campaign') || '').toLowerCase();
    fromUrl = Object.keys(REGIONS).find(function (k) { return camp.indexOf(k) === 0; }) || '';
  }

  /* 2. Открытая региональная страница — тоже ответ на вопрос «откуда вы». */
  if (!fromUrl) {
    fromUrl = Object.keys(REGIONS).find(function (k) {
      return location.pathname.indexOf(REGIONS[k].page) === 0;
    }) || '';
  }

  if (REGIONS[fromUrl]) {
    remember('geo-region', fromUrl);
    remember('geo-bar', 'done');            // регион известен точно — не переспрашиваем
    return;
  }

  var saved = recall('geo-region');
  if (REGIONS[saved]) return;               // уже определились на этой вкладке

  /* 3. Последняя очередь — определение по IP. Запрос уходит после
        загрузки страницы и ни на что на ней не влияет: не ответил
        сервис или выключено определение — страница просто останется
        такой, какая есть. */
  function detect() {
    fetch('/api/geo', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.ok) return;
        fillCity(data.city, true);
        if (data.key) offerRegion(data.key);
      })
      .catch(function () { /* тишина: подсказка не обязательна */ });
  }

  if (document.readyState === 'complete') detect();
  else window.addEventListener('load', detect);
})();
