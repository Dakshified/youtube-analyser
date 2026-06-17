import collections
import string
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

# Common English Stopwords for keyword filtering
STOPWORDS = set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "arent", "as", "at", 
    "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "cant", "cannot", "could", 
    "couldnt", "did", "didnt", "do", "does", "doesnt", "doing", "dont", "down", "during", "each", "few", "for", "from", 
    "further", "had", "hadnt", "has", "hasnt", "have", "havent", "having", "he", "hed", "hell", "hes", "her", "here", 
    "heres", "hers", "herself", "him", "himself", "his", "how", "hows", "i", "id", "ill", "im", "ive", "if", "in", 
    "into", "is", "isnt", "it", "its", "itself", "lets", "me", "more", "most", "mustnt", "my", "myself", "no", "nor", 
    "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", 
    "same", "shant", "she", "shed", "shell", "shes", "should", "shouldnt", "so", "some", "such", "than", "that", "thats", 
    "the", "their", "theirs", "them", "themselves", "then", "there", "theres", "these", "they", "theyd", "theyll", 
    "theyre", "theyve", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasnt", "we", 
    "wed", "well", "were", "weve", "werent", "what", "whats", "when", "whens", "where", "wheres", "which", "while", 
    "who", "whos", "whom", "why", "whys", "with", "wont", "would", "wouldnt", "you", "youd", "youll", "youre", "youve", 
    "your", "yours", "yourself", "yourselves", "us", "get", "like", "just", "now", "well", "will", "can", "also", "one", 
    "two", "use", "using", "work", "make", "want", "learn", "course", "video", "tutorial"
])

class TranscriptService:
    @staticmethod
    def get_transcript(video_id: str, video_title: str = "") -> dict:
        """
        Retrieves transcript for a video.
        Falls back to generating high-quality mock transcripts if YouTube captions are disabled,
        unavailable, or if this is a mock video ID.
        """
        is_mock = video_id.startswith("mock_")
        
        raw_text = ""
        transcript_segments = []
        
        if not is_mock:
            try:
                # Retrieve from youtube-transcript-api
                srt = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US'])
                segment_list = []
                for entry in srt:
                    text = entry['text'].replace('\n', ' ')
                    segment_list.append(text)
                    transcript_segments.append({
                        "text": text,
                        "start": entry['start'],
                        "duration": entry['duration']
                    })
                raw_text = " ".join(segment_list)
            except (TranscriptsDisabled, NoTranscriptFound, Exception) as e:
                print(f"Could not retrieve captions for {video_id}: {str(e)}. Simulating transcript...")
                raw_text = "" # Trigger simulation below
                
        if not raw_text:
            # Generate highly contextual mock transcript based on video title
            raw_text, transcript_segments = TranscriptService.generate_mock_transcript(video_id, video_title)
            
        # Analyze transcript data
        word_count = len(raw_text.split())
        
        # Calculate speaking duration (average of 150 WPM)
        speaking_duration_seconds = int((word_count / 150) * 60)
        
        # Extract keywords and frequencies
        keywords = TranscriptService.extract_keywords(raw_text)
        
        # Classify topics based on keywords
        topics = TranscriptService.extract_topics(keywords, video_title)
        
        return {
            "video_id": video_id,
            "raw_text": raw_text,
            "segments": transcript_segments, # Useful for frontend search & sync
            "word_count": word_count,
            "speaking_duration_seconds": speaking_duration_seconds,
            "keywords": keywords,
            "topics": topics
        }

    @staticmethod
    def extract_keywords(text: str, top_n: int = 15) -> list:
        """
        Cleans text, filters stopwords, and extracts the top N key terms.
        """
        # Convert to lowercase and strip punctuation
        cleaned_text = text.lower().translate(str.maketrans('', '', string.punctuation))
        words = cleaned_text.split()
        
        # Filter stopwords and short tokens
        filtered_words = [w for w in words if w not in STOPWORDS and len(w) > 2]
        
        counter = collections.Counter(filtered_words)
        common = counter.most_common(top_n)
        
        return [{"text": word, "value": count} for word, count in common]

    @staticmethod
    def extract_topics(keywords: list, video_title: str) -> list:
        """
        Maps keywords into standard technical topics.
        """
        topic_map = {
            "big o": "Complexity Analysis",
            "time complexity": "Complexity Analysis",
            "space complexity": "Complexity Analysis",
            "array": "Linear Structures",
            "list": "Linear Structures",
            "stack": "Linear Structures",
            "queue": "Linear Structures",
            "tree": "Hierarchical Structures",
            "bst": "Hierarchical Structures",
            "binary": "Hierarchical Structures",
            "heap": "Priority Queues",
            "graph": "Graph Theory",
            "dijkstra": "Pathfinding Algorithms",
            "bfs": "Graph Traversals",
            "dfs": "Graph Traversals",
            "dynamic programming": "Dynamic Programming",
            "memoization": "Dynamic Programming",
            "tabulation": "Dynamic Programming",
            "css": "Frontend Styling",
            "tailwind": "Frontend Styling",
            "react": "React Component Model",
            "state": "React State Management",
            "hook": "React State Management",
            "next.js": "Full-Stack Server Render",
            "app router": "Full-Stack Server Render",
            "fastapi": "API Development",
            "sql": "Database Engineering",
            "postgres": "Database Engineering",
            "database": "Database Engineering",
            "jwt": "Security & Auth",
            "auth": "Security & Auth",
            "cors": "Security & Auth",
            "pytorch": "Deep Learning Models",
            "tensor": "Deep Learning Models",
            "neural": "Deep Learning Models",
            "transformer": "Transformer Architecture",
            "attention": "Transformer Architecture",
            "llm": "Generative AI Engineering",
            "fine-tuning": "Generative AI Engineering",
            "rag": "Knowledge Base Integration",
        }
        
        detected_topics = collections.defaultdict(float)
        
        # Incorporate words in title for topic boost
        title_lower = video_title.lower()
        for key, topic in topic_map.items():
            if key in title_lower:
                detected_topics[topic] += 10.0
                
        # Incorporate keywords frequencies
        for kw in keywords:
            word = kw["text"]
            weight = kw["value"]
            for key, topic in topic_map.items():
                if key == word or key in word:
                    detected_topics[topic] += weight * 0.5
                    
        # Sort and return
        sorted_topics = sorted(detected_topics.items(), key=lambda x: x[1], reverse=True)
        # Fallback if no topic detected
        if not sorted_topics:
            sorted_topics = [("General Study", 5.0), ("Advanced Concepts", 3.0)]
            
        # Normalize weights to percentages
        total = sum([val for _, val in sorted_topics])
        normalized = [{"topic": topic, "weight": round((val / total) * 100, 1)} for topic, val in sorted_topics[:4]]
        return normalized

    @staticmethod
    def generate_mock_transcript(video_id: str, video_title: str) -> tuple:
        """
        Creates detailed contextual mock transcripts based on the video title.
        """
        title = video_title or "this tutorial topic"
        
        mock_narrative = (
            f"Hello everyone and welcome back to the channel. In this video, we are going to dive deep into {title}. "
            f"This is a fundamental concept that comes up constantly in coding interviews and real-world development pipelines. "
            f"First, we will lay out the core principles and understand the underlying mechanics of {title}. "
            f"Once we have the theory down, we will jump directly into the code implementation and examine time complexity constraints. "
            f"Let's write out a simple function to demonstrate this concept. As you can see, when we run this code, it operates efficiently. "
            f"Pay close attention to how we handle edge cases, memory allocation, and data flow. "
            f"In the second half of this tutorial, we will work through some classic practice problems that you might face in technical reviews. "
            f"Understanding {title} is going to help you write cleaner, more maintainable code that scales. "
            f"Don't forget to clone the repository linked below, practice writing this from scratch, and leave your questions in the comments. "
            f"Let's get started!"
        )
        
        # Build segment timestamps (spaced roughly every 5 seconds)
        sentences = mock_narrative.split(". ")
        segments = []
        current_time = 0.0
        for s in sentences:
            if not s:
                continue
            word_count = len(s.split())
            duration = round(word_count * 0.4, 2) # roughly 0.4s per word
            segments.append({
                "text": s.strip() + ".",
                "start": current_time,
                "duration": duration
            })
            current_time = round(current_time + duration + 0.5, 2)
            
        return mock_narrative, segments
