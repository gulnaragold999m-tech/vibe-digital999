/* Ланч Бокс — меню-приложение, корзина и бот-помощник.
   Всё на чистом JS: ни библиотек, ни сборки, ни ключей от нейросети.
   Бот работает по сценарию и берёт позиции из dannye.js — своих цен
   у него нет и быть не может. Скидок он не придумывает: их никто
   не объявлял, а обещание на сайте потом отрабатывать кассе. */
(() => {
  const D = window.LANCH;
  if (!D) return;
  const $ = (s, k = document) => k.querySelector(s);
  const rub = n => `${n} ₽`;
  const el = (tag, klass, tekst) => {
    const e = document.createElement(tag);
    if (klass) e.className = klass;
    if (tekst !== undefined) e.textContent = tekst;
    return e;
  };

  // ── полоса черновика ───────────────────────────────────────────
  if (D.chernovik) {
    const p = el('div', 'chernovik',
      'Черновик: контакты примерные. Цены — с досок кафе, объёмы уточняются.');
    document.body.prepend(p);
  }

  // ── контакты разом по всей странице ────────────────────────────
  const K = D.kontakty;
  const telSsylka = 'tel:' + K.telefon.replace(/[^\d+]/g, '');
  document.querySelectorAll('[data-tel]').forEach(a => {
    a.href = telSsylka;
    if (a.dataset.tel === 'text') a.textContent = K.telefon;
  });
  document.querySelectorAll('[data-tg]').forEach(a => (a.href = K.telegram));
  document.querySelectorAll('[data-wa]').forEach(a => (a.href = K.whatsapp));
  document.querySelectorAll('[data-marshrut]').forEach(a => (a.href = K.marshrut));
  document.querySelectorAll('[data-adres]').forEach(e => (e.textContent = K.adres));
  document.querySelectorAll('[data-chasy]').forEach(e => (e.textContent = D.chasy.budni));
  if (!K.vk) $('[data-vk-blok]')?.remove();
  else $('[data-vk-blok]')?.setAttribute('href', K.vk);

  // ── корзина ────────────────────────────────────────────────────
  const korzina = [];                       // {imya, variant, cena}
  const najti = (kod, imya) => D.menu.find(g => g.kod === kod)?.pozicii.find(p => p.imya === imya);

  function dobavit(poziciya, variant) {
    korzina.push({ imya: poziciya.imya, variant: variant.imya, cena: variant.cena });
    obnovit();
    return `${poziciya.imya} (${variant.imya}) — ${rub(variant.cena)}`;
  }
  const summa = () => korzina.reduce((s, p) => s + p.cena, 0);

  function slovoPozicij(n) {
    const sto = n % 100, des = n % 10;
    if (sto > 10 && sto < 20) return 'позиций';
    if (des === 1) return 'позиция';
    if (des >= 2 && des <= 4) return 'позиции';
    return 'позиций';
  }

  function obnovit() {
    const polosa = $('#korzina');
    if (!polosa) return;
    polosa.hidden = korzina.length === 0;
    $('#korzina-schet').textContent = `${korzina.length} ${slovoPozicij(korzina.length)}`;
    $('#korzina-summa').textContent = rub(summa());

    const spisok = $('#korzina-spisok');
    spisok.textContent = '';
    korzina.forEach((p, i) => {
      const stroka = el('li', 'zakaz-stroka');
      const imya = el('span', null, `${p.imya} · ${p.variant}`);
      const cena = el('span', 'zakaz-cena', rub(p.cena));
      const ubrat = el('button', 'ubrat', '×');
      ubrat.type = 'button';
      ubrat.setAttribute('aria-label', `Убрать ${p.imya}`);
      ubrat.addEventListener('click', () => { korzina.splice(i, 1); obnovit(); });
      stroka.append(imya, cena, ubrat);
      spisok.append(stroka);
    });
    $('#zakaz-summa').textContent = rub(summa());

    const tekst = encodeURIComponent(
      'Здравствуйте! Хочу забрать:\n' +
      korzina.map(p => `— ${p.imya} (${p.variant}) ${p.cena} ₽`).join('\n') +
      `\nИтого ${summa()} ₽`);
    $('#zakaz-tg').href = K.telegram + (K.telegram.includes('?') ? '&' : '?') + 'text=' + tekst;
    $('#zakaz-wa').href = K.whatsapp + (K.whatsapp.includes('?') ? '&' : '?') + 'text=' + tekst;
  }

  $('#korzina-otkryt')?.addEventListener('click', () => {
    const list = $('#zakaz-list');
    list.hidden = !list.hidden;
    $('#korzina-otkryt').setAttribute('aria-expanded', String(!list.hidden));
  });

  // ── меню: вкладки и карточки ───────────────────────────────────
  const vkladki = $('#menu-vkladki');
  const spisokMenu = $('#menu-spisok');
  if (vkladki && spisokMenu) {
    D.menu.forEach((gruppa, i) => {
      const b = el('button', 'vkladka', `${gruppa.znak} ${gruppa.imya}`);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(i === 0));
      b.addEventListener('click', () => {
        vkladki.querySelectorAll('.vkladka').forEach(x => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        pokazat(gruppa.kod);
      });
      vkladki.append(b);
    });
    pokazat(D.menu[0].kod);
  }

  function pokazat(kod) {
    const gruppa = D.menu.find(g => g.kod === kod);
    spisokMenu.textContent = '';
    const karty = el('div', 'karty');
    for (const p of gruppa.pozicii) {
      const k = el('article', 'karta');
      const verh = el('div', 'verh');
      const b = el('b', null, p.imya);
      verh.append(b);
      if (p.hit) verh.append(el('span', 'metka', 'фирменный'));
      k.append(verh);
      if (p.opisanie) k.append(el('p', null, p.opisanie));
      const knopki = el('div', 'varianty');
      for (const v of p.varianty) {
        const kn = el('button', 'variant');
        kn.type = 'button';
        kn.append(el('span', 'v-imya', v.imya), el('span', 'v-cena', rub(v.cena)));
        kn.addEventListener('click', () => {
          dobavit(p, v);
          kn.classList.add('dobavlen');
          setTimeout(() => kn.classList.remove('dobavlen'), 900);
        });
        knopki.append(kn);
      }
      k.append(knopki);
      karty.append(k);
    }
    spisokMenu.append(karty);
  }

  // ── бот-помощник ───────────────────────────────────────────────
  const lenta = $('#bot-lenta');
  const knopki = $('#bot-knopki');

  function skazat(tekst, ot = 'bot') {
    const s = el('div', `soobshchenie ${ot}`);
    s.append(el('p', null, tekst));
    lenta.append(s);
    lenta.scrollTop = lenta.scrollHeight;
  }

  function predlozhit(varianty) {
    knopki.textContent = '';
    for (const v of varianty) {
      const b = el('button', 'bot-knopka', v.imya);
      b.type = 'button';
      b.addEventListener('click', () => {
        skazat(v.imya, 'ya');
        v.dalshe();
      });
      knopki.append(b);
    }
  }

  const shag = {
    nachalo() {
      predlozhit([
        { imya: 'Кофе', dalshe: () => shag.gruppa('kofe') },
        { imya: 'Поесть', dalshe: () => shag.chtoPoest() },
        { imya: 'Готовая пара', dalshe: () => shag.pary() },
        { imya: 'Что подешевле', dalshe: () => shag.deshevle() },
      ]);
    },

    chtoPoest() {
      skazat('Горячее, сэндвичи или готовый набор?');
      predlozhit([
        { imya: 'Горячее', dalshe: () => shag.gruppa('goryachee') },
        { imya: 'Сэндвичи и роллы', dalshe: () => shag.gruppa('holodnoe') },
        { imya: 'Завтрак и обед', dalshe: () => shag.gruppa('sety') },
        { imya: 'Назад', dalshe: () => { skazat('Что берём?'); shag.nachalo(); } },
      ]);
    },

    gruppa(kod) {
      const g = D.menu.find(x => x.kod === kod);
      skazat(`${g.imya}: что берём?`);
      predlozhit([
        ...g.pozicii.map(p => ({ imya: p.imya, dalshe: () => shag.variant(p) })),
        { imya: 'Назад', dalshe: () => { skazat('Что берём?'); shag.nachalo(); } },
      ]);
    },

    variant(p) {
      if (p.varianty.length === 1) return shag.dobavleno(p, p.varianty[0]);
      skazat(`${p.imya} — какой?`);
      predlozhit(p.varianty.map(v => ({
        imya: `${v.imya} — ${rub(v.cena)}`,
        dalshe: () => shag.dobavleno(p, v),
      })));
    },

    dobavleno(p, v) {
      dobavit(p, v);
      skazat(`Добавил: ${p.imya} (${v.imya}) — ${rub(v.cena)}. В заказе на ${rub(summa())}.`);
      skazat('Ещё что-нибудь?');
      predlozhit([
        { imya: 'Добавить кофе', dalshe: () => shag.gruppa('kofe') },
        { imya: 'Добавить еду', dalshe: () => shag.chtoPoest() },
        { imya: 'Оформляем', dalshe: () => shag.oformit() },
      ]);
    },

    pary() {
      skazat('Частые пары. Это просто удобство, скидки на них нет:');
      predlozhit([
        ...D.bot.pary.map(para => {
          const pozicii = para.iz.map(([kod, imya]) => najti(kod, imya)).filter(Boolean);
          const cena = pozicii.reduce((s, p) => s + p.varianty[0].cena, 0);
          return {
            imya: `${para.imya} — ${rub(cena)}`,
            dalshe: () => {
              pozicii.forEach(p => dobavit(p, p.varianty[0]));
              skazat(`Собрал: ${pozicii.map(p => p.imya).join(' и ')}. В заказе на ${rub(summa())}.`);
              skazat('Оформляем или добавим что-то ещё?');
              predlozhit([
                { imya: 'Оформляем', dalshe: () => shag.oformit() },
                { imya: 'Добавить ещё', dalshe: () => { skazat('Что берём?'); shag.nachalo(); } },
              ]);
            },
          };
        }),
        { imya: 'Назад', dalshe: () => { skazat('Что берём?'); shag.nachalo(); } },
      ]);
    },

    deshevle() {
      // Считаем по прайсу, а не выдумываем «акции»: три самых доступных позиции
      const vse = D.menu.flatMap(g => g.pozicii.map(p => ({ p, cena: p.varianty[0].cena })));
      const tri = vse.sort((a, b) => a.cena - b.cena).slice(0, 4);
      skazat('Самое доступное по нашему прайсу:');
      predlozhit([
        ...tri.map(({ p, cena }) => ({
          imya: `${p.imya} — ${rub(cena)}`,
          dalshe: () => shag.variant(p),
        })),
        { imya: 'Назад', dalshe: () => { skazat('Что берём?'); shag.nachalo(); } },
      ]);
    },

    oformit() {
      if (korzina.length === 0) {
        skazat('В заказе пока пусто. Давайте выберем — что берём?');
        return shag.nachalo();
      }
      skazat(`В заказе: ${korzina.map(p => `${p.imya} (${p.variant})`).join(', ')}. Итого ${rub(summa())}.`);
      skazat('Отправьте заказ в мессенджер — подтвердим и скажем, когда забирать.');
      knopki.textContent = '';
      const tg = el('a', 'bot-knopka glavnaya', 'Отправить в Telegram');
      tg.href = $('#zakaz-tg').href; tg.target = '_blank'; tg.rel = 'noopener';
      const wa = el('a', 'bot-knopka', 'Отправить в WhatsApp');
      wa.href = $('#zakaz-wa').href; wa.target = '_blank'; wa.rel = 'noopener';
      const zanovo = el('button', 'bot-knopka', 'Добавить ещё');
      zanovo.type = 'button';
      zanovo.addEventListener('click', () => { skazat('Что берём?'); shag.nachalo(); });
      knopki.append(tg, wa, zanovo);
      $('#zakaz-list').hidden = false;
    },
  };

  if (lenta && knopki) {
    skazat(D.bot.privet);
    shag.nachalo();
  }
  obnovit();

  // ── отзывы: настоящих нет — секции нет ─────────────────────────
  if (!D.otzyvy || D.otzyvy.length === 0) $('#otzyvy')?.remove();

  // ── разметка для поисковиков из тех же данных ──────────────────
  const vseCeny = D.menu.flatMap(g => g.pozicii.flatMap(p => p.varianty.map(v => v.cena)));
  const shema = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: 'Ланч Бокс',
    servesCuisine: ['Шаурма', 'Бургеры', 'Кофе'],
    address: { '@type': 'PostalAddress', addressLocality: 'Лермонтов',
               addressRegion: 'Ставропольский край', streetAddress: K.adres, addressCountry: 'RU' },
    telephone: K.telefon,
    openingHours: 'Mo-Su ' + D.chasy.budni.replace(/\s*—\s*/, '-'),
    priceRange: `${Math.min(...vseCeny)}-${Math.max(...vseCeny)} ₽`,
    takeaway: true,
    hasMenu: {
      '@type': 'Menu',
      hasMenuSection: D.menu.map(g => ({
        '@type': 'MenuSection', name: g.imya,
        hasMenuItem: g.pozicii.map(p => ({
          '@type': 'MenuItem', name: p.imya,
          offers: p.varianty.map(v => ({ '@type': 'Offer', price: v.cena, priceCurrency: 'RUB' })),
        })),
      })),
    },
  };
  const sk = el('script');
  sk.type = 'application/ld+json';
  sk.textContent = JSON.stringify(shema);
  document.head.append(sk);
})();
