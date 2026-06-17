import re
import math
import statistics
from urllib.parse import urlparse, parse_qs
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from app.config import settings

def extract_playlist_id(url: str) -> str:
    """
    Extracts the playlist ID from a YouTube playlist URL or returns it directly if it's already an ID.
    """
    url = url.strip()
    if not url:
        return ""
    
    # Try parsing as URL
    if "youtube.com" in url or "youtu.be" in url:
        parsed = urlparse(url)
        query = parse_qs(parsed.query)
        if 'list' in query:
            return query['list'][0]
    
    # Check if looks like a playlist ID or is a demo mock ID
    if re.match(r'^[a-zA-Z0-9_-]{18,}$', url) or url.lower() in ["dsa", "web", "ai"] or url.startswith("mock_"):
        return url
        
    raise ValueError("Invalid YouTube playlist URL or ID format.")

def parse_iso8601_duration(duration_str: str) -> int:
    """
    Parses an ISO 8601 duration string (e.g., PT1H2M10S) into seconds.
    """
    if not duration_str:
        return 0
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.match(duration_str)
    if not match:
        return 0
    hours = int(match.group(1)) if match.group(1) else 0
    minutes = int(match.group(2)) if match.group(2) else 0
    seconds = int(match.group(3)) if match.group(3) else 0
    return hours * 3600 + minutes * 60 + seconds

class YouTubeService:
    @staticmethod
    def fetch_playlist_data(playlist_url_or_id: str, custom_api_key: str = "") -> dict:
        """
        Fetches playlist metadata and all associated videos.
        If no API Key is configured, returns high-quality mock data for testing.
        """
        try:
            playlist_id = extract_playlist_id(playlist_url_or_id)
        except ValueError as e:
            raise e
            
        api_key = custom_api_key or settings.YOUTUBE_API_KEY
        if not api_key:
            is_mock_request = playlist_id.lower() in ["dsa", "web", "ai"] or playlist_id.startswith("mock_")
            if is_mock_request:
                mock_data = YouTubeService.generate_mock_playlist(playlist_id)
                mock_data["is_mock"] = True
                return mock_data
            else:
                raise ValueError("YouTube API Key is required to fetch real playlists. Please configure it in the header settings panel.")
            
        try:
            youtube = build('youtube', 'v3', developerKey=api_key)
            
            # 1. Fetch Playlist Metadata
            pl_request = youtube.playlists().list(
                part="snippet,contentDetails",
                id=playlist_id,
                maxResults=1
            )
            pl_response = pl_request.execute()
            
            if not pl_response.get("items"):
                raise ValueError("YouTube playlist not found. Check if it is public/unlisted.")
                
            pl_item = pl_response["items"][0]
            snippet = pl_item["snippet"]
            
            metadata = {
                "id": playlist_id,
                "title": snippet.get("title", "Unknown Playlist"),
                "description": snippet.get("description", ""),
                "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url") or snippet.get("thumbnails", {}).get("default", {}).get("url"),
                "channel_title": snippet.get("channelTitle", "Unknown Creator"),
                "video_count": int(pl_item["contentDetails"].get("itemCount", 0))
            }
            
            # 2. Fetch all playlist items (videos)
            videos = []
            next_page_token = None
            
            while True:
                items_request = youtube.playlistItems().list(
                    part="snippet,contentDetails",
                    playlistId=playlist_id,
                    maxResults=50,
                    pageToken=next_page_token
                )
                items_response = items_request.execute()
                
                for item in items_response.get("items", []):
                    vid_snippet = item["snippet"]
                    video_id = vid_snippet.get("resourceId", {}).get("videoId")
                    if not video_id:
                        continue
                        
                    videos.append({
                        "id": video_id,
                        "title": vid_snippet.get("title", "Deleted Video"),
                        "description": vid_snippet.get("description", ""),
                        "thumbnail_url": vid_snippet.get("thumbnails", {}).get("high", {}).get("url") or vid_snippet.get("thumbnails", {}).get("default", {}).get("url"),
                        "position": int(vid_snippet.get("position", 0)),
                        "publish_date": vid_snippet.get("publishedAt", "")[:10] # YYYY-MM-DD
                    })
                    
                next_page_token = items_response.get("nextPageToken")
                if not next_page_token:
                    break
            
            # 3. Fetch detailed statistics (views & durations) for the videos in batches of 50
            if videos:
                video_details = {}
                # Batch requests
                for i in range(0, len(videos), 50):
                    batch_vids = videos[i:i+50]
                    batch_ids = ",".join([v["id"] for v in batch_vids])
                    
                    v_request = youtube.videos().list(
                        part="contentDetails,statistics",
                        id=batch_ids
                    )
                    v_response = v_request.execute()
                    
                    for v_item in v_response.get("items", []):
                        vid_id = v_item["id"]
                        duration_str = v_item["contentDetails"].get("duration", "PT0S")
                        seconds = parse_iso8601_duration(duration_str)
                        
                        stats = v_item.get("statistics", {})
                        views = int(stats.get("viewCount", 0))
                        
                        video_details[vid_id] = {
                            "duration_seconds": seconds,
                            "view_count": views
                        }
                
                # Merge details back
                for video in videos:
                    details = video_details.get(video["id"], {"duration_seconds": 0, "view_count": 0})
                    video.update(details)
            
            # Calculate Playlist aggregates
            playlist_data = YouTubeService.calculate_playlist_analytics(metadata, videos)
            playlist_data["is_mock"] = False
            return playlist_data
            
        except HttpError as e:
            is_mock_request = playlist_id.lower() in ["dsa", "web", "ai"] or playlist_id.startswith("mock_")
            if is_mock_request and e.resp.status in [400, 403]:
                print(f"YouTube API Key failure (Status {e.resp.status}) for mock request. Returning mock data...")
                mock_data = YouTubeService.generate_mock_playlist(playlist_id)
                mock_data["is_mock"] = True
                return mock_data
            raise ValueError(f"YouTube API Error (Status {e.resp.status}): {e.reason}")
        except Exception as e:
            is_mock_request = playlist_id.lower() in ["dsa", "web", "ai"] or playlist_id.startswith("mock_")
            if is_mock_request:
                print(f"Error fetching mock playlist: {str(e)}. Returning mock data...")
                mock_data = YouTubeService.generate_mock_playlist(playlist_id)
                mock_data["is_mock"] = True
                return mock_data
            raise ValueError(f"Error fetching playlist from YouTube: {str(e)}")

    @staticmethod
    def calculate_playlist_analytics(metadata: dict, videos: list) -> dict:
        """
        Analyzes video lists to compute durations, averages, medians, and find extreme videos.
        """
        if not videos:
            return {
                **metadata,
                "videos": [],
                "total_views": 0,
                "total_duration_seconds": 0,
                "average_duration_seconds": 0.0,
                "median_duration_seconds": 0.0,
                "longest_video_id": "",
                "longest_video_title": "",
                "longest_video_seconds": 0,
                "shortest_video_id": "",
                "shortest_video_title": "",
                "shortest_video_seconds": 0,
            }
            
        durations = [v["duration_seconds"] for v in videos]
        total_duration = sum(durations)
        total_views = sum([v["view_count"] for v in videos])
        
        avg_duration = total_duration / len(videos)
        med_duration = statistics.median(durations) if durations else 0.0
        
        longest = max(videos, key=lambda x: x["duration_seconds"])
        shortest = min(videos, key=lambda x: x["duration_seconds"])
        
        return {
            **metadata,
            "videos": videos,
            "total_views": total_views,
            "total_duration_seconds": total_duration,
            "average_duration_seconds": round(avg_duration, 2),
            "median_duration_seconds": round(med_duration, 2),
            "longest_video_id": longest["id"],
            "longest_video_title": longest["title"],
            "longest_video_seconds": longest["duration_seconds"],
            "shortest_video_id": shortest["id"],
            "shortest_video_title": shortest["title"],
            "shortest_video_seconds": shortest["duration_seconds"],
        }

    @staticmethod
    def generate_mock_playlist(playlist_id: str) -> dict:
        """
        Generates realistic high-fidelity mock data for demonstration.
        Recognizes standard demo topics to align title and course content.
        """
        is_dsa = "dsa" in playlist_id.lower() or "algo" in playlist_id.lower()
        is_web = "web" in playlist_id.lower() or "js" in playlist_id.lower() or "react" in playlist_id.lower()
        
        if is_dsa:
            title = "Data Structures & Algorithms Masterclass"
            desc = "Comprehensive curriculum covering arrays, trees, graphs, sorting, and dynamic programming."
            channel = "AlgoTech Academy"
            vids_data = [
                ("Big O Notation & Time Complexity", 1200, 150240, "2026-01-15"),
                ("Arrays & Dynamic Arrays Implementation", 1850, 95200, "2026-01-18"),
                ("Singly and Doubly Linked Lists", 2400, 84000, "2026-01-22"),
                ("Stacks & Queues: Coding Interview Patterns", 1540, 72300, "2026-01-25"),
                ("Recursion & Backtracking Demystified", 3120, 110400, "2026-02-01"),
                ("Binary Trees & Tree Traversals (DFS, BFS)", 2850, 68000, "2026-02-05"),
                ("Binary Search Trees (BST) Operations", 1920, 52100, "2026-02-10"),
                ("Heaps and Priority Queues", 2250, 48900, "2026-02-15"),
                ("Hash Tables & Collision Resolution", 1680, 55400, "2026-02-20"),
                ("Graph Theory: Representations & DFS/BFS", 3600, 78200, "2026-02-28"),
                ("Dijkstra's Algorithm & Shortest Path", 2700, 89100, "2026-03-05"),
                ("Dynamic Programming: 1D Memoization vs Tabulation", 4200, 125000, "2026-03-12"),
                ("Dynamic Programming: 2D Grid Problems", 3800, 94200, "2026-03-20"),
                ("Greedy Algorithms vs Dynamic Programming", 2100, 46700, "2026-03-25"),
            ]
        elif is_web:
            title = "Full Stack Web Development Bootcamp"
            desc = "From HTML/CSS basics to advanced React, Next.js, FastAPI, SQL database integrations, and deployment."
            channel = "DevCraft Tutorials"
            vids_data = [
                ("Introduction to Modern Web Architecture", 950, 245000, "2026-02-10"),
                ("Advanced CSS: Grid, Flexbox, and Tailwind", 1800, 152000, "2026-02-12"),
                ("JavaScript ES6+ Core Concepts", 2750, 189000, "2026-02-15"),
                ("Asynchronous JavaScript: Promises & Async/Await", 1920, 142000, "2026-02-18"),
                ("DOM Manipulation and Event Handlers", 1440, 98000, "2026-02-22"),
                ("React JS Fundamentals: Props & State", 3100, 220000, "2026-03-01"),
                ("React Hooks: useState, useEffect, useContext", 2980, 167000, "2026-03-05"),
                ("Next.js App Router Architecture", 3650, 134000, "2026-03-10"),
                ("FastAPI Backend Setup & API Design", 2400, 88000, "2026-03-15"),
                ("SQL Database Design with SQLite & PostgreSQL", 3200, 75000, "2026-03-20"),
                ("Authentication: JWT, CORS, and Secure Cookies", 2890, 62000, "2026-03-25"),
                ("Deploying Next.js & FastAPI to Vercel/Render", 1800, 47000, "2026-03-28"),
            ]
        else:
            title = "Artificial Intelligence & Deep Learning Bootcamp"
            desc = "Learn linear algebra, Python data tools, neural networks, PyTorch, and LLM fine-tuning techniques."
            channel = "Lexicon AI Labs"
            vids_data = [
                ("Python for Data Science (NumPy, Pandas, Matplotlib)", 2400, 310000, "2026-01-05"),
                ("Linear Algebra & Calculus for ML", 3600, 145000, "2026-01-10"),
                ("Linear and Logistic Regression from Scratch", 2800, 120000, "2026-01-15"),
                ("Introduction to Neural Networks & Backpropagation", 3450, 168000, "2026-01-20"),
                ("PyTorch Basics: Tensors & Autograd", 1920, 94000, "2026-01-25"),
                ("Building a Convolutional Neural Network (CNN)", 3100, 83000, "2026-02-01"),
                ("Recurrent Neural Networks (RNN) & LSTM Explained", 2600, 72000, "2026-02-07"),
                ("Transformer Architecture: Self-Attention Mechanism", 4500, 189000, "2026-02-15"),
                ("Large Language Models (LLMs) & Tokenization", 2900, 112000, "2026-02-22"),
                ("Fine-Tuning LLMs with LoRA & QLoRA", 3800, 96000, "2026-03-01"),
                ("Retrieval-Augmented Generation (RAG) Architecture", 3250, 105000, "2026-03-08"),
            ]
            
        videos = []
        for i, (v_title, duration, views, p_date) in enumerate(vids_data):
            # Generate a consistent fake video ID based on playlist ID and hash of title
            v_id = f"mock_vid_{playlist_id}_{abs(hash(v_title)) % 1000000000}"
            videos.append({
                "id": v_id,
                "title": v_title,
                "description": f"Detailed video tutorial about {v_title} by the channel presenter. Download resources in descriptions.",
                "thumbnail_url": f"https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
                "duration_seconds": duration,
                "view_count": views,
                "publish_date": p_date,
                "position": i
            })
            
        metadata = {
            "id": playlist_id,
            "title": title,
            "description": desc,
            "thumbnail_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
            "channel_title": channel,
            "video_count": len(videos)
        }
        
        return YouTubeService.calculate_playlist_analytics(metadata, videos)
