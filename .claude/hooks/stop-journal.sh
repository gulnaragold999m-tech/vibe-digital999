#!/bin/bash
# Напоминание дописать журнал, когда чат собирается закончить.
#
# ЗАЧЕМ. Правило «перед словом готово допиши TASKS.md» записано в CLAUDE.md,
# но правило можно не выполнить — и его уже не выполняли. Хук проверяет
# фактом: менялись файлы за беседу или нет, и дописан ли журнал.
#
# Напоминает ОДИН раз за беседу и никогда не мешает дважды: бесконечно
# держать чат хуком хуже, чем недописанная строчка в журнале.
set -euo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" 2>/dev/null || exit 0

INPUT=$(cat 2>/dev/null || true)
# Чат уже продолжен этим же хуком — второй раз не трогаем.
case "$INPUT" in *'"stop_hook_active":true'*|*'"stop_hook_active": true'*) exit 0 ;; esac

MARK=.git/claude-journal-reminded
[ -f "$MARK" ] && exit 0

START=$(cat .git/claude-session-start-sha 2>/dev/null || true)
HEAD=$(git rev-parse HEAD 2>/dev/null || true)

COMMITTED=""
if [ -n "$START" ] && [ -n "$HEAD" ] && [ "$START" != "$HEAD" ]; then
  COMMITTED=$(git diff --name-only "$START" "$HEAD" 2>/dev/null || true)
fi
DIRTY=$(git status --porcelain 2>/dev/null | cut -c4- || true)

CHANGED=$(printf '%s\n%s\n' "$COMMITTED" "$DIRTY" | sed '/^$/d' | sort -u)

# Ничего не трогали — записывать нечего, молчим.
[ -z "$CHANGED" ] && exit 0

# Журнал уже дописан — молчим.
printf '%s\n' "$CHANGED" | grep -qx 'TASKS.md' && exit 0

touch "$MARK" 2>/dev/null || true

{
  echo "ЖУРНАЛ НЕ ДОПИСАН. За эту беседу менялись файлы:"
  printf '%s\n' "$CHANGED" | head -12 | sed 's/^/  /'
  echo
  echo "TASKS.md среди них нет. Следующий чат не увидит, что здесь было,"
  echo "и переделает заново — так уже вышло 11.08.2026."
  echo
  echo "Допиши в TASKS.md блок по шаблону из CLAUDE.md: цель дня, сделано,"
  echo "где остановились, что ждём от Гульнары, что не доделано."
  echo "Галочку [x] ставь только тому, что видно на живом сайте."
  echo "Потом закоммить и запушь. Напоминаю один раз."
} >&2
exit 2
