#!/bin/bash
# Rotate the AKSes (KSEI) bearer token (KUR-40).
#
# Usage:
#   scripts/rotate-ksei-token.sh <JWT>          # pass token as arg
#   pbpaste | scripts/rotate-ksei-token.sh      # or pipe it (macOS clipboard)
#
# Where to get the token: log in at https://akses.ksei.co.id/myportofolio/saldo,
# open devtools → Network → any /service/myportofolio request → copy the
# Authorization: Bearer <JWT> header value.
#
# Effects:
#   1. Validates the JWT shape + exp, writes gitignored data/ksei.json
#   2. Restarts the PM2 app so KSEI_BEARER_TOKEN (injected from the file by
#      ecosystem.config.cjs at boot) picks it up
set -euo pipefail
cd "$(dirname "$0")/.."

TOKEN="${1:-}"
if [ -z "$TOKEN" ] && [ -p /dev/stdin ]; then
  TOKEN="$(cat)"
fi
TOKEN="$(printf '%s' "$TOKEN" | tr -d '[:space:]"')"

if [ -z "$TOKEN" ]; then
  echo "ERROR: no token given (arg or stdin)." >&2
  exit 1
fi

# Basic JWT shape check: 3 dot-separated base64 segments
SEGMENTS="$(printf '%s' "$TOKEN" | tr -cd '.' | wc -c | tr -d ' ')"
if [ "$SEGMENTS" != "2" ]; then
  echo "ERROR: token does not look like a JWT (expected 3 segments, got $((SEGMENTS + 1)))." >&2
  exit 1
fi

# Decode exp and report
PAYLOAD="$(printf '%s' "$TOKEN" | cut -d. -f2 | tr '_-' '/+' | awk '{ l = length($0) % 4; pad = (l ? 4 - l : 0); printf "%s%0" pad "d", $0, 0 }')"
EXP="$(printf '%s' "$PAYLOAD" | base64 -d 2>/dev/null | sed -n 's/.*"exp":\([0-9]*\).*/\1/p' | head -1)"
NOW="$(date +%s)"
if [ -n "$EXP" ] && [ "$EXP" -le "$NOW" ]; then
  echo "ERROR: token already expired (exp=$EXP)." >&2
  exit 1
fi

UPDATED="$(date +%Y-%m-%d)"
EXPIRY_HUMAN=""
if [ -n "$EXP" ]; then
  EXPIRY_HUMAN="$(date -r "$EXP" '+%Y-%m-%d %H:%M %Z' 2>/dev/null || echo "exp=$EXP")"
fi

cat > data/ksei.json <<EOF
{
  "token": "$TOKEN",
  "note": "AKSes (KSEI) Bearer token — grab from akses.ksei.co.id myportofolio devtools. Rotate with scripts/rotate-ksei-token.sh.",
  "updated": "$UPDATED",
  "expires": "$EXPIRY_HUMAN"
}
EOF
echo "Wrote data/ksei.json (expires: ${EXPIRY_HUMAN:-unknown})."

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart financial-dashboard --update-env && echo "PM2 restarted with new token."
else
  echo "pm2 not found here — restart financial-dashboard manually to refresh KSEI_BEARER_TOKEN."
fi
