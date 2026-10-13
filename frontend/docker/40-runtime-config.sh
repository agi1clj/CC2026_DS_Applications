#!/bin/sh
# Generates /usr/share/nginx/html/config.js from the API_BASE_URL environment variable.
# The official Nginx entrypoint runs every executable script in /docker-entrypoint.d/
# before starting Nginx, so the same image works locally and in Azure.
set -eu

API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"

# Accept only a plain http(s) URL so the value cannot inject JavaScript.
if ! printf '%s' "$API_BASE_URL" | grep -Eq '^https?://[A-Za-z0-9.:/_-]+$'; then
  echo "40-runtime-config.sh: invalid API_BASE_URL '$API_BASE_URL'" >&2
  exit 1
fi

# Strip a trailing slash so the app can append /api/data safely.
API_BASE_URL="${API_BASE_URL%/}"

printf 'window.APP_CONFIG = { API_BASE_URL: "%s" };\n' "$API_BASE_URL" > /usr/share/nginx/html/config.js
echo "40-runtime-config.sh: API_BASE_URL=$API_BASE_URL"
