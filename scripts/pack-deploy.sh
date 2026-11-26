#!/usr/bin/env bash
# Packs a ready-to-run deploy bundle (deploy.tar.gz) after `pnpm build`:
# the Next.js standalone server with its traced node_modules, static files, the bundled worker and migrator,
# and the migrations. The server only unpacks it (scripts/cpanel/deploy.sh): no install, no build.
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/build-scripts.mjs

out=deploy-bundle
rm -rf "$out" deploy.tar.gz
cp -a .next/standalone "$out"
mkdir -p "$out/.next"
cp -a .next/static "$out/.next/static"
[ -d public ] && cp -a public "$out/public"
cp dist-scripts/worker.mjs dist-scripts/migrate.mjs dist-scripts/seed.mjs dist-scripts/admin.mjs "$out/"
cp scripts/cpanel/app.js "$out/app.js"
mkdir -p "$out/prisma"
cp -a prisma/migrations "$out/prisma/migrations"
# The build machine's .env (if any) must never ship; the server keeps its own.
rm -f "$out"/.env "$out"/.env.*
git rev-parse HEAD > "$out/VERSION" 2>/dev/null || echo unknown > "$out/VERSION"

tar -czf deploy.tar.gz -C "$out" .
echo "deploy.tar.gz: $(du -h deploy.tar.gz | cut -f1), version $(cat "$out/VERSION")"
