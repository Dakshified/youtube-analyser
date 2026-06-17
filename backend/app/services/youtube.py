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

def extract_channel_id_or_handle(url: str) -> str:
    """
    Extracts channel ID, handle (@username), or returns it directly if it's already an ID or handle.
    """
    url = url.strip()
    if not url:
        return ""
        
    # Check if handle format
    if url.startswith("@"):
        return url
        
    # Check if UC... channel ID format (24 characters, starting with UC)
    if re.match(r'^UC[a-zA-Z0-9_-]{22}$', url):
        return url
        
    if "youtube.com" in url or "youtu.be" in url:
        parsed = urlparse(url)
        path = parsed.path.rstrip('/')
        
        # Check if path starts with /@
        if "/@" in path:
            parts = path.split('/@')
            if len(parts) > 1:
                return "@" + parts[1].split('/')[0]
                
        # Check if it has /channel/UC...
        if "/channel/" in path:
            parts = path.split('/channel/')
            if len(parts) > 1:
                return parts[1].split('/')[0]
                
        # Check if /c/name or /user/name
        for prefix in ["/c/", "/user/"]:
            if prefix in path:
                parts = path.split(prefix)
                if len(parts) > 1:
                    val = parts[1].split('/')[0]
                    return "@" + val
                    
        # Otherwise if the path is just /@username
        parts = path.split('/')
        for part in parts:
            if part.startswith("@"):
                return part

    # Also support mock handles
    if url.lower() in ["@dsa", "@web", "@ai", "channel_dsa", "channel_web", "channel_ai"]:
        val = url.lower()
        if not val.startswith("@") and val.startswith("channel_"):
            return "@" + val.split("channel_")[1]
        return val

    # If it is a alphanumeric string, assume handle if short or ID if UC
    if url.isalnum():
        return "@" + url
        
    raise ValueError("Invalid YouTube channel URL, handle, or ID format.")

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
                raise ValueError("YouTube video not found. Verify if it is public.")
                
            item = v_response["items"][0]
            snippet = item["snippet"]
            details = item["contentDetails"]
            stats = item.get("statistics", {})
            
            # Parse stats
            views = int(stats.get("viewCount", 0))
            likes = int(stats.get("likeCount", 0))
            comments = int(stats.get("commentCount", 0))
            shares = int(views * 0.005) # Generate shares proportionally (0.5% of views)
            
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
                "share_count": shares,
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
                        shares = int(views * 0.005) # Proportional shares
                        
                        category_id = v_snippet.get("categoryId", "")
                        category_name = CATEGORIES.get(category_id, "Unknown")
                        
                        tags_list = v_snippet.get("tags", [])
                        tags_json = ",".join(tags_list) if tags_list else ""
                        
                        video_details[vid_id] = {
                            "duration_seconds": seconds,
                            "view_count": views,
                            "like_count": likes,
                            "comment_count": comments,
                            "share_count": shares,
                            "category": category_name,
                            "tags": tags_json
                        }
                
                # Merge details back
                for video in videos:
                    details = video_details.get(video["id"], {
                        "duration_seconds": 0, "view_count": 0, "like_count": 0, "comment_count": 0, 
                        "share_count": 0, "category": "Unknown", "tags": ""
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
                "total_shares": 0,
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
        total_shares = sum([v["share_count"] for v in videos])
        
        avg_duration = total_duration / len(videos)
        
        longest = max(videos, key=lambda x: x["duration_seconds"])
        shortest = min(videos, key=lambda x: x["duration_seconds"])
        
        return {
            **metadata,
            "videos": videos,
            "total_views": total_views,
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_shares": total_shares,
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

        shares = int(views * 0.005)

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
            "share_count": shares,
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
            shares = int(views * 0.005)
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
                "share_count": shares,
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

    @staticmethod
    def fetch_channel_data(channel_url_or_id: str, custom_api_key: str = "") -> dict:
        """
        Fetches channel metadata, subscriber count, views, uploads list,
        recent video statistics (up to 100 recent uploads), and computes derived averages.
        """
        try:
            channel_id = extract_channel_id_or_handle(channel_url_or_id)
        except ValueError as e:
            raise e
            
        api_key = custom_api_key or settings.YOUTUBE_API_KEY
        is_mock_request = channel_id.lower() in ["@dsa", "@web", "@ai", "channel_dsa", "channel_web", "channel_ai"]
        
        if not api_key:
            if is_mock_request:
                mock_data = YouTubeService.generate_mock_channel(channel_id)
                mock_data["is_mock"] = True
                return mock_data
            else:
                raise ValueError("YouTube API Key is required to fetch real channels. Please configure it in settings.")
                
        try:
            youtube = build('youtube', 'v3', developerKey=api_key)
            
            # Fetch channel details
            if channel_id.startswith("@"):
                ch_request = youtube.channels().list(
                    part="snippet,contentDetails,statistics,brandingSettings",
                    forHandle=channel_id
                )
            else:
                ch_request = youtube.channels().list(
                    part="snippet,contentDetails,statistics,brandingSettings",
                    id=channel_id
                )
            ch_response = ch_request.execute()
            
            if not ch_response.get("items"):
                raise ValueError("YouTube channel not found. Check if URL/handle/ID is valid and public.")
                
            item = ch_response["items"][0]
            snippet = item["snippet"]
            content_details = item["contentDetails"]
            stats = item.get("statistics", {})
            branding = item.get("brandingSettings", {})
            
            uploads_playlist_id = content_details.get("relatedPlaylists", {}).get("uploads", "")
            
            banner_url = branding.get("image", {}).get("bannerExternalUrl", "")
            thumbnail_url = snippet.get("thumbnails", {}).get("high", {}).get("url") or snippet.get("thumbnails", {}).get("default", {}).get("url")
            
            channel_data = {
                "id": item["id"],
                "title": snippet.get("title", "Unknown Channel"),
                "handle": snippet.get("customUrl", channel_id),
                "description": snippet.get("description", ""),
                "thumbnail_url": thumbnail_url,
                "banner_url": banner_url,
                "subscriber_count": int(stats.get("subscriberCount", 0)),
                "view_count": int(stats.get("viewCount", 0)),
                "video_count": int(stats.get("videoCount", 0)),
                "published_at": snippet.get("publishedAt", "")[:10], # YYYY-MM-DD
                "country": snippet.get("country", "US"),
                "uploads_playlist_id": uploads_playlist_id,
                "is_mock": False
            }
            
            # Fetch up to 100 recent videos from uploads playlist
            videos = []
            if uploads_playlist_id:
                next_page_token = None
                while len(videos) < 100:
                    max_results = min(50, 100 - len(videos))
                    items_request = youtube.playlistItems().list(
                        part="snippet,contentDetails",
                        playlistId=uploads_playlist_id,
                        maxResults=max_results,
                        pageToken=next_page_token
                    )
                    items_response = items_request.execute()
                    
                    batch_items = items_response.get("items", [])
                    if not batch_items:
                        break
                        
                    for it in batch_items:
                        vid_snippet = it["snippet"]
                        video_id = vid_snippet.get("resourceId", {}).get("videoId")
                        if not video_id:
                            continue
                        videos.append({
                            "id": video_id,
                            "title": vid_snippet.get("title", "Unknown Video"),
                            "description": vid_snippet.get("description", ""),
                            "thumbnail_url": vid_snippet.get("thumbnails", {}).get("high", {}).get("url") or vid_snippet.get("thumbnails", {}).get("default", {}).get("url"),
                            "publish_date": vid_snippet.get("publishedAt", "")[:10]
                        })
                        
                    next_page_token = items_response.get("nextPageToken")
                    if not next_page_token:
                        break
                
                # Fetch detailed video stats in batches of 50
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
                            
                            v_stats = v_item.get("statistics", {})
                            views = int(v_stats.get("viewCount", 0))
                            likes = int(v_stats.get("likeCount", 0))
                            comments = int(v_stats.get("commentCount", 0))
                            shares = int(views * 0.005) # Proportional shares
                            
                            category_id = v_snippet.get("categoryId", "")
                            category_name = CATEGORIES.get(category_id, "Unknown")
                            
                            tags_list = v_snippet.get("tags", [])
                            tags_json = ",".join(tags_list) if tags_list else ""
                            
                            video_details[vid_id] = {
                                "duration_seconds": seconds,
                                "view_count": views,
                                "like_count": likes,
                                "comment_count": comments,
                                "share_count": shares,
                                "category": category_name,
                                "tags": tags_json
                            }
                            
                    # Merge details back and filter out empty details
                    complete_videos = []
                    for video in videos:
                        details = video_details.get(video["id"])
                        if details:
                            video.update(details)
                            video["is_mock"] = False
                            complete_videos.append(video)
                    videos = complete_videos
                    
            # Compute averages
            if videos:
                avg_views = sum(v["view_count"] for v in videos) / len(videos)
                avg_likes = sum(v["like_count"] for v in videos) / len(videos)
                avg_comments = sum(v["comment_count"] for v in videos) / len(videos)
                avg_duration = sum(v["duration_seconds"] for v in videos) / len(videos)
            else:
                avg_views = avg_likes = avg_comments = avg_duration = 0.0
                
            channel_data.update({
                "average_views": round(avg_views, 2),
                "average_likes": round(avg_likes, 2),
                "average_comments": round(avg_comments, 2),
                "average_duration": round(avg_duration, 2),
                "videos": videos
            })
            return channel_data
            
        except HttpError as e:
            if is_mock_request and e.resp.status in [400, 403]:
                mock_data = YouTubeService.generate_mock_channel(channel_id)
                mock_data["is_mock"] = True
                return mock_data
            raise ValueError(f"YouTube API Error (Status {e.resp.status}): {e.reason}")
        except Exception as e:
            if is_mock_request:
                mock_data = YouTubeService.generate_mock_channel(channel_id)
                mock_data["is_mock"] = True
                return mock_data
            raise ValueError(f"Error fetching channel details: {str(e)}")

    @staticmethod
    def generate_mock_channel(channel_id: str) -> dict:
        """
        Generates mock channel analytics and mock video data (based on channel playlist).
        """
        # Standardise channel handle
        handle = channel_id.lower()
        if not handle.startswith("@"):
            if "dsa" in handle:
                handle = "@dsa"
            elif "web" in handle:
                handle = "@web"
            else:
                handle = "@ai"
                
        now = datetime.date.today()
        
        if handle == "@dsa":
            title = "AlgoTech Academy"
            description = "Learn data structures, algorithms, and technical interview preparation with clear, visualized explanations."
            subscribers = 450000
            views = 24500000
            video_count = 124
            country = "US"
            published_at = "2021-04-12"
            banner_url = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80"
            thumbnail_url = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&q=80"
            
            vids_data = [
                ("Big O Notation & Time Complexity", 1200, 150240, 12000, 800, 45),
                ("Arrays & Dynamic Arrays Implementation", 1850, 95200, 7500, 450, 43),
                ("Stacks & Queues: Coding Interview Patterns", 1540, 72300, 6100, 310, 41),
                ("Binary Trees & Tree Traversals (DFS, BFS)", 2850, 68000, 5800, 290, 38),
                ("Graph Theory: Representations & DFS/BFS", 3600, 78200, 7200, 410, 35),
                ("Dijkstra's Algorithm & Shortest Path", 2700, 89100, 8100, 500, 32),
                ("Dynamic Programming: Grid Problems", 3800, 94200, 9300, 620, 30),
                ("Heap Data Structure & Priority Queues", 2200, 56000, 4800, 290, 25),
                ("Trie (Prefix Tree) Implementation & Search", 2400, 48000, 4200, 210, 22),
                ("A* Search Algorithm Pathfinding Visualized", 3100, 115000, 10500, 780, 18),
                ("Greedy Algorithms vs Dynamic Programming", 2600, 83000, 7100, 490, 15),
                ("Quick Sort & Merge Sort Deep Dive", 1950, 64000, 5200, 310, 12),
                ("Union Find (Disjoint Set) Algorithm", 2100, 42000, 3900, 250, 8),
                ("Topological Sort: Course Schedule Problem", 1800, 51000, 4600, 280, 5),
                ("Sliding Window Coding Patterns", 1650, 97000, 9100, 635, 2)
            ]
        elif handle == "@web":
            title = "DevCraft Tutorials"
            description = "Learn modern layout grids, JavaScript async, React state hooks, and Next.js routers."
            subscribers = 380000
            views = 18200000
            video_count = 98
            country = "GB"
            published_at = "2022-01-20"
            banner_url = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80"
            thumbnail_url = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&q=80"
            
            vids_data = [
                ("Advanced CSS: Grid, Flexbox, and Tailwind", 1800, 152000, 9800, 520, 50),
                ("Asynchronous JavaScript: Promises & Async/Await", 1920, 142000, 8400, 410, 47),
                ("React Hooks: useState, useEffect, useContext", 2980, 167000, 11000, 680, 44),
                ("Next.js App Router Architecture", 3650, 134000, 9100, 480, 40),
                ("SQL Database Design with SQLite & PostgreSQL", 3200, 75000, 5100, 240, 35),
                ("Deploying Next.js & FastAPI to Vercel/Render", 1800, 47000, 3200, 190, 32),
                ("TypeScript Crash Course for React Developers", 2200, 110000, 8900, 610, 28),
                ("State Management in 2026: Zustand vs Redux", 2100, 68000, 5400, 380, 24),
                ("WebSockets Tutorial: Building a Chat App", 2700, 89000, 7300, 490, 20),
                ("REST API Best Practices & Design Patterns", 1900, 95000, 7900, 420, 15),
                ("Docker Containers for Web Developers", 2405, 54000, 4100, 280, 10),
                ("OAuth 2.0 & JWT Authentication Explained", 2600, 73000, 6250, 415, 6),
                ("Building a Modern SaaS Landing Page", 3400, 125000, 10200, 850, 2)
            ]
        else:
            title = "Lexicon AI Labs"
            description = "Comprehensive theoretical and practical guide into Deep Learning networks."
            subscribers = 520000
            views = 31000000
            video_count = 145
            country = "US"
            published_at = "2020-08-05"
            banner_url = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80"
            thumbnail_url = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&q=80"
            
            vids_data = [
                ("Python for Data Science (NumPy, Pandas)", 2400, 310000, 21000, 1400, 55),
                ("Introduction to Neural Networks & Backprop", 3450, 168000, 12500, 910, 50),
                ("PyTorch Basics: Tensors & Autograd", 1920, 94000, 7800, 410, 45),
                ("Transformer Architecture: Self-Attention", 4500, 189000, 15300, 1100, 40),
                ("Fine-Tuning LLMs with LoRA & QLoRA", 3800, 96000, 8100, 580, 35),
                ("Convolutional Neural Networks (CNN) for Vision", 2800, 82000, 6400, 390, 30),
                ("Recurrent Neural Networks (RNN) & LSTM", 2500, 61000, 4800, 290, 25),
                ("Reinforcement Learning & Q-Learning Explained", 3100, 74000, 5950, 480, 20),
                ("AI Agents & LangChain Framework", 2700, 112000, 9400, 790, 15),
                ("Vector Databases: ChromaDB vs Pinecone", 1950, 88000, 7200, 510, 11),
                ("Diffusion Models: Stable Diffusion Math", 3600, 67000, 5300, 440, 8),
                ("Prompt Engineering Tech for Developers", 1500, 145000, 11500, 920, 4),
                ("Running Llama 3 Locally with Ollama", 1850, 132000, 10800, 810, 2)
            ]
            
        videos = []
        for i, (v_title, duration, views_val, likes, comments, days_ago) in enumerate(vids_data):
            v_id = f"mock_vid_{handle[1:]}_{i}"
            shares = int(views_val * 0.005)
            p_date = (now - datetime.timedelta(days=days_ago)).strftime("%Y-%m-%d")
            
            videos.append({
                "id": v_id,
                "title": v_title,
                "description": f"Overview tutorial for {v_title} presented by {title}.",
                "thumbnail_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
                "channel_title": title,
                "publish_date": p_date,
                "duration_seconds": duration,
                "view_count": views_val,
                "like_count": likes,
                "comment_count": comments,
                "share_count": shares,
                "category": "Education" if handle == "@dsa" else "Science & Technology",
                "tags": "mock,analytics,youtube,course",
                "is_mock": True
            })
            
        avg_views = sum(v["view_count"] for v in videos) / len(videos)
        avg_likes = sum(v["like_count"] for v in videos) / len(videos)
        avg_comments = sum(v["comment_count"] for v in videos) / len(videos)
        avg_duration = sum(v["duration_seconds"] for v in videos) / len(videos)
        
        return {
            "id": f"channel_{handle[1:]}",
            "title": title,
            "handle": handle,
            "description": description,
            "thumbnail_url": thumbnail_url,
            "banner_url": banner_url,
            "subscriber_count": subscribers,
            "view_count": views,
            "video_count": video_count,
            "published_at": published_at,
            "country": country,
            "uploads_playlist_id": f"uploads_{handle[1:]}",
            "average_views": round(avg_views, 2),
            "average_likes": round(avg_likes, 2),
            "average_comments": round(avg_comments, 2),
            "average_duration": round(avg_duration, 2),
            "is_mock": True,
            "created_at": datetime.datetime.utcnow(),
            "videos": videos
        }

    @staticmethod
    def search_channels(query: str, custom_api_key: str = "") -> list:
        """
        Searches YouTube channels by query, returning titles, handles, subscriber counts,
        and verification indicators. Uses local mock database or falls back to YouTube search.
        """
        q = query.lower().strip()
        
        # Local mock database for offline/fallback mode
        mock_channels = [
            {
                "id": "channel_dsa",
                "title": "AlgoTech Academy",
                "handle": "@dsa",
                "thumbnail_url": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&q=80",
                "subscriber_count": 450000,
                "is_verified": True,
                "is_mock": True
            },
            {
                "id": "channel_web",
                "title": "DevCraft Tutorials",
                "handle": "@web",
                "thumbnail_url": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&q=80",
                "subscriber_count": 380000,
                "is_verified": False,
                "is_mock": True
            },
            {
                "id": "channel_ai",
                "title": "Lexicon AI Labs",
                "handle": "@ai",
                "thumbnail_url": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&q=80",
                "subscriber_count": 520000,
                "is_verified": True,
                "is_mock": True
            },
            {
                "id": "channel_akash",
                "title": "Akash Gupta Comedy",
                "handle": "@akashgupta",
                "thumbnail_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
                "subscriber_count": 1200000,
                "is_verified": True,
                "is_mock": True
            },
            {
                "id": "channel_carry",
                "title": "CarryMinati",
                "handle": "@carryminati",
                "thumbnail_url": "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=200&q=80",
                "subscriber_count": 44000000,
                "is_verified": True,
                "is_mock": True
            },
            {
                "id": "channel_dhruv",
                "title": "Dhruv Rathee",
                "handle": "@dhruvrathee",
                "thumbnail_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80",
                "subscriber_count": 22000000,
                "is_verified": True,
                "is_mock": True
            },
            {
                "id": "channel_beer",
                "title": "BeerBiceps",
                "handle": "@beerbiceps",
                "thumbnail_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80",
                "subscriber_count": 7500000,
                "is_verified": True,
                "is_mock": True
            },
            {
                "id": "channel_guruji",
                "title": "Technical Guruji",
                "handle": "@technicalguruji",
                "thumbnail_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
                "subscriber_count": 23000000,
                "is_verified": True,
                "is_mock": True
            }
        ]

        # Filter mocks first
        mock_results = [
            ch for ch in mock_channels
            if q in ch["title"].lower() or q in ch["handle"].lower()
        ]

        api_key = custom_api_key or settings.YOUTUBE_API_KEY
        # If no query or it matches mock handles specifically, return mocks
        if not q or q in ["@dsa", "@web", "@ai", "dsa", "web", "ai"]:
            return mock_results

        if not api_key:
            return mock_results

        try:
            youtube = build('youtube', 'v3', developerKey=api_key)
            search_request = youtube.search().list(
                q=query,
                type="channel",
                part="snippet",
                maxResults=5
            )
            search_response = search_request.execute()
            
            channel_ids = []
            for item in search_response.get("items", []):
                cid = item.get("id", {}).get("channelId")
                if cid:
                    channel_ids.append(cid)
                    
            if not channel_ids:
                return mock_results
                
            ch_request = youtube.channels().list(
                part="snippet,statistics",
                id=",".join(channel_ids)
            )
            ch_response = ch_request.execute()
            
            api_results = []
            for item in ch_response.get("items", []):
                snippet = item.get("snippet", {})
                stats = item.get("statistics", {})
                sub_count = int(stats.get("subscriberCount", 0)) if stats.get("subscriberCount") else 0
                handle = snippet.get("customUrl", "")
                if handle and not handle.startswith("@"):
                    handle = "@" + handle
                elif not handle:
                    handle = f"@{item['id']}"
                    
                api_results.append({
                    "id": item["id"],
                    "title": snippet.get("title", "Unknown Channel"),
                    "handle": handle,
                    "thumbnail_url": snippet.get("thumbnails", {}).get("default", {}).get("url", ""),
                    "subscriber_count": sub_count,
                    "is_verified": sub_count > 100000,
                    "is_mock": False
                })
            
            # Combine mock results (if query matched mock) and API results
            seen_ids = {r["id"] for r in api_results}
            for mock_r in mock_results:
                if mock_r["id"] not in seen_ids:
                    api_results.append(mock_r)
                    
            return api_results[:6]
        except Exception as e:
            print(f"Error during YouTube search api lookup: {e}")
            return mock_results


