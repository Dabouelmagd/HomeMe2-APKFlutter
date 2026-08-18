"""
Compound Person & Vehicle Tracking System
- Residents opt-in to share location with family/admin
- Real-time location via WebSocket
- Tracking zones (home, compound gate, parking)
- Privacy-first: owner controls who can see them
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import json
import asyncio

from auth_deps import get_current_user, require_admin
from database import get_db

router = APIRouter(prefix="/api/tracking", tags=["tracking"])

# In-memory: active trackers {tracker_id: {ws, user_id, compound_id, last_loc}}
_active_trackers: dict = {}
# In-memory: watchers {compound_id: {watcher_user_id: ws}}
_watchers: dict = {}


# ── Tracking Persons (who can be tracked) ─────────────────────
@router.get("/persons")
async def get_tracked_persons(current_user: dict = Depends(get_current_user)):
    """Get all tracking-enabled persons in compound."""
    db = get_db()
    compound_id = current_user.get("compound_id", "")
    role = current_user.get("role", "")

    query = {"compound_id": compound_id, "tracking_enabled": True}

    # Residents only see their own family members they added
    if role == "resident":
        query["added_by"] = current_user["id"]

    persons = await db.tracking_persons.find(query, {"_id": 0}).to_list(200)

    # Enrich with last known location
    for p in persons:
        loc = await db.tracking_locations.find_one(
            {"tracker_id": p["id"]},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        p["last_location"] = loc
        p["is_online"] = p["id"] in _active_trackers

    return {"persons": persons}


@router.post("/persons")
async def add_tracked_person(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """Add a person to track (family member, driver, helper)."""
    db = get_db()

    name        = body.get("name", "").strip()
    relation    = body.get("relation", "")   # family/driver/helper/security/car
    phone       = body.get("phone", "").strip()
    description = body.get("description", "").strip()
    vehicle_plate = body.get("vehicle_plate", "").strip()
    avatar_color  = body.get("avatar_color", "#059669")

    if not name:
        raise HTTPException(400, "الاسم مطلوب")

    RELATIONS = ["family", "driver", "helper", "security", "car", "other"]
    if relation not in RELATIONS:
        relation = "other"

    now = datetime.now(timezone.utc).isoformat()
    person_id = str(uuid.uuid4())
    # Generate a short share code for the tracked person to scan
    share_code = person_id[:8].upper()

    doc = {
        "id": person_id,
        "compound_id": current_user.get("compound_id", ""),
        "added_by": current_user["id"],
        "added_by_name": current_user.get("full_name") or current_user.get("username"),
        "name": name,
        "relation": relation,
        "phone": phone,
        "description": description,
        "vehicle_plate": vehicle_plate,
        "avatar_color": avatar_color,
        "share_code": share_code,
        "tracking_enabled": True,
        "privacy_level": body.get("privacy_level", "family"),  # family/admin/all
        "created_at": now,
        "updated_at": now,
    }

    await db.tracking_persons.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "person": doc, "share_code": share_code}


@router.put("/persons/{person_id}")
async def update_tracked_person(
    person_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update tracking person settings."""
    db = get_db()
    person = await db.tracking_persons.find_one({"id": person_id})
    if not person:
        raise HTTPException(404, "الشخص غير موجود")
    if person["added_by"] != current_user["id"] and current_user.get("role") not in ("admin", "app_owner", "super_admin"):
        raise HTTPException(403, "غير مصرح")

    await db.tracking_persons.update_one(
        {"id": person_id},
        {"$set": {
            "name": body.get("name", person["name"]),
            "tracking_enabled": body.get("tracking_enabled", person["tracking_enabled"]),
            "privacy_level": body.get("privacy_level", person.get("privacy_level", "family")),
            "vehicle_plate": body.get("vehicle_plate", person.get("vehicle_plate", "")),
            "avatar_color": body.get("avatar_color", person.get("avatar_color", "#059669")),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    return {"success": True}


@router.delete("/persons/{person_id}")
async def delete_tracked_person(
    person_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a person from tracking."""
    db = get_db()
    person = await db.tracking_persons.find_one({"id": person_id})
    if not person:
        raise HTTPException(404, "الشخص غير موجود")
    if person["added_by"] != current_user["id"] and current_user.get("role") not in ("admin", "app_owner", "super_admin"):
        raise HTTPException(403, "غير مصرح")

    await db.tracking_persons.update_one(
        {"id": person_id}, {"$set": {"tracking_enabled": False}}
    )
    return {"success": True}


# ── Location Updates (REST fallback) ──────────────────────────
@router.post("/location/{tracker_id}")
async def update_location(
    tracker_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """Push location update via REST (WebSocket preferred)."""
    db = get_db()
    lat = body.get("lat")
    lng = body.get("lng")
    accuracy = body.get("accuracy", 0)
    speed = body.get("speed", 0)
    heading = body.get("heading", 0)
    battery = body.get("battery", 100)

    if lat is None or lng is None:
        raise HTTPException(400, "lat و lng مطلوبان")

    now = datetime.now(timezone.utc).isoformat()

    loc_doc = {
        "id": str(uuid.uuid4()),
        "tracker_id": tracker_id,
        "user_id": current_user["id"],
        "lat": lat, "lng": lng,
        "accuracy": accuracy,
        "speed": speed,
        "heading": heading,
        "battery": battery,
        "created_at": now,
    }
    await db.tracking_locations.insert_one(loc_doc)

    # Keep only last 100 locations per tracker
    all_locs = await db.tracking_locations.find(
        {"tracker_id": tracker_id}, {"_id": 1}
    ).sort("created_at", -1).to_list(200)
    if len(all_locs) > 100:
        old_ids = [l["_id"] for l in all_locs[100:]]
        await db.tracking_locations.delete_many({"_id": {"$in": old_ids}})

    # Broadcast to watchers via memory
    compound_id = current_user.get("compound_id", "")
    if compound_id in _watchers:
        msg = json.dumps({
            "type": "location_update",
            "tracker_id": tracker_id,
            "lat": lat, "lng": lng,
            "speed": speed,
            "battery": battery,
            "timestamp": now,
        })
        dead = []
        for uid, ws in _watchers[compound_id].items():
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(uid)
        for uid in dead:
            _watchers[compound_id].pop(uid, None)

    loc_doc.pop("_id", None)
    return {"success": True, "location": loc_doc}


@router.get("/history/{tracker_id}")
async def get_location_history(
    tracker_id: str,
    hours: int = 24,
    current_user: dict = Depends(get_current_user)
):
    """Get location history for a tracked person."""
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    locs = await db.tracking_locations.find(
        {"tracker_id": tracker_id, "created_at": {"$gte": since}},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return {"locations": locs, "count": len(locs)}


# ── Tracking Zones ─────────────────────────────────────────────
@router.get("/zones")
async def get_zones(current_user: dict = Depends(get_current_user)):
    """Get compound tracking zones."""
    db = get_db()
    compound_id = current_user.get("compound_id", "")
    zones = await db.tracking_zones.find({"compound_id": compound_id}, {"_id": 0}).to_list(50)
    return {"zones": zones}


@router.post("/zones")
async def create_zone(
    body: dict,
    current_user: dict = Depends(require_admin)
):
    """Create a tracking zone (gate, parking, playground, etc.)."""
    db = get_db()
    zone = {
        "id": str(uuid.uuid4()),
        "compound_id": current_user.get("compound_id", ""),
        "name": body.get("name", "").strip(),
        "type": body.get("type", "area"),  # gate/parking/playground/pool/gym/area
        "lat": body.get("lat"),
        "lng": body.get("lng"),
        "radius_meters": body.get("radius_meters", 50),
        "color": body.get("color", "#059669"),
        "notify_on_enter": body.get("notify_on_enter", False),
        "notify_on_exit": body.get("notify_on_exit", False),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tracking_zones.insert_one(zone)
    zone.pop("_id", None)
    return {"success": True, "zone": zone}


@router.delete("/zones/{zone_id}")
async def delete_zone(
    zone_id: str,
    current_user: dict = Depends(require_admin)
):
    await get_db().tracking_zones.delete_one({"id": zone_id})
    return {"success": True}


# ── WebSocket for real-time tracking ──────────────────────────
@router.websocket("/ws/watch/{compound_id}")
async def watch_compound(
    websocket: WebSocket,
    compound_id: str,
    token: str = ""
):
    """Watcher WebSocket: admin/family member watching the map."""
    await websocket.accept()
    watcher_id = str(uuid.uuid4())

    if compound_id not in _watchers:
        _watchers[compound_id] = {}
    _watchers[compound_id][watcher_id] = websocket

    # Send current positions of all active trackers
    db = get_db()
    persons = await db.tracking_persons.find(
        {"compound_id": compound_id, "tracking_enabled": True}, {"_id": 0}
    ).to_list(200)

    for p in persons:
        loc = await db.tracking_locations.find_one(
            {"tracker_id": p["id"]}, {"_id": 0},
            sort=[("created_at", -1)]
        )
        if loc:
            await websocket.send_text(json.dumps({
                "type": "initial_position",
                "tracker_id": p["id"],
                "name": p["name"],
                "relation": p["relation"],
                "avatar_color": p.get("avatar_color", "#059669"),
                "lat": loc["lat"],
                "lng": loc["lng"],
                "timestamp": loc["created_at"],
                "is_online": p["id"] in _active_trackers,
            }))

    try:
        while True:
            await websocket.receive_text()  # keep alive
    except WebSocketDisconnect:
        _watchers.get(compound_id, {}).pop(watcher_id, None)


@router.websocket("/ws/track/{tracker_id}")
async def tracker_websocket(
    websocket: WebSocket,
    tracker_id: str,
    token: str = ""
):
    """Tracker WebSocket: the person being tracked sends their location."""
    await websocket.accept()
    _active_trackers[tracker_id] = {"ws": websocket, "last_loc": None}

    # Notify watchers that tracker is online
    db = get_db()
    person = await db.tracking_persons.find_one({"id": tracker_id}, {"_id": 0})
    compound_id = person.get("compound_id", "") if person else ""

    if compound_id and compound_id in _watchers:
        online_msg = json.dumps({"type": "tracker_online", "tracker_id": tracker_id})
        for ws in list(_watchers[compound_id].values()):
            try:
                await ws.send_text(online_msg)
            except Exception:
                pass

    try:
        while True:
            data = await websocket.receive_text()
            loc = json.loads(data)
            lat, lng = loc.get("lat"), loc.get("lng")
            if lat is None or lng is None:
                continue

            now = datetime.now(timezone.utc).isoformat()
            loc_doc = {
                "id": str(uuid.uuid4()),
                "tracker_id": tracker_id,
                "lat": lat, "lng": lng,
                "accuracy": loc.get("accuracy", 0),
                "speed": loc.get("speed", 0),
                "heading": loc.get("heading", 0),
                "battery": loc.get("battery", 100),
                "created_at": now,
            }
            await db.tracking_locations.insert_one(loc_doc)
            _active_trackers[tracker_id]["last_loc"] = loc_doc

            # Broadcast to all watchers of this compound
            if compound_id and compound_id in _watchers:
                msg = json.dumps({
                    "type": "location_update",
                    "tracker_id": tracker_id,
                    "lat": lat, "lng": lng,
                    "speed": loc.get("speed", 0),
                    "battery": loc.get("battery", 100),
                    "timestamp": now,
                })
                dead = []
                for uid, ws in _watchers[compound_id].items():
                    try:
                        await ws.send_text(msg)
                    except Exception:
                        dead.append(uid)
                for uid in dead:
                    _watchers[compound_id].pop(uid, None)

    except WebSocketDisconnect:
        _active_trackers.pop(tracker_id, None)
        # Notify watchers offline
        if compound_id and compound_id in _watchers:
            offline_msg = json.dumps({"type": "tracker_offline", "tracker_id": tracker_id})
            for ws in list(_watchers[compound_id].values()):
                try:
                    await ws.send_text(offline_msg)
                except Exception:
                    pass


# ── Stats for dashboard ────────────────────────────────────────
@router.get("/stats")
async def get_tracking_stats(current_user: dict = Depends(require_admin)):
    db = get_db()
    compound_id = current_user.get("compound_id", "")
    total   = await db.tracking_persons.count_documents({"compound_id": compound_id, "tracking_enabled": True})
    online  = len([t for t in _active_trackers.keys()])
    zones   = await db.tracking_zones.count_documents({"compound_id": compound_id})
    return {"total_tracked": total, "online_now": online, "zones": zones}
