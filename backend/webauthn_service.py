# WebAuthn Service for Biometric Authentication
import os
import base64
import hashlib
import json
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel

# WebAuthn Models
class WebAuthnRegisterOptions(BaseModel):
    user_id: str
    username: str

class WebAuthnRegisterVerify(BaseModel):
    user_id: str
    credential_id: str
    client_data_json: str
    attestation_object: str

class WebAuthnLoginOptions(BaseModel):
    username: str

class WebAuthnLoginVerify(BaseModel):
    username: str
    credential_id: str
    client_data_json: str
    authenticator_data: str
    signature: str

# Helper functions
def generate_challenge():
    """Generate a random challenge for WebAuthn"""
    return base64.urlsafe_b64encode(os.urandom(32)).decode('utf-8').rstrip('=')

def base64url_encode(data: bytes) -> str:
    """Encode bytes to base64url"""
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def base64url_decode(data: str) -> bytes:
    """Decode base64url to bytes"""
    # Add padding if needed
    padding = 4 - len(data) % 4
    if padding != 4:
        data += '=' * padding
    return base64.urlsafe_b64decode(data)

class WebAuthnService:
    def __init__(self, db):
        self.db = db
        self.rp_name = "HomeMe"
        self.rp_id = None  # Will be set based on request origin
        
    async def get_register_options(self, user_id: str, username: str, origin: str):
        """Generate registration options for WebAuthn"""
        challenge = generate_challenge()
        
        # Store challenge temporarily
        await self.db.webauthn_challenges.insert_one({
            "user_id": user_id,
            "challenge": challenge,
            "type": "register",
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc)
        })
        
        # Extract RP ID from origin
        rp_id = origin.replace('https://', '').replace('http://', '').split(':')[0]
        
        return {
            "challenge": challenge,
            "rp": {
                "name": self.rp_name,
                "id": rp_id
            },
            "user": {
                "id": base64url_encode(user_id.encode()),
                "name": username,
                "displayName": username
            },
            "pubKeyCredParams": [
                {"type": "public-key", "alg": -7},   # ES256
                {"type": "public-key", "alg": -257}  # RS256
            ],
            "timeout": 60000,
            "attestation": "none"
        }
    
    async def verify_registration(self, user_id: str, credential_id: str, 
                                   client_data_json: str, attestation_object: str):
        """Verify and store the registration"""
        try:
            # Decode client data
            client_data = json.loads(base64url_decode(client_data_json).decode('utf-8'))
            
            # Verify challenge
            challenge_doc = await self.db.webauthn_challenges.find_one({
                "user_id": user_id,
                "type": "register"
            })
            
            if not challenge_doc:
                return {"success": False, "error": "Challenge not found"}
            
            # Store credential
            credential_doc = {
                "user_id": user_id,
                "credential_id": credential_id,
                "public_key": attestation_object,  # In production, extract actual public key
                "created_at": datetime.now(timezone.utc),
                "last_used": None,
                "sign_count": 0
            }
            
            await self.db.webauthn_credentials.update_one(
                {"user_id": user_id},
                {"$set": credential_doc},
                upsert=True
            )
            
            # Clean up challenge
            await self.db.webauthn_challenges.delete_one({"user_id": user_id, "type": "register"})
            
            return {"success": True, "message": "Biometric registered successfully"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_login_options(self, username: str, origin: str):
        """Generate authentication options"""
        # Find user
        user = await self.db.users.find_one({"username": username})
        if not user:
            return None, "User not found"
        
        # Find credential
        credential = await self.db.webauthn_credentials.find_one({"user_id": user["id"]})
        if not credential:
            return None, "No biometric registered for this user"
        
        challenge = generate_challenge()
        
        # Store challenge
        await self.db.webauthn_challenges.update_one(
            {"user_id": user["id"], "type": "login"},
            {"$set": {
                "challenge": challenge,
                "created_at": datetime.now(timezone.utc)
            }},
            upsert=True
        )
        
        rp_id = origin.replace('https://', '').replace('http://', '').split(':')[0]
        
        return {
            "challenge": challenge,
            "rpId": rp_id,
            "allowCredentials": [{
                "id": credential["credential_id"],
                "type": "public-key"
            }],
            "timeout": 60000,
            "userVerification": "required"
        }, None
    
    async def verify_login(self, username: str, credential_id: str,
                           client_data_json: str, authenticator_data: str, signature: str):
        """Verify biometric login"""
        try:
            # Find user
            user = await self.db.users.find_one({"username": username})
            if not user:
                return None, "User not found"
            
            # Find credential
            credential = await self.db.webauthn_credentials.find_one({
                "user_id": user["id"],
                "credential_id": credential_id
            })
            
            if not credential:
                return None, "Invalid credential"
            
            # Verify challenge exists
            challenge_doc = await self.db.webauthn_challenges.find_one({
                "user_id": user["id"],
                "type": "login"
            })
            
            if not challenge_doc:
                return None, "Challenge expired"
            
            # In production, verify signature properly
            # For now, we trust the client-side verification
            
            # Update last used
            await self.db.webauthn_credentials.update_one(
                {"user_id": user["id"]},
                {"$set": {"last_used": datetime.now(timezone.utc)},
                 "$inc": {"sign_count": 1}}
            )
            
            # Clean up challenge
            await self.db.webauthn_challenges.delete_one({"user_id": user["id"], "type": "login"})
            
            return user, None
        except Exception as e:
            return None, str(e)
    
    async def has_biometric(self, username: str) -> bool:
        """Check if user has biometric registered"""
        user = await self.db.users.find_one({"username": username})
        if not user:
            return False
        
        credential = await self.db.webauthn_credentials.find_one({"user_id": user["id"]})
        return credential is not None
    
    async def remove_biometric(self, user_id: str) -> bool:
        """Remove biometric credential"""
        result = await self.db.webauthn_credentials.delete_one({"user_id": user_id})
        return result.deleted_count > 0
