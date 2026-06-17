import React, { useState, useEffect } from "react";
import { Video, api, ReplayIntensity } from "../services/api";
import TranscriptViewer from "./TranscriptViewer";
import { 
  Play, Eye, Heart, MessageSquare, Percent, Calendar, Tag, FolderOpen,
  ArrowRight, Download, BarChart3, LineChart, Activity, Clock
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface VideoDashboardProps {
  video: Video;
  onExportCsv?: () => void;
}

export default function VideoDashboard({ video }: VideoDashboardProps) {
  const [replay, setReplay] = useState<ReplayIntensity | null>(null);
  const [loadingReplay, setLoadingReplay] = useState(false);
  const [seekTime, setSeekTime] = useState<number | null>(null);

  useEffect(() => {
    const fetchReplayData = async () => {
      setLoadingReplay(true);
      try {
        const data = await api.getReplayIntensity(video.id);
        setReplay(data);
      } catch (err) {
        console.error("Replay data failed:", err);
      } finally {
        setLoadingReplay(false);
      }
    };
    fetchReplayData();
    setSeekTime(null); // Reset seek time on video change
  }, [video.id]);

  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return hrs > 0 
      ? `${hrs}h ${mins}m ${secs}s` 
      : `${mins}m ${secs}s`;
  };

  const handleSeek = (seconds: number) => {
    setSeekTime(seconds);
  };

  const handleExportReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>TubeIntel Video Report - ${video.title}</title>
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
          <h1>Video Analytics Report</h1>
          <div style="margin-bottom: 25px;">
            <strong style="font-size: 18px; color: #0f172a;">${video.title}</strong><br/>
            <span style="color:#64748b; font-size:13px;">Channel: ${video.channel_title} | Published: ${video.publish_date}</span>
          </div>

          <div class="grid">
            <div class="card">
              <span class="label">Video Information</span>
              <p style="margin: 8px 0 0 0; font-size: 13px;">
                <strong>Category:</strong> ${video.category || 'N/A'}<br/>
                <strong>Duration:</strong> ${formatDuration(video.duration_seconds)}<br/>
                <strong>Age:</strong> ${Math.round((new Date().getTime() - new Date(video.publish_date).getTime()) / (1000 * 3600 * 24))} days<br/>
              </p>
            </div>
            <div class="card">
              <span class="label">Engagement Overview</span>
              <p style="margin: 8px 0 0 0; font-size: 13px;">
                <strong>Like/View Ratio:</strong> ${((video.like_count / video.view_count) * 100).toFixed(2)}%<br/>
                <strong>Views Per Day:</strong> ${Math.round(video.view_count / max(1, (new Date().getTime() - new Date(video.publish_date).getTime()) / (1000 * 3600 * 24)))}<br/>
              </p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Views</td>
                <td>${video.view_count.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Likes</td>
                <td>${video.like_count.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Comments</td>
                <td>${video.comment_count.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <script>
            function max(a, b) { return a > b ? a : b; }
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportCsv = () => {
    const headers = ["Metric", "Value"];
    const rows = [
      ["Title", video.title],
      ["Channel", video.channel_title],
      ["Publish Date", video.publish_date],
      ["Duration (Seconds)", video.duration_seconds],
      ["Category", video.category],
      ["Views", video.view_count],
      ["Likes", video.like_count],
      ["Comments", video.comment_count],
      ["Like/View Ratio (%)", ((video.like_count / video.view_count) * 100).toFixed(2)]
    ];
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(r => r.map(val => `"${val}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${video.title.slice(0,25)}_analytics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const videoAgeDays = Math.max(1, Math.round((new Date().getTime() - new Date(video.publish_date).getTime()) / (1000 * 3600 * 24)));
  const viewsPerDay = Math.round(video.view_count / videoAgeDays);
  const likesPerDay = Math.round(video.like_count / videoAgeDays);
  const commentsPerDay = Math.round(video.comment_count / videoAgeDays);

  return (
    <div className="space-y-6">
      
      {/* ----------------- TOP METRIC BAR ----------------- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950/20 border border-zinc-900 p-4 rounded-2xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
              Video Analyzer
            </span>
            {video.is_mock && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                Demo Cache
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-zinc-100 truncate mt-1">{video.title}</h2>
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
            onClick={handleExportReport}
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
          
          {/* IFrame Video Preview */}
          <div className="glass p-3 rounded-2xl">
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner">
              <iframe
                src={`https://www.youtube.com/embed/${video.id}?enablejsapi=1${seekTime !== null ? `&start=${Math.floor(seekTime)}&autoplay=1` : ""}`}
                className="absolute inset-0 w-full h-full border-0"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={video.title}
              />
            </div>
          </div>

          {/* Engagement Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-zinc-500">
                <span className="text-[10px] uppercase font-bold">Views</span>
                <Eye size={14} />
              </div>
              <p className="text-lg font-extrabold text-zinc-150">{video.view_count.toLocaleString()}</p>
            </div>
            
            <div className="glass p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-zinc-500">
                <span className="text-[10px] uppercase font-bold">Likes</span>
                <Heart size={14} className="text-rose-500/80" />
              </div>
              <p className="text-lg font-extrabold text-zinc-150">{video.like_count.toLocaleString()}</p>
            </div>

            <div className="glass p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-zinc-500">
                <span className="text-[10px] uppercase font-bold">Comments</span>
                <MessageSquare size={14} />
              </div>
              <p className="text-lg font-extrabold text-zinc-150">{video.comment_count.toLocaleString()}</p>
            </div>

            <div className="glass p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-zinc-500">
                <span className="text-[10px] uppercase font-bold">Like/View Ratio</span>
                <Percent size={14} />
              </div>
              <p className="text-lg font-extrabold text-zinc-150">
                {((video.like_count / video.view_count) * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Replay Intensity Plot (Feature 1) */}
          <div className="glass p-5 rounded-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <LineChart size={16} className="text-indigo-400" />
                Replay Intensity Timeline
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Heatmap of relative video segment retention peaks
              </p>
            </div>

            {replay ? (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={replay.chart_data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="replayGradient" x1="0" y1="0" x2="0" y2="1">
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
                    <Area type="monotone" dataKey="intensity" name="Intensity" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#replayGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center bg-zinc-950/20 border border-dashed border-zinc-850 rounded-xl text-xs text-zinc-650">
                Heatmap timeline data not available
              </div>
            )}
          </div>

          {/* Advanced Analytics (Feature 6) */}
          <div className="glass p-5 rounded-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <Activity size={16} className="text-indigo-400" />
                Advanced Stats (Daily Averages)
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Normalized daily increments calculated from video publication date
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-950/40 border border-zinc-900/60 p-4 rounded-xl">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">Views Per Day</span>
                <p className="text-base font-extrabold text-zinc-200 mt-1">{viewsPerDay.toLocaleString()}</p>
              </div>
              <div className="bg-zinc-950/40 border border-zinc-900/60 p-4 rounded-xl">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">Likes Per Day</span>
                <p className="text-base font-extrabold text-zinc-200 mt-1">{likesPerDay.toLocaleString()}</p>
              </div>
              <div className="bg-zinc-950/40 border border-zinc-900/60 p-4 rounded-xl">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">Comments Per Day</span>
                <p className="text-base font-extrabold text-zinc-200 mt-1">{commentsPerDay.toLocaleString()}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
          
          {/* Video Metadata Panel */}
          <div className="glass p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-100">Metadata Details</h3>
            
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                <span className="text-zinc-500 flex items-center gap-1.5"><Calendar size={13} /> Published</span>
                <span className="text-zinc-350 font-medium">{video.publish_date}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                <span className="text-zinc-500 flex items-center gap-1.5"><Clock size={13} /> Duration</span>
                <span className="text-zinc-350 font-medium">{formatDuration(video.duration_seconds)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                <span className="text-zinc-500 flex items-center gap-1.5"><FolderOpen size={13} /> Category</span>
                <span className="text-zinc-350 font-medium">{video.category || "Unknown"}</span>
              </div>
              
              <div className="py-2">
                <span className="text-zinc-500 flex items-center gap-1.5 mb-2"><Tag size={13} /> Tags</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {video.tags ? (
                    video.tags.split(",").map((tag, idx) => (
                      <span key={idx} className="bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-medium border border-zinc-800">
                        {tag.trim()}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-650 italic">No tags specified</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Most Replayed Heatmap List (Feature 1) */}
          <div className="glass p-5 rounded-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Most Replayed Peaks</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Top viewer retention timestamps</p>
            </div>

            <div className="space-y-2.5">
              {replay && replay.peaks.length > 0 ? (
                replay.peaks.map((peak, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleSeek(peak.seconds)}
                    className="bg-zinc-950/60 hover:bg-zinc-900/60 border border-zinc-900 hover:border-zinc-800 p-3 rounded-xl flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white p-1.5 rounded-lg transition-colors">
                        <Play size={12} fill="currentColor" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-350">{peak.timestamp}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Click to play peak</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
                        {peak.intensity}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-zinc-650 text-xs py-6">
                  No peaks available
                </div>
              )}
            </div>
          </div>

          {/* Transcript Viewer Panel */}
          <TranscriptViewer video={video} onSeek={handleSeek} />

        </div>

      </div>

    </div>
  );
}
