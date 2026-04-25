"""
Invite Stats — aggregated counts for invitation links across both
compound_invites and family_invites collections, scoped by the caller's role.

GET /api/invite-stats
  → returns:
    {
      compound: { total, active, used_up, expired, revoked, total_acceptances },
      family:   { total, active, used_up, expired, revoked, total_acceptances },
      conversion_rate: float (0..1) — accepted / (sum of max_uses for completed invites; falls back to total_count)
    }

RBAC:
  - app_owner / super_admin → see all invites (no filter)
  - company_admin           → restricted to company_id
  - admin / manager         → restricted to compound_id (compound_invites)
                              + family_invites where they are the creator
  - any other (resident, family_head) → only their own family_invites
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api")


def _classify(inv: dict, now: datetime) -> str:
    if not inv.get("is_active"):
        return "revoked"
    exp = inv.get("expires_at")
    if exp:
        try:
            exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            if exp_dt < now:
                return "expired"
        except Exception:
            pass
    if inv.get("max_uses") is not None and inv.get("used_count", 0) >= inv["max_uses"]:
        return "used_up"
    return "active"


def _aggregate(invites):
    now = datetime.now(timezone.utc)
    out = {"total": 0, "active": 0, "used_up": 0, "expired": 0, "revoked": 0, "total_acceptances": 0}
    completed_capacity = 0  # total max_uses for finite-capacity invites
    for inv in invites:
        out["total"] += 1
        out["total_acceptances"] += int(inv.get("used_count", 0))
        out[_classify(inv, now)] += 1
        if inv.get("max_uses"):
            completed_capacity += int(inv["max_uses"])
    return out, completed_capacity


@router.get("/invite-stats")
async def get_invite_stats(current_user: dict = Depends(get_current_user)):
    db = get_db()
    role = current_user.get("role")

    # Build scope filters per collection
    if role in ("app_owner", "super_admin"):
        cmp_q = {}
        fam_q = {}
    elif role == "company_admin":
        cid = current_user.get("company_id")
        cmp_q = {"company_id": cid} if cid else {"id": "__none__"}
        fam_q = {"company_id": cid} if cid else {"id": "__none__"}
    elif role in ("admin", "manager"):
        cpd = current_user.get("compound_id")
        cmp_q = {"compound_id": cpd} if cpd else {"id": "__none__"}
        # admins also see family invites created in their compound
        fam_q = {"compound_id": cpd} if cpd else {"id": "__none__"}
    else:
        # residents / family heads — only their own family invites; no compound stats
        cmp_q = {"id": "__none__"}
        fam_q = {"created_by": current_user.get("id")}

    cmp_invites = await db.compound_invites.find(cmp_q, {"_id": 0}).to_list(length=10000)
    fam_invites = await db.family_invites.find(fam_q, {"_id": 0}).to_list(length=10000)

    cmp_stats, cmp_cap = _aggregate(cmp_invites)
    fam_stats, fam_cap = _aggregate(fam_invites)

    total_acceptances = cmp_stats["total_acceptances"] + fam_stats["total_acceptances"]
    total_capacity = cmp_cap + fam_cap
    if total_capacity > 0:
        conversion = round(total_acceptances / total_capacity, 4)
    else:
        # Fall back to acceptances/total_count (∞-cap invites)
        total_count = cmp_stats["total"] + fam_stats["total"]
        conversion = round(total_acceptances / total_count, 4) if total_count else 0.0

    return {
        "compound": cmp_stats,
        "family": fam_stats,
        "conversion_rate": conversion,
        "scope": "all" if role in ("app_owner", "super_admin") else (
            "company" if role == "company_admin" else (
                "compound" if role in ("admin", "manager") else "self"
            )
        ),
    }
