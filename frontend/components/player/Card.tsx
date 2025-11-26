"use client";

import React from "react";

interface CardProps {
  playerName: string;
  teamName: string;
  children: React.ReactNode;
  align?: "left" | "right";
  height?: number;
}

export function Card({
  playerName,
  teamName,
  children,
  align = "left",
  height,
}: CardProps) {
  return (
    <div
      className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse" : "flex-row"}`}
      style={height ? { height: `${height}px` } : undefined}
    >
      {/* Player name outside the card */}
      <div className={`flex-shrink-0 w-24 ${align === "right" ? "text-right" : "text-left"}`}>
        <h3 className="text-sm font-bold text-white truncate">{playerName}</h3>
        <p className="text-xs text-gray-400 truncate">{teamName}</p>
      </div>

      {/* Card with chart - fills remaining space */}
      <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 p-3 hover:border-gray-600 transition-colors h-full">
        {children}
      </div>
    </div>
  );
}
