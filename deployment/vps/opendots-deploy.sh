#!/usr/bin/env bash
# Deploys main of this repository on the server. Run by the GitHub Actions key,
# which authorized_keys pins to this script; any command it sends is ignored.
set -euo pipefail
exec 9>/var/lock/opendots-deploy.lock
flock -n 9 || { echo "Outro deploy já está rodando."; exit 1; }
exec > >(tee -a /var/log/opendots-deploy.log) 2>&1
echo "=== deploy $(date -Is)"
cd /opt/opendots
git fetch --quiet origin main
before=$(git rev-parse --short HEAD)
git merge --ff-only --quiet origin/main
after=$(git rev-parse --short HEAD)
echo "commit: $before -> $after ($(git log -1 --format=%s))"
docker compose up -d --build app
docker image prune -f >/dev/null
# 401 means the server is up and asking for the owner token.
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4310/api/state || true)
  [ "$code" = 401 ] && { echo "OK: app respondendo ($after)"; exit 0; }
  sleep 2
done
echo "FALHOU: app não respondeu (último status: $code)"
docker logs --tail 30 opendots-app-1
exit 1
