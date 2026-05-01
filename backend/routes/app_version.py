"""
App Version endpoint — used by the frontend AppVersionGuard to detect new
deployments and show an update banner / changelog popup.

Every time the backend process (re)starts — which happens on every deploy —
BUILD_VERSION regenerates. Frontend compares the version it saw last time
with the current one and, if they differ, surfaces an update banner.

CHANGELOG: edited manually with each meaningful release. Keep it short
(3-5 bullets) and user-facing — these strings show up verbatim in the
post-update modal that residents and company admins see.
"""
from fastapi import APIRouter
from datetime import datetime, timezone
import os
import time

router = APIRouter(prefix="/api", tags=["version"])

# Regenerated on every process start. The cheapest reliable build-stamp.
_STARTED_AT = datetime.now(timezone.utc).isoformat()
_VERSION = str(int(time.time()))
_RUNTIME_ENV = os.environ.get("APP_ENV", "production")

# ---------------------------------------------------------------------------
# Public-facing changelog. Update this list each release.
# Format: list of dicts, each with ar/en/fr text. Newest first.
# Keep ≤ 5 items so the modal stays light.
# ---------------------------------------------------------------------------
_CHANGELOG = [
    {
        "ar": "تجربة تسجيل دخول أسرع وأكثر استقراراً 🚀",
        "en": "Faster, more reliable login experience 🚀",
        "fr": "Connexion plus rapide et plus fiable 🚀",
    },
    {
        "ar": "رسائل خطأ واضحة بالعربية في صفحة تسجيل الشركات + متطلبات كلمة المرور تظهر مباشرةً",
        "en": "Clear Arabic error messages on the company registration page + live password requirements",
        "fr": "Messages d'erreur arabes clairs lors de l'inscription d'entreprise + exigences de mot de passe en direct",
    },
    {
        "ar": "إمكانية إظهار/إخفاء كلمة المرور أثناء التسجيل 👁️",
        "en": "Show / hide password toggle during registration 👁️",
        "fr": "Afficher / masquer le mot de passe lors de l'inscription 👁️",
    },
    {
        "ar": "هوية بصرية بنفسجية مميّزة لصفحات شركة الإدارة 💜",
        "en": "Distinctive purple visual theme for management-company pages 💜",
        "fr": "Thème violet distinctif pour les pages des sociétés de gestion 💜",
    },
    {
        "ar": "تنبيه تلقائي عند توفّر إصدار جديد من التطبيق — اضغطي تحديث الآن للحصول عليه فوراً",
        "en": "Automatic alert when a new app version is available — tap Update Now to get it instantly",
        "fr": "Alerte automatique en cas de nouvelle version — appuyez sur Mettre à jour pour l'obtenir",
    },
]


@router.get("/version")
async def get_version():
    """Public endpoint — returns the current backend process start-timestamp
    plus a short user-facing changelog. Frontend polls this every 5 minutes,
    shows an update banner on mismatch, and renders the changelog list in a
    modal once the user accepts the update."""
    return {
        "version": _VERSION,
        "started_at": _STARTED_AT,
        "env": _RUNTIME_ENV,
        "changelog": _CHANGELOG,
    }
