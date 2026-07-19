"""
Smart Devices & IoT routes - extracted from server.py
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import uuid
import json
import logging
import os

from database import get_db
from auth_deps import get_current_user, require_admin
from helpers import serialize_datetime
from document_models import *
from homeme_integrations.llm.chat import LlmChat, UserMessage

router = APIRouter(prefix="/api")

@router.get("/smart-devices")
async def get_smart_devices(
    device_type: Optional[str] = None,
    location: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get smart devices with filtering"""
    try:
        db = get_db()
        compound_id = current_user.get("compound_id")
        # High-level admins without a compound get an empty list (graceful no-op)
        if not compound_id:
            return {"devices": []}

        query = {"compound_id": compound_id, "is_active": True}

        # Family-specific devices or shared devices
        if current_user.get("role") not in ("admin", "compound_admin", "app_owner", "super_admin", "company_admin"):
            query["$or"] = [
                {"family_id": current_user.get("family_id")},
                {"is_shared": True},
                {"family_id": None}  # Common area devices
            ]
        
        if device_type:
            query["device_type"] = device_type
        if location:
            query["location"] = {"$regex": location, "$options": "i"}
        
        devices = await db.smart_devices.find(query).sort("location", 1).to_list(length=10000)
        
        return {"devices": [serialize_datetime(device) for device in devices]}
        
    except Exception as e:
        logging.error(f"Error getting smart devices: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get smart devices")

@router.post("/smart-devices")
async def create_smart_device(
    device_data: SmartDeviceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a new smart device"""
    try:
        db = get_db()
        # Only admins or family heads can add devices
        if current_user.role != "admin" and not current_user.is_family_head:
            raise HTTPException(status_code=403, detail="Only admins or family heads can add devices")
        
        # Set family_id if not admin
        if current_user.role != "admin":
            device_data.family_id = current_user.family_id
            device_data.unit_number = current_user.unit_number
        
        device = SmartDevice(
            **device_data.dict(),
            compound_id=current_user.compound_id,
            installed_by=current_user.id,
            controlled_by=[current_user.id],
            viewable_by=[current_user.id]
        )
        
        device_dict = serialize_datetime(device.dict())
        await db.smart_devices.insert_one(device_dict)
        
        return {"message": "Smart device added successfully", "device_id": device.id}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating smart device: {e}")
        raise HTTPException(status_code=500, detail="Failed to create smart device")

@router.post("/smart-devices/{device_id}/command")
async def send_device_command(
    device_id: str,
    command_data: DeviceCommand,
    current_user: dict = Depends(get_current_user)
):
    """Send command to a smart device"""
    try:
        db = get_db()
        # Get device
        device = await db.smart_devices.find_one({
            "id": device_id,
            "compound_id": current_user.compound_id,
            "is_active": True
        })
        
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Check control permissions
        if (current_user.role != "admin" and 
            current_user.id not in device.get("controlled_by", []) and
            device.get("family_id") != current_user.family_id):
            raise HTTPException(status_code=403, detail="You don't have permission to control this device")
        
        # For now, simulate device command (in real implementation, this would send to actual device)
        # Update target state
        new_target_state = device.get("target_state", {}).copy()
        new_target_state.update(command_data.parameters)
        
        # Simulate successful command execution
        new_current_state = new_target_state.copy()
        
        # Update device state
        await db.smart_devices.update_one(
            {"id": device_id},
            {
                "$set": {
                    "target_state": new_target_state,
                    "current_state": new_current_state,
                    "last_seen": datetime.utcnow(),
                    "status": "online",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Log the command
        device_log = DeviceLog(
            device_id=device_id,
            compound_id=current_user.compound_id,
            event_type="command",
            old_state=device.get("current_state", {}),
            new_state=new_current_state,
            command=command_data.command,
            triggered_by=current_user.id,
            success=True
        )
        
        await db.device_logs.insert_one(serialize_datetime(device_log.dict()))
        
        return {
            "message": "Command sent successfully",
            "device_state": new_current_state
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error sending device command: {e}")
        raise HTTPException(status_code=500, detail="Failed to send device command")

@router.get("/smart-devices/{device_id}/logs")
async def get_device_logs(
    device_id: str,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get device activity logs"""
    try:
        db = get_db()
        # Verify device access
        device = await db.smart_devices.find_one({
            "id": device_id,
            "compound_id": current_user.compound_id
        })
        
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Check view permissions
        if (current_user.role != "admin" and 
            current_user.id not in device.get("viewable_by", []) and
            device.get("family_id") != current_user.family_id):
            raise HTTPException(status_code=403, detail="You don't have permission to view this device")
        
        logs = await db.device_logs.find({
            "device_id": device_id
        }).sort("timestamp", -1).limit(limit).to_list(length=10000)
        
        return {"logs": [serialize_datetime(log) for log in logs]}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting device logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to get device logs")

@router.get("/automations")
async def get_automations(current_user: dict = Depends(get_current_user)):
    """Get device automations"""
    try:
        db = get_db()
        compound_id = current_user.get("compound_id")
        if not compound_id:
            return {"automations": []}
        query = {"compound_id": compound_id}

        if current_user.get("role") not in ("admin", "compound_admin", "app_owner", "super_admin", "company_admin"):
            query["$or"] = [
                {"family_id": current_user.get("family_id")},
                {"family_id": None}  # Common automations
            ]
        
        automations = await db.device_automations.find(query).sort("created_at", -1).to_list(length=10000)
        
        return {"automations": [serialize_datetime(automation) for automation in automations]}
        
    except Exception as e:
        logging.error(f"Error getting automations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get automations")

@router.post("/automations")
async def create_automation(
    automation_data: DeviceAutomationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new device automation"""
    try:
        db = get_db()
        # Set family_id if not admin
        if current_user.role != "admin":
            automation_data.family_id = current_user.family_id
        
        automation = DeviceAutomation(
            **automation_data.dict(),
            compound_id=current_user.compound_id,
            created_by=current_user.id
        )
        
        automation_dict = serialize_datetime(automation.dict())
        await db.device_automations.insert_one(automation_dict)
        
        return {"message": "Automation created successfully", "automation_id": automation.id}
        
    except Exception as e:
        logging.error(f"Error creating automation: {e}")
        raise HTTPException(status_code=500, detail="Failed to create automation")

@router.post("/admin/initialize-smart-devices")
async def initialize_smart_devices(
    compound_id: str,
    current_user: dict = Depends(require_admin)
):
    """Initialize sample smart home devices for testing and demo purposes"""
    db = get_db()
    if current_user.compound_id != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if devices already exist
    existing_devices = await db.smart_devices.find({"compound_id": compound_id}).limit(1).to_list(1)
    if existing_devices:
        return {"message": "Smart devices already exist"}
    
    # Sample smart home devices
    sample_devices = [
        {
            "name": "Living Room Lights",
            "device_type": "light",
            "location": "Living Room",
            "capabilities": ["on_off", "dimming", "color"],
            "current_state": {"power": False, "brightness": 0, "color": "#ffffff"},
            "target_state": {"power": False, "brightness": 0, "color": "#ffffff"},
            "is_shared": True,
            "family_id": None
        },
        {
            "name": "Bedroom Lights",
            "device_type": "light", 
            "location": "Bedroom",
            "capabilities": ["on_off", "dimming"],
            "current_state": {"power": False, "brightness": 0},
            "target_state": {"power": False, "brightness": 0},
            "is_shared": True,
            "family_id": None
        },
        {
            "name": "Smart Thermostat",
            "device_type": "thermostat",
            "location": "Hallway",
            "capabilities": ["temperature_control", "scheduling"],
            "current_state": {"temperature": 72, "mode": "auto", "target_temp": 72},
            "target_state": {"temperature": 72, "mode": "auto", "target_temp": 72},
            "is_shared": True,
            "family_id": None
        },
        {
            "name": "Front Door Lock",
            "device_type": "lock",
            "location": "Front Door",
            "capabilities": ["lock_unlock", "status"],
            "current_state": {"locked": True, "battery": 85},
            "target_state": {"locked": True},
            "is_shared": True,
            "family_id": None
        },
        {
            "name": "Kitchen Lights",
            "device_type": "light",
            "location": "Kitchen",
            "capabilities": ["on_off", "dimming"],
            "current_state": {"power": False, "brightness": 0},
            "target_state": {"power": False, "brightness": 0},
            "is_shared": True,
            "family_id": None
        },
        {
            "name": "Security Camera",
            "device_type": "camera",
            "location": "Front Entrance",
            "capabilities": ["recording", "motion_detection", "night_vision"],
            "current_state": {"recording": True, "motion_detected": False, "battery": 92},
            "target_state": {"recording": True},
            "is_shared": True,
            "family_id": None
        }
    ]
    
    # Create SmartDevice objects
    devices_to_insert = []
    for device_data in sample_devices:
        device = SmartDevice(
            compound_id=compound_id,
            name=device_data["name"],
            device_type=device_data["device_type"],
            location=device_data["location"],
            capabilities=device_data["capabilities"],
            current_state=device_data["current_state"],
            target_state=device_data["target_state"],
            is_shared=device_data["is_shared"],
            family_id=device_data["family_id"],
            status="online",
            last_seen=datetime.utcnow(),
            controlled_by=[current_user.id]
        )
        devices_to_insert.append(serialize_datetime(device.dict()))
    
    # Insert all devices
    await db.smart_devices.insert_many(devices_to_insert)
    
    return {
        "message": "Smart devices initialized successfully", 
        "devices_created": len(devices_to_insert)
    }

class NaturalLanguageCommand(BaseModel):
    command: str

@router.post("/smart-devices/natural-command")
async def process_natural_language_command(
    command_data: NaturalLanguageCommand,
    current_user: dict = Depends(get_current_user)
):
    """Process natural language commands for smart home devices using AI"""
    try:
        db = get_db()
        command = command_data.command.strip()
        if not command:
            raise HTTPException(status_code=400, detail="Command is required")
            
        # Initialize LLM chat with device context
        llm_api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_api_key:
            raise HTTPException(status_code=500, detail="LLM service not configured")
        
        # Get user's devices for context
        query = {"compound_id": current_user.compound_id, "is_active": True}
        if current_user.role != "admin":
            query["$or"] = [
                {"family_id": current_user.family_id},
                {"is_shared": True},
                {"family_id": None}
            ]
        
        devices = await db.smart_devices.find(query).to_list(length=10000)
        
        # Create device context for LLM
        device_context = []
        for device in devices:
            device_context.append({
                "id": device["id"],
                "name": device["name"],
                "type": device["device_type"],
                "location": device["location"],
                "capabilities": device.get("capabilities", []),
                "current_state": device.get("current_state", {})
            })
        
        # Create system message with device context
        system_message = f"""You are a smart home assistant. The user has the following devices available:
{json.dumps(device_context, indent=2)}

When the user gives a command, analyze it and return a JSON response with the following structure:
{{
    "intent": "device_control|device_query|automation|error",
    "devices": [
        {{
            "device_id": "device_id_here",
            "action": "command_to_execute",
            "parameters": {{"key": "value"}}
        }}
    ],
    "response_message": "Human-friendly response to the user",
    "confidence": 0.95,
    "errors": []
}}

Only respond with valid JSON. Match device names and locations as closely as possible.
Support commands like: "turn on living room lights", "set temperature to 72", "dim bedroom lights to 50%", "show me all lights", etc.
"""

        # Initialize chat
        chat = LlmChat(
            api_key=llm_api_key,
            session_id=f"smart_home_{current_user.id}",
            system_message=system_message
        ).with_model("openai", "gpt-4o-mini")
        
        # Send user command
        user_message = UserMessage(text=command)
        ai_response = await chat.send_message(user_message)
        
        # Parse AI response
        try:
            response_data = json.loads(ai_response)
        except json.JSONDecodeError:
            response_data = {
                "intent": "error",
                "devices": [],
                "response_message": "I couldn't understand that command. Please try rephrasing it.",
                "confidence": 0.0,
                "errors": ["Failed to parse command"]
            }
        
        # Execute device commands if intent is device_control
        if response_data.get("intent") == "device_control":
            executed_commands = []
            for device_cmd in response_data.get("devices", []):
                device_id = device_cmd.get("device_id")
                action = device_cmd.get("action")
                parameters = device_cmd.get("parameters", {})
                
                # Find and execute command on device
                device = await db.smart_devices.find_one({
                    "id": device_id,
                    "compound_id": current_user.compound_id,
                    "is_active": True
                })
                
                if device:
                    # Check control permissions
                    if (current_user.role == "admin" or 
                        current_user.id in device.get("controlled_by", []) or
                        device.get("family_id") == current_user.family_id):
                        
                        # Update device state
                        new_target_state = device.get("target_state", {}).copy()
                        new_target_state.update(parameters)
                        new_current_state = new_target_state.copy()
                        
                        await db.smart_devices.update_one(
                            {"id": device_id},
                            {
                                "$set": {
                                    "target_state": new_target_state,
                                    "current_state": new_current_state,
                                    "last_seen": datetime.utcnow(),
                                    "status": "online",
                                    "updated_at": datetime.utcnow()
                                }
                            }
                        )
                        
                        # Log the command
                        device_log = DeviceLog(
                            device_id=device_id,
                            compound_id=current_user.compound_id,
                            event_type="command",
                            old_state=device.get("current_state", {}),
                            new_state=new_current_state,
                            command=f"Natural language: {command}",
                            triggered_by=current_user.id,
                            success=True
                        )
                        
                        await db.device_logs.insert_one(serialize_datetime(device_log.dict()))
                        executed_commands.append(device_cmd)
                    else:
                        response_data["errors"].append(f"No permission to control {device['name']}")
                else:
                    response_data["errors"].append(f"Device not found: {device_id}")
            
            response_data["executed_commands"] = executed_commands
        
        return {
            "ai_response": response_data,
            "original_command": command,
            "user_devices_count": len(devices)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error processing natural language command: {e}")
        raise HTTPException(status_code=500, detail="Failed to process natural language command")

# Newsletter Management Endpoints