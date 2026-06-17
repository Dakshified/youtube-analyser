"use client";

import React, { useState, useEffect } from "react";
import { Playlist, api, AISummary } from "../services/api";
import { Brain, AlignLeft, FileText, Download, Copy, RefreshCw, AlertCircle } from "lucide-react";

interface AISummaryTabProps {
  playlist: Playlist;
}

export default function AISummaryTab({ playlist }: AISummaryTabProps) {
  const [mode, setMode] = useState<"playlist" | "video">("playlist");
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [notesResult, setNotesResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handlePlaylistSummary = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api.getPlaylistSummary(playlist.id);
      setResult(data.summary);
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate course objectives. Make sure the backend is active.");
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSummary = async () => {
    if (!selectedVideoId) {
      alert("Please select a video first.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setNotesResult(null);
    try {
      const vid = playlist.videos.find(v => v.id === selectedVideoId);
      const title = vid?.title || "";
      
      // Fetch both Summary & Notes concurrently
      const [sumData, notesData] = await Promise.all([
        api.getVideoSummary(selectedVideoId, title),
        api.getVideoNotes(selectedVideoId, title)
      ]);
      
      setResult(sumData.summary);
      setNotesResult(notesData.summary);
    } catch (err: any) {
      console.error(err);
      setError("Failed to compile video summaries.");
    } finally {
      setLoading(false);
    }
  };

  // Run playlist summary automatically on mount
  useEffect(() => {
    if (mode === "playlist" && !result) {
      handlePlaylistSummary();
    }
  }, [mode]);

  const handleCopyNotes = () => {
    if (!notesResult?.revision_notes) return;
    navigator.clipboard.writeText(notesResult.revision_notes);
    alert("Study notes copied to clipboard!");
  };

  const handleExportMarkdown = () => {
    if (!notesResult?.revision_notes) return;
    const vid = playlist.videos.find(v => v.id === selectedVideoId);
    const title = vid?.title || "Video";
    const blob = new Blob([notesResult.revision_notes], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Study_Notes_${title.replace(/[^a-zA-Z0-9]/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportPdf = () => {
    if (!notesResult || !selectedVideoId) return;
    const vid = playlist.videos.find(v => v.id === selectedVideoId);
    if (!vid) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Convert simple markdown headings into html for printable sheet
    const cleanHtmlNotes = notesResult.revision_notes
      .replace(/# (.*)/g, "<h1 style='color: #6366f1; border-bottom: 2px solid #ddd; padding-bottom: 8px;'>$1</h1>")
      .replace(/## (.*)/g, "<h2 style='color: #111; margin-top: 24px;'>$1</h2>")
      .replace(/### (.*)/g, "<h3 style='color: #333;'>$1</h3>")
      .replace(/- \*\*(.*?)\*\*/g, "<li><strong>$1</strong>")
      .replace(/\n\n/g, "<br/><br/>");

    const defsHtml = Object.entries(notesResult.definitions || {}).map(([term, definition]) => 
      `<div style="margin-bottom: 12px;">
        <span style="font-weight: bold; color: #6366f1;">${term}:</span>
        <span>${definition}</span>
      </div>`
    ).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Study Notes - ${vid.title}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; color: #222; }
            .section { margin-top: 30px; }
            h2 { color: #6366f1; }
          </style>
        </head>
        <body>
          <div>${cleanHtmlNotes}</div>
          
          <div class="section" style="page-break-before: always;">
            <h1 style="color: #6366f1; border-bottom: 2px solid #ddd; padding-bottom: 8px;">Glossary & Core Definitions</h1>
            <div style="margin-top: 20px;">${defsHtml}</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Custom simple parser to show markdown preview
  const renderSimpleMarkdown = (markdown: string) => {
    if (!markdown) return null;
    const lines = markdown.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("# ")) {
        return <h2 key={idx} className="text-xl font-bold text-zinc-100 mt-4 mb-2">{line.replace("# ", "")}</h2>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={idx} className="text-lg font-bold text-zinc-200 mt-4 mb-2">{line.replace("## ", "")}</h3>;
      }
      if (line.startsWith("- ")) {
        // Parse bold elements in bullet points
        const text = line.replace("- ", "");
        const boldMatch = text.match(/\*\*(.*?)\*\*/);
        if (boldMatch) {
          const parts = text.split(/\*\*.*?\*\*/);
          return (
            <li key={idx} className="ml-4 list-disc text-sm text-zinc-300 mb-1">
              <strong>{boldMatch[1]}</strong>{parts[1]}
            </li>
          );
        }
        return <li key={idx} className="ml-4 list-disc text-sm text-zinc-300 mb-1">{text}</li>;
      }
      if (line.trim() === "") return <div key={idx} className="h-2"></div>;
      return <p key={idx} className="text-sm text-zinc-300 leading-relaxed mb-2">{line}</p>;
    });
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle Controls */}
      <div className="glass p-4 rounded-xl flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setMode("playlist");
              setResult(null);
              setError("");
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              mode === "playlist"
                ? "bg-indigo-600 text-white"
                : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            📋 Course Blueprint Map
          </button>
          <button
            onClick={() => {
              setMode("video");
              setResult(null);
              setNotesResult(null);
              setError("");
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              mode === "video"
                ? "bg-indigo-600 text-white"
                : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            🤖 Video Summary & Notes
          </button>
        </div>
      </div>

      {/* Inputs for Video mode */}
      {mode === "video" && (
        <div className="glass p-5 rounded-xl flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs text-zinc-400 font-semibold mb-2 uppercase">
              Choose Lesson Video
            </label>
            <select
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-200 outline-none focus:border-indigo-500 cursor-pointer"
              value={selectedVideoId}
              onChange={(e) => setSelectedVideoId(e.target.value)}
            >
              <option value="">-- Select a video --</option>
              {playlist.videos.map((v) => (
                <option key={v.id} value={v.id}>
                  Video {v.position + 1}: {v.title}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleVideoSummary}
            disabled={!selectedVideoId || loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors w-full sm:w-auto justify-center"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Generate Summary
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-sm text-zinc-400">Consulting AI Summary Engine...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} className="flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && !result && mode === "video" && (
        <div className="glass p-12 rounded-xl text-center text-zinc-500 flex flex-col items-center justify-center space-y-4">
          <Brain size={48} className="text-zinc-700" />
          <p className="max-w-md text-sm">
            Select an individual playlist lecture to generate key learning insights, core takeaways, definitions glossary, and exportable study outlines.
          </p>
        </div>
      )}

      {/* Display Results */}
      {!loading && !error && result && (
        <div className="space-y-6">
          
          {/* Section 1: Top Cards (col-span of objects/takeaways) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Objective / Concepts Card */}
            <div className="glass p-5 rounded-xl border-l-2 border-indigo-500">
              <h4 className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-3 flex items-center">
                <Brain size={14} className="mr-1 text-indigo-400" />
                {mode === "playlist" ? "Learning Objectives" : "Key Concepts"}
              </h4>
              <ul className="space-y-2">
                {(result.learning_objectives || result.key_concepts || []).map((item: string, idx: number) => (
                  <li key={idx} className="text-sm text-zinc-300 leading-relaxed flex items-start">
                    <span className="text-indigo-400 mr-2">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Topics covered / Important points Card */}
            <div className="glass p-5 rounded-xl border-l-2 border-violet-500">
              <h4 className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-3 flex items-center">
                <AlignLeft size={14} className="mr-1 text-violet-400" />
                {mode === "playlist" ? "Topics Covered" : "Important Details"}
              </h4>
              <ul className="space-y-2">
                {(result.topics_covered || result.important_points || []).map((item: string, idx: number) => (
                  <li key={idx} className="text-sm text-zinc-300 leading-relaxed flex items-start">
                    <span className="text-violet-400 mr-2">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Skills taught / Main Takeaways Card */}
            <div className="glass p-5 rounded-xl border-l-2 border-emerald-500">
              <h4 className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-3 flex items-center">
                <FileText size={14} className="mr-1 text-emerald-400" />
                {mode === "playlist" ? "Expected Skills" : "Core Takeaways"}
              </h4>
              <ul className="space-y-2">
                {(result.skills_taught || result.takeaways || []).map((item: string, idx: number) => (
                  <li key={idx} className="text-sm text-zinc-300 leading-relaxed flex items-start">
                    <span className="text-emerald-400 mr-2">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Section 2: Detailed Revision Notes (only in Video mode) */}
          {mode === "video" && notesResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Revision Sheets */}
              <div className="glass p-5 rounded-xl lg:col-span-2 space-y-4 flex flex-col h-[520px]">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-semibold text-zinc-300 flex items-center">
                    <FileText size={16} className="mr-2 text-indigo-400" />
                    Lecture Revision Sheet
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyNotes}
                      className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                      title="Copy notes"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={handleExportMarkdown}
                      className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                      title="Export Markdown"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                  {renderSimpleMarkdown(notesResult.revision_notes)}
                </div>
              </div>

              {/* Definitions Glossary & Bullet Summaries */}
              <div className="space-y-6">
                
                {/* Definitions */}
                <div className="glass p-5 rounded-xl space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-3">
                    📚 Term Glossary
                  </h3>
                  <div className="space-y-3.5 max-h-56 overflow-y-auto pr-2">
                    {notesResult.definitions && Object.entries(notesResult.definitions).length > 0 ? (
                      Object.entries(notesResult.definitions).map(([term, def]: any) => (
                        <div key={term} className="text-xs">
                          <p className="font-semibold text-indigo-400">{term}</p>
                          <p className="text-zinc-400 mt-0.5 leading-relaxed">{def}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-zinc-500">No definitions provided.</p>
                    )}
                  </div>
                </div>

                {/* Summaries list */}
                <div className="glass p-5 rounded-xl space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-3">
                    📝 Quick Bullet Summaries
                  </h3>
                  <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 text-xs">
                    {(notesResult.bullet_summaries || []).map((summary: string, idx: number) => (
                      <li key={idx} className="text-zinc-400 leading-relaxed flex items-start">
                        <span className="text-indigo-400 mr-2 flex-shrink-0">•</span>
                        {summary}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Print button */}
                <button
                  onClick={handleExportPdf}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Download size={16} /> Export Study PDF
                </button>

              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}
