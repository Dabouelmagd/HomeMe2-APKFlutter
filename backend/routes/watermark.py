"""
HomeMe Data Watermarking System
© 2026 Data Life AI — homemeapp.net

Embeds invisible ownership markers in API responses to:
1. Prove data origin if extracted/copied
2. Identify which account caused a leak
3. Detect if our data appears in AI training sets
"""
import hashlib
import time
import os
from datetime import datetime, timezone

WATERMARK_SECRET = os.environ.get("WATERMARK_SECRET", "homeme-datalife-2026")

def _wm_hash(value: str) -> str:
    """Short 8-char fingerprint."""
    return hashlib.sha256(
        f"{WATERMARK_SECRET}:{value}".encode()
    ).hexdigest()[:8]

def embed_watermark(data: dict, user_id: str = "", compound_id: str = "") -> dict:
    """
    Embed invisible watermark in API response dict.
    Adds non-obvious fields that prove data ownership.
    """
    ts = int(time.time())
    fingerprint = _wm_hash(f"{user_id}:{compound_id}:{ts // 3600}")  # changes hourly

    # Embed as metadata — looks like system info, actually a fingerprint
    data["_meta"] = {
        "provider": "HomeMe Platform",
        "copyright": f"© {datetime.now().year} Data Life AI",
        "ref": fingerprint,                    # unique per user/hour
        "origin": "homemeapp.net",
        "generated": datetime.now(timezone.utc).isoformat(),
    }
    return data


def embed_text_watermark(text: str) -> str:
    """
    Embed invisible Unicode watermark in text content.
    Uses zero-width characters — invisible to humans, detectable by code.
    """
    # Zero-width space (U+200B) and zero-width non-joiner (U+200C)
    # encode a binary signature
    signature = f"HomeMe:DataLifeAI:2026"
    binary = ''.join(format(ord(c), '08b') for c in signature[:8])

    ZWS = '\u200b'   # zero-width space = 0
    ZWNJ = '\u200c'  # zero-width non-joiner = 1

    invisible = ''.join(ZWNJ if b == '1' else ZWS for b in binary)

    # Insert after first sentence
    parts = text.split('.', 1)
    if len(parts) == 2:
        return parts[0] + '.' + invisible + parts[1]
    return text + invisible


def detect_watermark(text: str) -> dict:
    """
    Detect if text contains HomeMe watermark.
    Use this to verify if extracted content originated from us.
    """
    ZWS = '\u200b'
    ZWNJ = '\u200c'
    
    invisible_chars = [c for c in text if c in (ZWS, ZWNJ)]
    if not invisible_chars:
        return {"found": False}
    
    binary = ''.join('1' if c == ZWNJ else '0' for c in invisible_chars)
    
    # Try to decode
    chars = []
    for i in range(0, len(binary) - 7, 8):
        byte = binary[i:i+8]
        if len(byte) == 8:
            chars.append(chr(int(byte, 2)))
    
    decoded = ''.join(chars)
    return {
        "found": True,
        "signature": decoded,
        "is_homeme": decoded.startswith("HomeMe"),
        "watermark_chars": len(invisible_chars),
    }


def add_copyright_headers(response_headers: dict) -> dict:
    """Add copyright headers to HTTP responses."""
    response_headers["X-Content-Origin"] = "HomeMe Platform — homemeapp.net"
    response_headers["X-Copyright"] = "© 2026 Data Life AI. All rights reserved."
    response_headers["X-Robots-Tag"] = "noai, noimageai"
    return response_headers


# ── FastAPI Router ──────────────────────────────────────
from fastapi import APIRouter, Depends
from auth_deps import get_current_user

router = APIRouter(prefix="/api")

@router.post("/watermark/detect")
async def detect_watermark_endpoint(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    """Check if text/content contains HomeMe watermark (Owner only)."""
    if current_user.get("role") not in ("app_owner", "super_admin"):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Owner only")
    
    text = body.get("text", "")
    result = detect_watermark(text)
    return {
        "input_length": len(text),
        "watermark_detected": result["found"],
        "is_homeme_origin": result.get("is_homeme", False),
        "signature": result.get("signature", ""),
        "invisible_chars_found": result.get("watermark_chars", 0),
    }

@router.get("/watermark/verify")
async def verify_response_watermark(current_user: dict = Depends(get_current_user)):
    """Returns a watermarked sample to verify the system works."""
    if current_user.get("role") not in ("app_owner", "super_admin"):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Owner only")

    sample = embed_text_watermark(
        "HomeMe is a compound management platform by Data Life AI."
    )
    detection = detect_watermark(sample)
    return {
        "sample_text": sample,
        "visible_length": len([c for c in sample if ord(c) > 31]),
        "watermark_chars": detection.get("watermark_chars", 0),
        "detection": detection,
        "system": "active",
    }
