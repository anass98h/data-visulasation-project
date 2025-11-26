/**
 * Player Performance Transform Utilities
 *
 * Transform player performance data to chart-compatible formats
 */

export interface ChartSeries {
  x: number[];              // Round numbers
  y: number[];              // Kills per round
  label: string;            // Match name
  sides: ('CT' | 'T')[];    // Side per round
  matchId: string;          // Match identifier
  playerName: string;       // Player name
}

/**
 * Transform player performance data to LineChart-compatible format
 * @param performanceData - Player performance data (from calculatePlayerPerformance)
 * @param playerName - Name of player to transform
 * @returns Array of chart series (one per match)
 */
export function transformToChartSeries(
  performanceData: any,
  playerName: string
): ChartSeries[] {
  const matchIds = Object.keys(performanceData);

  return matchIds.map(matchId => {
    const match = performanceData[matchId];

    // Find player in teams
    let player = null;
    for (const team of match.teams) {
      player = team.players.find((p: any) => p.name === playerName);
      if (player) break;
    }

    if (!player) {
      console.warn(`Player ${playerName} not found in match ${matchId}`);
      return null;
    }

    // Extract rounds and kills
    const rounds = player.rounds;
    const x = rounds.map((_: any, idx: number) => idx + 1); // Round numbers (1, 2, 3, ...)
    const y = rounds.map((r: any) => {
      const roundKey = Object.keys(r)[0];
      return r[roundKey].kills;
    });

    // Get sides for each round
    const roundNums = Object.keys(player.sides)
      .map(n => parseInt(n))
      .sort((a, b) => a - b);
    const sides = roundNums.map(roundNum => player.sides[roundNum]);

    return {
      x,
      y,
      label: match.name || matchId,
      sides,
      matchId,
      playerName
    };
  }).filter(Boolean) as ChartSeries[];
}

/**
 * Separate players into two teams for grid layout
 * @param performanceData - Performance data for a match
 * @returns {teamA: {name, players}, teamB: {name, players}}
 */
export function getPlayersByTeam(performanceData: any) {
  const matchId = Object.keys(performanceData)[0];
  const match = performanceData[matchId];

  if (!match || !match.teams || match.teams.length < 2) {
    return {
      teamA: { name: 'Team A', players: [] },
      teamB: { name: 'Team B', players: [] }
    };
  }

  return {
    teamA: {
      name: match.teams[0].name,
      players: match.teams[0].players
    },
    teamB: {
      name: match.teams[1].name,
      players: match.teams[1].players
    }
  };
}

/**
 * Get team name for a player
 * @param performanceData - Performance data
 * @param playerName - Player name
 * @returns Team name or null
 */
export function getPlayerTeam(performanceData: any, playerName: string): string | null {
  const matchId = Object.keys(performanceData)[0];
  const match = performanceData[matchId];

  for (const team of match.teams) {
    const player = team.players.find((p: any) => p.name === playerName);
    if (player) {
      return team.name;
    }
  }

  return null;
}

/**
 * Calculate aggregate statistics for a player
 * @param chartSeries - Chart series for a player
 * @returns Statistics object
 */
export function calculatePlayerStats(chartSeries: ChartSeries[]) {
  if (chartSeries.length === 0) {
    return {
      totalKills: 0,
      avgKillsPerRound: 0,
      maxKills: 0,
      minKills: 0
    };
  }

  const allKills = chartSeries.flatMap(series => series.y);
  const totalKills = allKills.reduce((sum, kills) => sum + kills, 0);
  const avgKillsPerRound = totalKills / allKills.length;
  const maxKills = Math.max(...allKills);
  const minKills = Math.min(...allKills);

  return {
    totalKills,
    avgKillsPerRound: Math.round(avgKillsPerRound * 100) / 100,
    maxKills,
    minKills
  };
}

/**
 * Split chart data by halftime for rendering
 * @param series - Chart series
 * @returns {firstHalf, secondHalf} data segments
 */
export function splitByHalftime(series: ChartSeries) {
  const halftimeIndex = series.x.findIndex(round => round > 12);

  if (halftimeIndex === -1) {
    // No second half data
    return {
      firstHalf: series,
      secondHalf: null
    };
  }

  return {
    firstHalf: {
      ...series,
      x: series.x.slice(0, halftimeIndex),
      y: series.y.slice(0, halftimeIndex),
      sides: series.sides.slice(0, halftimeIndex)
    },
    secondHalf: {
      ...series,
      x: series.x.slice(halftimeIndex),
      y: series.y.slice(halftimeIndex),
      sides: series.sides.slice(halftimeIndex)
    }
  };
}
