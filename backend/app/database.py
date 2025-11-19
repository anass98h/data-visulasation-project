import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
from app.config import DB_PATH


def get_connection():
    """Get a database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn


def create_tables():
    """Initialize database tables"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS demos (
            demo_id TEXT PRIMARY KEY,
            map_name TEXT NOT NULL,
            date TEXT NOT NULL,
            team_ct TEXT,
            team_t TEXT,
            player_count INTEGER,
            round_count INTEGER,
            score_ct INTEGER,
            score_t INTEGER,
            demo_name TEXT,
            created_at TEXT NOT NULL,
            file_size INTEGER
        )
    """)
    
    conn.commit()
    conn.close()


def save_demo_metadata(
    demo_id: str,
    metadata: Dict[str, Any],
    file_size: int
) -> bool:
    """Save demo metadata to database"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO demos (
                demo_id, map_name, date, team_ct, team_t,
                player_count, round_count, score_ct, score_t,
                demo_name, created_at, file_size
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            demo_id,
            metadata.get('map_name'),
            metadata.get('date'),
            metadata.get('team_ct'),
            metadata.get('team_t'),
            metadata.get('player_count'),
            metadata.get('round_count'),
            metadata.get('score_ct'),
            metadata.get('score_t'),
            metadata.get('demo_name'),
            datetime.utcnow().isoformat(),
            file_size
        ))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error saving metadata: {e}")
        return False


def get_all_demos() -> List[Dict[str, Any]]:
    """Get all demos ordered by creation date (newest first)"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM demos
        ORDER BY created_at DESC
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


def get_demo_metadata(demo_id: str) -> Optional[Dict[str, Any]]:
    """Get metadata for a specific demo"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM demos
        WHERE demo_id = ?
    """, (demo_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    return dict(row) if row else None


def delete_demo(demo_id: str) -> bool:
    """Delete demo metadata from database"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            DELETE FROM demos
            WHERE demo_id = ?
        """, (demo_id,))
        
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        
        return deleted
    except Exception as e:
        print(f"Error deleting demo: {e}")
        return False


def demo_exists(demo_id: str) -> bool:
    """Check if a demo exists"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 1 FROM demos
        WHERE demo_id = ?
    """, (demo_id,))
    
    exists = cursor.fetchone() is not None
    conn.close()
    
    return exists