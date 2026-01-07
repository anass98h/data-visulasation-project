"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Trash2, RefreshCw, Loader2, Lock } from "lucide-react";
import { APP_CONFIG } from "@/config/app.config";

const API_URL = APP_CONFIG.API.BASE_URL;

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

interface DemoSelectorHomePageProps {
  onDemoSelect: (demoId: string) => void;
  selectedDemoId?: string;
}

export function DemoSelectorHomePage({
  onDemoSelect,
  selectedDemoId,
}: DemoSelectorHomePageProps) {
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

      // Auto-select the first demo if none is selected
      if (!selectedDemoId && data.demos.length > 0) {
        onDemoSelect(data.demos[0].demo_id);
      }
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

  const handleDelete = async (demoId: string) => {
    if (!confirm("Are you sure you want to delete this demo?")) return;

    try {
      const response = await fetch(`${API_URL}/demo/${demoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete demo");
      }

      await fetchDemos();
      if (selectedDemoId === demoId) {
        onDemoSelect("");
      }
    } catch (err) {
      console.error("Error deleting demo:", err);
      alert("Failed to delete demo");
    }
  };

  // Get the selected demo's name for display
  const selectedDemo = demos.find((demo) => demo.demo_id === selectedDemoId);

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
          onClick={fetchDemos}
          size="sm"
          className="bg-gray-700 border-gray-600 hover:bg-gray-600 text-white h-8"
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  if (demos.length === 0) {
    return (
      <div className="text-sm text-gray-400 italic h-10 flex items-center">
        No demos available. Upload a demo to get started.
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center w-full">
      <div className="flex-1 relative">
        <Select value={selectedDemoId || ""} onValueChange={onDemoSelect}>
          <SelectTrigger className="flex-1 h-10 bg-gray-700 border-gray-600 text-white">
            <div className="flex items-center gap-2 w-full">
              <SelectValue placeholder="Select a demo">
                {selectedDemo ? (
                  <span className="text-sm font-medium truncate">
                    {selectedDemo.demo_name || selectedDemo.demo_id}
                  </span>
                ) : (
                  "Select a demo"
                )}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600 max-h-[300px]">
            {demos.map((demo) => (
              <SelectItem
                key={demo.demo_id}
                value={demo.demo_id}
                className="text-gray-200 focus:bg-gray-700 focus:text-white cursor-pointer"
              >
                <div className="flex flex-col text-left">
                  <span className="font-medium">
                    {demo.demo_name || demo.demo_id}
                  </span>
                  <span className="text-xs text-gray-400">
                    {demo.map_name} •{" "}
                    {new Date(demo.created_at).toLocaleDateString()}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative">
        <Button
          size="icon"
          onClick={() => selectedDemoId && handleDelete(selectedDemoId)}
          disabled={!selectedDemoId}
          className="h-10 w-10 bg-gray-700 hover:bg-red-900/50 hover:text-red-400 border-gray-600 text-gray-400 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative">
        <Button
          size="icon"
          onClick={fetchDemos}
          className="h-10 w-10 bg-gray-700 border-gray-600 hover:bg-gray-600 text-white shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
        <div className="absolute -right-1 -top-1 pointer-events-auto z-10">
          <InfoTooltip content="Refresh demo list" side="bottom" />
        </div>
      </div>
    </div>
  );
}
