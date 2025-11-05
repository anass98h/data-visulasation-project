import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  AlertCircle,
  FastForward,
} from "lucide-react";

const MAP_CONFIG = {
  de_ancient: {
    minX: -2953,
    maxX: 2119,
    minY: -2887,
    maxY: 1983,
    radarImage: "/radar_images/de_ancient_radar_psd.png",
  },
  de_mirage: {
    minX: -3230,
    maxX: 1890,
    minY: -3407,
    maxY: 1713,
    radarImage: "/radar_images/de_mirage_radar_psd.png",
  },
};

// Custom Tailwind classes for muted team colors for better dashboard integration
const TEAM_COLORS = {
  CT_MAIN: "#2563eb", // blue-700 equivalent
  T_MAIN: "#dc2626", // red-700 equivalent
};

const CS2MapRenderer = ({
  matchData: externalMatchData,
  heatmapData: externalHeatmapData, // This now contains all round heatmaps (round_heatmaps_*.json)
  teamSideHeatmapData: externalTeamSideHeatmapData, // NEW: team+side aggregated heatmaps
  teamMapping,
  staticTeamMapping,
  setCurrentRoundContext,
}) => {
  const [matchData, setMatchData] = useState(externalMatchData);
  const [allRoundHeatmapData, setAllRoundHeatmapData] =
    useState(externalHeatmapData);
  const [teamSideHeatmaps, setTeamSideHeatmaps] = useState(
    externalTeamSideHeatmapData
  );
  const [selectedTeamSide, setSelectedTeamSide] = useState(null);
  const [heatmapMode, setHeatmapMode] = useState("per-round"); // "per-round" or "team-side"
  const [currentTick, setCurrentTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(10);
  const [selectedRound, setSelectedRound] = useState(0);
  const [radarImage, setRadarImage] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const playerStatesRef = useRef(new Map());

  // Derive the currently displayed round number (1-indexed)
  const currentRoundNum = matchData?.rounds?.[selectedRound]?.roundNum || 1;

  // Get team+side options for dropdown
  const teamSideOptions = useMemo(() => {
    if (!teamSideHeatmaps?.teamSideHeatmaps) return [];
    return Object.keys(teamSideHeatmaps.teamSideHeatmaps).map((key) => ({
      value: key,
      label: key.replace(/_as_/g, " as ").replace(/_/g, " "),
    }));
  }, [teamSideHeatmaps]);

  // Initialize selected team+side
  useEffect(() => {
    if (teamSideOptions.length > 0 && !selectedTeamSide) {
      setSelectedTeamSide(teamSideOptions[0].value);
    }
  }, [teamSideOptions, selectedTeamSide]);

  // Use memo to get the specific heatmap data for the current round OR team+side
  const currentHeatmapData = useMemo(() => {
    if (
      heatmapMode === "team-side" &&
      teamSideHeatmaps?.teamSideHeatmaps &&
      selectedTeamSide
    ) {
      // Return team+side aggregated heatmap
      const teamSideData = teamSideHeatmaps.teamSideHeatmaps[selectedTeamSide];
      if (teamSideData) {
        // Determine if this is a T or CT side based on the key
        const isT = selectedTeamSide.includes("_as_T");
        return {
          ct: isT
            ? { grid: [], samples: 0 }
            : { grid: teamSideData.grid, samples: teamSideData.samples },
          t: isT
            ? { grid: teamSideData.grid, samples: teamSideData.samples }
            : { grid: [], samples: 0 },
        };
      }
    }

    // Default to per-round heatmap
    if (!allRoundHeatmapData?.roundHeatmaps) return null;
    return allRoundHeatmapData.roundHeatmaps[String(currentRoundNum)] || null;
  }, [
    heatmapMode,
    teamSideHeatmaps,
    selectedTeamSide,
    allRoundHeatmapData,
    currentRoundNum,
  ]);

  const getCurrentRound = () => {
    if (!matchData?.rounds) return null;
    return (
      matchData.rounds.find(
        (r) => currentTick >= r.startTick && currentTick <= r.endTick
      ) || matchData.rounds[selectedRound]
    );
  };

  useEffect(() => {
    if (externalMatchData) {
      setMatchData(externalMatchData);
      setCurrentTick(externalMatchData.rounds?.[0]?.startTick || 0);
      setSelectedRound(0);
      playerStatesRef.current.clear();

      if (setCurrentRoundContext) {
        setCurrentRoundContext(externalMatchData.rounds?.[0]?.roundNum || 1);
      }

      const mapName = externalMatchData.header?.mapName || "de_ancient";
      const mapConfig = MAP_CONFIG[mapName];
      if (mapConfig?.radarImage) {
        const img = new Image();
        img.onload = () => setRadarImage(img);
        img.onerror = () => console.log("Radar image not found");
        img.src = mapConfig.radarImage;
      }
    }
  }, [externalMatchData, setCurrentRoundContext]);

  useEffect(() => {
    if (externalHeatmapData) {
      // Store all round heatmap data
      setAllRoundHeatmapData(externalHeatmapData);
    }
  }, [externalHeatmapData]);

  useEffect(() => {
    if (externalTeamSideHeatmapData) {
      setTeamSideHeatmaps(externalTeamSideHeatmapData);
      console.log("Team+side heatmap data loaded successfully");
    }
  }, [externalTeamSideHeatmapData]);

  const tickIndex = useMemo(() => {
    if (!matchData?.ticks) return new Map();
    const index = new Map();
    matchData.ticks.forEach((tick) => {
      const tickNum = tick.tick;
      if (!index.has(tickNum)) {
        index.set(tickNum, []);
      }
      index.get(tickNum).push(tick);
    });
    return index;
  }, [matchData]);

  const gameToCanvas = (x, y, canvasWidth, canvasHeight) => {
    const mapConfig =
      MAP_CONFIG[matchData?.header?.mapName] || MAP_CONFIG.de_ancient;
    const scaleX = canvasWidth / (mapConfig.maxX - mapConfig.minX);
    const scaleY = canvasHeight / (mapConfig.maxY - mapConfig.minY);
    return {
      x: (x - mapConfig.minX) * scaleX,
      y: canvasHeight - (y - mapConfig.minY) * scaleY,
    };
  };

  // Modified to use the current round's specific heatmap data
  const drawHeatmap = (ctx, width, height) => {
    if (!currentHeatmapData) return;

    // Use gridSize from the overall heatmap data structure
    const gridSize = allRoundHeatmapData?.gridSize || 50;
    const bounds = allRoundHeatmapData?.bounds;

    if (!bounds || !gridSize) return;

    // Extract the per-round CT and T grids
    const ct = currentHeatmapData.ct;
    const t = currentHeatmapData.t;

    const cellWidth = width / gridSize;
    const cellHeight = height / gridSize;

    const SHRINK_FACTOR = 0.95;
    const drawWidth = cellWidth * SHRINK_FACTOR;
    const drawHeight = cellHeight * SHRINK_FACTOR;
    const drawOffset = (cellWidth * (1 - SHRINK_FACTOR)) / 2;

    if (ct?.grid) {
      for (let row = 0; row < ct.grid.length; row++) {
        for (let col = 0; col < ct.grid[row].length; col++) {
          // Density is normalized 0-1
          const density = ct.grid[row][col];
          if (density > 0) {
            const alpha = Math.min(density * 1.0, 0.95);
            ctx.fillStyle = `rgba(37, 99, 235, ${alpha})`;

            ctx.fillRect(
              col * cellWidth + drawOffset,
              row * cellHeight + drawOffset,
              drawWidth,
              drawHeight
            );
          }
        }
      }
    }

    if (t?.grid) {
      for (let row = 0; row < t.grid.length; row++) {
        for (let col = 0; col < t.grid[row].length; col++) {
          const density = t.grid[row][col];
          if (density > 0) {
            const alpha = Math.min(density * 1.0, 0.95);
            ctx.fillStyle = `rgba(185, 28, 28, ${alpha})`;

            ctx.fillRect(
              col * cellWidth + drawOffset,
              row * cellHeight + drawOffset,
              drawWidth,
              drawHeight
            );
          }
        }
      }
    }
  };

  useEffect(() => {
    const round = matchData?.rounds?.[selectedRound];
    if (round && setCurrentRoundContext) {
      setCurrentRoundContext(round.roundNum);
    }
  }, [selectedRound, matchData, setCurrentRoundContext]);

  useEffect(() => {
    if (!matchData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    const tickData = tickIndex.get(currentTick) || [];

    tickData.forEach((player) => {
      const playerId = player.steamId || player.name;
      const existingPlayer = playerStatesRef.current.get(playerId);

      if (existingPlayer) {
        existingPlayer.targetX = player.x;
        existingPlayer.targetY = player.y;
        existingPlayer.health = player.health;
        existingPlayer.isAlive = player.isAlive;
        existingPlayer.side = player.side;
        existingPlayer.name = player.name;

        if (existingPlayer.currentX === undefined) {
          existingPlayer.currentX = player.x;
          existingPlayer.currentY = player.y;
        }
      } else {
        playerStatesRef.current.set(playerId, {
          currentX: player.x,
          currentY: player.y,
          targetX: player.x,
          targetY: player.y,
          health: player.health,
          isAlive: player.isAlive,
          side: player.side,
          name: player.name,
        });
      }
    });

    let lastRoundNum = getCurrentRound()?.roundNum;

    const animate = () => {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, width, height);

      if (radarImage) {
        if (showHeatmap) {
          ctx.globalAlpha = 0.3;
        }
        ctx.drawImage(radarImage, 0, 0, width, height);
        ctx.globalAlpha = 1.0;
      }

      if (showHeatmap) {
        drawHeatmap(ctx, width, height);
      }

      playerStatesRef.current.forEach((playerState) => {
        if (!playerState.targetX || !playerState.targetY) return;

        const lerpSpeed = 0.3;
        playerState.currentX +=
          (playerState.targetX - playerState.currentX) * lerpSpeed;
        playerState.currentY +=
          (playerState.targetY - playerState.currentY) * lerpSpeed;

        const pos = gameToCanvas(
          playerState.currentX,
          playerState.currentY,
          width,
          height
        );

        const clampedPos = {
          x: Math.max(0, Math.min(width, pos.x)),
          y: Math.max(0, Math.min(height, pos.y)),
        };

        if (!playerState.isAlive) {
          ctx.font = "20px sans-serif";
          ctx.fillText("💀", clampedPos.x - 10, clampedPos.y + 8);
          ctx.fillStyle = "#999";
          ctx.font = "bold 10px sans-serif";
          ctx.fillText(playerState.name, clampedPos.x + 14, clampedPos.y + 4);
          return;
        }

        ctx.beginPath();
        ctx.arc(clampedPos.x, clampedPos.y, 10, 0, Math.PI * 2);
        ctx.fillStyle =
          playerState.side === "CT" ? TEAM_COLORS.CT_MAIN : TEAM_COLORS.T_MAIN;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(playerState.name, clampedPos.x + 14, clampedPos.y + 4);

        ctx.fillStyle = "#4ade80";
        ctx.font = "10px sans-serif";
        ctx.fillText(
          `${playerState.health}HP`,
          clampedPos.x + 14,
          clampedPos.y + 15
        );
      });

      const currentRound = getCurrentRound();
      if (
        currentRound &&
        currentRound.roundNum !== lastRoundNum &&
        setCurrentRoundContext
      ) {
        setCurrentRoundContext(currentRound.roundNum);
        lastRoundNum = currentRound.roundNum;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    matchData,
    currentTick,
    radarImage,
    tickIndex,
    showHeatmap,
    currentHeatmapData, // DEPENDENCY CHANGED: Triggers re-render when round changes
    getCurrentRound,
    setCurrentRoundContext,
  ]);

  useEffect(() => {
    if (!isPlaying || !matchData) return;

    const round = getCurrentRound();
    if (!round) return;

    const interval = setInterval(() => {
      setCurrentTick((prev) => {
        const next = prev + 1;
        if (next >= round.endTick + 100) {
          setCurrentTick(round.startTick);
          playerStatesRef.current.clear();
          return round.startTick;
        }
        return next;
      });
    }, 1000 / (64 * playbackSpeed));

    return () => clearInterval(interval);
  }, [isPlaying, matchData, playbackSpeed, getCurrentRound]);

  const handleRoundChange = (idx) => {
    setSelectedRound(idx);
    setCurrentTick(matchData.rounds[idx]?.startTick || 0);
    playerStatesRef.current.clear();
    if (setCurrentRoundContext && matchData.rounds[idx]) {
      setCurrentRoundContext(matchData.rounds[idx].roundNum);
    }
  };

  const handleSpeedChange = (e) => {
    setPlaybackSpeed(Number(e.target.value));
  };

  const handleTickChange = (e) => {
    setCurrentTick(Number(e.target.value));
  };

  const round = getCurrentRound();

  const teamA_Name = staticTeamMapping?.CT || "CT Team";
  const teamB_Name = staticTeamMapping?.T || "T Team";

  const scoreTeamA = round?.ctScore || 0;
  const scoreTeamB = round?.tScore || 0;

  const teamA_Color =
    teamMapping.CT === teamA_Name ? "text-blue-500" : "text-red-500";
  const teamB_Color =
    teamMapping.CT === teamB_Name ? "text-blue-500" : "text-red-500";

  // Get samples from current heatmap data for display
  const ctSamples = currentHeatmapData?.ct?.samples || 0;
  const tSamples = currentHeatmapData?.t?.samples || 0;

  if (!matchData) {
    return (
      <div className="w-full bg-gray-900 text-white rounded-lg overflow-hidden">
        <div className="flex items-center justify-center bg-gray-800 h-[600px]">
          <div className="text-center p-8">
            <AlertCircle size={64} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold mb-2">No Match Data</h3>
            <p className="text-gray-400">
              Use the upload button above to load a match
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-900 text-white rounded-lg shadow-xl overflow-hidden">
      <div className="flex flex-col">
        <div className="p-4 border-b border-gray-700 bg-gray-800">
          <h2 className="text-xl font-bold">CS2 Match Replay</h2>
          <p className="text-sm text-gray-400">
            {matchData.header?.mapName} - Tick Rate:{" "}
            {matchData.header?.tickRate}
          </p>
        </div>

        <div className="bg-gray-800 flex justify-center">
          <canvas
            ref={canvasRef}
            width={1024}
            height={1024}
            className="w-full max-w-4xl"
            style={{ maxHeight: "600px", objectFit: "contain" }}
          />
        </div>

        <div className="bg-gray-800 p-4 space-y-4 border-t border-gray-700">
          {/* 1. Enhanced Round Selector (Pill Selector) */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-gray-700/50 rounded-lg shadow-inner">
            <label className="text-sm font-semibold text-gray-300 mr-2 flex-shrink-0">
              Select Round:
            </label>
            <div className="flex flex-1 overflow-x-auto overflow-y-hidden p-1 space-x-2">
              {matchData.rounds?.map((r, idx) => {
                const isSelected = idx === selectedRound;
                const winnerColor =
                  r.winnerSide === "CT" ? "bg-blue-800" : "bg-red-800";

                return (
                  <button
                    key={idx}
                    onClick={() => handleRoundChange(idx)}
                    className={`
                      px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 flex-shrink-0
                      ${
                        isSelected
                          ? `${winnerColor} text-white ring-2 ring-offset-2 ring-offset-gray-800 ring-white/50`
                          : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                      }
                    `}
                  >
                    R {r.roundNum} ({r.winnerSide})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Playback Controls and Slider */}
          <div className="flex items-center gap-4 bg-gray-700 p-3 rounded-lg shadow-md flex-wrap">
            {/* Control Buttons */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setCurrentTick(round?.startTick || 0);
                  playerStatesRef.current.clear();
                }}
                className="p-2 bg-gray-600 rounded-lg hover:bg-gray-500 shadow-sm transition-colors"
              >
                <SkipBack size={18} />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                // Use darker blue for play button
                className="p-3 bg-blue-700 rounded-lg hover:bg-blue-800 shadow-lg transition-colors"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>

              <button
                onClick={() => {
                  setCurrentTick(round?.endTick || 0);
                }}
                className="p-2 bg-gray-600 rounded-lg hover:bg-gray-500 shadow-sm transition-colors"
                disabled={!round}
              >
                <SkipForward size={18} />
              </button>
            </div>

            {/* Tick Slider */}
            <div className="flex-1 min-w-[200px] space-y-1">
              <input
                type="range"
                min={round?.startTick || 0}
                max={round?.endTick || 1000}
                value={currentTick}
                onChange={handleTickChange}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer range-lg"
                style={{
                  "--tw-ring-color": TEAM_COLORS.CT_MAIN,
                }}
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Tick: {currentTick}</span>
                <span>End: {round?.endTick || 0}</span>
              </div>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <FastForward size={16} className="text-gray-400" />
              <select
                value={playbackSpeed}
                onChange={handleSpeedChange}
                className="px-3 py-2 bg-gray-600 rounded-lg text-sm font-medium border border-gray-500 hover:border-gray-400 transition-colors"
              >
                <option value="1">1x</option>
                <option value="2">2x</option>
                <option value="5">5x</option>
                <option value="10">10x</option>
              </select>
            </div>
          </div>

          {/* Match Score and Heatmap Info (Bottom Row) */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-700">
            {round && (
              <div className="text-lg font-bold">
                {/* Score display using muted colors */}
                <span className={teamA_Color}>
                  {teamA_Name}: {scoreTeamA}
                </span>
                {" - "}
                <span className={teamB_Color}>
                  {teamB_Name}: {scoreTeamB}
                </span>
              </div>
            )}

            {/* Heatmap Toggle and Info */}
            <div className="flex items-center gap-4 text-sm flex-wrap">
              {/* Heatmap Mode Selector - ALWAYS SHOW if any heatmap data exists */}
              {(allRoundHeatmapData || teamSideHeatmaps) && (
                <div className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded-lg border border-gray-600">
                  <label className="text-sm font-medium text-gray-300">
                    Heatmap Mode:
                  </label>
                  <select
                    value={heatmapMode}
                    onChange={(e) => setHeatmapMode(e.target.value)}
                    className="px-3 py-1.5 bg-gray-600 rounded text-sm font-medium border border-gray-500 hover:border-gray-400"
                    disabled={!allRoundHeatmapData || !teamSideHeatmaps}
                  >
                    <option value="per-round" disabled={!allRoundHeatmapData}>
                      Per Round
                    </option>
                    <option value="team-side" disabled={!teamSideHeatmaps}>
                      Team+Side (Aggregated)
                    </option>
                  </select>
                </div>
              )}

              {/* Team+Side Selector (only shown in team-side mode) */}
              {heatmapMode === "team-side" && teamSideOptions.length > 0 && (
                <div className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded-lg border border-gray-600">
                  <label className="text-sm font-medium text-gray-300">
                    Select Team:
                  </label>
                  <select
                    value={selectedTeamSide || ""}
                    onChange={(e) => setSelectedTeamSide(e.target.value)}
                    className="px-3 py-1.5 bg-gray-600 rounded text-sm font-medium border border-gray-500 hover:border-gray-400"
                  >
                    {teamSideOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  showHeatmap
                    ? "bg-green-700 hover:bg-green-800"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
                disabled={!allRoundHeatmapData && !teamSideHeatmaps}
              >
                {showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
              </button>

              {currentHeatmapData && showHeatmap && (
                <div className="text-sm text-gray-300 bg-gray-700 px-3 py-2 rounded-lg border border-gray-600">
                  {heatmapMode === "team-side" ? (
                    <span>
                      {selectedTeamSide?.replace(/_/g, " ")}:{" "}
                      <strong>{ctSamples + tSamples} samples</strong>
                    </span>
                  ) : (
                    <span>
                      Round {currentRoundNum}: CT (<strong>{ctSamples}</strong>)
                      | T (<strong>{tSamples}</strong>)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CS2MapRenderer;
