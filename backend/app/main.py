from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import uuid
from datetime import datetime
from pathlib import Path

from app.config import CORS_ORIGINS, DEMOS_DIR, MAX_JSON_SIZE_MB
from app.models import (
    DemoSaveRequest,
    DemoResponse,
    DemoListResponse,
    DemoListItem,
    DeleteResponse
)
from app import database

# Initialize database
database.create_tables()

# Create FastAPI app
app = FastAPI(
    title="CS2 Demo Analysis API",
    description="Backend for CS2 demo parsing and analysis",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "CS2 Demo Analysis API",
        "version": "1.0.0"
    }


@app.post("/demo/save", response_model=DemoResponse)
async def save_demo(request: DemoSaveRequest):
    """
    Save a parsed demo with its metadata
    
    - **metadata**: Demo metadata (map, teams, scores, etc.)
    - **data**: Parsed demo data as JSON
    """
    try:
        # Generate unique demo ID
        demo_id = str(uuid.uuid4())
        
        # Convert data to JSON string and check size
        json_data = json.dumps(request.data)
        file_size = len(json_data.encode('utf-8'))
        
        # Check file size (convert to MB)
        size_mb = file_size / (1024 * 1024)
        if size_mb > MAX_JSON_SIZE_MB:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"JSON data too large ({size_mb:.2f}MB). Maximum: {MAX_JSON_SIZE_MB}MB"
            )
        
        # Save JSON file
        file_path = DEMOS_DIR / f"{demo_id}.json"
        with open(file_path, 'w') as f:
            f.write(json_data)
        
        # Save metadata to database
        metadata_dict = request.metadata.model_dump()
        success = database.save_demo_metadata(demo_id, metadata_dict, file_size)
        
        if not success:
            # Clean up file if database save failed
            file_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save demo metadata"
            )
        
        return DemoResponse(
            demo_id=demo_id,
            message="Demo saved successfully",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving demo: {str(e)}"
        )


@app.get("/demos", response_model=DemoListResponse)
async def get_demos():
    """
    Get list of all saved demos with their metadata
    
    Returns demos ordered by creation date (newest first)
    """
    try:
        demos_data = database.get_all_demos()
        
        demo_items = [
            DemoListItem(
                demo_id=demo['demo_id'],
                map_name=demo['map_name'],
                date=demo['date'],
                team_ct=demo.get('team_ct'),
                team_t=demo.get('team_t'),
                demo_name=demo.get('demo_name'),
                score_ct=demo.get('score_ct'),
                score_t=demo.get('score_t'),
                created_at=demo['created_at']
            )
            for demo in demos_data
        ]
        
        return DemoListResponse(
            demos=demo_items,
            total=len(demo_items)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving demos: {str(e)}"
        )


@app.get("/demo/{demo_id}")
async def get_demo(demo_id: str):
    """
    Get full data for a specific demo
    
    - **demo_id**: Unique identifier for the demo
    """
    try:
        # Check if demo exists in database
        if not database.demo_exists(demo_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Demo not found: {demo_id}"
            )
        
        # Load JSON file
        file_path = DEMOS_DIR / f"{demo_id}.json"
        
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Demo data file not found: {demo_id}"
            )
        
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        # Get metadata
        metadata = database.get_demo_metadata(demo_id)
        
        return {
            "demo_id": demo_id,
            "metadata": metadata,
            "data": data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving demo: {str(e)}"
        )


@app.delete("/demo/{demo_id}", response_model=DeleteResponse)
async def delete_demo(demo_id: str):
    """
    Delete a demo and its data
    
    - **demo_id**: Unique identifier for the demo
    """
    try:
        # Check if demo exists
        if not database.demo_exists(demo_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Demo not found: {demo_id}"
            )
        
        # Delete from database
        db_deleted = database.delete_demo(demo_id)
        
        # Delete JSON file
        file_path = DEMOS_DIR / f"{demo_id}.json"
        file_path.unlink(missing_ok=True)
        
        if not db_deleted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete demo from database"
            )
        
        return DeleteResponse(
            message="Demo deleted successfully",
            demo_id=demo_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting demo: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    from app.config import HOST, PORT
    
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=True
    )