/* Ланч Бокс — сборка страницы из данных.
   Ничего не анимируем: движение добавляется отдельным шагом, на готовую статику.
   Все тексты и цены берутся из dannye.js — в разметке их нет намеренно. */
(() => {
  const D = window.LANCH;
  if (!D) return;                       // данные не подключились — страница живёт дальше
  const $ = (s, k = document) => k.querySelector(s);
  const rub = n => `${n} ₽`;

  // ── полоса черновика ───────────────────────────────────────────
  if (D.chernovik) {
    const p = document.createElement('div');
    p.className = 'chernovik';
    p.textContent = 'Черновик: цены и контакты примерные. Заменить в assets/js/dannye.js и выключить chernovik.';
    document.body.prepend(p);
  }

  // ── контакты подставляем везде разом ───────────────────────────
  const K = D.kontakty;
  document.querySelectorAll('[data-tel]').forEach(a => {
    a.href = 'tel:' + K.telefon.replace(/[^\d+]/g, '');
    if (a.dataset.tel === 'text') a.textContent = K.telefon;
  });
  document.querySelectorAll('[data-tg]').forEach(a => a.href = K.telegram);
  document.querySelectorAll('[data-wa]').forEach(a => a.href = K.whatsapp);
  document.querySelectorAll('[data-marshrut]').forEach(a => a.href = K.marshrut);
  document.querySelectorAll('[data-adres]').forEach(e => e.textContent = K.adres);
  document.querySelectorAll('[data-chasy]').forEach(e => e.textContent = D.chasy.budni);
  if (!K.vk) $('[data-vk-blok]')?.remove(); else $('[data-vk]')?.setAttribute('href', K.vk);

  // ── меню ───────────────────────────────────────────────────────
  const menuKorobka = $('#menu-spisok');
  if (menuKorobka) {
    for (const gruppa of D.menu) {
      const g = document.createElement('div');
      g.className = 'gruppa';
      const h = document.createElement('h3');
      h.textContent = gruppa.imya;
      g.append(h);
      const karty = document.createElement('div');
      karty.className = 'karty';
      for (const p of gruppa.pozicii) {
        const k = document.createElement('article');
        k.className = 'karta';
        const verh = document.createElement('div');
        verh.className = 'verh';
        const b = document.createElement('b'); b.textContent = p.imya;
        const c = document.createElement('span'); c.className = 'cena'; c.textContent = rub(p.cena);
        verh.append(b, c);
        const o = document.createElement('p'); o.textContent = p.opisanie;
        k.append(verh, o);
        karty.append(k);
      }
      g.append(karty);
      menuKorobka.append(g);
    }
  }

  // ── конфигуратор стакана ───────────────────────────────────────
  const konf = D.konfigurator;
  const polya = [
    ['napitok', 'Напиток', konf.napitok, 'cena'],
    ['razmer', 'Размер, л', konf.razmer, 'nadbavka'],
    ['moloko', 'Молоко', konf.moloko, 'nadbavka'],
    ['sirop', 'Сироп', konf.sirop, 'nadbavka'],
    ['temperatura', 'Температура', konf.temperatura, 'nadbavka'],
  ];
  const konfKorobka = $('#konf-polya');
  if (konfKorobka) {
    polya.forEach(([kod, podpis, spisok], i) => {
      const blok = document.createElement('div');
      blok.className = 'konf-shag';
      const s = document.createElement('span'); s.textContent = `${i + 1}. ${podpis}`;
      const vybor = document.createElement('div'); vybor.className = 'vybor';
      spisok.forEach((v, j) => {
        const id = `${kod}-${j}`;
        const l = document.createElement('label');
        const inp = document.createElement('input');
        inp.type = 'radio'; inp.name = kod; inp.id = id; inp.value = String(j);
        if (j === 0) inp.checked = true;
        const nadpis = document.createElement('span');
        const dop = v.nadbavka ? ` +${v.nadbavka} ₽` : '';
        nadpis.textContent = v.imya + dop;
        l.append(inp, nadpis);
        vybor.append(l);
      });
      blok.append(s, vybor);
      konfKorobka.append(blok);
    });
    konfKorobka.addEventListener('change', poschitat);
    poschitat();
  }

  function vybrano(kod, spisok) {
    const el = konfKorobka.querySelector(`input[name="${kod}"]:checked`);
    return spisok[el ? Number(el.value) : 0];
  }

  function poschitat() {
    const n = vybrano('napitok', konf.napitok);
    const r = vybrano('razmer', konf.razmer);
    const m = vybrano('moloko', konf.moloko);
    const s = vybrano('sirop', konf.sirop);
    const t = vybrano('temperatura', konf.temperatura);
    const summa = n.cena + r.nadbavka + m.nadbavka + s.nadbavka + t.nadbavka;

    const stroki = $('#itog-stroki');
    stroki.textContent = '';
    const dobavit = (levo, pravo) => {
      const d = document.createElement('div'); d.className = 'stroka';
      const a = document.createElement('span'); a.textContent = levo;
      const b = document.createElement('span'); b.textContent = pravo;
      d.append(a, b); stroki.append(d);
    };
    dobavit(n.imya, rub(n.cena));
    dobavit(`${r.imya} л`, r.nadbavka ? `+${r.nadbavka} ₽` : 'без доплаты');
    dobavit(m.imya, m.nadbavka ? `+${m.nadbavka} ₽` : 'без наценки');
    if (s.nadbavka) dobavit(s.imya, `+${s.nadbavka} ₽`);
    if (t.nadbavka) dobavit(t.imya, `+${t.nadbavka} ₽`);

    $('#itog-summa').textContent = rub(summa);

    // Заказ уходит готовым текстом — бариста не переспрашивает, клиент не диктует
    const zakaz = `Здравствуйте! Хочу забрать:\n${n.imya} ${r.imya} л, молоко ${m.imya.toLowerCase()}`
      + `${s.nadbavka ? ', сироп ' + s.imya.toLowerCase() : ''}`
      + `${t.nadbavka ? ', ' + t.imya.toLowerCase() : ''}\nИтого ${summa} ₽`;
    const tekst = encodeURIComponent(zakaz);
    $('#zakaz-tg').href = K.telegram + (K.telegram.includes('?') ? '&' : '?') + 'text=' + tekst;
    $('#zakaz-wa').href = K.whatsapp + (K.whatsapp.includes('?') ? '&' : '?') + 'text=' + tekst;
  }

  // ── отзывы: нет настоящих — секции нет ─────────────────────────
  if (!D.otzyvy || D.otzyvy.length === 0) $('#otzyvy')?.remove();

  // ── разметка для поисковиков собирается из тех же данных ───────
  const shema = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: 'Ланч Бокс',
    servesCuisine: ['Шаурма', 'Кофе', 'Фастфуд'],
    address: { '@type': 'PostalAddress', addressLocality: 'Лермонтов',
               addressRegion: 'Ставропольский край', streetAddress: K.adres, addressCountry: 'RU' },
    telephone: K.telefon,
    openingHours: 'Mo-Su ' + D.chasy.budni.replace(/\s*—\s*/, '-'),
    priceRange: '₽',
    takeaway: true,
  };
  const sk = document.createElement('script');
  sk.type = 'application/ld+json';
  sk.textContent = JSON.stringify(shema);
  document.head.append(sk);
})();
