import React, { useState, useEffect, useRef, useMemo } from "react";
import { Play, Pause, SkipBack, SkipForward, AlertCircle } from "lucide-react";

const MAP_CONFIG = {
  ar_baggage: {
    minX: -1316,
    maxX: -1316 + 1024 * 2.539062,
    minY: 1288 - 1024 * 2.539062,
    maxY: 1288,
    radarImage: "/radar_images/ar_baggage_radar_psd.png",
  },
  ar_shoots: {
    minX: -1368,
    maxX: -1368 + 1024 * 2.6875,
    minY: 1952 - 1024 * 2.6875,
    maxY: 1952,
    radarImage: "/radar_images/ar_shoots_radar_psd.png",
  },
  cs_italy: {
    minX: -2647,
    maxX: -2647 + 1024 * 4.6,
    minY: 2592 - 1024 * 4.6,
    maxY: 2592,
    radarImage: "/radar_images/cs_italy_radar_psd.png",
  },
  cs_office: {
    minX: -1838,
    maxX: -1838 + 1024 * 4.1,
    minY: 1858 - 1024 * 4.1,
    maxY: 1858,
    radarImage: "/radar_images/cs_office_radar_psd.png",
  },
  de_ancient: {
    minX: -2953,
    maxX: -2953 + 1024 * 5,
    minY: 2164 - 1024 * 5,
    maxY: 2164,
    radarImage: "/radar_images/de_ancient_radar_psd.png",
  },
  de_anubis: {
    minX: -2796,
    maxX: -2796 + 1024 * 5.22,
    minY: 3328 - 1024 * 5.22,
    maxY: 3328,
    radarImage: "/radar_images/de_anubis_radar_psd.png",
  },
  de_dust2: {
    minX: -2476,
    maxX: -2476 + 1024 * 4.4,
    minY: 3239 - 1024 * 4.4,
    maxY: 3239,
    radarImage: "/radar_images/de_dust2_radar_psd.png",
  },
  de_inferno: {
    minX: -2087,
    maxX: -2087 + 1024 * 4.9,
    minY: 3870 - 1024 * 4.9,
    maxY: 3870,
    radarImage: "/radar_images/de_inferno_radar_psd.png",
  },
  de_mirage: {
    minX: -3230,
    maxX: -3230 + 1024 * 5.0,
    minY: 1713 - 1024 * 5.0,
    maxY: 1713,
    radarImage: "/radar_images/de_mirage_radar_psd.png",
  },
  de_nuke: {
    minX: -3453,
    maxX: -3453 + 1024 * 7,
    minY: 2887 - 1024 * 7,
    maxY: 2887,
    radarImage: "/radar_images/de_nuke_radar_psd.png",
  },
  de_overpass: {
    minX: -4831,
    maxX: -4831 + 1024 * 5.2,
    minY: 1781 - 1024 * 5.2,
    maxY: 1781,
    radarImage: "/radar_images/de_overpass_radar_psd.png",
  },
  de_train: {
    minX: -2308,
    maxX: -2308 + 1024 * 4.082077,
    minY: 2078 - 1024 * 4.082077,
    maxY: 2078,
    radarImage: "/radar_images/de_train_radar_psd.png",
  },
  de_vertigo: {
    minX: -3168,
    maxX: -3168 + 1024 * 4.0,
    minY: 1762 - 1024 * 4.0,
    maxY: 1762,
    radarImage: "/radar_images/de_vertigo_radar_psd.png",
  },
};

const TEAM_COLORS = {
  CT_MAIN: "#2563eb",
  T_MAIN: "#dc2626",
};

const CS2MapRenderer = ({
  matchData: externalMatchData,
  heatmapData: externalHeatmapData,
  teamSideHeatmapData: externalTeamSideHeatmapData,
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
  const [heatmapMode, setHeatmapMode] = useState("per-round");
  const [currentTick, setCurrentTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(10);
  const [selectedRound, setSelectedRound] = useState(0);
  const [radarImage, setRadarImage] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.5);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const playerStatesRef = useRef(new Map());

  const currentRoundNum = matchData?.rounds?.[selectedRound]?.roundNum || 1;

  const teamSideOptions = useMemo(() => {
    if (!teamSideHeatmaps?.teamSideHeatmaps) return [];
    return Object.keys(teamSideHeatmaps.teamSideHeatmaps).map((key) => ({
      value: key,
      label: key.replace(/_as_/g, " as ").replace(/_/g, " "),
    }));
  }, [teamSideHeatmaps]);

  useEffect(() => {
    if (teamSideOptions.length > 0 && !selectedTeamSide) {
      setSelectedTeamSide(teamSideOptions[0].value);
    }
  }, [teamSideOptions, selectedTeamSide]);

  const currentHeatmapData = useMemo(() => {
    if (
      heatmapMode === "team-side" &&
      teamSideHeatmaps?.teamSideHeatmaps &&
      selectedTeamSide
    ) {
      const teamSideData = teamSideHeatmaps.teamSideHeatmaps[selectedTeamSide];
      if (teamSideData) {
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
        (r) => currentTick >= r.freezeTimeEndTick && currentTick <= r.endTick
      ) || matchData.rounds[selectedRound]
    );
  };

  useEffect(() => {
    if (externalMatchData) {
      setMatchData(externalMatchData);
      setCurrentTick(externalMatchData.rounds?.[0]?.freezeTimeEndTick || 0);
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

  const drawHeatmap = (ctx, width, height) => {
    if (!currentHeatmapData) return;

    const gridSize = allRoundHeatmapData?.gridSize || 50;
    const bounds = allRoundHeatmapData?.bounds;

    if (!bounds || !gridSize) return;

    const ct = currentHeatmapData.ct;
    const t = currentHeatmapData.t;

    const cellWidth = width / gridSize;
    const cellHeight = height / gridSize;

    const SHRINK_FACTOR = 0.95;
    const drawWidth = cellWidth * SHRINK_FACTOR;
    const drawHeight = cellHeight * SHRINK_FACTOR;
    const drawOffset = (cellWidth * (1 - SHRINK_FACTOR)) / 2;

    if (ct?.grid && ct.grid.length > 0) {
      for (let row = 0; row < ct.grid.length; row++) {
        for (let col = 0; col < ct.grid[row].length; col++) {
          const density = ct.grid[row][col];
          if (density > 0) {
            const alpha = Math.min(
              Math.pow(density, 0.7) * 0.8 + heatmapOpacity * 0.2,
              0.9
            );
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

    if (t?.grid && t.grid.length > 0) {
      for (let row = 0; row < t.grid.length; row++) {
        for (let col = 0; col < t.grid[row].length; col++) {
          const density = t.grid[row][col];
          if (density > 0) {
            const alpha = Math.min(
              Math.pow(density, 0.7) * 0.8 + heatmapOpacity * 0.2,
              0.9
            );
            ctx.fillStyle = `rgba(220, 38, 38, ${alpha})`;

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
      ctx.clearRect(0, 0, width, height);

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
    currentHeatmapData,
    heatmapOpacity,
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
          setCurrentTick(round.freezeTimeEndTick);
          playerStatesRef.current.clear();
          return round.freezeTimeEndTick;
        }
        return next;
      });
    }, 1000 / (64 * playbackSpeed));

    return () => clearInterval(interval);
  }, [isPlaying, matchData, playbackSpeed, getCurrentRound]);

  const handleRoundChange = (idx) => {
    setSelectedRound(idx);
    setCurrentTick(matchData.rounds[idx]?.freezeTimeEndTick || 0);
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

  const currentRound = matchData?.rounds?.[selectedRound];
  const isFirstHalf = currentRound?.roundNum < 13;

  let currentTeamA_IsCT, currentTeamB_IsCT;

  if (teamMapping?.CT || teamMapping?.T) {
    currentTeamA_IsCT = teamMapping?.CT === teamA_Name;
    currentTeamB_IsCT = teamMapping?.CT === teamB_Name;
  } else {
    currentTeamA_IsCT = isFirstHalf;
    currentTeamB_IsCT = !isFirstHalf;
  }

  let scoreTeamA = 0;
  let scoreTeamB = 0;

  if (matchData?.rounds && selectedRound >= 0) {
    for (let i = 0; i <= selectedRound; i++) {
      const r = matchData.rounds[i];
      if (!r) continue;

      const roundNum = r.roundNum;
      const teamA_WasCT = roundNum < 13;

      if (r.winnerSide === "CT") {
        if (teamA_WasCT) scoreTeamA++;
        else scoreTeamB++;
      } else if (r.winnerSide === "T") {
        if (teamA_WasCT) scoreTeamB++;
        else scoreTeamA++;
      }
    }
  }

  const teamA_Color = currentTeamA_IsCT ? "#60a5fa" : "#f87171";
  const teamB_Color = currentTeamB_IsCT ? "#60a5fa" : "#f87171";

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
    <div className="w-full h-full bg-gray-900 text-white rounded-lg shadow-xl overflow-hidden flex flex-col">
      <div className="flex flex-col h-full">
        {/* Compact Header with Score */}
        <div className="p-3 border-b border-gray-700 bg-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{matchData.header?.mapName}</h2>
              <p className="text-xs text-gray-400">
                Tick Rate: {matchData.header?.tickRate}
              </p>
            </div>
            {round && (
              <div className="text-sm font-bold">
                <span style={{ color: teamA_Color }}>
                  {teamA_Name}: {scoreTeamA}
                </span>
                <span className="text-gray-400"> - </span>
                <span style={{ color: teamB_Color }}>
                  {teamB_Name}: {scoreTeamB}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Canvas - takes remaining space */}
        <div className="bg-gray-800 flex justify-center items-center flex-1 min-h-0">
          <canvas
            ref={canvasRef}
            width={1024}
            height={1024}
            className="w-full h-full"
            style={{ maxHeight: "500px", objectFit: "contain" }}
          />
        </div>

        {/* Compact Controls */}
        <div className="bg-gray-800 p-3 space-y-3 border-t border-gray-700 flex-shrink-0">
          {/* Round Selector - Two Lines (First Half / Second Half) */}
          <div className="bg-gray-700/30 rounded-lg p-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Round:</span>
                <span className="text-sm font-bold text-white">
                  {currentRoundNum} / {matchData.rounds?.length || 0}
                </span>
              </div>
              {round && (
                <span className="text-xs text-gray-400">
                  {round.winnerSide} Win
                </span>
              )}
            </div>

            {/* First Half */}
            <div className="mb-2">
              <div className="text-xs text-gray-500 mb-1 px-1">1st Half</div>
              <div className="flex gap-1.5 flex-wrap">
                {matchData.rounds
                  ?.filter((r) => r.roundNum < 13)
                  .map((r, idx) => {
                    const isSelected = idx === selectedRound;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleRoundChange(idx)}
                        className={`
                        flex-shrink-0 w-10 h-10 flex items-center justify-center text-sm font-bold rounded transition-all
                        ${
                          isSelected
                            ? "bg-blue-600 text-white scale-110 shadow-lg"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white hover:scale-105"
                        }
                      `}
                        title={`Round ${r.roundNum} - ${r.winnerSide} Win (${r.ctScore}-${r.tScore})`}
                      >
                        {r.roundNum}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Second Half */}
            {matchData.rounds?.some((r) => r.roundNum >= 13) && (
              <div>
                <div className="text-xs text-gray-500 mb-1 px-1">2nd Half</div>
                <div className="flex gap-1.5 flex-wrap">
                  {matchData.rounds
                    ?.filter((r) => r.roundNum >= 13)
                    .map((r) => {
                      const idx = matchData.rounds.findIndex(
                        (round) => round.roundNum === r.roundNum
                      );
                      const isSelected = idx === selectedRound;

                      return (
                        <button
                          key={idx}
                          onClick={() => handleRoundChange(idx)}
                          className={`
                          flex-shrink-0 w-10 h-10 flex items-center justify-center text-sm font-bold rounded transition-all
                          ${
                            isSelected
                              ? "bg-blue-600 text-white scale-110 shadow-lg"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white hover:scale-105"
                          }
                        `}
                          title={`Round ${r.roundNum} - ${r.winnerSide} Win (${r.ctScore}-${r.tScore})`}
                        >
                          {r.roundNum}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-2 bg-gray-700/30 p-2 rounded-lg">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-all"
            >
              {isPlaying ? (
                <Pause size={20} />
              ) : (
                <Play size={20} className="ml-0.5" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <input
                type="range"
                min={round?.freezeTimeEndTick || 0}
                max={round?.endTick || 1000}
                value={currentTick}
                onChange={handleTickChange}
                className="w-full h-2 bg-gray-600/50 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>

            <select
              value={playbackSpeed}
              onChange={handleSpeedChange}
              className="px-3 py-2 rounded-lg text-sm text-gray-200 bg-gray-600 transition-all cursor-pointer border-0 outline-none"
            >
              <option value="1">1x</option>
              <option value="2">2x</option>
              <option value="5">5x</option>
              <option value="10">10x</option>
            </select>
          </div>

          {/* Heatmap Controls - Horizontal Layout */}
          {(allRoundHeatmapData || teamSideHeatmaps) && (
            <div className="flex items-center gap-2 bg-gray-700/30 p-2 rounded-lg flex-wrap">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  showHeatmap
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-gray-600 hover:bg-gray-500 text-gray-300"
                }`}
              >
                {showHeatmap ? "Hide" : "Show"} Heatmap
              </button>

              {showHeatmap && (
                <>
                  <select
                    value={heatmapMode}
                    onChange={(e) => setHeatmapMode(e.target.value)}
                    className="px-3 py-2 bg-gray-700/80 rounded-lg text-sm text-gray-200 hover:bg-gray-600 transition-all cursor-pointer border-0 outline-none"
                    disabled={!allRoundHeatmapData || !teamSideHeatmaps}
                  >
                    <option value="per-round" disabled={!allRoundHeatmapData}>
                      Per Round
                    </option>
                    <option value="team-side" disabled={!teamSideHeatmaps}>
                      Team+Side
                    </option>
                  </select>

                  {heatmapMode === "team-side" &&
                    teamSideOptions.length > 0 && (
                      <select
                        value={selectedTeamSide || ""}
                        onChange={(e) => setSelectedTeamSide(e.target.value)}
                        className="px-3 py-2 bg-gray-700/80 rounded-lg text-sm text-gray-200 hover:bg-gray-600 transition-all cursor-pointer border-0 outline-none"
                      >
                        {teamSideOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}

                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-gray-400">Opacity:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={heatmapOpacity * 100}
                      onChange={(e) =>
                        setHeatmapOpacity(parseInt(e.target.value) / 100)
                      }
                      className="w-24 h-2 bg-gray-600/50 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <span className="text-xs text-gray-300 min-w-[3ch]">
                      {Math.round(heatmapOpacity * 100)}%
                    </span>
                  </div>

                  {currentHeatmapData && (
                    <span className="text-xs text-gray-400 ml-2">
                      {heatmapMode === "team-side"
                        ? `${ctSamples + tSamples} samples`
                        : `CT: ${ctSamples} | T: ${tSamples}`}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CS2MapRenderer;
