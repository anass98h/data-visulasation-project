"use client";

import type { Snapshot, Team, Representative } from "@/types/clustering";

export interface RepresentativeOptions {
  timepoint: number;
  team: Team;
}

export interface PredictOptions extends RepresentativeOptions {
  economyBucket?: "low" | "mid" | "high";
}

function teamEconomy(s: Snapshot): number {
  const ct = (s.economy.ctStart || 0) + (s.economy.ctEquip || 0);
  const tt = (s.economy.tStart || 0) + (s.economy.tEquip || 0);
  return s.team === "CT" ? ct : tt;
}

function bucketFor(value: number): "low" | "mid" | "high" {
  // Simple thresholds; can be tuned later.
  if (value < 8000) return "low";
  if (value < 16000) return "mid";
  return "high";
}

// Compute representatives (average per slot) for each cluster
export function computeRepresentatives(
  snapshots: Snapshot[],
  rowsMeta: { roundNum: number; team: Team }[],
  labels: number[],
  opts: RepresentativeOptions
): Map<number, Representative> {
  const { team, timepoint } = opts;
  const byCluster: Map<number, Snapshot[]> = new Map();

  for (let i = 0; i < labels.length; i++) {
    const cid = labels[i];
    if (cid == null || cid < 0) continue;
    const meta = rowsMeta[i];
    if (!meta || meta.team !== team) continue;
    const snap = snapshots.find(
      (s) => s.roundNum === meta.roundNum && s.team === team && s.timepoint === timepoint
    );
    if (!snap) continue;
    const arr = byCluster.get(cid) || [];
    arr.push(snap);
    byCluster.set(cid, arr);
  }

  const out = new Map<number, Representative>();
  byCluster.forEach((list, cid) => {
    if (!list.length) return;
    const slots = list[0].players.length;
    const acc = Array.from({ length: slots }, () => ({ x: 0, y: 0 }));
    list.forEach((s) => {
      for (let j = 0; j < slots; j++) {
        acc[j].x += s.players[j].x;
        acc[j].y += s.players[j].y;
      }
    });
    const avg = acc.map((p) => ({ x: p.x / list.length, y: p.y / list.length }));
    out.set(cid, { players: avg, team, timepoint });
  });

  return out;
}

// Pick the most common (or economy-filtered) cluster and return its representative
export function predictMostLikelySetup(
  snapshots: Snapshot[],
  rowsMeta: { roundNum: number; team: Team }[],
  labels: number[],
  opts: PredictOptions
): { cluster: number; representative: Representative; count: number } | null {
  const { team, timepoint, economyBucket } = opts;

  // Count membership per cluster for the requested team/timepoint (and bucket if provided)
  const counts = new Map<number, number>();
  for (let i = 0; i < labels.length; i++) {
    const cid = labels[i];
    if (cid == null || cid < 0) continue;
    const meta = rowsMeta[i];
    if (!meta || meta.team !== team) continue;
    const snap = snapshots.find(
      (s) => s.roundNum === meta.roundNum && s.team === team && s.timepoint === timepoint
    );
    if (!snap) continue;
    if (economyBucket && bucketFor(teamEconomy(snap)) !== economyBucket) continue;
    counts.set(cid, (counts.get(cid) || 0) + 1);
  }

  // Select cluster with highest count
  let bestCluster: number | null = null;
  let bestCount = 0;
  counts.forEach((c, cid) => {
    if (c > bestCount) { bestCount = c; bestCluster = cid; }
  });
  if (bestCluster == null) return null;

  // Compute representative for the selected cluster
  const reps = computeRepresentatives(snapshots, rowsMeta, labels, { team, timepoint });
  const rep = reps.get(bestCluster);
  if (!rep) return null;
  return { cluster: bestCluster, representative: rep, count: bestCount };
}

