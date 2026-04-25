"""
Invite Stats — aggregated counts + time-series analytics for invitation links
across both compound_invites and family_invites collections, scoped by the
caller's role.

Endpoints
---------
GET /api/invite-stats?period_days=7|30|90|all
    → quick stats card (totals + per-collection breakdown + conversion rate)

GET /api/invite-stats/export.csv?period_days=...
    → returns text/csv with both compound and family invites combined,
      one row per invite. Useful for offline analysis.

GET /api/invite-analytics?period_days=30
    → richer analytics for app_owner / super_admin only:
        {
          period_days,
          daily_acceptances: [{date, count}, ...],
          top_compounds:     [{compound_id, name, acceptances}, ...],
          top_roles:         [{role, count}, ...],
          slowest_roles:     [{role, expired_or_unused}, ...],
          total_acceptances,
        }

RBAC for /invite-stats
-----------------------
  - app_owner / super_admin → see all
  - company_admin           → restricted to company_id
  - admin / manager         → restricted to compound_id
  - others                  → only their own family invites
"""
from fastapi import APIRouter, Depends, HTTPException, Response, Query
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import io
import csv

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api")


# ----- Helpers ---------------------------------------------------------------

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
    completed_capacity = 0
    for inv in invites:
        out["total"] += 1
        out["total_acceptances"] += int(inv.get("used_count", 0))
        out[_classify(inv, now)] += 1
        if inv.get("max_uses"):
            completed_capacity += int(inv["max_uses"])
    return out, completed_capacity


def _scope_queries(current_user: dict):
    """Returns (compound_query, family_query) based on the caller's role."""
    role = current_user.get("role")
    if role in ("app_owner", "super_admin"):
        return {}, {}
    if role == "company_admin":
        cid = current_user.get("company_id")
        return ({"company_id": cid} if cid else {"id": "__none__"}), \
               ({"company_id": cid} if cid else {"id": "__none__"})
    if role in ("admin", "manager"):
        cpd = current_user.get("compound_id")
        return ({"compound_id": cpd} if cpd else {"id": "__none__"}), \
               ({"compound_id": cpd} if cpd else {"id": "__none__"})
    return ({"id": "__none__"}, {"created_by": current_user.get("id")})


def _apply_period(query: dict, period_days: Optional[int]):
    """Add a created_at >= cutoff filter when period_days is finite (>0)."""
    if period_days and period_days > 0:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=period_days)).isoformat()
        return {**query, "created_at": {"$gte": cutoff}}
    return query


def _scope_label(role: str) -> str:
    if role in ("app_owner", "super_admin"):
        return "all"
    if role == "company_admin":
        return "company"
    if role in ("admin", "manager"):
        return "compound"
    return "self"


def _parse_period(period_days: Optional[str]) -> Optional[int]:
    """Accepts '7'|'30'|'90'|'all'|None. Returns int or None for 'all'."""
    if period_days is None or period_days == "" or period_days == "all":
        return None
    try:
        v = int(period_days)
        return v if v > 0 else None
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="period_days must be 7|30|90|all")


# ----- Stats endpoint --------------------------------------------------------

@router.get("/invite-stats")
async def get_invite_stats(
    period_days: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    days = _parse_period(period_days)
    cmp_q, fam_q = _scope_queries(current_user)
    cmp_q = _apply_period(cmp_q, days)
    fam_q = _apply_period(fam_q, days)

    cmp_invites = await db.compound_invites.find(cmp_q, {"_id": 0}).to_list(length=10000)
    fam_invites = await db.family_invites.find(fam_q, {"_id": 0}).to_list(length=10000)

    cmp_stats, cmp_cap = _aggregate(cmp_invites)
    fam_stats, fam_cap = _aggregate(fam_invites)

    total_acceptances = cmp_stats["total_acceptances"] + fam_stats["total_acceptances"]
    total_capacity = cmp_cap + fam_cap
    if total_capacity > 0:
        conversion = round(total_acceptances / total_capacity, 4)
    else:
        total_count = cmp_stats["total"] + fam_stats["total"]
        conversion = round(total_acceptances / total_count, 4) if total_count else 0.0

    return {
        "compound": cmp_stats,
        "family": fam_stats,
        "conversion_rate": conversion,
        "scope": _scope_label(current_user.get("role")),
        "period_days": days,
    }


# ----- CSV export ------------------------------------------------------------

@router.get("/invite-stats/export.csv")
async def export_invites_csv(
    period_days: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    days = _parse_period(period_days)
    cmp_q, fam_q = _scope_queries(current_user)
    cmp_q = _apply_period(cmp_q, days)
    fam_q = _apply_period(fam_q, days)

    cmp_invites = await db.compound_invites.find(cmp_q, {"_id": 0}).sort("created_at", -1).to_list(length=20000)
    fam_invites = await db.family_invites.find(fam_q, {"_id": 0}).sort("created_at", -1).to_list(length=20000)

    now = datetime.now(timezone.utc)
    buf = io.StringIO()
    # BOM for Excel Arabic compatibility
    buf.write("\ufeff")
    writer = csv.writer(buf)
    writer.writerow([
        "kind", "id", "role_or_relationship", "compound_id", "company_id",
        "max_uses", "used_count", "is_active", "status", "created_at",
        "expires_at", "created_by_username", "note", "invitee_name_hint",
    ])
    for inv in cmp_invites:
        writer.writerow([
            "compound", inv.get("id"), inv.get("role"), inv.get("compound_id"),
            inv.get("company_id"), inv.get("max_uses"), inv.get("used_count", 0),
            inv.get("is_active"), _classify(inv, now), inv.get("created_at"),
            inv.get("expires_at"), inv.get("created_by_username"),
            inv.get("note"), "",
        ])
    for inv in fam_invites:
        writer.writerow([
            "family", inv.get("id"), inv.get("relationship"), inv.get("compound_id"),
            inv.get("company_id"), inv.get("max_uses"), inv.get("used_count", 0),
            inv.get("is_active"), _classify(inv, now), inv.get("created_at"),
            inv.get("expires_at"), inv.get("created_by_username"),
            inv.get("note"), inv.get("invitee_name_hint"),
        ])

    fname = f"invites_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


# ----- Analytics (high-level admins only) -----------------------------------

def _bucket_dates(start: datetime, end: datetime) -> List[str]:
    """Return inclusive list of YYYY-MM-DD strings between start and end (UTC)."""
    out = []
    d = start.date()
    while d <= end.date():
        out.append(d.isoformat())
        d = d + timedelta(days=1)
    return out


@router.get("/invite-analytics")
async def get_invite_analytics(
    period_days: Optional[str] = Query(default="30"),
    current_user: dict = Depends(get_current_user),
):
    """Time-series + leaderboard analytics. Restricted to high-level admins."""
    role = current_user.get("role")
    if role not in ("app_owner", "super_admin"):
        # company_admin sees their own company only
        if role != "company_admin":
            raise HTTPException(status_code=403, detail="غير مصرح")

    db = get_db()
    days = _parse_period(period_days) or 30
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    cmp_q, fam_q = _scope_queries(current_user)
    cmp_q = {**cmp_q, "used_count": {"$gt": 0}}
    fam_q = {**fam_q, "used_count": {"$gt": 0}}

    cmp_invites = await db.compound_invites.find(cmp_q, {"_id": 0}).to_list(length=20000)
    fam_invites = await db.family_invites.find(fam_q, {"_id": 0}).to_list(length=20000)

    # Daily acceptances bucket — based on accepted users' created_at within window
    accepted_user_ids = []
    for inv in cmp_invites + fam_invites:
        accepted_user_ids.extend(inv.get("accepted_user_ids", []) or [])

    # Hydrate accepted users
    daily = {d: 0 for d in _bucket_dates(cutoff, datetime.now(timezone.utc))}
    if accepted_user_ids:
        cursor = db.users.find(
            {"id": {"$in": accepted_user_ids}, "created_at": {"$gte": cutoff.isoformat()}},
            {"_id": 0, "id": 1, "created_at": 1, "compound_id": 1, "role": 1, "source": 1, "relationship_to_head": 1},
        )
        users = await cursor.to_list(length=20000)
    else:
        users = []

    for u in users:
        try:
            ts = u.get("created_at", "")
            d = ts[:10]  # YYYY-MM-DD
            if d in daily:
                daily[d] += 1
        except Exception:
            pass
    daily_series = [{"date": d, "count": c} for d, c in sorted(daily.items())]

    # Top compounds by acceptances
    cmp_counter = {}
    cmp_names = {}
    for u in users:
        cid = u.get("compound_id")
        if cid:
            cmp_counter[cid] = cmp_counter.get(cid, 0) + 1
    if cmp_counter:
        cpds = await db.compounds.find(
            {"id": {"$in": list(cmp_counter.keys())}},
            {"_id": 0, "id": 1, "name": 1},
        ).to_list(length=200)
        for c in cpds:
            cmp_names[c["id"]] = c.get("name") or c["id"][:8]
    top_compounds = sorted(
        [{"compound_id": k, "name": cmp_names.get(k, k[:8]), "acceptances": v} for k, v in cmp_counter.items()],
        key=lambda x: x["acceptances"], reverse=True,
    )[:5]

    # Top roles (counts each accepted user by their role/relationship)
    role_counter = {}
    for u in users:
        if u.get("source") == "family_invite_link":
            key = u.get("relationship_to_head") or "other"
        else:
            key = u.get("role") or "resident"
        role_counter[key] = role_counter.get(key, 0) + 1
    top_roles = sorted(
        [{"role": k, "count": v} for k, v in role_counter.items()],
        key=lambda x: x["count"], reverse=True,
    )[:5]

    # Slowest roles — invites that expired/unused, grouped by role
    now = datetime.now(timezone.utc)
    slow_q_cmp, slow_q_fam = _scope_queries(current_user)
    slow_q_cmp = _apply_period(slow_q_cmp, days)
    slow_q_fam = _apply_period(slow_q_fam, days)
    cmp_all = await db.compound_invites.find(slow_q_cmp, {"_id": 0}).to_list(length=20000)
    fam_all = await db.family_invites.find(slow_q_fam, {"_id": 0}).to_list(length=20000)
    slow_counter = {}
    for inv in cmp_all:
        if _classify(inv, now) in ("expired", "revoked") and inv.get("used_count", 0) == 0:
            k = inv.get("role") or "resident"
            slow_counter[k] = slow_counter.get(k, 0) + 1
    for inv in fam_all:
        if _classify(inv, now) in ("expired", "revoked") and inv.get("used_count", 0) == 0:
            k = inv.get("relationship") or "other"
            slow_counter[k] = slow_counter.get(k, 0) + 1
    slowest_roles = sorted(
        [{"role": k, "expired_or_unused": v} for k, v in slow_counter.items()],
        key=lambda x: x["expired_or_unused"], reverse=True,
    )[:5]

    return {
        "period_days": days,
        "scope": _scope_label(role),
        "daily_acceptances": daily_series,
        "top_compounds": top_compounds,
        "top_roles": top_roles,
        "slowest_roles": slowest_roles,
        "total_acceptances": sum(daily.values()),
    }
