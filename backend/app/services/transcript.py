from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

class TranscriptService:
    @staticmethod
    def get_transcript(video_id: str, video_title: str = "") -> dict:
        """
        Retrieves transcript for a video.
        Falls back to generating mock transcripts if YouTube captions are disabled or unavailable.
        """
        is_mock = video_id.startswith("mock_") or video_id.lower() in ["video_dsa", "video_web", "video_ai"]
        
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
            except Exception as e:
                print(f"Could not retrieve captions for {video_id}: {str(e)}.")
                raise ValueError("Transcripts are not available for this video.")
        else:
            # Generate mock transcript based on video title
            raw_text, transcript_segments = TranscriptService.generate_mock_transcript(video_id, video_title)
            
        word_count = len(raw_text.split())
        character_count = len(raw_text)
        
        # Calculate speaking duration (average of 150 WPM)
        speaking_duration_seconds = int((word_count / 150) * 60)
        
        return {
            "video_id": video_id,
            "raw_text": raw_text,
            "segments": transcript_segments,
            "word_count": word_count,
            "character_count": character_count,
            "speaking_duration_seconds": speaking_duration_seconds
        }

    @staticmethod
    def generate_mock_transcript(video_id: str, video_title: str) -> tuple:
        """
        Creates detailed contextual mock transcripts based on the video title.
        """
        title = video_title or "this video topic"
        
        mock_narrative = (
            f"Hello everyone and welcome back to the channel. In this video, we are going to dive deep into {title}. "
            f"This is an important concept that comes up constantly in coding, development, and system design. "
            f"First, we will lay out the core principles and understand the underlying mechanics of {title}. "
            f"Once we have the theory down, we will jump directly into the implementation and examine statistics and constraints. "
            f"Let's write out a simple demonstration to explain this concept. As you can see, when we run this code, it operates efficiently. "
            f"Pay close attention to how we handle edge cases, memory allocation, and data flow. "
            f"In the second half of this tutorial, we will work through some classic practice problems that you might face. "
            f"Understanding {title} is going to help you write cleaner, more maintainable systems that scale. "
            f"Don't forget to check the resources linked below, practice writing this from scratch, and leave your questions in the comments. "
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
