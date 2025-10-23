"use client";
import React, { useState, useEffect, useMemo } from "react";
import { TrendingUp, Target, Clock, Upload, DollarSign } from "lucide-react";
import CS2MapRenderer from "./CS2MapRenderer";
import { EconomyDropdown } from "@/components/distribution/dropdown";
import LineChart from "@/components/distribution/lineChart";
import Economy from "@/components/distribution/economy";
import * as distributionHelpers from "@/lib/distribution";

const CS2Dashboard = () => {
  const [matchData, setMatchData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dropdownValue, setDropdownValue] = useState("ct");
  const [economyData, setEconomyData] = useState({});
  const [lineChartData, setLineChartData] = useState({});

  // Load match data from public folder
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
        setIsLoading(false);
      } catch (error) {
        console.log("Error loading match data - user can upload their own");
        setIsLoading(false);
        setMatchData(null);
      }
    };

    loadMatchData();
  }, []);

  // Calculate economy data when match data changes
  useEffect(() => {
    if (matchData) {
      try {
        const calculatedEconomy = distributionHelpers.calculateEconomy([
          matchData,
        ]);
        console.log("Calculated economy:", calculatedEconomy);
        setEconomyData(calculatedEconomy);
      } catch (error) {
        console.error("Error calculating economy:", error);
      }
    }
  }, [matchData]);

  // Update line chart data when dropdown or economy data changes
  useEffect(() => {
    if (!economyData.ct_economy || !economyData.t_economy) return;

    try {
      const result = distributionHelpers.extractXY(
        economyData,
        "economy",
        undefined,
        dropdownValue
      );
      setLineChartData(result);
    } catch (error) {
      console.error("Error extracting XY data:", error);
    }
  }, [dropdownValue, economyData]);

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsLoading(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        setMatchData(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error parsing JSON file:", error);
        setIsLoading(false);
      }
    }
  };

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

  // Create totalEconomy object from new structure
  const totalEconomy =
    economyData.ct_economy && economyData.t_economy
      ? {
          ct_economy: economyData.ct_economy.total_value,
          t_economy: economyData.t_economy.total_value,
        }
      : undefined;

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
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">CS2 Match Analysis</h1>
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

          <CS2MapRenderer matchData={null} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold">CS2 Match Analysis</h1>
              <p className="text-gray-400 mt-1">
                {stats.totalRounds} rounds on {stats.mapName}
              </p>
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

        {/* Map Renderer */}
        <CS2MapRenderer matchData={matchData} />

        {/* Economy Distribution Section */}
        {totalEconomy && (
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-400">
                  Select Team:
                </span>
                <EconomyDropdown
                  value={dropdownValue}
                  onValueChange={setDropdownValue}
                />
              </div>
            </div>

            {/* Economy Cards */}
            <div className="mb-6">
              <Economy totalEconomy={totalEconomy} />
            </div>

            {/* Line Chart */}
            <LineChart
              data={lineChartData}
              title={`${dropdownValue.toUpperCase()} Economy Over Rounds`}
              description={`Track ${
                dropdownValue === "ct" ? "Counter-Terrorist" : "Terrorist"
              } economy performance across game rounds`}
            />
          </div>
        )}

        {/* Round Summary */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Round Summary
          </h3>
          <div className="space-y-2">
            {matchData.rounds?.map((round, idx) => {
              const roundDuration = round.endTick - round.startTick;
              const progressPercentage =
                (roundDuration / maxRoundDuration) * 100;

              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors border border-gray-600"
                >
                  <div className="w-16 text-sm font-semibold text-gray-300">
                    Round {round.roundNum}
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          round.winner === "T" ? "bg-red-500" : "bg-blue-500"
                        }`}
                        style={{
                          width: `${progressPercentage}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-32 text-sm text-gray-400">
                    {roundDuration.toLocaleString()} ticks
                  </div>
                  <div
                    className={`w-12 text-sm font-semibold text-center ${
                      round.winner === "T" ? "text-red-400" : "text-blue-400"
                    }`}
                  >
                    {round.winner}
                  </div>
                  <div className="text-sm text-gray-400">
                    <span className="text-blue-400">{round.ctScore}</span>
                    {" - "}
                    <span className="text-red-400">{round.tScore}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-4">
          {/* Match Info */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
              <Target className="w-6 h-6" />
              Match Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Map</span>
                <span className="font-semibold">{stats.mapName}</span>
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
  );
};

export default CS2Dashboard;
