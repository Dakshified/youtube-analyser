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
    is_mock = Column(Boolean, default=False)

    
    # Duration analytics
    total_duration_seconds = Column(Integer, default=0)
    average_duration_seconds = Column(Float, default=0.0)
    median_duration_seconds = Column(Float, default=0.0)
    
    # Extremes
    longest_video_id = Column(String, nullable=True)
    longest_video_title = Column(String, nullable=True)
    longest_video_seconds = Column(Integer, default=0)
    shortest_video_id = Column(String, nullable=True)
    shortest_video_title = Column(String, nullable=True)
    shortest_video_seconds = Column(Integer, default=0)
    
    # Intelligence scores
    learning_score = Column(Integer, default=50)
    difficulty = Column(String, default="Intermediate")
    skills = Column(Text, nullable=True) # JSON list of skills
    topics = Column(Text, nullable=True) # JSON dict of topics identified
    learning_path = Column(Text, nullable=True) # JSON list of recommended next paths
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    videos = relationship("Video", back_populates="playlist", cascade="all, delete-orphan")

class Video(Base):
    __tablename__ = "videos"

    id = Column(String, primary_key=True, index=True)
    playlist_id = Column(String, ForeignKey("playlists.id", ondelete="CASCADE"), primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    duration_seconds = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    publish_date = Column(String, nullable=True)
    position = Column(Integer, default=0)

    # Relationships
    playlist = relationship("Playlist", back_populates="videos")

class Transcript(Base):
    __tablename__ = "transcripts"

    video_id = Column(String, primary_key=True, index=True)
    raw_text = Column(Text, nullable=False)
    word_count = Column(Integer, default=0)
    speaking_duration_seconds = Column(Integer, default=0)
    keywords = Column(Text, nullable=True) # JSON list of common keywords
    topics = Column(Text, nullable=True) # JSON list of topic/frequencies
    segments = Column(Text, nullable=True) # JSON list of segment details

class AISummary(Base):
    __tablename__ = "ai_summaries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    target_type = Column(String, nullable=False) # "video" or "playlist"
    target_id = Column(String, index=True, nullable=False)
    summary_json = Column(Text, nullable=False) # JSON containing structured summaries/notes

class StudyPlan(Base):
    __tablename__ = "study_plans"

    playlist_id = Column(String, primary_key=True, index=True)
    daily_time_minutes = Column(Integer, primary_key=True) # Composite PK: plan per daily time setting
    plan_json = Column(Text, nullable=False) # JSON study guide schedule
