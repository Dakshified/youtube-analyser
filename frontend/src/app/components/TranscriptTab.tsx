"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Playlist, api, Transcript } from "../services/api";
import { Copy, Download, Search, Clock, AlignLeft, BarChart2, Eye } from "lucide-react";

interface TranscriptTabProps {
  playlist: Playlist;
}

export default function TranscriptTab({ playlist }: TranscriptTabProps) {
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const selectedVideo = useMemo(() => {
    return playlist.videos.find((v) => v.id === selectedVideoId);
  }, [playlist.videos, selectedVideoId]);

  // Load transcript on video select
  useEffect(() => {
    if (!selectedVideoId) {
      setTranscript(null);
      setSegments([]);
      return;
    }

    const loadTranscript = async () => {
      setLoading(true);
      setError("");
      try {
        const vid = playlist.videos.find((v) => v.id === selectedVideoId);
        const data = await api.getTranscript(selectedVideoId, vid?.title || "");
        setTranscript(data);
        // data.segments will be parsed in backend response, or we split raw text as fallback
        setSegments(data.segments || []);
      } catch (err: any) {
        console.error(err);
        setError("Could not retrieve transcript for this video.");
      } finally {
        setLoading(false);
      }
    };

    loadTranscript();
  }, [selectedVideoId, playlist.videos]);

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const handleCopy = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript.raw_text);
    alert("Transcript text copied to clipboard!");
  };

  const handleExportTxt = () => {
    if (!transcript || !selectedVideo) return;
    const blob = new Blob([transcript.raw_text], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Transcript_${selectedVideo.title.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportPdf = () => {
    if (!transcript || !selectedVideo) return;
    
    // Open a printable popup with clean styles
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const segmentsHtml = segments.map(s => 
      `<div style="margin-bottom: 12px; display: flex; font-family: sans-serif; font-size: 14px;">
        <span style="color: #6366f1; width: 60px; font-weight: bold; flex-shrink: 0;">[${formatTimestamp(s.start)}]</span>
        <span style="color: #333;">${s.text}</span>
      </div>`
    ).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Transcript - ${selectedVideo.title}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #111; line-height: 1.6; }
            h1 { font-size: 24px; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 8px; }
            .meta { color: #555; font-size: 13px; margin-bottom: 24px; }
            .content { margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Transcript Analysis: ${selectedVideo.title}</h1>
          <div class="meta">
            <strong>Playlist:</strong> ${playlist.title} <br/>
            <strong>Word Count:</strong> ${transcript.word_count.toLocaleString()} words <br/>
            <strong>Estimated Speaking Time:</strong> ${Math.round(transcript.speaking_duration_seconds / 60)} minutes
          </div>
          <div class="content">
            ${segmentsHtml || `<p>${transcript.raw_text}</p>`}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter segments on search term
  const filteredSegments = useMemo(() => {
    if (!searchTerm.trim()) return segments;
    const term = searchTerm.toLowerCase();
    return segments.filter((s) => s.text.toLowerCase().includes(term));
  }, [segments, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Video Selector Dropdown */}
      <div className="glass p-5 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:flex-1">
          <label className="block text-xs text-zinc-400 font-semibold mb-2 uppercase">
            Select Playlist Video
          </label>
          <select
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-200 outline-none focus:border-indigo-500 cursor-pointer"
            value={selectedVideoId}
            onChange={(e) => setSelectedVideoId(e.target.value)}
          >
            <option value="">-- Choose a video to view transcript intelligence --</option>
            {playlist.videos.map((vid) => (
              <option key={vid.id} value={vid.id}>
                Video {vid.position + 1}: {vid.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-sm text-zinc-400">Loading transcript intelligence & analytics...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-xl text-center">
          {error}
        </div>
      )}

      {!loading && !error && !transcript && (
        <div className="glass p-12 rounded-xl text-center text-zinc-500 flex flex-col items-center justify-center space-y-4">
          <AlignLeft size={48} className="text-zinc-700" />
          <p className="max-w-md text-sm">
            Select a video from the dropdown menu above to analyze transcript key terms, speak times, topics, and perform code-phrase searches.
          </p>
        </div>
      )}

      {!loading && !error && transcript && selectedVideo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Transcript Segment Viewer (col-span-2) */}
          <div className="glass p-5 rounded-xl lg:col-span-2 flex flex-col h-[520px]">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-zinc-800 pb-4 mb-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center">
                <AlignLeft size={16} className="mr-2 text-indigo-400" />
                Transcript Viewer
              </h3>
              
              {/* Search within Transcript */}
              <div className="relative w-full sm:w-60">
                <Search size={16} className="absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search keywords..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Scrollable Transcript Text */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-sm text-zinc-300">
              {filteredSegments.length === 0 ? (
                <p className="text-zinc-500 text-center py-12">
                  No captions match "{searchTerm}".
                </p>
              ) : (
                filteredSegments.map((seg, idx) => (
                  <div key={idx} className="flex space-x-3 group hover:bg-zinc-900/10 p-1.5 rounded transition-colors">
                    <span className="text-indigo-400 font-mono font-semibold text-xs select-none w-12 flex-shrink-0 pt-0.5">
                      {formatTimestamp(seg.start)}
                    </span>
                    <p className="text-zinc-300 group-hover:text-zinc-100 leading-relaxed">
                      {seg.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Footer actions */}
            <div className="flex justify-end gap-3 mt-4 border-t border-zinc-800 pt-4">
              <button
                onClick={handleCopy}
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Copy size={14} /> Copy Text
              </button>
              <button
                onClick={handleExportTxt}
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download size={14} /> Export TXT
              </button>
              <button
                onClick={handleExportPdf}
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download size={14} /> Export PDF
              </button>
            </div>
          </div>

          {/* Right: Transcript Analytics (col-span-1) */}
          <div className="space-y-6">
            
            {/* Quick stats card */}
            <div className="glass p-5 rounded-xl space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center border-b border-zinc-800 pb-3">
                <BarChart2 size={16} className="mr-2 text-violet-400" />
                Transcript Analytics
              </h3>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Total Words:</span>
                <span className="font-mono font-bold text-zinc-200">{transcript.word_count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Speaking Time:</span>
                <span className="font-mono font-bold text-zinc-200 flex items-center gap-1">
                  <Clock size={14} className="text-violet-400" />
                  {Math.round(transcript.speaking_duration_seconds / 60)} mins
                </span>
              </div>
            </div>

            {/* Keyword Density Cloud */}
            <div className="glass p-5 rounded-xl space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center border-b border-zinc-800 pb-3">
                <AlignLeft size={16} className="mr-2 text-emerald-400" />
                Key Terms Frequency
              </h3>
              <div className="flex flex-wrap gap-2">
                {transcript.keywords && transcript.keywords.length > 0 ? (
                  transcript.keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="bg-zinc-950 border border-zinc-850 hover:border-zinc-700 px-2.5 py-1 rounded-full text-xs text-zinc-300 flex items-center gap-1.5 transition-colors"
                    >
                      {kw.text}
                      <span className="bg-zinc-900 text-[10px] text-zinc-500 font-mono px-1.5 py-0.2 rounded-full">
                        {kw.value}
                      </span>
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500">No key terms parsed.</p>
                )}
              </div>
            </div>

            {/* Topic Frequency Breakdown */}
            <div className="glass p-5 rounded-xl space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center border-b border-zinc-800 pb-3">
                <AlignLeft size={16} className="mr-2 text-indigo-400" />
                Topic Mapping (%)
              </h3>
              <div className="space-y-3.5">
                {transcript.topics && transcript.topics.length > 0 ? (
                  transcript.topics.map((t, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-zinc-400">
                        <span>{t.topic}</span>
                        <span className="font-mono text-indigo-400">{t.weight}%</span>
                      </div>
                      <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-900">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${t.weight}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500">No topic data available.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
