#!/usr/bin/env python3
"""
Migration script to add generated_content_lang column to job_opportunities table
Run this script to update existing database schema
"""
import os
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.core.db import engine

def migrate():
    """Add generated_content_lang column if it doesn't exist"""
    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='job_opportunities' 
            AND column_name='generated_content_lang'
        """))
        
        if result.fetchone() is None:
            print("Adding generated_content_lang column...")
            conn.execute(text("""
                ALTER TABLE job_opportunities 
                ADD COLUMN generated_content_lang VARCHAR(10) DEFAULT NULL
            """))
            conn.commit()
            print("✓ Column added successfully")
        else:
            print("✓ Column already exists, skipping migration")

if __name__ == "__main__":
    print("Running migration: add generated_content_lang column")
    migrate()
    print("Migration complete!")
