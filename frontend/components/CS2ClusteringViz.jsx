"use client";
import React, { useState, useEffect, useMemo } from "react";
import { TrendingUp, Target, Clock, Upload, DollarSign } from "lucide-react";
import CS2MapRenderer from "./CS2MapRenderer";
import { TeamSwitch } from "@/components/distribution/teamSwitch";
import { MatchDropdown } from "@/components/distribution/matchDropdown";
import LineChart from "@/components/distribution/lineChart";
import Economy from "@/components/distribution/economy";
import * as distributionHelpers from "@/lib/distribution";

const CS2Dashboard = () => {
  const [matchData, setMatchData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [teamSelection, setTeamSelection] = useState(0); // Default set to 0 (both teams)
  const [matchSelection, setMatchSelection] = useState("match1");
  const [economyData, setEconomyData] = useState({});
  const [lineChartData, setLineChartData] = useState([]);

  // State to track the currently selected round for map and context rendering
  const [currentRoundContext, setCurrentRoundContext] = useState(1);

  // 1. Memo to derive STATIC initial CT/T Team Names (moved up before useEffects that use it)
  const initialTeamMapping = useMemo(() => {
    const teams = { CT: null, T: null };
    if (!matchData?.ticks) return teams;

    for (const tick of matchData.ticks) {
      if (tick.side === "CT" && !teams.CT) {
        teams.CT = tick.team;
      }
      if (tick.side === "T" && !teams.T) {
        teams.T = tick.team;
      }
      if (teams.CT && teams.T) break;
    }

    return teams;
  }, [matchData]);

  // Load match data and heatmap from public folder
  useEffect(() => {
    const loadMatchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/match_data.json");
        if (!response.ok) {
          console.log("No match_data.json found - user can upload their own");
          setIsLoading(false);
          setMatchData(null);
          return;
        }
        const data = await response.json();
        setMatchData(data);
        // Set initial context to Round 1
        setCurrentRoundContext(data.rounds?.[0]?.roundNum || 1);
        setIsLoading(false);
      } catch (error) {
        console.log("Error loading match data - user can upload their own");
        setIsLoading(false);
        setMatchData(null);
      }
    };

    const loadHeatmapData = async () => {
      try {
        const response = await fetch("/heatmap_data.json");
        if (!response.ok) {
          console.log(
            "No heatmap_data.json found - heatmap won't be available"
          );
          return;
        }
        const data = await response.json();
        setHeatmapData(data);
        console.log("Heatmap data loaded successfully");
      } catch (error) {
        console.log("Error loading heatmap data - continuing without heatmap");
      }
    };

    loadMatchData();
    loadHeatmapData();
  }, []);

  // Calculate economy data when match data changes
  useEffect(() => {
    if (matchData && initialTeamMapping.CT && initialTeamMapping.T) {
      try {
        // Convert initialTeamMapping format to the format expected by calculateEconomy
        const teamNamesForCalc = {
          1: initialTeamMapping.CT, // Team 1 started as CT
          2: initialTeamMapping.T    // Team 2 started as T
        };
        const calculatedEconomy = distributionHelpers.calculateEconomy([
          matchData,
        ], teamNamesForCalc);
        console.log("Calculated economy:", calculatedEconomy);
        setEconomyData(calculatedEconomy);
      } catch (error) {
        console.error("Error calculating economy:", error);
      }
    }
  }, [matchData, initialTeamMapping]);

  // Corrected data extraction to handle object-based rounds with new structure
  useEffect(() => {
    if (!economyData.teams || !economyData.teams[1] || !economyData.teams[2]) {
      setLineChartData([]);
      return;
    }

    const newSeriesData = [];

    // Helper function to extract and format data for a team
    const extractTeamSeries = (teamId, label, color) => {
      const teamEconomyData = economyData.teams[teamId];

      if (
        teamEconomyData?.rounds &&
        typeof teamEconomyData.rounds === "object" &&
        teamEconomyData.rounds !== null
      ) {
        const roundKeys = Object.keys(teamEconomyData.rounds).filter(
          (key) => !isNaN(Number(key))
        );

        roundKeys.sort((a, b) => Number(a) - Number(b));

        const roundNumbers = roundKeys.map(Number);

        const economySeries = roundKeys.map(
          (key) => teamEconomyData.rounds[key].economy
        );

        const winners = roundKeys.map(
          (key) => teamEconomyData.rounds[key].winner
        );

        if (economySeries.length > 0) {
          return {
            x: roundNumbers,
            y: economySeries,
            label: label,
            color: color,
            teamId: teamId,
            winners: winners,
          };
        }
      }
      return null;
    };

    if (teamSelection === 1) {
      const team1Series = extractTeamSeries(1, economyData.teams[1].name, "#2563eb");
      if (team1Series) newSeriesData.push(team1Series);
    } else if (teamSelection === 2) {
      const team2Series = extractTeamSeries(2, economyData.teams[2].name, "#dc2626");
      if (team2Series) newSeriesData.push(team2Series);
    } else if (teamSelection === 0) {
      const team1Series = extractTeamSeries(1, economyData.teams[1].name, "#3b82f6");
      const team2Series = extractTeamSeries(2, economyData.teams[2].name, "#ef4444");
      if (team1Series) newSeriesData.push(team1Series);
      if (team2Series) newSeriesData.push(team2Series);
    }

    setLineChartData(newSeriesData);
  }, [teamSelection, economyData]);

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsLoading(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        setMatchData(data);
        setCurrentRoundContext(data.rounds?.[0]?.roundNum || 1);
        setIsLoading(false);
      } catch (error) {
        console.error("Error parsing JSON file:", error);
        setIsLoading(false);
      }
    }
  };

  // 2. Dynamic function to determine current team assignments based on round number
  const getCurrentTeamsForRound = (roundNum) => {
    const initialMap = initialTeamMapping;

    // Check if the match is in the second half (Rounds 16+)
    const isSecondHalf = roundNum > 15;

    if (isSecondHalf) {
      // Swap sides: Initial CT is now T, Initial T is now CT
      return {
        CT: initialMap.T,
        T: initialMap.CT,
        isSwapped: true,
      };
    } else {
      // No swap: Retain initial sides
      return {
        CT: initialMap.CT,
        T: initialMap.T,
        isSwapped: false,
      };
    }
  };

  // Get the current team assignments for the currently viewed round on the map
  const dynamicTeamMapping = getCurrentTeamsForRound(currentRoundContext);

  // Calculate stats from real data
  const stats = matchData
    ? {
        totalRounds: matchData.rounds?.length || 0,
        mapName: matchData.header?.mapName || "Unknown",
        tickRate: matchData.header?.tickRate || 64,
        totalTicks: matchData.ticks?.length || 0,
        totalKills: matchData.kills?.length || 0,
        totalPlayers:
          new Set(matchData.ticks?.map((t) => t.steamId || t.name)).size || 0,
      }
    : null;

  // Calculate max round duration for proper progress bar scaling
  const maxRoundDuration = useMemo(() => {
    if (!matchData?.rounds || matchData.rounds.length === 0) return 1;
    return Math.max(...matchData.rounds.map((r) => r.endTick - r.startTick));
  }, [matchData]);

  // Create teamNames object for components
  const teamNames = useMemo(() => {
    if (!initialTeamMapping.CT || !initialTeamMapping.T) return {};
    return {
      1: initialTeamMapping.CT, // Team 1 started as CT
      2: initialTeamMapping.T    // Team 2 started as T
    };
  }, [initialTeamMapping]);

  // Determine final score and winner based on the last round
  const finalRound = matchData?.rounds?.[matchData.rounds.length - 1];
  const finalScoreCT = finalRound?.ctScore || 0;
  const finalScoreT = finalRound?.tScore || 0;

  // Determine the overall winning team name based on final score
  const overallWinnerName = useMemo(() => {
    if (!initialTeamMapping.CT || !initialTeamMapping.T) return "N/A";

    if (finalScoreCT > finalScoreT) {
      return initialTeamMapping.CT;
    } else if (finalScoreT > finalScoreCT) {
      return initialTeamMapping.T;
    }
    return "Draw";
  }, [finalScoreCT, finalScoreT, initialTeamMapping]);

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading match data...</p>
        </div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="w-full min-h-screen bg-gray-900 text-white p-4">
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <h1 className="text-3xl font-bold">CS2 Match Analysis</h1>
                <p className="text-gray-400">
                  Upload a match file to view analysis
                </p>
              </div>
              <label className="px-6 py-3 bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700 flex items-center gap-2">
                <Upload size={20} />
                Upload Match Data
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <CS2MapRenderer
            matchData={null}
            heatmapData={null}
            teamMapping={null}
            staticTeamMapping={null}
          />
        </div>
      </div>
    );
  }

  // Determine chart title based on selection
  let chartTitle = "Economy Over Rounds";
  let chartDescription = "Track economy performance across game rounds";

  if (teamSelection === 1) {
    chartTitle = `${teamNames[1] || 'Team 1'} Economy Over Rounds`;
    chartDescription = `Track ${teamNames[1] || 'Team 1'} economy performance across game rounds`;
  } else if (teamSelection === 2) {
    chartTitle = `${teamNames[2] || 'Team 2'} Economy Over Rounds`;
    chartDescription = `Track ${teamNames[2] || 'Team 2'} economy performance across game rounds`;
  } else if (teamSelection === 0) {
    chartTitle = `${teamNames[1] || 'Team 1'} vs ${teamNames[2] || 'Team 2'} Economy Over Rounds`;
    chartDescription = `Compare ${teamNames[1] || 'Team 1'} and ${teamNames[2] || 'Team 2'} economy performance across game rounds`;
  }

  // Display string for the teams uses the INITIAL static map for context
  const teamDisplay =
    initialTeamMapping.CT && initialTeamMapping.T
      ? `${initialTeamMapping.CT} (Start CT) vs ${initialTeamMapping.T} (Start T)`
      : `${stats.mapName} Match`;

  // Determine which team name corresponds to the CT score and T score for Round Summary display
  const teamA_Name = initialTeamMapping.CT || "CT Team";
  const teamB_Name = initialTeamMapping.T || "T Team";

  // Find the total rounds played (used for score progression calculation)
  const totalRoundsPlayed = matchData.rounds?.length || 0;

  return (
    <div className="w-full min-h-screen bg-gray-900 text-white p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold">CS2 Match Analysis</h1>

              <p className="text-gray-400 mt-1">
                {stats.totalRounds} rounds on {teamDisplay}
              </p>
              {heatmapData && (
                <p className="text-xs text-green-400 mt-1">
                  ✓ Heatmap loaded: CT ({heatmapData.heatmapData?.ct?.samples})
                  | T ({heatmapData.heatmapData?.t?.samples}) samples
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Tick Rate</div>
                <div className="text-2xl font-bold">{stats.tickRate}</div>
              </div>
              <label className="px-4 py-2 bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700 flex items-center gap-2">
                <Upload size={16} />
                Upload New
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
              <div className="text-sm text-gray-400 mb-1">Total Rounds</div>
              <div className="text-2xl font-bold">{stats.totalRounds}</div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
              <div className="text-sm text-gray-400 mb-1">Total Kills</div>
              <div className="text-2xl font-bold">{stats.totalKills}</div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
              <div className="text-sm text-gray-400 mb-1">Players</div>
              <div className="text-2xl font-bold">{stats.totalPlayers}</div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
              <div className="text-sm text-gray-400 mb-1">Total Ticks</div>
              <div className="text-2xl font-bold">
                {stats.totalTicks.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Map Renderer with Heatmap */}
        <CS2MapRenderer
          matchData={matchData}
          heatmapData={heatmapData}
          teamMapping={dynamicTeamMapping}
          staticTeamMapping={initialTeamMapping} // PASS STATIC MAP
          setCurrentRoundContext={setCurrentRoundContext}
        />

        {/* Economy Distribution Section */}
        {economyData.teams && (
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <DollarSign className="w-6 h-6" />
                  Economy Distribution
                </h3>
                <p className="text-gray-400 mt-1">
                  Analyze team economy performance across game rounds
                </p>
              </div>
              {/* Match selection dropdown */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-400">
                  Match:
                </span>
                <MatchDropdown
                  value={matchSelection}
                  onValueChange={setMatchSelection}
                />
                {/* Team Side Legend (USES DYNAMIC MAPPING) */}
                <div className="flex items-center gap-4 ml-4 text-sm font-medium">
                  <span className="flex items-center gap-1 text-blue-400">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    {dynamicTeamMapping.CT || "CT"}
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    {dynamicTeamMapping.T || "T"}
                  </span>
                </div>
              </div>
            </div>

            {/* Economy Cards */}
            <div className="mb-6">
              <Economy economyData={economyData} teamNames={teamNames} />
            </div>

            {/* Line Chart: Passed seriesData instead of data */}
            <LineChart
              seriesData={lineChartData}
              title={chartTitle}
              description={chartDescription}
            />

            {/* Team Selection Switch (below chart) */}
            <div className="mt-6">
              <TeamSwitch
                value={teamSelection}
                onValueChange={setTeamSelection}
                teamNames={teamNames}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 flex flex-col h-full">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Round Timeline & Score Progress
            </h3>

            <div className="flex-1 overflow-x-auto overflow-y-hidden h-[400px] border border-gray-700 p-2 rounded-lg">
              <div className="flex space-x-2 h-full">
                {matchData.rounds?.map((round, idx) => {
                  // Determine winner
                  const isCTWin = round.winnerSide === "CT";
                  const colorClass = isCTWin
                    ? "bg-blue-800 hover:bg-blue-900"
                    : "bg-red-800 hover:bg-red-900";
                  const sideText = isCTWin ? "CT" : "T";
                  const winnerName =
                    getCurrentTeamsForRound(round.roundNum)[round.winnerSide] ||
                    sideText;

                  // Using a fixed height for visual consistency here
                  const heightStyle = { height: "100%", minWidth: "80px" };

                  return (
                    <div
                      key={idx}
                      style={heightStyle}
                      className={`flex-shrink-0 flex flex-col justify-between items-center p-2 rounded-md transition-colors shadow-md cursor-pointer ${colorClass}`}
                      onClick={() => setCurrentRoundContext(round.roundNum)}
                    >
                      <span className="text-xs font-semibold **text-white**">
                        R {round.roundNum}
                      </span>

                      <div className="text-center">
                        <div className="text-xl font-bold **text-white**">
                          {round.ctScore} - {round.tScore}
                        </div>

                        <span className="text-xs **text-white**">
                          {winnerName} Win ({sideText})
                        </span>
                      </div>

                      <span className="text-xs **text-white** opacity-90">
                        {round.reason || "Killed"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Additional Info (Column 2: Two Stacked Cards) */}
          <div className="space-y-4 h-full">
            {" "}
            {/* Match Info */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <Target className="w-6 h-6" />
                Match Information
              </h3>
              <div className="space-y-3">
                {/* FINAL SCORE (Static) */}
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Final Score</span>
                  <span className="font-semibold text-lg">
                    {finalScoreCT} - {finalScoreT}
                  </span>
                </div>

                {/* MATCH WINNER (Static) */}
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Match Winner</span>
                  <span
                    className={`font-bold text-lg ${
                      finalScoreCT > finalScoreT
                        ? "text-blue-400"
                        : finalScoreT > finalScoreCT
                        ? "text-red-400"
                        : "text-gray-400"
                    }`}
                  >
                    {overallWinnerName}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Map</span>
                  <span className="font-semibold">{stats.mapName}</span>
                </div>

                {/* 💥 FIX: Removed round-specific dynamic values. Now showing STATIC team names */}
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Start CT Team</span>
                  <span className="font-semibold text-blue-400">
                    {initialTeamMapping.CT || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Start T Team</span>
                  <span className="font-semibold text-red-400">
                    {initialTeamMapping.T || "N/A"}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Server Name</span>
                  <span className="font-semibold">
                    {matchData.header?.serverName || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Network Protocol</span>
                  <span className="font-semibold">
                    {matchData.header?.networkProtocol || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Client Name</span>
                  <span className="font-semibold">
                    {matchData.header?.clientName || "N/A"}
                  </span>
                </div>
              </div>
            </div>
            {/* Statistics */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Match Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Total Damage Events</span>
                  <span className="font-semibold">
                    {matchData.damages?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Weapon Fires</span>
                  <span className="font-semibold">
                    {matchData.weaponFires?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Flash Events</span>
                  <span className="font-semibold">
                    {matchData.flashes?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Grenade Throws</span>
                  <span className="font-semibold">
                    {matchData.grenades?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CS2Dashboard;
