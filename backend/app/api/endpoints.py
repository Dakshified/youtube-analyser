import json
import datetime
import statistics
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.database import get_db
from app import models, schemas
from app.services.youtube import YouTubeService, extract_video_id, extract_playlist_id
from app.services.transcript import TranscriptService

router = APIRouter()

@router.post("/video/analyse", response_model=schemas.VideoResponse)
def analyse_video(
    request: schemas.AnalysisRequest,
    db: Session = Depends(get_db),
    x_youtube_key: Optional[str] = Header(None)
):
    """
    Extracts video ID, fetches video details, caches it, and returns the video object.
    """
    try:
        video_id = extract_video_id(request.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # Check cache first
    cached_v = db.query(models.Video).filter(models.Video.id == video_id).first()
    
    # If cached as mock, but we now have an API key, delete it to fetch real data
    if cached_v and cached_v.is_mock and x_youtube_key and video_id.lower() not in ["video_dsa", "video_web", "video_ai"]:
        db.delete(cached_v)
        db.query(models.Transcript).filter(models.Transcript.video_id == video_id).delete()
        db.commit()
        cached_v = None
        
    if cached_v:
        return cached_v
        
    # Fetch details
    try:
        v_data = YouTubeService.fetch_video_data(video_id, x_youtube_key or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    db_vid = models.Video(
        id=v_data["id"],
        title=v_data["title"],
        description=v_data.get("description", ""),
        thumbnail_url=v_data.get("thumbnail_url", ""),
        channel_title=v_data.get("channel_title", ""),
        publish_date=v_data.get("publish_date", ""),
        duration_seconds=v_data["duration_seconds"],
        view_count=v_data["view_count"],
        like_count=v_data["like_count"],
        comment_count=v_data["comment_count"],
        category=v_data.get("category", ""),
        tags=v_data.get("tags", ""),
        is_mock=v_data.get("is_mock", False)
    )
    
    db_vid = db.merge(db_vid) # merge handles insert-or-update cleanly
    try:
        db.commit()
        db.refresh(db_vid)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database caching failed: {str(e)}")
        
    return db_vid

@router.post("/playlist/analyse", response_model=schemas.PlaylistResponse)
def analyse_playlist(
    request: schemas.AnalysisRequest,
    db: Session = Depends(get_db),
    x_youtube_key: Optional[str] = Header(None)
):
    """
    Extracts playlist ID, fetches metadata and child videos, caches them, and returns.
    """
    try:
        playlist_id = extract_playlist_id(request.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # Check cache first
    cached_pl = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    
    # If cached as mock, but we now have an API key, delete it to fetch real data
    if cached_pl and cached_pl.is_mock and x_youtube_key and playlist_id.lower() not in ["dsa", "web", "ai"]:
        db.delete(cached_pl)
        # Junction entries cascade delete because of ForeignKey, but delete associated videos if they aren't used elsewhere
        db.commit()
        cached_pl = None
        
    if cached_pl:
        # Load and sort junction items by position
        sorted_videos = sorted(cached_pl.videos, key=lambda x: x.position)
        return cached_pl
        
    # Fetch details
    try:
        pl_data = YouTubeService.fetch_playlist_data(playlist_id, x_youtube_key or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # Save Playlist details
    db_pl = models.Playlist(
        id=pl_data["id"],
        title=pl_data["title"],
        description=pl_data.get("description", ""),
        thumbnail_url=pl_data.get("thumbnail_url", ""),
        channel_title=pl_data.get("channel_title", ""),
        video_count=pl_data["video_count"],
        total_views=pl_data["total_views"],
        total_likes=pl_data["total_likes"],
        total_comments=pl_data["total_comments"],
        total_duration_seconds=pl_data["total_duration_seconds"],
        average_duration_seconds=pl_data["average_duration_seconds"],
        longest_video_id=pl_data.get("longest_video_id"),
        longest_video_title=pl_data.get("longest_video_title"),
        longest_video_seconds=pl_data.get("longest_video_seconds", 0),
        shortest_video_id=pl_data.get("shortest_video_id"),
        shortest_video_title=pl_data.get("shortest_video_title"),
        shortest_video_seconds=pl_data.get("shortest_video_seconds", 0),
        is_mock=pl_data.get("is_mock", False)
    )
    db_pl = db.merge(db_pl)
    
    # Save Videos and Junction associations
    for v in pl_data["videos"]:
        # Save video
        db_vid = models.Video(
            id=v["id"],
            title=v["title"],
            description=v.get("description", ""),
            thumbnail_url=v.get("thumbnail_url", ""),
            channel_title=v.get("channel_title", ""),
            publish_date=v.get("publish_date", ""),
            duration_seconds=v["duration_seconds"],
            view_count=v["view_count"],
            like_count=v["like_count"],
            comment_count=v["comment_count"],
            category=v.get("category", ""),
            tags=v.get("tags", ""),
            is_mock=pl_data.get("is_mock", False)
        )
        db.merge(db_vid)
        
        # Save Junction Link
        db_link = models.PlaylistVideo(
            playlist_id=pl_data["id"],
            video_id=v["id"],
            position=v["position"]
        )
        db.merge(db_link)
        
    try:
        db.commit()
        db.refresh(db_pl)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database caching failed: {str(e)}")
        
    return db_pl

@router.post("/video/compare", response_model=schemas.VideoComparisonResponse)
def compare_videos(
    request: schemas.CompareRequest,
    db: Session = Depends(get_db),
    x_youtube_key: Optional[str] = Header(None)
):
    """
    Analyzes two video URLs side-by-side and returns their comparison metrics.
    """
    # Analyze Video 1
    req1 = schemas.AnalysisRequest(url=request.url_1)
    v1 = analyse_video(req1, db, x_youtube_key)
    
    # Analyze Video 2
    req2 = schemas.AnalysisRequest(url=request.url_2)
    v2 = analyse_video(req2, db, x_youtube_key)
    
    # Calculate comparative statistics
    v1_age_days = max(1, (datetime.date.today() - datetime.datetime.strptime(v1.publish_date, "%Y-%m-%d").date()).days)
    v2_age_days = max(1, (datetime.date.today() - datetime.datetime.strptime(v2.publish_date, "%Y-%m-%d").date()).days)
    
    comparison_metrics = {
        "views_ratio": round(v1.view_count / v2.view_count if v2.view_count > 0 else 1.0, 2),
        "views_diff": v1.view_count - v2.view_count,
        "likes_diff": v1.like_count - v2.like_count,
        "comments_diff": v1.comment_count - v2.comment_count,
        "duration_diff_seconds": v1.duration_seconds - v2.duration_seconds,
        "age_diff_days": v1_age_days - v2_age_days,
        "like_view_ratio_1": round((v1.like_count / v1.view_count) * 100, 2) if v1.view_count > 0 else 0.0,
        "like_view_ratio_2": round((v2.like_count / v2.view_count) * 100, 2) if v2.view_count > 0 else 0.0,
        "views_per_day_1": round(v1.view_count / v1_age_days, 1),
        "views_per_day_2": round(v2.view_count / v2_age_days, 1),
    }
    
    return schemas.VideoComparisonResponse(
        video_1=v1,
        video_2=v2,
        comparison_metrics=comparison_metrics
    )

@router.post("/playlist/compare", response_model=schemas.PlaylistComparisonResponse)
def compare_playlists(
    request: schemas.CompareRequest,
    db: Session = Depends(get_db),
    x_youtube_key: Optional[str] = Header(None)
):
    """
    Analyzes two playlist URLs side-by-side and returns comparison aggregates.
    """
    # Analyze Playlist 1
    req1 = schemas.AnalysisRequest(url=request.url_1)
    pl1 = analyse_playlist(req1, db, x_youtube_key)
    
    # Analyze Playlist 2
    req2 = schemas.AnalysisRequest(url=request.url_2)
    pl2 = analyse_playlist(req2, db, x_youtube_key)
    
    # Parse upload timelines for gap computations
    def get_upload_timeline_metrics(videos_junction):
        if not videos_junction:
            return 0.0
        dates = []
        for v_junction in videos_junction:
            p_date = v_junction.video.publish_date
            if p_date:
                dates.append(datetime.datetime.strptime(p_date, "%Y-%m-%d").date())
        dates.sort()
        if len(dates) < 2:
            return 0.0
        gaps = [(dates[i] - dates[i-1]).days for i in range(1, len(dates))]
        return round(statistics.mean(gaps), 1)

    gap_1 = get_upload_timeline_metrics(pl1.videos)
    gap_2 = get_upload_timeline_metrics(pl2.videos)
    
    comparison_metrics = {
        "duration_ratio": round(pl1.total_duration_seconds / pl2.total_duration_seconds if pl2.total_duration_seconds > 0 else 1.0, 2),
        "duration_diff_seconds": pl1.total_duration_seconds - pl2.total_duration_seconds,
        "video_count_diff": pl1.video_count - pl2.video_count,
        "views_diff": pl1.total_views - pl2.total_views,
        "likes_diff": pl1.total_likes - pl2.total_likes,
        "comments_diff": pl1.total_comments - pl2.total_comments,
        "average_gap_days_1": gap_1,
        "average_gap_days_2": gap_2
    }
    
    return schemas.PlaylistComparisonResponse(
        playlist_1=pl1,
        playlist_2=pl2,
        comparison_metrics=comparison_metrics
    )

@router.get("/video/{video_id}/transcript", response_model=schemas.TranscriptResponse)
def get_video_transcript(video_id: str, title: str = "", db: Session = Depends(get_db)):
    """
    Fetches captions, word/character count metrics, caches, and returns.
    """
    cached_tr = db.query(models.Transcript).filter(models.Transcript.video_id == video_id).first()
    if cached_tr:
        return schemas.TranscriptResponse(
            video_id=cached_tr.video_id,
            raw_text=cached_tr.raw_text,
            word_count=cached_tr.word_count,
            character_count=cached_tr.character_count,
            speaking_duration_seconds=cached_tr.speaking_duration_seconds,
            segments=json.loads(cached_tr.segments or "[]")
        )
        
    # Fetch live
    tr_data = TranscriptService.get_transcript(video_id, title)
    
    db_tr = models.Transcript(
        video_id=video_id,
        raw_text=tr_data["raw_text"],
        word_count=tr_data["word_count"],
        character_count=tr_data["character_count"],
        speaking_duration_seconds=tr_data["speaking_duration_seconds"],
        segments=json.dumps(tr_data["segments"])
    )
    db.merge(db_tr)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error caching transcript: {str(e)}")
        
    return schemas.TranscriptResponse(
        video_id=video_id,
        raw_text=tr_data["raw_text"],
        word_count=tr_data["word_count"],
        character_count=tr_data["character_count"],
        speaking_duration_seconds=tr_data["speaking_duration_seconds"],
        segments=tr_data["segments"]
    )

@router.get("/video/{video_id}/replay-intensity")
def get_video_replay_intensity(video_id: str, db: Session = Depends(get_db)):
    """
    Generates and returns mock replay intensity peaks and smooth charts for the video.
    """
    # Find video duration
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    duration = video.duration_seconds if video else 600
    
    data = YouTubeService.get_most_replayed_data(video_id, duration)
    return data
