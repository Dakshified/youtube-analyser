import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    channel_title = Column(String, nullable=True)
    video_count = Column(Integer, default=0)
    total_views = Column(Integer, default=0)
    total_likes = Column(Integer, default=0)
    total_comments = Column(Integer, default=0)
    total_shares = Column(Integer, default=0)
    is_mock = Column(Boolean, default=False)
    
    # Duration analytics
    total_duration_seconds = Column(Integer, default=0)
    average_duration_seconds = Column(Float, default=0.0)
    
    # Extremes
    longest_video_id = Column(String, nullable=True)
    longest_video_title = Column(String, nullable=True)
    longest_video_seconds = Column(Integer, default=0)
    shortest_video_id = Column(String, nullable=True)
    shortest_video_title = Column(String, nullable=True)
    shortest_video_seconds = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    videos = relationship("PlaylistVideo", back_populates="playlist", cascade="all, delete-orphan")

class Video(Base):
    __tablename__ = "videos"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    channel_title = Column(String, nullable=True)
    publish_date = Column(String, nullable=True)
    duration_seconds = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    share_count = Column(Integer, default=0) # Added share count metric
    category = Column(String, nullable=True)
    tags = Column(Text, nullable=True) # JSON list of tags
    is_mock = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class PlaylistVideo(Base):
    __tablename__ = "playlist_videos"

    playlist_id = Column(String, ForeignKey("playlists.id", ondelete="CASCADE"), primary_key=True)
    video_id = Column(String, ForeignKey("videos.id", ondelete="CASCADE"), primary_key=True)
    position = Column(Integer, default=0)

    # Relationships
    playlist = relationship("Playlist", back_populates="videos")
    video = relationship("Video")

class Transcript(Base):
    __tablename__ = "transcripts"

    video_id = Column(String, primary_key=True, index=True)
    raw_text = Column(Text, nullable=False)
    word_count = Column(Integer, default=0)
    character_count = Column(Integer, default=0)
    speaking_duration_seconds = Column(Integer, default=0)
    segments = Column(Text, nullable=True) # JSON list of segments
