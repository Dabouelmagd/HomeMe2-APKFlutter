# WebSocket Connection Manager for Real-time Features
import json
import logging
from typing import Dict, List, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime, timezone
import asyncio

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Active WebSocket connections
        self.active_connections: Dict[str, WebSocket] = {}
        
        # User connection mapping
        self.user_connections: Dict[str, Set[str]] = {}  # user_id -> set of connection_ids
        
        # Compound connection mapping  
        self.compound_connections: Dict[str, Set[str]] = {}  # compound_id -> set of connection_ids
        
        # Connection metadata
        self.connection_metadata: Dict[str, Dict] = {}  # connection_id -> metadata

    async def connect(self, websocket: WebSocket, connection_id: str, user_id: str, compound_id: str):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        # Store connection
        self.active_connections[connection_id] = websocket
        
        # Store metadata
        self.connection_metadata[connection_id] = {
            'user_id': user_id,
            'compound_id': compound_id,
            'connected_at': datetime.now(timezone.utc),
            'last_activity': datetime.now(timezone.utc)
        }
        
        # Update user connections
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(connection_id)
        
        # Update compound connections
        if compound_id not in self.compound_connections:
            self.compound_connections[compound_id] = set()
        self.compound_connections[compound_id].add(connection_id)
        
        logger.info(f"WebSocket connected: {connection_id} (user: {user_id}, compound: {compound_id})")
        
        # Send connection confirmation
        await self.send_to_connection(connection_id, {
            'type': 'connection_established',
            'connection_id': connection_id,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })

    def disconnect(self, connection_id: str):
        """Remove a WebSocket connection"""
        if connection_id not in self.active_connections:
            return
            
        metadata = self.connection_metadata.get(connection_id, {})
        user_id = metadata.get('user_id')
        compound_id = metadata.get('compound_id')
        
        # Remove from active connections
        del self.active_connections[connection_id]
        del self.connection_metadata[connection_id]
        
        # Remove from user connections
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        # Remove from compound connections
        if compound_id and compound_id in self.compound_connections:
            self.compound_connections[compound_id].discard(connection_id)
            if not self.compound_connections[compound_id]:
                del self.compound_connections[compound_id]
        
        logger.info(f"WebSocket disconnected: {connection_id}")

    async def send_to_connection(self, connection_id: str, message: dict):
        """Send message to a specific connection"""
        if connection_id in self.active_connections:
            try:
                websocket = self.active_connections[connection_id]
                await websocket.send_text(json.dumps(message, default=str))
                
                # Update last activity
                if connection_id in self.connection_metadata:
                    self.connection_metadata[connection_id]['last_activity'] = datetime.now(timezone.utc)
                    
                return True
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                self.disconnect(connection_id)
                return False
        return False

    async def send_to_user(self, user_id: str, message: dict):
        """Send message to all connections of a specific user"""
        if user_id not in self.user_connections:
            return 0
            
        connection_ids = self.user_connections[user_id].copy()
        sent_count = 0
        
        for connection_id in connection_ids:
            if await self.send_to_connection(connection_id, message):
                sent_count += 1
                
        return sent_count

    async def send_to_compound(self, compound_id: str, message: dict, exclude_user_id: Optional[str] = None):
        """Send message to all connections in a compound"""
        if compound_id not in self.compound_connections:
            return 0
            
        connection_ids = self.compound_connections[compound_id].copy()
        sent_count = 0
        
        for connection_id in connection_ids:
            # Skip excluded user
            metadata = self.connection_metadata.get(connection_id, {})
            if exclude_user_id and metadata.get('user_id') == exclude_user_id:
                continue
                
            if await self.send_to_connection(connection_id, message):
                sent_count += 1
                
        return sent_count

    async def broadcast_to_all(self, message: dict):
        """Send message to all active connections"""
        connection_ids = list(self.active_connections.keys())
        sent_count = 0
        
        for connection_id in connection_ids:
            if await self.send_to_connection(connection_id, message):
                sent_count += 1
                
        return sent_count

    async def send_notification(self, notification_data: dict, target_type: str = "user", target_id: str = None):
        """Send notification via WebSocket"""
        message = {
            'type': 'new_notification',
            'notification': notification_data,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        if target_type == "user" and target_id:
            return await self.send_to_user(target_id, message)
        elif target_type == "compound" and target_id:
            return await self.send_to_compound(target_id, message)
        else:
            return await self.broadcast_to_all(message)

    def get_user_connection_count(self, user_id: str) -> int:
        """Get number of active connections for a user"""
        return len(self.user_connections.get(user_id, set()))

    def get_compound_connection_count(self, compound_id: str) -> int:
        """Get number of active connections for a compound"""
        return len(self.compound_connections.get(compound_id, set()))

    def get_total_connections(self) -> int:
        """Get total number of active connections"""
        return len(self.active_connections)

    def get_connection_stats(self) -> dict:
        """Get connection statistics"""
        return {
            'total_connections': self.get_total_connections(),
            'unique_users': len(self.user_connections),
            'active_compounds': len(self.compound_connections),
            'connections_by_compound': {
                compound_id: len(connections) 
                for compound_id, connections in self.compound_connections.items()
            }
        }

    async def cleanup_stale_connections(self, max_idle_minutes: int = 30):
        """Clean up connections that have been idle too long"""
        current_time = datetime.now(timezone.utc)
        stale_connections = []
        
        for connection_id, metadata in self.connection_metadata.items():
            last_activity = metadata.get('last_activity')
            if last_activity:
                idle_time = (current_time - last_activity).total_seconds() / 60
                if idle_time > max_idle_minutes:
                    stale_connections.append(connection_id)
        
        for connection_id in stale_connections:
            logger.info(f"Cleaning up stale connection: {connection_id}")
            self.disconnect(connection_id)
            
        return len(stale_connections)

    async def ping_all_connections(self):
        """Send ping to all connections to check if they're alive"""
        ping_message = {
            'type': 'ping',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        connection_ids = list(self.active_connections.keys())
        alive_count = 0
        
        for connection_id in connection_ids:
            if await self.send_to_connection(connection_id, ping_message):
                alive_count += 1
                
        return alive_count

# Global connection manager instance
manager = ConnectionManager()

# Periodic cleanup task
async def periodic_cleanup():
    """Periodic cleanup of stale connections"""
    while True:
        try:
            await asyncio.sleep(300)  # Run every 5 minutes
            cleaned = await manager.cleanup_stale_connections()
            if cleaned > 0:
                logger.info(f"Cleaned up {cleaned} stale connections")
        except Exception as e:
            logger.error(f"Error in periodic cleanup: {e}")

# Note: The cleanup task should be started manually in the main application
# Example: asyncio.create_task(periodic_cleanup())