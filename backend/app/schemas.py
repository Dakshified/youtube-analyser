from pydantic import BaseModel, HttpUrl
from typing import List, Dict, Optional, Any
from datetime import datetime

class AnalysisRequest(BaseModel):
    url: str

class StudyPlanRequest(BaseModel):
    daily_time_minutes: int

class CompareRequest(BaseModel):
    playlist_id_1: str
    playlist_id_2: str

# Video Schemas
class VideoBase(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_seconds: int
    view_count: int
    publish_date: Optional[str] = None
    position: int

class VideoResponse(VideoBase):
    playlist_id: str

    class Config:
        from_attributes = True

# Playlist Schemas
class PlaylistBase(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    channel_title: Optional[str] = None
    video_count: int
    total_views: int
    is_mock: Optional[bool] = False
    total_duration_seconds: int
    average_duration_seconds: float
    median_duration_seconds: float
    longest_video_id: Optional[str] = None
    longest_video_title: Optional[str] = None
    longest_video_seconds: int
    shortest_video_id: Optional[str] = None
    shortest_video_title: Optional[str] = None
    shortest_video_seconds: int
    learning_score: int
    difficulty: str
    skills: Optional[str] = None
    topics: Optional[str] = None
    learning_path: Optional[str] = None

class PlaylistResponse(PlaylistBase):
    created_at: datetime
    videos: List[VideoResponse] = []

    class Config:
        from_attributes = True

# Transcript Schemas
class TranscriptResponse(BaseModel):
    video_id: str
    raw_text: str
    word_count: int
    speaking_duration_seconds: int
    keywords: Optional[List[Dict[str, Any]]] = None # List of dicts parsed from JSON
    topics: Optional[List[Dict[str, Any]]] = None # List of topics parsed from JSON
    segments: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True

# AI Summary / Report Schemas
class AISummaryResponse(BaseModel):
    target_type: str
    target_id: str
    summary: Dict[str, Any] # Parsed json representation of summary_json

    class Config:
        from_attributes = True

# Study Plan Schemas
class StudyPlanResponse(BaseModel):
    playlist_id: str
    daily_time_minutes: int
    schedule: List[Dict[str, Any]] # Parsed json representation of plan_json

    class Config:
        from_attributes = True

# Comparison Response
class ComparisonResponse(BaseModel):
    playlist_1: PlaylistBase
    playlist_2: PlaylistBase
    comparison_metrics: Dict[str, Any]
