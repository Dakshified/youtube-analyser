import React, { useState, useMemo, useEffect } from "react";
import { PlaylistMultiResponse, Playlist, PlaylistVideo, api, ReplayIntensity } from "../services/api";
import { 
  Play, Eye, Heart, MessageSquare, Clock, List, Calendar, ArrowRight, Download, BarChart3, ChevronDown, ChevronUp, Search, Share2, Layers
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface PlaylistDashboardProps {
  response: PlaylistMultiResponse;
}

export default function PlaylistDashboard({ response }: PlaylistDashboardProps) {
  const { playlists, comparison_metrics: metrics } = response;
  const isComparison = playlists.length > 1;

  // Comparison/Single states
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [selectedPlaylistIdx, setSelectedPlaylistIdx] = useState<number>(0);
  const [viewTab, setViewTab] = useState<"list" | "graph">("list");

  const activePlaylist = isComparison && !compareMode ? playlists[selectedPlaylistIdx] : playlists[0];
  const singlePlaylist = activePlaylist;

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"position" | "views" | "duration" | "likes" | "shares" | "comments">("position");
  const [sortAsc, setSortAsc] = useState(true);
  const [activeChart, setActiveChart] = useState<"duration" | "views" | "likes" | "comments" | "shares">("duration");

  // Multi-playlist lesson compare hooks
  const [selectedLessonIdx, setSelectedLessonIdx] = useState<number>(0);
  const [lessonReplays, setLessonReplays] = useState<Record<string, ReplayIntensity>>({});
  const [seekTimes, setSeekTimes] = useState<Record<string, number>>({});

  const formatDuration = (sec: number) => {
    const totalSecs = Math.round(sec);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    if (hrs > 0) {
      if (mins === 0 && secs === 0) return `${hrs}h`;
      if (secs === 0) return `${hrs}h ${mins}m`;
      return `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      if (secs === 0) return `${mins}m`;
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const calculateRatios = (video: any) => {
    const views = video.view_count;
    const likes = video.like_count;
    const shares = video.share_count;
    const comments = video.comment_count;

    return {
      viewToLike: likes > 0 ? (views / likes).toFixed(1) : "N/A",
      likeToViewPct: views > 0 ? ((likes / views) * 100).toFixed(2) : "0.00",
      
      viewToShare: shares > 0 ? (views / shares).toFixed(1) : "N/A",
      shareToViewPct: views > 0 ? ((shares / views) * 100).toFixed(2) : "0.00",
      
      viewToComment: comments > 0 ? (views / comments).toFixed(1) : "N/A",
      commentToViewPct: views > 0 ? ((comments / views) * 100).toFixed(2) : "0.00",
    };
  };

  const speedMultipliers = [
    { label: "1.00x", speed: 1.0 },
    { label: "1.25x", speed: 1.25 },
    { label: "1.50x", speed: 1.5 },
    { label: "1.75x", speed: 1.75 },
    { label: "2.00x", speed: 2.0 }
  ];

  // Single playlist search/sort logic
  const processedVideos = useMemo(() => {
    const isSingleActive = !isComparison || !compareMode;
    if (!isSingleActive || !singlePlaylist) return [];
    const list = [...singlePlaylist.videos];
    const filtered = list.filter(item => 
      item.video.title.toLowerCase().includes(search.toLowerCase())
    );
    filtered.sort((a, b) => {
      let valA = 0, valB = 0;
      if (sortField === "position") { valA = a.position; valB = b.position; }
      else if (sortField === "views") { valA = a.video.view_count; valB = b.video.view_count; }
      else if (sortField === "duration") { valA = a.video.duration_seconds; valB = b.video.duration_seconds; }
      else if (sortField === "likes") { valA = a.video.like_count; valB = b.video.like_count; }
      else if (sortField === "shares") { valA = a.video.share_count; valB = b.video.share_count; }
      else if (sortField === "comments") { valA = a.video.comment_count; valB = b.video.comment_count; }
      return sortAsc ? valA - valB : valB - valA;
    });
    return filtered;
  }, [singlePlaylist?.videos, search, sortField, sortAsc, isComparison, compareMode]);

  const singleChartData = useMemo(() => {
    const isSingleActive = !isComparison || !compareMode;
    if (!isSingleActive || !singlePlaylist) return [];
    return singlePlaylist.videos.map(item => ({
      position: item.position + 1,
      title: item.video.title.slice(0, 15),
      duration: Math.round(item.video.duration_seconds / 60),
      views: item.video.view_count,
      likes: item.video.like_count,
      comments: item.video.comment_count,
      shares: item.video.share_count
    }));
  }, [singlePlaylist?.videos, isComparison, compareMode]);

  // Max video count among compared playlists
  const maxVideoCount = useMemo(() => {
    if (!isComparison) return 0;
    return Math.max(...playlists.map(pl => pl.video_count));
  }, [playlists, isComparison]);

  // Fetch replay intensities for the currently selected lesson across compared playlists
  useEffect(() => {
    if (isComparison) {
      const fetchLessonReplays = async () => {
        const tempReplays: Record<string, ReplayIntensity> = {};
        for (const pl of playlists) {
          const videoJunction = pl.videos.find(v => v.position === selectedLessonIdx);
          if (videoJunction) {
            try {
              const data = await api.getReplayIntensity(videoJunction.video.id);
              tempReplays[pl.id] = data;
            } catch (e) {
              console.error(e);
            }
          }
        }
        setLessonReplays(tempReplays);
      };
      fetchLessonReplays();
      setSeekTimes({}); // Reset seeks
    }
  }, [selectedLessonIdx, playlists, isComparison]);

  // CSV Export
  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    const isExportComparison = isComparison && compareMode;

    if (!isExportComparison) {
      headers = ["Index", "Title", "Duration (Sec)", "Views", "Likes", "Comments", "Shares", "Publish Date"];
      rows = singlePlaylist.videos.map(item => [
        item.position + 1,
        item.video.title,
        item.video.duration_seconds,
        item.video.view_count,
        item.video.like_count,
        item.video.comment_count,
        item.video.share_count,
        item.video.publish_date
      ]);
    } else {
      headers = ["Metric", ...playlists.map((_, i) => `Playlist ${String.fromCharCode(65 + i)}`)];
      rows = [
        ["Title", ...playlists.map(p => p.title)],
        ["Channel", ...playlists.map(p => p.channel_title)],
        ["Videos", ...playlists.map(p => p.video_count)],
        ["Views", ...playlists.map(p => p.total_views)],
        ["Likes", ...playlists.map(p => p.total_likes)],
        ["Shares", ...playlists.map(p => p.total_shares)],
        ["Comments", ...playlists.map(p => p.total_comments)],
        ["Like to View Ratio (%)", ...playlists.map(p => p.total_views > 0 ? ((p.total_likes / p.total_views) * 100).toFixed(2) : "0.00")],
        ["Share to View Ratio (%)", ...playlists.map(p => p.total_views > 0 ? ((p.total_shares / p.total_views) * 100).toFixed(2) : "0.00")],
        ["Comment to View Ratio (%)", ...playlists.map(p => p.total_views > 0 ? ((p.total_comments / p.total_views) * 100).toFixed(2) : "0.00")],
        ["Duration (Seconds)", ...playlists.map(p => p.total_duration_seconds)]
      ];
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", isExportComparison ? "playlist_comparison.csv" : `${singlePlaylist.title.slice(0,25)}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export
  const handleExportPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let htmlContent = "";
    const isExportComparison = isComparison && compareMode;

    if (!isExportComparison) {
      htmlContent = `
        <h1>Playlist Report</h1>
        <div style="margin-bottom: 25px;">
          <strong style="font-size: 18px; color: #0f172a;">${singlePlaylist.title}</strong><br/>
          <span style="color:#64748b; font-size:13px;">Creator: ${singlePlaylist.channel_title} | Videos: ${singlePlaylist.video_count}</span>
        </div>
        <table>
          <thead>
            <tr><th>#</th><th>Video Title</th><th>Duration</th><th>Views</th></tr>
          </thead>
          <tbody>
            ${singlePlaylist.videos.map(item => `
              <tr>
                <td>${item.position + 1}</td>
                <td><strong>${item.video.title}</strong></td>
                <td>${formatDuration(item.video.duration_seconds)}</td>
                <td>${item.video.view_count.toLocaleString()}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    } else {
      htmlContent = `
        <h1>Playlist Comparison Report</h1>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              ${playlists.map((pl, i) => `<th>Playlist ${String.fromCharCode(65 + i)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            <tr><td>Title</td>${playlists.map(p => `<td><strong>${p.title}</strong></td>`).join("")}</tr>
            <tr><td>Creator</td>${playlists.map(p => `<td>${p.channel_title}</td>`).join("")}</tr>
            <tr><td>Videos</td>${playlists.map(p => `<td>${p.video_count}</td>`).join("")}</tr>
            <tr><td>Total Views</td>${playlists.map(p => `<td>${p.total_views.toLocaleString()}</td>`).join("")}</tr>
            <tr><td>Total Likes</td>${playlists.map(p => `<td>${p.total_likes.toLocaleString()}</td>`).join("")}</tr>
            <tr><td>Total Shares</td>${playlists.map(p => `<td>${p.total_shares.toLocaleString()}</td>`).join("")}</tr>
            <tr><td>Total Comments</td>${playlists.map(p => `<td>${p.total_comments.toLocaleString()}</td>`).join("")}</tr>
            <tr><td>Like to View Ratio</td>${playlists.map(p => `<td>${p.total_views > 0 ? ((p.total_likes / p.total_views) * 100).toFixed(2) : "0.00"}%</td>`).join("")}</tr>
            <tr><td>Share to View Ratio</td>${playlists.map(p => `<td>${p.total_views > 0 ? ((p.total_shares / p.total_views) * 100).toFixed(2) : "0.00"}%</td>`).join("")}</tr>
            <tr><td>Comment to View Ratio</td>${playlists.map(p => `<td>${p.total_views > 0 ? ((p.total_comments / p.total_views) * 100).toFixed(2) : "0.00"}%</td>`).join("")}</tr>
            <tr><td>Total Length</td>${playlists.map(p => `<td>${formatDuration(p.total_duration_seconds)}</td>`).join("")}</tr>
          </tbody>
        </table>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Playlist Report</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 45px; max-width: 900px; margin: 0 auto; color: #1e293b; line-height: 1.6; }
            h1 { font-size: 24px; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 25px; }
            th { background: #f1f5f9; padding: 10px; border-bottom: 2px solid #e2e8f0; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Recharts structures for comparison
  const chartDataSummary = isComparison ? playlists.map((p, i) => ({
    name: `Playlist ${String.fromCharCode(65 + i)}`,
    videos: p.video_count,
    duration: Math.round(p.total_duration_seconds / 3600)
  })) : [];

  const chartDataEngagement = isComparison ? playlists.map((p, i) => ({
    name: `Playlist ${String.fromCharCode(65 + i)}`,
    views: Math.round(p.total_views / 1000),
    likes: Math.round(p.total_likes / 100),
    shares: p.total_shares
  })) : [];

  return (
    <div className="space-y-6">
      
      {/* ----------------- TOP METRIC BAR ----------------- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/5 border border-zinc-800 px-2 py-0.5 rounded">
              {isComparison ? (compareMode ? "Multi-Playlist Comparison" : "Playlist Analyzer (Individual)") : "Playlist Analyzer"}
            </span>
          </div>
          <h2 className="text-base font-bold text-zinc-100 truncate mt-1">
            {isComparison 
              ? (compareMode ? `${playlists.length} Playlists Side-by-Side` : singlePlaylist.title)
              : singlePlaylist.title}
          </h2>
        </div>

        <div className="flex gap-2.5 w-full md:w-auto">
          <button
            onClick={handleExportCsv}
            className="flex-1 md:flex-initial bg-transparent hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <BarChart3 size={13} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="flex-1 md:flex-initial bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download size={13} />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* ----------------- COMPARE THEM PROMPT (2-4 Playlists) ----------------- */}
      {isComparison && (
        <div className="glass p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={13} className="text-indigo-600" />
              Multi-Playlist Analysis
            </h3>
            <p className="text-xs text-zinc-450 font-medium">
              Would you like to compare these {playlists.length} playlists side-by-side or inspect them individually?
            </p>
          </div>
          <div className="flex bg-zinc-950 p-1 border border-zinc-800 rounded-xl gap-1">
            <button
              onClick={() => setCompareMode(true)}
              className={`text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-all ${
                compareMode ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-350"
              }`}
            >
              Compare Side-by-Side
            </button>
            <button
              onClick={() => setCompareMode(false)}
              className={`text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-all ${
                !compareMode ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-350"
              }`}
            >
              Inspect Individually
            </button>
          </div>
        </div>
      )}

      {/* ----------------- SUB-SELECTOR FOR INDIVIDUAL ANALYSIS ----------------- */}
      {isComparison && !compareMode && (
        <div className="flex flex-wrap gap-2 bg-zinc-950/20 border border-zinc-800 p-3 rounded-2xl">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center h-8 mr-2">
            Select Playlist:
          </span>
          {playlists.map((pl, i) => (
            <button
              key={pl.id}
              onClick={() => setSelectedPlaylistIdx(i)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer truncate max-w-[180px] ${
                selectedPlaylistIdx === i
                  ? "bg-indigo-600/15 border-indigo-500 text-indigo-400 font-bold"
                  : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
              title={pl.title}
            >
              Playlist {String.fromCharCode(65 + i)}: {pl.title.slice(0, 15)}...
            </button>
          ))}
        </div>
      )}

      {/* ----------------- SINGLE PLAYLIST DASHBOARD ----------------- */}
      {(!isComparison || !compareMode) && singlePlaylist && (
        <div className="space-y-6">
          {/* Key aggregates row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="glass p-4 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Videos</span>
              <p className="text-lg font-extrabold text-zinc-200">{singlePlaylist.video_count}</p>
            </div>
            <div className="glass p-4 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Views</span>
              <p className="text-lg font-extrabold text-zinc-200">{singlePlaylist.total_views.toLocaleString()}</p>
            </div>
            <div className="glass p-4 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Likes</span>
              <p className="text-lg font-extrabold text-zinc-200">{singlePlaylist.total_likes.toLocaleString()}</p>
            </div>
            <div className="glass p-4 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Shares</span>
              <p className="text-lg font-extrabold text-zinc-200">{singlePlaylist.total_shares.toLocaleString()}</p>
            </div>
            <div className="glass p-4 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Comments</span>
              <p className="text-lg font-extrabold text-zinc-200">{singlePlaylist.total_comments.toLocaleString()}</p>
            </div>
          </div>

          {/* Speed Multipliers */}
          <div className="glass p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5"><Clock size={16} className="text-indigo-400" /> Duration Multipliers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">Total Duration</span>
                <p className="text-base font-extrabold text-indigo-400 mt-1">{formatDuration(singlePlaylist.total_duration_seconds)}</p>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">Average Video length</span>
                <p className="text-base font-extrabold text-zinc-200 mt-1">{formatDuration(singlePlaylist.average_duration_seconds)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {speedMultipliers.map((s, i) => {
                const durationSecs = singlePlaylist.total_duration_seconds / s.speed;
                return (
                  <div key={i} className="bg-zinc-950/40 border border-zinc-800 p-3 rounded-xl text-center">
                    <span className="text-[9px] text-zinc-500 font-bold">{s.label}</span>
                    <p className="text-xs font-extrabold text-zinc-200 mt-0.5">{formatDuration(durationSecs)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unified Lessons Index & Metrics Panel */}
          <div className="glass p-5 rounded-2xl space-y-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800/60 pb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <List size={16} className="text-indigo-400" />
                  Lessons Index & Analytics
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Explore, search, and benchmark videos in the playlist</p>
              </div>
              
              {/* Tab Selector */}
              <div className="flex bg-zinc-950/60 p-1 border border-zinc-800 rounded-xl gap-1">
                <button
                  onClick={() => setViewTab("list")}
                  className={`text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-all ${
                    viewTab === "list" ? "bg-indigo-600 text-white shadow-glow" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Detailed List View
                </button>
                <button
                  onClick={() => setViewTab("graph")}
                  className={`text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-all ${
                    viewTab === "graph" ? "bg-indigo-600 text-white shadow-glow" : "text-zinc-500 hover:text-indigo-400"
                  }`}
                >
                  Graph View
                </button>
              </div>
            </div>

            {/* Controls bar (always visible) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-950/30 p-3 rounded-xl border border-zinc-800/40">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 text-zinc-650" size={13} />
                <input
                  type="text"
                  placeholder="Search videos by title..."
                  className="w-full bg-zinc-950/60 border border-zinc-850 focus:border-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs text-zinc-200 outline-none transition-colors"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Sort by:</label>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as any)}
                    className="bg-zinc-950 border border-zinc-850 text-xs text-zinc-250 py-1.5 px-2.5 rounded-lg outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="position">Position (Index)</option>
                    <option value="views">Views count</option>
                    <option value="likes">Likes count</option>
                    <option value="shares">Shares count</option>
                    <option value="comments">Comments count</option>
                    <option value="duration">Video duration</option>
                  </select>
                </div>
                
                <button
                  onClick={() => setSortAsc(prev => !prev)}
                  className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 p-2 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  title={sortAsc ? "Sort Ascending" : "Sort Descending"}
                >
                  {sortAsc ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                </button>
              </div>
            </div>

            {/* View Rendering */}
            {viewTab === "list" ? (
              <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1 custom-scrollbar">
                {processedVideos.length > 0 ? (
                  processedVideos.map(item => (
                    <div
                      key={item.video.id}
                      className="bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700 p-3.5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors"
                    >
                      <div className="min-w-0 space-y-1">
                        <h4 className="text-xs font-bold text-zinc-250 leading-snug">
                          {item.position + 1}. {item.video.title}
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-medium">
                          Duration: {formatDuration(item.video.duration_seconds)} • Published: {item.video.publish_date}
                        </p>
                        <p className="text-[9px] text-zinc-400/80 font-medium flex flex-wrap gap-x-2 gap-y-1 pt-0.5">
                          <span>Like to View: {calculateRatios(item.video).likeToViewPct}% (1 like per {calculateRatios(item.video).viewToLike} views)</span>
                          <span className="text-zinc-700">•</span>
                          <span>Share to View: {calculateRatios(item.video).shareToViewPct}% (1 share per {calculateRatios(item.video).viewToShare} views)</span>
                          <span className="text-zinc-700">•</span>
                          <span>Comment to View: {calculateRatios(item.video).commentToViewPct}% (1 comment per {calculateRatios(item.video).viewToComment} views)</span>
                        </p>
                      </div>
                      
                      {/* Metrics Badges Row */}
                      <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <div className="flex items-center gap-1 bg-indigo-500/5 border border-indigo-500/10 px-2 py-0.5 rounded text-[10px] font-bold text-indigo-400">
                          <Eye size={11} />
                          <span>{item.video.view_count.toLocaleString()} views</span>
                        </div>
                        <div className="flex items-center gap-1 bg-pink-500/5 border border-pink-500/10 px-2 py-0.5 rounded text-[10px] font-bold text-pink-400">
                          <Heart size={11} />
                          <span>{item.video.like_count.toLocaleString()} likes</span>
                        </div>
                        <div className="flex items-center gap-1 bg-teal-500/5 border border-teal-500/10 px-2 py-0.5 rounded text-[10px] font-bold text-teal-400">
                          <Share2 size={11} />
                          <span>{item.video.share_count.toLocaleString()} shares</span>
                        </div>
                        <div className="flex items-center gap-1 bg-violet-500/5 border border-violet-500/10 px-2 py-0.5 rounded text-[10px] font-bold text-violet-400">
                          <MessageSquare size={11} />
                          <span>{item.video.comment_count.toLocaleString()} comments</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-xs text-zinc-500 italic bg-zinc-950/20 border border-dashed border-zinc-800 rounded-xl">
                    No videos matched your search query.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-zinc-950/20 p-2 rounded-xl border border-zinc-800/60">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Select Metric to Chart:</span>
                  <div className="flex gap-1">
                    {(["duration", "views", "likes", "comments", "shares"] as const).map(c => (
                      <button
                        key={c}
                        onClick={() => setActiveChart(c)}
                        className={`text-[9px] font-bold px-2 py-1 rounded cursor-pointer capitalize transition-colors ${
                          activeChart === c 
                            ? "bg-indigo-600 text-white shadow-glow" 
                            : "bg-zinc-950/40 text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-60 w-full bg-zinc-950/20 p-4 border border-zinc-800/40 rounded-xl">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={singleChartData}>
                      <XAxis dataKey="position" stroke="#52525b" fontSize={9} />
                      <YAxis stroke="#52525b" fontSize={9} />
                      <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a" }} />
                      <Bar dataKey={activeChart} fill="#6366f1" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- MULTI-PLAYLIST COMPARISON LAYOUT (2-4 Playlists) ----------------- */}
      {isComparison && compareMode && metrics && (
        <div className="space-y-6">
          {/* Comparison summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
            {playlists.map((pl, i) => {
              const totalViews = pl.total_views;
              const likeRate = totalViews > 0 ? ((pl.total_likes / totalViews) * 100).toFixed(2) : "0.00";
              const shareRate = totalViews > 0 ? ((pl.total_shares / totalViews) * 100).toFixed(2) : "0.00";
              const commentRate = totalViews > 0 ? ((pl.total_comments / totalViews) * 100).toFixed(2) : "0.00";

              return (
                <div key={pl.id} className="glass p-5 rounded-2xl space-y-4 hover:border-zinc-700 transition-colors">
                  <div className="flex gap-3 items-center">
                    <div className="w-14 aspect-video bg-zinc-900 rounded overflow-hidden border border-zinc-800 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pl.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Playlist {String.fromCharCode(65 + i)}</span>
                      <h3 className="text-xs font-bold text-zinc-100 leading-snug truncate mt-0.5" title={pl.title}>{pl.title}</h3>
                      <p className="text-[10px] text-zinc-550 mt-0.5">By {pl.channel_title}</p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-zinc-800 space-y-1.5 text-[10px] text-zinc-400">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Total Videos</span>
                      <span className="font-bold text-zinc-100">{pl.video_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Total Views</span>
                      <span className="font-bold text-zinc-100">{pl.total_views.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Overall Like Rate</span>
                      <span className="font-bold text-indigo-400">{likeRate}% <span className="text-[9px] text-zinc-500 font-medium">(1 per {pl.total_likes > 0 ? (totalViews / pl.total_likes).toFixed(0) : "N/A"} views)</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Overall Share Rate</span>
                      <span className="font-bold text-indigo-400">{shareRate}% <span className="text-[9px] text-zinc-500 font-medium">(1 per {pl.total_shares > 0 ? (totalViews / pl.total_shares).toFixed(0) : "N/A"} views)</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Overall Comment Rate</span>
                      <span className="font-bold text-indigo-400">{commentRate}% <span className="text-[9px] text-zinc-500 font-medium">(1 per {pl.total_comments > 0 ? (totalViews / pl.total_comments).toFixed(0) : "N/A"} views)</span></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Aggregates bench grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass p-4 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Highest Videos</span>
              <p className="text-base font-extrabold text-zinc-200">
                Playlist {String.fromCharCode(65 + metrics.highest_videos_idx)}
              </p>
              <span className="text-[10px] text-zinc-550">{playlists[metrics.highest_videos_idx].video_count} videos</span>
            </div>
            <div className="glass p-4 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Highest Views</span>
              <p className="text-base font-extrabold text-zinc-200">
                Playlist {String.fromCharCode(65 + metrics.highest_views_idx)}
              </p>
              <span className="text-[10px] text-zinc-550">{playlists[metrics.highest_views_idx].total_views.toLocaleString()} views</span>
            </div>
            <div className="glass p-4 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Highest Engagement</span>
              <p className="text-base font-extrabold text-zinc-200">
                Playlist {String.fromCharCode(65 + metrics.highest_likes_idx)}
              </p>
              <span className="text-[10px] text-zinc-550">{playlists[metrics.highest_likes_idx].total_likes.toLocaleString()} likes</span>
            </div>
            <div className="glass p-4 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Highest Shares</span>
              <p className="text-base font-extrabold text-zinc-200">
                Playlist {String.fromCharCode(65 + metrics.highest_shares_idx)}
              </p>
              <span className="text-[10px] text-zinc-550">{playlists[metrics.highest_shares_idx].total_shares.toLocaleString()} shares</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5"><Layers size={14} className="text-indigo-400" /> Structure comparison</h3>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataSummary}>
                    <XAxis dataKey="name" stroke="#52525b" fontSize={9} />
                    <YAxis stroke="#52525b" fontSize={9} />
                    <Tooltip contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", borderRadius: "10px" }} />
                    <Bar dataKey="videos" name="Videos count" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="duration" name="Total Duration (hrs)" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5"><Eye size={14} className="text-indigo-400" /> Engagement comparison</h3>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataEngagement}>
                    <XAxis dataKey="name" stroke="#52525b" fontSize={9} />
                    <YAxis stroke="#52525b" fontSize={9} />
                    <Tooltip contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", borderRadius: "10px" }} />
                    <Bar dataKey="views" name="Views (x1k)" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="likes" name="Likes (x100)" fill="#ec4899" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="shares" name="Shares" fill="#14b8a6" radius={[3, 3, 0, 0]} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Lesson-by-Lesson Video Comparison Hub (Feature 4 / Per-Video comparison) */}
          <div className="glass p-5 rounded-2xl space-y-5">
            <div>
              <h3 className="text-sm font-bold text-zinc-150 flex items-center gap-1.5">
                <Clock size={16} className="text-indigo-400" />
                Lesson-by-Lesson Video Comparison Hub
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Benchmark view count, like count, comment count, share count, and most replayed moments of videos at the same position side-by-side
              </p>
            </div>

            {/* Position Selector Dropdown */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-zinc-500 font-semibold uppercase">Select Position:</label>
              <select 
                value={selectedLessonIdx} 
                onChange={(e) => setSelectedLessonIdx(Number(e.target.value))}
                className="bg-zinc-950 border border-zinc-850 text-xs text-zinc-250 py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 cursor-pointer"
              >
                {Array.from({ length: maxVideoCount }).map((_, idx) => (
                  <option key={idx} value={idx}>
                    Lesson {idx + 1}
                  </option>
                ))}
              </select>
            </div>

            {/* Side-by-Side Video comparisons */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {playlists.map((pl, i) => {
                const videoJunction = pl.videos.find(v => v.position === selectedLessonIdx);
                const replayData = lessonReplays[pl.id];
                const seekVal = seekTimes[pl.id] || null;
                
                if (!videoJunction) {
                  return (
                    <div key={pl.id} className="glass p-4 rounded-xl border border-dashed border-zinc-800 flex items-center justify-center min-h-[300px] text-zinc-650 text-xs">
                      Playlist {String.fromCharCode(65 + i)} has no lesson at this position.
                    </div>
                  );
                }

                const { video } = videoJunction;
                
                return (
                  <div key={pl.id} className="glass p-4 rounded-xl space-y-4 border border-zinc-800 hover:border-zinc-700 transition-all bg-zinc-900">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-indigo-400 bg-indigo-500/5 border border-zinc-800 px-2 py-0.5 rounded">
                        Playlist {String.fromCharCode(65 + i)}
                      </span>
                      <h4 className="text-xs font-bold text-zinc-150 line-clamp-2 mt-2 leading-snug" title={video.title}>
                        {video.title}
                      </h4>
                    </div>

                    {/* Compact Seeking Embed */}
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-zinc-800">
                      <iframe
                        src={`https://www.youtube.com/embed/${video.id}?enablejsapi=1${seekVal !== null ? `&start=${Math.floor(seekVal)}&autoplay=1` : ""}`}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                      />
                    </div>

                    {/* Stats table */}
                    <div className="space-y-1.5 text-[10px] text-zinc-400">
                      <div className="flex justify-between border-b border-zinc-800 py-1">
                        <span>Views</span>
                        <strong className="text-zinc-200">{video.view_count.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800 py-1">
                        <span>Likes</span>
                        <strong className="text-zinc-200">{video.like_count.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800 py-1">
                        <span>Shares</span>
                        <strong className="text-zinc-200">{video.share_count.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800 py-1">
                        <span>Comments</span>
                        <strong className="text-zinc-200">{video.comment_count.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800 py-1">
                        <span>Like to View Ratio</span>
                        <strong className="text-zinc-200">{calculateRatios(video).likeToViewPct}% <span className="text-[9px] text-zinc-550 font-normal">({calculateRatios(video).viewToLike === "N/A" ? "N/A" : `1 per ${calculateRatios(video).viewToLike}`})</span></strong>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800 py-1">
                        <span>Share to View Ratio</span>
                        <strong className="text-zinc-200">{calculateRatios(video).shareToViewPct}% <span className="text-[9px] text-zinc-550 font-normal">({calculateRatios(video).viewToShare === "N/A" ? "N/A" : `1 per ${calculateRatios(video).viewToShare}`})</span></strong>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800 py-1">
                        <span>Comment to View Ratio</span>
                        <strong className="text-zinc-200">{calculateRatios(video).commentToViewPct}% <span className="text-[9px] text-zinc-550 font-normal">({calculateRatios(video).viewToComment === "N/A" ? "N/A" : `1 per ${calculateRatios(video).viewToComment}`})</span></strong>
                      </div>
                    </div>

                    {/* Most Replayed moments (timlinks seek seekTimes state) */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Most Replayed:</span>
                      <div className="flex flex-wrap gap-1">
                        {replayData?.peaks && replayData.peaks.length > 0 ? (
                          replayData.peaks.map((p, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSeekTimes(prev => ({ ...prev, [pl.id]: p.seconds }))}
                              className="text-[9px] font-bold text-indigo-400 bg-indigo-500/5 border border-zinc-800 hover:bg-indigo-600 hover:text-white px-2 py-0.5 rounded cursor-pointer transition-all"
                            >
                              {p.timestamp} ({p.intensity}%)
                            </button>
                          ))
                        ) : (
                          <span className="text-[10px] text-zinc-650 italic">None</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
