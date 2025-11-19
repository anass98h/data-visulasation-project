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
import { Trash2, RefreshCw, Loader2 } from "lucide-react";

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

interface DemoSelectorProps {
  onDemoSelect: (demoId: string) => void;
  selectedDemoId?: string;
}

export function DemoSelector({
  onDemoSelect,
  selectedDemoId,
}: DemoSelectorProps) {
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
      <Select value={selectedDemoId} onValueChange={onDemoSelect}>
        <SelectTrigger className="flex-1 h-10 bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
          <SelectValue placeholder="Select a demo" />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-700 text-white">
          {demos.map((demo) => (
            <SelectItem
              key={demo.demo_id}
              value={demo.demo_id}
              className="hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
            >
              <div className="flex flex-col py-1">
                <span className="font-medium text-white text-sm">
                  {demo.map_name}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(demo.date).toLocaleDateString()}{" "}
                  {new Date(demo.date).toLocaleTimeString()}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedDemoId && (
        <Button
          size="icon"
          onClick={() => handleDelete(selectedDemoId)}
          className="h-10 w-10 bg-red-600 hover:bg-red-700 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}

      <Button
        size="icon"
        onClick={fetchDemos}
        className="h-10 w-10 bg-gray-700 border-gray-600 hover:bg-gray-600 text-white shrink-0"
      >
        <RefreshCw className="w-4 h-4" />
      </Button>
    </div>
  );
}
