/**
 * Ленивая карта Яндекса.
 *
 * ЗАЧЕМ НЕ ГОТОВЫЙ ВИДЖЕТ. Виджет из конструктора тянет сотни килобайт
 * чужого кода и грузится вместе со страницей — даже если карту никто так
 * и не откроет. На мобильном интернете это видно глазом, а до карты
 * в контактах долистывает меньшинство. Здесь всё наоборот: пока человек
 * не дошёл до блока, не загружается ничего.
 *
 * ТРИ СОСТОЯНИЯ, И ПЕРВОЕ РАБОТАЕТ ВСЕГДА:
 *
 *   1. Ключа нет. На странице остаётся адрес и ссылка на карточку
 *      в Яндекс Картах. Ничего не мигает, ничего не сломано — просто
 *      блок без карты. Так сайт выглядит прямо сейчас.
 *   2. Ключ есть, до блока не долистали. Показана лёгкая картинка
 *      от Static API — одна, статичная, без единой строчки чужого кода.
 *   3. Долистали или навели мышь. Картинка плавно сменяется настоящей
 *      картой: её можно двигать и приближать.
 *
 * ПОЧЕМУ КАРТА НЕ ВЫГЛЯДИТ ЧУЖОЙ. Стандартная карта Яндекса — светлое
 * пятно посреди тёмного сайта, и читается как реклама, вставленная
 * в чужую страницу. Поэтому здесь два приёма:
 *   — схема карты перекрашивается под палитру сайта (JS API 3.0 умеет
 *     это штатно, через customization);
 *   — метка не стандартная синяя капля, а обычный DOM-элемент, который
 *     верстается как весь остальной сайт — CSS, свои цвета, свой шрифт.
 *
 * КЛЮЧИ. Публичные: они видны в коде страницы, и это нормально —
 * Яндекс защищает их ограничением по домену в Кабинете разработчика.
 * Настроить ограничение обязательно, иначе ключом попользуется кто угодно.
 * Ключи задаются в src/pages.js, поле MAPS, и подставляются сборкой.
 */
(function () {
  'use strict';

  var CFG = window.__YMAP || {};

  /* ── Палитра карты под сайт ──────────────────────────────────────
     Перекрашиваем только фон, воду, дороги и подписи: этого хватает,
     чтобы карта перестала быть светлым пятном. Полностью переопределять
     схему не нужно — карта должна остаться узнаваемой картой, иначе
     человек перестанет понимать, что на ней изображено. */
  var THEME = [
    { tags: 'water',                     elements: 'geometry', stylers: [{ color: '#071427' }] },
    { tags: 'landscape',                 elements: 'geometry', stylers: [{ color: '#050e1e' }] },
    { tags: { any: ['road', 'structure'] }, elements: 'geometry', stylers: [{ color: '#12233d' }] },
    { tags: 'building',                  elements: 'geometry', stylers: [{ color: '#0d1a2e' }] },
    { tags: { any: ['park', 'medical', 'sport'] }, elements: 'geometry', stylers: [{ color: '#08182b' }] },
    { elements: 'label.text.fill',       stylers: [{ color: '#8ea3c4' }] },
    { elements: 'label.text.outline',    stylers: [{ color: '#04060f' }] },
  ];

  /**
   * Картинка карты от Static API — то, что человек видит до того,
   * как до блока долистают. Одна картинка вместо целой библиотеки.
   */
  function staticUrl(box, width, height) {
    var params = new URLSearchParams({
      apikey: CFG.staticKey,
      ll: box.dataset.lon + ',' + box.dataset.lat,
      z: box.dataset.zoom || '16',
      /* Static API берёт размер в пикселях и умеет удвоенную плотность —
         на телефонах с retina без неё картинка выглядит мыльной. */
      size: Math.min(650, Math.round(width)) + ',' + Math.min(450, Math.round(height)),
      scale: window.devicePixelRatio > 1 ? '2' : '1',
      theme: 'dark',
      pt: box.dataset.lon + ',' + box.dataset.lat + ',pm2dgl',
    });
    return 'https://static-maps.yandex.ru/v1?' + params.toString();
  }

  /* Подключаем JS API один раз на всю страницу, даже если карт несколько. */
  var apiPromise = null;
  function loadApi() {
    if (apiPromise) return apiPromise;

    apiPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://api-maps.yandex.ru/v3/?apikey=' +
        encodeURIComponent(CFG.jsKey) + '&lang=ru_RU';
      s.async = true;
      s.onload = function () {
        /* ymaps3.ready — обещание, что модули API разобраны и доступны.
           Без него первое же обращение к ymaps3.YMap падает. */
        window.ymaps3.ready.then(resolve, reject);
      };
      s.onerror = function () { reject(new Error('Яндекс Карты не загрузились')); };
      document.head.appendChild(s);
    });

    return apiPromise;
  }

  /** Метка — обычный элемент страницы, а не картинка Яндекса. */
  function markerElement(title) {
    var el = document.createElement('div');
    el.className = 'ymap-pin';
    el.innerHTML = '<span class="ymap-pin-dot" aria-hidden="true"></span>' +
      '<span class="ymap-pin-label"></span>';
    el.querySelector('.ymap-pin-label').textContent = title || '';
    return el;
  }

  async function activate(box) {
    if (box.dataset.state === 'live') return;
    box.dataset.state = 'live';

    var center = [Number(box.dataset.lon), Number(box.dataset.lat)];
    var zoom = Number(box.dataset.zoom || 16);

    try {
      await loadApi();

      var y = window.ymaps3;
      var canvas = document.createElement('div');
      canvas.className = 'ymap-canvas';
      box.appendChild(canvas);

      var map = new y.YMap(canvas, { location: { center: center, zoom: zoom } });

      map.addChild(new y.YMapDefaultSchemeLayer({ customization: THEME }));
      map.addChild(new y.YMapDefaultFeaturesLayer());
      map.addChild(new y.YMapMarker(
        { coordinates: center },
        markerElement(box.dataset.title),
      ));

      /* Показываем карту только когда она отрисована: иначе на секунду
         виден пустой прямоугольник вместо картинки, и это выглядит
         как поломка, а не как загрузка. */
      requestAnimationFrame(function () { box.classList.add('is-live'); });
    } catch (err) {
      /* Не загрузилось — оставляем картинку и ссылку. Человек всё равно
         видит, где мы находимся, и может открыть Карты одним нажатием. */
      box.dataset.state = 'failed';
      console.warn('[ymap] Карта не загрузилась:', err.message);
    }
  }

  function setup(box) {
    if (!box.dataset.lat || !box.dataset.lon) return;

    /* Ключа для картинки нет — статичную подложку не рисуем, но карту
       по нажатию всё равно можно открыть, если есть ключ JS API. */
    if (CFG.staticKey) {
      var rect = box.getBoundingClientRect();
      var img = new Image();
      img.className = 'ymap-static';
      img.alt = 'Карта: ' + (box.dataset.address || box.dataset.title || '');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = staticUrl(box, rect.width || 640, rect.height || 360);
      box.insertBefore(img, box.firstChild);
      box.classList.add('has-static');
    }

    if (!CFG.jsKey) return;      // интерактивной карты не будет, и это не ошибка

    box.classList.add('is-ready');

    /* Наведение мыши — для тех, кто уже смотрит на блок, но ещё не
       дошёл до него прокруткой. На телефоне события нет, там сработает
       наблюдатель ниже. */
    box.addEventListener('mouseenter', function () { activate(box); }, { once: true });
    box.addEventListener('click', function () { activate(box); }, { once: true });

    if (!('IntersectionObserver' in window)) {
      activate(box);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.disconnect();
        activate(box);
      });
    }, { rootMargin: '200px' });   // запас, чтобы карта успела появиться к подходу

    io.observe(box);
  }

  function init() {
    document.querySelectorAll('[data-ymap]').forEach(setup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
