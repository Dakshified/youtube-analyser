import React, { useState, useEffect } from "react";
import { api, Video, Transcript } from "../services/api";
import { Search, Copy, Download, FileText, Check, Loader2 } from "lucide-react";

interface TranscriptViewerProps {
  video: Video;
  onSeek?: (seconds: number) => void;
}

export default function TranscriptViewer({ video, onSeek }: TranscriptViewerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchTranscript = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api.getTranscript(video.id, video.title);
        setTranscript(data);
      } catch (err: any) {
        console.error(err);
        setError("Failed to fetch captions. Ensure they exist on YouTube.");
      } finally {
        setLoading(false);
      }
    };
    fetchTranscript();
  }, [video.id, video.title]);

  const handleCopy = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript.raw_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportTxt = () => {
    if (!transcript) return;
    const blob = new Blob([transcript.raw_text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${video.title.slice(0, 30)}_transcript.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (!transcript) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Transcript: ${video.title}</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; line-height: 1.6; }
            h1 { border-bottom: 2px solid #6366f1; padding-bottom: 10px; font-size: 22px; color: #0f172a; }
            .meta { font-size: 13px; color: #64748b; margin-bottom: 30px; }
            p { font-size: 14px; text-align: justify; }
          </style>
        </head>
        <body>
          <h1>Transcript of "${video.title}"</h1>
          <div class="meta">
            Channel: ${video.channel_title} | Publish Date: ${video.publish_date} <br/>
            Word Count: ${transcript.word_count} | Speaking Time: ${Math.round(transcript.speaking_duration_seconds / 60)} mins
          </div>
          <p>${transcript.raw_text}</p>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const filteredSegments = transcript
    ? transcript.segments.filter((seg) =>
        seg.text.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div className="glass p-5 rounded-2xl space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Transcript Viewer</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Search and navigate through captions</p>
        </div>

        {transcript && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-initial bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={handleExportTxt}
              className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              title="Export as TXT"
            >
              <FileText size={13} />
              <span className="hidden md:inline">TXT</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              title="Export as PDF"
            >
              <Download size={13} />
              <span>PDF Report</span>
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-10 space-y-2">
          <Loader2 className="animate-spin text-indigo-500" size={24} />
          <span className="text-xs text-zinc-500 font-medium">Extracting subtitles...</span>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
          {error}
        </div>
      )}

      {transcript && (
        <div className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-950/40 border border-zinc-800 p-3 rounded-xl text-center">
              <p className="text-[10px] text-zinc-500 uppercase font-semibold">Word Count</p>
              <p className="text-sm font-bold text-zinc-200 mt-1">{transcript.word_count.toLocaleString()}</p>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-800 p-3 rounded-xl text-center">
              <p className="text-[10px] text-zinc-500 uppercase font-semibold">Character Count</p>
              <p className="text-sm font-bold text-zinc-200 mt-1">{transcript.character_count.toLocaleString()}</p>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-800 p-3 rounded-xl text-center">
              <p className="text-[10px] text-zinc-500 uppercase font-semibold">Estimated Speaking Time</p>
              <p className="text-sm font-bold text-zinc-200 mt-1">
                {Math.round(transcript.speaking_duration_seconds / 60)} min
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-zinc-650" size={14} />
            <input
              type="text"
              placeholder="Search in transcript..."
              className="w-full bg-zinc-950/60 border border-zinc-850 focus:border-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs text-zinc-200 outline-none transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Text list */}
          <div className="h-60 overflow-y-auto border border-zinc-800 rounded-xl bg-zinc-950/30 p-3 space-y-2.5 custom-scrollbar">
            {filteredSegments.length > 0 ? (
              filteredSegments.map((seg, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-3 text-xs leading-relaxed text-zinc-400 group hover:bg-zinc-900/40 p-1.5 rounded transition-colors"
                >
                  <button
                    onClick={() => onSeek?.(seg.start)}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer bg-indigo-500/10 px-1.5 py-0.5 rounded flex-shrink-0"
                  >
                    {formatTime(seg.start)}
                  </button>
                  <span className="flex-1">{seg.text}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-zinc-650 py-10">
                {search ? "No matching segments found." : "Transcript is empty."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
