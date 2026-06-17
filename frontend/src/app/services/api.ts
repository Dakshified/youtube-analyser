const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  duration_seconds: number;
  view_count: number;
  publish_date: string;
  position: number;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  channel_title: string;
  video_count: number;
  total_views: number;
  total_duration_seconds: number;
  average_duration_seconds: number;
  median_duration_seconds: number;
  longest_video_id: string;
  longest_video_title: string;
  longest_video_seconds: number;
  shortest_video_id: string;
  shortest_video_title: string;
  shortest_video_seconds: number;
  learning_score: number;
  difficulty: string;
  skills: string; // JSON string of list
  topics: string; // JSON string of dict/list
  learning_path: string; // JSON string of list
  videos: Video[];
}

export interface Transcript {
  video_id: string;
  raw_text: string;
  word_count: number;
  speaking_duration_seconds: number;
  keywords: { text: string; value: number }[];
  topics: { topic: string; weight: number }[];
  segments?: { text: string; start: number; duration: number }[];
}

export interface AISummary {
  target_type: string;
  target_id: string;
  summary: {
    key_concepts?: string[];
    important_points?: string[];
    takeaways?: string[];
    learning_objectives?: string[];
    topics_covered?: string[];
    skills_taught?: string[];
    revision_notes?: string;
    definitions?: Record<string, string>;
    bullet_summaries?: string[];
  };
}

export interface StudyPlan {
  playlist_id: string;
  daily_time_minutes: number;
  schedule: {
    day: number;
    videos: {
      id: string;
      title: string;
      duration_seconds: number;
      position: number;
    }[];
    total_duration_seconds: number;
    target_completed_pct: number;
  }[];
}

export const api = {
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
      const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
      throw new Error(err.detail || 'Analysis failed');
    }
    return res.json();
  },

  async getPlaylist(playlistId: string): Promise<Playlist> {
    const res = await fetch(`${API_BASE_URL}/playlist/${playlistId}`);
    if (!res.ok) throw new Error('Playlist not found');
    return res.json();
  },

  async getTranscript(videoId: string, title: string = ''): Promise<Transcript> {
    const res = await fetch(`${API_BASE_URL}/video/${videoId}/transcript?title=${encodeURIComponent(title)}`);
    if (!res.ok) throw new Error('Transcript not found');
    return res.json();
  },

  async getVideoSummary(videoId: string, title: string = ''): Promise<AISummary> {
    const res = await fetch(`${API_BASE_URL}/video/${videoId}/summary?title=${encodeURIComponent(title)}`);
    if (!res.ok) throw new Error('Video summary failed');
    return res.json();
  },

  async getPlaylistSummary(playlistId: string): Promise<AISummary> {
    const res = await fetch(`${API_BASE_URL}/playlist/${playlistId}/summary`);
    if (!res.ok) throw new Error('Playlist summary failed');
    return res.json();
  },

  async getVideoNotes(videoId: string, title: string = ''): Promise<AISummary> {
    const res = await fetch(`${API_BASE_URL}/video/${videoId}/notes?title=${encodeURIComponent(title)}`);
    if (!res.ok) throw new Error('Failed to generate video notes');
    return res.json();
  },

  async getStudyPlan(playlistId: string, dailyTimeMinutes: number): Promise<StudyPlan> {
    const res = await fetch(`${API_BASE_URL}/playlist/${playlistId}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_time_minutes: dailyTimeMinutes }),
    });
    if (!res.ok) throw new Error('Study plan failed');
    return res.json();
  },

  async comparePlaylists(playlistId1: string, playlistId2: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/playlist/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlist_id_1: playlistId1, playlist_id_2: playlistId2 }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Comparison failed' }));
      throw new Error(err.detail || 'Comparison failed');
    }
    return res.json();
  }
};
