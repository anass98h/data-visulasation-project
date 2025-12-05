"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import * as d3 from "d3";
import {
  User,
  TrendingUp,
  Activity,
  Info,
  HelpCircle,
} from "lucide-react";
import {
  transformDemoDataToPlayerStats,
  aggregatePlayerStats,
  findMostCommonTeam,
  filterPlayersByTeam,
  getTeamColor,
  type PlayerStats,
  type PlayerAggregatedStats,
} from "@/lib/multiMatchStats";

interface MultiMatchPlayerPerformanceProps {
  selectedDemoIds: string[];
  matchDataList: any[];
  isLoading: boolean;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Tooltip component with help icon and hover explanation
 */
const StatTooltip = ({ content }: { content: string }) => (
  <div className="group relative inline-flex items-center ml-1.5 align-middle">
    <HelpCircle className="w-3 h-3 text-slate-600 hover:text-blue-400 transition-colors cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-slate-950 border border-slate-700 rounded shadow-xl text-[10px] text-slate-300 leading-relaxed z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-normal text-center">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950"></div>
    </div>
  </div>
);

/**
 * Kill Grid Visualization Component
 * Shows a matrix of matches (rows) vs rounds (columns) with colored dots
 */
const KillGrid = ({
  player,
  matchCount,
}: {
  player: PlayerStats;
  matchCount: number;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellWidth, setCellWidth] = useState(20);

  // Calculate the actual maximum rounds across all matches for responsiveness
  const maxRounds = useMemo(() => {
    const roundsPerMatch = new Map<number, number>();
    player.matches.forEach((event) => {
      const currentMax = roundsPerMatch.get(event.matchId) || 0;
      roundsPerMatch.set(event.matchId, Math.max(currentMax, event.round));
    });
    return Math.max(...Array.from(roundsPerMatch.values()), 24);
  }, [player.matches]);

  // Calculate responsive cell width based on container
  useEffect(() => {
    const updateCellWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const labelWidth = 20; // Width for "M1", "M2" labels
        const padding = 16; // Total horizontal padding
        const availableWidth = containerWidth - labelWidth - padding;
        const calculatedWidth = Math.max(Math.floor(availableWidth / maxRounds), 16);
        setCellWidth(calculatedWidth);
      }
    };

    updateCellWidth();
    window.addEventListener('resize', updateCellWidth);
    return () => window.removeEventListener('resize', updateCellWidth);
  }, [maxRounds]);

  const getKills = (matchId: number, roundNum: number): number => {
    const event = player.matches.find(
      (e) => e.matchId === matchId && e.round === roundNum
    );
    return event ? event.kills : 0;
  };

  const getMatchName = (matchId: number): string => {
    return player.matchNames[matchId] || `Match ${matchId}`;
  };

  const getTeamMainColor = (team: string): string => {
    const color = getTeamColor(team);
    return color === "#3b82f6" ? "bg-blue-500" : "bg-orange-500";
  };

  // Calculate dot sizes based on cell width
  const dotSizes = {
    empty: Math.max(Math.floor(cellWidth * 0.35), 6),
    one: Math.max(Math.floor(cellWidth * 0.5), 10),
    two: Math.max(Math.floor(cellWidth * 0.6), 12),
    three: Math.max(Math.floor(cellWidth * 0.7), 14),
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-1 w-full bg-slate-800/50 px-2 py-2 rounded border border-slate-700">
      <div className="flex justify-between text-[10px] text-slate-400 mb-1 uppercase tracking-wider">
        <span>Matches (Y) vs Rounds (X)</span>
      </div>

      {/* Render each match as a row */}
      {Array.from({ length: matchCount }).map((_, mIdx) => {
        const displayMatchId = mIdx + 1;
        const matchName = getMatchName(displayMatchId);

        return (
          <div key={displayMatchId} className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 w-4 font-mono flex-shrink-0">
              M{displayMatchId}
            </span>
            <div className="flex items-center flex-1">
              {/* Render each round as a column with responsive width */}
              {Array.from({ length: maxRounds }).map((_, rIdx) => {
                const roundNum = rIdx + 1;
                const kills = getKills(displayMatchId, roundNum);

                // Visual logic for the dots - responsive sizing
                let bgClass = "bg-slate-700";
                let dotSize = dotSizes.empty;
                let opacity = "opacity-30";

                if (kills > 0) {
                  opacity = "opacity-100";
                  bgClass = `${getTeamMainColor(player.team)} shadow-[0_0_6px_rgba(59,130,246,0.6)]`;

                  if (kills === 1) dotSize = dotSizes.one;
                  if (kills === 2) dotSize = dotSizes.two;
                  if (kills >= 3) dotSize = dotSizes.three;
                }

                const isMultiKill = kills >= 3;

                return (
                  <div
                    key={roundNum}
                    className="flex items-center justify-center group cursor-pointer"
                    style={{
                      width: `${cellWidth}px`,
                      height: `${cellWidth}px`,
                      flex: '0 0 auto'
                    }}
                    title={`${matchName}\nRound ${roundNum}: ${kills} Kill${kills !== 1 ? 's' : ''}`}
                  >
                    <div
                      className={`${bgClass} ${opacity} transition-all group-hover:scale-125 group-hover:opacity-100 group-hover:shadow-[0_0_12px_rgba(59,130,246,1)]`}
                      style={{
                        width: `${dotSize}px`,
                        height: `${dotSize}px`,
                        borderRadius: isMultiKill ? '0' : '50%',
                        transform: isMultiKill ? 'rotate(45deg)' : 'none',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Round Axis Labels - Aligned with dots - All round numbers */}
      <div className="flex items-center gap-1 mt-1">
        <span className="w-4 flex-shrink-0"></span>
        <div className="flex items-center flex-1">
          {Array.from({ length: maxRounds }).map((_, idx) => {
            const roundNum = idx + 1;

            return (
              <div
                key={roundNum}
                className="flex items-end justify-center"
                style={{
                  width: `${cellWidth}px`,
                  flex: '0 0 auto'
                }}
              >
                <span className="text-[8px] text-slate-500 font-mono">{roundNum}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Player Card Component
 * Shows all stats for a single player
 */
const PlayerCard = ({
  player,
  stats,
}: {
  player: PlayerStats;
  stats: PlayerAggregatedStats;
}) => {
  const teamColorHex = getTeamColor(player.team);
  const teamColor =
    teamColorHex === "#3b82f6" ? "text-blue-400" : "text-orange-400";
  const barColor =
    teamColorHex === "#3b82f6" ? "bg-blue-500" : "bg-orange-500";

  // Calculate percentages for range visualization
  const maxScale = 40;
  const rangeLeftPct = (stats.rangeLower / maxScale) * 100;
  const rangeWidthPct =
    ((stats.rangeUpper - stats.rangeLower) / maxScale) * 100;
  const avgPct = (parseFloat(stats.akm) / maxScale) * 100;

  return (
    <div className="bg-slate-800 border-l-4 border-slate-700 hover:border-slate-500 transition-colors rounded-r-md p-3 mb-3 shadow-lg flex flex-col gap-3">
      {/* Header: Player Name + Stats */}
      <div className="flex justify-between items-center border-b border-slate-700 pb-2">
        <div className="flex items-center gap-2">
          <User className={`w-4 h-4 ${teamColor}`} />
          <span className="font-bold text-slate-100">{player.name}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {/* AKM */}
          <div className="flex flex-col items-end group">
            <div className="flex items-center">
              <span className="text-slate-400 uppercase text-[9px] cursor-help">
                Avg / Match
              </span>
              <StatTooltip content="The average number of enemies this player eliminates in a full game." />
            </div>
            <span className={`font-mono font-bold text-base ${teamColor}`}>
              {stats.akm}
            </span>
          </div>
          <div className="w-[1px] h-6 bg-slate-700"></div>
          {/* KPR */}
          <div className="flex flex-col items-end">
            <div className="flex items-center">
              <span className="text-slate-400 uppercase text-[9px] cursor-help">
                Kills / Rnd
              </span>
              <StatTooltip content="Average kills per round. Useful because some games are longer than others. 0.75+ is very good." />
            </div>
            <span className="font-mono text-slate-200">{stats.kpr}</span>
            <span className="text-[9px] text-slate-500">{stats.kprText}</span>
          </div>
        </div>
      </div>

      {/* The Grid Visualization */}
      <KillGrid player={player} matchCount={player.totalMatches} />

      {/* Footer Stats: Range & Consistency */}
      <div className="grid grid-cols-2 gap-4 items-end">
        {/* Usual Range Viz */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <span>Usual Range</span>
            <StatTooltip content="The typical score for this player. Most of their games will finish with a kill count inside this colored bar." />
            <span className="ml-auto">
              {stats.rangeLower} - {stats.rangeUpper} Kills
            </span>
          </div>
          <div className="relative h-3 bg-slate-900 rounded-full w-full overflow-hidden border border-slate-700">
            {/* The Usual Range Band */}
            <div
              className={`absolute h-full ${barColor} opacity-30`}
              style={{
                left: `${rangeLeftPct}%`,
                width: `${rangeWidthPct}%`,
              }}
            />
            {/* The Average Dot */}
            <div
              className={`absolute h-full w-1 ${barColor} top-0`}
              style={{ left: `${avgPct}%` }}
            />
          </div>
        </div>

        {/* Consistency */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-slate-400 uppercase">
              Consistency
            </span>
            <StatTooltip content="How predictable the player is. 'Stable' means consistent performance; 'Swingy' means they have great games and bad games." />
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className={`w-3 h-3 ${stats.consistencyColor}`} />
            <span className={`text-xs font-bold ${stats.consistencyColor}`}>
              {stats.consistencyLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Player List Component
 * Shows players from a single team in a vertical stack
 */
const PlayerList = ({
  team,
  teamName,
}: {
  team: PlayerStats[];
  teamName: string;
}) => {
  const teamColor = getTeamColor(teamName);
  const colorClass = teamColor === "#3b82f6" ? "text-blue-400" : "text-orange-400";

  return (
    <div className="space-y-4">
      {/* Team Header */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className="w-1 h-8 rounded-full"
            style={{ backgroundColor: teamColor }}
          />
          <h3 className={`text-xl font-bold ${colorClass}`}>
            {teamName}
          </h3>
        </div>
        <div className="text-sm text-slate-400">
          {team.length} Players
        </div>
      </div>

      {/* Player Cards - Stacked Vertically */}
      <div className="space-y-4">
        {team.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            stats={aggregatePlayerStats(player)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Comparison Chart Component
 * Horizontal bar chart ranking all players by AKM using D3.js
 */
const ComparisonChart = ({
  data,
}: {
  data: { name: string; akm: number; team: string }[];
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) {
      console.log("🔴 Chart render skipped:", {
        svgRef: !!svgRef.current,
        containerRef: !!containerRef.current,
        dataLength: data.length,
      });
      return;
    }

    console.log("🟢 Rendering chart with data:", data);

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Dimensions - dynamic height based on number of players
    const containerWidth = containerRef.current.clientWidth;
    console.log("📐 Container width:", containerWidth);

    const margin = { top: 10, right: 60, bottom: 30, left: 100 };
    const width = Math.max(containerWidth - margin.left - margin.right, 250);
    const barHeight = 40;
    const height = data.length * barHeight;
    const svgHeight = height + margin.top + margin.bottom;

    console.log("📊 Chart dimensions:", { width, height, svgHeight });

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", svgHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const maxAkm = d3.max(data, (d) => d.akm) || 30;
    console.log("📈 Max AKM:", maxAkm);

    const xScale = d3
      .scaleLinear()
      .domain([0, Math.ceil(maxAkm * 1.15)])
      .range([0, width]);

    const yScale = d3
      .scaleBand()
      .domain(data.map((d) => d.name))
      .range([0, height])
      .padding(0.3);

    // Background rectangle for debugging
    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none")
      .attr("stroke", "#475569")
      .attr("stroke-width", 1)
      .attr("opacity", 0.3);

    // Grid lines (vertical)
    svg
      .append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(xScale.ticks(5))
      .join("line")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#334155")
      .attr("stroke-dasharray", "3,3")
      .attr("stroke-width", 1)
      .attr("opacity", 0.5);

    // Create bars group
    const barsGroup = svg.append("g").attr("class", "bars");

    // Bars with explicit stroke for visibility
    const bars = barsGroup
      .selectAll(".bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", (d) => yScale(d.name) || 0)
      .attr("width", (d) => {
        const w = xScale(d.akm);
        console.log(`Bar for ${d.name}: width=${w}, akm=${d.akm}`);
        return w;
      })
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => getTeamColor(d.team))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .attr("rx", 4)
      .attr("opacity", 0.9)
      .on("mouseover", function () {
        d3.select(this).attr("opacity", 1).attr("stroke-width", 2);
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 0.9).attr("stroke-width", 1);
      });

    // X Axis
    const xAxis = svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(5));

    xAxis.selectAll("line").attr("stroke", "#94a3b8");
    xAxis.selectAll("path").attr("stroke", "#94a3b8");
    xAxis.selectAll("text").attr("fill", "#94a3b8").attr("font-size", "12px");

    // Y Axis
    const yAxis = svg.append("g").call(d3.axisLeft(yScale));

    yAxis.selectAll("line").attr("stroke", "#475569");
    yAxis.selectAll("path").attr("stroke", "#475569");
    yAxis.selectAll("text").attr("fill", "#e2e8f0").attr("font-size", "12px");

    // Add value labels on bars
    svg
      .append("g")
      .attr("class", "labels")
      .selectAll(".bar-label")
      .data(data)
      .join("text")
      .attr("class", "bar-label")
      .attr("x", (d) => xScale(d.akm) + 8)
      .attr("y", (d) => (yScale(d.name) || 0) + yScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("fill", "#f1f5f9")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text((d) => d.akm.toFixed(1));

    console.log("✅ Chart rendered successfully");
  }, [data]);

  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-800 p-6 h-full">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="text-emerald-400 w-5 h-5" />
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white">
            Average Kills Per Match (AKM) Ranking
          </h3>
          <StatTooltip content="Ranking players by their average kills per game. The top players contribute the most eliminations." />
        </div>
      </div>

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} className="w-full"></svg>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export default function MultiMatchPlayerPerformance({
  selectedDemoIds,
  matchDataList,
  isLoading,
}: MultiMatchPlayerPerformanceProps) {
  const [playerData, setPlayerData] = useState<PlayerStats[]>([]);
  const [processing, setProcessing] = useState(false);

  // Process data when matchDataList changes
  useEffect(() => {
    console.log("🔵 Player Performance - useEffect triggered");
    console.log("📊 selectedDemoIds:", selectedDemoIds);
    console.log("📦 matchDataList:", matchDataList);
    console.log("📏 matchDataList.length:", matchDataList.length);

    if (matchDataList.length > 0) {
      console.log("✅ Processing data...");
      setProcessing(true);

      try {
        const stats = transformDemoDataToPlayerStats(
          matchDataList,
          selectedDemoIds
        );
        console.log("✨ Transformed Player Stats:", stats);
        setPlayerData(stats);
      } catch (error) {
        console.error("❌ Error processing player data:", error);
      } finally {
        setProcessing(false);
      }
    } else {
      console.log("⚠️ No match data available");
      setPlayerData([]);
    }
  }, [matchDataList, selectedDemoIds]);

  // Find the most common team and filter players
  const { targetTeamName, teamPlayers } = useMemo(() => {
    if (playerData.length === 0) {
      return { targetTeamName: "", teamPlayers: [] };
    }

    const mostCommonTeam = findMostCommonTeam(playerData);
    console.log("🎯 Most common team:", mostCommonTeam);

    const filteredPlayers = filterPlayersByTeam(playerData, mostCommonTeam);
    console.log("👥 Filtered players:", filteredPlayers);

    return {
      targetTeamName: mostCommonTeam,
      teamPlayers: filteredPlayers,
    };
  }, [playerData]);

  // Comparison chart data (only for the target team)
  const comparisonData = useMemo(() => {
    return teamPlayers
      .map((p) => {
        const stats = aggregatePlayerStats(p);
        return { name: p.name, akm: parseFloat(stats.akm), team: p.team };
      })
      .sort((a, b) => b.akm - a.akm);
  }, [teamPlayers]);

  // ============================================================================
  // Loading State
  // ============================================================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading match data...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Processing State
  // ============================================================================
  if (processing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">
            Processing player performance data...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Empty State
  // ============================================================================
  if (!selectedDemoIds.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-400 text-lg">
          Select matches to view player performance
        </p>
      </div>
    );
  }

  // No player data after processing
  if (playerData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Info className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No player data available</p>
          <p className="text-gray-500 text-sm mt-2">
            The selected matches may not contain player performance data
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-blue-500/30 p-6">
      {/* Section Header */}
      <div className="flex justify-between items-end border-b border-slate-800 pb-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-white">
            PLAYER PERFORMANCE
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {targetTeamName && (
              <span className="font-semibold text-blue-400">
                {targetTeamName}
              </span>
            )}{" "}
            - Kill distribution analysis across {matchDataList.length} match
            {matchDataList.length !== 1 ? "es" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-900/50 px-3 py-1 rounded border border-slate-800">
          <Info className="w-3 h-3" />
          <span>Hover over grid dots for round details</span>
        </div>
      </div>

      {/* Two Column Layout: Players on left, Chart on right - Equal widths */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Player Cards */}
        {teamPlayers.length > 0 && (
          <PlayerList team={teamPlayers} teamName={targetTeamName} />
        )}

        {/* Right Column: AKM Ranking Chart */}
        {comparisonData.length > 0 && <ComparisonChart data={comparisonData} />}
      </div>
    </div>
  );
}
