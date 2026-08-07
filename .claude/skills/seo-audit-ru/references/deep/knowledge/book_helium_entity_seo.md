# Entity SEO: The Definitive Guide (Helium)

**Название:** Entity SEO: The Definitive Guide
**Автор:** Helium SEO
**Год издания:** 2023
**Жанр:** SEO / Semantic Search
**Дата конспекта:** 2025-12-23

---

## **Трансформирующие идеи**

### 1. "Things, not strings" — новая парадигма поиска

> "Google understands things and is no longer a simple keyword detection algorithm."

- В мае 2012 Google представил Knowledge Graph — переход от ключевых слов к сущностям.
- Entity SEO — будущее поисковой оптимизации.
- **Почему это важно:** Keyword stuffing мёртв. Нужно думать о сущностях и их связях.

### 2. Что такое Entity (Сущность)

**Определение:**
> "An entity is a uniquely identifiable object or thing characterized by its name(s), type(s), attributes, and relationships to other entities."

**Примеры сущностей:**
- Люди (Freddie Mercury, Albert Einstein)
- Места (Париж, Google HQ)
- Организации (Google, NASA)
- Концепции и идеи (демократия, SEO)

**Каталоги сущностей:**
- Wikipedia / Wikidata
- DBpedia
- Freebase (поглощён Google)
- Yago Knowledge Graph

### 3. Knowledge Graph — "словарь Google"

- **2010:** Google покупает Freebase.
- **2012:** Объединение с Wikidata.
- **Сегодня:** 8 миллиардов сущностей и 800 миллиардов фактов.

**Эволюция:**
```
2010: 570 млн сущностей, 18 млрд фактов
2023: 8 млрд сущностей, 800 млрд фактов
```

Schema.org — партнёрство Google, Bing, Yahoo для разметки контента.

### 4. Почему Entity Model лучше Keyword Model

**Проблема keyword-based retrieval:**
- Не находит релевантные документы без точного совпадения слов.
- Ctrl+F на странице — это старая модель поиска.

**Решения (по Krisztian Balog):**

| Подход | Описание |
|--------|----------|
| **Expansion-based** | Расширение запроса связанными терминами |
| **Projection-based** | Проекция запроса и документа в entity space |
| **Entity-based** | Явные семантические представления в пространстве сущностей |

### 5. Три типа структур данных

| Тип | Описание | Пример |
|-----|----------|--------|
| **Unstructured** | Текст без разметки | Блог-посты |
| **Semi-structured** | Частичная структура + ссылки | Wikipedia |
| **Structured** | RDF triples, JSON-LD | Knowledge Graph, Schema.org |

**Важно:** Entity linking связывает неструктурированный текст с записями в Knowledge Base.

### 6. Wikipedia как фреймворк для Entity SEO

**Структура страницы Wikipedia:**
1. **Title** — название сущности
2. **Lead section:**
   - Disambiguation links
   - Infobox (ключевые факты)
   - Introductory text (определение)
3. **Table of contents**
4. **Body content** — с внутренними ссылками
5. **Appendices:** references, external links, categories

**Ключевое правило:** Первое предложение = определение сущности.

### 7. Как оптимизировать для сущностей

**Чек-лист:**

1. ✅ Семантически связанные слова на странице
2. ✅ Правильная частота слов и фраз
3. ✅ Логическая организация концепций
4. ✅ Structured data (Schema.org)
5. ✅ Subject-Predicate-Object пары (SPO)
6. ✅ Страницы сайта работают как главы книги
7. ✅ Известные атрибуты сущностей включены

**Disambiguation — критически важен:**
> "Every word, sentence, and paragraph matter when talking about an entity."

Три типа evidence для disambiguation:
- Prior importance of entities
- Schema markup
- Entity annotations

### 8. Кластеризация интентов

**Три типа similarity:**
- Lexical similarity (лексическое сходство)
- Semantic similarity (смысловое сходство)
- Click similarity (поведенческое сходство)

**Правило:**
> "Your documents should contain as many search intent variations as possible. Your website should contain every search intent variation for your cluster."

### 9. Topic Coverage — шаблон покрытия темы

```
Что это → Список атрибутов → Раздел для каждого атрибута →
Ссылка на отдельную статью по атрибуту → Определение аудитории →
Что учитывать? → Преимущества → Как получить → Как сделать →
Кто может это сделать → Ссылки на категории
```

### 10. Beyond SEO Tools — уникальный контент

**Проблема SEO-инструментов:**
> "Most on-page tools are just aggregating the top SERP results and creating an average for you to emulate."

**Решение:**
- Google ценит **новую информацию**, которой нет у других.
- Если ты добавляешь уникальные факты в Knowledge Base — становишься authority.
- Используй Wikipedia как отправную точку, но добавляй глубину.

---

## **Практические инструменты**

### Google Cloud Natural Language API

- Показывает salience score (уверенность Google) для сущностей на странице.
- Типы: Person, Organization, Other.
- Используй для проверки — понимает ли Google твой контент так, как ты хочешь.

### Schema.org разметка

```json
{
  "@type": "Organization",
  "@id": "https://example.com/#organization",
  "name": "Example Corp",
  "sameAs": [
    "https://www.wikidata.org/wiki/Q12345",
    "https://en.wikipedia.org/wiki/Example_Corp"
  ]
}
```

**Эффект:** Явная связь контента с Knowledge Graph entries.

---

## **Ментальные модели**

### Semantic Triple

```
Subject → Predicate → Object
"Freddie Mercury" → "is lead singer of" → "Queen"
```

- Фундамент Knowledge Graph.
- Чем больше связей у сущности — тем она "сильнее".

### Entity Space vs Keyword Space

```
Keyword Space: точные совпадения слов
Entity Space: смысловые связи между концепциями
```

**Преимущество entity space:** Относительные улучшения 5-20% при использовании атрибутов, 25-100%+ при использовании type information.

---

## **Источники (упомянуты в книге)**

- **Entity-Oriented Search** — Krisztian Balog (научная основа)
- **Extended Named Entity Hierarchy** — Ketine, Sudo, Nobata
- **Google Patents:** Query Rewriting, Refining Search, Associating Entity with Query
- **Wikidata, DBpedia, Yago** — каталоги сущностей

---

## **Цитаты**

> "Entity SEO is the future of where search engines are headed with regard to choosing what content to rank."

> "The value of links extends beyond navigational purposes; they capture semantic relationships between articles."

> "Entities help to bridge the gap between the worlds of unstructured and structured data."

> "Don't just rehash. Add value. Be unique."

> "Google went from 570 million entities and 18 billion facts to 800 billion facts and 8 billion entities in less than 10 years."

---

## **Применение**

1. **При создании контента:** Думай как редактор Wikipedia — infobox, определение, связи, ссылки.
2. **При оптимизации:** Используй Google NLP API для проверки распознавания сущностей.
3. **При планировании структуры:** Один сайт = одна "книга" с главами (страницами).
4. **При добавлении уникальности:** Ищи то, что никто ещё не покрыл — станешь source of truth.
5. **При Schema.org разметке:** Используй sameAs для связи с Wikidata, Wikipedia.

---

## **Связи с другими знаниями**

- **Entity SEO (Dixon Jones):** Более глубокое погружение в теорию и практику.
- **The Art of SEO:** Knowledge Graph как часть Search Fundamentals.
- **Structured Data:** JSON-LD, RDFa, Microdata — инструменты entity optimization.

---

**Уровень:** Практический гайд
**Формат:** ~20 страниц, концентрированная информация
**Рекомендация:** Использовать как чек-лист при создании контента







