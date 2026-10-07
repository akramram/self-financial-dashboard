#!/bin/bash
# Capture raw AKSes (KSEI) drill-down fixtures (KUR-42 prep — KUR-143).
#
# Usage:
#   scripts/ksei-capture-fixtures.sh [TOKEN] [YYYY-MM-DD]
#     TOKEN  optional override — otherwise read from gitignored data/ksei.json
#            (same file scripts/rotate-ksei-token.sh writes)
#     DATE   optional EOD date override — otherwise walk back from today (WIB)
#            day by day while the baseline says "no snapshot yet" (max 7 days)
#
# What it does (KUR-42 prep — shape verification, NO parsing/typing here):
#   1. Checks the JWT exp FIRST (with the same 1h safety margin as
#      src/lib/kseiToken.ts). Expired → clear error, exit non-zero, and NOT A
#      SINGLE request is sent. Rotate via scripts/rotate-ksei-token.sh.
#   2. Hits the drill-down endpoints with the SAME base/headers as
#      src/lib/ksei.ts:
#        summary            /service/myportofolio/summary?type=&tanggal=<date>   (baseline pembanding)
#        equity-summary     /service/myportofolio/equity-summary?date=<date>
#        reksadana-summary  /service/myportofolio/reksadana-summary?date=<date>
#        reksadana          /service/myportofolio/reksadana?date=<date>&code=<first code found in #3, via jq>
#        summary-detail     /service/myportofolio/summary-detail/EKUITAS?tanggal=<date>
#   3. Saves each response body VERBATIM (raw, shape-agnostic — field names in
#      KUR-42 comments come from the minified SPA and have never been seen in a
#      200 response; no assumptions are made here) to
#      data/ksei-fixtures/<date>/<kind>.json  +  meta.json (status + capture
#      time per endpoint). The directory is gitignored: it contains private
#      portfolio data — NEVER commit it.
#   4. Prints a shape summary per endpoint: HTTP status + JSON key tree
#      (key names + types only; arrays show the first element). Values are
#      never printed and the bearer token is never echoed.
#
# 401/403 anywhere → "token ditolak, rotasi ulang", exit non-zero.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE='https://akses.ksei.co.id'
FIXTURE_ROOT='data/ksei-fixtures'
MAX_LOOKBACK_DAYS=7
TIMEOUT_SECS=15
# Mirror src/lib/kseiToken.ts isTokenExpired: exp minus 1h safety margin.
EXP_MARGIN_SECS=3600

ts() { TZ=Asia/Jakarta date '+%Y-%m-%dT%H:%M:%S%z'; }

# YYYY-MM-DD → previous day (BSD + GNU date)
step_back_date() {
  local d="$1" s
  if date -u -j -f '%Y-%m-%d' '1970-01-01' +%s >/dev/null 2>&1; then
    s=$(( $(date -u -j -f '%Y-%m-%d' "$d" +%s) - 86400 ))
    date -u -r "$s" '+%Y-%m-%d'
  else
    s=$(( $(date -u -d "$d 00:00:00" +%s) - 86400 ))
    date -u -d "@$s" '+%Y-%m-%d'
  fi
}

# ─── token (arg override → data/ksei.json). Never echoed. ────────────────────
TOKEN="${1:-}"
if [ -z "$TOKEN" ]; then
  if [ ! -f data/ksei.json ]; then
    echo "ERROR: no token given (arg 1) and data/ksei.json not found. Rotate via scripts/rotate-ksei-token.sh." >&2
    exit 1
  fi
  TOKEN="$(jq -r '.token // empty' data/ksei.json)"
fi
TOKEN="$(printf '%s' "$TOKEN" | tr -d '[:space:]\"')"
if [ -z "$TOKEN" ]; then
  echo "ERROR: token kosong. Rotate via scripts/rotate-ksei-token.sh." >&2
  exit 1
fi

# Basic JWT shape check (same as rotate-ksei-token.sh): 3 dot-separated segments
SEGMENTS="$(printf '%s' "$TOKEN" | tr -cd '.' | wc -c | tr -d ' ')"
if [ "$SEGMENTS" != "2" ]; then
  echo "ERROR: token does not look like a JWT (expected 3 segments, got $((SEGMENTS + 1)))." >&2
  exit 1
fi

# ─── exp check BEFORE any request goes out ──────────────────────────────────
PAYLOAD="$(printf '%s' "$TOKEN" | cut -d. -f2 | tr '_-' '/+' | awk '{ l = length($0) % 4; pad = (l ? 4 - l : 0); printf "%s%0" pad "d", $0, 0 }')"
EXP="$(printf '%s' "$PAYLOAD" | base64 -d 2>/dev/null | sed -n 's/.*"exp":\([0-9]*\).*/\1/p' | head -1)"
NOW="$(date +%s)"
if [ -n "$EXP" ] && [ "$((EXP - EXP_MARGIN_SECS))" -le "$NOW" ]; then
  echo "ERROR: token AKSes expired (exp=$EXP, sekarang=$NOW) — rotasi via scripts/rotate-ksei-token.sh. Tidak ada request dikirim." >&2
  exit 2
fi
if [ -n "$EXP" ]; then
  echo "Token OK (exp=$EXP, margin ${EXP_MARGIN_SECS}s ala kseiToken.ts)."
else
  echo "Token OK (exp tidak terbaca — diperlakukan valid, AKSes yang akan memutus)."
fi

# ─── fetch helper (same headers as src/lib/ksei.ts fetchKseiSummary) ─────────
HTTP_STATUS='000'
fetch_ep() { # $1 = url, $2 = outfile
  HTTP_STATUS="$(curl -sS -o "$2" -w '%{http_code}' --max-time "$TIMEOUT_SECS" \
    -H 'Accept: */*' \
    -H "Authorization: Bearer $TOKEN" \
    -H "Referer: $BASE/myportofolio/saldo" \
    -H 'User-Agent: Mozilla/5.0' \
    -H 'DNT: 1' \
    "$1" 2>/dev/null || echo 000)"
}

is_valid_json_file() { # $1 = file
  [ -s "$1" ] && jq -e . "$1" >/dev/null 2>&1
}

# ─── shape tree: key names + types only (arrays → first element). No values. ─
JQ_SHAPE='
def tree($ind):
  if type == "object" then
    (if length == 0 then "\($ind)(object kosong)"
     else
       to_entries[] |
       if (.value|type) == "object" then "\($ind)\(.key): object", (.value|tree($ind + "  "))
       elif (.value|type) == "array" then
         (if (.value|length) > 0
          then "\($ind)\(.key): array[\(.value|length)]", (.value[0]|tree($ind + "  "))
          else "\($ind)\(.key): array[0]" end)
       else "\($ind)\(.key): \(.value|type)" end
     end)
  elif type == "array" then
    (if length > 0 then "\($ind)array[\(length)]", (.[0]|tree($ind + "  ")) else "\($ind)array[0]" end)
  else "\($ind)\(type)"
  end;
tree("")
'
shape_tree() { jq -r "$JQ_SHAPE" "$1"; }

# ─── meta.json bookkeeping ───────────────────────────────────────────────────
WALK='[]'
META_EP='[]'
write_meta() { # $1 = date, $2 = date_source, $3 = walk json, $4 = endpoints json
  jq -n \
    --arg date "$1" --arg date_source "$2" --argjson walk "$3" --argjson endpoints "$4" \
    --arg captured_at "$(ts)" --arg base "$BASE" \
    '{date: $date, date_source: $date_source, base: $base, captured_at: $captured_at,
      walk: $walk, endpoints: $endpoints,
      note: "raw fixture capture (KUR-42 prep) — bodies saved verbatim, shape-agnostic"}' \
    > "$OUT_DIR/meta.json"
}

meta_add_ep() { # $1 kind, $2 url, $3 file, $4 status, $5 note, $6 code('')
  local ep
  ep="$(jq -n --arg k "$1" --arg u "$2" --arg f "$3" --arg s "$4" --arg n "$5" --arg c "$6" --arg t "$(ts)" \
    '{kind: $k, url: $u, file: (if $f == "" then null else $f end), status: $s, note: $n,
      code: (if $c == "" then null else $c end), captured_at: $t}')"
  META_EP="$(jq -c --argjson ep "$ep" '. + [$ep]' <<<"$META_EP")"
}

auth_rejected() { # $1 = kind
  echo "ERROR: HTTP $HTTP_STATUS pada $1 — token ditolak, rotasi ulang via scripts/rotate-ksei-token.sh." >&2
  exit 3
}

# ─── 1. baseline walk-back (summary) to find the effective EOD date ──────────
DATE_ARG="${2:-}"
DATE_SOURCE='walk'
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [ -n "$DATE_ARG" ]; then
  DATE="$DATE_ARG"
  DATE_SOURCE='override'
else
  DATE="$(TZ=Asia/Jakarta date '+%Y-%m-%d')"
  FOUND=0
  for _ in $(seq 1 "$MAX_LOOKBACK_DAYS"); do
    fetch_ep "$BASE/service/myportofolio/summary?type=&tanggal=$DATE" "$TMP/summary.json"
    case "$HTTP_STATUS" in
      401|403) echo "(baseline) HTTP $HTTP_STATUS pada $DATE" >&2; auth_rejected 'summary (baseline)' ;;
    esac
    if [ "$HTTP_STATUS" = "200" ] && is_valid_json_file "$TMP/summary.json"; then
      FOUND=1
      WALK="$(jq -c --arg d "$DATE" --arg s "$HTTP_STATUS" --arg n "ok — EOD terakhir" '. + [{date: $d, status: $s, note: $n}]' <<<"$WALK")"
      break
    fi
    WALK="$(jq -c --arg d "$DATE" --arg s "$HTTP_STATUS" --arg n "belum ada snapshot, mundur 1 hari" '. + [{date: $d, status: $s, note: $n}]' <<<"$WALK")"
    echo "baseline $DATE: HTTP $HTTP_STATUS / kosong → mundur 1 hari"
    DATE="$(step_back_date "$DATE")"
  done
  if [ "$FOUND" != "1" ]; then
    echo "ERROR: tidak ada snapshot summary dalam $MAX_LOOKBACK_DAYS hari terakhir — coba lagi nanti atau beri arg tanggal eksplisit (arg 2)." >&2
    exit 4
  fi
fi

echo "Tanggal efektif: $DATE ($DATE_SOURCE)"

# baseline body dari walk (atau capture fresh saat override) — fetched BEFORE
# creating OUT_DIR so a rejected/failed baseline never leaves an empty dir.
if [ "$DATE_SOURCE" = "override" ]; then
  fetch_ep "$BASE/service/myportofolio/summary?type=&tanggal=$DATE" "$TMP/summary.json"
  case "$HTTP_STATUS" in
    401|403) auth_rejected 'summary (baseline)' ;;
  esac
fi

OUT_DIR="$FIXTURE_ROOT/$DATE"
mkdir -p "$OUT_DIR"
cp "$TMP/summary.json" "$OUT_DIR/summary.json"

# ─── 2. capture per endpoint (raw bodies, verbatim) ──────────────────────────
print_shape() { # $1 kind, $2 file
  echo "--- $1: HTTP $HTTP_STATUS"
  if is_valid_json_file "$2"; then
    shape_tree "$2"
  else
    echo "    (body bukan JSON valid / kosong — disimpan apa adanya, tidak diparse)"
  fi
}

note=""
[ "$HTTP_STATUS" = "200" ] || note="non-200 (HTTP $HTTP_STATUS) — body disimpan apa adanya"
meta_add_ep summary "$BASE/service/myportofolio/summary?type=&tanggal=$DATE" summary.json "$HTTP_STATUS" "$note" ''
print_shape summary "$OUT_DIR/summary.json"

capture_simple() { # $1 kind, $2 url, $3 file
  fetch_ep "$2" "$OUT_DIR/$3"
  case "$HTTP_STATUS" in 401|403) auth_rejected "$1" ;; esac
  local note=""
  [ "$HTTP_STATUS" = "200" ] || note="non-200 (HTTP $HTTP_STATUS) — body disimpan apa adanya"
  meta_add_ep "$1" "$2" "$3" "$HTTP_STATUS" "$note" ''
  print_shape "$1" "$OUT_DIR/$3"
}

capture_simple equity-summary "$BASE/service/myportofolio/equity-summary?date=$DATE" equity-summary.json
capture_simple reksadana-summary "$BASE/service/myportofolio/reksadana-summary?date=$DATE" reksadana-summary.json

# reksadana per-fund: ambil code PERTAMA dari respons #3 via jq — shape-agnostic
# (kunci "code" pertama di mana pun di pohon), TIDAK di-hardcode.
RD_CODE=''
if is_valid_json_file "$OUT_DIR/reksadana-summary.json"; then
  RD_CODE="$(jq -r '[recurse | objects | select(has("code")) | .code | tostring | gsub("^\\s+|\\s+$"; "") | select(length > 0)] | .[0] // empty' "$OUT_DIR/reksadana-summary.json" 2>/dev/null || true)"
fi
if [ -n "$RD_CODE" ]; then
  RD_CODE_ENC="$(jq -rn --arg c "$RD_CODE" '$c | @uri')"
  RD_FILE="$(printf '%s' "$RD_CODE" | tr -c 'A-Za-z0-9._-' '_' | sed 's/^$/unknown/').json"
  capture_simple "reksadana($RD_CODE)" "$BASE/service/myportofolio/reksadana?date=$DATE&code=$RD_CODE_ENC" "reksadana-$RD_FILE"
else
  echo "--- reksadana(code): DILEWATI — tidak ada kunci \"code\" di respons reksadana-summary (tidak menebak shape)"
  meta_add_ep reksadana "$BASE/service/myportofolio/reksadana?date=$DATE&code=<dari #3>" '' 'skipped' 'reksadana-summary tidak mengandung kunci code — dilewati, tidak menebak shape' ''
fi

capture_simple summary-detail/EKUITAS "$BASE/service/myportofolio/summary-detail/EKUITAS?tanggal=$DATE" summary-detail-EKUITAS.json

write_meta "$DATE" "$DATE_SOURCE" "$WALK" "$META_EP"

echo
echo "Fixtures tersimpan di $OUT_DIR/ (gitignored):"
ls -1 "$OUT_DIR"
echo "Selesai — bandingkan pohon kunci di atas dengan nama field di komentar KUR-42 sebelum menulis parser/typing."
