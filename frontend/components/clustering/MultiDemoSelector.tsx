"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";

const API_URL = "http://localhost:8000";

interface Demo {
  demo_id: string;
  map_name: string;
  date: string;
  team_ct?: string;
  team_t?: string;
  demo_name?: string;
  score_ct?: number;
  score_t?: number;
  created_at: string;
}

interface MultiDemoSelectorProps {
  onDemoSelect: (demoIds: string[]) => void;
  selectedDemoIds: string[];
  disabled?: boolean;
}

export function MultiDemoSelector({
  onDemoSelect,
  selectedDemoIds,
  disabled = false,
}: MultiDemoSelectorProps) {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDemos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/demos`);
      if (!response.ok) {
        throw new Error("Failed to fetch demos");
      }
      const data = await response.json();
      setDemos(data.demos);
    } catch (err) {
      console.error("Error fetching demos:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemos();
  }, []);

  const toggleDemo = (demoId: string) => {
    if (disabled) return;
    if (selectedDemoIds.includes(demoId)) {
      onDemoSelect(selectedDemoIds.filter((id) => id !== demoId));
    } else {
      onDemoSelect([...selectedDemoIds, demoId]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 h-10">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading demos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-400">Error loading demos</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchDemos}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-100">
            Demo Selection
          </h3>
          {selectedDemoIds.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
              {selectedDemoIds.length} selected
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchDemos}
          disabled={loading}
          className="h-7 px-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <div className="relative">
        <div className="max-h-[240px] overflow-y-auto space-y-1.5 border border-gray-700 rounded-lg p-3 bg-gray-800/50 backdrop-blur-sm">
          {demos.map((demo) => {
            const isSelected = selectedDemoIds.includes(demo.demo_id);
            return (
              <div
                key={demo.demo_id}
                className={`
                  group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer
                  transition-all duration-200 border
                  ${
                    disabled
                      ? "opacity-40 cursor-not-allowed"
                      : isSelected
                      ? "bg-blue-500/10 border-blue-500/50 hover:bg-blue-500/15"
                      : "bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/70 hover:border-gray-600/70"
                  }
                `}
                onClick={() => toggleDemo(demo.demo_id)}
              >
                {/* Custom Checkbox */}
                <div
                  className={`
                  flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center
                  transition-all duration-200
                  ${
                    isSelected
                      ? "bg-blue-500 border-blue-500"
                      : "bg-gray-900 border-gray-600 group-hover:border-gray-500"
                  }
                `}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </div>

                {/* Demo Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-sm font-medium truncate ${
                        isSelected ? "text-gray-100" : "text-gray-200"
                      }`}
                    >
                      {demo.demo_name || demo.demo_id}
                    </span>
                    {demo.score_ct != null && demo.score_t != null && (
                      <span className="text-xs text-gray-500 font-mono flex-shrink-0">
                        {demo.score_ct}:{demo.score_t}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {new Date(demo.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                      {demo.map_name}
                    </span>
                  </div>
                  {(demo.team_ct || demo.team_t) && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {demo.team_ct && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                          {demo.team_ct}
                        </span>
                      )}
                      <span className="text-gray-600 text-xs">vs</span>
                      {demo.team_t && (
                        <span className="px-1.5 py-0.5 text-xs bg-orange-500/10 text-orange-400 rounded border border-orange-500/20">
                          {demo.team_t}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-lg ring-1 ring-blue-500/30 pointer-events-none"></div>
                )}
              </div>
            );
          })}
          {demos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <svg
                className="w-12 h-12 mb-2 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm">No demos available</p>
            </div>
          )}
        </div>

        {/* Scrollbar styling hint */}
        <style jsx>{`
          div::-webkit-scrollbar {
            width: 6px;
          }
          div::-webkit-scrollbar-track {
            background: rgba(31, 41, 55, 0.5);
            border-radius: 3px;
          }
          div::-webkit-scrollbar-thumb {
            background: rgba(75, 85, 99, 0.8);
            border-radius: 3px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: rgba(107, 114, 128, 0.9);
          }
        `}</style>
      </div>
    </div>
  );
}
