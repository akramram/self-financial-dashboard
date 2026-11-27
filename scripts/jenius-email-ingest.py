#!/usr/bin/env python3
"""Jenius card-notification email fetcher.

Stdlib only (imaplib + email). Pulls recent messages from
jenius_noreply@smbci.com without touching read state (BODY.PEEK), extracts the
raw text body, and POSTs it to the dashboard's local ingest bridge at
http://localhost:4321/api/ingest/email. All parsing lives server-side
(src/lib/emailIngest.ts) so there is exactly one parser to keep correct.

Credentials (chmod 600, never committed):
    ~/.config/jenius-ingest/imap.env
        GMAIL_USER=you@gmail.com
        GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx      # Google app password (2FA on)
        # optional
        IMAP_HOST=imap.gmail.com
        IMAP_PORT=993
        DASHBOARD_URL=http://localhost:4321
        LOOKBACK_DAYS=7

Items land in the pending_email_tx queue; nothing reaches the transaction list
until the user confirms it in the app's review modal.

Usage:
    ./scripts/jenius-email-ingest.py              # fetch + post
    ./scripts/jenius-email-ingest.py --dry-run    # print, do not post
    ./scripts/jenius-email-ingest.py --limit 5
"""

import email
import email.message
import email.policy
import hashlib
import imaplib
import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
ENV_FILE = Path.home() / ".config" / "jenius-ingest" / "imap.env"
TOKEN_FILE = REPO / "data" / "ingest.token"
LOG_FILE = Path.home() / "Library" / "Logs" / "jenius-ingest.log"

SENDER = "jenius_noreply@smbci.com"
SUBJECT_KEYWORDS = ("kartu kredit jenius",)


def log(msg: str) -> None:
    line = f"[{datetime.now().isoformat(timespec='seconds')}] {msg}"
    print(line)
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with LOG_FILE.open("a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except OSError:
        pass


def load_env() -> dict:
    if not ENV_FILE.exists():
        log(f"FATAL: missing {ENV_FILE} (GMAIL_USER + GMAIL_APP_PASSWORD)")
        sys.exit(2)
    cfg = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        cfg[k.strip()] = v.strip().strip('"').strip("'")
    return cfg


def read_token() -> str:
    if TOKEN_FILE.exists():
        tok = TOKEN_FILE.read_text(encoding="utf-8").strip()
        if tok:
            return tok
    tok = os.environ.get("INGEST_TOKEN", "")
    if not tok:
        log(f"FATAL: no ingest token at {TOKEN_FILE} (or INGEST_TOKEN env)")
        sys.exit(2)
    return tok


def body_text(msg: email.message.Message) -> str:
    plain, html = [], []
    for part in msg.walk():
        ctype = part.get_content_type()
        if part.get_content_disposition() == "attachment":
            continue
        if ctype == "text/plain":
            plain.append(part.get_content())
        elif ctype == "text/html":
            html.append(part.get_content())
    if plain:
        return "\n".join(plain)
    if html:
        return "\n".join(html)  # parser strips tags server-side
    payload = msg.get_payload(decode=True)
    return payload.decode("utf-8", "replace") if payload else ""


def message_key(msg: email.message.Message, raw: bytes) -> str:
    mid = (msg.get("Message-ID") or "").strip()
    if mid:
        return mid
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def fetch(cfg: dict, lookback_days: int) -> list[dict]:
    host = cfg.get("IMAP_HOST", "imap.gmail.com")
    port = int(cfg.get("IMAP_PORT", "993"))
    user = cfg["GMAIL_USER"]
    password = cfg["GMAIL_APP_PASSWORD"]

    since = (datetime.now() - timedelta(days=lookback_days)).strftime("%d-%b-%Y")
    out = []
    with imaplib.IMAP4_SSL(host, port, ssl_context=ssl.create_default_context()) as imap:
        imap.login(user, password)
        imap.select("INBOX", readonly=True)  # readonly: never marks messages seen
        typ, data = imap.search(None, "FROM", f'"{SENDER}"', "SINCE", since)
        if typ != "OK":
            log(f"IMAP search failed: {typ}")
            return out
        ids = data[0].split()
        log(f"search FROM {SENDER} SINCE {since} → {len(ids)} message(s)")
        for num in ids:
            typ, raw = imap.fetch(num, "(BODY.PEEK[])")
            if typ != "OK" or not raw or not isinstance(raw[0], tuple):
                continue
            raw_bytes = raw[0][1]
            msg = email.message_from_bytes(raw_bytes, policy=email.policy.default)
            subject = str(msg.get("Subject") or "")
            if not any(k in subject.lower() for k in SUBJECT_KEYWORDS):
                continue
            out.append(
                {
                    "messageId": message_key(msg, raw_bytes),
                    "subject": subject,
                    "from": str(msg.get("From") or ""),
                    "date": msg.get("Date") or "",
                    "body": body_text(msg),
                }
            )
    return out


def post(url: str, token: str, messages: list[dict]) -> dict:
    req = urllib.request.Request(
        url.rstrip("/") + "/api/ingest/email",
        data=json.dumps({"messages": messages}).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-ingest-token": token},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode("utf-8"))


def main() -> int:
    args = sys.argv[1:]
    dry = "--dry-run" in args
    limit = None
    if "--limit" in args:
        limit = int(args[args.index("--limit") + 1])

    cfg = load_env()
    lookback = int(cfg.get("LOOKBACK_DAYS", "7"))
    messages = fetch(cfg, lookback)
    if limit:
        messages = messages[-limit:]
    if not messages:
        log("no matching emails")
        return 0

    if dry:
        for m in messages:
            body = m["body"]
            log(f"--- {m['subject']} | {m['messageId']}\n{body[:500]}")
        return 0

    token = read_token()
    url = cfg.get("DASHBOARD_URL", "http://localhost:4321")
    try:
        result = post(url, token, messages)
    except urllib.error.HTTPError as e:
        log(f"POST failed {e.code}: {e.read()[:300]!r}")
        return 1
    except urllib.error.URLError as e:
        log(f"dashboard unreachable at {url}: {e.reason}")
        return 1
    log(f"posted {len(messages)} message(s) → accepted={result.get('accepted')} skipped={result.get('skipped')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())