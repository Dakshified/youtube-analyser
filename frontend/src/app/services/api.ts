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

export interface VideoComparison {
  video_1: Video;
  video_2: Video;
  comparison_metrics: {
    views_ratio: number;
    views_diff: number;
    likes_diff: number;
    comments_diff: number;
    duration_diff_seconds: number;
    age_diff_days: number;
    like_view_ratio_1: number;
    like_view_ratio_2: number;
    views_per_day_1: number;
    views_per_day_2: number;
  };
}

export interface PlaylistComparison {
  playlist_1: Playlist;
  playlist_2: Playlist;
  comparison_metrics: {
    duration_ratio: number;
    duration_diff_seconds: number;
    video_count_diff: number;
    views_diff: number;
    likes_diff: number;
    comments_diff: number;
    average_gap_days_1: number;
    average_gap_days_2: number;
  };
}

export const api = {
  async analyseVideo(url: string, youtubeKey?: string): Promise<Video> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (youtubeKey) {
      headers['x-youtube-key'] = youtubeKey;
    }
    const res = await fetch(`${API_BASE_URL}/video/analyse`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Video analysis failed' }));
      throw new Error(err.detail || 'Video analysis failed');
    }
    return res.json();
  },

  async analysePlaylist(url: string, youtubeKey?: string): Promise<Playlist> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (youtubeKey) {
      headers['x-youtube-key'] = youtubeKey;
    }
    const res = await fetch(`${API_BASE_URL}/playlist/analyse`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Playlist analysis failed' }));
      throw new Error(err.detail || 'Playlist analysis failed');
    }
    return res.json();
  },

  async compareVideos(url1: string, url2: string, youtubeKey?: string): Promise<VideoComparison> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (youtubeKey) {
      headers['x-youtube-key'] = youtubeKey;
    }
    const res = await fetch(`${API_BASE_URL}/video/compare`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ url_1: url1, url_2: url2 }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Video comparison failed' }));
      throw new Error(err.detail || 'Video comparison failed');
    }
    return res.json();
  },

  async comparePlaylists(url1: string, url2: string, youtubeKey?: string): Promise<PlaylistComparison> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (youtubeKey) {
      headers['x-youtube-key'] = youtubeKey;
    }
    const res = await fetch(`${API_BASE_URL}/playlist/compare`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ url_1: url1, url_2: url2 }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Playlist comparison failed' }));
      throw new Error(err.detail || 'Playlist comparison failed');
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
