from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime

class AnalysisRequest(BaseModel):
    url: str

class CompareRequest(BaseModel):
    url_1: str
    url_2: str

# Video Schemas
class VideoBase(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    channel_title: Optional[str] = None
    publish_date: Optional[str] = None
    duration_seconds: int
    view_count: int
    like_count: int
    comment_count: int
    category: Optional[str] = None
    tags: Optional[str] = None # JSON list of strings
    is_mock: bool = False

class VideoResponse(VideoBase):
    created_at: datetime

    class Config:
        from_attributes = True

# Playlist-Video Junction Schema
class PlaylistVideoResponse(BaseModel):
    position: int
    video: VideoResponse

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
    total_likes: int
    total_comments: int
    is_mock: bool = False
    total_duration_seconds: int
    average_duration_seconds: float
    longest_video_id: Optional[str] = None
    longest_video_title: Optional[str] = None
    longest_video_seconds: int
    shortest_video_id: Optional[str] = None
    shortest_video_title: Optional[str] = None
    shortest_video_seconds: int

class PlaylistResponse(PlaylistBase):
    created_at: datetime
    videos: List[PlaylistVideoResponse] = []

    class Config:
        from_attributes = True

# Transcript Schemas
class TranscriptResponse(BaseModel):
    video_id: str
    raw_text: str
    word_count: int
    character_count: int
    speaking_duration_seconds: int
    segments: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True

# Comparison Responses
class VideoComparisonResponse(BaseModel):
    video_1: VideoResponse
    video_2: VideoResponse
    comparison_metrics: Dict[str, Any]

class PlaylistComparisonResponse(BaseModel):
    playlist_1: PlaylistResponse
    playlist_2: PlaylistResponse
    comparison_metrics: Dict[str, Any]
