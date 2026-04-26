"""Helper to extract branding settings from a compound document."""

def get_compound_branding(compound: dict | None) -> dict:
    if not compound:
        return {}
    b = compound.get("branding") or {}
    return {
        "logo_url": b.get("logo_url") or compound.get("logo_url"),
        "primary_color": b.get("primary_color"),
        "secondary_color": b.get("secondary_color"),
        "accent_color": b.get("accent_color"),
        "brand_label": b.get("brand_label") or compound.get("name"),
        "tagline": b.get("tagline"),
        "signature_text": b.get("signature_text"),
    }
