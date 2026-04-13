"""
Contracts Management routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import logging

from database import get_db
from auth_deps import get_current_user, require_admin
from helpers import serialize_datetime, notify_compound_admins

router = APIRouter(prefix="/api")


class ContractCreate(BaseModel):
    title: str
    provider_name: str
    provider_phone: str = ""
    provider_email: str = ""
    category: str = "maintenance"
    value: float = 0
    start_date: str
    end_date: str
    terms: str = ""
    auto_renew: bool = False


@router.post("/contracts")
async def create_contract(data: ContractCreate, current_user: dict = Depends(require_admin)):
    db = get_db()
    try:
        contract = {
            "id": str(uuid.uuid4()),
            "compound_id": current_user["compound_id"],
            **data.dict(),
            "status": "active",
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc)
        }
        await db.contracts.insert_one(contract)
        return {"message": "تم إنشاء العقد بنجاح", "contract_id": contract["id"]}
    except Exception as e:
        logging.error(f"Error creating contract: {e}")
        raise HTTPException(status_code=500, detail="Failed to create contract")


@router.get("/contracts")
async def get_contracts(status: Optional[str] = None, current_user: dict = Depends(require_admin)):
    db = get_db()
    try:
        query = {"compound_id": current_user["compound_id"]}
        if status:
            query["status"] = status
        contracts = await db.contracts.find(query, {"_id": 0}).sort("end_date", 1).to_list(200)

        now = datetime.now(timezone.utc)
        for c in contracts:
            try:
                end_str = c.get("end_date", "")
                if isinstance(end_str, str):
                    end = datetime.fromisoformat(end_str.replace("Z", "+00:00").split("T")[0])
                    if end.tzinfo is None:
                        end = end.replace(tzinfo=timezone.utc)
                else:
                    end = end_str
                days_left = (end - now).days
                c["days_remaining"] = days_left
                if days_left < 0:
                    c["status"] = "expired"
                    c["urgency"] = "expired"
                elif days_left <= 7:
                    c["urgency"] = "critical"
                elif days_left <= 30:
                    c["urgency"] = "warning"
                else:
                    c["urgency"] = "normal"
            except Exception as ex:
                logging.warning(f"Date parse error for contract: {ex}")
                c["days_remaining"] = None
                c["urgency"] = "unknown"

        active = [c for c in contracts if c.get("status") == "active" and (c.get("days_remaining") or 0) >= 0]
        expiring = [c for c in contracts if c.get("urgency") in ["critical", "warning"]]
        expired = [c for c in contracts if c.get("status") == "expired" or (c.get("days_remaining") is not None and c["days_remaining"] < 0)]
        total_value = sum(float(c.get("value", 0)) for c in active)

        return {
            "contracts": serialize_datetime(contracts),
            "summary": {
                "total": len(contracts),
                "active": len(active),
                "expiring_soon": len(expiring),
                "expired": len(expired),
                "total_value": round(total_value, 2)
            }
        }
    except Exception as e:
        logging.error(f"Error fetching contracts: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch contracts")


@router.put("/contracts/{contract_id}")
async def update_contract(contract_id: str, data: ContractCreate, current_user: dict = Depends(require_admin)):
    db = get_db()
    try:
        result = await db.contracts.update_one(
            {"id": contract_id, "compound_id": current_user["compound_id"]},
            {"$set": {**data.dict(), "updated_at": datetime.now(timezone.utc)}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Contract not found")
        return {"message": "تم تحديث العقد بنجاح"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating contract: {e}")
        raise HTTPException(status_code=500, detail="Failed to update contract")


@router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: str, current_user: dict = Depends(require_admin)):
    db = get_db()
    try:
        result = await db.contracts.delete_one({"id": contract_id, "compound_id": current_user["compound_id"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Contract not found")
        return {"message": "تم حذف العقد بنجاح"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting contract: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete contract")


async def check_expiring_contracts():
    """Check for expiring contracts and notify admins"""
    db = get_db()
    try:
        now = datetime.now(timezone.utc)
        warn_30 = (now + timedelta(days=30)).isoformat()[:10]
        warn_7 = (now + timedelta(days=7)).isoformat()[:10]
        today = now.isoformat()[:10]

        compounds = await db.compounds.find({}, {"_id": 0, "id": 1}).to_list(100)
        for compound in compounds:
            cid = compound["id"]
            contracts = await db.contracts.find({"compound_id": cid, "status": "active"}, {"_id": 0}).to_list(100)

            for c in contracts:
                end = c.get("end_date", "")[:10]
                if end == today:
                    await notify_compound_admins(cid, "عقد ينتهي اليوم!", f"العقد '{c['title']}' مع {c['provider_name']} ينتهي اليوم", "contract_expiry", None)
                elif end == warn_7:
                    await notify_compound_admins(cid, "عقد ينتهي خلال 7 أيام", f"العقد '{c['title']}' مع {c['provider_name']} ينتهي خلال 7 أيام", "contract_warning", None)
                elif end == warn_30:
                    await notify_compound_admins(cid, "عقد ينتهي خلال 30 يوم", f"العقد '{c['title']}' مع {c['provider_name']} ينتهي خلال شهر", "contract_notice", None)
    except Exception as e:
        logging.error(f"Error checking contracts: {e}")
