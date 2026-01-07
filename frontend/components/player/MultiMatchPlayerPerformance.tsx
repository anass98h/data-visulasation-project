"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import * as d3 from "d3";
import {
  User,
  TrendingUp,
  Activity,
  Info,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { EconomyPerformanceView } from "@/components/distribution/EconomyPerformanceView";
import {
  transformDemoDataToPlayerStats,
  aggregatePlayerStats,
  findMostCommonTeam,
  filterPlayersByTeam,
  getTeamColor,
  type PlayerStats,
  type PlayerAggregatedStats,
} from "@/lib/multiMatchStats";
import { APP_CONFIG } from "@/config/app.config";

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
  matchDataList,
  selectedDemoIds,
  highlightMode,
}: {
  player: PlayerStats;
  matchCount: number;
  matchDataList: any[];
  selectedDemoIds: string[];
  highlightMode: 'all' | 'best' | 'multikill';
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellWidth, setCellWidth] = useState(20);
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);

  // Calculate max kills across all matches for "best" highlight mode
  const maxKillsOverall = useMemo(() => {
    let max = 0;
    player.matches.forEach(m => {
      if (m.kills > max) max = m.kills;
    });
    return max;
  }, [player.matches]);

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
        const gap = 4; // Gap between label and grid (gap-1)
        const padding = 16; // Total horizontal padding (px-2 = 8px each side)
        const availableWidth = containerWidth - labelWidth - gap - padding;
        // Use precise division without floor to fill exact width
        const calculatedWidth = Math.max(availableWidth / maxRounds, 16);
        setCellWidth(calculatedWidth);
      }
    };

    updateCellWidth();
    // Use setTimeout to ensure container is fully rendered
    setTimeout(updateCellWidth, 100);
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

  // Get match data and team mapping for EconomyPerformanceView
  const getMatchDataForView = (matchId: number) => {
    const matchIndex = matchId - 1; // matchId is 1-indexed
    if (matchIndex < 0 || matchIndex >= matchDataList.length) return null;

    const matchData = matchDataList[matchIndex];
    if (!matchData) return null;

    // Extract team names from ticks data (same logic as CS2ClusteringVizHomePage)
    let ctTeam: string | null = null;
    let tTeam: string | null = null;

    if (matchData.ticks && Array.isArray(matchData.ticks)) {
      for (const tick of matchData.ticks) {
        if (tick.side === "CT" && !ctTeam) {
          ctTeam = tick.team;
        }
        if (tick.side === "T" && !tTeam) {
          tTeam = tick.team;
        }
        if (ctTeam && tTeam) break;
      }
    }

    // If no team names found from ticks, return null to prevent loading state
    if (!ctTeam || !tTeam) {
      console.warn(`Could not extract team names for match ${matchId}`);
      return null;
    }

    return {
      matchData,
      teamMapping: { CT: ctTeam, T: tTeam },
      teamNames: { 1: ctTeam, 2: tTeam }
    };
  };

  // Toggle expanded match
  const handleMatchClick = (matchId: number) => {
    setExpandedMatchId(expandedMatchId === matchId ? null : matchId);
  };

  // Calculate dot sizes based on cell width
  const dotSizes = {
    empty: Math.max(Math.floor(cellWidth * 0.35), 6),
    one: Math.max(Math.floor(cellWidth * 0.5), 10),
    two: Math.max(Math.floor(cellWidth * 0.6), 12),
    three: Math.max(Math.floor(cellWidth * 0.7), 14),
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-1 w-full bg-slate-800/50 px-1 py-2 rounded border border-slate-700">
      {/* Render each match as a row */}
      {Array.from({ length: matchCount }).map((_, mIdx) => {
        const displayMatchId = mIdx + 1;
        const matchName = getMatchName(displayMatchId);
        const isExpanded = expandedMatchId === displayMatchId;
        const matchViewData = getMatchDataForView(displayMatchId);

        return (
          <div key={displayMatchId} className="flex flex-col">
            {/* Match row */}
            <div className="flex items-center gap-1">
              {/* Match ID Display (No longer expandable) */}
              <div
                className="flex items-center gap-0.5 text-[10px] text-slate-400 w-8 font-mono flex-shrink-0"
                title={matchName}
              >
                <span>M{displayMatchId}</span>
              </div>
              <div className="flex items-center flex-1 justify-between">
                {/* Render each round as a column with responsive width */}
                {Array.from({ length: maxRounds }).map((_, rIdx) => {
                  const roundNum = rIdx + 1;
                  const kills = getKills(displayMatchId, roundNum);

                  // Visual logic for the dots - responsive sizing
                  let bgClass = "bg-slate-700";
                  let dotSize = dotSizes.empty;
                  let opacity = "opacity-30";

                  // Determine visibility based on highlight mode
                  let isDimmed = false;
                  if (highlightMode === 'best') {
                    isDimmed = kills < maxKillsOverall || kills === 0;
                  } else if (highlightMode === 'multikill') {
                    isDimmed = kills < 3;
                  } else {
                    // 'all' mode - only 0 kills is dimmed (handled by default opacity-30)
                    isDimmed = kills === 0;
                  }

                  if (kills > 0) {
                    // default high opacity for active cells
                    opacity = isDimmed ? "opacity-10" : "opacity-100";
                    bgClass = `${getTeamMainColor(player.team)} shadow-[0_0_6px_rgba(59,130,246,0.6)]`;

                    if (kills === 1) dotSize = dotSizes.one;
                    if (kills === 2) dotSize = dotSizes.two;
                    if (kills >= 3) dotSize = dotSizes.three;
                  } else {
                    // Empty cells (0 kills)
                    opacity = isDimmed ? "opacity-10" : "opacity-30";
                  }

                  const isMultiKill = kills >= 3;

                  return (
                    <div
                      key={roundNum}
                      className="flex items-center justify-center group cursor-pointer relative"
                      style={{
                        width: `${cellWidth}px`,
                        height: `${cellWidth}px`,
                        flex: '1 0 0'
                      }}
                    >
                      <div
                        className={`${bgClass} ${opacity} group-hover:scale-125 group-hover:opacity-100 group-hover:shadow-[0_0_12px_rgba(59,130,246,1)]`}
                        style={{
                          width: `${dotSize}px`,
                          height: `${dotSize}px`,
                          borderRadius: isMultiKill ? '0' : '50%',
                          transform: isMultiKill ? 'rotate(45deg)' : 'none',
                        }}
                      />
                      {/* Custom instant tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded shadow-xl text-[10px] text-slate-300 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none whitespace-nowrap">
                        <div className="font-medium text-slate-100">{matchName}</div>
                        <div>Round {roundNum}: {kills} Kill{kills !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>


          </div>
        );
      })}

      {/* Round Axis Labels - Aligned with dots - All round numbers */}
      <div className="flex items-center gap-1 mt-1">
        <span className="w-8 flex-shrink-0"></span>
        <div className="flex items-center flex-1 justify-between">
          {Array.from({ length: maxRounds }).map((_, idx) => {
            const roundNum = idx + 1;

            return (
              <div
                key={roundNum}
                className="flex items-end justify-center"
                style={{
                  width: `${cellWidth}px`,
                  flex: '1 0 0'
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
  matchDataList,
  selectedDemoIds,
  highlightMode,
}: {
  player: PlayerStats;
  stats: PlayerAggregatedStats;
  matchDataList: any[];
  selectedDemoIds: string[];
  highlightMode: 'all' | 'best' | 'multikill';
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
    <div className="bg-slate-800 border-l-4 border-slate-700 hover:border-slate-500 transition-colors rounded-r-md p-2 mb-3 shadow-lg flex flex-col gap-2">
      {/* Player Name - Above Grid */}
      <div className="flex items-center gap-2">
        <User className={`w-4 h-4 ${teamColor}`} />
        <span className="font-bold text-slate-100">{player.name}</span>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className={`font-mono font-bold ${teamColor}`}>{stats.akm}</span>
          <span className="text-slate-500 text-[9px]">AKM</span>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-slate-300">{stats.kpr}</span>
          <span className="text-slate-500 text-[9px]">KPR</span>
        </div>
      </div>

      {/* The Grid Visualization - Full Width */}
      <KillGrid
        player={player}
        matchCount={player.totalMatches}
        matchDataList={matchDataList}
        selectedDemoIds={selectedDemoIds}
        highlightMode={highlightMode}
      />

      {/* Footer Stats: Consistency Only */}
      <div className="flex justify-end">
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
 * Legend Component for Kill Grid Markers
 */
const MarkerLegend = () => {
  return (
    <div className="flex items-center gap-6 px-4 py-2 bg-slate-800/50 rounded-md border border-slate-700 text-xs text-slate-400 mb-4">
      <span className="Font-semibold text-slate-300 mr-2">Marker Legend:</span>

      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-slate-600 opacity-50"></div>
        <span>0 Kills</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"></div>
        <span>1 Kill</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"></div>
        <span>2 Kills</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 bg-blue-500 rotate-45 shadow-[0_0_6px_rgba(59,130,246,0.6)]"></div>
        <span>3+ Kills (Diamond)</span>
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
  matchDataList,
  selectedDemoIds,
}: {
  team: PlayerStats[];
  teamName: string;
  matchDataList: any[];
  selectedDemoIds: string[];
}) => {
  const [sortBy, setSortBy] = useState<'akm' | 'name' | 'kills'>('akm');
  const [highlightMode, setHighlightMode] = useState<'all' | 'best' | 'multikill'>('all');

  const teamColor = getTeamColor(teamName);
  const colorClass = teamColor === "#3b82f6" ? "text-blue-400" : "text-orange-400";

  // Sort players based on selection
  const sortedTeam = useMemo(() => {
    return [...team].sort((a, b) => {
      const statsA = aggregatePlayerStats(a);
      const statsB = aggregatePlayerStats(b);

      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'kills':
          // Calculate total kills manually or assume it's roughly proportional to AKM * matches
          // Since we don't have explicit "total kills" in top-level PlayerStats, 
          // we can sum it up from matches array for accuracy.
          const killsA = a.matches.reduce((sum, m) => sum + m.kills, 0);
          const killsB = b.matches.reduce((sum, m) => sum + m.kills, 0);
          return killsB - killsA;
        case 'akm':
        default:
          return parseFloat(statsB.akm) - parseFloat(statsA.akm);
      }
    });
  }, [team, sortBy]);

  return (
    <div className="space-y-4">
      {/* Team Header & Controls */}
      <div className="flex flex-col gap-4 mb-6 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: teamColor }}
            />
            <h3 className={`text-xl font-bold ${colorClass}`}>
              {teamName}
            </h3>
            <div className="text-sm text-slate-400 ml-2">
              {team.length} Players
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Round Highlight Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Highlight:</span>
              <select
                value={highlightMode}
                onChange={(e) => setHighlightMode(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Rounds</option>
                <option value="best">Best Rounds</option>
                <option value="multikill">Multi-Kills (3+)</option>
              </select>
            </div>

            {/* Sort Control */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="akm">AKM (Avg Kills)</option>
                <option value="kills">Total Kills</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Legend */}
        <MarkerLegend />
      </div>

      {/* Player Cards - Stacked Vertically */}
      <div className="space-y-4">
        {sortedTeam.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            stats={aggregatePlayerStats(player)}
            matchDataList={matchDataList}
            selectedDemoIds={selectedDemoIds}
            highlightMode={highlightMode}
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
    // <div className="bg-slate-800/40 rounded-xl border border-slate-800 p-6 h-full">
    //   <div className="flex items-center gap-2 mb-6">
    //     <TrendingUp className="text-emerald-400 w-5 h-5" />
    //     <div className="flex items-center gap-2">
    //       <h3 className="text-lg font-bold text-white">
    //         Average Kills Per Match (AKM) Ranking
    //       </h3>
    //       <StatTooltip content="Ranking players by their average kills per game. The top players contribute the most eliminations." />
    //     </div>
    //   </div>

    //   <div ref={containerRef} className="w-full">
    //     <svg ref={svgRef} className="w-full"></svg>
    //   </div>
    // </div>
    <></>
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
  const [demoMetadata, setDemoMetadata] = useState<Record<string, any>>({});

  // Fetch demo metadata to get demo names
  useEffect(() => {
    const fetchDemoMetadata = async () => {
      if (selectedDemoIds.length === 0) return;

      try {
        const response = await fetch(APP_CONFIG.API.BASE_URL + '/demos');
        const data = await response.json();

        console.log("🔍 Raw API response from /demos:", data);
        console.log("🔍 Response type:", typeof data);
        console.log("🔍 Is array?", Array.isArray(data));

        // Handle different response structures
        let allDemos = data;

        // If response is wrapped in an object, try to extract the array
        if (!Array.isArray(data)) {
          if (data.demos && Array.isArray(data.demos)) {
            allDemos = data.demos;
          } else if (data.data && Array.isArray(data.data)) {
            allDemos = data.data;
          } else {
            console.error("❌ API response is not an array:", data);
            return;
          }
        }

        // Create a map of demo_id -> demo metadata
        const metadataMap: Record<string, any> = {};
        allDemos.forEach((demo: any) => {
          if (demo.demo_id) {
            metadataMap[demo.demo_id] = demo;
          }
        });

        console.log("📋 Fetched demo metadata map:", metadataMap);
        setDemoMetadata(metadataMap);
      } catch (error) {
        console.error("❌ Error fetching demo metadata:", error);
      }
    };

    fetchDemoMetadata();
  }, [selectedDemoIds]);

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
        // Enrich matchDataList with demo names from metadata
        const enrichedMatchDataList = matchDataList.map((matchData, index) => {
          const demoId = selectedDemoIds[index];
          const metadata = demoMetadata[demoId];

          return {
            ...matchData,
            demo_name: metadata?.demo_name || metadata?.name,
            metadata: {
              ...matchData.metadata,
              demo_name: metadata?.demo_name || metadata?.name,
            }
          };
        });

        const stats = transformDemoDataToPlayerStats(
          enrichedMatchDataList,
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
  }, [matchDataList, selectedDemoIds, demoMetadata]);

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
      <div className="w-full">
        {/* Left Column: Player Cards */}
        {teamPlayers.length > 0 && (
          <PlayerList
            team={teamPlayers}
            teamName={targetTeamName}
            matchDataList={matchDataList}
            selectedDemoIds={selectedDemoIds}
          />
        )}

        {/* Right Column: AKM Ranking Chart */}
        {comparisonData.length > 0 && <ComparisonChart data={comparisonData} />}
      </div>
    </div>
  );
}
