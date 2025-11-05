"use client";

import type { Snapshot, Team } from "@/types/clustering";
import { imputeMissingSnapshots } from "@/lib/clustering/impute";
import { buildFeatureMatrix } from "@/lib/clustering/features";
import { buildRegionFeaturesForGroup } from "@/lib/clustering/regions";

export interface BuildPlusOptions {
  desiredPlayers?: number;
  economyWeight?: number;
  impute?: boolean;
  imputeMaxDeltaSeconds?: number;
}

export function buildFeatureMatrixWithRegions(
  snapshots: Snapshot[],
  selectedTimepoints: number[],
  opts?: BuildPlusOptions,
  teamFilter?: Team | "both"
): { matrix: number[][]; rows: { roundNum: number; team: Team }[] } {
  const doImpute = opts?.impute !== false;
  const imputed = doImpute
    ? imputeMissingSnapshots(snapshots, selectedTimepoints, {
        maxDeltaSeconds: opts?.imputeMaxDeltaSeconds ?? 15,
      })
    : snapshots;

  // Base positional + economy features
  const { matrix: base, rows } = buildFeatureMatrix(imputed, selectedTimepoints, {
    desiredPlayers: opts?.desiredPlayers,
    economyWeight: opts?.economyWeight,
  }, teamFilter);

  // Build region features per (round, team)
  const byKey = new Map<string, Snapshot[]>();
  imputed.forEach((s) => {
    if (teamFilter && teamFilter !== "both" && s.team !== teamFilter) return;
    const key = `${s.roundNum}|${s.team}`;
    const arr = byKey.get(key) || [];
    arr.push(s);
    byKey.set(key, arr);
  });

  const out: number[][] = [];
  for (let i = 0; i < base.length; i++) {
    const key = `${rows[i].roundNum}|${rows[i].team}`;
    const group = byKey.get(key) || [];
    const regionFeats = buildRegionFeaturesForGroup(group, selectedTimepoints);
    out.push(base[i].concat(regionFeats));
  }

  return { matrix: out, rows };
}

