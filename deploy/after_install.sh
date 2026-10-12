#!/usr/bin/env bash
# Publishes the new frontend build to /var/www/ls-portal and keeps the
# previous version in /var/www/ls-portal.prev for a quick manual rollback.
set -euo pipefail

RELEASE=/home/ubuntu/app/releases/frontend
WEB=/var/www/ls-portal

if [ ! -f "$RELEASE/index.html" ]; then
  echo "ERROR: build output has no index.html"
  exit 1
fi

rm -rf "${WEB}.prev"
if [ -d "$WEB" ]; then cp -a "$WEB" "${WEB}.prev"; fi
mkdir -p "$WEB"
rsync -a --delete "$RELEASE"/ "$WEB"/
chmod -R a+rX "$WEB"
echo "Frontend published."
