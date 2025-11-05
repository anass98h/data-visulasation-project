"use client";

import type { Snapshot, Team, PlayerPos } from "@/types/clustering";
import { MAP_CONFIG, type MapKey } from "@/config/clustering.config";

type TickPlayer = {
  tick: number;
  x: number;
  y: number;
  side: Team; // "CT" | "T"
  team?: string;
  steamId?: string;
  name?: string;
  isAlive?: boolean;
};

type MatchData = {
  header?: { mapName?: string; tickRate?: number };
  ticks?: TickPlayer[];
  rounds?: Array<{
    roundNum: number;
    startTick: number;
    endTick: number;
    freezeTimeEndTick?: number;
    ctStartMoney?: number;
    tStartMoney?: number;
    ctEquipmentValue?: number;
    tEquipmentValue?: number;
  }>;
};

export interface ExtractOptions {
  timepoints: number[]; // seconds after freeze end
  desiredPlayers?: number; // default 5
  includeDead?: boolean; // default false
  searchWindowSeconds?: number; // default 1s
}

const DEFAULTS: Required<Omit<ExtractOptions, "timepoints">> = {
  desiredPlayers: 5,
  includeDead: false,
  searchWindowSeconds: 1,
};

function buildTickIndex(ticks: TickPlayer[] | undefined) {
  const index = new Map<number, TickPlayer[]>();
  if (!ticks) return index;
  for (const t of ticks) {
    if (!index.has(t.tick)) index.set(t.tick, []);
    index.get(t.tick)!.push(t);
  }
  return index;
}

function findNearestTick(available: Set<number>, target: number, maxDelta: number): number | null {
  if (available.has(target)) return target;
  for (let d = 1; d <= maxDelta; d++) {
    if (available.has(target + d)) return target + d;
    if (available.has(target - d)) return target - d;
  }
  return null;
}

function getPlayersAtTick(
  tickIndex: Map<number, TickPlayer[]>,
  tickNum: number,
  side: Team,
  includeDead: boolean
): PlayerPos[] {
  const list = tickIndex.get(tickNum) || [];
  return list
    .filter((p) => p.side === side && (includeDead || p.isAlive))
    .map((p) => ({ x: p.x, y: p.y, steamId: p.steamId, name: p.name }));
}

function centroid(players: PlayerPos[]): { x: number; y: number } {
  if (players.length === 0) return { x: 0, y: 0 };
  const sx = players.reduce((s, p) => s + p.x, 0);
  const sy = players.reduce((s, p) => s + p.y, 0);
  return { x: sx / players.length, y: sy / players.length };
}

function orderByAngle(players: PlayerPos[]): PlayerPos[] {
  if (players.length === 0) return players;
  const c = centroid(players);
  return [...players].sort((a, b) => {
    const aa = Math.atan2(a.y - c.y, a.x - c.x);
    const ab = Math.atan2(b.y - c.y, b.x - c.x);
    return aa - ab;
  });
}

function padToDesired(players: PlayerPos[], desired: number): PlayerPos[] {
  if (players.length >= desired) return players.slice(0, desired);
  const c = centroid(players);
  const padded: PlayerPos[] = [...players];
  while (padded.length < desired) padded.push({ x: c.x, y: c.y });
  return padded;
}

export function extractSnapshots(
  match: MatchData | null | undefined,
  options: ExtractOptions
): Snapshot[] {
  if (!match?.rounds?.length || !match?.header?.tickRate) return [];
  const { timepoints } = options;
  const desiredPlayers = options.desiredPlayers ?? DEFAULTS.desiredPlayers;
  const includeDead = options.includeDead ?? DEFAULTS.includeDead;
  const searchWindowSeconds = options.searchWindowSeconds ?? DEFAULTS.searchWindowSeconds;

  const tickRate = match.header.tickRate || 64;
  const tickIndex = buildTickIndex(match.ticks);
  const availableTicks = new Set<number>(tickIndex.keys());
  const mapName = (match.header.mapName || "de_ancient") as MapKey;

  const results: Snapshot[] = [];

  for (const r of match.rounds) {
    const roundStart = r.startTick;
    const roundEnd = r.endTick;
    const freezeEnd = (r.freezeTimeEndTick ?? r.startTick) || r.startTick;

    for (const tp of timepoints) {
      // compute target tick, clamp to round bounds
      const rawTarget = freezeEnd + Math.round(tp * tickRate);
      const target = Math.max(roundStart, Math.min(roundEnd, rawTarget));
      const maxDelta = Math.max(1, Math.round(searchWindowSeconds * tickRate));
      const nearest = findNearestTick(availableTicks, target, maxDelta);
      if (nearest == null) continue; // no data around this timepoint

      (['CT', 'T'] as Team[]).forEach((side) => {
        const players = getPlayersAtTick(tickIndex, nearest, side, includeDead);
        if (!players.length) return;
        const ordered = orderByAngle(players);
        const fixed = padToDesired(ordered, desiredPlayers);

        results.push({
          roundNum: r.roundNum,
          team: side,
          timepoint: tp,
          players: fixed,
          economy: {
            ctStart: Number(r.ctStartMoney ?? 0),
            tStart: Number(r.tStartMoney ?? 0),
            ctEquip: Number(r.ctEquipmentValue ?? 0),
            tEquip: Number(r.tEquipmentValue ?? 0),
          },
          mapName,
        });
      });
    }
  }

  return results;
}

