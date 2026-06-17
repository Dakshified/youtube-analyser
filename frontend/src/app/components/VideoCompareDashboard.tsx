import React from "react";
import { VideoComparison } from "../services/api";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { 
  Scale, Download, Calendar, Clock, Eye, Heart, MessageSquare, Tag, FolderOpen, Percent, Plus, Minus
} from "lucide-react";

interface VideoCompareDashboardProps {
  comparison: VideoComparison;
}

export default function VideoCompareDashboard({ comparison }: VideoCompareDashboardProps) {
  const { video_1: v1, video_2: v2, comparison_metrics: metrics } = comparison;

  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m ${secs}s`;
  };

  const chartDataViews = [
    { name: "Views", [v1.title.slice(0, 15)]: v1.view_count, [v2.title.slice(0, 15)]: v2.view_count }
  ];

  const chartDataEngagement = [
    { name: "Likes", [v1.title.slice(0, 15)]: v1.like_count, [v2.title.slice(0, 15)]: v2.like_count },
    { name: "Comments", [v1.title.slice(0, 15)]: v1.comment_count, [v2.title.slice(0, 15)]: v2.comment_count }
  ];

  const handleExportPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>TubeIntel Video Comparison</title>
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
          <h1>Video Comparison Report</h1>
          
          <div class="grid">
            <div class="card">
              <strong style="color: #6366f1;">Video 1:</strong> ${v1.title}<br/>
              <span style="font-size: 12px; color: #64748b;">Channel: ${v1.channel_title}</span>
            </div>
            <div class="card">
              <strong style="color: #6366f1;">Video 2:</strong> ${v2.title}<br/>
              <span style="font-size: 12px; color: #64748b;">Channel: ${v2.channel_title}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Video 1</th>
                <th>Video 2</th>
                <th>Difference (V1 - V2)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Views</td>
                <td>${v1.view_count.toLocaleString()}</td>
                <td>${v2.view_count.toLocaleString()}</td>
                <td class="diff">${(v1.view_count - v2.view_count).toLocaleString()}</td>
              </tr>
              <tr>
                <td>Likes</td>
                <td>${v1.like_count.toLocaleString()}</td>
                <td>${v2.like_count.toLocaleString()}</td>
                <td class="diff">${(v1.like_count - v2.like_count).toLocaleString()}</td>
              </tr>
              <tr>
                <td>Comments</td>
                <td>${v1.comment_count.toLocaleString()}</td>
                <td>${v2.comment_count.toLocaleString()}</td>
                <td class="diff">${(v1.comment_count - v2.comment_count).toLocaleString()}</td>
              </tr>
              <tr>
                <td>Duration</td>
                <td>${formatDuration(v1.duration_seconds)}</td>
                <td>${formatDuration(v2.duration_seconds)}</td>
                <td class="diff">${formatDuration(v1.duration_seconds - v2.duration_seconds)}</td>
              </tr>
              <tr>
                <td>Publish Date</td>
                <td>${v1.publish_date}</td>
                <td>${v2.publish_date}</td>
                <td>-</td>
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
            Video Comparison
          </span>
          <h2 className="text-base font-bold text-zinc-150 mt-1">Side-by-Side Video Benchmarks</h2>
        </div>
        
        <button
          onClick={handleExportPdf}
          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 glow-btn text-white py-2 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <Download size={13} />
          <span>Export Comparison Report</span>
        </button>
      </div>

      {/* ----------------- COMPARISON SUMMARY CARDS ----------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Video A */}
        <div className="glass p-5 rounded-2xl space-y-4 border-l-4 border-l-indigo-500">
          <div className="w-16 aspect-video bg-zinc-900 rounded overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v1.thumbnail_url} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Video A</span>
            <h3 className="text-sm font-bold text-zinc-150 leading-snug mt-1" title={v1.title}>{v1.title}</h3>
            <p className="text-xs text-zinc-500 mt-1">By <span className="font-semibold text-zinc-400">{v1.channel_title}</span></p>
          </div>
        </div>

        {/* Video B */}
        <div className="glass p-5 rounded-2xl space-y-4 border-l-4 border-l-violet-500">
          <div className="w-16 aspect-video bg-zinc-900 rounded overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v2.thumbnail_url} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Video B</span>
            <h3 className="text-sm font-bold text-zinc-150 leading-snug mt-1" title={v2.title}>{v2.title}</h3>
            <p className="text-xs text-zinc-500 mt-1">By <span className="font-semibold text-zinc-400">{v2.channel_title}</span></p>
          </div>
        </div>

      </div>

      {/* ----------------- KEY COMPARE STATS CARDS ----------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Views Comp */}
        <div className="glass p-4 rounded-xl space-y-2">
          <span className="text-[10px] text-zinc-500 uppercase font-bold">Views Gap</span>
          <p className="text-base font-extrabold text-zinc-200">
            {Math.abs(metrics.views_diff).toLocaleString()}
          </p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500">
            {metrics.views_diff >= 0 ? (
              <span className="text-indigo-400">A has more</span>
            ) : (
              <span className="text-violet-400">B has more</span>
            )}
          </div>
        </div>

        {/* Likes Comp */}
        <div className="glass p-4 rounded-xl space-y-2">
          <span className="text-[10px] text-zinc-500 uppercase font-bold">Likes Gap</span>
          <p className="text-base font-extrabold text-zinc-200">
            {Math.abs(metrics.likes_diff).toLocaleString()}
          </p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500">
            {metrics.likes_diff >= 0 ? (
              <span className="text-indigo-400">A has more</span>
            ) : (
              <span className="text-violet-400">B has more</span>
            )}
          </div>
        </div>

        {/* Comments Comp */}
        <div className="glass p-4 rounded-xl space-y-2">
          <span className="text-[10px] text-zinc-500 uppercase font-bold">Comments Gap</span>
          <p className="text-base font-extrabold text-zinc-200">
            {Math.abs(metrics.comments_diff).toLocaleString()}
          </p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500">
            {metrics.comments_diff >= 0 ? (
              <span className="text-indigo-400">A has more</span>
            ) : (
              <span className="text-violet-400">B has more</span>
            )}
          </div>
        </div>

        {/* Duration Comp */}
        <div className="glass p-4 rounded-xl space-y-2">
          <span className="text-[10px] text-zinc-500 uppercase font-bold">Length Gap</span>
          <p className="text-base font-extrabold text-zinc-200">
            {formatDuration(Math.abs(metrics.duration_diff_seconds))}
          </p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500">
            {metrics.duration_diff_seconds >= 0 ? (
              <span className="text-indigo-400">A is longer</span>
            ) : (
              <span className="text-violet-400">B is longer</span>
            )}
          </div>
        </div>

      </div>

      {/* ----------------- SIDE-BY-SIDE CHARTS ----------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Views Chart */}
        <div className="glass p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5"><Eye size={14} className="text-indigo-400" /> Views Comparison</h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataViews}>
                <XAxis dataKey="name" stroke="#52525b" fontSize={9} />
                <YAxis stroke="#52525b" fontSize={9} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "10px" }}
                  labelStyle={{ color: "#a1a1aa", fontSize: "10px", fontWeight: "bold" }}
                  itemStyle={{ color: "#e4e4e7", fontSize: "11px" }}
                />
                <Bar dataKey={v1.title.slice(0, 15)} name="Video A" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey={v2.title.slice(0, 15)} name="Video B" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 9, pt: 5 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Likes/Comments Chart */}
        <div className="glass p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5"><Heart size={14} className="text-indigo-400" /> Engagement Comparison</h3>
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
                <Bar dataKey={v1.title.slice(0, 15)} name="Video A" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey={v2.title.slice(0, 15)} name="Video B" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
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
                <th className="py-3 px-2">Video A</th>
                <th className="py-3 px-2">Video B</th>
                <th className="py-3 px-2">Differential (A - B)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60 font-medium text-zinc-350">
              <tr>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">Views</td>
                <td className="py-3.5 px-2">{v1.view_count.toLocaleString()}</td>
                <td className="py-3.5 px-2">{v2.view_count.toLocaleString()}</td>
                <td className={`py-3.5 px-2 font-bold ${metrics.views_diff >= 0 ? "text-indigo-400" : "text-violet-400"}`}>
                  {metrics.views_diff >= 0 ? "+" : ""}{metrics.views_diff.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">Likes</td>
                <td className="py-3.5 px-2">{v1.like_count.toLocaleString()}</td>
                <td className="py-3.5 px-2">{v2.like_count.toLocaleString()}</td>
                <td className={`py-3.5 px-2 font-bold ${metrics.likes_diff >= 0 ? "text-indigo-400" : "text-violet-400"}`}>
                  {metrics.likes_diff >= 0 ? "+" : ""}{metrics.likes_diff.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">Comments</td>
                <td className="py-3.5 px-2">{v1.comment_count.toLocaleString()}</td>
                <td className="py-3.5 px-2">{v2.comment_count.toLocaleString()}</td>
                <td className={`py-3.5 px-2 font-bold ${metrics.comments_diff >= 0 ? "text-indigo-400" : "text-violet-400"}`}>
                  {metrics.comments_diff >= 0 ? "+" : ""}{metrics.comments_diff.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">Like/View Ratio</td>
                <td className="py-3.5 px-2">{metrics.like_view_ratio_1}%</td>
                <td className="py-3.5 px-2">{metrics.like_view_ratio_2}%</td>
                <td className={`py-3.5 px-2 font-bold ${metrics.like_view_ratio_1 - metrics.like_view_ratio_2 >= 0 ? "text-indigo-400" : "text-violet-400"}`}>
                  {metrics.like_view_ratio_1 - metrics.like_view_ratio_2 >= 0 ? "+" : ""}{(metrics.like_view_ratio_1 - metrics.like_view_ratio_2).toFixed(2)}%
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">Daily Views (Avg)</td>
                <td className="py-3.5 px-2">{metrics.views_per_day_1.toLocaleString()}</td>
                <td className="py-3.5 px-2">{metrics.views_per_day_2.toLocaleString()}</td>
                <td className={`py-3.5 px-2 font-bold ${metrics.views_per_day_1 - metrics.views_per_day_2 >= 0 ? "text-indigo-400" : "text-violet-400"}`}>
                  {metrics.views_per_day_1 - metrics.views_per_day_2 >= 0 ? "+" : ""}{(metrics.views_per_day_1 - metrics.views_per_day_2).toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">Length</td>
                <td className="py-3.5 px-2">{formatDuration(v1.duration_seconds)}</td>
                <td className="py-3.5 px-2">{formatDuration(v2.duration_seconds)}</td>
                <td className={`py-3.5 px-2 font-bold ${metrics.duration_diff_seconds >= 0 ? "text-indigo-400" : "text-violet-400"}`}>
                  {metrics.duration_diff_seconds >= 0 ? "+" : ""}{formatDuration(metrics.duration_diff_seconds)}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">Publish Date</td>
                <td className="py-3.5 px-2">{v1.publish_date}</td>
                <td className="py-3.5 px-2">{v2.publish_date}</td>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">
                  {Math.abs(metrics.age_diff_days)} days {metrics.age_diff_days >= 0 ? "older" : "newer"}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">Category</td>
                <td className="py-3.5 px-2">{v1.category || "Unknown"}</td>
                <td className="py-3.5 px-2">{v2.category || "Unknown"}</td>
                <td className="py-3.5 px-2 text-zinc-500 font-bold">
                  {v1.category === v2.category ? "Identical" : "Different"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
