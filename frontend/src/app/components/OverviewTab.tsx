"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { Playlist, Video } from "../services/api";
import { Play, Clock, Eye, Video as VideoIcon, Calendar, Activity } from "lucide-react";

interface OverviewTabProps {
  playlist: Playlist;
}

export default function OverviewTab({ playlist }: OverviewTabProps) {
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} mins`;
  };

  const speedData = useMemo(() => {
    const total = playlist.total_duration_seconds;
    return [
      { speed: "1.0x", duration: formatDuration(total), hours: (total / 3600).toFixed(1) },
      { speed: "1.25x", duration: formatDuration(total / 1.25), hours: (total / 1.25 / 3600).toFixed(1) },
      { speed: "1.5x", duration: formatDuration(total / 1.5), hours: (total / 1.5 / 3600).toFixed(1) },
      { speed: "1.75x", duration: formatDuration(total / 1.75), hours: (total / 1.75 / 3600).toFixed(1) },
      { speed: "2.0x", duration: formatDuration(total / 2.0), hours: (total / 2.0 / 3600).toFixed(1) }
    ];
  }, [playlist]);

  const commitmentData = useMemo(() => {
    const total = playlist.total_duration_seconds;
    const rates = [
      { rate: "30 mins/day", mins: 30 },
      { rate: "1 hour/day", mins: 60 },
      { rate: "2 hours/day", mins: 120 },
      { rate: "3 hours/day", mins: 180 }
    ];
    return rates.map((r) => {
      const days = Math.ceil((total / 60) / r.mins);
      return {
        rate: r.rate,
        days: days,
        weeks: (days / 7).toFixed(1)
      };
    });
  }, [playlist]);

  // Chart 1: Video length distribution
  const lengthData = useMemo(() => {
    return playlist.videos.map((v) => ({
      position: v.position + 1,
      name: v.title.length > 20 ? v.title.substring(0, 20) + "..." : v.title,
      minutes: Math.round(v.duration_seconds / 60)
    }));
  }, [playlist]);

  // Chart 2: Duration Histogram brackets
  const histogramData = useMemo(() => {
    let under5 = 0;
    let fiveTo15 = 0;
    let fifteenTo30 = 0;
    let over30 = 0;

    playlist.videos.forEach((v) => {
      const m = v.duration_seconds / 60;
      if (m < 5) under5++;
      else if (m < 15) fiveTo15++;
      else if (m < 30) fifteenTo30++;
      else over30++;
    });

    return [
      { range: "< 5 mins", count: under5, color: "#10b981" },
      { range: "5 - 15 mins", count: fiveTo15, color: "#3b82f6" },
      { range: "15 - 30 mins", count: fifteenTo30, color: "#6366f1" },
      { range: "30+ mins", count: over30, color: "#8b5cf6" }
    ];
  }, [playlist]);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-5 rounded-xl flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Total Duration</p>
            <p className="text-lg font-bold">{formatDuration(playlist.total_duration_seconds)}</p>
          </div>
        </div>

        <div className="glass p-5 rounded-xl flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-violet-500/10 text-violet-400">
            <VideoIcon size={24} />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Video Count</p>
            <p className="text-lg font-bold">{playlist.video_count}</p>
          </div>
        </div>

        <div className="glass p-5 rounded-xl flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Eye size={24} />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Total Views</p>
            <p className="text-lg font-bold">{playlist.total_views.toLocaleString()}</p>
          </div>
        </div>

        <div className="glass p-5 rounded-xl flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Avg Duration</p>
            <p className="text-lg font-bold">{formatDuration(playlist.average_duration_seconds)}</p>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart: Length Distribution */}
        <div className="glass p-5 rounded-xl lg:col-span-2">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center">
            <Activity size={16} className="mr-2 text-indigo-400" />
            Video Length Distribution (Minutes)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lengthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="position" stroke="#52525b" fontSize={11} tickLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0c0c0e", borderColor: "#27272a", borderRadius: 8 }} />
                <Area type="monotone" dataKey="minutes" name="Minutes" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorMinutes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart: Histogram */}
        <div className="glass p-5 rounded-xl">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center">
            <Clock size={16} className="mr-2 text-violet-400" />
            Video Duration Breakdown
          </h3>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="range" stroke="#52525b" fontSize={10} tickLine={false} />
                <YAxis stroke="#52525b" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0c0c0e", borderColor: "#27272a", borderRadius: 8 }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="count" name="Videos" radius={[4, 4, 0, 0]}>
                  {histogramData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Speed and Commitment Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Speed Simulator */}
        <div className="glass p-5 rounded-xl">
          <div className="flex items-center space-x-2 mb-4">
            <Play size={18} className="text-indigo-400" />
            <h3 className="text-sm font-semibold text-zinc-300">Watch Speed Simulator</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-xs">
                  <th className="pb-2">Speed</th>
                  <th className="pb-2">Estimated Time</th>
                  <th className="pb-2 text-right">Decimal Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {speedData.map((item) => (
                  <tr key={item.speed} className="text-zinc-300">
                    <td className="py-2.5 font-semibold text-indigo-400">{item.speed}</td>
                    <td className="py-2.5">{item.duration}</td>
                    <td className="py-2.5 text-right font-mono text-zinc-500">{item.hours} hrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Study Commitment */}
        <div className="glass p-5 rounded-xl">
          <div className="flex items-center space-x-2 mb-4">
            <Calendar size={18} className="text-violet-400" />
            <h3 className="text-sm font-semibold text-zinc-300">Study Commitment Calculator</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-xs">
                  <th className="pb-2">Commitment</th>
                  <th className="pb-2">Total Days</th>
                  <th className="pb-2 text-right">Total Weeks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {commitmentData.map((item) => (
                  <tr key={item.rate} className="text-zinc-300">
                    <td className="py-2.5 font-semibold text-violet-400">{item.rate}</td>
                    <td className="py-2.5 font-mono">{item.days} days</td>
                    <td className="py-2.5 text-right text-zinc-500">{item.weeks} weeks</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
