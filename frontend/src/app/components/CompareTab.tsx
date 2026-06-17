"use client";

import React, { useState } from "react";
import { Playlist, api } from "../services/api";
import { Scale, RefreshCw, AlertCircle, CheckCircle, Clock, Video } from "lucide-react";

interface CompareTabProps {
  playlist: Playlist; // Active playlist
}

export default function CompareTab({ playlist }: CompareTabProps) {
  const [compareUrl, setCompareUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} mins`;
  };

  const handleCompare = async () => {
    if (!compareUrl.trim()) {
      alert("Please enter a playlist URL or ID to compare.");
      return;
    }
    setLoading(true);
    setError("");
    setComparisonResult(null);
    try {
      // 1. Analyse the second playlist first to ensure it's in backend cache
      const secondPlaylist = await api.analysePlaylist(compareUrl);
      
      if (secondPlaylist.id === playlist.id) {
        throw new Error("Cannot compare a playlist with itself. Please paste a different playlist.");
      }
      
      // 2. Perform comparison
      const data = await api.comparePlaylists(playlist.id, secondPlaylist.id);
      setComparisonResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Playlist comparison failed. Verify both URLs are valid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Compare Inputs card */}
      <div className="glass p-5 rounded-xl space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center">
          <Scale size={18} className="mr-2 text-indigo-400" />
          Benchmark Playlist Metrics Side-by-Side
        </h3>
        <p className="text-xs text-zinc-400 max-w-xl">
          Enter a second YouTube Playlist URL or ID to evaluate duration weights, video count ratios, content densities, difficulty comparisons, and topic coverage overlap.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <input
              type="text"
              placeholder="Paste second YouTube playlist URL or ID..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-200 outline-none focus:border-indigo-500"
              value={compareUrl}
              onChange={(e) => setCompareUrl(e.target.value)}
            />
          </div>
          <button
            onClick={handleCompare}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors w-full sm:w-auto justify-center"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Compare
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-sm text-zinc-400">Benchmarking playlist datasets...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} className="flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && !comparisonResult && (
        <div className="glass p-12 rounded-xl text-center text-zinc-500 flex flex-col items-center justify-center space-y-4">
          <Scale size={48} className="text-zinc-700" />
          <p className="max-w-md text-sm">
            Enter a second playlist above to compare metrics side-by-side. Excellent for comparing different bootcamps or tutorial paths!
          </p>
        </div>
      )}

      {/* Comparison results */}
      {!loading && !error && comparisonResult && (
        <div className="space-y-6">
          
          {/* Side by side stats comparison table */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 text-xs font-semibold select-none">
                    <th className="py-3 px-4 w-48">Metric</th>
                    <th className="py-3 px-4 border-r border-zinc-900 bg-indigo-500/5 text-indigo-400 font-bold">
                      Playlist A (Active)
                    </th>
                    <th className="py-3 px-4 text-violet-400 font-bold bg-violet-500/5">
                      Playlist B (Comparison)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300">
                  <tr>
                    <td className="py-3.5 px-4 font-semibold text-zinc-400">Title</td>
                    <td className="py-3.5 px-4 border-r border-zinc-900 font-semibold text-zinc-200">{playlist.title}</td>
                    <td className="py-3.5 px-4 font-semibold text-zinc-200">{comparisonResult.playlist_2.title}</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-semibold text-zinc-400">Creator</td>
                    <td className="py-3.5 px-4 border-r border-zinc-900 text-zinc-300">{playlist.channel_title}</td>
                    <td className="py-3.5 px-4 text-zinc-300">{comparisonResult.playlist_2.channel_title}</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-semibold text-zinc-400">Videos count</td>
                    <td className="py-3.5 px-4 border-r border-zinc-900 font-mono text-zinc-200 font-bold">{playlist.video_count} vids</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-200 font-bold">{comparisonResult.playlist_2.video_count} vids</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-semibold text-zinc-400">Total Duration</td>
                    <td className="py-3.5 px-4 border-r border-zinc-900 font-bold">{formatDuration(playlist.total_duration_seconds)}</td>
                    <td className="py-3.5 px-4 font-bold">{formatDuration(comparisonResult.playlist_2.total_duration_seconds)}</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-semibold text-zinc-400">Average Duration</td>
                    <td className="py-3.5 px-4 border-r border-zinc-900 text-zinc-400 font-mono">{formatDuration(playlist.average_duration_seconds)}</td>
                    <td className="py-3.5 px-4 text-zinc-400 font-mono">{formatDuration(comparisonResult.playlist_2.average_duration_seconds)}</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-semibold text-zinc-400">Learning Score</td>
                    <td className="py-3.5 px-4 border-r border-zinc-900 text-indigo-400 font-extrabold">{playlist.learning_score} / 100</td>
                    <td className="py-3.5 px-4 text-violet-400 font-extrabold">{comparisonResult.playlist_2.learning_score} / 100</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-semibold text-zinc-400">Difficulty Prerequisite</td>
                    <td className="py-3.5 px-4 border-r border-zinc-900 text-zinc-200">{playlist.difficulty}</td>
                    <td className="py-3.5 px-4 text-zinc-200">{comparisonResult.playlist_2.difficulty}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Summary metrics cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Highlights comparison */}
            <div className="glass p-5 rounded-xl space-y-4">
              <h4 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider flex items-center">
                <CheckCircle size={14} className="mr-1.5 text-indigo-400" />
                Comparison Summary Highlights
              </h4>
              <ul className="space-y-3.5 text-sm text-zinc-300">
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2">•</span>
                  <span>
                    Playlist A is{" "}
                    <strong>
                      {comparisonResult.comparison_metrics.duration_ratio > 1 
                        ? `${comparisonResult.comparison_metrics.duration_ratio}x longer` 
                        : `${(1 / comparisonResult.comparison_metrics.duration_ratio).toFixed(1)}x shorter`}
                    </strong>{" "}
                    than Playlist B in total watch time.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2">•</span>
                  <span>
                    Playlist A has{" "}
                    <strong>
                      {Math.abs(comparisonResult.comparison_metrics.video_count_diff)}{" "}
                      {comparisonResult.comparison_metrics.video_count_diff >= 0 ? "more" : "fewer"}
                    </strong>{" "}
                    videos than Playlist B.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2">•</span>
                  <span>
                    Playlist A learning score is{" "}
                    <strong className={comparisonResult.comparison_metrics.learning_score_diff >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {Math.abs(comparisonResult.comparison_metrics.learning_score_diff)}{" "}
                      {comparisonResult.comparison_metrics.learning_score_diff >= 0 ? "points higher" : "points lower"}
                    </strong>{" "}
                    than Playlist B.
                  </span>
                </li>
              </ul>
            </div>

            {/* Overlap Topics */}
            <div className="glass p-5 rounded-xl space-y-4">
              <h4 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider flex items-center">
                <Scale size={14} className="mr-1.5 text-violet-400" />
                Overlap Topic Coverage ({comparisonResult.comparison_metrics.shared_topics_count})
              </h4>
              
              <div className="flex flex-wrap gap-2">
                {comparisonResult.comparison_metrics.shared_topics.length > 0 ? (
                  comparisonResult.comparison_metrics.shared_topics.map((topic: string) => (
                    <span
                      key={topic}
                      className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-medium"
                    >
                      {topic}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500">
                    No overlapping topics identified between the two playlists. Both cover completely separate material.
                  </p>
                )}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
