import React, { useState, useEffect } from "react";
import { VideoMultiResponse, Video, api, ReplayIntensity } from "../services/api";
import TranscriptViewer from "./TranscriptViewer";
import { 
  Play, Eye, Heart, MessageSquare, Percent, Calendar, Tag, FolderOpen,
  ArrowRight, Download, BarChart3, LineChart, Activity, Clock, Share2
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface VideoDashboardProps {
  response: VideoMultiResponse;
  onLoadVideo?: (v: Video) => void;
}

export default function VideoDashboard({ response }: VideoDashboardProps) {
  const { videos, comparison_metrics: metrics } = response;
  const isComparison = videos.length > 1;

  // Comparison/Single hooks
  const [compareMode, setCompareMode] = useState<boolean>(true);
  const [selectedVideoIdx, setSelectedVideoIdx] = useState<number>(0);

  const activeVideo = isComparison && !compareMode ? videos[selectedVideoIdx] : videos[0];
  const singleVideo = activeVideo;

  const [replay, setReplay] = useState<ReplayIntensity | null>(null);
  const [seekTime, setSeekTime] = useState<number | null>(null);

  useEffect(() => {
    if (activeVideo) {
      const fetchReplayData = async () => {
        try {
          const data = await api.getReplayIntensity(activeVideo.id);
          setReplay(data);
        } catch (err) {
          console.error("Replay data failed:", err);
          setReplay(null);
        }
      };
      fetchReplayData();
      setSeekTime(null);
    }
  }, [activeVideo?.id]);

  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return hrs > 0 
      ? `${hrs}h ${mins}m` 
      : `${mins}m ${secs}s`;
  };

  // CSV Export
  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    const isExportComparison = isComparison && compareMode;

    if (!isExportComparison) {
      headers = ["Metric", "Value"];
      rows = [
        ["Title", singleVideo.title],
        ["Channel", singleVideo.channel_title],
        ["Publish Date", singleVideo.publish_date],
        ["Duration (Seconds)", singleVideo.duration_seconds],
        ["Views", singleVideo.view_count],
        ["Likes", singleVideo.like_count],
        ["Comments", singleVideo.comment_count],
        ["Shares", singleVideo.share_count],
        ["Like/View Ratio (%)", ((singleVideo.like_count / singleVideo.view_count) * 100).toFixed(2)]
      ];
    } else {
      headers = ["Metric", ...videos.map((_, i) => `Video ${String.fromCharCode(65 + i)}`)];
      rows = [
        ["Title", ...videos.map(v => v.title)],
        ["Channel", ...videos.map(v => v.channel_title)],
        ["Publish Date", ...videos.map(v => v.publish_date)],
        ["Duration (Seconds)", ...videos.map(v => v.duration_seconds)],
        ["Views", ...videos.map(v => v.view_count)],
        ["Likes", ...videos.map(v => v.like_count)],
        ["Comments", ...videos.map(v => v.comment_count)],
        ["Shares", ...videos.map(v => v.share_count)],
      ];
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", isExportComparison ? "video_comparison_report.csv" : `${singleVideo.title.slice(0,25)}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export
  const handleExportReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let htmlContent = "";
    const isExportComparison = isComparison && compareMode;

    if (!isExportComparison) {
      htmlContent = `
        <h1>Video Analytics Report</h1>
        <div style="margin-bottom: 25px;">
          <strong style="font-size: 18px; color: #0f172a;">${singleVideo.title}</strong><br/>
          <span style="color:#64748b; font-size:13px;">Channel: ${singleVideo.channel_title} | Published: ${singleVideo.publish_date}</span>
        </div>
        <table>
          <thead>
            <tr><th>Metric</th><th>Value</th></tr>
          </thead>
          <tbody>
            <tr><td>Views</td><td>${singleVideo.view_count.toLocaleString()}</td></tr>
            <tr><td>Likes</td><td>${singleVideo.like_count.toLocaleString()}</td></tr>
            <tr><td>Comments</td><td>${singleVideo.comment_count.toLocaleString()}</td></tr>
            <tr><td>Shares</td><td>${singleVideo.share_count.toLocaleString()}</td></tr>
            <tr><td>Duration</td><td>${formatDuration(singleVideo.duration_seconds)}</td></tr>
            <tr><td>Category</td><td>${singleVideo.category || 'N/A'}</td></tr>
          </tbody>
        </table>
      `;
    } else {
      htmlContent = `
        <h1>Multi-Video Comparison Report</h1>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              ${videos.map((v, i) => `<th>Video ${String.fromCharCode(65 + i)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            <tr><td>Title</td>${videos.map(v => `<td><strong>${v.title}</strong></td>`).join("")}</tr>
            <tr><td>Channel</td>${videos.map(v => `<td>${v.channel_title}</td>`).join("")}</tr>
            <tr><td>Views</td>${videos.map(v => `<td>${v.view_count.toLocaleString()}</td>`).join("")}</tr>
            <tr><td>Likes</td>${videos.map(v => `<td>${v.like_count.toLocaleString()}</td>`).join("")}</tr>
            <tr><td>Comments</td>${videos.map(v => `<td>${v.comment_count.toLocaleString()}</td>`).join("")}</tr>
            <tr><td>Shares</td>${videos.map(v => `<td>${v.share_count.toLocaleString()}</td>`).join("")}</tr>
            <tr><td>Duration</td>${videos.map(v => `<td>${formatDuration(v.duration_seconds)}</td>`).join("")}</tr>
          </tbody>
        </table>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>TubeIntel Video Report</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 45px; max-width: 900px; margin: 0 auto; color: #1e293b; line-height: 1.6; }
            h1 { font-size: 24px; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 25px; }
            th { background: #f1f5f9; padding: 10px; border-bottom: 2px solid #e2e8f0; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; vertical-align: top; }
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

  // Charts data for comparisons
  const chartDataViews = isComparison ? videos.map((v, i) => ({
    name: `Video ${String.fromCharCode(65 + i)}`,
    views: v.view_count,
    title: v.title.slice(0, 15)
  })) : [];

  const chartDataEngagement = isComparison ? videos.map((v, i) => ({
    name: `Video ${String.fromCharCode(65 + i)}`,
    likes: v.like_count,
    comments: v.comment_count,
    shares: v.share_count
  })) : [];

  const handleSeek = (seconds: number) => {
    setSeekTime(seconds);
  };

  return (
    <div className="space-y-6">
      
      {/* ----------------- TOP METRIC BAR ----------------- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950/20 border border-zinc-900 p-4 rounded-2xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
              {isComparison ? (compareMode ? "Multi-Video Comparison" : "Video Analyzer (Individual)") : "Video Analyzer"}
            </span>
          </div>
          <h2 className="text-base font-bold text-zinc-100 truncate mt-1">
            {isComparison 
              ? (compareMode ? `${videos.length} Videos Side-by-Side` : singleVideo.title)
              : singleVideo.title}
          </h2>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={handleExportCsv}
            className="flex-1 md:flex-initial bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-850 text-zinc-355 py-2 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <BarChart3 size={13} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportReport}
            className="flex-1 md:flex-initial bg-indigo-600 hover:bg-indigo-500 glow-btn text-white py-2 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download size={13} />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* ----------------- COMPARE THEM PROMPT (2-4 Videos) ----------------- */}
      {isComparison && (
        <div className="glass p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={13} />
              Multi-Video Analysis Detected
            </h3>
            <p className="text-xs text-zinc-350 font-medium">
              Would you like to compare these {videos.length} videos side-by-side or inspect them individually?
            </p>
          </div>
          <div className="flex bg-zinc-950/80 p-1 border border-zinc-850 rounded-xl gap-1">
            <button
              onClick={() => setCompareMode(true)}
              className={`text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-all ${
                compareMode ? "bg-indigo-600 text-white shadow-glow" : "text-zinc-500 hover:text-zinc-350"
              }`}
            >
              Compare Side-by-Side
            </button>
            <button
              onClick={() => setCompareMode(false)}
              className={`text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-all ${
                !compareMode ? "bg-indigo-600 text-white shadow-glow" : "text-zinc-500 hover:text-zinc-355"
              }`}
            >
              Inspect Individually
            </button>
          </div>
        </div>
      )}

      {/* ----------------- SUB-SELECTOR FOR INDIVIDUAL ANALYSIS ----------------- */}
      {isComparison && !compareMode && (
        <div className="flex flex-wrap gap-2 bg-zinc-950/20 border border-zinc-900 p-3 rounded-2xl">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center h-8 mr-2">
            Select Video:
          </span>
          {videos.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setSelectedVideoIdx(i)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer truncate max-w-[180px] ${
                selectedVideoIdx === i
                  ? "bg-indigo-600/15 border-indigo-500 text-indigo-400 font-bold"
                  : "bg-zinc-950/40 border-zinc-900 text-zinc-400 hover:border-zinc-800"
              }`}
              title={v.title}
            >
              Video {String.fromCharCode(65 + i)}: {v.title.slice(0, 15)}...
            </button>
          ))}
        </div>
      )}

      {/* ----------------- SINGLE VIDEO LAYOUT ----------------- */}
      {(!isComparison || !compareMode) && singleVideo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass p-3 rounded-2xl">
              <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner">
                <iframe
                  src={`https://www.youtube.com/embed/${singleVideo.id}?enablejsapi=1${seekTime !== null ? `&start=${Math.floor(seekTime)}&autoplay=1` : ""}`}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  title={singleVideo.title}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass p-4 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Views</span>
                <p className="text-lg font-extrabold text-zinc-150">{singleVideo.view_count.toLocaleString()}</p>
              </div>
              <div className="glass p-4 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Likes</span>
                <p className="text-lg font-extrabold text-zinc-150">{singleVideo.like_count.toLocaleString()}</p>
              </div>
              <div className="glass p-4 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Shares</span>
                <p className="text-lg font-extrabold text-zinc-150">{singleVideo.share_count.toLocaleString()}</p>
              </div>
              <div className="glass p-4 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Comments</span>
                <p className="text-lg font-extrabold text-zinc-150">{singleVideo.comment_count.toLocaleString()}</p>
              </div>
            </div>

            {/* Replay graph */}
            <div className="glass p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <LineChart size={16} className="text-indigo-400" />
                Replay Intensity Timeline
              </h3>
              {replay ? (
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={replay.chart_data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="singleReplayGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" stroke="#52525b" fontSize={9} />
                      <YAxis stroke="#52525b" fontSize={9} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "10px" }}
                        labelStyle={{ color: "#a1a1aa", fontSize: "10px", fontWeight: "bold" }}
                        itemStyle={{ color: "#e4e4e7", fontSize: "11px" }}
                      />
                      <Area type="monotone" dataKey="intensity" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#singleReplayGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center bg-zinc-950/20 border border-dashed border-zinc-850 rounded-xl text-xs text-zinc-650">
                  Timeline retention peaks loading...
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass p-5 rounded-2xl space-y-3.5 text-xs">
              <h3 className="text-sm font-bold text-zinc-100">Metadata Details</h3>
              <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                <span className="text-zinc-500">Published</span>
                <span className="text-zinc-350 font-medium">{singleVideo.publish_date}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                <span className="text-zinc-500">Duration</span>
                <span className="text-zinc-350 font-medium">{formatDuration(singleVideo.duration_seconds)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                <span className="text-zinc-500">Category</span>
                <span className="text-zinc-350 font-medium">{singleVideo.category || "Unknown"}</span>
              </div>
            </div>

            {/* Replay peaks */}
            <div className="glass p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-zinc-150">Viewer Retention Peaks</h3>
              <div className="space-y-2.5">
                {replay?.peaks.map((peak, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSeekTime(peak.seconds)}
                    className="bg-zinc-950/60 hover:bg-zinc-900/60 border border-zinc-900 p-3 rounded-xl flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Play size={10} className="text-indigo-400" fill="currentColor" />
                      <span className="text-xs font-bold text-zinc-300">{peak.timestamp}</span>
                    </div>
                    <span className="text-xs font-extrabold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
                      {peak.intensity}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <TranscriptViewer video={singleVideo} onSeek={handleSeek} />
          </div>
        </div>
      )}

      {/* ----------------- MULTI-VIDEO COMPARISON LAYOUT (2-4 Videos) ----------------- */}
      {isComparison && compareMode && metrics && (
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {videos.map((v, i) => (
              <div key={v.id} className="glass p-5 rounded-2xl space-y-4 border-t-4 border-t-indigo-500">
                <div className="w-14 aspect-video bg-zinc-900 rounded overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="text-[10px] text-indigo-400 font-bold uppercase">Video {String.fromCharCode(65 + i)}</span>
                  <h3 className="text-xs font-bold text-zinc-150 leading-snug truncate mt-1" title={v.title}>{v.title}</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">By {v.channel_title}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Side-by-Side Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Views Compare */}
            <div className="glass p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5"><Eye size={14} className="text-indigo-400" /> Views</h3>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataViews}>
                    <XAxis dataKey="name" stroke="#52525b" fontSize={9} />
                    <YAxis stroke="#52525b" fontSize={9} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "10px" }}
                      labelStyle={{ color: "#a1a1aa", fontSize: "10px" }}
                    />
                    <Bar dataKey="views" name="Views" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Engagement Compare */}
            <div className="glass p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5"><Heart size={14} className="text-indigo-400" /> Engagement</h3>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataEngagement}>
                    <XAxis dataKey="name" stroke="#52525b" fontSize={9} />
                    <YAxis stroke="#52525b" fontSize={9} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "10px" }}
                      labelStyle={{ color: "#a1a1aa", fontSize: "10px" }}
                    />
                    <Bar dataKey="likes" name="Likes" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="comments" name="Comments" fill="#ec4899" radius={[3, 3, 0, 0]} />
                    <Legend wrapperStyle={{ fontSize: 8, pt: 3 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Shares Compare */}
            <div className="glass p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5"><Share2 size={14} className="text-indigo-400" /> Shares</h3>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataEngagement}>
                    <XAxis dataKey="name" stroke="#52525b" fontSize={9} />
                    <YAxis stroke="#52525b" fontSize={9} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "10px" }}
                      labelStyle={{ color: "#a1a1aa", fontSize: "10px" }}
                    />
                    <Bar dataKey="shares" name="Shares" fill="#14b8a6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Benchmarking Comparison Table */}
          <div className="glass p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-150">Benchmark comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase">
                    <th className="py-3 px-2">Metric</th>
                    {videos.map((_, i) => (
                      <th key={i} className="py-3 px-2">Video {String.fromCharCode(65 + i)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60 font-medium text-zinc-350">
                  <tr>
                    <td className="py-3 px-2 text-zinc-500 font-bold">Views</td>
                    {videos.map((v, i) => (
                      <td key={i} className={`py-3 px-2 ${metrics.highest_views_idx === i ? "text-indigo-400 font-bold" : ""}`}>
                        {v.view_count.toLocaleString()} {metrics.highest_views_idx === i && "★"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-zinc-500 font-bold">Likes</td>
                    {videos.map((v, i) => (
                      <td key={i} className={`py-3 px-2 ${metrics.highest_likes_idx === i ? "text-indigo-400 font-bold" : ""}`}>
                        {v.like_count.toLocaleString()} {metrics.highest_likes_idx === i && "★"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-zinc-500 font-bold">Shares</td>
                    {videos.map((v, i) => (
                      <td key={i} className={`py-3 px-2 ${metrics.highest_shares_idx === i ? "text-indigo-400 font-bold" : ""}`}>
                        {v.share_count.toLocaleString()} {metrics.highest_shares_idx === i && "★"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-zinc-500 font-bold">Comments</td>
                    {videos.map((v, i) => (
                      <td key={i} className={`py-3 px-2 ${metrics.highest_comments_idx === i ? "text-indigo-400 font-bold" : ""}`}>
                        {v.comment_count.toLocaleString()} {metrics.highest_comments_idx === i && "★"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-zinc-500 font-bold">Duration</td>
                    {videos.map((v, i) => (
                      <td key={i} className={`py-3 px-2 ${metrics.highest_duration_idx === i ? "text-indigo-400 font-bold" : ""}`}>
                        {formatDuration(v.duration_seconds)} {metrics.highest_duration_idx === i && "★"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-zinc-500 font-bold">Views / Day (Avg)</td>
                    {videos.map((_, i) => (
                      <td key={i} className="py-3 px-2">
                        {metrics.views_per_day[i].toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-zinc-500 font-bold">Like/View Ratio</td>
                    {videos.map((_, i) => (
                      <td key={i} className="py-3 px-2">
                        {metrics.like_view_ratios[i]}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-zinc-500 font-bold">Publish Date</td>
                    {videos.map((v, i) => (
                      <td key={i} className="py-3 px-2">{v.publish_date}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
