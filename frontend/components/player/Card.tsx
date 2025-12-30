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
    <div className="flex flex-col gap-1">
      {/* Player name above the card */}
      <div className={`flex items-center gap-2 ${align === "right" ? "justify-end" : "justify-start"}`}>
        <h3 className="text-sm font-bold text-white truncate">{playerName}</h3>
      </div>

      {/* Card with chart - full width */}
      <div
        className="w-full bg-gray-800 rounded-lg border border-gray-700 p-2 hover:border-gray-600 transition-colors"
        style={height ? { height: `${height}px` } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
