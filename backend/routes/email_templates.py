"""
Email Template Editor — admins customize subject/body of automated emails.

Templates are stored in `email_templates` collection keyed by `kind`. Variables use Mustache-style
`{{variable}}` syntax and are substituted before sending. If no template is found for a kind, the
caller's default is used (so this is a non-breaking enhancement).

Available kinds (seeded on first request):
  - monthly_summary      — sent to compound admins/owners with the monthly summary PDF
  - monthly_statement    — sent to each resident with their unit statement
  - renewal_reminder     — subscription renewal reminders
  - generic              — fallback

Variables documented per kind:
  monthly_summary:    {{compound_name}}, {{period}}
  monthly_statement:  {{resident_name}}, {{unit_number}}, {{period}}, {{compound_name}}
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import re

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api/email-templates")


DEFAULT_TEMPLATES = {
    "monthly_summary": {
        "kind": "monthly_summary",
        "label": "التقرير الشهري للمجمع",
        "subject": "HomeMe — التقرير الشهري لمجمع {{compound_name}} ({{period}})",
        "html": """<p>السلام عليكم،</p>
<p>يسعدنا إرسال <strong>التقرير الشامل لشهر {{period}}</strong> الخاص بمجمع <strong>{{compound_name}}</strong>.</p>
<p>التقرير مرفق بصيغة PDF ويتضمن الإشغال، الأداء المالي، والعمليات.</p>
<p>تحياتنا،<br/>فريق HomeMe</p>""",
        "variables": ["compound_name", "period"],
    },
    "monthly_statement": {
        "kind": "monthly_statement",
        "label": "كشف حساب الوحدة الشهري",
        "subject": "HomeMe — كشف حساب الوحدة {{unit_number}} ({{period}})",
        "html": """<p>عزيزنا/عزيزتنا {{resident_name}}،</p>
<p>مرفق كشف حساب وحدتك <strong>{{unit_number}}</strong> في مجمع <strong>{{compound_name}}</strong> لشهر <strong>{{period}}</strong>.</p>
<p>يحتوي الكشف على تفاصيل الرسوم والمدفوعات والرصيد المستحق.</p>
<p>للاستفسار يرجى التواصل مع إدارة المجمع.</p>
<p>تحياتنا،<br/>فريق HomeMe</p>""",
        "variables": ["resident_name", "unit_number", "period", "compound_name"],
    },
    "renewal_reminder": {
        "kind": "renewal_reminder",
        "label": "تذكير تجديد الاشتراك",
        "subject": "HomeMe — تذكير: تجديد الاشتراك خلال {{days_left}} يوم",
        "html": """<p>عزيزنا/عزيزتنا {{user_name}}،</p>
<p>اشتراكك سينتهي خلال <strong>{{days_left}} يوم</strong> ({{end_date}}).</p>
<p>لاستمرار الخدمة بدون انقطاع، يرجى تجديد الاشتراك من خلال لوحة التحكم.</p>
<p>تحياتنا،<br/>فريق HomeMe</p>""",
        "variables": ["user_name", "days_left", "end_date"],
    },
    "generic": {
        "kind": "generic",
        "label": "قالب عام",
        "subject": "HomeMe — {{title}}",
        "html": "<p>{{body}}</p>",
        "variables": ["title", "body"],
    },
}


def _admin_only(user: dict):
    if user.get("role") not in ("app_owner", "super_admin", "admin", "compound_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")


def _owner_only(user: dict):
    if user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="Owner access required")


def render_template(template: dict, variables: dict) -> dict:
    """Substitute {{var}} placeholders. Missing variables left as-is for visibility."""
    def _sub(text: str) -> str:
        if not text:
            return ""
        return re.sub(r"\{\{\s*(\w+)\s*\}\}", lambda m: str(variables.get(m.group(1), m.group(0))), text)
    return {
        "subject": _sub(template.get("subject", "")),
        "html": _sub(template.get("html", "")),
    }


async def get_template_or_default(kind: str) -> dict:
    """Used by other modules to fetch a template (DB → defaults)."""
    db = get_db()
    if db is not None:
        existing = await db.email_templates.find_one({"kind": kind}, {"_id": 0})
        if existing:
            return existing
    return DEFAULT_TEMPLATES.get(kind, DEFAULT_TEMPLATES["generic"])


# ---------- Endpoints ----------

@router.get("")
async def list_templates(current_user: dict = Depends(get_current_user)):
    _admin_only(current_user)
    db = get_db()
    saved = {t["kind"]: t async for t in db.email_templates.find({}, {"_id": 0})}
    out = []
    for kind, default in DEFAULT_TEMPLATES.items():
        existing = saved.get(kind)
        out.append({
            **default,
            **(existing or {}),
            "is_customized": bool(existing),
        })
    return {"templates": out}


@router.get("/{kind}")
async def get_template(kind: str, current_user: dict = Depends(get_current_user)):
    _admin_only(current_user)
    if kind not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=404, detail="نوع قالب غير معروف")
    tpl = await get_template_or_default(kind)
    return {**tpl, "is_customized": tpl is not DEFAULT_TEMPLATES[kind] and tpl != DEFAULT_TEMPLATES[kind]}


class TemplateUpdate(BaseModel):
    subject: Optional[str] = None
    html: Optional[str] = None


@router.put("/{kind}")
async def update_template(kind: str, payload: TemplateUpdate, current_user: dict = Depends(get_current_user)):
    _owner_only(current_user)
    if kind not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=404, detail="نوع قالب غير معروف")
    if not (payload.subject and payload.html):
        raise HTTPException(status_code=400, detail="يجب إدخال subject و html")
    db = get_db()
    base = DEFAULT_TEMPLATES[kind]
    doc = {
        "kind": kind,
        "label": base["label"],
        "subject": payload.subject,
        "html": payload.html,
        "variables": base["variables"],
        "updated_by": current_user.get("id"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.email_templates.update_one({"kind": kind}, {"$set": doc}, upsert=True)
    return {**doc, "is_customized": True}


@router.post("/{kind}/reset")
async def reset_template(kind: str, current_user: dict = Depends(get_current_user)):
    _owner_only(current_user)
    if kind not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=404, detail="نوع قالب غير معروف")
    db = get_db()
    await db.email_templates.delete_one({"kind": kind})
    return {**DEFAULT_TEMPLATES[kind], "is_customized": False}


class PreviewReq(BaseModel):
    subject: Optional[str] = None
    html: Optional[str] = None
    variables: Optional[dict] = None


@router.post("/{kind}/preview")
async def preview_template(kind: str, payload: PreviewReq, current_user: dict = Depends(get_current_user)):
    _admin_only(current_user)
    base = DEFAULT_TEMPLATES.get(kind, DEFAULT_TEMPLATES["generic"])
    template = {
        "subject": payload.subject if payload.subject is not None else (await get_template_or_default(kind)).get("subject", base["subject"]),
        "html": payload.html if payload.html is not None else (await get_template_or_default(kind)).get("html", base["html"]),
    }
    sample_vars = {
        "compound_name": "مجمع رويال سيتي",
        "period": "2026-04",
        "resident_name": "أحمد محمد",
        "unit_number": "A-205",
        "user_name": "أحمد محمد",
        "days_left": "7",
        "end_date": "2026-05-04",
        "title": "إشعار",
        "body": "هذا نص تجريبي.",
    }
    if payload.variables:
        sample_vars.update(payload.variables)
    return render_template(template, sample_vars)
