# -*- coding: utf-8 -*-
"""
KalaSetu — Database Migration Script
Run from project root: backend\venv\Scripts\python.exe backend/migrate.py

Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS).
Adds columns and tables introduced after the initial schema creation.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from database import engine
from sqlalchemy import text


MIGRATIONS = [
    # v2.1 — Per-listing view tracking
    (
        "Add view_count to products",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0"
    ),
    (
        "Create product_views table",
        """
        CREATE TABLE IF NOT EXISTS product_views (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            viewer_ip VARCHAR(45),
            viewed_at TIMESTAMPTZ DEFAULT now()
        )
        """
    ),
]


def run_migrations():
    print("=" * 55)
    print("  KalaSetu DB Migration")
    print("=" * 55)

    with engine.connect() as conn:
        for name, sql in MIGRATIONS:
            try:
                conn.execute(text(sql.strip()))
                conn.commit()
                print(f"  ✅ {name}")
            except Exception as e:
                print(f"  ⚠️  {name}: {e}")

    print("=" * 55)
    print("  Migration complete.")
    print("=" * 55)


if __name__ == "__main__":
    run_migrations()

