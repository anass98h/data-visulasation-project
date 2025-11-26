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
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-200">Select Matches to Cluster</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchDemos}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>
      <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-md p-2 bg-slate-950/50">
        {demos.map((demo) => (
          <div
            key={demo.demo_id}
            className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
              disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-800"
            }`}
            onClick={() => toggleDemo(demo.demo_id)}
          >
            <input
              type="checkbox"
              checked={selectedDemoIds.includes(demo.demo_id)}
              disabled={disabled}
              onChange={() => {}} // Handled by parent div click
              className="rounded border-gray-600 bg-slate-900 disabled:opacity-50"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-gray-200">
                {demo.demo_name || demo.demo_id}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(demo.date).toLocaleDateString()} - {demo.map_name}
              </div>
            </div>
          </div>
        ))}
        {demos.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-4">
            No demos found
          </div>
        )}
      </div>
    </div>
  );
}
