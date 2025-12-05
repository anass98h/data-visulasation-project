/**
 * Multi-Match Player Performance Statistics
 *
 * Centralized helper functions for calculating player performance metrics
 * across multiple CS2 matches.
 */

import {
  resolvePlayers,
  buildRoundTickRanges,
  aggregateKillsPerPlayer,
} from "./playerPerformance";

// ============================================================================
// Type Definitions
// ============================================================================

export type KillEvent = {
  round: number;
  matchId: number;
  matchName: string;
  kills: number;
};

export type PlayerStats = {
  id: string;
  name: string;
  team: string;
  steamId?: string;
  matches: KillEvent[];
  totalMatches: number;
  totalRounds: number;
  matchNames: Record<number, string>; // Map matchId to match name
};

export type PlayerAggregatedStats = {
  akm: string; // Average Kills per Match (formatted)
  kpr: string; // Kills Per Round (formatted)
  kprText: string; // KPR in "X in 20 rounds" format
  stdDev: number; // Standard Deviation
  rangeLower: number; // Lower bound of usual range
  rangeUpper: number; // Upper bound of usual range
  consistencyLabel: "Stable" | "Medium" | "Swingy";
  consistencyColor: string; // Tailwind color class
  matchKillsArray: number[]; // Kills per match array
  totalKills: number; // Total kills across all matches
};

// ============================================================================
// Core Statistical Functions
// ============================================================================

/**
 * Calculate total kills from kill events
 */
export function calculateTotalKills(matches: KillEvent[]): number {
  return matches.reduce((total, event) => total + event.kills, 0);
}

/**
 * Calculate Average Kills per Match (AKM)
 * Formula: Total Kills / Number of Matches
 */
export function calculateAKM(totalKills: number, matchCount: number): number {
  if (matchCount === 0) return 0;
  return totalKills / matchCount;
}

/**
 * Calculate Kills Per Round (KPR)
 * Formula: Total Kills / Total Rounds
 */
export function calculateKPR(totalKills: number, totalRounds: number): number {
  if (totalRounds === 0) return 0;
  return totalKills / totalRounds;
}

/**
 * Calculate Standard Deviation of kills per match
 * Formula: sqrt(Σ(x - mean)² / n)
 */
export function calculateStdDev(killsPerMatch: number[], akm: number): number {
  if (killsPerMatch.length === 0) return 0;

  const squareDiffs = killsPerMatch.map((value) => Math.pow(value - akm, 2));
  const avgSquareDiff =
    squareDiffs.reduce((a, b) => a + b, 0) / killsPerMatch.length;

  return Math.sqrt(avgSquareDiff);
}

// ============================================================================
// Derived Metrics
// ============================================================================

/**
 * Calculate usual kill range (Mean ± Standard Deviation)
 * Returns lower and upper bounds
 */
export function calculateUsualRange(
  akm: number,
  stdDev: number
): { lower: number; upper: number } {
  return {
    lower: Math.max(0, Math.round(akm - stdDev)),
    upper: Math.round(akm + stdDev),
  };
}

/**
 * Calculate consistency category based on Coefficient of Variation
 * Formula: CV = StdDev / Mean
 *
 * Categories:
 * - Stable: CV < 0.20
 * - Medium: 0.20 <= CV <= 0.35
 * - Swingy: CV > 0.35
 */
export function calculateConsistency(
  stdDev: number,
  akm: number
): {
  label: "Stable" | "Medium" | "Swingy";
  color: string;
  cv: number;
} {
  const cv = stdDev / (akm || 1); // Avoid divide by zero

  let label: "Stable" | "Medium" | "Swingy" = "Stable";
  let color = "text-green-400";

  if (cv > 0.2 && cv <= 0.35) {
    label = "Medium";
    color = "text-yellow-400";
  } else if (cv > 0.35) {
    label = "Swingy";
    color = "text-red-400";
  }

  return { label, color, cv };
}

// ============================================================================
// Aggregation Functions
// ============================================================================

/**
 * Group kills by match and return kills per match
 * Returns a record: { matchId: totalKillsInMatch }
 */
export function groupKillsByMatch(
  matches: KillEvent[],
  totalMatches: number
): Record<number, number> {
  const killsPerMatch: Record<number, number> = {};

  // Initialize with zeros
  for (let i = 1; i <= totalMatches; i++) {
    killsPerMatch[i] = 0;
  }

  // Aggregate kills
  matches.forEach((event) => {
    killsPerMatch[event.matchId] += event.kills;
  });

  return killsPerMatch;
}

/**
 * Aggregate all statistics for a single player
 * This is the main function that combines all metrics
 */
export function aggregatePlayerStats(
  player: PlayerStats
): PlayerAggregatedStats {
  // 1. Calculate total kills
  const totalKills = calculateTotalKills(player.matches);

  // 2. Group kills by match
  const killsPerMatchRecord = groupKillsByMatch(
    player.matches,
    player.totalMatches
  );
  const matchKillsArray = Object.values(killsPerMatchRecord);

  // 3. Calculate AKM
  const akm = calculateAKM(totalKills, player.totalMatches);

  // 4. Calculate KPR
  const kpr = calculateKPR(totalKills, player.totalRounds);

  // 5. Calculate Standard Deviation
  const stdDev = calculateStdDev(matchKillsArray, akm);

  // 6. Calculate Usual Range
  const { lower: rangeLower, upper: rangeUpper } = calculateUsualRange(
    akm,
    stdDev
  );

  // 7. Calculate Consistency
  const { label: consistencyLabel, color: consistencyColor } =
    calculateConsistency(stdDev, akm);

  // 8. Format KPR text (e.g., "~15 in 20")
  const kprText = `~${Math.round(kpr * 20)} in 20`;

  return {
    akm: akm.toFixed(1),
    kpr: kpr.toFixed(2),
    kprText,
    stdDev,
    rangeLower,
    rangeUpper,
    consistencyLabel,
    consistencyColor,
    matchKillsArray,
    totalKills,
  };
}

// ============================================================================
// Data Transformation
// ============================================================================

/**
 * Transform raw demo data into PlayerStats format
 * This function processes multiple matches and aggregates player performance
 *
 * @param matchDataList - Array of demo data objects
 * @param selectedDemoIds - Array of selected demo IDs (for reference)
 * @returns Array of PlayerStats objects
 */
export function transformDemoDataToPlayerStats(
  matchDataList: any[],
  selectedDemoIds: string[]
): PlayerStats[] {
  const playerMap = new Map<string, PlayerStats>();

  matchDataList.forEach((demoData, matchIndex) => {
    const matchId = matchIndex + 1;

    // Get match name from demo data or use demo ID
    const matchName = demoData.metadata?.mapName ||
                      demoData.mapName ||
                      selectedDemoIds[matchIndex] ||
                      `Match ${matchId}`;

    // Resolve players using existing helper
    const players = resolvePlayers(demoData);
    const { rounds, kills } = demoData;

    if (!rounds || !kills) {
      console.warn(`Missing rounds or kills data for match ${matchId}`);
      return;
    }

    // Build round tick ranges
    const roundTickRanges = buildRoundTickRanges(rounds);

    // Aggregate kills per player per round
    const playerKills = aggregateKillsPerPlayer(kills, roundTickRanges, players);

    // Process each player
    players.forEach((player: any) => {
      // Use name as primary key since steamId might not be consistent
      const key = player.name;

      // Initialize player if not exists
      if (!playerMap.has(key)) {
        playerMap.set(key, {
          id: key,
          name: player.name,
          team: player.team,
          steamId: player.steamId,
          matches: [],
          totalMatches: 0,
          totalRounds: 0,
          matchNames: {},
        });
      }

      const playerStats = playerMap.get(key)!;

      // Store match name for this matchId
      playerStats.matchNames[matchId] = matchName;

      // Add kill events for this match
      Object.keys(roundTickRanges).forEach((roundKey) => {
        const roundNum = parseInt(roundKey.replace("r", ""));
        const kills = playerKills[player.name]?.[roundKey]?.kills || 0;

        // Add all rounds (including 0 kills) to track match participation
        playerStats.matches.push({
          round: roundNum,
          matchId,
          matchName,
          kills,
        });
      });
    });
  });

  // After processing all matches, calculate totals
  playerMap.forEach((playerStats) => {
    // Count unique match IDs
    const uniqueMatches = new Set(playerStats.matches.map((m) => m.matchId));
    playerStats.totalMatches = uniqueMatches.size;

    // Calculate total rounds from the match data
    playerStats.totalRounds = matchDataList.reduce(
      (total, demo) => total + (demo.rounds?.length || 0),
      0
    );
  });

  return Array.from(playerMap.values());
}

/**
 * Get team color based on team name
 * Maps team names to color schemes
 */
export function getTeamColor(team: string): string {
  // You can customize this based on your team naming convention
  // For now, we'll use a simple approach based on team index
  const teamLower = team.toLowerCase();

  // Check for common team identifiers
  if (
    teamLower.includes("team1") ||
    teamLower.includes("teama") ||
    teamLower.includes("ct")
  ) {
    return "#3b82f6"; // Blue
  }

  if (
    teamLower.includes("team2") ||
    teamLower.includes("teamb") ||
    teamLower.includes("t")
  ) {
    return "#fb923c"; // Orange
  }

  // Default fallback: use first team as blue, others as orange
  return "#3b82f6";
}

/**
 * Find the team that appears most frequently across all matches
 * This helps identify which team we're analyzing when looking at multiple matches
 */
export function findMostCommonTeam(playerData: PlayerStats[]): string {
  if (playerData.length === 0) return "";

  // Count total match appearances per team
  const teamMatchCounts = new Map<string, number>();

  playerData.forEach((player) => {
    const currentCount = teamMatchCounts.get(player.team) || 0;
    teamMatchCounts.set(player.team, currentCount + player.totalMatches);
  });

  // Find team with most match appearances
  let mostCommonTeam = "";
  let maxCount = 0;

  teamMatchCounts.forEach((count, team) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonTeam = team;
    }
  });

  return mostCommonTeam;
}

/**
 * Filter players to only include those from a specific team
 */
export function filterPlayersByTeam(
  playerData: PlayerStats[],
  teamName: string
): PlayerStats[] {
  return playerData.filter((p) => p.team === teamName);
}
