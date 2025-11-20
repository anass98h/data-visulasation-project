"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { TrendingUp, Target, Clock, Upload, DollarSign } from "lucide-react";
import CS2MapRenderer from "./CS2MapRenderer";
import LineChart from "@/components/distribution/lineChart";
import Economy from "@/components/distribution/economy";
import { DemoSelector } from "@/components/DemoSelector";
import * as distributionHelpers from "@/lib/distribution";

const API_URL = "http://localhost:8000";

const CS2Dashboard = () => {
  const [matchData, setMatchData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [teamSideHeatmapData, setTeamSideHeatmapData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [matchSelection, setMatchSelection] = useState("match1");
  const [economyData, setEconomyData] = useState({});
  const [lineChartData, setLineChartData] = useState([]);
  const [currentRoundContext, setCurrentRoundContext] = useState(1);

  // New states for demo selector and WASM parsing
  const [selectedDemoId, setSelectedDemoId] = useState("");
  const [wasmReady, setWasmReady] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const workerRef = useRef(null);
  const fileNameRef = useRef(""); // Add ref to avoid closure issues

  const initialTeamMapping = useMemo(() => {
    const teams = { CT: null, T: null };
    if (!matchData?.ticks) return teams;

    for (const tick of matchData.ticks) {
      if (tick.side === "CT" && !teams.CT) {
        teams.CT = tick.team;
      }
      if (tick.side === "T" && !teams.T) {
        teams.T = tick.team;
      }
      if (teams.CT && teams.T) break;
    }

    return teams;
  }, [matchData]);

  // Initialize WASM worker
  useEffect(() => {
    const createWorkerCode = () => {
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      return `
        let wasmReady = false;

        const loadWasm = async () => {
          try {
            importScripts('${baseUrl}/wasm_exec.js');
            const go = new Go();
            const result = await WebAssembly.instantiateStreaming(
              fetch('${baseUrl}/demo_processor.wasm'),
              go.importObject
            );
            go.run(result.instance);
            wasmReady = true;
            self.postMessage({ type: 'ready' });
          } catch (err) {
            self.postMessage({ type: 'wasm-error', error: err.message });
          }
        };

        loadWasm();

        self.onmessage = async (e) => {
          const { type, buffer, options, fileName } = e.data;
          if (type === 'parse') {
            if (!wasmReady) {
              self.postMessage({ type: 'error', error: 'WASM not ready yet' });
              return;
            }
            try {
              const uint8Array = new Uint8Array(buffer);
              parseDemo(uint8Array, (result) => {
                try {
                  const data = JSON.parse(result);
                  if ('error' in data) {
                    self.postMessage({ type: 'error', error: data.error });
                  } else {
                    self.postMessage({ type: 'result', data: data, fileName: fileName });
                  }
                } catch (err) {
                  self.postMessage({ type: 'error', error: err.message });
                }
              }, options);
            } catch (err) {
              self.postMessage({ type: 'error', error: err.message });
            }
          }
        };
      `;
    };

    const workerCode = createWorkerCode();
    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const wasmWorker = new Worker(workerUrl);

    wasmWorker.onmessage = async (e) => {
      const { type, data, error, fileName: workerFileName } = e.data;

      if (type === "ready") {
        setWasmReady(true);
      } else if (type === "result") {
        try {
          // Use workerFileName if available, otherwise fall back to ref
          const demoFileName =
            workerFileName || fileNameRef.current || "Unknown Demo";
          console.log("Using demo name:", demoFileName);

          const metadata = {
            map_name: data.header?.mapName || "Unknown",
            date: new Date().toISOString(),
            demo_name: demoFileName,
            player_count: data.players?.length || 0,
            round_count: data.rounds?.length || 0,
          };

          const response = await fetch(`${API_URL}/demo/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ metadata, data }),
          });

          if (response.ok) {
            const result = await response.json();
            setSelectedDemoId(result.demo_id);
          }
        } catch (err) {
          console.error("Error saving demo:", err);
        }
        setParsing(false);
      } else if (type === "error") {
        console.error("Parse error:", error);
        setParsing(false);
      }
    };

    workerRef.current = wasmWorker;
    return () => {
      wasmWorker.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, []);

  // Load demo from backend when selected
  useEffect(() => {
    if (!selectedDemoId) return;

    const loadDemo = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/demo/${selectedDemoId}`);
        if (response.ok) {
          const result = await response.json();
          setMatchData(result.data);
          setCurrentRoundContext(result.data.rounds?.[0]?.roundNum || 1);
        }
      } catch (error) {
        console.error("Error loading demo:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDemo();
  }, [selectedDemoId]);

  // Load match data and heatmap from public folder (keep existing logic)
  useEffect(() => {
    if (selectedDemoId) return; // Skip if using backend demo

    const loadMatchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/match_data.json");
        if (!response.ok) {
          setIsLoading(false);
          setMatchData(null);
          return;
        }
        const data = await response.json();
        setMatchData(data);
        setCurrentRoundContext(data.rounds?.[0]?.roundNum || 1);
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        setMatchData(null);
      }
    };

    const loadHeatmapData = async () => {
      try {
        const response = await fetch("/heatmap_data.json");
        if (response.ok) {
          const data = await response.json();
          setHeatmapData(data);
        }
      } catch (error) {
        console.log("Error loading heatmap data");
      }
    };

    const loadTeamSideHeatmapData = async () => {
      try {
        const response = await fetch("/heatmaps_by_team_side.json");
        if (response.ok) {
          const data = await response.json();
          setTeamSideHeatmapData(data);
        }
      } catch (error) {
        console.log("Error loading team+side heatmap data");
      }
    };

    loadMatchData();
    loadHeatmapData();
    loadTeamSideHeatmapData();
  }, [selectedDemoId]);

  // Calculate economy data when match data changes
  useEffect(() => {
    if (matchData && initialTeamMapping.CT && initialTeamMapping.T) {
      try {
        const teamNamesForCalc = {
          1: initialTeamMapping.CT,
          2: initialTeamMapping.T,
        };
        const calculatedEconomy = distributionHelpers.calculateEconomy(
          [matchData],
          teamNamesForCalc
        );
        setEconomyData(calculatedEconomy);
      } catch (error) {
        console.error("Error calculating economy:", error);
      }
    }
  }, [matchData, initialTeamMapping]);

  // Extract line chart data
  useEffect(() => {
    if (!economyData.teams || !economyData.teams[1] || !economyData.teams[2]) {
      setLineChartData([]);
      return;
    }
    const result = distributionHelpers.extractXYForBothTeams(
      economyData,
      "economy"
    );
    setLineChartData(result);
  }, [economyData]);

  // Modified file upload handler
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.name.endsWith(".dem")) {
      if (!workerRef.current || !wasmReady) {
        alert("WASM parser not ready yet");
        return;
      }

      console.log("Uploading and parsing demo file:", file.name);
      setFileName(file.name);
      fileNameRef.current = file.name; // Also update the ref
      setParsing(true);

      try {
        const buffer = await file.arrayBuffer();
        workerRef.current.postMessage({
          type: "parse",
          buffer: buffer,
          options: { tickInterval: 10, removeZ: true },
          fileName: file.name, // <-- Pass filename with the message
        });
      } catch (error) {
        console.error("Error reading file:", error);
        setParsing(false);
      }
    } else if (file.name.endsWith(".json")) {
      setIsLoading(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        setMatchData(data);
        setCurrentRoundContext(data.rounds?.[0]?.roundNum || 1);
        setIsLoading(false);
      } catch (error) {
        console.error("Error parsing JSON file:", error);
        setIsLoading(false);
      }
    }
  };

  // ... rest of your existing code (getCurrentTeamsForRound, stats calculation, etc.)
  const getCurrentTeamsForRound = (roundNum) => {
    const initialMap = initialTeamMapping;
    const isSecondHalf = roundNum > 15;

    if (isSecondHalf) {
      return {
        CT: initialMap.T,
        T: initialMap.CT,
        isSwapped: true,
      };
    } else {
      return {
        CT: initialMap.CT,
        T: initialMap.T,
        isSwapped: false,
      };
    }
  };

  const dynamicTeamMapping = getCurrentTeamsForRound(currentRoundContext);

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

  const maxRoundDuration = useMemo(() => {
    if (!matchData?.rounds || matchData.rounds.length === 0) return 1;
    return Math.max(...matchData.rounds.map((r) => r.endTick - r.startTick));
  }, [matchData]);

  const teamNames = useMemo(() => {
    if (!initialTeamMapping.CT || !initialTeamMapping.T) return {};
    return {
      1: initialTeamMapping.CT,
      2: initialTeamMapping.T,
    };
  }, [initialTeamMapping]);

  const finalRound = matchData?.rounds?.[matchData.rounds.length - 1];
  const finalScoreCT = finalRound?.ctScore || 0;
  const finalScoreT = finalRound?.tScore || 0;

  const overallWinnerName = useMemo(() => {
    if (!initialTeamMapping.CT || !initialTeamMapping.T) return "N/A";

    if (finalScoreCT > finalScoreT) {
      return initialTeamMapping.CT;
    } else if (finalScoreT > finalScoreCT) {
      return initialTeamMapping.T;
    }
    return "Draw";
  }, [finalScoreCT, finalScoreT, initialTeamMapping]);

  if (isLoading || parsing) {
    return (
      <div className="w-full min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>{parsing ? "Parsing demo file..." : "Loading match data..."}</p>
        </div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="w-full min-h-screen bg-gray-900 text-white p-4">
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold">CS2 Match Analysis</h1>
                <p className="text-gray-400">
                  Upload a demo file (.dem) or select existing match
                </p>
              </div>
              <label className="px-6 py-3 bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700 flex items-center gap-2">
                <Upload size={20} />
                Upload Demo
                <input
                  type="file"
                  accept=".json,.dem"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Add Demo Selector */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Or select existing demo:
              </label>
              <DemoSelector
                onDemoSelect={setSelectedDemoId}
                selectedDemoId={selectedDemoId}
              />
            </div>
          </div>

          <CS2MapRenderer
            matchData={null}
            heatmapData={null}
            teamSideHeatmapData={null}
            teamMapping={null}
            staticTeamMapping={null}
          />
        </div>
      </div>
    );
  }

  const teamDisplay =
    initialTeamMapping.CT && initialTeamMapping.T
      ? `${initialTeamMapping.CT} (Start CT) vs ${initialTeamMapping.T} (Start T)`
      : `${stats.mapName} Match`;

  const teamA_Name = initialTeamMapping.CT || "CT Team";
  const teamB_Name = initialTeamMapping.T || "T Team";
  const totalRoundsPlayed = matchData.rounds?.length || 0;

  return (
    <div className="w-full min-h-screen bg-gray-900 text-white p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
          {/* Title and Upload on same line */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold">CS2 Match Analysis</h1>
              <p className="text-gray-400 mt-1">
                {stats.totalRounds} rounds on {teamDisplay}
              </p>
            </div>
            <label className="px-6 py-3 bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700 flex items-center gap-2 shrink-0">
              <Upload size={20} />
              Upload Demo
              <input
                type="file"
                accept=".json,.dem"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Demo Selector and Stats Cards on same line */}
          <div className="flex gap-3 items-start">
            {/* Demo Selector - wider */}
            <div className="w-[450px] shrink-0">
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Switch demo:
              </label>
              <DemoSelector
                onDemoSelect={setSelectedDemoId}
                selectedDemoId={selectedDemoId}
              />
            </div>

            {/* Stats Cards - take remaining space */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="text-blue-400" size={24} />
                  <div>
                    <p className="text-gray-400 text-sm">Total Rounds</p>
                    <p className="text-2xl font-bold">{stats.totalRounds}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-red-400" size={24} />
                  <div>
                    <p className="text-gray-400 text-sm">Total Kills</p>
                    <p className="text-2xl font-bold">{stats.totalKills}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="text-green-400" size={24} />
                  <div>
                    <p className="text-gray-400 text-sm">Players</p>
                    <p className="text-2xl font-bold">{stats.totalPlayers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="text-purple-400" size={24} />
                  <div>
                    <p className="text-gray-400 text-sm">Total Ticks</p>
                    <p className="text-2xl font-bold">
                      {stats.totalTicks.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Rest of your dashboard... */}

        {/* Map Renderer and Economy side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Map Renderer with Heatmap */}
          <CS2MapRenderer
            matchData={matchData}
            heatmapData={heatmapData}
            teamSideHeatmapData={teamSideHeatmapData}
            teamMapping={dynamicTeamMapping}
            staticTeamMapping={initialTeamMapping}
            setCurrentRoundContext={setCurrentRoundContext}
          />

          {/* Economy Distribution Section */}
          {economyData.teams && (
            <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700 h-full flex flex-col">
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Economy Distribution
                  </h3>
                  {/* <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400">
                      Match:
                    </span>
                    <MatchDropdown
                      value={matchSelection}
                      onValueChange={setMatchSelection}
                    />
                  </div> */}
                </div>
                {/* Team Side Legend */}
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1 text-blue-400">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    {dynamicTeamMapping.CT || "CT"}
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    {dynamicTeamMapping.T || "T"}
                  </span>
                </div>
              </div>

              {/* Economy Cards */}
              <div className="mb-4">
                <Economy economyData={economyData} teamNames={teamNames} />
              </div>

              {/* Line Chart with Interactive Legend */}
              <div className="flex-1 min-h-0 overflow-auto">
                <LineChart seriesData={lineChartData} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CS2Dashboard;
