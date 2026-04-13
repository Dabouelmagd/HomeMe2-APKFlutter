"""
Service Providers & Bookings routes - extracted from server.py
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid
import json
import logging
import os

from database import get_db
from auth_deps import get_current_user, require_admin, require_super_admin
from helpers import serialize_datetime
from shared_models import *


router = APIRouter(prefix="/api")

@router.post("/service-providers")
async def create_service_provider(
    provider_data: ServiceProviderCreate,
    current_user: dict = Depends(require_admin)
):
    """Create a new service provider (Admin only)"""
    try:
        db = get_db()
        # Check if provider already exists
        existing_provider = await db.service_providers.find_one({
            "email": provider_data.email,
            "compound_id": current_user.compound_id
        })
        
        if existing_provider:
            raise HTTPException(status_code=400, detail="Service provider already exists")
        
        provider = ServiceProvider(
            **provider_data.dict(),
            compound_id=current_user.compound_id
        )
        
        await db.service_providers.insert_one(serialize_datetime(provider.dict()))
        return {"message": "Service provider created successfully", "provider": serialize_datetime(provider.dict())}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating service provider: {e}")
        raise HTTPException(status_code=500, detail="Failed to create service provider")

@router.get("/service-providers")
async def get_service_providers(
    service_category: Optional[str] = None,
    specialty: Optional[str] = None,
    available_date: Optional[date] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get available service providers"""
    try:
        db = get_db()
        query = {
            "compound_id": current_user.compound_id,
            "is_active": True
        }
        
        if service_category:
            query["services"] = {"$in": [service_category]}
        
        if specialty:
            query["specialties"] = {"$in": [specialty]}
        
        providers = await db.service_providers.find(query).to_list(length=None)
        
        # Enhance with availability if date specified
        if available_date:
            day_name = available_date.strftime("%A").lower()
            available_providers = []
            for provider in providers:
                if day_name in provider.get("availability", {}):
                    available_providers.append(provider)
            providers = available_providers
        
        # Serialize ObjectIds and datetime objects
        serialized_providers = [serialize_datetime(provider) for provider in providers]
        
        return {"providers": serialized_providers}
        
    except Exception as e:
        logging.error(f"Error getting service providers: {e}")
        raise HTTPException(status_code=500, detail="Failed to get service providers")

@router.post("/service-bookings")
async def create_service_booking(
    booking_data: ServiceBookingCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new service booking"""
    try:
        db = get_db()
        # Verify provider exists and is available
        provider = await db.service_providers.find_one({
            "id": booking_data.provider_id,
            "compound_id": current_user.compound_id,
            "is_active": True
        })
        
        if not provider:
            raise HTTPException(status_code=404, detail="Service provider not found")
        
        # Check for scheduling conflicts if date/time specified
        if booking_data.scheduled_date and booking_data.scheduled_time:
            # Validate that scheduled date is not in the past
            if booking_data.scheduled_date < date.today():
                raise HTTPException(status_code=400, detail="Cannot schedule booking for past date")
            
            existing_booking = await db.service_bookings.find_one({
                "provider_id": booking_data.provider_id,
                "scheduled_date": booking_data.scheduled_date.isoformat(),
                "scheduled_time": booking_data.scheduled_time,
                "status": {"$in": ["pending", "confirmed", "in_progress"]}
            })
            
            if existing_booking:
                raise HTTPException(status_code=400, detail="Time slot already booked - scheduling conflict detected")
        
        # Calculate estimated cost based on provider's hourly rate
        estimated_cost = None
        if provider.get("hourly_rate") and booking_data.estimated_duration:
            estimated_cost = (provider["hourly_rate"] * booking_data.estimated_duration) / 60
        
        booking = ServiceBooking(
            **booking_data.dict(),
            resident_id=current_user.id,
            compound_id=current_user.compound_id,
            estimated_cost=estimated_cost
        )
        
        # Serialize the booking data before inserting
        booking_dict = serialize_datetime(booking.dict())
        await db.service_bookings.insert_one(booking_dict)
        
        # Send notification to provider (WebSocket or email)
        await manager.send_personal_message(
            json.dumps({
                "type": "new_booking",
                "booking_id": booking.id,
                "message": f"New {booking.priority} booking request from {current_user.full_name}"
            }),
            booking_data.provider_id
        )
        
        # Notify admins about new service booking
        await notify_compound_admins(
            compound_id=current_user.compound_id,
            title="حجز خدمة جديد",
            content=f"حجز خدمة جديد من {current_user.full_name} - {provider.get('name', 'مزود خدمة')}",
            action_type="new_booking",
            exclude_user_id=None
        )
        
        return {"message": "Service booking created successfully", "booking": serialize_datetime(booking.dict())}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating service booking: {e}")
        raise HTTPException(status_code=500, detail="Failed to create service booking")

@router.get("/service-bookings")
async def get_service_bookings(
    status: Optional[str] = None,
    provider_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get service bookings for current user"""
    try:
        db = get_db()
        query = {
            "compound_id": current_user.compound_id
        }
        
        if current_user.role == "resident":
            query["resident_id"] = current_user.id
        elif provider_id:
            query["provider_id"] = provider_id
        
        if status:
            query["status"] = status
        
        bookings = await db.service_bookings.find(query).sort("created_at", -1).to_list(length=None)
        
        # Enhance with provider and resident details
        enhanced_bookings = []
        for booking in bookings:
            provider = await db.service_providers.find_one({"id": booking["provider_id"]})
            resident = await db.users.find_one({"id": booking["resident_id"]})
            
            enhanced_booking = {
                **serialize_datetime(booking),
                "provider_name": provider["full_name"] if provider else "Unknown",
                "provider_phone": provider["phone"] if provider else None,
                "resident_name": resident["full_name"] if resident else "Unknown"
            }
            enhanced_bookings.append(enhanced_booking)
        
        return {"bookings": enhanced_bookings}
        
    except Exception as e:
        logging.error(f"Error getting service bookings: {e}")
        raise HTTPException(status_code=500, detail="Failed to get service bookings")

@router.put("/service-bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status_update: BookingStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update booking status"""
    try:
        db = get_db()
        booking = await db.service_bookings.find_one({
            "id": booking_id,
            "compound_id": current_user.compound_id
        })
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # Check permissions
        if current_user.role == "resident" and booking["resident_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        update_data = {
            "status": status_update.status,
            "updated_at": datetime.now(timezone.utc)
        }
        
        if status_update.notes:
            update_data["completion_notes"] = status_update.notes
        
        if status_update.final_cost:
            update_data["final_cost"] = status_update.final_cost
        
        if status_update.status == "completed":
            update_data["completed_at"] = datetime.now(timezone.utc)
        
        await db.service_bookings.update_one(
            {"id": booking_id},
            {"$set": serialize_datetime(update_data)}
        )
        
        # Update provider stats if completed
        if status_update.status == "completed":
            await db.service_providers.update_one(
                {"id": booking["provider_id"]},
                {"$inc": {"total_jobs_completed": 1}}
            )
        
        return {"message": "Booking status updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating booking status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update booking status")

@router.post("/service-bookings/{booking_id}/review")
async def create_service_review(
    booking_id: str,
    review_data: ServiceReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a review for completed service"""
    try:
        db = get_db()
        booking = await db.service_bookings.find_one({
            "id": booking_id,
            "resident_id": current_user.id,
            "compound_id": current_user.compound_id,
            "status": "completed"
        })
        
        if not booking:
            raise HTTPException(status_code=404, detail="Completed booking not found")
        
        # Check if review already exists
        existing_review = await db.service_reviews.find_one({
            "booking_id": booking_id,
            "resident_id": current_user.id
        })
        
        if existing_review:
            raise HTTPException(status_code=400, detail="Review already exists for this booking")
        
        review = ServiceReview(
            **review_data.dict(),
            booking_id=booking_id,
            resident_id=current_user.id,
            provider_id=booking["provider_id"],
            compound_id=current_user.compound_id
        )
        
        await db.service_reviews.insert_one(serialize_datetime(review.dict()))
        
        # Update provider's average rating
        provider_reviews = await db.service_reviews.find({"provider_id": booking["provider_id"]}).to_list(length=None)
        total_reviews = len(provider_reviews)
        avg_rating = sum(r["overall_rating"] for r in provider_reviews) / total_reviews
        
        await db.service_providers.update_one(
            {"id": booking["provider_id"]},
            {
                "$set": {
                    "average_rating": round(avg_rating, 2),
                    "total_reviews": total_reviews
                }
            }
        )
        
        return {"message": "Review submitted successfully", "review": serialize_datetime(review.dict())}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating service review: {e}")
        raise HTTPException(status_code=500, detail="Failed to create service review")

@router.get("/service-providers/{provider_id}/reviews")
async def get_provider_reviews(
    provider_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get reviews for a service provider"""
    try:
        db = get_db()
        # Get provider details
        provider = await db.service_providers.find_one({
            "id": provider_id,
            "compound_id": current_user.compound_id
        })
        
        if not provider:
            raise HTTPException(status_code=404, detail="Service provider not found")
        
        reviews = await db.service_reviews.find({
            "provider_id": provider_id,
            "compound_id": current_user.compound_id,
            "is_public": True
        }).sort("created_at", -1).to_list(length=None)
        
        # Enhance with resident names
        enhanced_reviews = []
        for review in reviews:
            resident = await db.users.find_one({"id": review["resident_id"]})
            enhanced_review = {
                **serialize_datetime(review),
                "resident_name": resident["full_name"] if resident else "Anonymous"
            }
            enhanced_reviews.append(enhanced_review)
        
        # Get provider stats
        provider_stats = {
            "average_rating": provider.get("average_rating", 0.0),
            "total_reviews": provider.get("total_reviews", 0),
            "total_jobs_completed": provider.get("total_jobs_completed", 0),
            "would_recommend_count": sum(1 for r in reviews if r.get("would_recommend", False))
        }
        
        return {
            "reviews": enhanced_reviews,
            "provider_stats": provider_stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting provider reviews: {e}")
        raise HTTPException(status_code=500, detail="Failed to get provider reviews")

@router.post("/service-bookings/{booking_id}/payment")
async def process_payment(
    booking_id: str,
    payment_request: PaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Process payment for service booking"""
    try:
        db = get_db()
        booking = await db.service_bookings.find_one({
            "id": booking_id,
            "resident_id": current_user.id,
            "compound_id": current_user.compound_id
        })
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # Create payment transaction
        transaction = PaymentTransaction(
            booking_id=booking_id,
            resident_id=current_user.id,
            provider_id=booking["provider_id"],
            compound_id=current_user.compound_id,
            amount=payment_request.amount,
            payment_method=payment_request.payment_method,
            currency=payment_request.currency,
            metadata=payment_request.metadata
        )
        
        # Simulate payment processing based on method
        if payment_request.payment_method == "cash":
            transaction.status = "pending"  # Will be marked complete when service is done
        elif payment_request.payment_method in ["card", "instapay", "mobile_pay", "digital_wallet"]:
            # Here you would integrate with actual payment processors
            # For now, simulate success
            transaction.status = "completed"
            transaction.transaction_id = f"txn_{uuid.uuid4().hex[:10]}"
        elif payment_request.payment_method == "bank_transfer":
            transaction.status = "processing"  # Manual verification needed
        
        await db.payment_transactions.insert_one(serialize_datetime(transaction.dict()))
        
        # Update booking payment status
        # Map transaction status to booking payment status
        booking_payment_status = "pending"
        if transaction.status == "completed":
            booking_payment_status = "paid"
        elif transaction.status == "processing":
            booking_payment_status = "processing" 
        elif transaction.status == "pending":
            booking_payment_status = "pending"
        
        await db.service_bookings.update_one(
            {"id": booking_id},
            {
                "$set": serialize_datetime({
                    "payment_method": payment_request.payment_method,
                    "payment_status": booking_payment_status,
                    "payment_id": transaction.id,
                    "final_cost": payment_request.amount,
                    "updated_at": datetime.now(timezone.utc)
                })
            }
        )
        
        return {
            "message": "Payment processed successfully",
            "transaction": serialize_datetime(transaction.dict()),
            "status": transaction.status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error processing payment: {e}")
        raise HTTPException(status_code=500, detail="Failed to process payment")

@router.get("/service-analytics")
async def get_service_analytics(
    current_user: dict = Depends(require_admin)
):
    """Get service analytics for admin dashboard"""
    try:
        db = get_db()
        # Total bookings by status
        booking_stats = await db.service_bookings.aggregate([
            {"$match": {"compound_id": current_user.compound_id}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]).to_list(length=None)
        
        # Revenue by payment method
        revenue_stats = await db.payment_transactions.aggregate([
            {
                "$match": {
                    "compound_id": current_user.compound_id,
                    "status": "completed"
                }
            },
            {
                "$group": {
                    "_id": "$payment_method",
                    "total_amount": {"$sum": "$amount"},
                    "count": {"$sum": 1}
                }
            }
        ]).to_list(length=None)
        
        # Top rated providers
        top_providers = await db.service_providers.find({
            "compound_id": current_user.compound_id,
            "is_active": True
        }).sort("average_rating", -1).limit(5).to_list(length=None)
        
        return {
            "analytics": {
                "booking_statistics": {stat["_id"]: stat["count"] for stat in booking_stats},
                "revenue_statistics": serialize_datetime(revenue_stats),
                "top_rated_providers": serialize_datetime(top_providers)
            }
        }
        
    except Exception as e:
        logging.error(f"Error getting service analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get service analytics")

# ============ FAMILY MANAGEMENT ENDPOINTS ============

