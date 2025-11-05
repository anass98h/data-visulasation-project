"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { MAP_CONFIG, TEAM_COLORS } from "@/config/clustering.config";
import type { Representative, Team } from "@/types/clustering";

interface Props {
  mapName?: string;
  team?: Team;
  representative?: Representative;
  width?: number;
  height?: number;
}

const ClusteringMapPreview: React.FC<Props> = ({
  mapName = "de_ancient",
  team = "CT",
  representative,
  width = 1024,
  height = 600,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [radar, setRadar] = useState<HTMLImageElement | null>(null);

  const config = useMemo(() => MAP_CONFIG[mapName] ?? MAP_CONFIG.de_ancient, [mapName]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setRadar(img);
    img.onerror = () => setRadar(null);
    img.src = config.radarImage;
  }, [config.radarImage]);

  const gameToCanvas = (x: number, y: number) => {
    const scaleX = width / (config.maxX - config.minX);
    const scaleY = height / (config.maxY - config.minY);
    return {
      x: (x - config.minX) * scaleX,
      y: height - (y - config.minY) * scaleY,
    };
  };

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, width, height);

    if (radar) {
      ctx.globalAlpha = 1;
      ctx.drawImage(radar, 0, 0, width, height);
    }

    // Draw representative if provided (5-player setup)
    if (representative?.players?.length) {
      representative.players.forEach((p) => {
        const pos = gameToCanvas(p.x, p.y);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = team === "CT" ? TEAM_COLORS.CT_MAIN : TEAM_COLORS.T_MAIN;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        if (p.name) {
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 11px sans-serif";
          ctx.fillText(p.name, pos.x + 14, pos.y + 4);
        }
      });
    } else {
      // Empty state overlay
      ctx.fillStyle = "#9ca3af";
      ctx.font = "14px sans-serif";
      ctx.fillText("No representative setup yet", 16, 24);
    }
  }, [radar, representative, team, width, height, config]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-200 font-semibold">Map Preview</div>
        <div className="text-xs text-gray-400">{mapName} • Team {team}</div>
      </div>
      <div className="flex items-center justify-center p-3 bg-gray-900">
        <canvas ref={canvasRef} width={width} height={height} className="w-full max-w-4xl" />
      </div>
    </div>
  );
};

export default ClusteringMapPreview;

