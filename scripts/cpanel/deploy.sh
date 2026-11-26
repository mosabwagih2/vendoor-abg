#!/usr/bin/env bash
# Deploys the prebuilt bundle that CI publishes as a GitHub release, on a small cPanel host.
# Nothing is installed or built here (shared plans kill `pnpm install` and `next build` at 1 GB).
#
#   bash scripts/cpanel/deploy.sh            # release for the branch this checkout is on
#   bash scripts/cpanel/deploy.sh deploy-main
#
# Keeps in the app folder: .env, storage/, tmp/, *.log. Replaces everything the bundle ships.
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/tracker}"
NODE_ENV_DIR="${NODE_ENV_DIR:-$HOME/nodevenv/tracker/22}"
RELEASES="${RELEASES:-$HOME/tracker-releases}"
REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

repo_slug() {
  git -C "$REPO_DIR" config --get remote.origin.url | sed -E 's#(\.git)?$##; s#^.*github\.com[:/]##'
}

if [ $# -ge 1 ]; then
  TAG="$1"
else
  branch="$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD)"
  TAG="deploy-$(echo "$branch" | tr '/' '-')"
fi
SLUG="${REPO_SLUG:-$(repo_slug)}"
URL="https://github.com/$SLUG/releases/download/$TAG/deploy.tar.gz"

# The CloudLinux node selector's `activate` script is not `set -u` safe; putting its bin first on PATH is enough.
if [ -x "$NODE_ENV_DIR/bin/node" ]; then
  PATH="$NODE_ENV_DIR/bin:$PATH"
fi
command -v node >/dev/null || { echo "[deploy] node not found"; exit 1; }

mkdir -p "$RELEASES" "$APP_DIR"
echo "[deploy] downloading $URL"
curl -fsSL --retry 3 -o "$RELEASES/incoming.tar.gz" "$URL"

new="$RELEASES/incoming"
rm -rf "$new" && mkdir -p "$new"
tar -xzf "$RELEASES/incoming.tar.gz" -C "$new"
version="$(cat "$new/VERSION")"
head="$(git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null || echo unknown)"
echo "[deploy] bundle $version"
if [ "$head" != "unknown" ] && [ "$version" != "$head" ]; then
  echo "[deploy] WARNING: the bundle is $version but this checkout is at $head."
  echo "[deploy]          CI may still be building the newest commit; deploy again when it finishes."
fi

[ -f "$APP_DIR/.env" ] || { echo "[deploy] $APP_DIR/.env is missing; create it first (see docs/deploy-cpanel.md)"; exit 1; }

echo "[deploy] migrating"
(cd "$APP_DIR" && node "$new/migrate.mjs" "$new/prisma/migrations")

echo "[deploy] switching files"
for item in .next node_modules public prisma server.js app.js worker.mjs migrate.mjs seed.mjs admin.mjs package.json VERSION; do
  rm -rf "${APP_DIR:?}/$item"
  if [ -e "$new/$item" ]; then mv "$new/$item" "$APP_DIR/$item"; fi
done
mkdir -p "$APP_DIR/tmp" "$APP_DIR/storage"
touch "$APP_DIR/tmp/restart.txt"
rm -rf "$new" "$RELEASES/incoming.tar.gz"
echo "[deploy] done: $version is live"
