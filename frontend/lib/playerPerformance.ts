/**
 * Player Performance Calculation Library
 *
 * Calculates kills per player per round from demo data
 */

export interface RoundTickRange {
  startTick: number;
  endTick: number;
}

export interface PlayerKills {
  [roundKey: string]: {
    kills: number;
  };
}

export interface PlayerSides {
  [roundNum: number]: 'CT' | 'T';
}

export interface PlayerPerformance {
  name: string;
  team: string;
  rounds: Array<{ [roundKey: string]: { kills: number } }>;
  sides: PlayerSides;
}

export interface TeamPerformance {
  name: string;
  players: PlayerPerformance[];
}

export interface MatchPerformance {
  name: string;
  teams: TeamPerformance[];
}

/**
 * Build mapping of round numbers to tick ranges
 * @param rounds - Array of round objects from demo data
 * @returns Object mapping round keys (r1, r2, ...) to {startTick, endTick}
 */
export function buildRoundTickRanges(rounds: any[]): Record<string, RoundTickRange> {
  const ranges: Record<string, RoundTickRange> = {};

  rounds.forEach(round => {
    const roundKey = `r${round.roundNum}`;
    ranges[roundKey] = {
      startTick: round.startTick,
      endTick: round.endTick
    };
  });

  return ranges;
}

/**
 * Aggregate kills per player per round
 * @param kills - Array of kill events
 * @param roundTickRanges - Round tick mapping
 * @param players - Array of player objects
 * @returns Nested object: playerName -> roundKey -> { kills: number }
 */
export function aggregateKillsPerPlayer(
  kills: any[],
  roundTickRanges: Record<string, RoundTickRange>,
  players: any[]
): Record<string, PlayerKills> {
  // Initialize structure for all players
  const playerKills: Record<string, PlayerKills> = {};

  players.forEach(player => {
    playerKills[player.name] = {};
    Object.keys(roundTickRanges).forEach(roundKey => {
      playerKills[player.name][roundKey] = { kills: 0 };
    });
  });

  // Aggregate kills by matching tick to round
  kills.forEach(kill => {
    if (!kill.attackerName) return; // Skip if no attacker

    // Find which round this kill belongs to
    for (const [roundKey, range] of Object.entries(roundTickRanges)) {
      if (kill.tick >= range.startTick && kill.tick <= range.endTick) {
        // Increment kill count if this player exists
        if (playerKills[kill.attackerName]) {
          playerKills[kill.attackerName][roundKey].kills++;
        }
        break; // Found the round, stop searching
      }
    }
  });

  return playerKills;
}

/**
 * Calculate player sides for each round (accounting for halftime swap)
 * @param players - Array of player objects with initial side
 * @param totalRounds - Total number of rounds
 * @returns playerName -> roundNum -> side
 */
export function calculatePlayerSides(
  players: any[],
  totalRounds: number
): Record<string, PlayerSides> {
  const playerSides: Record<string, PlayerSides> = {};

  players.forEach(player => {
    playerSides[player.name] = {};
    const initialSide = player.side as 'CT' | 'T';

    for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
      if (roundNum <= 12) {
        // First half - original side
        playerSides[player.name][roundNum] = initialSide;
      } else {
        // Second half (and OT) - swapped side
        playerSides[player.name][roundNum] = initialSide === 'CT' ? 'T' : 'CT';
      }
    }
  });

  return playerSides;
}

/**
 * Main function to calculate player performance from demo data
 * @param demoData - Full demo data JSON
 * @param matchId - Match identifier (e.g., 'm1')
 * @param matchName - Optional human-readable match name
 * @returns Structured performance data
 */
export function calculatePlayerPerformance(
  demoData: any,
  matchId: string,
  matchName?: string
): Record<string, MatchPerformance> {
  const { rounds, kills, players } = demoData;

  if (!rounds || !kills || !players) {
    console.warn('Missing required data in demoData');
    return {
      [matchId]: {
        name: matchName || `Match ${matchId}`,
        teams: []
      }
    };
  }

  // 1. Build round tick ranges
  const roundTickRanges = buildRoundTickRanges(rounds);

  // 2. Aggregate kills per player per round
  const playerKills = aggregateKillsPerPlayer(kills, roundTickRanges, players);

  // 3. Calculate player sides
  const playerSides = calculatePlayerSides(players, rounds.length);

  // 4. Group players by team
  const teamMap: Record<string, any[]> = {};
  players.forEach((player: any) => {
    if (!teamMap[player.team]) {
      teamMap[player.team] = [];
    }
    teamMap[player.team].push(player);
  });

  // 5. Build final structure
  const teams: TeamPerformance[] = Object.keys(teamMap).map(teamName => ({
    name: teamName,
    players: teamMap[teamName].map(player => ({
      name: player.name,
      team: player.team,
      rounds: Object.keys(roundTickRanges)
        .sort((a, b) => {
          const numA = parseInt(a.replace('r', ''));
          const numB = parseInt(b.replace('r', ''));
          return numA - numB;
        })
        .map(roundKey => ({
          [roundKey]: playerKills[player.name][roundKey]
        })),
      sides: playerSides[player.name]
    }))
  }));

  return {
    [matchId]: {
      name: matchName || `Match ${matchId}`,
      teams
    }
  };
}

/**
 * Get kills for a specific player across all rounds
 * @param performanceData - Performance data structure
 * @param playerName - Name of the player
 * @returns Array of kill counts per round
 */
export function getPlayerKills(performanceData: any, playerName: string): number[] {
  const matchId = Object.keys(performanceData)[0];
  const match = performanceData[matchId];

  for (const team of match.teams) {
    const player = team.players.find((p: any) => p.name === playerName);
    if (player) {
      return player.rounds.map((r: any) => {
        const roundKey = Object.keys(r)[0];
        return r[roundKey].kills;
      });
    }
  }

  return [];
}

/**
 * Get player sides across all rounds
 * @param performanceData - Performance data structure
 * @param playerName - Name of the player
 * @returns Array of sides per round
 */
export function getPlayerSides(performanceData: any, playerName: string): ('CT' | 'T')[] {
  const matchId = Object.keys(performanceData)[0];
  const match = performanceData[matchId];

  for (const team of match.teams) {
    const player = team.players.find((p: any) => p.name === playerName);
    if (player) {
      const roundNums = Object.keys(player.sides)
        .map(n => parseInt(n))
        .sort((a, b) => a - b);
      return roundNums.map(roundNum => player.sides[roundNum]);
    }
  }

  return [];
}
