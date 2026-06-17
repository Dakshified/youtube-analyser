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

# Helper function to analyze a single video
def get_or_create_video(video_url: str, db: Session, x_youtube_key: Optional[str] = None) -> models.Video:
    try:
        video_id = extract_video_id(video_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    cached_v = db.query(models.Video).filter(models.Video.id == video_id).first()
    
    if cached_v and cached_v.is_mock and x_youtube_key and video_id.lower() not in ["video_dsa", "video_web", "video_ai"]:
        db.delete(cached_v)
        db.query(models.Transcript).filter(models.Transcript.video_id == video_id).delete()
        db.commit()
        cached_v = None
        
    if cached_v:
        return cached_v
        
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
        share_count=v_data["share_count"],
        category=v_data.get("category", ""),
        tags=v_data.get("tags", ""),
        is_mock=v_data.get("is_mock", False)
    )
    
    db_vid = db.merge(db_vid)
    try:
        db.commit()
        db.refresh(db_vid)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database caching failed: {str(e)}")
        
    return db_vid

# Helper function to analyze a single playlist
def get_or_create_playlist(playlist_url: str, db: Session, x_youtube_key: Optional[str] = None) -> models.Playlist:
    try:
        playlist_id = extract_playlist_id(playlist_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    cached_pl = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    
    if cached_pl and cached_pl.is_mock and x_youtube_key and playlist_id.lower() not in ["dsa", "web", "ai"]:
        db.delete(cached_pl)
        db.commit()
        cached_pl = None
        
    if cached_pl:
        # Load associated videos sorted by position
        sorted_videos = sorted(cached_pl.videos, key=lambda x: x.position)
        return cached_pl
        
    try:
        pl_data = YouTubeService.fetch_playlist_data(playlist_id, x_youtube_key or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
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
        total_shares=pl_data["total_shares"],
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
    
    for v in pl_data["videos"]:
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
            share_count=v["share_count"],
            category=v.get("category", ""),
            tags=v.get("tags", ""),
            is_mock=pl_data.get("is_mock", False)
        )
        db.merge(db_vid)
        
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

@router.post("/video/analyse", response_model=schemas.VideoMultiResponse)
def analyse_videos(
    request: schemas.MultiAnalysisRequest,
    db: Session = Depends(get_db),
    x_youtube_key: Optional[str] = Header(None)
):
    """
    Parses up to 4 video URLs, retrieves metadata, caches, and returns comparison metrics if multiple links exist.
    """
    if not request.urls:
        raise HTTPException(status_code=400, detail="At least one URL is required.")
        
    urls = request.urls[:4] # Enforce limit of 4
    videos = []
    
    for u in urls:
        v = get_or_create_video(u, db, x_youtube_key)
        videos.append(v)
        
    comparison_metrics = None
    if len(videos) > 1:
        # Calculate comparison matrices
        views_per_day = []
        like_view_ratios = []
        for v in videos:
            v_age_days = max(1, (datetime.date.today() - datetime.datetime.strptime(v.publish_date, "%Y-%m-%d").date()).days)
            views_per_day.append(round(v.view_count / v_age_days, 1))
            like_view_ratios.append(round((v.like_count / v.view_count) * 100, 2) if v.view_count > 0 else 0.0)
            
        comparison_metrics = {
            "views_per_day": views_per_day,
            "like_view_ratios": like_view_ratios,
            "highest_views_idx": videos.index(max(videos, key=lambda x: x.view_count)),
            "highest_likes_idx": videos.index(max(videos, key=lambda x: x.like_count)),
            "highest_comments_idx": videos.index(max(videos, key=lambda x: x.comment_count)),
            "highest_shares_idx": videos.index(max(videos, key=lambda x: x.share_count)),
            "highest_duration_idx": videos.index(max(videos, key=lambda x: x.duration_seconds)),
        }
        
    return schemas.VideoMultiResponse(
        videos=videos,
        comparison_metrics=comparison_metrics
    )

@router.post("/playlist/analyse", response_model=schemas.PlaylistMultiResponse)
def analyse_playlists(
    request: schemas.MultiAnalysisRequest,
    db: Session = Depends(get_db),
    x_youtube_key: Optional[str] = Header(None)
):
    """
    Parses up to 4 playlist URLs, retrieves metadata, caches, and returns aggregates comparison.
    """
    if not request.urls:
        raise HTTPException(status_code=400, detail="At least one URL is required.")
        
    urls = request.urls[:4] # Enforce limit of 4
    playlists = []
    
    for u in urls:
        pl = get_or_create_playlist(u, db, x_youtube_key)
        playlists.append(pl)
        
    comparison_metrics = None
    if len(playlists) > 1:
        gaps = []
        for pl in playlists:
            dates = []
            for v_junction in pl.videos:
                p_date = v_junction.video.publish_date
                if p_date:
                    dates.append(datetime.datetime.strptime(p_date, "%Y-%m-%d").date())
            dates.sort()
            if len(dates) >= 2:
                pl_gaps = [(dates[i] - dates[i-1]).days for i in range(1, len(dates))]
                gaps.append(round(statistics.mean(pl_gaps), 1))
            else:
                gaps.append(0.0)
                
        comparison_metrics = {
            "average_gaps": gaps,
            "highest_videos_idx": playlists.index(max(playlists, key=lambda x: x.video_count)),
            "highest_views_idx": playlists.index(max(playlists, key=lambda x: x.total_views)),
            "highest_likes_idx": playlists.index(max(playlists, key=lambda x: x.total_likes)),
            "highest_comments_idx": playlists.index(max(playlists, key=lambda x: x.total_comments)),
            "highest_shares_idx": playlists.index(max(playlists, key=lambda x: x.total_shares)),
            "highest_duration_idx": playlists.index(max(playlists, key=lambda x: x.total_duration_seconds)),
        }
        
    return schemas.PlaylistMultiResponse(
        playlists=playlists,
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
        
    tr_data = TranscriptService.get_transcript(video_id, title)
    
    db_tr = models.Transcript(
        video_id=video_id,
        raw_text=tr_data["raw_text"],
        word_count=tr_data["word_count"],
        character_count=tr_data["character_count"],
        speaking_duration_seconds=tr_data["speaking_duration_seconds"],
        segments=json.dumps(tr_data["segments"])
    )
    db_tr = db.merge(db_tr)
    
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
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    duration = video.duration_seconds if video else 600
    
    data = YouTubeService.get_most_replayed_data(video_id, duration)
    return data
