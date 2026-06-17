import React, { useState, useMemo } from "react";
import { Playlist, PlaylistVideo } from "../services/api";
import { 
  Play, Eye, Heart, MessageSquare, Clock, List, Calendar, ArrowRight, Download, BarChart3, ChevronDown, ChevronUp, Search
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface PlaylistDashboardProps {
  playlist: Playlist;
}

export default function PlaylistDashboard({ playlist }: PlaylistDashboardProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"position" | "views" | "duration">("position");
  const [sortAsc, setSortAsc] = useState(true);
  const [activeChart, setActiveChart] = useState<"duration" | "views" | "likes" | "comments">("duration");

  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return hrs > 0 
      ? `${hrs}h ${mins}m` 
      : `${mins}m ${secs}s`;
  };

  const speedMultipliers = [
    { label: "1.00x (Normal)", speed: 1.0 },
    { label: "1.25x (Fast)", speed: 1.25 },
    { label: "1.50x (Very Fast)", speed: 1.5 },
    { label: "1.75x (Super Fast)", speed: 1.75 },
    { label: "2.00x (Double Speed)", speed: 2.0 }
  ];

  const handleSort = (field: "position" | "views" | "duration") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filter and sort videos
  const processedVideos = useMemo(() => {
    const list = [...playlist.videos];
    const filtered = list.filter(item => 
      item.video.title.toLowerCase().includes(search.toLowerCase()) ||
      item.video.channel_title.toLowerCase().includes(search.toLowerCase())
    );

    filtered.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortField === "position") {
        valA = a.position;
        valB = b.position;
      } else if (sortField === "views") {
        valA = a.video.view_count;
        valB = b.video.view_count;
      } else if (sortField === "duration") {
        valA = a.video.duration_seconds;
        valB = b.video.duration_seconds;
      }

      return sortAsc ? valA - valB : valB - valA;
    });

    return filtered;
  }, [playlist.videos, search, sortField, sortAsc]);

  // Chart data
  const chartData = useMemo(() => {
    return playlist.videos.map(item => ({
      position: item.position + 1,
      title: item.video.title.slice(0, 20) + "...",
      duration: Math.round(item.video.duration_seconds / 60),
      views: item.video.view_count,
      likes: item.video.like_count,
      comments: item.video.comment_count
    }));
  }, [playlist.videos]);

  const handleExportCsv = () => {
    const headers = ["Index", "Title", "Duration (Seconds)", "Views", "Likes", "Comments", "Publish Date"];
    const rows = playlist.videos.map(item => [
      item.position + 1,
      item.video.title,
      item.video.duration_seconds,
      item.video.view_count,
      item.video.like_count,
      item.video.comment_count,
      item.video.publish_date
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(r => r.map(val => `"${val}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${playlist.title.slice(0,25)}_video_index.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>TubeIntel Playlist Report - ${playlist.title}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 45px; max-width: 900px; margin: 0 auto; color: #1e293b; line-height: 1.6; }
            h1 { font-size: 24px; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; color: #0f172a; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { border: 1px solid #e2e8f0; padding: 18px; border-radius: 10px; background: #f8fafc; }
            .metric { font-size: 20px; font-weight: bold; color: #6366f1; }
            .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 25px; }
            th { background: #f1f5f9; padding: 10px; border-bottom: 2px solid #e2e8f0; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>Playlist Analysis Report</h1>
          <div style="margin-bottom: 25px;">
            <strong style="font-size: 18px; color: #0f172a;">${playlist.title}</strong><br/>
            <span style="color:#64748b; font-size:13px;">Creator: ${playlist.channel_title} | Videos: ${playlist.video_count}</span>
          </div>

          <div class="grid">
            <div class="card">
              <span class="label">Aggregate Metrics</span>
              <p style="margin: 8px 0 0 0; font-size: 13px;">
                <strong>Total Views:</strong> ${playlist.total_views.toLocaleString()}<br/>
                <strong>Total Likes:</strong> ${playlist.total_likes.toLocaleString()}<br/>
                <strong>Total Comments:</strong> ${playlist.total_comments.toLocaleString()}<br/>
              </p>
            </div>
            <div class="card">
              <span class="label">Duration Details</span>
              <p style="margin: 8px 0 0 0; font-size: 13px;">
                <strong>Total Duration:</strong> ${formatDuration(playlist.total_duration_seconds)}<br/>
                <strong>Average Video Length:</strong> ${Math.round(playlist.average_duration_seconds / 60)} mins<br/>
                <strong>Longest Video:</strong> ${playlist.longest_video_title} (${formatDuration(playlist.longest_video_seconds)})<br/>
              </p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Duration</th>
                <th>Views</th>
              </tr>
            </thead>
            <tbody>
              ${playlist.videos.map(item => `
                <tr>
                  <td>${item.position + 1}</td>
                  <td><strong>${item.video.title}</strong></td>
                  <td>${Math.round(item.video.duration_seconds / 60)}m</td>
                  <td>${item.video.view_count.toLocaleString()}</td>
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

  const totalDurationHrs = playlist.total_duration_seconds / 3600;

  return (
    <div className="space-y-6">
      
      {/* ----------------- TOP METRIC BAR ----------------- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950/20 border border-zinc-900 p-4 rounded-2xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
              Playlist Analyzer
            </span>
            {playlist.is_mock && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                Demo Cache
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-zinc-100 truncate mt-1">{playlist.title}</h2>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={handleExportCsv}
            className="flex-1 md:flex-initial bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-850 text-zinc-350 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <BarChart3 size={13} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="flex-1 md:flex-initial bg-indigo-600 hover:bg-indigo-500 glow-btn text-white py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download size={13} />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* ----------------- LAYOUT GRID ----------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width on large) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Key Aggregate Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass p-4 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Videos</span>
              <p className="text-lg font-extrabold text-zinc-200">{playlist.video_count}</p>
            </div>
            
            <div className="glass p-4 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Total Views</span>
              <p className="text-lg font-extrabold text-zinc-200">{playlist.total_views.toLocaleString()}</p>
            </div>

            <div className="glass p-4 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Total Likes</span>
              <p className="text-lg font-extrabold text-zinc-200">{playlist.total_likes.toLocaleString()}</p>
            </div>

            <div className="glass p-4 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Total Comments</span>
              <p className="text-lg font-extrabold text-zinc-200">{playlist.total_comments.toLocaleString()}</p>
            </div>
          </div>

          {/* Duration Statistics */}
          <div className="glass p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5"><Clock size={16} className="text-indigo-400" /> Duration Analysis</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-zinc-900 pb-4">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">Total Duration</span>
                <p className="text-base font-extrabold text-indigo-400 mt-1">{formatDuration(playlist.total_duration_seconds)}</p>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">Average Video Duration</span>
                <p className="text-base font-extrabold text-zinc-200 mt-1">{Math.round(playlist.average_duration_seconds / 60)} mins</p>
              </div>
            </div>

            {/* Speeds Table */}
            <div className="space-y-2.5">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Playback speed duration multipliers</span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {speedMultipliers.map((speedObj, idx) => {
                  const durationSecs = playlist.total_duration_seconds / speedObj.speed;
                  const hrs = Math.floor(durationSecs / 3600);
                  const mins = Math.floor((durationSecs % 3600) / 60);
                  return (
                    <div key={idx} className="bg-zinc-950/40 border border-zinc-900/60 p-3 rounded-xl text-center space-y-0.5">
                      <span className="text-[10px] text-zinc-500 font-bold">{speedObj.speed.toFixed(2)}x</span>
                      <p className="text-xs font-extrabold text-zinc-200">
                        {hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Distribution Histograms (Feature 2) */}
          <div className="glass p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5"><BarChart3 size={16} className="text-indigo-400" /> Distribution Benchmarks</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Benchmarking statistics across all playlist lessons</p>
              </div>

              {/* Chart selector pills */}
              <div className="flex gap-1.5 bg-zinc-950/60 p-1 border border-zinc-900 rounded-lg">
                {(["duration", "views", "likes", "comments"] as const).map((chartType) => (
                  <button
                    key={chartType}
                    onClick={() => setActiveChart(chartType)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded cursor-pointer capitalize transition-colors ${
                      activeChart === chartType ? "bg-indigo-500/15 text-indigo-400" : "text-zinc-500 hover:text-zinc-350"
                    }`}
                  >
                    {chartType}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="position" stroke="#52525b" fontSize={9} />
                  <YAxis stroke="#52525b" fontSize={9} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "10px" }}
                    labelStyle={{ color: "#a1a1aa", fontSize: "10px", fontWeight: "bold" }}
                    itemStyle={{ color: "#e4e4e7", fontSize: "11px" }}
                  />
                  <Bar 
                    dataKey={activeChart} 
                    name={activeChart.charAt(0).toUpperCase() + activeChart.slice(1)} 
                    fill="#6366f1" 
                    radius={[3, 3, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column (1/3 width) - Searchable Table index */}
        <div className="glass p-5 rounded-2xl flex flex-col space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-150 flex items-center gap-1.5"><List size={16} /> Video Index</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Explore and sort videos inside playlist</p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-zinc-650" size={13} />
            <input
              type="text"
              placeholder="Search playlist videos..."
              className="w-full bg-zinc-950/60 border border-zinc-850 focus:border-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs text-zinc-200 outline-none transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Sort bar */}
          <div className="flex gap-2 text-[10px] text-zinc-500 font-bold bg-zinc-950/40 p-1.5 rounded-lg border border-zinc-900">
            <span className="text-zinc-600 self-center pl-1">Sort:</span>
            <button 
              onClick={() => handleSort("position")}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${sortField === "position" ? "bg-zinc-900 text-indigo-400" : "hover:text-zinc-350"}`}
            >
              Order {sortField === "position" && (sortAsc ? "▲" : "▼")}
            </button>
            <button 
              onClick={() => handleSort("duration")}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${sortField === "duration" ? "bg-zinc-900 text-indigo-400" : "hover:text-zinc-350"}`}
            >
              Length {sortField === "duration" && (sortAsc ? "▲" : "▼")}
            </button>
            <button 
              onClick={() => handleSort("views")}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${sortField === "views" ? "bg-zinc-900 text-indigo-400" : "hover:text-zinc-350"}`}
            >
              Views {sortField === "views" && (sortAsc ? "▲" : "▼")}
            </button>
          </div>

          {/* List index */}
          <div className="flex-1 min-h-[400px] lg:max-h-[600px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {processedVideos.length > 0 ? (
              processedVideos.map((item) => (
                <div 
                  key={item.video.id} 
                  className="bg-zinc-950/50 hover:bg-zinc-900/40 border border-zinc-900 hover:border-zinc-800 p-3 rounded-xl flex gap-3 transition-colors"
                >
                  <div className="w-10 h-7 rounded overflow-hidden bg-zinc-900 flex-shrink-0 self-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-zinc-350 leading-normal line-clamp-2" title={item.video.title}>
                      {item.position + 1}. {item.video.title}
                    </p>
                    <div className="flex items-center gap-2 text-[9px] text-zinc-500 mt-1 font-semibold">
                      <span className="text-zinc-450">{formatDuration(item.video.duration_seconds)}</span>
                      <span>•</span>
                      <span>{item.video.view_count.toLocaleString()} views</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-zinc-650 text-xs py-20">
                No videos match search query
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
