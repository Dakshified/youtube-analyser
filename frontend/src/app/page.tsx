"use client";

import React, { useState, useEffect } from "react";
import { api, VideoMultiResponse, PlaylistMultiResponse } from "./services/api";
import VideoDashboard from "./components/VideoDashboard";
import PlaylistDashboard from "./components/PlaylistDashboard";
import { 
  Search, Clock, Sparkles, History, Info, AlertCircle, ArrowLeft, Database, LayoutGrid
} from "lucide-react";

type ActiveMode = "video" | "playlist";

interface HistoryItem {
  id: string;
  title: string;
  creator: string;
  type: "video" | "playlist";
}

export default function Home() {
  const [activeMode, setActiveMode] = useState<ActiveMode>("video");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Responses
  const [videoResponse, setVideoResponse] = useState<VideoMultiResponse | null>(null);
  const [playlistResponse, setPlaylistResponse] = useState<PlaylistMultiResponse | null>(null);

  // Load cached settings
  useEffect(() => {
    const cachedHistory = localStorage.getItem("tubeintel_history_v3");
    if (cachedHistory) {
      try { setHistory(JSON.parse(cachedHistory)); } catch (e) { console.error(e); }
    }
  }, []);

  const saveToHistory = (id: string, title: string, creator: string, type: "video" | "playlist") => {
    const newItem: HistoryItem = { id, title, creator, type };
    setHistory((prev) => {
      const filtered = prev.filter(item => item.id !== id);
      const updated = [newItem, ...filtered].slice(0, 4); // limit to 4
      localStorage.setItem("tubeintel_history_v3", JSON.stringify(updated));
      return updated;
    });
  };

  const resetResults = () => {
    setVideoResponse(null);
    setPlaylistResponse(null);
    setError("");
  };

  // Helper to split URLs by commas, spaces, or newlines
  const parseUrls = (text: string): string[] => {
    return text
      .split(/[\s,\n]+/)
      .map(url => url.trim())
      .filter(url => url !== "");
  };

  const handleAnalyse = async (overrideText = inputText, mode = activeMode) => {
    const parsedUrls = parseUrls(overrideText);
    if (parsedUrls.length === 0) return;

    if (parsedUrls.length > 4) {
      setError("Maximum limit of 4 links exceeded. Please enter up to 4 links.");
      return;
    }

    setLoading(true);
    setError("");
    resetResults();

    try {
      if (mode === "video") {
        const data = await api.analyseVideo(parsedUrls);
        setVideoResponse(data);
        // Save first video as history
        if (data.videos.length > 0) {
          const first = data.videos[0];
          saveToHistory(first.id, first.title, first.channel_title, "video");
        }
      } else if (mode === "playlist") {
        const data = await api.analysePlaylist(parsedUrls);
        setPlaylistResponse(data);
        if (data.playlists.length > 0) {
          const first = data.playlists[0];
          saveToHistory(first.id, first.title, first.channel_title, "playlist");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Analysis query failed. Verify URLs, public accessibility, and API key settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadHistory = (item: HistoryItem) => {
    resetResults();
    setActiveMode(item.type);
    setInputText(item.id);
    handleAnalyse(item.id, item.type);
  };

  const hasResult = videoResponse || playlistResponse;

  return (
    <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 min-h-screen">
      
      {/* ----------------- LANDING & SEARCH HUB ----------------- */}
      {!hasResult && !loading && (
        <div className="flex-1 flex flex-col justify-center items-center py-16">
          
          {/* Hero Header */}
          <div className="text-center space-y-5 max-w-2xl mb-12 animate-fade-in">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/5 border border-zinc-800 px-3 py-1 rounded-full text-indigo-400 text-xs font-semibold">
              <Sparkles size={11} />
              <span>TubeIntel Platform — Business Intelligence</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight text-zinc-100">
              TubeIntel
            </h1>
            <p className="text-base md:text-lg text-zinc-400 font-medium max-w-lg mx-auto leading-relaxed">
              Deep Analytics for YouTube Videos and Playlists
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-zinc-900 p-1 border border-zinc-800 rounded-xl mb-6 gap-1 w-full max-w-sm">
            <button
              onClick={() => { setActiveMode("video"); setError(""); setInputText(""); }}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-lg cursor-pointer transition-all ${
                activeMode === "video" ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Video Analyzer
            </button>
            <button
              onClick={() => { setActiveMode("playlist"); setError(""); setInputText(""); }}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-lg cursor-pointer transition-all ${
                activeMode === "playlist" ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Playlist Analyzer
            </button>
          </div>

          {/* Form Area */}
          <div className="w-full max-w-md glass p-6 rounded-2xl border border-zinc-800 bg-zinc-850 space-y-5 mb-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  Paste Video or Playlist URL
                </label>
                <textarea
                  rows={4}
                  placeholder={
                    activeMode === "video"
                      ? "Paste video link(s)...\n- Single URL: analyzes stats & transcript\n- Multiple URLs (separated by space/comma): compares up to 4 videos"
                      : "Paste playlist link(s)...\n- Single URL: analyzes aggregations & speed multipliers\n- Multiple URLs: compares aggregates and per-position lessons"
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-600 rounded-xl p-3.5 text-xs text-zinc-200 outline-none transition-colors resize-none custom-scrollbar placeholder-zinc-750"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>

              {/* Action Button (Analyze) */}
              <div className="flex">
                <button
                  onClick={() => handleAnalyse()}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 px-4 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Search size={13} />
                  <span>Analyze</span>
                </button>
              </div>
            </div>

            {/* YouTube API Key settings */}
            {/* Error Message */}
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* History Panel */}
          {history.length > 0 && (
            <div className="w-full max-w-md space-y-3">
              <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <History size={12} />
                Recent Queries
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadHistory(item)}
                    className="glass p-3 rounded-xl flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-colors group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-[11px] font-bold text-zinc-300 truncate leading-normal" title={item.title}>
                        {item.title}
                      </p>
                      <p className="text-[9px] text-zinc-500 mt-0.5">{item.creator}</p>
                    </div>
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/5 group-hover:bg-indigo-600 group-hover:text-white px-2 py-0.5 rounded transition-all flex-shrink-0 capitalize border border-zinc-800">
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
          <h2 className="text-base font-bold text-zinc-350">Compiling Analytics...</h2>
          <p className="text-xs text-zinc-500 mt-2 max-w-xs text-center leading-relaxed">
            Fetching dataset statistics for each video/playlist URL, compiling duration matrices, and mapping engagement timelines.
          </p>
        </div>
      )}

      {/* ----------------- RESULTS VIEW ----------------- */}
      {hasResult && !loading && (
        <div className="flex-1 space-y-6">
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
              <span>Objective Analytics Engine</span>
            </div>
          </div>

          {videoResponse && <VideoDashboard response={videoResponse} />}
          {playlistResponse && <PlaylistDashboard response={playlistResponse} />}
        </div>
      )}

    </div>
  );
}
