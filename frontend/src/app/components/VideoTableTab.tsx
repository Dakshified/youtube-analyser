"use client";

import React, { useState, useMemo } from "react";
import { Playlist, Video } from "../services/api";
import { Search, ChevronUp, ChevronDown, Clock, ExternalLink } from "lucide-react";

interface VideoTableTabProps {
  playlist: Playlist;
}

type SortField = "position" | "title" | "duration_seconds" | "publish_date";
type SortOrder = "asc" | "desc";

export default function VideoTableTab({ playlist }: VideoTableTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("position");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const pad = (num: number) => String(num).padStart(2, "0");
    
    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${mins}:${pad(secs)}`;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filter and Sort videos
  const processedVideos = useMemo(() => {
    let result = [...playlist.videos];

    // 1. Search filter
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(term) ||
          v.description.toLowerCase().includes(term)
      );
    }

    // 2. Sorting
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle null/undefined values
      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortOrder === "asc"
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });

    return result;
  }, [playlist.videos, searchTerm, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(processedVideos.length / itemsPerPage);
  const paginatedVideos = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedVideos.slice(start, start + itemsPerPage);
  }, [processedVideos, currentPage]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />;
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Search videos in playlist..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-sm outline-none focus:border-indigo-500 transition-colors"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // reset to page 1 on new search
            }}
          />
        </div>
        <div className="text-xs text-zinc-500 w-full md:w-auto text-right">
          Showing {processedVideos.length} of {playlist.video_count} videos
        </div>
      </div>

      {/* Videos Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 text-xs uppercase font-semibold select-none">
                <th className="py-3 px-4 w-12 cursor-pointer" onClick={() => handleSort("position")}>
                  # <SortIcon field="position" />
                </th>
                <th className="py-3 px-4 w-24">Thumbnail</th>
                <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort("title")}>
                  Title <SortIcon field="title" />
                </th>
                <th className="py-3 px-4 w-28 cursor-pointer" onClick={() => handleSort("duration_seconds")}>
                  Duration <SortIcon field="duration_seconds" />
                </th>
                <th className="py-3 px-4 w-36 cursor-pointer" onClick={() => handleSort("publish_date")}>
                  Publish Date <SortIcon field="publish_date" />
                </th>
                <th className="py-3 px-4 w-16 text-center">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {paginatedVideos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    No videos match your search criteria.
                  </td>
                </tr>
              ) : (
                paginatedVideos.map((video) => (
                  <tr key={video.id} className="hover:bg-zinc-900/20 text-zinc-300 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-zinc-500">
                      {video.position + 1}
                    </td>
                    <td className="py-3 px-4">
                      {/* Thumbnail with duration overlay */}
                      <div className="relative w-20 aspect-video bg-zinc-950 rounded overflow-hidden border border-zinc-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={video.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&q=80"}
                          alt=""
                          className="object-cover w-full h-full"
                          loading="lazy"
                        />
                        <span className="absolute bottom-0.5 right-0.5 bg-black/80 px-1 py-0.2 rounded text-[10px] font-mono text-zinc-300">
                          {formatDuration(video.duration_seconds)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-200 line-clamp-1" title={video.title}>
                        {video.title}
                      </div>
                      <div className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                        {video.description || "No description provided."}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-zinc-400">
                      {formatDuration(video.duration_seconds)}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-zinc-400">
                      {video.publish_date}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <a
                        href={`https://www.youtube.com/watch?v=${video.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-zinc-800/40 transition-colors"
                        title="Watch on YouTube"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500 pt-2">
          <div>
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 disabled:opacity-50 disabled:hover:border-zinc-800 text-zinc-300 px-3 py-1 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 disabled:opacity-50 disabled:hover:border-zinc-800 text-zinc-300 px-3 py-1 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
