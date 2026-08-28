#!/usr/bin/env bash
# OCI Ampere 在庫不足時に apply をリトライする。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TF_DIR="$ROOT/infra/terraform/environments/beginner"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-30}"
WAIT_SECONDS="${WAIT_SECONDS:-60}"

run_tf() {
  docker run --rm \
    -v "$ROOT/infra/terraform:/workspace" \
    -v "$HOME/.oci:/root/.oci:ro" \
    -w /workspace/environments/beginner \
    hashicorp/terraform:1.9 "$@"
}

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  echo "==> attempt $attempt/$MAX_ATTEMPTS"
  if run_tf apply -auto-approve -no-color; then
    if run_tf output -raw fe_vm_public_ip 2>/dev/null | grep -qE '^[0-9]+\.'; then
      echo "VMs created."
      run_tf output
      exit 0
    fi
  fi
  echo "retry in ${WAIT_SECONDS}s..."
  sleep "$WAIT_SECONDS"
done

echo "failed after $MAX_ATTEMPTS attempts (Out of host capacity?)" >&2
exit 1
