#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_github}"
SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new)

TF_DIR="$ROOT/infra/terraform/environments/beginner"
DEPLOY_SHAPE=""

require() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing command: $1" >&2
    exit 1
  }
}

is_micro_shape() {
  [[ "$DEPLOY_SHAPE" == *"Micro"* ]] || [[ "$DEPLOY_SHAPE" == *"E2"* ]]
}

terraform_outputs() {
  docker run --rm \
    -v "$ROOT/infra/terraform:/workspace" \
    -v "$HOME/.oci:/root/.oci:ro" \
    -w /workspace/environments/beginner \
    hashicorp/terraform:1.9 output -json
}

detect_shape() {
  DEPLOY_SHAPE="$(grep -E '^compute_shape' "$TF_DIR/terraform.tfvars" 2>/dev/null | sed -n 's/.*= *"\([^"]*\)".*/\1/p' || echo "VM.Standard.A1.Flex")"
  export DEPLOY_SHAPE
}

build_artifacts() {
  local bin
  detect_shape

  if is_micro_shape; then
    echo "==> build backend (linux/x86_64 musl for $DEPLOY_SHAPE via Docker)"
    docker run --rm --platform linux/amd64 \
      -v "$ROOT/backend:/app" \
      -w /app rust:1-alpine \
      sh -c "apk add --no-cache musl-dev && rustup target add x86_64-unknown-linux-musl && cargo build --release --target x86_64-unknown-linux-musl"
    bin="$ROOT/backend/target/x86_64-unknown-linux-musl/release/recipe-backend"
  else
    echo "==> build backend (linux/arm64 for $DEPLOY_SHAPE)"
    (cd "$ROOT/backend" && cargo build --release)
    bin="$ROOT/backend/target/release/recipe-backend"
  fi
  export DEPLOY_BACKEND_BIN="$bin"

  echo "==> build frontend"
  (cd "$ROOT/frontend" && VITE_API_BASE_URL="" pnpm build)
}

ensure_swap() {
  local ip="$1"
  echo "==> ensure swap on $ip (E2.1.Micro has ~1 GB RAM)"
  ssh "${SSH_OPTS[@]}" "opc@$ip" 'if ! swapon --show | grep -q /swapfile; then
    sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    grep -q "^/swapfile" /etc/fstab || echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
  fi'
}

configure_app_vm() {
  local app_ip="$1"
  if is_micro_shape; then
    ensure_swap "$app_ip"
  fi
  ssh "${SSH_OPTS[@]}" "opc@$app_ip" 'sudo firewall-cmd --permanent --add-service=http && sudo firewall-cmd --reload'
  ssh "${SSH_OPTS[@]}" "opc@$app_ip" 'sudo setsebool -P httpd_can_network_connect 1'
  ssh "${SSH_OPTS[@]}" "opc@$app_ip" 'python3 - <<"PY"
from pathlib import Path
text = Path("/etc/nginx/nginx.conf").read_text()
out, skip, depth = [], 0, 0
for line in text.splitlines(True):
    if skip == 0 and line.strip().startswith("server ") and "{" in line:
        skip, depth = 1, line.count("{") - line.count("}")
        continue
    if skip:
        depth += line.count("{") - line.count("}")
        if depth <= 0:
            skip = 0
        continue
    out.append(line)
Path("/tmp/nginx.conf").write_text("".join(out))
PY
sudo cp /tmp/nginx.conf /etc/nginx/nginx.conf'
}

deploy_api() {
  local app_ip="$1"
  local bin="${DEPLOY_BACKEND_BIN:-$ROOT/backend/target/release/recipe-backend}"

  echo "==> deploy backend on app-vm ($app_ip)"
  ssh "${SSH_OPTS[@]}" "opc@$app_ip" 'sudo mkdir -p /opt/recipe-app/data && sudo chown -R opc:opc /opt/recipe-app'
  scp "${SSH_OPTS[@]}" "$bin" "opc@$app_ip:/opt/recipe-app/recipe-backend"
  scp "${SSH_OPTS[@]}" "$ROOT/infra/deploy/recipe-backend.service" "opc@$app_ip:/tmp/recipe-backend.service"

  ssh "${SSH_OPTS[@]}" "opc@$app_ip" 'sudo mv /tmp/recipe-backend.service /etc/systemd/system/recipe-backend.service && sudo systemctl daemon-reload && sudo systemctl enable --now recipe-backend && sudo systemctl restart recipe-backend'
}

deploy_fe_micro() {
  local app_ip="$1"

  ssh "${SSH_OPTS[@]}" "opc@$app_ip" 'sudo mkdir -p /opt/recipe-app/frontend && sudo chown -R opc:opc /opt/recipe-app'

  rsync -az --delete -e "ssh ${SSH_OPTS[*]}" \
    "$ROOT/frontend/dist/" "opc@$app_ip:/opt/recipe-app/frontend/dist/"
  scp "${SSH_OPTS[@]}" "$ROOT/frontend/package.json" "opc@$app_ip:/opt/recipe-app/frontend/package.json"
  scp "${SSH_OPTS[@]}" "$ROOT/frontend/pnpm-lock.yaml" "opc@$app_ip:/opt/recipe-app/frontend/pnpm-lock.yaml"
  scp "${SSH_OPTS[@]}" "$ROOT/infra/deploy/server.mjs" "opc@$app_ip:/opt/recipe-app/frontend/server.mjs"
  scp "${SSH_OPTS[@]}" "$ROOT/infra/deploy/recipe-frontend.service" "opc@$app_ip:/tmp/recipe-frontend.service"
  scp "${SSH_OPTS[@]}" "$ROOT/infra/deploy/nginx-recipe.conf" "opc@$app_ip:/tmp/recipe.conf"

  echo "==> install Node.js on app-vm (one package at a time)"
  ssh "${SSH_OPTS[@]}" "opc@$app_ip" 'curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -'
  ssh "${SSH_OPTS[@]}" "opc@$app_ip" 'sudo dnf install -y nodejs'
  ssh "${SSH_OPTS[@]}" "opc@$app_ip" 'sudo dnf install -y nginx'

  echo "==> install production deps on app-vm"
  ssh "${SSH_OPTS[@]}" "opc@$app_ip" 'cd /opt/recipe-app/frontend && sudo corepack enable && NODE_OPTIONS=--max-old-space-size=512 pnpm install --prod --frozen-lockfile'

  ssh "${SSH_OPTS[@]}" "opc@$app_ip" 'sudo mv /tmp/recipe.conf /etc/nginx/conf.d/recipe.conf && sudo rm -f /etc/nginx/conf.d/default.conf && sudo nginx -t && sudo mv /tmp/recipe-frontend.service /etc/systemd/system/recipe-frontend.service && sudo systemctl daemon-reload && sudo systemctl enable --now recipe-frontend nginx && sudo systemctl restart recipe-frontend nginx'
}

deploy_fe_standard() {
  local app_ip="$1"

  ssh "${SSH_OPTS[@]}" "opc@$app_ip" 'sudo dnf install -y nginx && sudo systemctl enable nginx'

  rsync -az --delete -e "ssh ${SSH_OPTS[*]}" \
    "$ROOT/frontend/dist/" "opc@$app_ip:/opt/recipe-app/frontend/dist/"
  rsync -az --delete -e "ssh ${SSH_OPTS[*]}" \
    "$ROOT/frontend/node_modules/" "opc@$app_ip:/opt/recipe-app/frontend/node_modules/"
  scp "${SSH_OPTS[@]}" "$ROOT/frontend/package.json" "opc@$app_ip:/opt/recipe-app/frontend/package.json"
  scp "${SSH_OPTS[@]}" "$ROOT/infra/deploy/server.mjs" "opc@$app_ip:/opt/recipe-app/frontend/server.mjs"
  scp "${SSH_OPTS[@]}" "$ROOT/infra/deploy/recipe-frontend.service" "opc@$app_ip:/tmp/recipe-frontend.service"
  scp "${SSH_OPTS[@]}" "$ROOT/infra/deploy/nginx-recipe.conf" "opc@$app_ip:/tmp/recipe.conf"

  ssh "${SSH_OPTS[@]}" "opc@$app_ip" 'curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash - && sudo dnf install -y nodejs'
  ssh "${SSH_OPTS[@]}" "opc@$app_ip" 'sudo mkdir -p /opt/recipe-app/frontend && sudo chown -R opc:opc /opt/recipe-app && sudo mv /tmp/recipe.conf /etc/nginx/conf.d/recipe.conf && sudo rm -f /etc/nginx/conf.d/default.conf && sudo nginx -t && sudo mv /tmp/recipe-frontend.service /etc/systemd/system/recipe-frontend.service && sudo systemctl daemon-reload && sudo systemctl enable --now recipe-frontend nginx && sudo systemctl restart recipe-frontend nginx'
}

deploy_fe() {
  local app_ip="$1"

  echo "==> deploy frontend on app-vm ($app_ip)"
  if is_micro_shape; then
    deploy_fe_micro "$app_ip"
  else
    deploy_fe_standard "$app_ip"
  fi
}

main() {
  require docker
  require cargo
  require pnpm
  require rsync
  require ssh
  require scp

  build_artifacts

  local outputs app_ip
  outputs="$(terraform_outputs)"
  app_ip="$(echo "$outputs" | python3 -c 'import json,sys; print(json.load(sys.stdin)["fe_vm_public_ip"]["value"])')"

  [[ -n "$app_ip" && "$app_ip" != "null" ]] || { echo "fe_vm_public_ip missing. run terraform apply first."; exit 1; }

  configure_app_vm "$app_ip"
  deploy_api "$app_ip"
  deploy_fe "$app_ip"

  echo
  echo "Deployed: http://$app_ip/"
  echo "Health:   curl http://$app_ip/health"
}

main "$@"
