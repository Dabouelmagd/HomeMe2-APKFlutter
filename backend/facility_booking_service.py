"""
Advanced Facility Booking System
Handles facility reservations for compound amenities
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
from bson import ObjectId
from pydantic import BaseModel
from enum import Enum


class FacilityType(str, Enum):
    SWIMMING_POOL = "swimming_pool"
    GYM = "gym"
    TENNIS_COURT = "tennis_court"
    FOOTBALL_FIELD = "football_field"
    BASKETBALL_COURT = "basketball_court"
    PARTY_HALL = "party_hall"
    MEETING_ROOM = "meeting_room"
    BBQ_AREA = "bbq_area"
    KIDS_PLAYGROUND = "kids_playground"
    PARKING = "parking"
    OTHER = "other"


class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"


class FacilityModel(BaseModel):
    name: str
    name_ar: str
    facility_type: FacilityType
    description: Optional[str] = None
    description_ar: Optional[str] = None
    capacity: int = 10
    hourly_rate: float = 0.0
    is_active: bool = True
    requires_approval: bool = False
    min_booking_hours: int = 1
    max_booking_hours: int = 4
    advance_booking_days: int = 14  # How many days in advance can book
    cancellation_hours: int = 24  # Hours before booking to allow cancellation
    operating_hours: Dict = {"start": "06:00", "end": "22:00"}
    blocked_dates: List[str] = []  # List of blocked dates (YYYY-MM-DD)
    amenities: List[str] = []
    rules: List[str] = []
    rules_ar: List[str] = []
    images: List[str] = []


class FacilityBookingModel(BaseModel):
    facility_id: str
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    purpose: Optional[str] = None
    num_guests: int = 1
    notes: Optional[str] = None


class FacilityBookingService:
    def __init__(self, db):
        self.db = db
    
    # ==================== FACILITY MANAGEMENT ====================
    
    async def create_facility(self, compound_id: str, facility_data: dict) -> dict:
        """Create a new facility"""
        facility = {
            **facility_data,
            "compound_id": compound_id,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        result = await self.db.facilities.insert_one(facility)
        facility["_id"] = str(result.inserted_id)
        return facility
    
    async def get_facilities(self, compound_id: str, include_inactive: bool = False) -> List[dict]:
        """Get all facilities for a compound"""
        query = {"compound_id": compound_id}
        if not include_inactive:
            query["is_active"] = True
        
        cursor = self.db.facilities.find(query).sort("name", 1)
        facilities = []
        async for facility in cursor:
            facility["_id"] = str(facility["_id"])
            facilities.append(facility)
        
        return facilities
    
    async def get_facility(self, facility_id: str) -> Optional[dict]:
        """Get a single facility by ID"""
        facility = await self.db.facilities.find_one({"_id": ObjectId(facility_id)})
        if facility:
            facility["_id"] = str(facility["_id"])
        return facility
    
    async def update_facility(self, facility_id: str, update_data: dict) -> dict:
        """Update a facility"""
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await self.db.facilities.update_one(
            {"_id": ObjectId(facility_id)},
            {"$set": update_data}
        )
        
        return await self.get_facility(facility_id)
    
    async def delete_facility(self, facility_id: str) -> bool:
        """Soft delete a facility"""
        result = await self.db.facilities.update_one(
            {"_id": ObjectId(facility_id)},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )
        return result.modified_count > 0
    
    # ==================== BOOKING MANAGEMENT ====================
    
    async def create_booking(
        self,
        user_id: str,
        user_name: str,
        compound_id: str,
        booking_data: dict
    ) -> dict:
        """Create a new facility booking"""
        facility_id = booking_data.get("facility_id")
        
        # Get facility
        facility = await self.get_facility(facility_id)
        if not facility:
            raise ValueError("Facility not found")
        
        if not facility.get("is_active", True):
            raise ValueError("Facility is not available for booking")
        
        # Parse booking datetime
        booking_date = datetime.strptime(booking_data["date"], "%Y-%m-%d").date()
        start_time = datetime.strptime(booking_data["start_time"], "%H:%M").time()
        end_time = datetime.strptime(booking_data["end_time"], "%H:%M").time()
        
        # Validate booking time
        validation_result = await self._validate_booking(
            facility, booking_date, start_time, end_time, booking_data.get("num_guests", 1)
        )
        
        if not validation_result["valid"]:
            raise ValueError(validation_result["error"])
        
        # Check for conflicts
        conflicts = await self._check_booking_conflicts(
            facility_id, booking_date, start_time, end_time
        )
        
        if conflicts:
            raise ValueError("Time slot is already booked")
        
        # Calculate price
        hours = self._calculate_hours(start_time, end_time)
        total_price = hours * facility.get("hourly_rate", 0)
        
        # Create booking
        booking = {
            "facility_id": facility_id,
            "facility_name": facility.get("name"),
            "facility_name_ar": facility.get("name_ar"),
            "compound_id": compound_id,
            "user_id": user_id,
            "user_name": user_name,
            "date": booking_data["date"],
            "start_time": booking_data["start_time"],
            "end_time": booking_data["end_time"],
            "duration_hours": hours,
            "num_guests": booking_data.get("num_guests", 1),
            "purpose": booking_data.get("purpose"),
            "notes": booking_data.get("notes"),
            "total_price": total_price,
            "status": BookingStatus.PENDING if facility.get("requires_approval") else BookingStatus.CONFIRMED,
            "payment_status": "pending" if total_price > 0 else "not_required",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        result = await self.db.facility_bookings.insert_one(booking)
        booking["_id"] = str(result.inserted_id)
        
        return booking
    
    async def get_bookings(
        self,
        compound_id: str = None,
        user_id: str = None,
        facility_id: str = None,
        date: str = None,
        status: str = None,
        limit: int = 50
    ) -> List[dict]:
        """Get bookings with filters"""
        query = {}
        
        if compound_id:
            query["compound_id"] = compound_id
        if user_id:
            query["user_id"] = user_id
        if facility_id:
            query["facility_id"] = facility_id
        if date:
            query["date"] = date
        if status:
            query["status"] = status
        
        cursor = self.db.facility_bookings.find(query).sort("created_at", -1).limit(limit)
        
        bookings = []
        async for booking in cursor:
            booking["_id"] = str(booking["_id"])
            bookings.append(booking)
        
        return bookings
    
    async def get_booking(self, booking_id: str) -> Optional[dict]:
        """Get a single booking by ID"""
        booking = await self.db.facility_bookings.find_one({"_id": ObjectId(booking_id)})
        if booking:
            booking["_id"] = str(booking["_id"])
        return booking
    
    async def update_booking_status(self, booking_id: str, status: str, admin_notes: str = None) -> dict:
        """Update booking status (for admin approval/rejection)"""
        update_data = {
            "status": status,
            "updated_at": datetime.now(timezone.utc)
        }
        
        if admin_notes:
            update_data["admin_notes"] = admin_notes
        
        if status == BookingStatus.CONFIRMED:
            update_data["confirmed_at"] = datetime.now(timezone.utc)
        elif status == BookingStatus.CANCELLED:
            update_data["cancelled_at"] = datetime.now(timezone.utc)
        
        await self.db.facility_bookings.update_one(
            {"_id": ObjectId(booking_id)},
            {"$set": update_data}
        )
        
        return await self.get_booking(booking_id)
    
    async def cancel_booking(self, booking_id: str, user_id: str, reason: str = None) -> dict:
        """Cancel a booking (by user)"""
        booking = await self.get_booking(booking_id)
        
        if not booking:
            raise ValueError("Booking not found")
        
        if booking["user_id"] != user_id:
            raise ValueError("You can only cancel your own bookings")
        
        if booking["status"] in [BookingStatus.CANCELLED, BookingStatus.COMPLETED]:
            raise ValueError("Booking cannot be cancelled")
        
        # Check cancellation policy
        facility = await self.get_facility(booking["facility_id"])
        cancellation_hours = facility.get("cancellation_hours", 24) if facility else 24
        
        booking_datetime = datetime.strptime(
            f"{booking['date']} {booking['start_time']}", 
            "%Y-%m-%d %H:%M"
        ).replace(tzinfo=timezone.utc)
        
        hours_until_booking = (booking_datetime - datetime.now(timezone.utc)).total_seconds() / 3600
        
        if hours_until_booking < cancellation_hours:
            raise ValueError(f"Cancellation must be at least {cancellation_hours} hours before booking")
        
        return await self.update_booking_status(booking_id, BookingStatus.CANCELLED, reason)
    
    async def get_availability(
        self,
        facility_id: str,
        date: str
    ) -> dict:
        """Get availability for a facility on a specific date"""
        facility = await self.get_facility(facility_id)
        
        if not facility:
            raise ValueError("Facility not found")
        
        # Get existing bookings for the date
        bookings = await self.get_bookings(facility_id=facility_id, date=date)
        
        # Parse operating hours
        operating_hours = facility.get("operating_hours", {"start": "06:00", "end": "22:00"})
        start_hour = int(operating_hours["start"].split(":")[0])
        end_hour = int(operating_hours["end"].split(":")[0])
        
        # Generate time slots
        time_slots = []
        for hour in range(start_hour, end_hour):
            slot_start = f"{hour:02d}:00"
            slot_end = f"{hour+1:02d}:00"
            
            # Check if slot is booked
            is_booked = False
            for booking in bookings:
                if booking["status"] not in [BookingStatus.CANCELLED]:
                    booking_start = booking["start_time"]
                    booking_end = booking["end_time"]
                    
                    if self._times_overlap(slot_start, slot_end, booking_start, booking_end):
                        is_booked = True
                        break
            
            time_slots.append({
                "start": slot_start,
                "end": slot_end,
                "available": not is_booked
            })
        
        # Check if date is blocked
        blocked_dates = facility.get("blocked_dates", [])
        is_blocked = date in blocked_dates
        
        return {
            "facility_id": facility_id,
            "date": date,
            "is_blocked": is_blocked,
            "operating_hours": operating_hours,
            "time_slots": time_slots,
            "min_booking_hours": facility.get("min_booking_hours", 1),
            "max_booking_hours": facility.get("max_booking_hours", 4)
        }
    
    async def get_user_bookings_count(self, user_id: str, date: str = None) -> int:
        """Get number of bookings for a user"""
        query = {"user_id": user_id, "status": {"$ne": BookingStatus.CANCELLED}}
        
        if date:
            query["date"] = date
        
        return await self.db.facility_bookings.count_documents(query)
    
    # ==================== HELPER METHODS ====================
    
    async def _validate_booking(
        self,
        facility: dict,
        booking_date,
        start_time,
        end_time,
        num_guests: int
    ) -> dict:
        """Validate booking against facility rules"""
        now = datetime.now(timezone.utc)
        today = now.date()
        
        # Check if booking is in the past
        if booking_date < today:
            return {"valid": False, "error": "Cannot book for past dates"}
        
        # Check advance booking limit
        advance_days = facility.get("advance_booking_days", 14)
        max_date = today + timedelta(days=advance_days)
        if booking_date > max_date:
            return {"valid": False, "error": f"Cannot book more than {advance_days} days in advance"}
        
        # Check operating hours
        operating_hours = facility.get("operating_hours", {"start": "06:00", "end": "22:00"})
        op_start = datetime.strptime(operating_hours["start"], "%H:%M").time()
        op_end = datetime.strptime(operating_hours["end"], "%H:%M").time()
        
        if start_time < op_start or end_time > op_end:
            return {"valid": False, "error": f"Booking must be within operating hours ({operating_hours['start']} - {operating_hours['end']})"}
        
        # Check duration
        hours = self._calculate_hours(start_time, end_time)
        min_hours = facility.get("min_booking_hours", 1)
        max_hours = facility.get("max_booking_hours", 4)
        
        if hours < min_hours:
            return {"valid": False, "error": f"Minimum booking is {min_hours} hour(s)"}
        if hours > max_hours:
            return {"valid": False, "error": f"Maximum booking is {max_hours} hours"}
        
        # Check capacity
        capacity = facility.get("capacity", 10)
        if num_guests > capacity:
            return {"valid": False, "error": f"Maximum capacity is {capacity} guests"}
        
        # Check blocked dates
        date_str = booking_date.strftime("%Y-%m-%d")
        if date_str in facility.get("blocked_dates", []):
            return {"valid": False, "error": "This date is not available for booking"}
        
        return {"valid": True}
    
    async def _check_booking_conflicts(
        self,
        facility_id: str,
        booking_date,
        start_time,
        end_time
    ) -> List[dict]:
        """Check for booking conflicts"""
        date_str = booking_date.strftime("%Y-%m-%d") if hasattr(booking_date, 'strftime') else booking_date
        start_str = start_time.strftime("%H:%M") if hasattr(start_time, 'strftime') else start_time
        end_str = end_time.strftime("%H:%M") if hasattr(end_time, 'strftime') else end_time
        
        # Get all non-cancelled bookings for the date
        existing_bookings = await self.get_bookings(
            facility_id=facility_id,
            date=date_str
        )
        
        conflicts = []
        for booking in existing_bookings:
            if booking["status"] in [BookingStatus.CANCELLED]:
                continue
            
            if self._times_overlap(start_str, end_str, booking["start_time"], booking["end_time"]):
                conflicts.append(booking)
        
        return conflicts
    
    def _calculate_hours(self, start_time, end_time) -> float:
        """Calculate hours between two times"""
        if hasattr(start_time, 'hour'):
            start_minutes = start_time.hour * 60 + start_time.minute
            end_minutes = end_time.hour * 60 + end_time.minute
        else:
            start_parts = start_time.split(":")
            end_parts = end_time.split(":")
            start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])
            end_minutes = int(end_parts[0]) * 60 + int(end_parts[1])
        
        return (end_minutes - start_minutes) / 60
    
    def _times_overlap(self, start1: str, end1: str, start2: str, end2: str) -> bool:
        """Check if two time ranges overlap"""
        def to_minutes(time_str):
            parts = time_str.split(":")
            return int(parts[0]) * 60 + int(parts[1])
        
        s1, e1 = to_minutes(start1), to_minutes(end1)
        s2, e2 = to_minutes(start2), to_minutes(end2)
        
        return s1 < e2 and s2 < e1


# Default facilities to seed
DEFAULT_FACILITIES = [
    {
        "name": "Swimming Pool",
        "name_ar": "حمام السباحة",
        "facility_type": FacilityType.SWIMMING_POOL,
        "description": "Olympic-size swimming pool with lifeguard on duty",
        "description_ar": "حمام سباحة بحجم أولمبي مع منقذ",
        "capacity": 50,
        "hourly_rate": 25.0,
        "min_booking_hours": 1,
        "max_booking_hours": 3,
        "operating_hours": {"start": "06:00", "end": "21:00"},
        "amenities": ["Changing rooms", "Lockers", "Showers"],
        "rules": ["No diving", "Children must be accompanied by adults"],
        "rules_ar": ["ممنوع الغطس", "يجب أن يكون الأطفال برفقة الكبار"]
    },
    {
        "name": "Gym & Fitness Center",
        "name_ar": "صالة الألعاب الرياضية",
        "facility_type": FacilityType.GYM,
        "description": "Fully equipped gym with cardio and weight training equipment",
        "description_ar": "صالة رياضية مجهزة بالكامل مع أجهزة الكارديو والأوزان",
        "capacity": 30,
        "hourly_rate": 0.0,
        "min_booking_hours": 1,
        "max_booking_hours": 2,
        "operating_hours": {"start": "05:00", "end": "23:00"},
        "amenities": ["Personal trainers available", "Showers", "Towels"],
        "rules": ["Proper gym attire required", "Wipe equipment after use"],
        "rules_ar": ["يجب ارتداء ملابس رياضية مناسبة", "يرجى تنظيف المعدات بعد الاستخدام"]
    },
    {
        "name": "Tennis Court",
        "name_ar": "ملعب التنس",
        "facility_type": FacilityType.TENNIS_COURT,
        "description": "Professional tennis court with lighting",
        "description_ar": "ملعب تنس احترافي مع إضاءة",
        "capacity": 4,
        "hourly_rate": 50.0,
        "min_booking_hours": 1,
        "max_booking_hours": 2,
        "operating_hours": {"start": "06:00", "end": "22:00"},
        "amenities": ["Equipment rental", "Ball machine"],
        "rules": ["Tennis shoes required", "Maximum 4 players"],
        "rules_ar": ["يجب ارتداء أحذية التنس", "الحد الأقصى 4 لاعبين"]
    },
    {
        "name": "Party Hall",
        "name_ar": "قاعة الحفلات",
        "facility_type": FacilityType.PARTY_HALL,
        "description": "Spacious hall for events and celebrations",
        "description_ar": "قاعة واسعة للمناسبات والاحتفالات",
        "capacity": 100,
        "hourly_rate": 200.0,
        "requires_approval": True,
        "min_booking_hours": 2,
        "max_booking_hours": 8,
        "advance_booking_days": 30,
        "operating_hours": {"start": "10:00", "end": "23:00"},
        "amenities": ["Sound system", "Projector", "Kitchen access", "Tables & chairs"],
        "rules": ["Noise must stop by 11 PM", "Cleaning required after event"],
        "rules_ar": ["يجب إيقاف الضوضاء بحلول 11 مساءً", "يجب التنظيف بعد الحفل"]
    },
    {
        "name": "BBQ Area",
        "name_ar": "منطقة الشواء",
        "facility_type": FacilityType.BBQ_AREA,
        "description": "Outdoor BBQ area with grills and seating",
        "description_ar": "منطقة شواء خارجية مع شوايات ومقاعد",
        "capacity": 20,
        "hourly_rate": 75.0,
        "min_booking_hours": 2,
        "max_booking_hours": 4,
        "operating_hours": {"start": "12:00", "end": "22:00"},
        "amenities": ["Gas grills", "Picnic tables", "Trash disposal"],
        "rules": ["Clean up after use", "No open fires"],
        "rules_ar": ["يجب التنظيف بعد الاستخدام", "ممنوع إشعال النيران المفتوحة"]
    }
]
