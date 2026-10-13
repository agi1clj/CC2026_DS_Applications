#!/usr/bin/env bash
# Polls a URL until its response body contains the expected version string.
# Used by the deployment workflows: App Service needs time to pull the new image
# and restart the container, so the first requests may fail or return the old version.
#
# Usage: scripts/wait-for-version.sh <url> <expected-version> [attempts] [delay-seconds]
set -euo pipefail

url="$1"
expected="$2"
attempts="${3:-30}"
delay="${4:-20}"

for ((i = 1; i <= attempts; i++)); do
  body="$(curl --silent --show-error --fail --max-time 10 "$url" 2>&1 || true)"
  if [[ "$body" == *"$expected"* ]]; then
    echo "OK after attempt $i: $url reports version $expected"
    exit 0
  fi
  echo "Attempt $i/$attempts: $url not serving $expected yet (got: ${body:0:120})"
  sleep "$delay"
done

echo "::error::$url did not report version $expected after $attempts attempts"
exit 1
