"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Playlist, api, StudyPlan } from "../services/api";
import { Calendar as CalendarIcon, Clock, CheckSquare, Award, ChevronRight, Download } from "lucide-react";

interface PlannerTabProps {
  playlist: Playlist;
}

export default function PlannerTab({ playlist }: PlannerTabProps) {
  const [dailyMins, setDailyMins] = useState(60);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [checkedVideos, setCheckedVideos] = useState<Record<string, boolean>>({});

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} mins`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs} hrs`;
  };

  const loadPlan = async () => {
    setLoading(true);
    try {
      const data = await api.getStudyPlan(playlist.id, dailyMins);
      setPlan(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch plan on study speed changes
  useEffect(() => {
    loadPlan();
  }, [dailyMins]);

  // Calculate expected completion date
  const completionDate = useMemo(() => {
    if (!plan || plan.schedule.length === 0) return "";
    const daysNeeded = plan.schedule.length;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysNeeded);
    return targetDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }, [plan]);

  // Toggle video checked states
  const toggleVideoCheck = (vidId: string) => {
    setCheckedVideos((prev) => ({
      ...prev,
      [vidId]: !prev[vidId]
    }));
  };

  // Calculate overall checked percentage
  const overallProgress = useMemo(() => {
    if (!playlist.videos.length) return 0;
    const checkedCount = Object.values(checkedVideos).filter(Boolean).length;
    return Math.round((checkedCount / playlist.videos.length) * 100);
  }, [checkedVideos, playlist.videos]);

  const handleExportPlan = () => {
    if (!plan) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const daysHtml = plan.schedule.map(d => {
      const vidsList = d.videos.map(v => 
        `<li>Video ${v.position + 1}: ${v.title} (${Math.round(v.duration_seconds / 60)} mins)</li>`
      ).join("");
      
      return `
        <div style="margin-bottom: 24px; border-bottom: 1px solid #eee; padding-bottom: 16px;">
          <h3 style="color: #6366f1; margin: 0 0 8px 0;">Day ${d.day}</h3>
          <p style="font-size: 13px; color: #555; margin: 0 0 10px 0;">
            <strong>Total Study time:</strong> ${formatDuration(d.total_duration_seconds)}
          </p>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
            ${vidsList}
          </ul>
        </div>
      `;
    }).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Study Plan - ${playlist.title}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #222; }
            h1 { font-size: 24px; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 8px; }
            .meta { color: #555; font-size: 13px; margin-bottom: 24px; }
            .plan-container { margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>TubeIntel AI study schedule: ${playlist.title}</h1>
          <div class="meta">
            <strong>Target Daily study:</strong> ${dailyMins} minutes/day <br/>
            <strong>Total days required:</strong> ${plan.schedule.length} days <br/>
            <strong>Estimated completion date:</strong> ${completionDate}
          </div>
          <div class="plan-container">
            ${daysHtml}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Generate Calendar cells starting from today
  const calendarCells = useMemo(() => {
    if (!plan) return [];
    
    const cells = [];
    const startDate = new Date();
    
    for (let i = 0; i < plan.schedule.length; i++) {
      const dayData = plan.schedule[i];
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);
      
      cells.push({
        dateStr: cellDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        weekdayStr: cellDate.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: dayData.day,
        videos: dayData.videos,
        duration: dayData.total_duration_seconds
      });
    }
    return cells;
  }, [plan]);

  return (
    <div className="space-y-6">
      {/* Settings Selector */}
      <div className="glass p-5 rounded-xl flex flex-col sm:flex-row gap-5 items-center justify-between">
        <div className="w-full sm:flex-1">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-zinc-400 font-semibold uppercase">
              Daily Study Capacity
            </label>
            <span className="text-sm font-bold text-indigo-400">{dailyMins} mins / day</span>
          </div>
          <input
            type="range"
            min="15"
            max="180"
            step="15"
            value={dailyMins}
            onChange={(e) => setDailyMins(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-indigo-500 border border-zinc-800"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 mt-1.5 font-mono">
            <span>15 mins</span>
            <span>45 mins</span>
            <span>1 hour</span>
            <span>1.5 hours</span>
            <span>2 hours</span>
            <span>3 hours</span>
          </div>
        </div>
        
        {plan && (
          <button
            onClick={handleExportPlan}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors w-full sm:w-auto justify-center"
          >
            <Download size={16} /> Export Schedule PDF
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-sm text-zinc-400">Recalculating calendar schedule algorithms...</p>
        </div>
      )}

      {!loading && plan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Overall plan progress, stats, and roadmap (col-span-2) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Stats Dashboard */}
            <div className="grid grid-cols-3 gap-4">
              <div className="glass p-4 rounded-xl text-center">
                <p className="text-xs text-zinc-500 font-medium">Days Needed</p>
                <p className="text-2xl font-bold text-indigo-400 mt-1">{plan.schedule.length}</p>
              </div>
              <div className="glass p-4 rounded-xl text-center">
                <p className="text-xs text-zinc-500 font-medium">Completion Target</p>
                <p className="text-sm font-bold text-zinc-200 mt-2 truncate" title={completionDate}>{completionDate}</p>
              </div>
              <div className="glass p-4 rounded-xl text-center">
                <p className="text-xs text-zinc-500 font-medium">Checklist Progress</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{overallProgress}%</p>
              </div>
            </div>

            {/* Checklist Progress Bar */}
            <div className="glass p-5 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold text-zinc-400">
                <span>Task Tracker Checklist</span>
                <span className="text-indigo-400 font-mono">{overallProgress}% Complete</span>
              </div>
              <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-900">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Daily Roadmap Timeline */}
            <div className="glass p-5 rounded-xl space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center border-b border-zinc-800 pb-3">
                <CheckSquare size={16} className="mr-2 text-indigo-400" />
                Lesson Roadmap Schedule
              </h3>
              
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {plan.schedule.map((day) => (
                  <div key={day.day} className="flex gap-4">
                    {/* Day node indicator */}
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400">
                        {day.day}
                      </div>
                      <div className="w-0.5 flex-1 bg-zinc-800/80 my-1"></div>
                    </div>
                    
                    {/* Day Content */}
                    <div className="flex-1 bg-zinc-950/40 border border-zinc-900 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center text-xs text-zinc-400">
                        <span className="font-semibold text-zinc-300">Study Block #{day.day}</span>
                        <span className="font-mono text-zinc-500 flex items-center gap-1">
                          <Clock size={12} /> {formatDuration(day.total_duration_seconds)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {day.videos.map((vid) => {
                          const isChecked = !!checkedVideos[vid.id];
                          return (
                            <div
                              key={vid.id}
                              onClick={() => toggleVideoCheck(vid.id)}
                              className="flex items-center gap-3 p-2 rounded bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-850 cursor-pointer select-none transition-colors"
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                isChecked ? "bg-emerald-500 border-emerald-500 text-black" : "border-zinc-700 bg-transparent"
                              }`}>
                                {isChecked && <span className="text-[10px] font-bold">✓</span>}
                              </div>
                              <span className={`text-xs flex-1 line-clamp-1 ${isChecked ? "line-through text-zinc-500" : "text-zinc-300"}`}>
                                Video {vid.position + 1}: {vid.title}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500">
                                {Math.round(vid.duration_seconds / 60)}m
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right: Interactive learning Calendar (col-span-1) */}
          <div className="glass p-5 rounded-xl space-y-4 flex flex-col h-[520px]">
            <h3 className="text-sm font-semibold text-zinc-300 flex items-center border-b border-zinc-800 pb-3">
              <CalendarIcon size={16} className="mr-2 text-violet-400" />
              Calendar Timeline
            </h3>

            {/* Grid of study cells */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
              {calendarCells.map((cell) => (
                <div key={cell.dayNum} className="flex items-center space-x-3.5 p-3 rounded-lg bg-zinc-950 border border-zinc-900 hover:border-zinc-850 transition-colors">
                  {/* Calendar square */}
                  <div className="w-12 h-12 rounded bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center text-center flex-shrink-0">
                    <span className="text-[9px] uppercase tracking-wider text-indigo-400 font-semibold">{cell.weekdayStr}</span>
                    <span className="text-sm font-bold text-zinc-200 mt-0.5">{cell.dateStr.split(" ")[1]}</span>
                  </div>
                  
                  {/* Content details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-300">Study Day {cell.dayNum}</p>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {cell.videos.length} videos • {formatDuration(cell.duration)}
                    </p>
                  </div>
                  
                  <ChevronRight size={14} className="text-zinc-700" />
                </div>
              ))}
            </div>

            <div className="text-[10px] text-zinc-500 text-center border-t border-zinc-800 pt-3 flex justify-center items-center gap-1.5">
              <Award size={12} className="text-amber-500" />
              Complete tasks on the left to track actual progress
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
