"use client";
import React, { useState, useEffect } from "react";
import { TrendingUp, Target, Clock, Users, AlertCircle } from "lucide-react";
import CS2MapRenderer from "./CS2MapRenderer";

const CS2Dashboard = () => {
  const [matchData, setMatchData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load match data
  useEffect(() => {
    const loadMatchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/match_data.json");
        if (!response.ok) {
          console.error("Failed to load match data");
          setIsLoading(false);
          return;
        }
        const data = await response.json();
        setMatchData(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading match data:", error);
        setIsLoading(false);
      }
    };

    loadMatchData();
  }, []);

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

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading match data...</p>
        </div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="w-full h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4" />
          <p>Failed to load match data</p>
          <p className="text-sm text-gray-400 mt-2">
            Make sure match_data.json is in the public folder
          </p>
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
            <div className="text-right">
              <div className="text-sm text-gray-400">Tick Rate</div>
              <div className="text-2xl font-bold">{stats.tickRate}</div>
            </div>
          </div>

          {/* Quick Stats */}
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

        {/* CS2 Map Renderer */}
        <CS2MapRenderer />

        {/* Round Summary */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Round Summary
          </h3>
          <div className="space-y-2">
            {matchData.rounds?.map((round, idx) => (
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
                        width: `${
                          ((round.endTick - round.startTick) / 10000) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="w-32 text-sm text-gray-400">
                  {round.endTick - round.startTick} ticks
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
            ))}
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
