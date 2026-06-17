import React, { useState, useMemo } from "react";
import { ChannelMultiResponse, Channel, Video, api } from "../services/api";
import { 
  Eye, Heart, MessageSquare, Clock, List, Calendar, Download, BarChart3, ChevronDown, ChevronUp, Search, Share2, Layers, Users, Globe, Video as VideoIcon, TrendingUp, Sliders
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ScatterChart, Scatter } from "recharts";

interface ChannelDashboardProps {
  response: ChannelMultiResponse;
}

export default function ChannelDashboard({ response }: ChannelDashboardProps) {
  const { channels, comparison_metrics: metrics } = response;
  const isComparison = channels.length > 1;

  // Comparison/Single states
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [selectedChannelIdx, setSelectedChannelIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"library" | "charts" | "timeline" | "insights">("library");

  const activeChannel = isComparison && !compareMode ? channels[selectedChannelIdx] : channels[0];
  const singleChannel = activeChannel;

  // Search/Sort/Pagination states for single channel library
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"publish_date" | "views" | "duration" | "likes" | "shares" | "comments" | "like_ratio">("publish_date");
  const [sortAsc, setSortAsc] = useState(false); // default desc for date/views
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Chart toggles
  const [activeChartTab, setActiveChartTab] = useState<"uploads" | "engagement">("uploads");

  // Timeline zoom slider state (0 to 100, representing percentage of videos shown)
  const [timelineZoom, setTimelineZoom] = useState<number>(100);

  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const calculateRatios = (video: Video) => {
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

  // Search & Filter & Sort Logic for video library
  const sortedVideos = useMemo(() => {
    if (!singleChannel || !singleChannel.videos) return [];
    
    let list = [...singleChannel.videos];
    
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v => v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === "publish_date") {
        valA = new Date(a.publish_date || 0).getTime();
        valB = new Date(b.publish_date || 0).getTime();
      } else if (sortField === "views") {
        valA = a.view_count;
        valB = b.view_count;
      } else if (sortField === "duration") {
        valA = a.duration_seconds;
        valB = b.duration_seconds;
      } else if (sortField === "likes") {
        valA = a.like_count;
        valB = b.like_count;
      } else if (sortField === "shares") {
        valA = a.share_count;
        valB = b.share_count;
      } else if (sortField === "comments") {
        valA = a.comment_count;
        valB = b.comment_count;
      } else if (sortField === "like_ratio") {
        valA = a.view_count > 0 ? a.like_count / a.view_count : 0;
        valB = b.view_count > 0 ? b.like_count / b.view_count : 0;
      }

      if (valA === valB) return 0;
      return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    return list;
  }, [singleChannel, search, sortField, sortAsc]);

  // Paginated videos
  const paginatedVideos = useMemo(() => {
    const startIdx = (page - 1) * itemsPerPage;
    return sortedVideos.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedVideos, page]);

  const totalPages = Math.max(1, Math.ceil(sortedVideos.length / itemsPerPage));

  // Reset page when search/sorting changes
  React.useEffect(() => {
    setPage(1);
  }, [search, sortField, sortAsc]);

  // Upload activity chart data (Uploads frequency grouped by month-year)
  const uploadsChartData = useMemo(() => {
    if (!singleChannel || !singleChannel.videos) return [];
    
    // Group by month-year (e.g. "Jun 2026")
    const groups: Record<string, { count: number; dateVal: Date }> = {};
    singleChannel.videos.forEach(v => {
      if (!v.publish_date) return;
      const d = new Date(v.publish_date);
      const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (!groups[label]) {
        groups[label] = { count: 0, dateVal: new Date(d.getFullYear(), d.getMonth(), 1) };
      }
      groups[label].count += 1;
    });

    // Sort by chronological date
    return Object.entries(groups)
      .map(([name, val]) => ({ name, count: val.count, dateVal: val.dateVal }))
      .sort((a, b) => a.dateVal.getTime() - b.dateVal.getTime());
  }, [singleChannel]);

  // Engagement scatter data
  const engagementScatterData = useMemo(() => {
    if (!singleChannel || !singleChannel.videos) return [];
    return singleChannel.videos.map(v => ({
      title: v.title.slice(0, 20),
      views: v.view_count,
      likeRate: v.view_count > 0 ? Number(((v.like_count / v.view_count) * 100).toFixed(2)) : 0,
      commentRate: v.view_count > 0 ? Number(((v.comment_count / v.view_count) * 100).toFixed(2)) : 0,
    }));
  }, [singleChannel]);

  // Timeline zoom slider data (videos sorted chronologically)
  const timelineChartData = useMemo(() => {
    if (!singleChannel || !singleChannel.videos) return [];
    const sortedChr = [...singleChannel.videos].sort(
      (a, b) => new Date(a.publish_date || 0).getTime() - new Date(b.publish_date || 0).getTime()
    );
    
    // Apply zoom slider filtering
    const sliceCount = Math.max(2, Math.round((timelineZoom / 100) * sortedChr.length));
    const targetSlice = sortedChr.slice(-sliceCount); // show the most recent N items based on zoom

    return targetSlice.map(v => ({
      date: v.publish_date,
      title: v.title.slice(0, 15),
      views: v.view_count,
      likes: v.like_count,
      comments: v.comment_count,
    }));
  }, [singleChannel, timelineZoom]);

  // Factual Insights
  const insights = useMemo(() => {
    if (!singleChannel || !singleChannel.videos || singleChannel.videos.length === 0) return null;
    const vids = singleChannel.videos;
    
    const mostViewed = maxBy(vids, v => v.view_count);
    const mostLiked = maxBy(vids, v => v.like_count);
    const mostCommented = maxBy(vids, v => v.comment_count);
    const longest = maxBy(vids, v => v.duration_seconds);
    const shortest = minBy(vids, v => v.duration_seconds);

    // Calculate upload frequency (average days between uploads)
    const dates = vids
      .map(v => new Date(v.publish_date || 0).getTime())
      .sort((a, b) => a - b);
    
    let avgGaps = 0;
    if (dates.length >= 2) {
      const gaps = [];
      for (let i = 1; i < dates.length; i++) {
        gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
      }
      avgGaps = gaps.reduce((sum, val) => sum + val, 0) / gaps.length;
    }

    return { mostViewed, mostLiked, mostCommented, longest, shortest, avgGaps: avgGaps.toFixed(1) };
  }, [singleChannel]);

  // Helper selectors
  function maxBy<T>(arr: T[], fn: (item: T) => number): T {
    return arr.reduce((max, item) => (fn(item) > fn(max) ? item : max), arr[0]);
  }
  function minBy<T>(arr: T[], fn: (item: T) => number): T {
    return arr.reduce((min, item) => (fn(item) < fn(min) ? item : min), arr[0]);
  }

  // Export CSV
  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    const isExportComparison = isComparison && compareMode;

    if (!isExportComparison) {
      headers = [
        "Video ID", "Title", "Publish Date", "Duration (Sec)", "Views", "Likes", "Comments", "Shares",
        "Like to View (%)", "Share to View (%)", "Comment to View (%)"
      ];
      rows = singleChannel.videos.map(v => {
        const ratios = calculateRatios(v);
        return [
          v.id,
          v.title,
          v.publish_date,
          v.duration_seconds,
          v.view_count,
          v.like_count,
          v.comment_count,
          v.share_count,
          ratios.likeToViewPct,
          ratios.shareToViewPct,
          ratios.commentToViewPct
        ];
      });
    } else {
      headers = ["Metric", ...channels.map((_, i) => `Channel ${String.fromCharCode(65 + i)}`)];
      rows = [
        ["Title", ...channels.map(c => c.title)],
        ["Handle", ...channels.map(c => c.handle)],
        ["Subscribers", ...channels.map(c => c.subscriber_count)],
        ["Total View Count", ...channels.map(c => c.view_count)],
        ["Total Videos Count", ...channels.map(c => c.video_count)],
        ["Country", ...channels.map(c => c.country || "N/A")],
        ["Average Views (Recent)", ...channels.map(c => c.average_views)],
        ["Average Likes (Recent)", ...channels.map(c => c.average_likes)],
        ["Average Comments (Recent)", ...channels.map(c => c.average_comments)],
        ["Average Duration (Seconds)", ...channels.map(c => c.average_duration)]
      ];
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", isExportComparison ? "channels_comparison.csv" : `${singleChannel.title.slice(0,25)}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF Report
  const handleExportPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let htmlContent = "";
    const isExportComparison = isComparison && compareMode;

    if (!isExportComparison) {
      const topVids = [...singleChannel.videos].sort((a,b) => b.view_count - a.view_count).slice(0, 10);
      htmlContent = `
        <h1>Channel Intelligence Report</h1>
        <div style="margin-bottom: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
          <strong style="font-size: 20px; color: #1a1a1a;">${singleChannel.title} (${singleChannel.handle || ''})</strong><br/>
          <span style="color:#5a5a5a; font-size:13px;">Subs: ${singleChannel.subscriber_count.toLocaleString()} | Total Views: ${singleChannel.view_count.toLocaleString()} | Videos: ${singleChannel.video_count}</span>
        </div>
        
        <h3>Derived Performance Metrics (Last ${singleChannel.videos.length} Uploads)</h3>
        <table style="margin-bottom: 25px;">
          <thead>
            <tr><th>Metric</th><th>Average Value</th></tr>
          </thead>
          <tbody>
            <tr><td>Recent Video Average Views</td><td>${singleChannel.average_views.toLocaleString()}</td></tr>
            <tr><td>Recent Video Average Likes</td><td>${singleChannel.average_likes.toLocaleString()}</td></tr>
            <tr><td>Recent Video Average Comments</td><td>${singleChannel.average_comments.toLocaleString()}</td></tr>
            <tr><td>Average Video Duration</td><td>${formatDuration(singleChannel.average_duration)}</td></tr>
            <tr><td>Typical Upload Frequency</td><td>${insights?.avgGaps || 'N/A'} days between uploads</td></tr>
          </tbody>
        </table>

        <h3>Top 10 Most Viewed Recent Uploads</h3>
        <table>
          <thead>
            <tr><th>Video Title</th><th>Publish Date</th><th>Duration</th><th>Views</th><th>Likes</th></tr>
          </thead>
          <tbody>
            ${topVids.map(v => `
              <tr>
                <td><strong>${v.title}</strong></td>
                <td>${v.publish_date}</td>
                <td>${formatDuration(v.duration_seconds)}</td>
                <td>${v.view_count.toLocaleString()}</td>
                <td>${v.like_count.toLocaleString()}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    } else {
      htmlContent = `
        <h1>Channel Comparison Report</h1>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              ${channels.map((ch, i) => `<th>Channel ${String.fromCharCode(65 + i)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            <tr><td>Title</td>${channels.map(c => `<td><strong>${c.title}</strong></td>`).join("")}</tr>
            <tr><td>Handle</td>${channels.map(c => `<td>${c.handle || 'N/A'}</td>`).join("")}</tr>
            <tr><td>Subscribers</td>${channels.map(c => `<td>${c.subscriber_count.toLocaleString()}</td>`).join("")}</tr>
            <tr><td>Total Channel Views</td>${channels.map(c => `<td>${c.view_count.toLocaleString()}</td>`).join("")}</tr>
            <tr><td>Total Videos</td>${channels.map(c => `<td>${c.video_count}</td>`).join("")}</tr>
            <tr><td>Country</td>${channels.map(c => `<td>${c.country || "US"}</td>`).join("")}</tr>
            <tr><td>Recent Avg Views</td>${channels.map(c => `<td>${c.average_views.toLocaleString()}</td>`).join("")}</tr>
            <tr><td>Recent Avg Likes</td>${channels.map(c => `<td>${c.average_likes.toLocaleString()}</td>`).join("")}</tr>
            <tr><td>Recent Avg Comments</td>${channels.map(c => `<td>${c.average_comments.toLocaleString()}</td>`).join("")}</tr>
            <tr><td>Recent Avg Duration</td>${channels.map(c => `<td>${formatDuration(c.average_duration)}</td>`).join("")}</tr>
          </tbody>
        </table>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Channel Report</title>
          <style>
            body { font-family: Georgia, serif; padding: 45px; max-width: 900px; margin: 0 auto; color: #1a1a1a; line-height: 1.6; background-color: #faf9f5; }
            h1 { font-size: 26px; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 20px; color: #1a1a1a; }
            h3 { font-size: 16px; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; background: #ffffff; border: 1px solid #e2e8f0; }
            th { background: #f5f5f3; padding: 10px; border-bottom: 2px solid #e2e8f0; text-align: left; font-size: 11px; text-transform: uppercase; color: #5a5a5a; font-family: system-ui, sans-serif; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
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
  const comparisonChartData = useMemo(() => {
    if (!isComparison) return [];
    return channels.map((c, i) => ({
      name: c.title.slice(0, 12),
      subscribers: c.subscriber_count,
      views: c.view_count,
      videoCount: c.video_count,
      avgViews: c.average_views
    }));
  }, [channels, isComparison]);

  return (
    <div className="space-y-6">
      
      {/* ----------------- TOP METRIC BAR ----------------- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-zinc-850 border border-zinc-800 px-2 py-0.5 rounded">
              {isComparison ? (compareMode ? "Multi-Channel Comparison" : "Channel Analyzer (Individual)") : "Channel Analyzer"}
            </span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 truncate mt-1">
            {isComparison 
              ? (compareMode ? `${channels.length} Channels Side-by-Side` : singleChannel.title)
              : singleChannel.title}
          </h2>
        </div>

        <div className="flex gap-2.5 w-full md:w-auto">
          <button
            onClick={handleExportCsv}
            className="flex-1 md:flex-initial bg-transparent hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white py-2 px-4 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all btn-secondary"
          >
            <BarChart3 size={13} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="flex-1 md:flex-initial bg-indigo-650 hover:bg-indigo-500 text-white py-2 px-4 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download size={13} />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* ----------------- COMPARE THEM PROMPT (2-4 Channels) ----------------- */}
      {isComparison && (
        <div className="glass p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={13} className="text-indigo-400" />
              Multi-Channel Analysis
            </h3>
            <p className="text-xs text-zinc-450 font-medium">
              Would you like to compare these {channels.length} channels side-by-side or inspect them individually?
            </p>
          </div>
          <div className="flex bg-zinc-900 p-1 border border-zinc-800 rounded-md gap-1">
            <button
              onClick={() => setCompareMode(true)}
              className={`text-xs font-bold py-1.5 px-3 rounded cursor-pointer transition-all ${
                compareMode ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-355"
              }`}
            >
              Compare Side-by-Side
            </button>
            <button
              onClick={() => setCompareMode(false)}
              className={`text-xs font-bold py-1.5 px-3 rounded cursor-pointer transition-all ${
                !compareMode ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-355"
              }`}
            >
              Inspect Individually
            </button>
          </div>
        </div>
      )}

      {/* ----------------- SUB-SELECTOR FOR INDIVIDUAL ANALYSIS ----------------- */}
      {isComparison && !compareMode && (
        <div className="flex flex-wrap gap-2 bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center h-8 mr-2">
            Select Channel:
          </span>
          {channels.map((ch, i) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChannelIdx(i)}
              className={`text-xs font-semibold px-3 py-1.5 rounded border transition-all cursor-pointer truncate max-w-[180px] ${
                selectedChannelIdx === i
                  ? "bg-zinc-850 border-indigo-600 text-indigo-400 font-bold"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
              title={ch.title}
            >
              Channel {String.fromCharCode(65 + i)}: {ch.title.slice(0, 15)}...
            </button>
          ))}
        </div>
      )}

      {/* ----------------- SINGLE CHANNEL LAYOUT ----------------- */}
      {(!isComparison || !compareMode) && singleChannel && (
        <div className="space-y-6">
          
          {/* Header Banner & Profile Card */}
          <div className="glass overflow-hidden">
            {singleChannel.banner_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={singleChannel.banner_url} 
                alt="Channel Banner" 
                className="w-full h-32 md:h-44 object-cover border-b border-zinc-800"
              />
            ) : (
              <div className="w-full h-16 bg-zinc-900 border-b border-zinc-800"></div>
            )}
            
            <div className="p-6 flex flex-col md:flex-row gap-5 items-start">
              {singleChannel.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={singleChannel.thumbnail_url} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-full border border-zinc-850 shadow-sm bg-zinc-900 -mt-10 md:-mt-16 flex-shrink-0"
                />
              )}
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h1 className="text-2xl font-bold text-zinc-100">{singleChannel.title}</h1>
                  {singleChannel.handle && (
                    <span className="text-xs text-zinc-500 font-medium">{singleChannel.handle}</span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 font-medium leading-relaxed max-w-3xl line-clamp-3">
                  {singleChannel.description || "No description provided."}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1.5 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1"><Calendar size={12} /> Created: {singleChannel.published_at || "N/A"}</span>
                  {singleChannel.country && (
                    <span className="flex items-center gap-1"><Globe size={12} /> Country: {singleChannel.country}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Key aggregates row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1.5"><Users size={12} /> Subscribers</span>
              <p className="text-xl font-extrabold text-zinc-100">{singleChannel.subscriber_count.toLocaleString()}</p>
            </div>
            <div className="glass p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1.5"><Eye size={12} /> Lifetime Views</span>
              <p className="text-xl font-extrabold text-zinc-100">{singleChannel.view_count.toLocaleString()}</p>
            </div>
            <div className="glass p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1.5"><VideoIcon size={12} /> Total Videos</span>
              <p className="text-xl font-extrabold text-zinc-100">{singleChannel.video_count.toLocaleString()}</p>
            </div>
            <div className="glass p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1.5"><TrendingUp size={12} /> Subs/Video Ratio</span>
              <p className="text-xl font-extrabold text-zinc-100">
                {singleChannel.video_count > 0 ? Math.round(singleChannel.subscriber_count / singleChannel.video_count).toLocaleString() : "N/A"}
              </p>
            </div>
          </div>

          {/* Derived Statistics Card (Last 100 uploads) */}
          <div className="glass p-5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Sliders size={15} className="text-indigo-400" />
              Derived Statistics (Recent uploads averages)
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 p-3 rounded">
                <span className="text-[9px] text-zinc-500 font-bold uppercase">Average Views</span>
                <p className="text-sm font-extrabold text-zinc-100 mt-1">{singleChannel.average_views.toLocaleString()}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-3 rounded">
                <span className="text-[9px] text-zinc-500 font-bold uppercase">Average Likes</span>
                <p className="text-sm font-extrabold text-zinc-100 mt-1">{singleChannel.average_likes.toLocaleString()}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-3 rounded">
                <span className="text-[9px] text-zinc-500 font-bold uppercase">Average Comments</span>
                <p className="text-sm font-extrabold text-zinc-100 mt-1">{singleChannel.average_comments.toLocaleString()}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-3 rounded">
                <span className="text-[9px] text-zinc-500 font-bold uppercase">Average Duration</span>
                <p className="text-sm font-extrabold text-zinc-100 mt-1">{formatDuration(singleChannel.average_duration)}</p>
              </div>
            </div>
          </div>

          {/* Library / Charts / Timeline Selector */}
          <div className="flex bg-zinc-900 p-1 border border-zinc-800 rounded-lg gap-1 max-w-sm">
            {(["library", "charts", "timeline", "insights"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-[11px] font-bold py-1.5 px-2.5 rounded cursor-pointer capitalize transition-all ${
                  activeTab === tab ? "bg-zinc-850 border border-zinc-800 text-indigo-405 font-bold" : "text-zinc-500 hover:text-zinc-350"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* TAB 1: SEARCHABLE VIDEO LIBRARY TABLE */}
          {activeTab === "library" && (
            <div className="glass p-5 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full md:max-w-xs">
                  <Search className="absolute left-3 top-2.5 text-zinc-500" size={13} />
                  <input
                    type="text"
                    placeholder="Search recent uploads by title..."
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-600 rounded py-2 pl-9 pr-4 text-xs text-zinc-200 outline-none transition-colors"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Sort by:</label>
                    <select
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value as any)}
                      className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-250 py-1.5 px-2.5 rounded outline-none focus:border-indigo-650 cursor-pointer"
                    >
                      <option value="publish_date">Publish Date</option>
                      <option value="views">Views</option>
                      <option value="likes">Likes</option>
                      <option value="shares">Shares</option>
                      <option value="comments">Comments</option>
                      <option value="duration">Duration</option>
                      <option value="like_ratio">Like/View Ratio</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={() => setSortAsc(prev => !prev)}
                    className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 p-2 rounded text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    title={sortAsc ? "Sort Ascending" : "Sort Descending"}
                  >
                    {sortAsc ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-zinc-800 rounded">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-500 font-bold uppercase text-[9px] tracking-wider">
                      <th className="py-2.5 px-3">Video Title</th>
                      <th className="py-2.5 px-3">Publish Date</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Views</th>
                      <th className="py-2.5 px-3">Likes</th>
                      <th className="py-2.5 px-3">Like/View Ratio</th>
                      <th className="py-2.5 px-3">Share/View Ratio</th>
                      <th className="py-2.5 px-3">Comment/View Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-200 font-medium">
                    {paginatedVideos.length > 0 ? (
                      paginatedVideos.map(v => {
                        const ratios = calculateRatios(v);
                        return (
                          <tr key={v.id} className="hover:bg-zinc-900/40 transition-colors">
                            <td className="py-3 px-3 max-w-[240px] truncate font-bold text-zinc-150" title={v.title}>
                              {v.title}
                            </td>
                            <td className="py-3 px-3 text-zinc-400">{v.publish_date}</td>
                            <td className="py-3 px-3 text-zinc-400">{formatDuration(v.duration_seconds)}</td>
                            <td className="py-3 px-3 font-bold">{v.view_count.toLocaleString()}</td>
                            <td className="py-3 px-3">{v.like_count.toLocaleString()}</td>
                            <td className="py-3 px-3 text-indigo-400 font-bold">
                              {ratios.likeToViewPct}% <span className="text-[9px] text-zinc-500 font-normal">(1 per {ratios.viewToLike})</span>
                            </td>
                            <td className="py-3 px-3 text-zinc-400">
                              {ratios.shareToViewPct}% <span className="text-[9px] text-zinc-500 font-normal">(1 per {ratios.viewToShare})</span>
                            </td>
                            <td className="py-3 px-3 text-zinc-400">
                              {ratios.commentToViewPct}% <span className="text-[9px] text-zinc-500 font-normal">(1 per {ratios.viewToComment})</span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-zinc-500 italic">
                          No videos matched your filter query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex justify-between items-center text-xs text-zinc-500 pt-2">
                <span>Showing {paginatedVideos.length} of {sortedVideos.length} recent videos</span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-2.5 py-1 border border-zinc-800 rounded disabled:opacity-40 hover:bg-zinc-900 cursor-pointer font-bold"
                  >
                    Previous
                  </button>
                  <span className="flex items-center">Page {page} of {totalPages}</span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-2.5 py-1 border border-zinc-800 rounded disabled:opacity-40 hover:bg-zinc-900 cursor-pointer font-bold"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD ACTIVITY & FREQUENCY TRENDS */}
          {activeTab === "charts" && (
            <div className="glass p-5 space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800/60 pb-3">
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Analytical Visualizations</h3>
                <div className="flex bg-zinc-900 p-1 border border-zinc-800 rounded gap-1">
                  <button
                    onClick={() => setActiveChartTab("uploads")}
                    className={`text-[9px] font-bold px-2 py-1 rounded cursor-pointer transition-colors ${
                      activeChartTab === "uploads" ? "bg-zinc-850 text-indigo-400" : "text-zinc-500"
                    }`}
                  >
                    Upload Frequency
                  </button>
                  <button
                    onClick={() => setActiveChartTab("engagement")}
                    className={`text-[9px] font-bold px-2 py-1 rounded cursor-pointer transition-colors ${
                      activeChartTab === "engagement" ? "bg-zinc-850 text-indigo-400" : "text-zinc-500"
                    }`}
                  >
                    Like & Comment rates
                  </button>
                </div>
              </div>

              {activeChartTab === "uploads" ? (
                <div className="space-y-3">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Monthly Upload Activity Frequency</span>
                  <div className="h-64 w-full bg-zinc-900/40 p-4 border border-zinc-800 rounded">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={uploadsChartData}>
                        <XAxis dataKey="name" stroke="#8E8E8E" fontSize={9} />
                        <YAxis stroke="#8E8E8E" fontSize={9} />
                        <Tooltip />
                        <Bar dataKey="count" name="Uploads count" fill="#8B1E1E" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Views vs Engagement Rate Scatter distribution</span>
                  <div className="h-64 w-full bg-zinc-900/40 p-4 border border-zinc-800 rounded">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <XAxis type="number" dataKey="views" name="Views" stroke="#8E8E8E" fontSize={9} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                        <YAxis type="number" dataKey="likeRate" name="Like rate" unit="%" stroke="#8E8E8E" fontSize={9} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Legend wrapperStyle={{ fontSize: 9 }} />
                        <Scatter name="Video uploads" data={engagementScatterData} fill="#1a1a1a" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INTERACTIVE TIMELINE WITH ZOOM SLIDER */}
          {activeTab === "timeline" && (
            <div className="glass p-5 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Publish Timeline History</h3>
                  <p className="text-[10px] text-zinc-500">Track views count progression and publish spacing chronologically</p>
                </div>
                
                {/* Zoom range slider */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase whitespace-nowrap">Timeline range:</span>
                  <input
                    type="range"
                    min="15"
                    max="100"
                    value={timelineZoom}
                    onChange={(e) => setTimelineZoom(Number(e.target.value))}
                    className="w-full sm:w-32 accent-indigo-650 bg-zinc-800 h-1 rounded outline-none cursor-pointer"
                  />
                  <span className="text-[10px] text-zinc-200 font-bold">{timelineZoom}% uploads</span>
                </div>
              </div>

              <div className="h-64 w-full bg-zinc-900/40 p-4 border border-zinc-800 rounded">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <XAxis dataKey="date" stroke="#8E8E8E" fontSize={9} />
                    <YAxis stroke="#8E8E8E" fontSize={9} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Line type="monotone" dataKey="views" name="Views per Video" stroke="#8B1E1E" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="likes" name="Likes per Video" stroke="#1A1A1A" strokeWidth={1} dot={{ r: 1 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 4: FACTUAL INSIGHTS */}
          {activeTab === "insights" && insights && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              <div className="glass p-5 space-y-4">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5"><TrendingUp size={15} /> Engagement Leaders</h3>
                
                <div className="space-y-3.5 text-xs text-zinc-400">
                  <div className="border-b border-zinc-800 pb-2">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">Most Viewed Video</span>
                    <strong className="text-zinc-100 block font-bold mt-1 text-xs">{insights.mostViewed.title}</strong>
                    <span className="text-[10px] text-indigo-400 font-bold block mt-0.5">{insights.mostViewed.view_count.toLocaleString()} views • {insights.mostViewed.publish_date}</span>
                  </div>
                  <div className="border-b border-zinc-800 pb-2">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">Most Liked Video</span>
                    <strong className="text-zinc-100 block font-bold mt-1 text-xs">{insights.mostLiked.title}</strong>
                    <span className="text-[10px] text-indigo-400 font-bold block mt-0.5">{insights.mostLiked.like_count.toLocaleString()} likes • Like rate: {((insights.mostLiked.like_count / insights.mostLiked.view_count) * 100).toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">Most Commented Video</span>
                    <strong className="text-zinc-100 block font-bold mt-1 text-xs">{insights.mostCommented.title}</strong>
                    <span className="text-[10px] text-indigo-400 font-bold block mt-0.5">{insights.mostCommented.comment_count.toLocaleString()} comments</span>
                  </div>
                </div>
              </div>

              <div className="glass p-5 space-y-4">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5"><Clock size={15} /> Duration & Posting Rhythms</h3>
                
                <div className="space-y-3.5 text-xs text-zinc-400">
                  <div className="border-b border-zinc-800 pb-2">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">Longest Video Upload</span>
                    <strong className="text-zinc-100 block font-bold mt-1 text-xs">{insights.longest.title}</strong>
                    <span className="text-[10px] text-indigo-400 font-bold block mt-0.5">{formatDuration(insights.longest.duration_seconds)} ({insights.longest.duration_seconds.toLocaleString()} seconds)</span>
                  </div>
                  <div className="border-b border-zinc-800 pb-2">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">Shortest Video Upload</span>
                    <strong className="text-zinc-100 block font-bold mt-1 text-xs">{insights.shortest.title}</strong>
                    <span className="text-[10px] text-indigo-400 font-bold block mt-0.5">{formatDuration(insights.shortest.duration_seconds)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">Upload Spacing Frequency</span>
                    <strong className="text-zinc-100 block font-bold mt-1 text-xs">{insights.avgGaps} days</strong>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">Average delay spacing between consecutive video uploads.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ----------------- MULTI-CHANNEL COMPARISON LAYOUT (2-4 Channels) ----------------- */}
      {isComparison && compareMode && metrics && (
        <div className="space-y-6">
          {/* Comparison summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {channels.map((ch, i) => (
              <div key={ch.id} className="glass p-5 space-y-4 hover:border-zinc-700 transition-colors">
                <div className="flex gap-3 items-center">
                  {ch.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ch.thumbnail_url} alt="" className="w-12 h-12 rounded-full border border-zinc-800 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Channel {String.fromCharCode(65 + i)}</span>
                    <h3 className="text-xs font-bold text-zinc-100 leading-snug truncate mt-0.5" title={ch.title}>{ch.title}</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{ch.handle}</p>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-zinc-800 space-y-1.5 text-[10px] text-zinc-400">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Subscribers</span>
                    <span className="font-bold text-zinc-100">{ch.subscriber_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Lifetime Views</span>
                    <span className="font-bold text-zinc-100">{ch.view_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Video count</span>
                    <span className="font-bold text-zinc-100">{ch.video_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Recent Avg Views</span>
                    <span className="font-bold text-indigo-400">{ch.average_views.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Recent Avg Likes</span>
                    <span className="font-bold text-indigo-400">{ch.average_likes.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Aggregates bench grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="glass p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Highest Subscribers</span>
              <p className="text-base font-extrabold text-zinc-100">
                Channel {String.fromCharCode(65 + metrics.highest_subscribers_idx)}
              </p>
              <span className="text-[10px] text-zinc-500">{channels[metrics.highest_subscribers_idx].subscriber_count.toLocaleString()} subs</span>
            </div>
            <div className="glass p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Highest Lifetime Views</span>
              <p className="text-base font-extrabold text-zinc-100">
                Channel {String.fromCharCode(65 + metrics.highest_total_views_idx)}
              </p>
              <span className="text-[10px] text-zinc-500">{channels[metrics.highest_total_views_idx].view_count.toLocaleString()} views</span>
            </div>
            <div className="glass p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Highest Recent Avg Views</span>
              <p className="text-base font-extrabold text-zinc-100">
                Channel {String.fromCharCode(65 + metrics.highest_avg_views_idx)}
              </p>
              <span className="text-[10px] text-zinc-500">{channels[metrics.highest_avg_views_idx].average_views.toLocaleString()} views/vid</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass p-5 space-y-4">
              <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5"><Users size={14} className="text-indigo-400" /> Subscribers Comparison</h3>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData}>
                    <XAxis dataKey="name" stroke="#8E8E8E" fontSize={9} />
                    <YAxis stroke="#8E8E8E" fontSize={9} />
                    <Tooltip />
                    <Bar dataKey="subscribers" name="Subscribers" fill="#8B1E1E" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass p-5 space-y-4">
              <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5"><TrendingUp size={14} className="text-indigo-400" /> Recent Upload Views (Avg)</h3>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData}>
                    <XAxis dataKey="name" stroke="#8E8E8E" fontSize={9} />
                    <YAxis stroke="#8E8E8E" fontSize={9} />
                    <Tooltip />
                    <Bar dataKey="avgViews" name="Avg Views per Video" fill="#1A1A1A" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
