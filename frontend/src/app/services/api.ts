const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  channel_title: string;
  publish_date: string;
  duration_seconds: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  category: string;
  tags: string;
  is_mock: boolean;
}

export interface PlaylistVideo {
  position: number;
  video: Video;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  channel_title: string;
  video_count: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  is_mock: boolean;
  total_duration_seconds: number;
  average_duration_seconds: number;
  longest_video_id: string;
  longest_video_title: string;
  longest_video_seconds: number;
  shortest_video_id: string;
  shortest_video_title: string;
  shortest_video_seconds: number;
  videos: PlaylistVideo[];
}

export interface Transcript {
  video_id: string;
  raw_text: string;
  word_count: number;
  character_count: number;
  speaking_duration_seconds: number;
  segments: { text: string; start: number; duration: number }[];
}

export interface ReplayPeak {
  seconds: number;
  timestamp: string;
  intensity: number;
}

export interface ReplayIntensity {
  peaks: ReplayPeak[];
  chart_data: { time: string; intensity: number }[];
}

export interface VideoMultiResponse {
  videos: Video[];
  comparison_metrics?: {
    views_per_day: number[];
    like_view_ratios: number[];
    highest_views_idx: number;
    highest_likes_idx: number;
    highest_comments_idx: number;
    highest_shares_idx: number;
    highest_duration_idx: number;
  };
}

export interface PlaylistMultiResponse {
  playlists: Playlist[];
  comparison_metrics?: {
    average_gaps: number[];
    highest_videos_idx: number;
    highest_views_idx: number;
    highest_likes_idx: number;
    highest_comments_idx: number;
    highest_shares_idx: number;
    highest_duration_idx: number;
  };
}

export const api = {
  async analyseVideo(urls: string[], youtubeKey?: string): Promise<VideoMultiResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (youtubeKey) {
      headers['x-youtube-key'] = youtubeKey;
    }
    const res = await fetch(`${API_BASE_URL}/video/analyse`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ urls }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Video analysis failed' }));
      throw new Error(err.detail || 'Video analysis failed');
    }
    return res.json();
  },

  async analysePlaylist(urls: string[], youtubeKey?: string): Promise<PlaylistMultiResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (youtubeKey) {
      headers['x-youtube-key'] = youtubeKey;
    }
    const res = await fetch(`${API_BASE_URL}/playlist/analyse`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ urls }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Playlist analysis failed' }));
      throw new Error(err.detail || 'Playlist analysis failed');
    }
    return res.json();
  },

  async getTranscript(videoId: string, title: string = ''): Promise<Transcript> {
    const res = await fetch(`${API_BASE_URL}/video/${videoId}/transcript?title=${encodeURIComponent(title)}`);
    if (!res.ok) throw new Error('Transcript not found');
    return res.json();
  },

  async getReplayIntensity(videoId: string): Promise<ReplayIntensity> {
    const res = await fetch(`${API_BASE_URL}/video/${videoId}/replay-intensity`);
    if (!res.ok) throw new Error('Replay intensity details not found');
    return res.json();
  }
};
