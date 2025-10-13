import React, { useState, useEffect, useRef, useMemo } from "react";
import { Play, Pause, SkipBack, SkipForward, Upload } from "lucide-react";

// Map coordinates
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
    maxX: 1713,
    minY: -3401,
    maxY: 1682,
    radarImage: "/radar_images/de_mirage_radar_psd.png",
  },
};

const CS2MapRenderer = () => {
  const [matchData, setMatchData] = useState(null);
  const [currentTick, setCurrentTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(10);
  const [selectedRound, setSelectedRound] = useState(0);
  const [radarImage, setRadarImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const playerStatesRef = useRef(new Map()); // Persistent player states

  // Index ticks by tick number for O(1) lookup
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

  // Load JSON from public folder
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
        setCurrentTick(data.rounds?.[0]?.startTick || 0);
        setIsLoading(false);

        // Load radar image
        const mapName = data.header?.mapName || "de_ancient";
        const mapConfig = MAP_CONFIG[mapName];

        if (mapConfig?.radarImage) {
          const img = new Image();
          img.onload = () => setRadarImage(img);
          img.onerror = () => console.error("Failed to load radar image");
          img.src = mapConfig.radarImage;
        }
      } catch (error) {
        console.error("Error loading match data:", error);
        setIsLoading(false);
      }
    };

    loadMatchData();
  }, []);

  // File upload handler
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsLoading(true);
      const text = await file.text();
      const data = JSON.parse(text);
      setMatchData(data);
      setCurrentTick(data.rounds?.[0]?.startTick || 0);
      setIsLoading(false);

      const mapName = data.header?.mapName || "de_ancient";
      const mapConfig = MAP_CONFIG[mapName];
      if (mapConfig?.radarImage) {
        const img = new Image();
        img.onload = () => setRadarImage(img);
        img.src = mapConfig.radarImage;
      }
    }
  };

  // Convert game coordinates to canvas coordinates
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

  // Get current round
  const getCurrentRound = () => {
    if (!matchData?.rounds) return null;
    return (
      matchData.rounds.find(
        (r) => currentTick >= r.startTick && currentTick <= r.endTick
      ) || matchData.rounds[selectedRound]
    );
  };

  // Render the map with persistent players and smooth movement
  useEffect(() => {
    if (!matchData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Get current tick data
    const tickData = tickIndex.get(currentTick) || [];

    // Update player states with new data from this tick
    tickData.forEach((player) => {
      const playerId = player.steamId || player.name;
      const existingPlayer = playerStatesRef.current.get(playerId);

      if (existingPlayer) {
        // Player exists - update with smooth transition
        existingPlayer.targetX = player.x;
        existingPlayer.targetY = player.y;
        existingPlayer.health = player.health;
        existingPlayer.isAlive = player.isAlive;
        existingPlayer.side = player.side;
        existingPlayer.name = player.name;

        // If no current position set, jump to target immediately
        if (existingPlayer.currentX === undefined) {
          existingPlayer.currentX = player.x;
          existingPlayer.currentY = player.y;
        }
      } else {
        // New player - add to states
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

    // Animation frame for smooth movement
    const animate = () => {
      // Clear canvas
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, width, height);

      // Draw radar image
      if (radarImage) {
        ctx.drawImage(radarImage, 0, 0, width, height);
      }

      // Draw all players with smooth interpolation
      playerStatesRef.current.forEach((playerState, playerId) => {
        // Skip if no valid position
        if (!playerState.targetX || !playerState.targetY) return;

        // Smoothly move current position towards target
        const lerpSpeed = 0.3; // Higher = faster movement, lower = smoother
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

        // Clamp position to map bounds instead of skipping
        const clampedPos = {
          x: Math.max(0, Math.min(width, pos.x)),
          y: Math.max(0, Math.min(height, pos.y)),
        };

        // If player is dead, show skull
        if (!playerState.isAlive) {
          ctx.font = "20px sans-serif";
          ctx.fillText("💀", clampedPos.x - 10, clampedPos.y + 8);

          ctx.fillStyle = "#999";
          ctx.font = "bold 10px sans-serif";
          ctx.fillText(playerState.name, clampedPos.x + 14, clampedPos.y + 4);
          return;
        }

        // Draw alive player circle
        ctx.beginPath();
        ctx.arc(clampedPos.x, clampedPos.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = playerState.side === "CT" ? "#3b82f6" : "#ef4444";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw player name
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(playerState.name, clampedPos.x + 14, clampedPos.y + 4);

        // Draw health
        ctx.fillStyle = "#4ade80";
        ctx.font = "10px sans-serif";
        ctx.fillText(
          `${playerState.health}HP`,
          clampedPos.x + 14,
          clampedPos.y + 15
        );
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [matchData, currentTick, radarImage, tickIndex]);

  // Playback animation - don't stop when round ends, let it continue
  useEffect(() => {
    if (!isPlaying || !matchData) return;

    const round = getCurrentRound();
    if (!round) return;

    const interval = setInterval(() => {
      setCurrentTick((prev) => {
        const next = prev + 1;
        // Keep playing even after round ends (for a few more ticks to show final deaths)
        if (next >= round.endTick + 100) {
          // Add buffer ticks after round end
          setIsPlaying(false);
          return round.endTick + 100;
        }
        return next;
      });
    }, 1000 / (64 * playbackSpeed));

    return () => clearInterval(interval);
  }, [isPlaying, matchData, playbackSpeed]);

  const round = getCurrentRound();

  if (isLoading) {
    return (
      <div className="w-full h-[600px] bg-gray-900 text-white flex items-center justify-center rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading match data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-900 text-white rounded-lg overflow-hidden">
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold">CS2 Match Replay</h2>
            {matchData && (
              <p className="text-sm text-gray-400">
                {matchData.header?.mapName} - Tick Rate:{" "}
                {matchData.header?.tickRate}
              </p>
            )}
          </div>

          <label className="px-4 py-2 bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700 flex items-center gap-2 text-sm">
            <Upload size={16} />
            Upload Match
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {matchData ? (
          <>
            {/* Canvas */}
            <div className="bg-gray-800">
              <canvas
                ref={canvasRef}
                width={1024}
                height={1024}
                className="w-full"
                style={{ maxHeight: "600px", objectFit: "contain" }}
              />
            </div>

            {/* Controls */}
            <div className="bg-gray-800 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentTick(round?.startTick || 0)}
                  className="p-2 bg-gray-700 rounded hover:bg-gray-600"
                >
                  <SkipBack size={18} />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>

                <button
                  onClick={() => setCurrentTick(round?.endTick || 0)}
                  className="p-2 bg-gray-700 rounded hover:bg-gray-600"
                >
                  <SkipForward size={18} />
                </button>

                <div className="flex-1">
                  <input
                    type="range"
                    min={round?.startTick || 0}
                    max={round?.endTick || 1000}
                    value={currentTick}
                    onChange={(e) => setCurrentTick(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Tick: {currentTick} / {round?.endTick || 0}
                  </div>
                </div>

                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="px-3 py-2 bg-gray-700 rounded text-sm"
                >
                  <option value="1">1x</option>
                  <option value="2">2x</option>
                  <option value="5">5x</option>
                  <option value="10">10x</option>
                </select>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm">Round:</label>
                  <select
                    value={selectedRound}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setSelectedRound(idx);
                      setCurrentTick(matchData.rounds[idx]?.startTick || 0);
                      playerStatesRef.current.clear(); // Clear on round change
                    }}
                    className="px-3 py-1 bg-gray-700 rounded text-sm"
                  >
                    {matchData.rounds?.map((r, idx) => (
                      <option key={idx} value={idx}>
                        Round {r.roundNum} ({r.winner})
                      </option>
                    ))}
                  </select>
                </div>

                {round && (
                  <div className="ml-auto text-sm">
                    <span className="text-blue-400">CT: {round.ctScore}</span>
                    {" - "}
                    <span className="text-red-400">T: {round.tScore}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center text-gray-400 h-[400px]">
            <div className="text-center">
              <Upload size={48} className="mx-auto mb-4" />
              <p>Failed to load match data</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CS2MapRenderer;
