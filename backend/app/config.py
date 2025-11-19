import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Data directories
DATA_DIR = BASE_DIR / "data"
DEMOS_DIR = DATA_DIR / "demos"
DB_PATH = DATA_DIR / "metadata.db"

# Create directories if they don't exist
DEMOS_DIR.mkdir(parents=True, exist_ok=True)

# CORS settings
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:5173",
]

# File settings
MAX_JSON_SIZE_MB = 500  # Maximum JSON file size in MB

# Server settings
HOST = "0.0.0.0"
PORT = 8000
