"use client";

import React from "react";
import { Card } from "./Card";
import { KillPerformance } from "./KillPerformance";
import { transformToChartSeries } from "@/lib/playerPerformanceTransform";

interface PlayerGridProps {
  performanceData: any;
  teamA: { name: string; players: any[] };
  teamB: { name: string; players: any[] };
}

export function PlayerGrid({ performanceData, teamA, teamB }: PlayerGridProps) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-6">
      {/* Team A - Left Side */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-center text-blue-400 mb-4">
          {teamA.name}
        </h2>
        {teamA.players.length === 0 && (
          <div className="text-gray-500 text-center text-sm">
            No players found
          </div>
        )}
        {teamA.players.map((player) => {
          const chartData = transformToChartSeries(
            performanceData,
            player.name
          );
          return (
            <Card
              key={player.name}
              playerName={player.name}
              teamName={teamA.name}
              align="left"
            >
              <KillPerformance
                playerName={player.name}
                seriesData={chartData}
              />
            </Card>
          );
        })}
      </div>

      {/* VS Divider */}
      <div className="flex items-center justify-center px-4">
        <div className="text-4xl font-bold text-gray-500">VS</div>
      </div>

      {/* Team B - Right Side */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-center text-red-400 mb-4">
          {teamB.name}
        </h2>
        {teamB.players.length === 0 && (
          <div className="text-gray-500 text-center text-sm">
            No players found
          </div>
        )}
        {teamB.players.map((player) => {
          const chartData = transformToChartSeries(
            performanceData,
            player.name
          );
          return (
            <Card
              key={player.name}
              playerName={player.name}
              teamName={teamB.name}
              align="right"
            >
              <KillPerformance
                playerName={player.name}
                seriesData={chartData}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
