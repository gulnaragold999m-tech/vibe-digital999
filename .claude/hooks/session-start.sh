#!/bin/bash
# Памятка проекта в начало каждой беседы.
#
# ЗАЧЕМ. Правила лежат в CLAUDE.md, но чат читает тот CLAUDE.md, который
# оказался в его ветке, — а ветки расходятся. 11.08.2026 из-за этого один
# чат собрал второй генератор страниц поверх существующего. Хук печатает
# памятку независимо от ветки: пропустить её нельзя.
set -euo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" 2>/dev/null || exit 0

# Запоминаем, с чего беседа началась: по этому снимку Stop-хук поймёт,
# менялось ли что-нибудь и дописан ли журнал.
git rev-parse HEAD > .git/claude-session-start-sha 2>/dev/null || true
rm -f .git/claude-journal-reminded 2>/dev/null || true

BRANCH=$(git branch --show-current 2>/dev/null || echo 'неизвестна')

# Живую ветку не вписываем сюда числом: она меняется. Берём строкой
# из STATUS.md — обновили там, обновилось и здесь.
LIVE=$(grep -m1 'На живом сайте сейчас ветка' STATUS.md 2>/dev/null | tr -d '*`' || true)
[ -z "$LIVE" ] && LIVE='Какая ветка на живом сайте — смотри STATUS.md.'

MEMO=$(cat <<TXT
ПАМЯТКА ПРОЕКТА vibe-digital999 — печатает хук, до первой правки.

1. Прочитай ТРИ файла: CLAUDE.md (правила), STATUS.md (где что лежит,
   карта веток), TASKS.md (журнал по дням, где остановились).
   Не спрашивай владелицу про устройство проекта — всё записано там.

2. Правила могли обновить в другой ветке. Проверь у себя:
   git fetch origin && git log --all -1 --format='%h %d' -- CLAUDE.md
   Нашлась свежее — работай по ней, свою не считай последней.

3. ${LIVE}
   main на сайт не выкатывать: там вторая, лишняя система сборки.

4. Выкатка — два шага, fetch строго первым:
   git fetch origin <ветка>
   git push --force amvera origin/<ветка>:master

5. Страницы правятся в src/, не в public/. Собранное в public/ руками
   не чистить: prestart стоит с "|| true", сломанная сборка проходит
   молча, и эти файлы — единственная страховка сайта.

6. Перед словом «готово» допиши TASKS.md по шаблону из CLAUDE.md:
   цель дня, сделано, где остановились, что ждём от Гульнары, что не
   доделано. Незаписанное для следующего чата не существует.

Твоя ветка: ${BRANCH}
TXT
)

python3 - "$MEMO" <<'PY' 2>/dev/null || printf '%s\n' "$MEMO"
import json, sys
print(json.dumps({"hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": sys.argv[1],
}}, ensure_ascii=False))
PY
