"""
Resume Template API Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional

from app.api.deps import get_db, get_current_user
from app.models.template import ResumeTemplate
from app.models.user import Profile
from app.schemas.template import TemplateCreate, TemplateResponse
from pydantic import BaseModel

router = APIRouter()

@router.get("/templates", response_model=List[TemplateResponse])
async def list_templates(
    skip: int = 0,
    limit: int = 100,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all resume templates"""
    current_user_email = current_user.email
    # Assuming appropriate handling for shared vs user templates
    # This implementation isolates templates per user for now
    statement = select(ResumeTemplate).where(ResumeTemplate.user_email == current_user_email).offset(skip).limit(limit)
    templates = db.exec(statement).all()
    return templates

@router.post("/templates", response_model=TemplateResponse)
async def create_template(
    template: TemplateCreate,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new resume template"""
    current_user_email = current_user.email
    tmpl_data = template.model_dump()
    tmpl_data['user_email'] = current_user_email
    db_template = ResumeTemplate(**tmpl_data)
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("/templates/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: int,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific template"""
    current_user_email = current_user.email
    template = db.get(ResumeTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.user_email != current_user_email:
        # Check if it's a global template perhaps? For now, strict isolation
        raise HTTPException(status_code=403, detail="Not authorized to access this template")
    return template

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    style: Optional[str] = None
    template_content: Optional[str] = None
    cover_letter_content: Optional[str] = None

@router.put("/templates/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    template_update: TemplateUpdate,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a specific template (e.g. add/update resume or cover letter content)"""
    current_user_email = current_user.email
    template = db.get(ResumeTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="Not authorized to modify this template")

    update_data = template_update.model_dump(exclude_unset=True)
    
    # Handle explicit nullifications in a specific way if needed,
    # but with exclude_unset=True, fields explicitly set to None will update to None if we process them
    # Actually pydantic BaseModels dump None values even with exclude_unset if they were explicitly provided.
    for key, value in update_data.items():
        setattr(template, key, value)

    db.add(template)
    db.commit()
    db.refresh(template)
    return template

@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: int,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a specific template"""
    current_user_email = current_user.email
    template = db.get(ResumeTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="Not authorized to delete this template")

    db.delete(template)
    db.commit()
    return {"message": "Template deleted successfully"}
