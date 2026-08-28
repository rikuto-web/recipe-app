#!/usr/bin/env bash
# 明日 8:30 まで Mac のスリープを抑止（cron / Docker 用）。成功後は手動で止めてよい。
set -euo pipefail

export PATH="/usr/bin:/bin"

LOG="${HOME:-/Users/sinya}/Library/Logs/recipe-oci-hourly-retry.log"
TARGET_EPOCH=$(date -j -f '%Y-%m-%d %H:%M:%S' '2026-08-25 08:30:00' '+%s')
NOW_EPOCH=$(date '+%s')
SECONDS=$((TARGET_EPOCH - NOW_EPOCH))

if [[ "$SECONDS" -le 0 ]]; then
  echo "keep-awake: target time already passed"
  exit 0
fi

mkdir -p "$(dirname "$LOG")"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] keep-awake start (${SECONDS}s until 2026-08-25 08:30)" >>"$LOG"

# -i: アイドルスリープ防止, -s: AC 接続時のシステムスリープ防止
exec caffeinate -is -t "$SECONDS"
