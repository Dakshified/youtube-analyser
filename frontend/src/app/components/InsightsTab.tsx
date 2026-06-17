"use client";

import React, { useMemo } from "react";
import { Playlist } from "../services/api";
import { Award, Compass, BookOpen, Layers, CheckCircle2, ChevronRight } from "lucide-react";

interface InsightsTabProps {
  playlist: Playlist;
}

export default function InsightsTab({ playlist }: InsightsTabProps) {
  // Parse JSON columns
  const skillsList = useMemo<string[]>(() => {
    try {
      return playlist.skills ? JSON.parse(playlist.skills) : [];
    } catch {
      return [];
    }
  }, [playlist.skills]);

  const topicsList = useMemo<string[]>(() => {
    try {
      return playlist.topics ? JSON.parse(playlist.topics) : [];
    } catch {
      return [];
    }
  }, [playlist.topics]);

  const pathList = useMemo<string[]>(() => {
    try {
      return playlist.learning_path ? JSON.parse(playlist.learning_path) : [];
    } catch {
      return [];
    }
  }, [playlist.learning_path]);

  // Determine difficulty color badges
  const difficultyColors = useMemo(() => {
    switch (playlist.difficulty.toLowerCase()) {
      case "beginner":
        return { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" };
      case "advanced":
        return { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400" };
      case "intermediate":
      default:
        return { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" };
    }
  }, [playlist.difficulty]);

  return (
    <div className="space-y-6">
      {/* Top gauges row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Learning Score Card */}
        <div className="glass p-5 rounded-xl flex flex-col items-center justify-center text-center">
          <h3 className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-4 flex items-center">
            <Award size={14} className="mr-1 text-indigo-400" />
            Learning Score
          </h3>
          
          <div className="relative w-28 h-28 flex items-center justify-center mb-2">
            {/* SVG circular track */}
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="56" cy="56" r="48" stroke="#18181b" strokeWidth="8" fill="transparent" />
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="#6366f1"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="301.6"
                strokeDashoffset={301.6 - (playlist.learning_score / 100) * 301.6}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute text-2xl font-bold font-mono text-zinc-100">
              {playlist.learning_score}
            </div>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-[200px]">
            Based on lecture length, topic consistency, and technical density.
          </p>
        </div>

        {/* Difficulty Estimate Card */}
        <div className="glass p-5 rounded-xl flex flex-col items-center justify-center text-center">
          <h3 className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-4 flex items-center">
            <Layers size={14} className="mr-1 text-violet-400" />
            Difficulty Level
          </h3>
          
          <div className={`px-6 py-2.5 rounded-full border text-lg font-bold ${difficultyColors.bg} ${difficultyColors.border} ${difficultyColors.text} mb-3`}>
            {playlist.difficulty}
          </div>
          
          <p className="text-xs text-zinc-400 leading-relaxed max-w-[200px]">
            Recommended prerequisite knowledge scale:{" "}
            <span className="font-semibold text-zinc-300">
              {playlist.difficulty === "Beginner" ? "Introductory" : playlist.difficulty === "Intermediate" ? "Prior exposure helpful" : "Advanced mastery"}
            </span>.
          </p>
        </div>

        {/* Total Content Weight */}
        <div className="glass p-5 rounded-xl flex flex-col items-center justify-center text-center">
          <h3 className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-4 flex items-center">
            <BookOpen size={14} className="mr-1 text-emerald-400" />
            Topic Consistency
          </h3>
          
          <div className="text-2xl font-bold text-emerald-400 mb-3 font-mono">
            {skillsList.length > 0 ? "HIGH" : "STANDARD"}
          </div>
          
          <p className="text-xs text-zinc-400 leading-relaxed max-w-[200px]">
            Syllabus focuses heavily on structured learning outputs with high correlation.
          </p>
        </div>

      </div>

      {/* Heatmap & Skill Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Skill Matrix (col-span-2) */}
        <div className="glass p-5 rounded-xl lg:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center border-b border-zinc-800 pb-3">
            <CheckCircle2 size={16} className="mr-2 text-indigo-400" />
            Estimated Skill Gains (Resume Ready)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skillsList.map((skill, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-900 hover:border-zinc-850 transition-all">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  ✓
                </div>
                <span className="text-xs font-semibold text-zinc-200">{skill}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Density Heatmap */}
        <div className="glass p-5 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center border-b border-zinc-800 pb-3">
            <Layers size={16} className="mr-2 text-violet-400" />
            Learning Density Heatmap
          </h3>
          
          <div className="grid grid-cols-5 gap-2.5 max-h-44 overflow-y-auto pr-1">
            {playlist.videos.map((vid) => {
              const mins = vid.duration_seconds / 60;
              let bg = "bg-indigo-500/10";
              let titleColor = "text-zinc-500";
              if (mins >= 40) { bg = "bg-indigo-500/90"; titleColor = "text-indigo-200"; }
              else if (mins >= 20) { bg = "bg-indigo-500/60"; titleColor = "text-indigo-100"; }
              else if (mins >= 10) { bg = "bg-indigo-500/30"; titleColor = "text-indigo-300"; }
              
              return (
                <div
                  key={vid.id}
                  className={`aspect-square rounded flex items-center justify-center cursor-pointer transition-all hover:scale-105 ${bg}`}
                  title={`Video ${vid.position + 1}: ${vid.title} (${Math.round(mins)} mins)`}
                >
                  <span className={`text-[10px] font-mono font-bold ${titleColor}`}>
                    {vid.position + 1}
                  </span>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono pt-1">
            <span>&lt; 10 mins (Light)</span>
            <span>40+ mins (Deep)</span>
          </div>
        </div>

      </div>

      {/* Next Steps / Learning Paths */}
      <div className="glass p-5 rounded-xl space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center border-b border-zinc-800 pb-3">
          <Compass size={16} className="mr-2 text-emerald-400" />
          Recommended Next Learning Pathways
        </h3>
        
        <div className="divide-y divide-zinc-900">
          {pathList.map((path, idx) => (
            <div key={idx} className="flex items-center justify-between py-3.5 first:pt-1 last:pb-1 group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-zinc-950 border border-zinc-900 flex items-center justify-center text-zinc-400 text-xs font-bold font-mono">
                  0{idx + 1}
                </div>
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-400 transition-colors">{path}</span>
              </div>
              <ChevronRight size={14} className="text-zinc-650 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
