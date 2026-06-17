"use client";

import React, { useState, useEffect } from "react";
import { 
  api, Video, Playlist, VideoComparison, PlaylistComparison 
} from "./services/api";
import VideoDashboard from "./components/VideoDashboard";
import PlaylistDashboard from "./components/PlaylistDashboard";
import VideoCompareDashboard from "./components/VideoCompareDashboard";
import PlaylistCompareDashboard from "./components/PlaylistCompareDashboard";
import { 
  Search, Scale, Clock, Sparkles, History, Info, AlertCircle, Play, ArrowLeft, Database, Key
} from "lucide-react";

type ActiveMode = "video" | "playlist" | "compare_video" | "compare_playlist";

interface HistoryItem {
  id: string;
  title: string;
  creator: string;
  type: "video" | "playlist";
}

export default function Home() {
  const [activeMode, setActiveMode] = useState<ActiveMode>("video");
  const [url1, setUrl1] = useState("");
  const [url2, setUrl2] = useState("");
  const [youtubeKey, setYoutubeKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Analytics results
  const [videoData, setVideoData] = useState<Video | null>(null);
  const [playlistData, setPlaylistData] = useState<Playlist | null>(null);
  const [videoComparison, setVideoComparison] = useState<VideoComparison | null>(null);
  const [playlistComparison, setPlaylistComparison] = useState<PlaylistComparison | null>(null);

  // Load cached settings on mount
  useEffect(() => {
    const cachedHistory = localStorage.getItem("tubeintel_history_v2");
    if (cachedHistory) {
      try { setHistory(JSON.parse(cachedHistory)); } catch (e) { console.error(e); }
    }
    const cachedKey = localStorage.getItem("tubeintel_yt_key_v2");
    if (cachedKey) {
      setYoutubeKey(cachedKey);
    }
  }, []);

  const saveToHistory = (id: string, title: string, creator: string, type: "video" | "playlist") => {
    const newItem: HistoryItem = { id, title, creator, type };
    setHistory((prev) => {
      const filtered = prev.filter(item => item.id !== id);
      const updated = [newItem, ...filtered].slice(0, 5); // limit to 5
      localStorage.setItem("tubeintel_history_v2", JSON.stringify(updated));
      return updated;
    });
  };

  const resetResults = () => {
    setVideoData(null);
    setPlaylistData(null);
    setVideoComparison(null);
    setPlaylistComparison(null);
    setError("");
  };

  const handleAnalyse = async (u1 = url1, u2 = url2, mode = activeMode) => {
    if (!u1.trim()) return;
    
    setLoading(true);
    setError("");
    resetResults();

    try {
      if (mode === "video") {
        const data = await api.analyseVideo(u1, youtubeKey);
        setVideoData(data);
        saveToHistory(data.id, data.title, data.channel_title, "video");
      } else if (mode === "playlist") {
        const data = await api.analysePlaylist(u1, youtubeKey);
        setPlaylistData(data);
        saveToHistory(data.id, data.title, data.channel_title, "playlist");
      } else if (mode === "compare_video") {
        if (!u2.trim()) {
          throw new Error("Please enter both video links to compare.");
        }
        const data = await api.compareVideos(u1, u2, youtubeKey);
        setVideoComparison(data);
      } else if (mode === "compare_playlist") {
        if (!u2.trim()) {
          throw new Error("Please enter both playlist links to compare.");
        }
        const data = await api.comparePlaylists(u1, u2, youtubeKey);
        setPlaylistComparison(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Retrieval failed. Check if links are correct, public, and verify your API Key.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadHistory = (item: HistoryItem) => {
    resetResults();
    if (item.type === "video") {
      setActiveMode("video");
      setUrl1(item.id);
      handleAnalyse(item.id, "", "video");
    } else {
      setActiveMode("playlist");
      setUrl1(item.id);
      handleAnalyse(item.id, "", "playlist");
    }
  };

  const hasResult = videoData || playlistData || videoComparison || playlistComparison;

  return (
    <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 min-h-screen">
      
      {/* ----------------- LANDING & SEARCH HUB ----------------- */}
      {!hasResult && !loading && (
        <div className="flex-1 flex flex-col justify-center items-center py-12">
          
          {/* Hero Header */}
          <div className="text-center space-y-4 max-w-2xl mb-8">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-indigo-400 text-xs font-semibold">
              <Sparkles size={12} />
              <span>TubeIntel Platform — Professional Video & Playlist Benchmarks</span>
            </div>
            
            <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              TubeIntel
            </h1>
            <p className="text-base text-zinc-400 font-medium max-w-md mx-auto leading-relaxed">
              Objective metadata, engagement aggregates, and side-by-side comparison analytics for YouTube videos and playlists.
            </p>
          </div>

          {/* Core Operations Tab Selector */}
          <div className="flex bg-zinc-950/60 p-1 border border-zinc-900 rounded-xl mb-6 gap-1.5 w-full max-w-xl">
            {(["video", "playlist", "compare_video", "compare_playlist"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setActiveMode(mode);
                  setError("");
                  setUrl1("");
                  setUrl2("");
                }}
                className={`flex-1 text-[10px] sm:text-xs font-bold py-2.5 px-3 rounded-lg cursor-pointer transition-all capitalize ${
                  activeMode === mode 
                    ? "bg-indigo-600 text-white shadow-glow" 
                    : "text-zinc-500 hover:text-zinc-350"
                }`}
              >
                {mode.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Form Card */}
          <div className="w-full max-w-xl glass p-6 rounded-2xl shadow-glow space-y-5 mb-8">
            <div className="space-y-4">
              
              {/* URL 1 Input */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder={
                    activeMode.startsWith("compare")
                      ? "Paste link/ID of YouTube item A..."
                      : activeMode === "video"
                      ? "Paste YouTube video link or ID (e.g. video_dsa)..."
                      : "Paste YouTube playlist link or ID (e.g. dsa)..."
                  }
                  className="w-full bg-zinc-950/60 border border-zinc-850 focus:border-indigo-500 rounded-xl py-3.5 pl-10 pr-4 text-xs text-zinc-200 outline-none transition-colors"
                  value={url1}
                  onChange={(e) => setUrl1(e.target.value)}
                />
              </div>

              {/* URL 2 Input (For comparisons) */}
              {activeMode.startsWith("compare") && (
                <div className="relative">
                  <Scale size={16} className="absolute left-3 top-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Paste link/ID of YouTube item B..."
                    className="w-full bg-zinc-950/60 border border-zinc-850 focus:border-indigo-500 rounded-xl py-3.5 pl-10 pr-4 text-xs text-zinc-200 outline-none transition-colors"
                    value={url2}
                    onChange={(e) => setUrl2(e.target.value)}
                  />
                </div>
              )}

              {/* Submit CTA */}
              <button
                onClick={() => handleAnalyse()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 glow-btn text-white rounded-xl py-3.5 px-6 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Run Analysis</span>
              </button>
            </div>

            {/* YouTube API Key settings */}
            <div className="border-t border-zinc-900/60 pt-4 space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><Key size={12} /> YouTube Data API Key</span>
                <a 
                  href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-indigo-400 hover:underline capitalize font-semibold normal-case"
                >
                  Get Key
                </a>
              </div>
              <input
                type="password"
                placeholder="Enter custom API Key (For live playlists & videos)..."
                className="w-full bg-zinc-950/40 border border-zinc-900 focus:border-indigo-500 rounded-lg py-2.5 px-3 text-xs text-zinc-350 outline-none transition-colors"
                value={youtubeKey}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setYoutubeKey(val);
                  localStorage.setItem("tubeintel_yt_key_v2", val);
                }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="text-[10px] text-zinc-500 text-center flex justify-center items-center gap-1">
              <Info size={12} />
              <span>Offline demo works for: `video_dsa`, `video_web`, `dsa`, `web`.</span>
            </div>
          </div>

          {/* History Panel */}
          {history.length > 0 && (
            <div className="w-full max-w-xl space-y-3">
              <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <History size={12} />
                Recent Queries
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadHistory(item)}
                    className="glass p-3 rounded-xl flex items-center justify-between cursor-pointer hover:border-zinc-750 transition-colors group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-[11px] font-bold text-zinc-350 truncate leading-normal" title={item.title}>
                        {item.title}
                      </p>
                      <p className="text-[9px] text-zinc-500 mt-0.5">{item.creator}</p>
                    </div>
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 group-hover:bg-indigo-500 group-hover:text-white px-2 py-0.5 rounded transition-all flex-shrink-0 capitalize">
                      {item.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ----------------- LOADING STATE ----------------- */}
      {loading && (
        <div className="flex-1 flex flex-col justify-center items-center py-20">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-zinc-900"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-indigo-500 animate-spin"></div>
          </div>
          <h2 className="text-base font-bold text-zinc-350">Compiling Analytics Report...</h2>
          <p className="text-xs text-zinc-500 mt-2 max-w-xs text-center leading-relaxed">
            Parsing URL structure, fetching metadata stats, calculating duration variables, and compiling engagement benchmarks.
          </p>
        </div>
      )}

      {/* ----------------- RESULTS VIEW ----------------- */}
      {hasResult && !loading && (
        <div className="flex-1 space-y-6">
          
          {/* Back Navigation Bar */}
          <div className="flex justify-between items-center">
            <button
              onClick={resetResults}
              className="bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-zinc-250 py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft size={14} /> 
              <span>Back to Hub</span>
            </button>
            
            <div className="text-[10px] text-zinc-500 flex items-center gap-1 bg-zinc-950/30 px-3 py-1 rounded-full border border-zinc-900">
              <Database size={10} />
              <span>Objective Analytics Mode</span>
            </div>
          </div>

          {/* Load Dashboard */}
          {videoData && <VideoDashboard video={videoData} />}
          {playlistData && <PlaylistDashboard playlist={playlistData} />}
          {videoComparison && <VideoCompareDashboard comparison={videoComparison} />}
          {playlistComparison && <PlaylistCompareDashboard comparison={playlistComparison} />}

        </div>
      )}

    </div>
  );
}
