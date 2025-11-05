"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Team } from "@/types/clustering";
import { DEFAULT_TIMEPOINTS } from "@/config/clustering.config";

type TeamOption = Team | "both";

interface ControlsProps {
  team: TeamOption;
  onTeamChange: (team: TeamOption) => void;
  selectedTimepoints: number[];
  onToggleTimepoint: (tp: number) => void;
  economyWeight: number; // 0..1
  onEconomyWeightChange: (w: number) => void;
  // t-SNE params
  perplexity?: number;
  onPerplexityChange?: (v: number) => void;
  learningRate?: number;
  onLearningRateChange?: (v: number) => void;
  iterations?: number;
  onIterationsChange?: (v: number) => void;
  // clustering method/params
  clusterMethod?: "kmeans" | "dbscan";
  onClusterMethodChange?: (m: "kmeans" | "dbscan") => void;
  k?: number;
  onKChange?: (k: number) => void;
  eps?: number;
  onEpsChange?: (e: number) => void;
  minPts?: number;
  onMinPtsChange?: (m: number) => void;
  // representatives prediction filter
  economyBucket?: "none" | "low" | "mid" | "high";
  onEconomyBucketChange?: (b: "none" | "low" | "mid" | "high") => void;
  onRun: () => void;
  onPredict?: () => void;
  disabled?: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  team,
  onTeamChange,
  selectedTimepoints,
  onToggleTimepoint,
  economyWeight,
  onEconomyWeightChange,
  onRun,
  perplexity = 10,
  onPerplexityChange,
  learningRate = 200,
  onLearningRateChange,
  iterations = 1500,
  onIterationsChange,
  clusterMethod = "kmeans",
  onClusterMethodChange,
  k = 5,
  onKChange,
  eps = 0.8,
  onEpsChange,
  minPts = 6,
  onMinPtsChange,
  economyBucket = "none",
  onEconomyBucketChange,
  onPredict,
  disabled,
}) => {
  const timepoints = DEFAULT_TIMEPOINTS;

  return (
    <Card className="bg-gray-800 border border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg">Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team picker */}
        <div>
          <div className="text-sm text-gray-300 mb-2">Team</div>
          <div className="flex items-center gap-2">
            {(["both", "CT", "T"] as TeamOption[]).map((t) => (
              <button
                key={t}
                onClick={() => onTeamChange(t)}
                className={`px-3 py-1 rounded text-sm border transition-colors ${
                  team === t
                    ? "bg-blue-600 border-blue-500"
                    : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Timepoints */}
        <div>
          <div className="text-sm text-gray-300 mb-2">Timepoints (seconds)</div>
          <div className="flex flex-wrap gap-2">
            {timepoints.map((tp) => {
              const active = selectedTimepoints.includes(tp);
              return (
                <label
                  key={tp}
                  className={`flex items-center gap-2 px-3 py-1 rounded border text-sm cursor-pointer select-none ${
                    active
                      ? "bg-green-700 border-green-600"
                      : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => onToggleTimepoint(tp)}
                    className="accent-green-400"
                  />
                  {tp}s
                </label>
              );
            })}
          </div>
        </div>

        {/* Economy weight */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-300">Economy weight</div>
            <div className="text-xs text-gray-400">{economyWeight.toFixed(2)}</div>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={economyWeight}
            onChange={(e) => onEconomyWeightChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* t-SNE parameters */}
        <div className="space-y-3">
          <div className="text-sm text-gray-300">t‑SNE Parameters</div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <label className="w-28">Perplexity</label>
            <input
              type="number"
              min={5}
              max={60}
              value={perplexity}
              onChange={(e) => onPerplexityChange && onPerplexityChange(Number(e.target.value))}
              className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <label className="w-28">Iterations</label>
            <input
              type="number"
              min={250}
              max={4000}
              value={iterations}
              onChange={(e) => onIterationsChange && onIterationsChange(Number(e.target.value))}
              className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <label className="w-28">Learning rate</label>
            <input
              type="number"
              min={10}
              max={1000}
              value={learningRate}
              onChange={(e) => onLearningRateChange && onLearningRateChange(Number(e.target.value))}
              className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1"
            />
          </div>
        </div>

        {/* Clustering method */}
        <div className="space-y-2">
          <div className="text-sm text-gray-300">Clustering</div>
          <div className="flex items-center gap-2">
            {["kmeans", "dbscan"].map((m) => (
              <button
                key={m}
                onClick={() => onClusterMethodChange && onClusterMethodChange(m as any)}
                className={`px-3 py-1 rounded text-sm border transition-colors ${
                  clusterMethod === m
                    ? "bg-blue-600 border-blue-500"
                    : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {clusterMethod === "kmeans" ? (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <label className="w-20">k</label>
              <input
                type="number"
                min={1}
                max={20}
                value={k}
                onChange={(e) => onKChange && onKChange(Number(e.target.value))}
                className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1"
              />
            </div>
          ) : (
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <label className="w-20">eps</label>
                <input
                  type="number"
                  step={0.05}
                  value={eps}
                  onChange={(e) => onEpsChange && onEpsChange(Number(e.target.value))}
                  className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-20">minPts</label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={minPts}
                  onChange={(e) => onMinPtsChange && onMinPtsChange(Number(e.target.value))}
                  className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1"
                />
              </div>
            </div>
          )}
        </div>

        {/* Representative filter */}
        <div className="space-y-2">
          <div className="text-sm text-gray-300">Economy bucket (preview)</div>
          <div className="flex items-center gap-2">
            {["none", "low", "mid", "high"].map((b) => (
              <button
                key={b}
                onClick={() => onEconomyBucketChange && onEconomyBucketChange(b as any)}
                className={`px-3 py-1 rounded text-sm border transition-colors ${
                  economyBucket === b
                    ? "bg-blue-600 border-blue-500"
                    : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <Button onClick={onRun} disabled={disabled} className="w-full">
            Run (placeholder)
          </Button>
          {onPredict && (
            <Button onClick={onPredict} disabled={disabled} variant="outline" className="w-full mt-2">
              Predict Most Likely Setup
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Controls;
