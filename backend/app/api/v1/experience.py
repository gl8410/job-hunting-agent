"""
Experience Block API Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from app.api.deps import get_db, get_current_user
from app.models.profile import ExperienceBlock
from app.schemas.profile import (
    ExperienceBlockCreate,
    ExperienceBlockUpdate,
    ExperienceBlockResponse
)
from app.models.user import Profile
from app.integrations.vector import vector_client
from app.core.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.get("/experience", response_model=List[ExperienceBlockResponse])
async def list_experience_blocks(
    skip: int = 0,
    limit: int = 100,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all experience blocks"""
    current_user_email = current_user.email
    statement = select(ExperienceBlock).where(ExperienceBlock.user_email == current_user_email).offset(skip).limit(limit)
    blocks = db.exec(statement).all()
    return blocks

@router.post("/experience", response_model=ExperienceBlockResponse)
async def create_experience_block(
    block: ExperienceBlockCreate,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new experience block"""
    current_user_email = current_user.email
    logger.info(f"Creating experience block: {block.experience_name}")
    try:
        block_data = block.model_dump()
        block_data['user_email'] = current_user_email
        db_block = ExperienceBlock(**block_data)
        db.add(db_block)
    except Exception as e:
        logger.error(f"Error creating ExperienceBlock model: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid block data: {e}")
    db.commit()
    db.refresh(db_block)
    
    # Add to vector database
    try:
        logger.info(f"Adding experience block {db_block.id} to vector DB")
        await vector_client.upsert_experience_blocks([{
            "id": db_block.id,
            "experience_name": db_block.experience_name,
            "company": db_block.company,
            "role": db_block.role,
            "tags": db_block.tags,
            "tech_stack": db_block.tech_stack,
            "content_star": db_block.content_star
        }], user_email=current_user_email)
        db_block.embedding_id = str(db_block.id)
        db.add(db_block)
        db.commit()
        db.refresh(db_block)
        logger.info(f"Successfully created experience block {db_block.id} and added to vector DB")
    except Exception as e:
        logger.error(f"Error adding to vector DB: {e}")
    
    return db_block

@router.get("/experience/{block_id}", response_model=ExperienceBlockResponse)
async def get_experience_block(
    block_id: int,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific experience block"""
    current_user_email = current_user.email
    block = db.get(ExperienceBlock, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Experience block not found")
    if block.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="Not authorized to access this block")
    return block

@router.put("/experience/{block_id}", response_model=ExperienceBlockResponse)
async def update_experience_block(
    block_id: int,
    block_update: ExperienceBlockUpdate,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an experience block"""
    current_user_email = current_user.email
    block = db.get(ExperienceBlock, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Experience block not found")
    if block.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="Not authorized to update this block")
    
    update_data = block_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(block, key, value)
    
    db.add(block)
    db.commit()
    db.refresh(block)
    
    # Update in vector database
    try:
        await vector_client.upsert_experience_blocks([{
            "id": block.id,
            "experience_name": block.experience_name,
            "company": block.company,
            "role": block.role,
            "tags": block.tags,
            "tech_stack": block.tech_stack,
            "content_star": block.content_star
        }], user_email=current_user_email)
    except Exception as e:
        logger.error(f"Error updating vector DB: {e}")
    
    logger.info(f"Successfully updated experience block {block.id}")
    return block

@router.delete("/experience/{block_id}")
async def delete_experience_block(
    block_id: int,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an experience block"""
    current_user_email = current_user.email
    block = db.get(ExperienceBlock, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Experience block not found")
    if block.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="Not authorized to delete this block")
    
    # Delete from vector database
    try:
        vector_client.delete_experience_block(str(block_id))
    except Exception as e:
        logger.error(f"Error deleting from vector DB: {e}")
    
    db.delete(block)
    db.commit()
    logger.info(f"Successfully deleted experience block {block_id}")
    return {"message": "Experience block deleted successfully"}

