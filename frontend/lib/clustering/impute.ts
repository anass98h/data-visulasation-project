"use client";

import type { Snapshot, Team } from "@/types/clustering";

export interface ImputeOptions {
  maxDeltaSeconds?: number; // only impute if nearest snapshot within this window
}

const DEFAULTS: Required<ImputeOptions> = {
  maxDeltaSeconds: 15,
};

// For each (round, team), ensure we have a snapshot for every selected timepoint.
// If missing, duplicate the nearest available snapshot (within maxDeltaSeconds)
// and overwrite its timepoint.
export function imputeMissingSnapshots(
  snapshots: Snapshot[],
  selectedTimepoints: number[],
  opts?: ImputeOptions
): Snapshot[] {
  const options = { ...DEFAULTS, ...(opts || {}) };
  const byKey = new Map<string, Snapshot[]>();
  for (const s of snapshots) {
    const key = `${s.roundNum}|${s.team}`;
    const arr = byKey.get(key) || [];
    arr.push(s);
    byKey.set(key, arr);
  }

  const out: Snapshot[] = [...snapshots];
  const tps = [...selectedTimepoints].sort((a, b) => a - b);

  byKey.forEach((list, key) => {
    // Map of existing timepoints for this group
    const have = new Map<number, Snapshot>();
    list.forEach((s) => have.set(s.timepoint, s));

    for (const tp of tps) {
      if (have.has(tp)) continue;
      // find nearest snapshot by absolute timepoint difference
      let best: Snapshot | null = null;
      let bestDelta = Infinity;
      for (const s of list) {
        const d = Math.abs(s.timepoint - tp);
        if (d < bestDelta) {
          bestDelta = d; best = s;
        }
      }
      if (best && bestDelta <= options.maxDeltaSeconds) {
        // duplicate with updated timepoint
        out.push({ ...best, timepoint: tp });
      }
    }
  });

  return out;
}

