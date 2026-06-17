import json
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.database import get_db
from app import models, schemas
from app.services.youtube import YouTubeService, extract_playlist_id
from app.services.transcript import TranscriptService
from app.services.ai import AIService

router = APIRouter()

@router.post("/playlist/analyse", response_model=schemas.PlaylistResponse)
def analyse_playlist(
    request: schemas.AnalysisRequest, 
    db: Session = Depends(get_db),
    x_youtube_key: Optional[str] = Header(None)
):
    """
    Validates URL, extracts playlist ID, fetches metadata & videos (or falls back to mocks),
    calculates metrics & insights, caches results, and returns the playlist.
    """
    try:
        playlist_id = extract_playlist_id(request.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # Check cache first
    cached_pl = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    
    # If cached as mock, but we now have a custom API key, delete it to fetch real data
    if cached_pl and cached_pl.is_mock and x_youtube_key and playlist_id.lower() not in ["dsa", "web", "ai"]:
        db.delete(cached_pl)
        # Delete plans and summaries associated with this playlist
        db.query(models.StudyPlan).filter(models.StudyPlan.playlist_id == playlist_id).delete()
        db.query(models.AISummary).filter(
            (models.AISummary.target_type == "playlist") & (models.AISummary.target_id == playlist_id)
        ).delete()
        db.commit()
        cached_pl = None
        
    if cached_pl:
        return cached_pl
        
    # Fetch from YouTube (or Mock)
    try:
        pl_data = YouTubeService.fetch_playlist_data(playlist_id, x_youtube_key or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # Generate Insights
    insights = AIService.calculate_playlist_insights(pl_data["title"], pl_data["videos"])
    
    # Save Playlist
    db_pl = models.Playlist(
        id=pl_data["id"],
        title=pl_data["title"],
        description=pl_data.get("description", ""),
        thumbnail_url=pl_data.get("thumbnail_url", ""),
        channel_title=pl_data.get("channel_title", ""),
        video_count=pl_data["video_count"],
        total_views=pl_data["total_views"],
        is_mock=pl_data.get("is_mock", False),
        total_duration_seconds=pl_data["total_duration_seconds"],
        average_duration_seconds=pl_data["average_duration_seconds"],
        median_duration_seconds=pl_data["median_duration_seconds"],
        longest_video_id=pl_data.get("longest_video_id"),
        longest_video_title=pl_data.get("longest_video_title"),
        longest_video_seconds=pl_data.get("longest_video_seconds", 0),
        shortest_video_id=pl_data.get("shortest_video_id"),
        shortest_video_title=pl_data.get("shortest_video_title"),
        shortest_video_seconds=pl_data.get("shortest_video_seconds", 0),
        
        learning_score=insights["learning_score"],
        difficulty=insights["difficulty"],
        skills=json.dumps(insights["skills"]),
        topics=json.dumps(insights["topics"]),
        learning_path=json.dumps(insights["learning_path"])
    )
    db.add(db_pl)
    
    # Save Videos
    for v in pl_data["videos"]:
        db_vid = models.Video(
            id=v["id"],
            playlist_id=pl_data["id"],
            title=v["title"],
            description=v.get("description", ""),
            thumbnail_url=v.get("thumbnail_url", ""),
            duration_seconds=v["duration_seconds"],
            view_count=v["view_count"],
            publish_date=v.get("publish_date", ""),
            position=v["position"]
        )
        db.add(db_vid)
        
    try:
        db.commit()
        db.refresh(db_pl)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database caching failed: {str(e)}")
        
    return db_pl

@router.get("/playlist/{playlist_id}", response_model=schemas.PlaylistResponse)
def get_playlist(playlist_id: str, db: Session = Depends(get_db)):
    """
    Retrieves a previously cached playlist.
    """
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found. Please run analysis first.")
    return playlist

@router.get("/video/{video_id}/transcript", response_model=schemas.TranscriptResponse)
def get_video_transcript(video_id: str, title: str = "", db: Session = Depends(get_db)):
    """
    Fetches transcripts, processes word counts/keywords, and caches results.
    """
    cached_tr = db.query(models.Transcript).filter(models.Transcript.video_id == video_id).first()
    if cached_tr:
        # Re-parse JSON string column
        return schemas.TranscriptResponse(
            video_id=cached_tr.video_id,
            raw_text=cached_tr.raw_text,
            word_count=cached_tr.word_count,
            speaking_duration_seconds=cached_tr.speaking_duration_seconds,
            keywords=json.loads(cached_tr.keywords or "[]"),
            topics=json.loads(cached_tr.topics or "[]"),
            segments=json.loads(cached_tr.segments or "[]")
        )
        
    # Fetch transcript
    tr_data = TranscriptService.get_transcript(video_id, title)
    
    db_tr = models.Transcript(
        video_id=video_id,
        raw_text=tr_data["raw_text"],
        word_count=tr_data["word_count"],
        speaking_duration_seconds=tr_data["speaking_duration_seconds"],
        keywords=json.dumps(tr_data["keywords"]),
        topics=json.dumps(tr_data["topics"]),
        segments=json.dumps(tr_data["segments"])
    )
    db.add(db_tr)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error caching transcript: {str(e)}")
        
    return schemas.TranscriptResponse(
        video_id=video_id,
        raw_text=tr_data["raw_text"],
        word_count=tr_data["word_count"],
        speaking_duration_seconds=tr_data["speaking_duration_seconds"],
        keywords=tr_data["keywords"],
        topics=tr_data["topics"],
        segments=tr_data["segments"]
    )

@router.get("/video/{video_id}/summary", response_model=schemas.AISummaryResponse)
def get_video_summary(video_id: str, title: str = "", db: Session = Depends(get_db)):
    """
    Returns AI summarized key concepts, important points, and takeaways.
    """
    # Check cache
    cached_sum = db.query(models.AISummary).filter(
        models.AISummary.target_type == "video",
        models.AISummary.target_id == video_id
    ).first()
    
    if cached_sum:
        return schemas.AISummaryResponse(
            target_type="video",
            target_id=video_id,
            summary=json.loads(cached_sum.summary_json)
        )
        
    # Get transcript
    transcript = db.query(models.Transcript).filter(models.Transcript.video_id == video_id).first()
    raw_text = transcript.raw_text if transcript else ""
    
    # Generate summary
    sum_data = AIService.generate_video_summary(video_id, title, raw_text)
    
    db_sum = models.AISummary(
        target_type="video",
        target_id=video_id,
        summary_json=json.dumps(sum_data)
    )
    db.add(db_sum)
    db.commit()
    
    return schemas.AISummaryResponse(
        target_type="video",
        target_id=video_id,
        summary=sum_data
    )

@router.get("/playlist/{playlist_id}/summary", response_model=schemas.AISummaryResponse)
def get_playlist_summary(playlist_id: str, db: Session = Depends(get_db)):
    """
    Returns high-level course summary: learning objectives, topics covered, and skills taught.
    """
    cached_sum = db.query(models.AISummary).filter(
        models.AISummary.target_type == "playlist",
        models.AISummary.target_id == playlist_id
    ).first()
    
    if cached_sum:
        return schemas.AISummaryResponse(
            target_type="playlist",
            target_id=playlist_id,
            summary=json.loads(cached_sum.summary_json)
        )
        
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")
        
    vids = [{"title": v.title, "duration_seconds": v.duration_seconds, "position": v.position} for v in playlist.videos]
    sum_data = AIService.generate_playlist_summary(playlist.title, vids)
    
    db_sum = models.AISummary(
        target_type="playlist",
        target_id=playlist_id,
        summary_json=json.dumps(sum_data)
    )
    db.add(db_sum)
    db.commit()
    
    return schemas.AISummaryResponse(
        target_type="playlist",
        target_id=playlist_id,
        summary=sum_data
    )

@router.get("/video/{video_id}/notes", response_model=schemas.AISummaryResponse)
def get_video_revision_notes(video_id: str, title: str = "", db: Session = Depends(get_db)):
    """
    Generates study notes, definitions glossary, and revision sheets.
    """
    cached_notes = db.query(models.AISummary).filter(
        models.AISummary.target_type == "notes",
        models.AISummary.target_id == video_id
    ).first()
    
    if cached_notes:
        return schemas.AISummaryResponse(
            target_type="notes",
            target_id=video_id,
            summary=json.loads(cached_notes.summary_json)
        )
        
    transcript = db.query(models.Transcript).filter(models.Transcript.video_id == video_id).first()
    raw_text = transcript.raw_text if transcript else ""
    
    notes_data = AIService.generate_revision_notes(title, raw_text)
    
    db_notes = models.AISummary(
        target_type="notes",
        target_id=video_id,
        summary_json=json.dumps(notes_data)
    )
    db.add(db_notes)
    db.commit()
    
    return schemas.AISummaryResponse(
        target_type="notes",
        target_id=video_id,
        summary=notes_data
    )

@router.post("/playlist/{playlist_id}/plan", response_model=schemas.StudyPlanResponse)
def get_study_plan(playlist_id: str, request: schemas.StudyPlanRequest, db: Session = Depends(get_db)):
    """
    Computes a customizable day-by-day learning schedule based on targeted study speed.
    """
    cached_plan = db.query(models.StudyPlan).filter(
        models.StudyPlan.playlist_id == playlist_id,
        models.StudyPlan.daily_time_minutes == request.daily_time_minutes
    ).first()
    
    if cached_plan:
        return schemas.StudyPlanResponse(
            playlist_id=playlist_id,
            daily_time_minutes=request.daily_time_minutes,
            schedule=json.loads(cached_plan.plan_json)
        )
        
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    videos = [
        {"id": v.id, "title": v.title, "duration_seconds": v.duration_seconds, "position": v.position} 
        for v in sorted(playlist.videos, key=lambda x: x.position)
    ]
    
    plan_data = AIService.generate_study_plan(playlist.title, videos, request.daily_time_minutes)
    
    db_plan = models.StudyPlan(
        playlist_id=playlist_id,
        daily_time_minutes=request.daily_time_minutes,
        plan_json=json.dumps(plan_data["schedule"])
    )
    db.add(db_plan)
    db.commit()
    
    return schemas.StudyPlanResponse(
        playlist_id=playlist_id,
        daily_time_minutes=request.daily_time_minutes,
        schedule=plan_data["schedule"]
    )

@router.post("/playlist/compare", response_model=schemas.ComparisonResponse)
def compare_playlists(request: schemas.CompareRequest, db: Session = Depends(get_db)):
    """
    Compares two playlists side by side across metrics, durations, and content densities.
    """
    pl_1 = db.query(models.Playlist).filter(models.Playlist.id == request.playlist_id_1).first()
    pl_2 = db.query(models.Playlist).filter(models.Playlist.id == request.playlist_id_2).first()
    
    if not pl_1 or not pl_2:
        raise HTTPException(status_code=404, detail="One or both playlists were not found. Please analyze them first.")
        
    # Calculate comparative statistics
    p1_dur_hrs = pl_1.total_duration_seconds / 3600
    p2_dur_hrs = pl_2.total_duration_seconds / 3600
    
    p1_topics = set(json.loads(pl_1.topics or "[]"))
    p2_topics = set(json.loads(pl_2.topics or "[]"))
    overlap_topics = p1_topics.intersection(p2_topics)
    
    comparison_metrics = {
        "duration_ratio": round(p1_dur_hrs / p2_dur_hrs if p2_dur_hrs > 0 else 1.0, 2),
        "video_count_diff": pl_1.video_count - pl_2.video_count,
        "shared_topics": list(overlap_topics),
        "shared_topics_count": len(overlap_topics),
        "p1_has_more_depth": p1_dur_hrs > p2_dur_hrs,
        "difficulty_comparison": {
            "p1": pl_1.difficulty,
            "p2": pl_2.difficulty,
            "same": pl_1.difficulty == pl_2.difficulty
        },
        "learning_score_diff": pl_1.learning_score - pl_2.learning_score
    }
    
    return schemas.ComparisonResponse(
        playlist_1=pl_1,
        playlist_2=pl_2,
        comparison_metrics=comparison_metrics
    )
