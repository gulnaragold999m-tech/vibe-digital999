# Advanced Technical SEO: Complete Guide

**Источник:** Search Engine Journal — Technical SEO Guide + Google Search Central
**URL:** https://www.searchenginejournal.com/technical-seo/
**Дата конспекта:** 2025-12-23
**Тип:** Отраслевой гайд

---

## **Основные темы урока**

1. **Что такое Technical SEO и его роль**
2. **Crawlability: как Google находит страницы**
3. **Indexability: как Google добавляет страницы в индекс**
4. **Site Architecture: структура и навигация**
5. **Core Web Vitals и Page Experience**
6. **Structured Data и Schema Markup**
7. **Mobile-First Indexing**

---

## **1. Что такое Technical SEO и его роль**

### **1.1. Определение**

- Technical SEO — это **оптимизация инфраструктуры** сайта для облегчения crawling, indexing и rendering.
- Без правильной технической базы даже лучший контент не получит видимости.
- Technical SEO — это **гигиена**, не конкурентное преимущество.

> Technical SEO is the foundation. Without it, content and links are worthless.

### **1.2. Три столпа Technical SEO**

| Столп | Описание | Ключевые элементы |
|-------|----------|-------------------|
| **Crawlability** | Может ли Googlebot найти страницы | robots.txt, sitemap, links |
| **Indexability** | Добавит ли Google страницы в индекс | noindex, canonical, duplicate content |
| **Renderability** | Может ли Google отрисовать страницу | JavaScript, resources, DOM |

### **1.3. Приоритет технических задач**

1. **Критические:** Blocked by robots.txt, noindex на важных страницах, server errors
2. **Высокие:** Duplicate content, slow speed, mobile issues
3. **Средние:** Schema errors, minor crawl issues
4. **Низкие:** Minor optimizations

**Вывод:** Technical SEO — фундамент. Сначала исправь технические проблемы, потом думай о контенте и ссылках.

---

## **2. Crawlability: как Google находит страницы**

### **2.1. Как работает Googlebot**

- Googlebot — crawler, который обходит веб, следуя по ссылкам.
- Скачивает HTML, CSS, JS, изображения.
- Использует **crawl queue** — очередь URL для сканирования.
- Приоритизирует: важные страницы, обновлённый контент.

### **2.2. Crawl Budget**

- Crawl budget — количество страниц, которые Google готов сканировать за период.
- Факторы, влияющие на crawl budget:
  - Размер сайта
  - Скорость ответа сервера
  - Качество контента
  - Частота обновлений

- ⚠️ **Важно:** Crawl rate **не влияет на rankings напрямую**, но влияет на скорость индексации.

### **2.3. Robots.txt**

```
User-agent: *
Disallow: /admin/
Disallow: /private/
Allow: /public/
Sitemap: https://example.com/sitemap.xml
```

- **Disallow** — запретить crawling (но не indexing!)
- **Allow** — разрешить crawling подкаталогов
- Указывай sitemap в robots.txt

> Use robots.txt to prevent crawling, not indexing. Use noindex for that.

### **2.4. Sitemap**

- XML-файл со списком важных страниц.
- Включай: `<loc>`, `<lastmod>`, `<changefreq>`, `<priority>`
- Типы sitemap:
  - Основной sitemap
  - Image sitemap
  - Video sitemap
  - News sitemap

- **Best practices:**
  - Используй `<lastmod>` для сигнализации об обновлениях.
  - Не включай noindex страницы.
  - Лимит: 50,000 URL или 50MB на файл.

### **2.5. Internal Linking**

- Каждая страница должна быть доступна через навигацию.
- Используй `<a href="">` — не JavaScript events.
- Глубина клика: важные страницы — не глубже 3 кликов от homepage.

**Вывод:** Robots.txt + Sitemap + Internal links = контролируемый crawling.

---

## **3. Indexability: как Google добавляет страницы в индекс**

### **3.1. Indexing vs Crawling**

- Crawling ≠ Indexing — страница может быть просканирована, но не проиндексирована.
- Причины неиндексации:
  - noindex directive
  - Duplicate content
  - Low quality / thin content
  - Soft 404s
  - Canonicalization issues

### **3.2. Meta Robots Tags**

| Директива | Эффект |
|-----------|--------|
| `index` | Разрешить индексацию (default) |
| `noindex` | Запретить индексацию |
| `follow` | Переходить по ссылкам (default) |
| `nofollow` | Не переходить по ссылкам |
| `noarchive` | Не кешировать страницу |
| `nosnippet` | Не показывать snippet |

```html
<meta name="robots" content="noindex, follow">
```

### **3.3. Canonicalization**

- Canonical URL — главная версия страницы при наличии дубликатов.
- Указывай явно через `<link rel="canonical" href="...">`.
- Причины дублирования:
  - HTTP vs HTTPS
  - www vs non-www
  - Trailing slash variations
  - URL parameters
  - Mobile URLs (m.example.com)

### **3.4. Проверка индексации**

- **Search Console → URL Inspection** — проверить конкретный URL.
- **site:example.com** — посмотреть проиндексированные страницы.
- **Google Search Console → Coverage** — отчёт об индексации.

**Вывод:** Noindex для ненужного + canonical для дубликатов = чистый индекс.

---

## **4. Site Architecture: структура и навигация**

### **4.1. Flat vs Deep Architecture**

| Тип | Описание | Когда использовать |
|-----|----------|-------------------|
| **Flat** | Все страницы близко к homepage | Небольшие сайты |
| **Deep** | Многоуровневая иерархия | Большие сайты, e-commerce |

- Оптимально: важные страницы — не глубже 3 кликов.

### **4.2. URL Structure**

- **Хорошо:** `/category/subcategory/product-name`
- **Плохо:** `/p?id=12345&cat=7`

- Best practices:
  - Читаемые URL с ключевыми словами.
  - Дефисы вместо подчёркиваний.
  - Lowercase.
  - Без session IDs и лишних параметров.

### **4.3. Breadcrumbs**

- Навигационная цепочка: Home > Category > Product
- Добавь structured data (BreadcrumbList).
- Помогает пользователям и Google понять структуру.

### **4.4. Faceted Navigation (E-commerce)**

- Фильтры создают миллионы URL-вариаций.
- Проблема: crawl budget waste, duplicate content.
- Решения:
  - `noindex` на filtered pages
  - Canonical на основную страницу категории
  - robots.txt для URL-паттернов фильтров

**Вывод:** Плоская иерархия + чистые URL + breadcrumbs = понятная структура.

---

## **5. Core Web Vitals и Page Experience**

### **5.1. Core Web Vitals (2025)**

| Метрика | Описание | Хорошо | Плохо |
|---------|----------|--------|-------|
| **LCP** | Largest Contentful Paint | < 2.5s | > 4s |
| **INP** | Interaction to Next Paint | < 200ms | > 500ms |
| **CLS** | Cumulative Layout Shift | < 0.1 | > 0.25 |

> ⚠️ INP заменил FID с марта 2024.

### **5.2. Оптимизация LCP**

- Оптимизируй изображения (WebP, AVIF, lazy loading).
- Используй CDN.
- Минимизируй CSS/JS blocking.
- Preload критических ресурсов.

### **5.3. Оптимизация INP**

- Разбивай long tasks на smaller chunks.
- Используй web workers для heavy computation.
- Отложи non-critical JavaScript.
- Оптимизируй event handlers.

### **5.4. Оптимизация CLS**

- Задавай размеры для изображений и видео.
- Резервируй место для ads и embeds.
- Избегай динамической вставки контента выше fold.
- Используй font-display: swap.

### **5.5. Page Experience Signals**

- Core Web Vitals ✓
- Mobile-friendliness ✓
- HTTPS ✓
- No intrusive interstitials ✓

**Вывод:** CWV — официальный фактор ранжирования. Плохой UX = потеря позиций.

---

## **6. Structured Data и Schema Markup**

### **6.1. Что такое Structured Data**

- Машиночитаемый формат для описания контента.
- Помогает Google **понять** и **отобразить** контент.
- Форматы: JSON-LD (рекомендуемый), Microdata, RDFa.

### **6.2. Типы Schema для SEO**

| Тип | Применение | Rich Result |
|-----|------------|-------------|
| **Organization** | Информация о компании | Knowledge Panel |
| **LocalBusiness** | Локальный бизнес | Local Pack |
| **Product** | Товары | Product snippets |
| **Review/AggregateRating** | Отзывы | Star ratings |
| **FAQ** | Вопросы-ответы | FAQ accordion |
| **Article** | Статьи/блог | News carousel |
| **BreadcrumbList** | Навигация | Breadcrumb trail |
| **HowTo** | Инструкции | Step-by-step |

### **6.3. Пример JSON-LD**

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Example Corp",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
  "sameAs": [
    "https://www.facebook.com/example",
    "https://twitter.com/example"
  ]
}
```

### **6.4. Валидация**

- **Rich Results Test** — проверка structured data.
- **Schema Markup Validator** — валидация синтаксиса.
- **Search Console → Enhancements** — мониторинг ошибок.

**Вывод:** Structured data = расширенные результаты + лучшее понимание контента.

---

## **7. Mobile-First Indexing**

### **7.1. Что это**

- Google индексирует **мобильную версию** как основную.
- Desktop версия — вторична.
- Все сайты переведены на mobile-first indexing.

### **7.2. Требования**

- Мобильная версия содержит **весь важный контент**.
- Одинаковые structured data на мобильной и десктоп.
- Одинаковые meta tags (title, description, robots).
- Одинаковые alt-тексты изображений.

### **7.3. Responsive vs Separate Mobile**

| Подход | Описание | Рекомендация |
|--------|----------|--------------|
| **Responsive** | Один URL, адаптивный дизайн | ✅ Рекомендуется |
| **Dynamic Serving** | Один URL, разный HTML | Допустимо |
| **Separate URLs** | m.example.com | Не рекомендуется |

### **7.4. Проверка mobile-friendliness**

- Search Console → Mobile Usability report.
- Lighthouse → Performance audit.
- PageSpeed Insights.

**Вывод:** Mobile-first = дизайн начинается с mobile, desktop — адаптация.

---

## **Ключевые тезисы**

1. **Technical SEO — фундамент.** Без него контент и ссылки бесполезны.
2. **Crawlability:** robots.txt + sitemap + internal links.
3. **Indexability:** noindex для ненужного, canonical для дубликатов.
4. **Core Web Vitals:** LCP < 2.5s, INP < 200ms, CLS < 0.1.
5. **Structured data:** JSON-LD для rich results и лучшего понимания.
6. **Mobile-first:** Всё начинается с мобильной версии.
7. **Search Console** — обязательный инструмент диагностики.

---

## **Чек-лист Technical SEO**

- [ ] Robots.txt не блокирует важные страницы
- [ ] Sitemap создан и отправлен в Search Console
- [ ] Все страницы доступны через внутренние ссылки
- [ ] Нет noindex на важных страницах
- [ ] Canonical указан для всех страниц с дубликатами
- [ ] Core Web Vitals в зелёной зоне
- [ ] Structured data без ошибок
- [ ] Mobile-friendly на всех страницах
- [ ] HTTPS включён
- [ ] Search Console настроен и мониторится







