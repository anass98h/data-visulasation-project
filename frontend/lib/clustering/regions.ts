"use client";

import type { Snapshot } from "@/types/clustering";
import { getSitePolygons, type WorldPt } from "@/config/clustering.regions";

function pointInPolygon(pt: WorldPt, poly: WorldPt[]): boolean {
  // Ray-casting algorithm
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function fractionsInSites(snapshot: Snapshot): { fracA: number; fracB: number } | null {
  const sites = getSitePolygons(snapshot.mapName);
  if (!sites) return null;
  const total = snapshot.players.length || 1;
  let inA = 0, inB = 0;
  for (const p of snapshot.players) {
    const pt = { x: p.x, y: p.y };
    if (pointInPolygon(pt, sites.A)) inA++;
    else if (pointInPolygon(pt, sites.B)) inB++;
  }
  return { fracA: inA / total, fracB: inB / total };
}

export function buildRegionFeaturesForGroup(
  groupSnaps: Snapshot[],
  selectedTimepoints: number[]
): number[] {
  const tps = [...selectedTimepoints].sort((a, b) => a - b);
  const byTP = new Map<number, Snapshot>();
  groupSnaps.forEach((s) => byTP.set(s.timepoint, s));

  const features: number[] = [];
  for (const tp of tps) {
    const s = byTP.get(tp);
    if (!s) {
      // if missing, append zeros (should be imputed earlier)
      features.push(0, 0);
      continue;
    }
    const f = fractionsInSites(s);
    if (!f) { features.push(0, 0); continue; }
    features.push(f.fracA, f.fracB);
  }
  return features;
}

