"""
Bounce detection — async polling of the SMTP sender's inbox for delivery
failure notifications, then marking the matching outbound email rows as
`bounced` in `smtp_health`.

How it works
------------
1. Connect to IMAP (defaults to same host as SMTP — most providers run both).
2. Search for messages from `MAILER-DAEMON` / `postmaster` / `Mail Delivery System`
   received in the last N days that are unprocessed by us.
3. Parse each message to extract the original failed-recipient address
   (RFC 3464 DSN: `Final-Recipient: rfc822;<addr>`).
4. Locate the most recent `smtp_health` row for that recipient where status is
   not already `bounced`, and update it to status=bounced with the reason.
5. Persist the IMAP UID into `processed_bounce_uids` so a re-scan doesn't double-count.

No third-party deps — uses stdlib `imaplib`, `email`, `re`.
"""
import logging
import os
import re
import email
import imaplib
from datetime import datetime, timezone, timedelta
from email.header import decode_header
from typing import Optional

from database import get_db

logger = logging.getLogger(__name__)

# ---------- Configuration ----------
IMAP_HOST = os.environ.get("IMAP_HOST") or os.environ.get("SMTP_HOST")
IMAP_PORT = int(os.environ.get("IMAP_PORT", 993))
IMAP_USER = os.environ.get("IMAP_USER") or os.environ.get("SMTP_USER")
IMAP_PASSWORD = os.environ.get("IMAP_PASSWORD") or os.environ.get("SMTP_PASSWORD")
IMAP_FOLDER = os.environ.get("IMAP_FOLDER", "INBOX")
# How far back to scan (days)
LOOKBACK_DAYS = int(os.environ.get("BOUNCE_LOOKBACK_DAYS", 7))


BOUNCE_SENDERS = (
    "MAILER-DAEMON",
    "postmaster@",
    "Mail Delivery",
    "Mail Delivery System",
    "Mail Delivery Subsystem",
)

# Common patterns that point to the failed recipient inside a DSN message body.
RFC3464_RECIPIENT = re.compile(r"^Final-Recipient:\s*rfc822;\s*([^\s<>]+)", re.MULTILINE | re.IGNORECASE)
GENERIC_FAILED = re.compile(r"<?([\w._%+-]+@[\w.-]+\.\w+)>?\s*\.{0,3}\s*(No\s+Such\s+User|user\s+unknown|mailbox\s+(?:full|unavailable)|does\s+not\s+exist)", re.IGNORECASE)
FAILED_ADDR_LINE = re.compile(r"failed:\s*<?([\w._%+-]+@[\w.-]+\.\w+)>?", re.IGNORECASE)


def _decode(raw):
    """Decode a possibly-encoded RFC 2047 header value."""
    if raw is None:
        return ""
    parts = decode_header(raw)
    out = []
    for txt, enc in parts:
        if isinstance(txt, bytes):
            try:
                out.append(txt.decode(enc or "utf-8", errors="replace"))
            except Exception:
                out.append(txt.decode("utf-8", errors="replace"))
        else:
            out.append(txt)
    return "".join(out)


def _looks_like_bounce(from_hdr: str, subject_hdr: str) -> bool:
    f = (from_hdr or "").lower()
    s = (subject_hdr or "").lower()
    if any(x.lower() in f for x in BOUNCE_SENDERS):
        return True
    return any(k in s for k in (
        "mail delivery failed", "undelivered mail returned", "delivery status notification",
        "delivery has failed", "failure notice", "returned mail",
    ))


def _extract_message_body(msg: email.message.Message) -> str:
    """Flatten all text/* parts into a single string."""
    chunks = []
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            if ctype in ("text/plain", "text/rfc822-headers", "message/delivery-status", "message/rfc822"):
                try:
                    payload = part.get_payload(decode=True)
                    if isinstance(payload, bytes):
                        chunks.append(payload.decode(part.get_content_charset() or "utf-8", errors="replace"))
                    elif payload:
                        chunks.append(str(payload))
                except Exception:
                    continue
    else:
        try:
            payload = msg.get_payload(decode=True)
            if isinstance(payload, bytes):
                chunks.append(payload.decode(msg.get_content_charset() or "utf-8", errors="replace"))
            elif payload:
                chunks.append(str(payload))
        except Exception:
            pass
    return "\n".join(chunks)


def _extract_failed_recipients(body: str) -> list:
    addresses = set()
    for m in RFC3464_RECIPIENT.finditer(body):
        addresses.add(m.group(1).strip().lower())
    for m in GENERIC_FAILED.finditer(body):
        addresses.add(m.group(1).strip().lower())
    for m in FAILED_ADDR_LINE.finditer(body):
        addresses.add(m.group(1).strip().lower())
    return list(addresses)


def _extract_reason(body: str) -> Optional[str]:
    """Pull the most descriptive single line from the DSN body for the dashboard.

    Looks for SMTP-style status hints first; if none found, fall back to the
    `Status:` and `Diagnostic-Code:` RFC 3464 fields commonly present in DSNs.
    """
    # Strategy 1: keyword scan
    for line in body.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        low = stripped.lower()
        if any(k in low for k in (
            "no such user", "user unknown", "mailbox full", "mailbox unavailable",
            "does not exist", "550", "552", "554", "permanent error", "temporary failure",
        )):
            return stripped[:240]

    # Strategy 2: RFC 3464 Diagnostic-Code:
    m = re.search(r"^Diagnostic-Code:\s*(.+)$", body, flags=re.MULTILINE | re.IGNORECASE)
    if m:
        return m.group(1).strip()[:240]

    # Strategy 3: RFC 3464 Status:
    m = re.search(r"^Status:\s*(\d\.\d\.\d.*)$", body, flags=re.MULTILINE | re.IGNORECASE)
    if m:
        return f"Status {m.group(1).strip()}"[:240]

    return None


def _imap_connect():
    if not IMAP_HOST or not IMAP_USER or not IMAP_PASSWORD:
        raise RuntimeError("IMAP credentials are not configured. Set IMAP_HOST/USER/PASSWORD (or fall back to SMTP_* equivalents).")
    M = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
    M.login(IMAP_USER, IMAP_PASSWORD)
    M.select(IMAP_FOLDER, readonly=True)
    return M


async def scan_bounces(limit: int = 100) -> dict:
    """Run one scan pass. Returns summary dict — safe to call from anywhere.
    Idempotent across runs: each IMAP UID is recorded in `processed_bounce_uids`.
    """
    db = get_db()
    out = {
        "scanned": 0,
        "bounce_messages_seen": 0,
        "matched_outbound": 0,
        "skipped_already_processed": 0,
        "errors": [],
    }

    try:
        M = _imap_connect()
    except Exception as e:
        out["errors"].append(f"IMAP connect failed: {e}")
        logger.warning(f"bounce scan IMAP connect failed: {e}")
        return out

    try:
        since_date = (datetime.now() - timedelta(days=LOOKBACK_DAYS)).strftime("%d-%b-%Y")
        typ, data = M.search(None, f'(SINCE {since_date})')
        if typ != "OK":
            out["errors"].append(f"IMAP search returned {typ}")
            return out

        all_uids = data[0].split() if data and data[0] else []
        out["scanned"] = len(all_uids)
        # Process newest first
        for uid in reversed(all_uids[-limit:]):
            uid_str = uid.decode() if isinstance(uid, bytes) else str(uid)
            # Already processed?
            already = await db.processed_bounce_uids.find_one({"uid": uid_str, "imap_user": IMAP_USER})
            if already:
                out["skipped_already_processed"] += 1
                continue

            try:
                typ, msg_data = M.fetch(uid, "(RFC822)")
                if typ != "OK" or not msg_data or not msg_data[0]:
                    continue
                raw = msg_data[0][1]
                msg = email.message_from_bytes(raw)
                from_hdr = _decode(msg.get("From"))
                subject_hdr = _decode(msg.get("Subject"))

                if not _looks_like_bounce(from_hdr, subject_hdr):
                    # Mark as seen so future runs skip it.
                    await db.processed_bounce_uids.insert_one({
                        "uid": uid_str,
                        "imap_user": IMAP_USER,
                        "processed_at": datetime.now(timezone.utc),
                        "is_bounce": False,
                    })
                    continue

                out["bounce_messages_seen"] += 1
                body = _extract_message_body(msg)
                failed_recipients = _extract_failed_recipients(body)
                reason = _extract_reason(body) or "(no specific reason extracted)"

                for addr in failed_recipients:
                    # Find the most recent outbound row for this recipient that isn't already bounced.
                    target = await db.smtp_health.find_one(
                        {"to_email": {"$regex": f"^{re.escape(addr)}$", "$options": "i"}, "status": {"$ne": "bounced"}},
                        sort=[("timestamp", -1)],
                    )
                    if not target:
                        continue
                    await db.smtp_health.update_one(
                        {"id": target.get("id")} if target.get("id") else {"_id": target["_id"]},
                        {"$set": {
                            "status": "bounced",
                            "success": False,
                            "bounce_reason": reason,
                            "bounce_detected_at": datetime.now(timezone.utc),
                            "bounce_imap_uid": uid_str,
                        }},
                    )
                    out["matched_outbound"] += 1

                # Persist UID as processed
                await db.processed_bounce_uids.insert_one({
                    "uid": uid_str,
                    "imap_user": IMAP_USER,
                    "processed_at": datetime.now(timezone.utc),
                    "is_bounce": True,
                    "failed_recipients": failed_recipients,
                    "subject": subject_hdr[:160],
                })
            except Exception as e:
                out["errors"].append(f"uid={uid_str}: {str(e)[:160]}")
                continue
    finally:
        try:
            M.logout()
        except Exception:
            pass

    return out
