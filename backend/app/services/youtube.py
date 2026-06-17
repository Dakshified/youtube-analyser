import re
import datetime
import math
import statistics
from urllib.parse import urlparse, parse_qs
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from app.config import settings

# YouTube Categories Map
CATEGORIES = {
    "1": "Film & Animation", "2": "Autos & Vehicles", "10": "Music", "15": "Pets & Animals",
    "17": "Sports", "18": "Short Movies", "19": "Travel & Events", "20": "Gaming",
    "21": "Videoblogging", "22": "People & Blogs", "23": "Comedy", "24": "Entertainment",
    "25": "News & Politics", "26": "Howto & Style", "27": "Education", "28": "Science & Technology",
    "29": "Nonprofits & Activism", "30": "Movies", "31": "Anime/Animation", "32": "Action/Adventure",
    "33": "Classics", "34": "Comedy", "35": "Documentary", "36": "Drama", "37": "Family",
    "38": "Foreign", "39": "Horror", "40": "Sci-Fi/Fantasy", "41": "Thriller", "42": "Shorts",
    "43": "Shows", "44": "Trailers"
}

def extract_video_id(url: str) -> str:
    """
    Extracts the video ID from a YouTube video URL or returns it directly if it's already an ID.
    """
    url = url.strip()
    if not url:
        return ""
    
    # Check if looks like a video ID (typically 11 characters)
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url):
        return url
        
    if "youtube.com" in url or "youtu.be" in url:
        parsed = urlparse(url)
        if "youtu.be" in url:
            return parsed.path.lstrip('/')
        query = parse_qs(parsed.query)
        if 'v' in query:
            return query['v'][0]
        # Handle embeds / shorts URLs
        path_parts = parsed.path.split('/')
        for part in ["embed", "shorts", "v"]:
            if part in path_parts:
                idx = path_parts.index(part)
                if idx + 1 < len(path_parts):
                    return path_parts[idx + 1]
                    
    # Also support mock keys for testing
    if url.lower() in ["video_dsa", "video_web", "video_ai"]:
        return url.lower()

    raise ValueError("Invalid YouTube video URL or ID format.")

def extract_playlist_id(url: str) -> str:
    """
    Extracts the playlist ID from a YouTube playlist URL or returns it directly if it's already an ID.
    """
    url = url.strip()
    if not url:
        return ""
    
    if "youtube.com" in url or "youtu.be" in url:
        parsed = urlparse(url)
        query = parse_qs(parsed.query)
        if 'list' in query:
            return query['list'][0]
            
    # Check if looks like a playlist ID (typically starts with PL) or matches mock keys
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
    def fetch_video_data(video_url_or_id: str, custom_api_key: str = "") -> dict:
        """
        Fetches metadata and statistics for a single video.
        """
        try:
            video_id = extract_video_id(video_url_or_id)
        except ValueError as e:
            raise e
            
        api_key = custom_api_key or settings.YOUTUBE_API_KEY
        is_mock_request = video_id.lower() in ["video_dsa", "video_web", "video_ai"]
        
        if not api_key:
            if is_mock_request:
                mock_data = YouTubeService.generate_mock_video(video_id)
                mock_data["is_mock"] = True
                return mock_data
            else:
                raise ValueError("YouTube API Key is required to fetch real videos. Please configure it in settings.")
                
        try:
            youtube = build('youtube', 'v3', developerKey=api_key)
            v_request = youtube.videos().list(
                part="snippet,contentDetails,statistics",
                id=video_id
            )
            v_response = v_request.execute()
            
            if not v_response.get("items"):
                raise ValueError("YouTube video not found. Verify if it is public/unlisted.")
                
            item = v_response["items"][0]
            snippet = item["snippet"]
            details = item["contentDetails"]
            stats = item.get("statistics", {})
            
            # Parse stats
            views = int(stats.get("viewCount", 0))
            likes = int(stats.get("likeCount", 0))
            comments = int(stats.get("commentCount", 0))
            
            tags_list = snippet.get("tags", [])
            tags_json = ",".join(tags_list) if tags_list else ""
            
            category_id = snippet.get("categoryId", "")
            category_name = CATEGORIES.get(category_id, "Unknown")
            
            duration_str = details.get("duration", "PT0S")
            duration_seconds = parse_iso8601_duration(duration_str)
            
            video_data = {
                "id": video_id,
                "title": snippet.get("title", "Unknown Video"),
                "description": snippet.get("description", ""),
                "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url") or snippet.get("thumbnails", {}).get("default", {}).get("url"),
                "channel_title": snippet.get("channelTitle", "Unknown Creator"),
                "publish_date": snippet.get("publishedAt", "")[:10], # YYYY-MM-DD
                "duration_seconds": duration_seconds,
                "view_count": views,
                "like_count": likes,
                "comment_count": comments,
                "category": category_name,
                "tags": tags_json,
                "is_mock": False
            }
            return video_data
            
        except HttpError as e:
            if is_mock_request and e.resp.status in [400, 403]:
                mock_data = YouTubeService.generate_mock_video(video_id)
                mock_data["is_mock"] = True
                return mock_data
            raise ValueError(f"YouTube API Error (Status {e.resp.status}): {e.reason}")
        except Exception as e:
            if is_mock_request:
                mock_data = YouTubeService.generate_mock_video(video_id)
                mock_data["is_mock"] = True
                return mock_data
            raise ValueError(f"Error fetching video details: {str(e)}")

    @staticmethod
    def fetch_playlist_data(playlist_url_or_id: str, custom_api_key: str = "") -> dict:
        """
        Fetches playlist metadata and all associated videos.
        """
        try:
            playlist_id = extract_playlist_id(playlist_url_or_id)
        except ValueError as e:
            raise e
            
        api_key = custom_api_key or settings.YOUTUBE_API_KEY
        is_mock_request = playlist_id.lower() in ["dsa", "web", "ai"] or playlist_id.startswith("mock_")
        
        if not api_key:
            if is_mock_request:
                mock_data = YouTubeService.generate_mock_playlist(playlist_id)
                mock_data["is_mock"] = True
                return mock_data
            else:
                raise ValueError("YouTube API Key is required to fetch real playlists. Please configure it in settings.")
                
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
                raise ValueError("YouTube playlist not found. Check if it is public.")
                
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
            
            # 3. Fetch detailed statistics (views, likes, comments, category, tags & durations) for the videos in batches of 50
            if videos:
                video_details = {}
                for i in range(0, len(videos), 50):
                    batch_vids = videos[i:i+50]
                    batch_ids = ",".join([v["id"] for v in batch_vids])
                    
                    v_request = youtube.videos().list(
                        part="snippet,contentDetails,statistics",
                        id=batch_ids
                    )
                    v_response = v_request.execute()
                    
                    for v_item in v_response.get("items", []):
                        vid_id = v_item["id"]
                        v_snippet = v_item["snippet"]
                        duration_str = v_item["contentDetails"].get("duration", "PT0S")
                        seconds = parse_iso8601_duration(duration_str)
                        
                        stats = v_item.get("statistics", {})
                        views = int(stats.get("viewCount", 0))
                        likes = int(stats.get("likeCount", 0))
                        comments = int(stats.get("commentCount", 0))
                        
                        category_id = v_snippet.get("categoryId", "")
                        category_name = CATEGORIES.get(category_id, "Unknown")
                        
                        tags_list = v_snippet.get("tags", [])
                        tags_json = ",".join(tags_list) if tags_list else ""
                        
                        video_details[vid_id] = {
                            "duration_seconds": seconds,
                            "view_count": views,
                            "like_count": likes,
                            "comment_count": comments,
                            "category": category_name,
                            "tags": tags_json
                        }
                
                # Merge details back
                for video in videos:
                    details = video_details.get(video["id"], {
                        "duration_seconds": 0, "view_count": 0, "like_count": 0, "comment_count": 0, 
                        "category": "Unknown", "tags": ""
                    })
                    video.update(details)
            
            # Calculate Playlist aggregates
            playlist_data = YouTubeService.calculate_playlist_analytics(metadata, videos)
            playlist_data["is_mock"] = False
            return playlist_data
            
        except HttpError as e:
            if is_mock_request and e.resp.status in [400, 403]:
                mock_data = YouTubeService.generate_mock_playlist(playlist_id)
                mock_data["is_mock"] = True
                return mock_data
            raise ValueError(f"YouTube API Error (Status {e.resp.status}): {e.reason}")
        except Exception as e:
            if is_mock_request:
                mock_data = YouTubeService.generate_mock_playlist(playlist_id)
                mock_data["is_mock"] = True
                return mock_data
            raise ValueError(f"Error fetching playlist details: {str(e)}")

    @staticmethod
    def calculate_playlist_analytics(metadata: dict, videos: list) -> dict:
        """
        Analyzes video lists to compute durations, view counts, likes, comments, and averages.
        """
        if not videos:
            return {
                **metadata,
                "videos": [],
                "total_views": 0,
                "total_likes": 0,
                "total_comments": 0,
                "total_duration_seconds": 0,
                "average_duration_seconds": 0.0,
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
        total_likes = sum([v["like_count"] for v in videos])
        total_comments = sum([v["comment_count"] for v in videos])
        
        avg_duration = total_duration / len(videos)
        
        longest = max(videos, key=lambda x: x["duration_seconds"])
        shortest = min(videos, key=lambda x: x["duration_seconds"])
        
        return {
            **metadata,
            "videos": videos,
            "total_views": total_views,
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_duration_seconds": total_duration,
            "average_duration_seconds": round(avg_duration, 2),
            "longest_video_id": longest["id"],
            "longest_video_title": longest["title"],
            "longest_video_seconds": longest["duration_seconds"],
            "shortest_video_id": shortest["id"],
            "shortest_video_title": shortest["title"],
            "shortest_video_seconds": shortest["duration_seconds"],
        }

    @staticmethod
    def get_most_replayed_data(video_id: str, duration_seconds: int) -> dict:
        """
        Generates consistent mock replay intensity heatmap peaks for a video.
        Uses Random seeded with video_id so same video has same peaks.
        """
        import random
        # Seed with video_id hash
        rng = random.Random(video_id)
        
        # Decide number of peaks (3 to 6)
        num_peaks = rng.randint(3, 6)
        peaks = []
        for _ in range(num_peaks):
            pct = rng.uniform(0.05, 0.95)
            intensity = rng.randint(50, 100)
            
            # Convert pct to formatted timestamp
            secs = int(pct * duration_seconds)
            h = secs // 3600
            m = (secs % 3600) // 60
            s = secs % 60
            timestamp = f"{m:02d}:{s:02d}" if h == 0 else f"{h:02d}:{m:02d}:{s:02d}"
            
            peaks.append({
                "seconds": secs,
                "timestamp": timestamp,
                "intensity": intensity
            })
            
        # Sort by intensity descending for "Most Replayed" list
        peaks.sort(key=lambda x: x["intensity"], reverse=True)
        
        # Build 30 points for the intensity line chart
        chart_data = []
        # Build raw points
        raw_points = [(0.0, rng.randint(20, 50))]
        for p in peaks:
            pct = p["seconds"] / duration_seconds if duration_seconds > 0 else 0.5
            raw_points.append((max(0.0, pct - 0.05), rng.randint(10, 30)))
            raw_points.append((pct, p["intensity"]))
            raw_points.append((min(1.0, pct + 0.05), rng.randint(10, 30)))
        raw_points.append((1.0, rng.randint(10, 20)))
        raw_points.sort(key=lambda x: x[0])
        
        # Interpolate into 30 uniform steps for smooth chart plotting
        for i in range(30):
            target_pct = i / 29.0
            left = raw_points[0]
            right = raw_points[-1]
            for rp in raw_points:
                if rp[0] <= target_pct:
                    left = rp
                if rp[0] >= target_pct:
                    right = rp
                    break
            if right[0] == left[0]:
                val = left[1]
            else:
                ratio = (target_pct - left[0]) / (right[0] - left[0])
                val = int(left[1] + ratio * (right[1] - left[1]))
            
            secs = int(target_pct * duration_seconds)
            m = secs // 60
            s = secs % 60
            chart_data.append({
                "time": f"{m:02d}:{s:02d}",
                "intensity": val
            })
            
        return {
            "peaks": peaks[:3], # Top 3 most replayed
            "chart_data": chart_data
        }

    @staticmethod
    def generate_mock_video(video_id: str) -> dict:
        """
        Generates structured mock video details for testing.
        """
        now = datetime.datetime.utcnow()
        if "dsa" in video_id:
            title = "Big O Notation & Time Complexity Analysis"
            desc = "Learn how to analyze algorithms. This video covers time complexity, space complexity, and Big O analysis with arrays, lists, and grids."
            views, likes, comments = 245000, 18500, 1200
            category = "Education"
            duration = 1200 # 20 mins
            tags = "dsa,big o,complexity,algorithms,coding interview"
        elif "web" in video_id:
            title = "Next.js App Router Masterclass"
            desc = "Full guide to Next.js App Router, routing mechanisms, server and client components, layouts, and Vercel hosting integration."
            views, likes, comments = 135000, 9200, 480
            category = "Science & Technology"
            duration = 3650 # 1 hour
            tags = "next.js,react,web development,vercel,frontend"
        else:
            title = "Transformer Architecture: Self-Attention Mechanism"
            desc = "Deep dive into Transformers, self-attention calculations, matrix multiplications, PyTorch implementation, and LLM foundations."
            views, likes, comments = 189000, 14200, 890
            category = "Science & Technology"
            duration = 4500 # 1h 15m
            tags = "ai,deep learning,transformers,attention mechanism,pytorch,llm"

        return {
            "id": video_id,
            "title": title,
            "description": desc,
            "thumbnail_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
            "channel_title": "TubeIntel Tutorials",
            "publish_date": (now - datetime.timedelta(days=120)).strftime("%Y-%m-%d"),
            "duration_seconds": duration,
            "view_count": views,
            "like_count": likes,
            "comment_count": comments,
            "category": category,
            "tags": tags,
            "is_mock": True
        }

    @staticmethod
    def generate_mock_playlist(playlist_id: str) -> dict:
        """
        Generates structured mock playlist details.
        """
        is_dsa = "dsa" in playlist_id.lower()
        is_web = "web" in playlist_id.lower()
        
        now = datetime.date.today()
        
        if is_dsa:
            title = "Data Structures & Algorithms Course"
            desc = "Master complexity, dynamic programming, tree traversals, and graphs."
            channel = "AlgoTech Academy"
            vids_data = [
                ("Big O Notation & Time Complexity", 1200, 150240, 12000, 800, (now - datetime.timedelta(days=50)).strftime("%Y-%m-%d")),
                ("Arrays & Dynamic Arrays Implementation", 1850, 95200, 7500, 450, (now - datetime.timedelta(days=48)).strftime("%Y-%m-%d")),
                ("Stacks & Queues: Coding Interview Patterns", 1540, 72300, 6100, 310, (now - datetime.timedelta(days=44)).strftime("%Y-%m-%d")),
                ("Binary Trees & Tree Traversals (DFS, BFS)", 2850, 68000, 5800, 290, (now - datetime.timedelta(days=40)).strftime("%Y-%m-%d")),
                ("Graph Theory: Representations & DFS/BFS", 3600, 78200, 7200, 410, (now - datetime.timedelta(days=35)).strftime("%Y-%m-%d")),
                ("Dijkstra's Algorithm & Shortest Path", 2700, 89100, 8100, 500, (now - datetime.timedelta(days=28)).strftime("%Y-%m-%d")),
                ("Dynamic Programming: Grid Problems", 3800, 94200, 9300, 620, (now - datetime.timedelta(days=20)).strftime("%Y-%m-%d"))
            ]
        elif is_web:
            title = "Full Stack Web Development Bootcamp"
            desc = "Learn modern layout grids, JavaScript async, React state hooks, and Next.js routers."
            channel = "DevCraft Tutorials"
            vids_data = [
                ("Advanced CSS: Grid, Flexbox, and Tailwind", 1800, 152000, 9800, 520, (now - datetime.timedelta(days=60)).strftime("%Y-%m-%d")),
                ("Asynchronous JavaScript: Promises & Async/Await", 1920, 142000, 8400, 410, (now - datetime.timedelta(days=55)).strftime("%Y-%m-%d")),
                ("React Hooks: useState, useEffect, useContext", 2980, 167000, 11000, 680, (now - datetime.timedelta(days=48)).strftime("%Y-%m-%d")),
                ("Next.js App Router Architecture", 3650, 134000, 9100, 480, (now - datetime.timedelta(days=40)).strftime("%Y-%m-%d")),
                ("SQL Database Design with SQLite & PostgreSQL", 3200, 75000, 5100, 240, (now - datetime.timedelta(days=30)).strftime("%Y-%m-%d")),
                ("Deploying Next.js & FastAPI to Vercel/Render", 1800, 47000, 3200, 190, (now - datetime.timedelta(days=15)).strftime("%Y-%m-%d"))
            ]
        else:
            title = "Artificial Intelligence & Deep Learning Bootcamp"
            desc = "Comprehensive theoretical and practical guide into Deep Learning networks."
            channel = "Lexicon AI Labs"
            vids_data = [
                ("Python for Data Science (NumPy, Pandas)", 2400, 310000, 21000, 1400, (now - datetime.timedelta(days=70)).strftime("%Y-%m-%d")),
                ("Introduction to Neural Networks & Backprop", 3450, 168000, 12500, 910, (now - datetime.timedelta(days=62)).strftime("%Y-%m-%d")),
                ("PyTorch Basics: Tensors & Autograd", 1920, 94000, 7800, 410, (now - datetime.timedelta(days=54)).strftime("%Y-%m-%d")),
                ("Transformer Architecture: Self-Attention", 4500, 189000, 15300, 1100, (now - datetime.timedelta(days=45)).strftime("%Y-%m-%d")),
                ("Fine-Tuning LLMs with LoRA & QLoRA", 3800, 96000, 8100, 580, (now - datetime.timedelta(days=30)).strftime("%Y-%m-%d"))
            ]
            
        videos = []
        for i, (v_title, duration, views, likes, comments, p_date) in enumerate(vids_data):
            v_id = f"mock_vid_{playlist_id}_{abs(hash(v_title)) % 1000000000}"
            videos.append({
                "id": v_id,
                "title": v_title,
                "description": f"Tutorial overview for lesson on {v_title}.",
                "thumbnail_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
                "channel_title": channel,
                "publish_date": p_date,
                "duration_seconds": duration,
                "view_count": views,
                "like_count": likes,
                "comment_count": comments,
                "category": "Education" if is_dsa else "Science & Technology",
                "tags": "mock,analytics,youtube",
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
