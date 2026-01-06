"use client";

import { useState, useEffect } from "react";
import Economy from "./economy";
import LineChart from "./lineChart";
import { PlayerGrid } from "@/components/player/PlayerGrid";
import { calculateEconomy, extractXYForBothTeams } from "@/lib/distribution";
import { calculatePlayerPerformance } from "@/lib/playerPerformance";
import { getPlayersByTeam } from "@/lib/playerPerformanceTransform";

interface EconomyPerformanceViewProps {
  matchData: any;
  teamMapping: { CT: string | null; T: string | null };
  teamNames: Record<number, string>;
}

interface DynamicTeamMapping {
  CT: string;
  T: string;
}

export function EconomyPerformanceView({
  matchData,
  teamMapping,
  teamNames,
}: EconomyPerformanceViewProps) {
  // View state
  const [currentView, setCurrentView] = useState<"economy" | "performance">(
    "economy"
  );

  // Economy data
  const [economyData, setEconomyData] = useState<any>({});
  const [lineChartData, setLineChartData] = useState<any[]>([]);

  // Performance data
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [teams, setTeams] = useState<{
    teamA: { name: string; players: any[] } | null;
    teamB: { name: string; players: any[] } | null;
  }>({ teamA: null, teamB: null });

  // Dynamic team mapping for current round (used by economy view)
  const [dynamicTeamMapping, setDynamicTeamMapping] =
    useState<DynamicTeamMapping>({
      CT: teamMapping.CT || "CT",
      T: teamMapping.T || "T",
    });

  // Update dynamic team mapping when static mapping changes
  useEffect(() => {
    if (teamMapping.CT && teamMapping.T) {
      setDynamicTeamMapping({
        CT: teamMapping.CT,
        T: teamMapping.T,
      });
    }
  }, [teamMapping]);

  // Calculate economy data
  useEffect(() => {
    if (matchData && teamMapping.CT && teamMapping.T) {
      try {
        const teamNamesForCalc = {
          1: teamMapping.CT,
          2: teamMapping.T,
        };
        const calculatedEconomy = calculateEconomy(
          [matchData],
          teamNamesForCalc
        );
        setEconomyData(calculatedEconomy);
      } catch (error) {
        console.error("Error calculating economy:", error);
      }
    }
  }, [matchData, teamMapping]);

  // Extract line chart data
  useEffect(() => {
    if (!economyData.teams || !economyData.teams[1] || !economyData.teams[2]) {
      setLineChartData([]);
      return;
    }
    const result = extractXYForBothTeams(economyData, "economy");
    setLineChartData(result);
  }, [economyData]);

  // Calculate performance data
  useEffect(() => {
    if (matchData && teamMapping.CT && teamMapping.T) {
      try {
        const matchName = `${teamMapping.CT} vs ${teamMapping.T}`;
        const perfData = calculatePlayerPerformance(matchData, "m1", matchName);
        setPerformanceData(perfData);

        const { teamA, teamB } = getPlayersByTeam(perfData);
        setTeams({ teamA, teamB });
      } catch (error) {
        console.error("Error calculating performance:", error);
      }
    }
  }, [matchData, teamMapping]);

  return (
    <div
      className="flex flex-col"
      style={{ maxHeight: "850px", height: "100%" }}
    >
      {/* View Switcher */}
      <div className="flex gap-2 mb-4 flex-shrink-0">
        <button
          onClick={() => setCurrentView("economy")}
          className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors text-sm ${
            currentView === "economy"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          💰 Economy Distribution
        </button>
        <button
          onClick={() => setCurrentView("performance")}
          className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors text-sm ${
            currentView === "performance"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          🎯 Player Performance
        </button>
      </div>

      {/* Content area with scrolling - takes remaining space */}
      <div
        className="flex-1 min-h-0 overflow-y-auto pr-2"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#4b5563 #1f2937",
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            width: 6px;
          }
          div::-webkit-scrollbar-track {
            background: #1f2937;
            border-radius: 3px;
          }
          div::-webkit-scrollbar-thumb {
            background: #4b5563;
            border-radius: 3px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: #6b7280;
          }
        `}</style>

        {/* Economy View */}
        {currentView === "economy" && (
          <div className="flex flex-col justify-between space-y-4 gap-4">
            {/* Economy Cards */}
            <div>
              <Economy
                economyData={economyData}
                teamNames={teamNames}
                teamMapping={dynamicTeamMapping}
                staticTeamMapping={
                  teamMapping.CT && teamMapping.T
                    ? { CT: teamMapping.CT, T: teamMapping.T }
                    : undefined
                }
              />
            </div>

            {/* Line Chart */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <LineChart seriesData={lineChartData} />
            </div>
          </div>
        )}

        {/* Performance View */}
        {currentView === "performance" && (
          <div>
            {performanceData && teams.teamA && teams.teamB ? (
              <PlayerGrid
                performanceData={performanceData}
                teamA={teams.teamA}
                teamB={teams.teamB}
              />
            ) : (
              <div className="text-gray-400 text-center py-12">
                Loading performance data...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
