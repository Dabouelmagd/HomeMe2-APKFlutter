"""
Guest Management & Visit Request routes
"""
from fastapi import APIRouter, HTTPException, Depends, Form
from datetime import datetime, timezone
from io import BytesIO
import uuid
import json
import base64
import logging
import qrcode

from database import get_db
from auth_deps import get_current_user, require_admin
from helpers import serialize_datetime

router = APIRouter(prefix="/api")


@router.post("/visit-requests")
async def create_visit_request(
    visitor_name: str = Form(...), visitor_phone: str = Form(...), visitor_email: str = Form(None),
    visitor_id_number: str = Form(None), visit_purpose: str = Form(...), visit_date: str = Form(...),
    unit_number: str = Form(...), host_name: str = Form(...), host_phone: str = Form(...),
    special_instructions: str = Form(None), vehicle_plate: str = Form(None),
    escort_required: bool = Form(False), pre_approved: bool = Form(False),
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    try:
        valid_purposes = ["family_visit", "business_meeting", "delivery", "maintenance", "healthcare", "social_event", "other"]
        if visit_purpose not in valid_purposes:
            raise HTTPException(status_code=422, detail=f"Invalid visit purpose. Must be one of: {', '.join(valid_purposes)}")
        visit_request = {
            "id": str(uuid.uuid4()), "visitor_name": visitor_name, "visitor_phone": visitor_phone,
            "visitor_email": visitor_email, "visitor_id_number": visitor_id_number,
            "visit_purpose": visit_purpose, "visit_date": visit_date, "unit_number": unit_number,
            "host_name": host_name, "host_phone": host_phone, "special_instructions": special_instructions,
            "vehicle_plate": vehicle_plate, "escort_required": escort_required,
            "status": "approved" if pre_approved and current_user.get("role") == "admin" else "pending",
            "requested_by": current_user["id"], "compound_id": current_user["compound_id"],
            "family_id": current_user.get("family_id"),
            "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)
        }
        await db.visit_requests.insert_one(visit_request)
        return {"message": "Visit request created successfully", "request_id": visit_request["id"]}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating visit request: {e}")
        raise HTTPException(status_code=500, detail="Failed to create visit request")


@router.get("/visit-requests")
async def get_visit_requests(current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        query = {"compound_id": current_user["compound_id"]}
        if current_user.get("role") != "admin":
            query["requested_by"] = current_user["id"]
        requests = await db.visit_requests.find(query).sort("created_at", -1).to_list(length=10000)
        return {"requests": serialize_datetime(requests)}
    except Exception as e:
        logging.error(f"Error fetching visit requests: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch visit requests")


@router.get("/guests")
async def get_guests(current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        query = {"compound_id": current_user["compound_id"], "status": {"$in": ["approved", "checked_in", "checked_out"]}}
        guests = await db.visit_requests.find(query).sort("created_at", -1).to_list(length=10000)
        return {"guests": serialize_datetime(guests)}
    except Exception as e:
        logging.error(f"Error fetching guests: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch guests")


@router.get("/guests/stats")
async def get_guest_stats(current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        query = {"compound_id": current_user["compound_id"]}
        all_requests = await db.visit_requests.find(query).to_list(length=10000)
        stats = {
            "total_visitors": len(all_requests),
            "pending_approvals": len([r for r in all_requests if r["status"] == "pending"]),
            "active_visits": len([r for r in all_requests if r["status"] == "checked_in"]),
            "todays_visits": len([r for r in all_requests if r["visit_date"].startswith(datetime.now().strftime("%Y-%m-%d"))])
        }
        return {"stats": stats}
    except Exception as e:
        logging.error(f"Error fetching guest stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch guest stats")


@router.patch("/visit-requests/{request_id}/approve")
async def approve_visit_request(request_id: str, current_user: dict = Depends(require_admin)):
    db = get_db()
    try:
        request = await db.visit_requests.find_one({"id": request_id, "compound_id": current_user["compound_id"]})
        if not request:
            raise HTTPException(status_code=404, detail="Visit request not found")
        qr_data = {"guest_id": request_id, "visitor_name": request["visitor_name"], "visit_date": request["visit_date"], "unit_number": request["unit_number"], "host_name": request["host_name"], "compound_id": current_user["compound_id"], "generated_at": datetime.now(timezone.utc).isoformat()}
        await db.visit_requests.update_one({"id": request_id}, {"$set": {"status": "approved", "approved_by": current_user["id"], "approved_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc), "qr_code_data": json.dumps(qr_data)}})
        return {"message": "Visit request approved successfully", "qr_data": qr_data}
    except Exception as e:
        logging.error(f"Error approving visit request: {e}")
        raise HTTPException(status_code=500, detail="Failed to approve visit request")


@router.patch("/visit-requests/{request_id}/reject")
async def reject_visit_request(request_id: str, reason: str = Form(None), current_user: dict = Depends(require_admin)):
    db = get_db()
    try:
        request = await db.visit_requests.find_one({"id": request_id, "compound_id": current_user["compound_id"]})
        if not request:
            raise HTTPException(status_code=404, detail="Visit request not found")
        await db.visit_requests.update_one({"id": request_id}, {"$set": {"status": "rejected", "rejected_by": current_user["id"], "rejected_at": datetime.now(timezone.utc), "rejection_reason": reason, "updated_at": datetime.now(timezone.utc)}})
        return {"message": "Visit request rejected successfully"}
    except Exception as e:
        logging.error(f"Error rejecting visit request: {e}")
        raise HTTPException(status_code=500, detail="Failed to reject visit request")


@router.patch("/guests/{guest_id}/checkin")
async def checkin_guest(guest_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        guest = await db.visit_requests.find_one({"id": guest_id, "compound_id": current_user["compound_id"], "status": "approved"})
        if not guest:
            raise HTTPException(status_code=404, detail="Approved guest not found")
        await db.visit_requests.update_one({"id": guest_id}, {"$set": {"status": "checked_in", "checked_in_at": datetime.now(timezone.utc), "checked_in_by": current_user["id"], "updated_at": datetime.now(timezone.utc)}})
        return {"message": "Guest checked in successfully"}
    except Exception as e:
        logging.error(f"Error checking in guest: {e}")
        raise HTTPException(status_code=500, detail="Failed to check in guest")


@router.patch("/guests/{guest_id}/checkout")
async def checkout_guest(guest_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        guest = await db.visit_requests.find_one({"id": guest_id, "compound_id": current_user["compound_id"], "status": "checked_in"})
        if not guest:
            raise HTTPException(status_code=404, detail="Checked-in guest not found")
        await db.visit_requests.update_one({"id": guest_id}, {"$set": {"status": "checked_out", "checked_out_at": datetime.now(timezone.utc), "checked_out_by": current_user["id"], "updated_at": datetime.now(timezone.utc)}})
        return {"message": "Guest checked out successfully"}
    except Exception as e:
        logging.error(f"Error checking out guest: {e}")
        raise HTTPException(status_code=500, detail="Failed to check out guest")


@router.post("/guests/scan-qr")
async def scan_qr_code(qr_data: str = Form(...), action: str = Form(...), current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        try:
            qr_info = json.loads(qr_data)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid QR code format")
        guest_id = qr_info.get("guest_id")
        if not guest_id:
            raise HTTPException(status_code=400, detail="Invalid QR code - missing guest ID")
        guest = await db.visit_requests.find_one({"id": guest_id, "compound_id": current_user["compound_id"]})
        if not guest:
            raise HTTPException(status_code=404, detail="Guest not found")
        if action == "checkin":
            if guest["status"] != "approved":
                raise HTTPException(status_code=400, detail="Guest not approved for check-in")
            await db.visit_requests.update_one({"id": guest_id}, {"$set": {"status": "checked_in", "checked_in_at": datetime.now(timezone.utc), "checked_in_by": current_user["id"], "updated_at": datetime.now(timezone.utc)}})
            message = "Guest checked in successfully via QR scan"
        elif action == "checkout":
            if guest["status"] != "checked_in":
                raise HTTPException(status_code=400, detail="Guest not checked in")
            await db.visit_requests.update_one({"id": guest_id}, {"$set": {"status": "checked_out", "checked_out_at": datetime.now(timezone.utc), "checked_out_by": current_user["id"], "updated_at": datetime.now(timezone.utc)}})
            message = "Guest checked out successfully via QR scan"
        else:
            raise HTTPException(status_code=400, detail="Invalid action. Use 'checkin' or 'checkout'")
        return {"message": message, "guest": {"visitor_name": guest["visitor_name"], "unit_number": guest["unit_number"], "host_name": guest["host_name"], "visit_date": guest["visit_date"]}}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error processing QR scan: {e}")
        raise HTTPException(status_code=500, detail="Failed to process QR scan")


@router.get("/guests/{guest_id}/qr-code")
async def generate_guest_qr_code(guest_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        guest = await db.visit_requests.find_one({"id": guest_id, "compound_id": current_user["compound_id"], "status": "approved"})
        if not guest:
            raise HTTPException(status_code=404, detail="Approved guest not found")
        qr_data = {"guest_id": guest_id, "visitor_name": guest["visitor_name"], "visit_date": guest["visit_date"], "unit_number": guest["unit_number"], "host_name": guest["host_name"], "compound_id": current_user["compound_id"], "generated_at": datetime.now(timezone.utc).isoformat()}
        qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=4)
        qr.add_data(json.dumps(qr_data))
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        return {"qr_code": f"data:image/png;base64,{img_str}", "qr_data": qr_data, "guest_info": {"visitor_name": guest["visitor_name"], "unit_number": guest["unit_number"], "visit_date": guest["visit_date"], "host_name": guest["host_name"]}}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating QR code: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate QR code")
