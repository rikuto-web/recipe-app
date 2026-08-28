#!/usr/bin/env bash
# cron 用: terraform apply を試し、VM 作成成功時に後続 cron を削除する。
set -euo pipefail

export HOME="${HOME:-/Users/sinya}"
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"

ROOT="/Users/sinya/Developer/RaiseTech/ai_course/recipe-app"
LOG="${HOME}/Library/Logs/recipe-oci-hourly-retry.log"
MARKER="recipe-oci-hourly-retry"

mkdir -p "$(dirname "$LOG")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"
}

remove_cron() {
  if crontab -l 2>/dev/null | grep -q "$MARKER"; then
    crontab -l 2>/dev/null | grep -v "$MARKER" | crontab -
    log "removed remaining cron entries ($MARKER)"
  fi
  pkill -f 'caffeinate -is -t' 2>/dev/null || true
}

run_tf() {
  /usr/local/bin/docker run --rm \
    -v "$ROOT/infra/terraform:/workspace" \
    -v "$HOME/.oci:/root/.oci:ro" \
    -w /workspace/environments/beginner \
    hashicorp/terraform:1.9 "$@"
}

ensure_docker() {
  if /usr/local/bin/docker info >/dev/null 2>&1; then
    return 0
  fi
  log "Docker not running. Starting Docker Desktop..."
  open -a Docker
  for _ in $(seq 1 36); do
    sleep 5
    if /usr/local/bin/docker info >/dev/null 2>&1; then
      log "Docker is ready"
      return 0
    fi
  done
  log "ERROR: Docker did not start within 3 minutes"
  return 1
}

log "=== hourly retry start ==="

if ! ensure_docker; then
  exit 1
fi

if run_tf apply -auto-approve -no-color >>"$LOG" 2>&1; then
  fe_ip="$(run_tf output -raw fe_vm_public_ip 2>/dev/null || true)"
  if [[ "$fe_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    log "SUCCESS: VMs created. fe_vm_public_ip=$fe_ip"
    remove_cron
    log "starting deploy.sh ..."
    if "$ROOT/infra/deploy/deploy.sh" >>"$LOG" 2>&1; then
      log "SUCCESS: deploy finished. App: http://${fe_ip}/"
    else
      log "WARN: VMs created but deploy.sh failed. Run manually: bash infra/deploy/deploy.sh"
    fi
    exit 0
  fi
fi

log "still waiting (Out of host capacity or apply incomplete)"
exit 0
