#!/usr/bin/env bash
set -euo pipefail
test -f /var/www/ls-portal/index.html
echo "index.html present."
