"use client";
import React, { useState } from "react";
import {
  TrendingUp,
  Target,
  Clock,
  Zap,
  Users,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

const CS2Dashboard = () => {
  const [selectedRound, setSelectedRound] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data
  const strategyDistribution = [
    { name: "Fast A Rush", percentage: 28, color: "#ef4444", rounds: 5 },
    { name: "Default Setup", percentage: 28, color: "#3b82f6", rounds: 5 },
    { name: "B Execute", percentage: 28, color: "#10b981", rounds: 5 },
    { name: "A-B Split", percentage: 17, color: "#f59e0b", rounds: 3 },
  ];

  const roundTimeline = [
    {
      id: 1,
      round: 1,
      type: "Fast A Rush",
      winner: "T",
      time: 15,
      color: "#ef4444",
    },
    {
      id: 2,
      round: 2,
      type: "Default Setup",
      winner: "CT",
      time: 48,
      color: "#3b82f6",
    },
    {
      id: 3,
      round: 3,
      type: "B Execute",
      winner: "T",
      time: 25,
      color: "#10b981",
    },
    {
      id: 4,
      round: 4,
      type: "Fast A Rush",
      winner: "CT",
      time: 12,
      color: "#ef4444",
    },
    {
      id: 5,
      round: 5,
      type: "A-B Split",
      winner: "T",
      time: 30,
      color: "#f59e0b",
    },
    {
      id: 6,
      round: 6,
      type: "Default Setup",
      winner: "T",
      time: 45,
      color: "#3b82f6",
    },
    {
      id: 7,
      round: 7,
      type: "B Execute",
      winner: "CT",
      time: 28,
      color: "#10b981",
    },
    {
      id: 8,
      round: 8,
      type: "Fast A Rush",
      winner: "T",
      time: 16,
      color: "#ef4444",
    },
  ];

  const playerPerformance = [
    { player: "Player1", rating: 1.12, adr: 82, kast: 73, trend: "up" },
    { player: "Player2", rating: 0.98, adr: 71, kast: 68, trend: "stable" },
    { player: "Player3", rating: 1.24, adr: 95, kast: 81, trend: "up" },
    { player: "Player4", rating: 0.89, adr: 65, kast: 64, trend: "down" },
    { player: "Player5", rating: 1.05, adr: 78, kast: 70, trend: "stable" },
  ];

  const economyData = [
    {
      round: 1,
      winProb: 0.45,
      actualSpend: 4200,
      optimalSpend: 4500,
      delta: -300,
    },
    {
      round: 2,
      winProb: 0.62,
      actualSpend: 3800,
      optimalSpend: 3800,
      delta: 0,
    },
    {
      round: 3,
      winProb: 0.38,
      actualSpend: 5100,
      optimalSpend: 4200,
      delta: 900,
    },
  ];

  return (
    <div className="w-full bg-gray-50 p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold">Team X - Opponent Analysis</h1>
            <p className="text-gray-600">
              18 rounds analyzed across 3 maps (Playoffs)
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Last updated</div>
            <div className="font-semibold">Oct 6, 2025</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-sm text-blue-600 mb-1">Win Rate</div>
            <div className="text-2xl font-bold text-blue-900">58%</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-sm text-green-600 mb-1">Avg Round Time</div>
            <div className="text-2xl font-bold text-green-900">28s</div>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <div className="text-sm text-purple-600 mb-1">
              Avg Utility/Round
            </div>
            <div className="text-2xl font-bold text-purple-900">7.3</div>
          </div>
          <div className="bg-orange-50 p-3 rounded">
            <div className="text-sm text-orange-600 mb-1">Most Common</div>
            <div className="text-lg font-bold text-orange-900">Fast A Rush</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left Column - Minimap & Strategy */}
        <div className="col-span-2 space-y-4">
          {/* Minimap with Heatmap */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Position Heatmap - All Rounds
            </h3>
            <div
              className="relative bg-gray-800 rounded"
              style={{ height: "400px" }}
            >
              {/* Simplified CS2 Map */}
              <svg width="100%" height="100%" viewBox="0 0 200 200">
                {/* Map outline */}
                <rect
                  x="10"
                  y="10"
                  width="180"
                  height="180"
                  fill="#2a2a2a"
                  stroke="#444"
                  strokeWidth="1"
                />

                {/* A Site */}
                <rect
                  x="20"
                  y="20"
                  width="50"
                  height="50"
                  fill="#1e3a8a"
                  opacity="0.3"
                />
                <text
                  x="45"
                  y="50"
                  fill="#fff"
                  fontSize="12"
                  textAnchor="middle"
                >
                  A SITE
                </text>

                {/* B Site */}
                <rect
                  x="130"
                  y="130"
                  width="50"
                  height="50"
                  fill="#1e3a8a"
                  opacity="0.3"
                />
                <text
                  x="155"
                  y="160"
                  fill="#fff"
                  fontSize="12"
                  textAnchor="middle"
                >
                  B SITE
                </text>

                {/* Mid */}
                <rect
                  x="80"
                  y="80"
                  width="40"
                  height="40"
                  fill="#1e3a8a"
                  opacity="0.2"
                />
                <text
                  x="100"
                  y="105"
                  fill="#fff"
                  fontSize="10"
                  textAnchor="middle"
                >
                  MID
                </text>

                {/* Heat blobs for different strategies */}
                {/* Fast A Rush heat */}
                <ellipse
                  cx="45"
                  cy="45"
                  rx="25"
                  ry="25"
                  fill="#ef4444"
                  opacity="0.6"
                />
                <ellipse
                  cx="45"
                  cy="45"
                  rx="15"
                  ry="15"
                  fill="#ef4444"
                  opacity="0.8"
                />

                {/* Default Setup spread */}
                <ellipse
                  cx="100"
                  cy="100"
                  rx="30"
                  ry="30"
                  fill="#3b82f6"
                  opacity="0.4"
                />

                {/* B Execute heat */}
                <ellipse
                  cx="155"
                  cy="155"
                  rx="22"
                  ry="22"
                  fill="#10b981"
                  opacity="0.6"
                />
                <ellipse
                  cx="155"
                  cy="155"
                  rx="12"
                  ry="12"
                  fill="#10b981"
                  opacity="0.8"
                />

                {/* Utility markers */}
                <circle
                  cx="50"
                  cy="60"
                  r="3"
                  fill="#fbbf24"
                  stroke="#fff"
                  strokeWidth="1"
                />
                <circle
                  cx="38"
                  cy="52"
                  r="3"
                  fill="#fbbf24"
                  stroke="#fff"
                  strokeWidth="1"
                />
                <circle
                  cx="150"
                  cy="145"
                  r="3"
                  fill="#fbbf24"
                  stroke="#fff"
                  strokeWidth="1"
                />

                {/* T Spawn */}
                <text
                  x="100"
                  y="190"
                  fill="#f59e0b"
                  fontSize="10"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  T SPAWN
                </text>
              </svg>

              {/* Legend */}
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 rounded p-2 text-xs text-white">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>High Activity</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <span>Utility Usage</span>
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Mixture */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Strategy Distribution
            </h3>

            {/* Distribution bar */}
            <div className="flex gap-1 h-16 rounded overflow-hidden mb-4">
              {strategyDistribution.map((strategy) => (
                <div
                  key={strategy.name}
                  style={{
                    backgroundColor: strategy.color,
                    width: `${strategy.percentage}%`,
                  }}
                  className="flex flex-col items-center justify-center text-white text-xs font-medium"
                >
                  <div className="font-bold text-lg">
                    {strategy.percentage}%
                  </div>
                  <div className="text-[10px]">{strategy.rounds}R</div>
                </div>
              ))}
            </div>

            {/* Strategy cards */}
            <div className="grid grid-cols-2 gap-3">
              {strategyDistribution.map((strategy) => (
                <div
                  key={strategy.name}
                  className="border rounded p-3"
                  style={{
                    borderLeftWidth: "4px",
                    borderLeftColor: strategy.color,
                  }}
                >
                  <div className="font-semibold text-sm mb-1">
                    {strategy.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {strategy.name === "Fast A Rush" &&
                      "~15s avg, heavy utility"}
                    {strategy.name === "Default Setup" &&
                      "~45s avg, map control"}
                    {strategy.name === "B Execute" && "~25s avg, coordinated"}
                    {strategy.name === "A-B Split" &&
                      "~30s avg, divided pressure"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Round Timeline */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Round Timeline
            </h3>
            <div className="space-y-2">
              {roundTimeline.map((round) => (
                <div
                  key={round.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  onClick={() => setSelectedRound(round.id)}
                >
                  <div className="w-8 text-sm font-semibold text-gray-600">
                    R{round.round}
                  </div>
                  <div
                    className="flex-1 h-8 rounded"
                    style={{ backgroundColor: round.color, opacity: 0.7 }}
                  ></div>
                  <div className="w-20 text-sm">{round.type.split(" ")[0]}</div>
                  <div className="w-12 text-xs text-gray-600">
                    {round.time}s
                  </div>
                  <div
                    className={`w-8 text-xs font-semibold ${
                      round.winner === "T" ? "text-orange-600" : "text-blue-600"
                    }`}
                  >
                    {round.winner}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Analytics */}
        <div className="space-y-4">
          {/* Coaching Insight */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Key Insight
            </h3>
            <p className="text-sm mb-3">
              Team X heavily favors A Site (45% of rounds). They rarely play
              slow defaults (28%).
            </p>
            <div className="bg-white bg-opacity-20 rounded p-2 text-xs">
              <div className="font-semibold mb-1">Recommended Counter:</div>
              <ul className="space-y-1 list-disc list-inside">
                <li>Stack 3 players at A Site</li>
                <li>Aggressive A utility at 12s</li>
                <li>Push mid early (they're slow)</li>
              </ul>
            </div>
          </div>

          {/* Player Performance */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Player Performance
            </h3>
            <div className="space-y-2">
              {playerPerformance.map((player) => (
                <div
                  key={player.player}
                  className="border-l-2 border-gray-200 pl-3 py-1"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-sm">
                      {player.player}
                    </span>
                    <span
                      className={`text-xs ${
                        player.trend === "up"
                          ? "text-green-600"
                          : player.trend === "down"
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {player.trend === "up"
                        ? "↗"
                        : player.trend === "down"
                        ? "↘"
                        : "→"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500">Rating</div>
                      <div className="font-semibold">{player.rating}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">ADR</div>
                      <div className="font-semibold">{player.adr}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">KAST</div>
                      <div className="font-semibold">{player.kast}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Economy Panel */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Economy Analysis
            </h3>
            <div className="space-y-3">
              {economyData.map((data) => (
                <div key={data.round} className="border rounded p-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold">
                      Round {data.round}
                    </span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      Win Prob: {(data.winProb * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actual Spend:</span>
                      <span className="font-semibold">${data.actualSpend}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Optimal:</span>
                      <span className="font-semibold">
                        ${data.optimalSpend}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Error:</span>
                      <span
                        className={`font-semibold ${
                          data.delta > 0
                            ? "text-red-600"
                            : data.delta < 0
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {data.delta > 0 ? "+" : ""}
                        {data.delta}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-2 rounded">
              Note: Positive error = overspending, negative = underspending
            </div>
          </div>

          {/* Similar Rounds */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <ChevronRight className="w-5 h-5" />
              Similar Rounds
            </h3>
            <div className="text-sm text-gray-600 mb-2">
              Rounds similar to "Fast A Rush":
            </div>
            <div className="space-y-2">
              <div className="bg-red-50 border border-red-200 rounded p-2 text-xs">
                <div className="font-semibold">Match vs Team Y - R4</div>
                <div className="text-gray-600">Similarity: 94% • Won by T</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded p-2 text-xs">
                <div className="font-semibold">Match vs Team Z - R11</div>
                <div className="text-gray-600">Similarity: 89% • Won by CT</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded p-2 text-xs">
                <div className="font-semibold">Match vs Team Y - R8</div>
                <div className="text-gray-600">Similarity: 87% • Won by T</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CS2Dashboard;
