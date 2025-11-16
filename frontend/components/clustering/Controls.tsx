"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { Team } from "@/types/clustering";
import { DEFAULT_TIMEPOINTS } from "@/config/clustering.config";

interface ControlsProps {
  selectedTeamName: string | null; // Team name like "Vitality", "Mongols", or null for any team
  onTeamNameChange: (teamName: string | null) => void;
  selectedSide: Team; // CT or T
  onSideChange: (side: Team) => void;
  teamMapping?: { CT: string | null; T: string | null }; // actual team names from demo
  selectedTimepoints: number[];
  onToggleTimepoint: (tp: number) => void;
  economyWeight: number; // 0..1
  onEconomyWeightChange: (w: number) => void;
  // reduction method
  reductionMethod?: "tsne" | "umap";
  onReductionMethodChange?: (m: "tsne" | "umap") => void;
  // t-SNE params
  perplexity?: number;
  onPerplexityChange?: (v: number) => void;
  learningRate?: number;
  onLearningRateChange?: (v: number) => void;
  iterations?: number;
  onIterationsChange?: (v: number) => void;
  // UMAP params
  nNeighbors?: number;
  onNNeighborsChange?: (v: number) => void;
  minDist?: number;
  onMinDistChange?: (v: number) => void;
  nEpochs?: number;
  onNEpochsChange?: (v: number) => void;
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
  onAutoTune?: () => void;
  disabled?: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  selectedTeamName,
  onTeamNameChange,
  selectedSide,
  onSideChange,
  teamMapping,
  selectedTimepoints,
  onToggleTimepoint,
  economyWeight,
  onEconomyWeightChange,
  onRun,
  reductionMethod = "tsne",
  onReductionMethodChange,
  perplexity = 10,
  onPerplexityChange,
  learningRate = 200,
  onLearningRateChange,
  iterations = 1500,
  onIterationsChange,
  nNeighbors = 15,
  onNNeighborsChange,
  minDist = 0.1,
  onMinDistChange,
  nEpochs = 400,
  onNEpochsChange,
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
  onAutoTune,
  disabled,
}) => {
  const timepoints = DEFAULT_TIMEPOINTS;

  return (
    <Card className="bg-gray-800 border border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Controls</span>
          {onAutoTune && (
            <button
              onClick={onAutoTune}
              disabled={disabled}
              className="text-xs px-2 py-1 rounded bg-purple-900/50 text-purple-300 hover:bg-purple-800/50 border border-purple-700 flex items-center gap-1 transition-colors"
              title="Automatically suggest optimal parameters based on your data"
            >
              <Sparkles className="w-3 h-3" />
              Auto-tune
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team picker */}
        <div>
          <div className="text-sm text-gray-300 mb-2">Team</div>
          <div className="flex items-center gap-2">
            {teamMapping?.CT && (
              <button
                onClick={() => onTeamNameChange(teamMapping.CT)}
                className={`px-3 py-1 rounded text-sm border transition-colors ${
                  selectedTeamName === teamMapping.CT
                    ? "bg-blue-600 border-blue-500"
                    : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                }`}
              >
                {teamMapping.CT}
              </button>
            )}
            {teamMapping?.T && (
              <button
                onClick={() => onTeamNameChange(teamMapping.T)}
                className={`px-3 py-1 rounded text-sm border transition-colors ${
                  selectedTeamName === teamMapping.T
                    ? "bg-blue-600 border-blue-500"
                    : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                }`}
              >
                {teamMapping.T}
              </button>
            )}
          </div>
        </div>

        {/* Side picker (CT/T) */}
        {selectedTeamName && (
          <div>
            <div className="text-sm text-gray-300 mb-2">Side</div>
            <div className="flex items-center gap-2">
              {(["CT", "T"] as Team[]).map((side) => (
                <button
                  key={side}
                  onClick={() => onSideChange(side)}
                  className={`px-3 py-1 rounded text-sm border transition-colors ${
                    selectedSide === side
                      ? "bg-green-600 border-green-500"
                      : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                  }`}
                >
                  {side}
                </button>
              ))}
            </div>
          </div>
        )}

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

        {/* Reduction method selector */}
        <div className="space-y-2">
          <div className="text-sm text-gray-300">Dimensionality Reduction</div>
          <div className="flex items-center gap-2">
            {["tsne", "umap"].map((m) => (
              <button
                key={m}
                onClick={() => onReductionMethodChange && onReductionMethodChange(m as "tsne" | "umap")}
                className={`px-3 py-1 rounded text-sm border transition-colors ${
                  reductionMethod === m
                    ? "bg-purple-600 border-purple-500"
                    : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* t-SNE parameters */}
        {reductionMethod === "tsne" && (
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
        )}

        {/* UMAP parameters */}
        {reductionMethod === "umap" && (
          <div className="space-y-3">
            <div className="text-sm text-gray-300">UMAP Parameters</div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <label className="w-28">Neighbors</label>
              <input
                type="number"
                min={2}
                max={100}
                value={nNeighbors}
                onChange={(e) => onNNeighborsChange && onNNeighborsChange(Number(e.target.value))}
                className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <label className="w-28">Min Distance</label>
              <input
                type="number"
                step={0.01}
                min={0.0}
                max={0.99}
                value={minDist}
                onChange={(e) => onMinDistChange && onMinDistChange(Number(e.target.value))}
                className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <label className="w-28">Epochs</label>
              <input
                type="number"
                min={100}
                max={1000}
                value={nEpochs}
                onChange={(e) => onNEpochsChange && onNEpochsChange(Number(e.target.value))}
                className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1"
              />
            </div>
          </div>
        )}

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

        <div className="pt-2 space-y-2">
          <Button onClick={onRun} disabled={disabled} className="w-full">
            Run
          </Button>
          {onPredict && (
            <Button onClick={onPredict} disabled={disabled} variant="outline" className="w-full">
              Predict Most Likely Setup
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Controls;
