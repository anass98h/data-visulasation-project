"use client";

import React from "react";

interface CardProps {
  playerName: string;
  teamName: string;
  children: React.ReactNode;
  align?: "left" | "right";
}

export function Card({
  playerName,
  teamName,
  children,
  align = "left",
}: CardProps) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors">
      <div
        className={`flex ${align === "right" ? "justify-end" : "justify-start"} mb-3`}
      >
        <div className={align === "right" ? "text-right" : "text-left"}>
          <h3 className="text-sm font-bold text-white">{playerName}</h3>
          <p className="text-xs text-gray-400">{teamName}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
