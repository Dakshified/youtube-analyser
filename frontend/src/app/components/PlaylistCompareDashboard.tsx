import React from "react";
import { PlaylistComparison } from "../services/api";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { 
  Scale, Download, List, Clock, Eye, Heart, MessageSquare, Calendar
} from "lucide-react";

interface PlaylistCompareDashboardProps {
  comparison: PlaylistComparison;
}

export default function PlaylistCompareDashboard({ comparison }: PlaylistCompareDashboardProps) {
  const { playlist_1: pl1, playlist_2: pl2, comparison_metrics: metrics } = comparison;

  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const chartDataSummary = [
    { name: "Videos", [pl1.title.slice(0, 15)]: pl1.video_count, [pl2.title.slice(0, 15)]: pl2.video_count },
    { name: "Duration (hrs)", [pl1.title.slice(0, 15)]: Math.round(pl1.total_duration_seconds / 3600), [pl2.title.slice(0, 15)]: Math.round(pl2.total_duration_seconds / 3600) }
  ];

  const chartDataEngagement = [
    { name: "Views (x1000)", [pl1.title.slice(0, 15)]: Math.round(pl1.total_views / 1000), [pl2.title.slice(0, 15)]: Math.round(pl2.total_views / 1000) },
    { name: "Likes (x10)", [pl1.title.slice(0, 15)]: Math.round(pl1.total_likes / 10), [pl2.title.slice(0, 15)]: Math.round(pl2.total_likes / 10) },
    { name: "Comments", [pl1.title.slice(0, 15)]: pl1.total_comments, [pl2.title.slice(0, 15)]: pl2.total_comments }
  ];

  const handleExportPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>TubeIntel Playlist Comparison</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 45px; max-width: 900px; margin: 0 auto; color: #1e293b; line-height: 1.6; }
            h1 { font-size: 24px; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; color: #0f172a; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { border: 1px solid #e2e8f0; padding: 18px; border-radius: 10px; background: #f8fafc; }
            table { width: 100%; border-collapse: collapse; margin-top: 25px; }
            th { background: #f1f5f9; padding: 10px; border-bottom: 2px solid #e2e8f0; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .diff { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Playlist Comparison Report</h1>
          
          <div class="grid">
            <div class="card">
              <strong style="color: #6366f1;">Playlist A:</strong> ${pl1.title}<br/>
              <span style="font-size: 12px; color: #64748b;">Creator: ${pl1.channel_title}</span>
            </div>
            <div class="card">
              <strong style="color: #6366f1;">Playlist B:</strong> ${pl2.title}<br/>
              <span style="font-size: 12px; color: #64748b;">Creator: ${pl2.channel_title}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Playlist A</th>
                <th>Playlist B</th>
                <th>Difference (A - B)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Number of Videos</td>
                <td>${pl1.video_count}</td>
                <td>${pl2.video_count}</td>
                <td class="diff">${(pl1.video_count - pl2.video_count)}</td>
              </tr>
              <tr>
                <td>Total Duration</td>
                <td>${formatDuration(pl1.total_duration_seconds)}</td>
                <td>${formatDuration(pl2.total_duration_seconds)}</td>
                <td class="diff">${formatDuration(pl1.total_duration_seconds - pl2.total_duration_seconds)}</td>
              </tr>
              <tr>
                <td>Average Video Length</td>
                <td>${Math.round(pl1.average_duration_seconds / 60)}m</td>
                <td>${Math.round(pl2.average_duration_seconds / 60)}m</td>
                <td class="diff">${Math.round((pl1.average_duration_seconds - pl2.average_duration_seconds) / 60)}m</td>
              </tr>
              <tr>
                <td>Total Views</td>
                <td>${pl1.total_views.toLocaleString()}</td>
                <td>${pl2.total_views.toLocaleString()}</td>
                <td class="diff">${(pl1.total_views - pl2.total_views).toLocaleString()}</td>
              </tr>
              <tr>
                <td>Total Likes</td>
                <td>${pl1.total_likes.toLocaleString()}</td>
                <td>${pl2.total_likes.toLocaleString()}</td>
                <td class="diff">${(pl1.total_likes - pl2.total_likes).toLocaleString()}</td>
              </tr>
              <tr>
                <td>Total Comments</td>
                <td>${pl1.total_comments.toLocaleString()}</td>
                <td>${pl2.total_comments.toLocaleString()}</td>
                <td class="diff">${(pl1.total_comments - pl2.total_comments).toLocaleString()}</td>
              </tr>
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
    <div className="space-y-6">
      
      {/* ----------------- TOP METRIC BAR ----------------- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950/20 border border-zinc-900 p-4 rounded-2xl">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
            Playlist Comparison
          </span>
          <h2 className="text-base font-bold text-zinc-150 mt-1">Side-by-Side Playlist Benchmarks</h2>
        </div>
        
        <button
          onClick={handleExportPdf}
          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 glow-btn text-white py-2 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <Download size={13} />
          <span>Export Comparison Report</span>
        </button>
      </div>

      {/* ----------------- SUMMARY CARDS ----------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Playlist A */}
        <div className="glass p-5 rounded-2xl space-y-4 border-l-4 border-l-indigo-500">
          <div className="w-16 aspect-video bg-zinc-900 rounded overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pl1.thumbnail_url} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Playlist A</span>
            <h3 className="text-sm font-bold text-zinc-150 leading-snug mt-1" title={pl1.title}>{pl1.title}</h3>
            <p className="text-xs text-zinc-500 mt-1">By <span className="font-semibold text-zinc-400">{pl1.channel_title}</span></p>
          </div>
        </div>

        {/* Playlist B */}
        <div className="glass p-5 rounded-2xl space-y-4 border-l-4 border-l-violet-500">
          <div className="w-16 aspect-video bg-zinc-900 rounded overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pl2.thumbnail_url} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Playlist B</span>
            <h3 className="text-sm font-bold text-zinc-150 leading-snug mt-1" title={pl2.title}>{pl2.title}</h3>
            <p className="text-xs text-zinc-500 mt-1">By <span className="font-semibold text-zinc-400">{pl2.channel_title}</span></p>
          </div>
        </div>

      </div>

      {/* ----------------- METRIC GAPS ----------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass p-4 rounded-xl space-y-2">
          <span className="text-[10px] text-zinc-500 uppercase font-bold">Videos Gap</span>
          <p className="text-base font-extrabold text-zinc-200">
            {Math.abs(metrics.video_count_diff).toLocaleString()}
          </p>
          <div className="text-[10px] font-bold">
            {metrics.video_count_diff >= 0 ? (
              <span className="text-indigo-400">A has more</span>
            ) : (
              <span className="text-violet-400">B has more</span>
            )}
          </div>
        </div>

        <div className="glass p-4 rounded-xl space-y-2">
          <span className="text-[10px] text-zinc-500 uppercase font-bold">Duration Gap</span>
          <p className="text-base font-extrabold text-zinc-200">
            {formatDuration(Math.abs(metrics.duration_diff_seconds))}
          </p>
          <div className="text-[10px] font-bold">
            {metrics.duration_diff_seconds >= 0 ? (
              <span className="text-indigo-400">A is longer</span>
            ) : (
              <span className="text-violet-400">B is longer</span>
            )}
          </div>
        </div>

        <div className="glass p-4 rounded-xl space-y-2">
          <span className="text-[10px] text-zinc-500 uppercase font-bold">Views Gap</span>
          <p className="text-base font-extrabold text-zinc-200">
            {Math.abs(metrics.views_diff).toLocaleString()}
          </p>
          <div className="text-[10px] font-bold">
            {metrics.views_diff >= 0 ? (
              <span className="text-indigo-400">A has more</span>
            ) : (
              <span className="text-violet-400">B has more</span>
            )}
          </div>
        </div>

        <div className="glass p-4 rounded-xl space-y-2">
          <span className="text-[10px] text-zinc-500 uppercase font-bold">Likes Gap</span>
          <p className="text-base font-extrabold text-zinc-200">
            {Math.abs(metrics.likes_diff).toLocaleString()}
          </p>
          <div className="text-[10px] font-bold">
            {metrics.likes_diff >= 0 ? (
              <span className="text-indigo-400">A has more</span>
            ) : (
              <span className="text-violet-400">B has more</span>
            )}
          </div>
        </div>

      </div>

      {/* ----------------- CHARTS ----------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Scale comparison */}
        <div className="glass p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-zinc-250 flex items-center gap-1.5"><List size={14} className="text-indigo-400" /> Structure Comparison</h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataSummary}>
                <XAxis dataKey="name" stroke="#52525b" fontSize={9} />
                <YAxis stroke="#52525b" fontSize={9} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "10px" }}
                  labelStyle={{ color: "#a1a1aa", fontSize: "10px", fontWeight: "bold" }}
                  itemStyle={{ color: "#e4e4e7", fontSize: "11px" }}
                />
                <Bar dataKey={pl1.title.slice(0, 15)} name="Playlist A" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey={pl2.title.slice(0, 15)} name="Playlist B" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 9, pt: 5 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Engagement comparison */}
        <div className="glass p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-zinc-250 flex items-center gap-1.5"><Eye size={14} className="text-indigo-400" /> Engagement Comparison</h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataEngagement}>
                <XAxis dataKey="name" stroke="#52525b" fontSize={9} />
                <YAxis stroke="#52525b" fontSize={9} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "10px" }}
                  labelStyle={{ color: "#a1a1aa", fontSize: "10px", fontWeight: "bold" }}
                  itemStyle={{ color: "#e4e4e7", fontSize: "11px" }}
                />
                <Bar dataKey={pl1.title.slice(0, 15)} name="Playlist A" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey={pl2.title.slice(0, 15)} name="Playlist B" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 9, pt: 5 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ----------------- DATA TABLE COMPARISON ----------------- */}
      <div className="glass p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-zinc-150">Comparative Metrics Table</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase">
                <th className="py-3 px-2">Metric</th>
                <th className="py-3 px-2">Playlist A</th>
                <th className="py-3 px-2">Playlist B</th>
                <th className="py-3 px-2">Differential (A - B)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60 font-medium text-zinc-350">
              <tr>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">Videos Count</td>
                <td className="py-3.5 px-2">{pl1.video_count}</td>
                <td className="py-3.5 px-2">{pl2.video_count}</td>
                <td className={`py-3.5 px-2 font-bold ${metrics.video_count_diff >= 0 ? "text-indigo-400" : "text-violet-400"}`}>
                  {metrics.video_count_diff >= 0 ? "+" : ""}{metrics.video_count_diff.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">Total Duration</td>
                <td className="py-3.5 px-2">{formatDuration(pl1.total_duration_seconds)}</td>
                <td className="py-3.5 px-2">{formatDuration(pl2.total_duration_seconds)}</td>
                <td className={`py-3.5 px-2 font-bold ${metrics.duration_diff_seconds >= 0 ? "text-indigo-400" : "text-violet-400"}`}>
                  {metrics.duration_diff_seconds >= 0 ? "+" : ""}{formatDuration(metrics.duration_diff_seconds)}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">Average Video Duration</td>
                <td className="py-3.5 px-2">{Math.round(pl1.average_duration_seconds / 60)} mins</td>
                <td className="py-3.5 px-2">{Math.round(pl2.average_duration_seconds / 60)} mins</td>
                <td className={`py-3.5 px-2 font-bold ${pl1.average_duration_seconds - pl2.average_duration_seconds >= 0 ? "text-indigo-400" : "text-violet-400"}`}>
                  {pl1.average_duration_seconds - pl2.average_duration_seconds >= 0 ? "+" : ""}{Math.round((pl1.average_duration_seconds - pl2.average_duration_seconds) / 60)} mins
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">Total Views</td>
                <td className="py-3.5 px-2">{pl1.total_views.toLocaleString()}</td>
                <td className="py-3.5 px-2">{pl2.total_views.toLocaleString()}</td>
                <td className={`py-3.5 px-2 font-bold ${metrics.views_diff >= 0 ? "text-indigo-400" : "text-violet-400"}`}>
                  {metrics.views_diff >= 0 ? "+" : ""}{metrics.views_diff.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">Total Likes</td>
                <td className="py-3.5 px-2">{pl1.total_likes.toLocaleString()}</td>
                <td className="py-3.5 px-2">{pl2.total_likes.toLocaleString()}</td>
                <td className={`py-3.5 px-2 font-bold ${metrics.likes_diff >= 0 ? "text-indigo-400" : "text-violet-400"}`}>
                  {metrics.likes_diff >= 0 ? "+" : ""}{metrics.likes_diff.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">Total Comments</td>
                <td className="py-3.5 px-2">{pl1.total_comments.toLocaleString()}</td>
                <td className="py-3.5 px-2">{pl2.total_comments.toLocaleString()}</td>
                <td className={`py-3.5 px-2 font-bold ${metrics.comments_diff >= 0 ? "text-indigo-400" : "text-violet-400"}`}>
                  {metrics.comments_diff >= 0 ? "+" : ""}{metrics.comments_diff.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">Average Upload Gap</td>
                <td className="py-3.5 px-2">{metrics.average_gap_days_1} days</td>
                <td className="py-3.5 px-2">{metrics.average_gap_days_2} days</td>
                <td className={`py-3.5 px-2 font-bold ${metrics.average_gap_days_1 - metrics.average_gap_days_2 >= 0 ? "text-indigo-400" : "text-violet-400"}`}>
                  {metrics.average_gap_days_1 - metrics.average_gap_days_2 >= 0 ? "+" : ""}{(metrics.average_gap_days_1 - metrics.average_gap_days_2).toFixed(1)} days
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
