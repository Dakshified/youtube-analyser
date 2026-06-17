"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api, Playlist } from "./services/api";
import OverviewTab from "./components/OverviewTab";
import VideoTableTab from "./components/VideoTableTab";
import TranscriptTab from "./components/TranscriptTab";
import AISummaryTab from "./components/AISummaryTab";
import PlannerTab from "./components/PlannerTab";
import InsightsTab from "./components/InsightsTab";
import CompareTab from "./components/CompareTab";
import { 
  Play, 
  Search, 
  Scale, 
  Clock, 
  BookOpen, 
  Brain, 
  Layers, 
  Activity, 
  List, 
  Download, 
  ArrowLeft, 
  Sparkles,
  History,
  Info,
  AlertCircle
} from "lucide-react";

interface HistoryItem {
  id: string;
  title: string;
  creator: string;
  thumbnail: string;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [youtubeKey, setYoutubeKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "videos" | "transcript" | "ai" | "planner" | "insights" | "compare">("overview");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 1. Parse URL Parameter on load for deep linking
  useEffect(() => {
    // Read history from local storage
    const cachedHistory = localStorage.getItem("tubeintel_history");
    if (cachedHistory) {
      try {
        setHistory(JSON.parse(cachedHistory));
      } catch (e) {
        console.error(e);
      }
    }

    // Read cached YouTube API Key
    const cachedKey = localStorage.getItem("tubeintel_yt_key");
    if (cachedKey) {
      setYoutubeKey(cachedKey);
    }

    const params = new URLSearchParams(window.location.search);
    const playlistId = params.get("playlist");
    if (playlistId) {
      handleAnalyse(playlistId, true, cachedKey || "");
    }
  }, []);

  const handleAnalyse = async (targetUrl: string, isIdOnly = false, keyOverride?: string) => {
    if (!targetUrl.trim()) return;
    
    setLoading(true);
    setError("");
    setPlaylist(null);
    try {
      const activeKey = keyOverride !== undefined ? keyOverride : youtubeKey;
      const data = await api.analysePlaylist(targetUrl, activeKey);
      setPlaylist(data);
      
      // Update browser search params without full refresh
      const newUrl = `${window.location.pathname}?playlist=${data.id}`;
      window.history.pushState({ path: newUrl }, "", newUrl);

      // Save to History list
      const newItem: HistoryItem = {
        id: data.id,
        title: data.title,
        creator: data.channel_title,
        thumbnail: data.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&q=80"
      };
      
      setHistory((prev) => {
        const filtered = prev.filter(item => item.id !== data.id);
        const updated = [newItem, ...filtered].slice(0, 5); // limit to 5 items
        localStorage.setItem("tubeintel_history", JSON.stringify(updated));
        return updated;
      });
      
      setActiveTab("overview");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to retrieve playlist details. Check if URL is correct and public.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setPlaylist(null);
    setUrl("");
    // Clear URL parameters
    window.history.pushState({}, "", window.location.pathname);
  };

  const handleExportFullReport = () => {
    if (!playlist) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>TubeIntel AI - Playlist Report</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; color: #222; line-height: 1.6; }
            h1 { font-size: 26px; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 8px; color: #0f172a; }
            h2 { font-size: 20px; color: #4f46e5; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 30px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .card { border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; background: #f8fafc; }
            .meta { font-size: 14px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Playlist Intelligence Report: ${playlist.title}</h1>
          <div class="meta">
            <strong>Creator Channel:</strong> ${playlist.channel_title} <br/>
            <strong>Total Course length:</strong> ${Math.round(playlist.total_duration_seconds / 3600)} hours <br/>
            <strong>Total Lessons:</strong> ${playlist.video_count} videos <br/>
            <strong>Learning Density Score:</strong> ${playlist.learning_score} / 100 <br/>
            <strong>Difficulty Estimate:</strong> ${playlist.difficulty}
          </div>
          
          <div class="grid">
            <div class="card">
              <h3 style="margin-top:0;color:#6366f1;">Course Structure Stats</h3>
              <p>Average Lecture: ${Math.round(playlist.average_duration_seconds / 60)} mins</p>
              <p>Shortest Video: ${Math.round(playlist.shortest_video_seconds / 60)} mins</p>
              <p>Longest Video: ${Math.round(playlist.longest_video_seconds / 60)} mins</p>
            </div>
            <div class="card">
              <h3 style="margin-top:0;color:#6366f1;">Estimated Skill Gains</h3>
              <ul style="padding-left: 20px; font-size: 13px;">
                ${(JSON.parse(playlist.skills || "[]") as string[]).map(s => `<li>${s}</li>`).join("")}
              </ul>
            </div>
          </div>
          
          <h2>Full Video Index</h2>
          <table style="width:100%; border-collapse: collapse; text-align: left; font-size:13px;">
            <thead>
              <tr style="background:#f1f5f9; border-bottom:2px solid #e2e8f0;">
                <th style="padding:8px;">#</th>
                <th style="padding:8px;">Lesson Title</th>
                <th style="padding:8px;">Duration</th>
                <th style="padding:8px;">Views</th>
              </tr>
            </thead>
            <tbody>
              ${playlist.videos.map(v => `
                <tr style="border-b: 1px solid #f1f5f9;">
                  <td style="padding:8px;">${v.position + 1}</td>
                  <td style="padding:8px; font-weight:bold;">${v.title}</td>
                  <td style="padding:8px;">${Math.round(v.duration_seconds / 60)}m</td>
                  <td style="padding:8px;">${v.view_count.toLocaleString()}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 min-h-screen">
      
      {/* ----------------- LANDING SEARCH VIEW ----------------- */}
      {!playlist && !loading && (
        <div className="flex-1 flex flex-col justify-center items-center py-12">
          
          {/* Main Hero Header */}
          <div className="text-center space-y-4 max-w-2xl mb-10">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-indigo-400 text-xs font-semibold">
              <Sparkles size={12} />
              <span>Release 1.0 — Powered by Gemini AI</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
              TubeIntel AI
            </h1>
            <p className="text-base text-zinc-400 font-medium">
              Turn YouTube Playlists Into Actionable Learning Intelligence
            </p>
          </div>

          {/* Search Card */}
          <div className="w-full max-w-xl glass p-6 rounded-2xl shadow-glow space-y-4 mb-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Paste YouTube playlist link or list ID..."
                  className="w-full bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-200 outline-none transition-colors"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyse(url)}
                />
              </div>
              <button
                onClick={() => handleAnalyse(url)}
                className="bg-indigo-600 hover:bg-indigo-500 glow-btn text-white rounded-xl py-3 px-6 text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Analyse Playlist</span>
              </button>
            </div>

            {/* YouTube API Key input */}
            <div className="border-t border-zinc-900 pt-3 flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                  YouTube API Key (Required for custom playlists)
                </label>
                <a 
                  href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[10px] text-indigo-400 hover:underline"
                >
                  Get Key
                </a>
              </div>
              <input
                type="password"
                placeholder="Enter YouTube API Key..."
                className="w-full bg-zinc-950/40 border border-zinc-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-xs text-zinc-350 outline-none transition-colors"
                value={youtubeKey}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setYoutubeKey(val);
                  localStorage.setItem("tubeintel_yt_key", val);
                }}
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="text-[11px] text-zinc-500 text-center flex justify-center items-center gap-1">
              <Info size={12} />
              <span>Supports all public playlists. Demo runs offline if API key is missing.</span>
            </div>
          </div>

          {/* Search History list */}
          {history.length > 0 && (
            <div className="w-full max-w-xl space-y-3">
              <h3 className="text-xs text-zinc-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <History size={12} />
                Recent Analytics
              </h3>
              <div className="space-y-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleAnalyse(item.id)}
                    className="glass p-3 rounded-xl flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="w-12 aspect-video bg-zinc-900 border border-zinc-850 rounded overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-300 truncate" title={item.title}>
                          {item.title}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{item.creator}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                      Load
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ----------------- LOADER VIEW ----------------- */}
      {loading && (
        <div className="flex-1 flex flex-col justify-center items-center py-20">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-zinc-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-indigo-500 animate-spin"></div>
          </div>
          <h2 className="text-lg font-bold text-zinc-300">Extracting Playlist Dataset...</h2>
          <p className="text-xs text-zinc-500 mt-2 max-w-xs text-center leading-relaxed">
            Downloading video metadata tags, summing durations, mapping keyword vectors, and configuring lesson schedules.
          </p>
        </div>
      )}

      {/* ----------------- DASHBOARD PANEL VIEW ----------------- */}
      {playlist && !loading && (
        <div className="flex-1 flex flex-col lg:flex-row gap-6">
          
          {/* Sidebar Navigation */}
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-4">
            
            {/* Start Over button */}
            <button
              onClick={handleStartOver}
              className="w-full bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-zinc-200 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <ArrowLeft size={14} /> Back to Search
            </button>

            {/* Sidebar menu items */}
            <div className="glass p-3 rounded-2xl flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
              
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex-shrink-0 lg:w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 cursor-pointer transition-all ${
                  activeTab === "overview" ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Activity size={16} /> Overview & Analytics
              </button>

              <button
                onClick={() => setActiveTab("videos")}
                className={`flex-shrink-0 lg:w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 cursor-pointer transition-all ${
                  activeTab === "videos" ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <List size={16} /> Video Index Table
              </button>

              <button
                onClick={() => setActiveTab("transcript")}
                className={`flex-shrink-0 lg:w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 cursor-pointer transition-all ${
                  activeTab === "transcript" ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Clock size={16} /> Caption Intelligence
              </button>

              <button
                onClick={() => setActiveTab("ai")}
                className={`flex-shrink-0 lg:w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 cursor-pointer transition-all ${
                  activeTab === "ai" ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Brain size={16} /> AI Summary & Notes
              </button>

              <button
                onClick={() => setActiveTab("planner")}
                className={`flex-shrink-0 lg:w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 cursor-pointer transition-all ${
                  activeTab === "planner" ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <BookOpen size={16} /> Smart Study Planner
              </button>

              <button
                onClick={() => setActiveTab("insights")}
                className={`flex-shrink-0 lg:w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 cursor-pointer transition-all ${
                  activeTab === "insights" ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Layers size={16} /> Prereqs & Skills
              </button>

              <button
                onClick={() => setActiveTab("compare")}
                className={`flex-shrink-0 lg:w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 cursor-pointer transition-all ${
                  activeTab === "compare" ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Scale size={16} /> Compare Playlists
              </button>

            </div>
          </aside>

          {/* Main Dashboard Content Area */}
          <main className="flex-1 space-y-6">
            
            {/* Active Playlist Header summary */}
            <div className="glass p-5 rounded-2xl flex flex-col md:flex-row gap-5 items-center justify-between">
              <div className="flex items-center space-x-4 min-w-0 w-full md:w-auto">
                <div className="w-20 aspect-video bg-zinc-900 border border-zinc-850 rounded overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={playlist.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&q=80"} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-zinc-100 truncate" title={playlist.title}>
                    {playlist.title}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Course by <span className="font-semibold text-zinc-400">{playlist.channel_title}</span>
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleExportFullReport}
                className="w-full md:w-auto bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download size={14} /> Playlist Report PDF
              </button>
            </div>

            {/* Render Tab Panel */}
            <div className="min-h-[400px]">
              {activeTab === "overview" && <OverviewTab playlist={playlist} />}
              {activeTab === "videos" && <VideoTableTab playlist={playlist} />}
              {activeTab === "transcript" && <TranscriptTab playlist={playlist} />}
              {activeTab === "ai" && <AISummaryTab playlist={playlist} />}
              {activeTab === "planner" && <PlannerTab playlist={playlist} />}
              {activeTab === "insights" && <InsightsTab playlist={playlist} />}
              {activeTab === "compare" && <CompareTab playlist={playlist} />}
            </div>

          </main>
          
        </div>
      )}

    </div>
  );
}
