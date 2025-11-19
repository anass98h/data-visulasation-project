from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class DemoMetadata(BaseModel):
    """Metadata sent from frontend when saving a demo"""
    map_name: str
    date: str  # ISO format string
    team_ct: Optional[str] = None
    team_t: Optional[str] = None
    player_count: Optional[int] = None
    round_count: Optional[int] = None
    score_ct: Optional[int] = None
    score_t: Optional[int] = None
    demo_name: Optional[str] = None  # Original filename


class DemoSaveRequest(BaseModel):
    """Request body for saving a demo"""
    metadata: DemoMetadata
    data: Any  # The actual JSON data from parser


class DemoResponse(BaseModel):
    """Response after saving a demo"""
    demo_id: str
    message: str
    timestamp: str


class DemoListItem(BaseModel):
    """Individual demo item in list response"""
    demo_id: str
    map_name: str
    date: str
    team_ct: Optional[str] = None
    team_t: Optional[str] = None
    demo_name: Optional[str] = None
    score_ct: Optional[int] = None
    score_t: Optional[int] = None
    created_at: str


class DemoListResponse(BaseModel):
    """Response for list of demos"""
    demos: List[DemoListItem]
    total: int


class DeleteResponse(BaseModel):
    """Response after deleting a demo"""
    message: str
    demo_id: str