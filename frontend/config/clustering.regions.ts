"use client";

import { MAP_CONFIG } from "@/config/clustering.config";

// Define rough A/B site polygons per map using normalized [0,1] coordinates
// relative to the map bounds. These are approximations and should be refined
// per your radar alignment. They’re designed to be easy to tweak later.

type NormPt = { x: number; y: number };
type RegionDef = { A: NormPt[]; B: NormPt[] };

const DEFAULT_REGIONS: Record<string, RegionDef> = {
  de_mirage: {
    // Approx: A site in the upper-right quadrant, B site upper-left
    A: [
      { x: 0.68, y: 0.70 },
      { x: 0.92, y: 0.70 },
      { x: 0.92, y: 0.92 },
      { x: 0.68, y: 0.92 },
    ],
    B: [
      { x: 0.08, y: 0.68 },
      { x: 0.36, y: 0.68 },
      { x: 0.36, y: 0.92 },
      { x: 0.08, y: 0.92 },
    ],
  },
  de_ancient: {
    // Approx: A site right side, B site left side
    A: [
      { x: 0.62, y: 0.60 },
      { x: 0.90, y: 0.60 },
      { x: 0.90, y: 0.88 },
      { x: 0.62, y: 0.88 },
    ],
    B: [
      { x: 0.10, y: 0.60 },
      { x: 0.38, y: 0.60 },
      { x: 0.38, y: 0.88 },
      { x: 0.10, y: 0.88 },
    ],
  },
};

export type WorldPt = { x: number; y: number };

export function getSitePolygons(mapName: string): { A: WorldPt[]; B: WorldPt[] } | null {
  const def = DEFAULT_REGIONS[mapName];
  if (!def) return null;
  const cfg = MAP_CONFIG[(mapName as keyof typeof MAP_CONFIG) || "de_ancient"] || MAP_CONFIG.de_ancient;
  const toWorld = (p: NormPt): WorldPt => ({
    x: cfg.minX + p.x * (cfg.maxX - cfg.minX),
    y: cfg.minY + p.y * (cfg.maxY - cfg.minY),
  });
  return {
    A: def.A.map(toWorld),
    B: def.B.map(toWorld),
  };
}

