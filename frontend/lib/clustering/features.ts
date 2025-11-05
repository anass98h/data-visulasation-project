"use client";

import type { Snapshot, Team, PlayerPos } from "@/types/clustering";
import { MAP_CONFIG } from "@/config/clustering.config";

export interface FeatureBuildOptions {
  desiredPlayers?: number; // default 5
  economyWeight?: number; // 0..1, default 0.5
}

const DEFAULTS: Required<FeatureBuildOptions> = {
  desiredPlayers: 5,
  economyWeight: 0.5,
};

function normalizePos(mapName: string, x: number, y: number): { nx: number; ny: number } {
  const cfg = MAP_CONFIG[(mapName as keyof typeof MAP_CONFIG) || "de_ancient"] || MAP_CONFIG.de_ancient;
  const nx = (x - cfg.minX) / (cfg.maxX - cfg.minX);
  const ny = (y - cfg.minY) / (cfg.maxY - cfg.minY);
  // clamp to [0,1] to be safe
  return { nx: Math.max(0, Math.min(1, nx)), ny: Math.max(0, Math.min(1, ny)) };
}

function pad(players: PlayerPos[], desired: number): PlayerPos[] {
  if (players.length >= desired) return players.slice(0, desired);
  const cx = players.reduce((s, p) => s + p.x, 0) / (players.length || 1);
  const cy = players.reduce((s, p) => s + p.y, 0) / (players.length || 1);
  const out = [...players];
  while (out.length < desired) out.push({ x: cx, y: cy });
  return out;
}

// Build a single vector for a (round, team) combining all selected timepoints
export function buildFeatureMatrix(
  snapshots: Snapshot[],
  selectedTimepoints: number[],
  opts?: FeatureBuildOptions,
  teamFilter?: Team | "both"
): { matrix: number[][]; rows: { roundNum: number; team: Team }[] } {
  const options = { ...DEFAULTS, ...(opts || {}) };
  const desired = options.desiredPlayers;
  const econWeight = options.economyWeight;

  // Group snapshots by round+team
  const groups = new Map<string, Snapshot[]>();
  for (const s of snapshots) {
    if (teamFilter && teamFilter !== "both" && s.team !== teamFilter) continue;
    const key = `${s.roundNum}|${s.team}`;
    const arr = groups.get(key) || [];
    arr.push(s);
    groups.set(key, arr);
  }

  const rowsMeta: { roundNum: number; team: Team }[] = [];
  const matrix: number[][] = [];

  const sortedTimepoints = [...selectedTimepoints].sort((a, b) => a - b);

  for (const [key, snaps] of groups.entries()) {
    // Organize by timepoint
    const byTP = new Map<number, Snapshot>();
    for (const s of snaps) byTP.set(s.timepoint, s);

    const [roundNumStr, teamStr] = key.split("|");
    const roundNum = Number(roundNumStr);
    const team = teamStr as Team;

    const vec: number[] = [];

    // positions
    for (const tp of sortedTimepoints) {
      const snap = byTP.get(tp);
      if (!snap) {
        // no snapshot for this time—pad with zeros
        for (let i = 0; i < desired; i++) vec.push(0, 0);
        continue;
      }
      const fixed = pad(snap.players, desired);
      for (const p of fixed) {
        const { nx, ny } = normalizePos(snap.mapName, p.x, p.y);
        vec.push(nx, ny);
      }
    }

    // economy: include both team economy and opponent economy
    const example = snaps[0];
    const ctEconomy = (example.economy.ctStart || 0) + (example.economy.ctEquip || 0);
    const tEconomy = (example.economy.tStart || 0) + (example.economy.tEquip || 0);
    // naive normalization to ~[0,1]
    const econNorm = (v: number) => Math.min(1, Math.max(0, v / 20000));
    const teamEconomy = team === "CT" ? econNorm(ctEconomy) : econNorm(tEconomy);
    const oppEconomy = team === "CT" ? econNorm(tEconomy) : econNorm(ctEconomy);
    vec.push(teamEconomy * econWeight, oppEconomy * econWeight);

    matrix.push(vec);
    rowsMeta.push({ roundNum, team });
  }

  return { matrix, rows: rowsMeta };
}

// Optional: standardize features across matrix
export function standardize(matrix: number[][]): { matrix: number[][]; means: number[]; stds: number[] } {
  if (matrix.length === 0) return { matrix, means: [], stds: [] };
  const cols = matrix[0].length;
  const means = new Array(cols).fill(0);
  const stds = new Array(cols).fill(0);

  // means
  for (let j = 0; j < cols; j++) {
    let s = 0;
    for (let i = 0; i < matrix.length; i++) s += matrix[i][j];
    means[j] = s / matrix.length;
  }
  // stds
  for (let j = 0; j < cols; j++) {
    let s = 0;
    for (let i = 0; i < matrix.length; i++) {
      const d = matrix[i][j] - means[j];
      s += d * d;
    }
    stds[j] = Math.sqrt(s / Math.max(1, matrix.length - 1)) || 1;
  }
  // apply
  const out = matrix.map((row) => row.map((v, j) => (v - means[j]) / stds[j]));
  return { matrix: out, means, stds };
}

