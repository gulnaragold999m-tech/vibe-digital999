# Entity SEO: Moving Search from Strings to Things

**Название:** Entity SEO
**Автор:** Dixon Jones
**Год издания:** ~2021
**Жанр:** SEO / Digital Marketing
**Дата конспекта:** 2025-12-23

---

## **Трансформирующие идеи**

### 1. Поиск переходит от "strings" к "things"

- Google всё меньше ориентируется на ключевые слова (strings) и всё больше на **сущности (things/entities)**.
- Entity — это уникальный объект в Knowledge Graph (человек, организация, место, концепция).
- **Почему это важно:** SEO больше не про плотность ключевых слов. Это про то, чтобы стать признанной сущностью в Knowledge Graph и связать свой контент с другими сущностями.

### 2. Knowledge Graph — это "словарь Google"

- Knowledge Graph — база данных сущностей и связей между ними.
- Построена на **Semantic Triples**: Subject — Predicate — Object (например: "Freddie Mercury" — "is a member of" — "Queen").
- Из троек Google выводит новые связи (если A связан с B, а B связан с C, то A связан с C).
- **Почему это важно:** Понимание структуры Knowledge Graph позволяет целенаправленно строить связи между вашим брендом и авторитетными сущностями.

### 3. Wikipedia — главный "trusted seed set" для Google

- Google использует Wikipedia и Wikidata как первичный источник данных для Knowledge Graph.
- Если сущность есть в Wikipedia — она почти гарантированно в Knowledge Graph.
- **Почему это важно:** Попадание в Wikipedia = автоматическое получение Knowledge Panel. Но это не единственный путь — можно стать сущностью через связи с другими entities.

### 4. Vectors определяют семантическую близость

- Google понимает, что "Freddie Mercury" и "John Deacon" семантически близки (оба — члены Queen).
- Аналогично: "The Beatles" и "Pink Floyd" — семантически близкие группы.
- **Почему это важно:** Если пишешь о Queen — упоминай John Deacon, Freddie Mercury, Live Aid, Bohemian Rhapsody. Это укрепляет топикальную релевантность.

### 5. Можно стать Entity без страницы в Wikipedia

- Google извлекает новые entities из связей в существующих записях.
- Пример: Kasmira Cooke (сестра Freddie Mercury) не имеет страницы в Wikipedia, но Google создал для неё entity на основе упоминания в статье о Mercury.
- **Почему это важно:** Фокус на создании верифицируемых связей с существующими entities, а не на попытках пробиться в Wikipedia напрямую.

### 6. Structured Data — "язык общения" с Knowledge Graph

- JSON-LD позволяет явно указать Google, какие entities упоминаются на странице и как они связаны.
- Webpage Schema: "aboutschema" (о чём страница) и "mentionsschema" (что упоминается).
- **Почему это важно:** Structured data ускоряет понимание контента Google. Без неё Google должен сам выводить связи из текста.

### 7. Internal Linking критичен для Entity SEO

- Внутренние ссылки создают "mini Knowledge Graph" вашего сайта.
- Связывают упоминания topics с cornerstone content.
- Anchor text даёт контекст для понимания связи.
- **Почему это важно:** Без правильной внутренней перелинковки Google видит набор изолированных страниц вместо связной тематической экспертизы.

---

## **Глава 1. Knowledge Graph Explained**

### 1.1 Что такое Knowledge Graph

- База данных, содержащая информацию о сущностях и связях между ними.
- Введён Google около 2012 года.
- Отображается через **Knowledge Panel** в результатах поиска.
- Улучшает UX: пользователь получает информацию без дополнительных кликов.

### 1.2 Semantic Triples

- Тройка: Subject — Predicate — Object.
- Пример: "Freddie Mercury" (is a member of) "Queen" (which is a) "rock band".
- Содержит три отдельных triple:
  1. Freddie Mercury (is a member of) Queen
  2. Queen (is a) rock band
  3. Freddie Mercury (is in a) rock band (выведено логически)

> **Важно:** Неполные данные могут создать ошибки. Freddie Mercury "WAS" in a band, не "IS". Без даты смерти — дедукция ложна.

### 1.3 Common @types

- Person, Place, Date, Organisation, Review, Recipe, Event
- Это классификаторы, а не сами entities

### 1.4 Vectors и семантическая близость

- "John Deacon" и "Freddie Mercury" семантически близки (оба члены Queen).
- Если пишешь о Queen — пиши о членах группы, об альбомах, о Live Aid.
- Это не поможет ранжироваться по "Queen band" (это уже определённая entity), но поможет генерировать трафик по связанным запросам.

---

## **Глава 2. Evolution of Semantic Search**

### 2.1 От директорий к полнотекстовому поиску

- Yahoo Directory, Open Directory Project — ручная курация.
- AltaVista, Google — полнотекстовый поиск победил.
- Knowledge Graph — возврат к курированным данным, но в более гибкой форме.

### 2.2 Crawl, Index, Serve

- **Crawl:** Googlebot находит и скачивает страницы.
- **Index:** Анализ контента, хранение в базе.
- **Serve:** Сопоставление запроса с индексом.

### 2.3 Continuous Bag of Words (CBOW) и nGrams

- Google считает слова и фразы (n-grams).
- "the quick fox" встречается чаще, чем "the clever fox" — семантическая близость.
- Word2Vec и Vector Space Models создают карты семантической близости.

### 2.4 Javascript Challenges

- Javascript требует rendering на стороне клиента.
- Google рендерит 90% Javascript в течение 5 секунд после crawl.
- Но есть задержка: сначала crawl, потом render.

### 2.5 Trusted Seed Sets

- Wikipedia Foundation — основной источник для тренировки Knowledge Graph.
- 0.04% пользователей Wikipedia создают 50% контента.
- → Bias в данных неизбежен.

---

## **Глава 3. Google's Entity Search Tool**

### 3.1 Knowledge Graph Search API

- https://developers.google.com/apis-explorer/#p/kgsearch/v1/kgsearch.entities.search
- Позволяет проверить, есть ли entity в Knowledge Graph.
- **@id: "kg:/m/..."** — идентификатор в Knowledge Graph (m = из Freebase, g = из Google).

### 3.2 Insights для SEO

- Запрос не обязательно должен быть exact match — Google может подставить related entity.
- Иногда Google просто **ошибается** (пример: "Ramsey Saint Mary's" → вернул Isle of Man League).

> Inlinks показывает разницу между entities на вашем сайте и entities, которые Google "думает" что там есть. Это **SEO-возможность**.

---

## **Глава 4. Semantic SEO Strategies**

### 4.1 Две основные стратегии

1. **Стать Entity:** Ваш бренд = entity в Knowledge Graph.
2. **Стать экспертом по Entity:** Связаться с существующими entities как авторитетный источник.

### 4.2 Edge Strategy

- Если не можете "владеть" entity — играйте на "edge" (связях).
- Пример: Record shop не владеет entity "Queen album", но может ассоциироваться с ней.

---

## **Глава 5. Earning a Wikipedia Listing**

### 5.1 Советы от экспертов

**Jim Hedger:**
- Идите медленно, стройте личный авторитет.
- Wikipedia — community-driven проект с высокой миссией.
- Цитируйте всё что можете (строгие критерии "credible sources").
- Не пытайтесь навязывать идеи без учёта backgrounds других.

**Arnout Hellemans:**
- Начните с Wikidata, не Wikipedia.
- Добавляйте identifiers к записям (связи с другими базами).
- Редактируйте много разных областей, не только свою.

**Dawn Anderson:**
- "Сделайте что-то notable. Попадание в Wikipedia не гарантировано никому."

**Jason Barnard:**
- Предупреждение: если создадите недостойную запись или переусердствуете с редактированием — получите warning или удаление. Восстановление очень сложно.

**Greg Niland:**
- HARO (Help A Reporter Out) — получите упоминания в авторитетных СМИ, которые потом можно использовать как citations в Wikipedia.

### 5.2 Как избежать редактирования своей записи

- Идите в Talk tab, опишите неточности и попросите кого-то внести изменения.

---

## **Глава 6. How to Be an Entity Without Wikipedia**

### 6.1 Через связи с существующими entities

- Пример: Kasmira Cooke (сестра Freddie Mercury) — нет страницы в Wikipedia, но Google создал entity из упоминания на странице Mercury.
- Трiples:
  - Freddie Mercury (is the brother of) Kasmira Bulsara
  - Kasmira Bulsara (is a type of) Person
  - Kasmira Bulsara (is the same as) Kasmira Cooke

### 6.2 Тактики

- **Hire a Chair/Patron:** Princess Anne поддерживает 9 страниц благотворительных организаций — каждая получает связь.
- **Unique Brand Name:** Уникальность помогает KG быстрее достичь confidence.
- **Google Business Profile (бывш. Google My Business):** Launchpad для организаций.
- **Write a book with ISBN:** Попадание в book ontologies.
- **IMDB:** Актёры и режиссёры.
- **Political office:** Конгрессмены автоматически entities.
- **Festival circuit:** Группы на Glastonbury/Reading получают связь с этими entities.

---

## **Глава 7. Align Online Presence with Niche**

### 7.1 Сайт как Personal Knowledge Graph

- Каждый digital asset — node в вашем графе.
- Связи (links) должны быть не только на сайте, но между всеми digital assets (X, YouTube, Instagram, LinkedIn).

---

## **Глава 8. Creating Digital Assets**

### 8.1 Типы digital assets

- **Website pages:** cornerstone content.
- **YouTube videos:** Отдельный data source для Google.
- **Images:** Могут появляться в Knowledge Panel.
- **X (бывш. Twitter):** Связанные аккаунты показывают posts в SERP.
- **Ratings/Reviews:** structured data для оценки качества.

### 8.2 Связи между assets

- Внутренние ссылки между страницами (Wikipedia-стиль).
- Cross-references помогают Google понять связи.

---

## **Глава 9. Structured Markup**

### 9.1 Webpage Schema

- JSON-LD — preferred format.
- **about schema:** О чём страница.
- **mentions schema:** Что упоминается.

### 9.2 Как использовать

1. Проверить structured data конкурентов через Structured Data Testing Tool.
2. Проверить, есть ли их бренд в Knowledge Graph через KG Search API.
3. Автоматизация через Inlinks или плагины (Yoast).

---

## **Главы 10-12. Internal Links**

### 10.1 Почему важны

- **Discovery:** Googlebot находит страницы через ссылки.
- **Authority:** PageRank распределяется через links.
- **Context:** Links в body text дают понимание семантических связей.

> "Links within the body of a piece of content carry more context and meaning than links in navigation menus."

### 10.2 Manual процесс

1. Определить cornerstone content для keyword.
2. Найти mentions через site:search.
3. Связать mentions с cornerstone.
4. Повторить с синонимами.

### 10.3 Anchor text

- Не использовать "click here" — это не даёт context.
- Использовать descriptive anchor text.
- Но не overdo exact match — выглядит манипулятивно.

### 10.4 Silo structure

- Level 1: Landing/cornerstone page (head of silo).
- Level 2: Intermediate pages.
- Level 3: Detail pages (link to L1, L2 but don't receive links).

---

## **Глава 13. Search Engine Understanding (SEU)**

### 13.1 Что это

- Анализ способности NLP API распознать entities на странице.
- Сравнение Google NLP API с Inlinks NLP API.
- Процент совпадения = SEU score.

### 13.2 Цель

- Переформулировать контент так, чтобы Google легче извлекал правильные topics.
- Не нужно стремиться к 100% — best of breed ~18%, в education ~34%.

---

## **Ключевые тезисы**

1. **Entity > Keyword:** SEO переходит от оптимизации под слова к оптимизации под сущности.
2. **Knowledge Graph — центральная структура:** Понимание triples и vectors критично для современного SEO.
3. **Wikipedia — trusted seed set:** Но не единственный путь к entity status.
4. **Связи создают entities:** Можно стать entity через verified connections с существующими entities.
5. **Structured Data ускоряет понимание:** JSON-LD помогает Google быстрее распознать entities на странице.
6. **Internal linking = mini Knowledge Graph:** Связывает concepts с cornerstone content.
7. **Digital assets работают вместе:** Сайт, YouTube, Twitter, images — все должны быть связаны и консистентны.
8. **Edge strategy:** Если не можете владеть entity — станьте экспертом по связям с ней.
