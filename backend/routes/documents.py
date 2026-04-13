"""
Document Management routes - extracted from server.py
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

router = APIRouter(prefix="/api")

@router.get("/documents")
async def get_documents(
    category: Optional[str] = None,
    folder_id: Optional[str] = None,
    tags: Optional[str] = None,
    access_level: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get documents with filtering and access control"""
    db = get_db()
    try:
        query = {
            "compound_id": current_user.compound_id,
            "is_active": True
        }
        
        # Apply filters
        if category:
            query["category"] = category
        if folder_id:
            query["folder_id"] = folder_id
        if access_level:
            query["access_level"] = access_level
        
        # Search functionality
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"tags": {"$in": [search]}},
                {"subcategory": {"$regex": search, "$options": "i"}}
            ]
        
        # Tag filtering
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",")]
            query["tags"] = {"$in": tag_list}
        
        # Access control filtering
        access_filter = []
        
        # Public documents
        access_filter.append({"access_level": "public"})
        
        # Admin-only documents for admins
        if current_user.role == "admin":
            access_filter.append({"access_level": "admin_only"})
        
        # Family-specific documents
        if current_user.get("family_id"):
            access_filter.append({
                "$and": [
                    {"access_level": "family_only"},
                    {"allowed_families": {"$in": [current_user.get("family_id")]}}
                ]
            })
        
        # User-specific documents
        access_filter.append({
            "$and": [
                {"access_level": "custom"},
                {"allowed_users": {"$in": [current_user.id]}}
            ]
        })
        
        if len(access_filter) > 1:
            if "$and" not in query:
                query["$and"] = []
            query["$and"].append({"$or": access_filter})
        
        # Get documents with pagination
        documents = await db.documents.find(query).sort("updated_at", -1).skip(skip).limit(limit).to_list(length=None)
        total_count = await db.documents.count_documents(query)
        
        return {
            "documents": [serialize_datetime(doc) for doc in documents],
            "total_count": total_count,
            "has_more": skip + len(documents) < total_count
        }
        
    except Exception as e:
        logging.error(f"Error getting documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to get documents")

@router.post("/documents")
async def create_document(
    document_data: DocumentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new document"""
    try:
        db = get_db()
        # Validate access level permissions
        if document_data.access_level == "admin_only" and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can create admin-only documents")
        
        document = Document(
            **document_data.dict(),
            compound_id=current_user.compound_id,
            created_by=current_user.id,
            updated_by=current_user.id
        )
        
        document_dict = serialize_datetime(document.dict())
        await db.documents.insert_one(document_dict)
        
        return {"message": "Document created successfully", "document_id": document.id}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating document: {e}")
        raise HTTPException(status_code=500, detail="Failed to create document")

@router.post("/documents/{document_id}/upload")
async def upload_document_version(
    document_id: str,
    file: UploadFile = File(...),
    changelog: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Upload a new version of a document"""
    try:
        db = get_db()
        # Verify document exists and user has access to edit
        document = await db.documents.find_one({
            "id": document_id,
            "compound_id": current_user.compound_id,
            "is_active": True
        })
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check edit permissions
        if document["access_level"] == "admin_only" and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Save file
        file_metadata = await save_uploaded_file(file, "document")
        
        # Create new version
        new_version_number = document.get("current_version", 0) + 1
        
        new_version = DocumentVersion(
            version_number=new_version_number,
            file_url=file_metadata["file_url"],
            file_name=file_metadata["original_filename"],
            file_size=file_metadata["file_size"],
            mime_type=file_metadata["mime_type"],
            uploaded_by=current_user.id,
            changelog=changelog
        )
        
        # Update document
        await db.documents.update_one(
            {"id": document_id},
            {
                "$push": {"versions": serialize_datetime(new_version.dict())},
                "$set": {
                    "current_version": new_version_number,
                    "updated_by": current_user.id,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {"message": "Document version uploaded successfully", "version_number": new_version_number}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error uploading document version: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload document version")

@router.get("/documents/{document_id}")
async def get_document_details(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed document information with access control"""
    try:
        db = get_db()
        document = await db.documents.find_one({
            "id": document_id,
            "compound_id": current_user.compound_id,
            "is_active": True
        })
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check access permissions
        has_access = False
        
        if document["access_level"] == "public":
            has_access = True
        elif document["access_level"] == "admin_only" and current_user.role == "admin":
            has_access = True
        elif document["access_level"] == "family_only" and current_user.get("family_id") in document.get("allowed_families", []):
            has_access = True
        elif current_user.id in document.get("allowed_users", []):
            has_access = True
        
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied to this document")
        
        # Update view count and last accessed
        await db.documents.update_one(
            {"id": document_id},
            {
                "$inc": {"view_count": 1},
                "$set": {"last_accessed": datetime.utcnow()}
            }
        )
        
        # Log access
        access_log = DocumentAccessLog(
            document_id=document_id,
            user_id=current_user.id,
            access_type="view"
        )
        await db.document_access.insert_one(serialize_datetime(access_log.dict()))
        
        return {"document": serialize_datetime(document)}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting document details: {e}")
        raise HTTPException(status_code=500, detail="Failed to get document details")

@router.get("/documents/folders")
async def get_document_folders(current_user: dict = Depends(get_current_user)):
    """Get document folders hierarchy"""
    db = get_db()
    try:
        db = get_db()
        folders = await db.document_folders.find({
            "compound_id": current_user.compound_id,
            "is_active": True
        }).sort("path", 1).to_list(length=None)
        
        return {"folders": [serialize_datetime(folder) for folder in folders]}
        
    except Exception as e:
        logging.error(f"Error getting document folders: {e}")
        raise HTTPException(status_code=500, detail="Failed to get document folders")

@router.post("/documents/folders")
async def create_document_folder(
    folder_data: DocumentFolderCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new document folder"""
    try:
        db = get_db()
        # Build folder path
        path = f"/{folder_data.name}"
        if folder_data.parent_folder_id:
            parent_folder = await db.document_folders.find_one({
                "id": folder_data.parent_folder_id,
                "compound_id": current_user.compound_id
            })
            if parent_folder:
                path = f"{parent_folder['path']}/{folder_data.name}"
        
        folder = DocumentFolder(
            **folder_data.dict(),
            compound_id=current_user.compound_id,
            path=path,
            created_by=current_user.id
        )
        
        folder_dict = serialize_datetime(folder.dict())
        await db.document_folders.insert_one(folder_dict)
        
        return {"message": "Folder created successfully", "folder_id": folder.id}
        
    except Exception as e:
        logging.error(f"Error creating document folder: {e}")
        raise HTTPException(status_code=500, detail="Failed to create document folder")

# ============ PHASE 3: VOTING & POLLING SYSTEM ENDPOINTS ============
