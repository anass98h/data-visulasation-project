"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { TrendingUp, Target, Clock, Upload, DollarSign } from "lucide-react";
import CS2MapRenderer from "./CS2MapRenderer";
import { EconomyPerformanceView } from "@/components/distribution/EconomyPerformanceView";
import { DemoSelector } from "@/components/DemoSelector";

// Clustering imports
import Controls from "@/components/clustering/Controls";
import DimensionScatter from "@/components/clustering/DimensionScatter";
import ClusteringMapPreview from "@/components/clustering/ClusteringMapPreview";
import { DEFAULT_TIMEPOINTS } from "@/config/clustering.config";
import { extractSnapshots } from "@/lib/clustering/extractSnapshots";
import { buildFeatureMatrixWithRegions } from "@/lib/clustering/features_plus";
import { createDimensionWorker } from "@/lib/clustering/dimensionWorkerClient";
import { runUMAP } from "@/lib/clustering/umapClient";
import {
  computeRepresentatives,
  predictMostLikelySetup,
} from "@/lib/clustering/representatives";
import {
  suggestTSNEParams,
  suggestUMAPParams,
  suggestKMeansK,
  suggestDBSCANParams,
  suggestReductionMethod,
  suggestClusteringMethod,
} from "@/lib/clustering/autoTune";

const API_URL = "http://localhost:8000";

const CS2Dashboard = () => {
  const [matchData, setMatchData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [teamSideHeatmapData, setTeamSideHeatmapData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRoundContext, setCurrentRoundContext] = useState(1);

  // New states for demo selector and WASM parsing
  const [selectedDemoId, setSelectedDemoId] = useState("");
  const [wasmReady, setWasmReady] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const workerRef = useRef(null);
  const fileNameRef = useRef(""); // Add ref to avoid closure issues

  const [staticTeamMapping, setStaticTeamMapping] = useState({
    CT: "TeamA",
    T: "TeamB",
  });
  const [teamMapping, setTeamMapping] = useState(staticTeamMapping);

  // Clustering states
  const [selectedTeamName, setSelectedTeamName] = useState(null);
  const [selectedSide, setSelectedSide] = useState("CT");
  const [timepoints, setTimepoints] = useState([...DEFAULT_TIMEPOINTS]);
  const [economyWeight, setEconomyWeight] = useState(0.5);
  const [includeEconomy, setIncludeEconomy] = useState(true);
  const [normalizePositions, setNormalizePositions] = useState(true);
  const [relativePositions, setRelativePositions] = useState(false);
  const [clusterMethod, setClusterMethod] = useState("kmeans");
  const [k, setK] = useState(5);
  const [eps, setEps] = useState(0.8);
  const [minPts, setMinPts] = useState(6);
  const [economyBucket, setEconomyBucket] = useState("none");
  const [reductionMethod, setReductionMethod] = useState("tsne");
  const [perplexity, setPerplexity] = useState(10);
  const [iterations, setIterations] = useState(1500);
  const [learningRate, setLearningRate] = useState(200);
  const [nNeighbors, setNNeighbors] = useState(15);
  const [minDist, setMinDist] = useState(0.1);
  const [nEpochs, setNEpochs] = useState(400);
  const [points, setPoints] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [representative, setRepresentative] = useState(undefined);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const clusterWorkerRef = useRef(null);
  const labelsRef = useRef(null);
  const rowsRef = useRef(null);
  const snapshotsRef = useRef(null);
  const [previewTimepoint, setPreviewTimepoint] = useState(null);

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
    const isSecondHalf = roundNum >= 13;

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

  // Clustering logic
  const roundTeamAssignments = useMemo(() => {
    if (!matchData?.rounds || !initialTeamMapping.CT || !initialTeamMapping.T)
      return {};
    const roundsPerHalf = matchData?.header?.roundsPerHalf ?? 12;
    const assignments = {};

    matchData.rounds.forEach((round) => {
      const halfIndex = Math.floor((round.roundNum - 1) / roundsPerHalf);
      const swapped = halfIndex % 2 === 1;
      assignments[round.roundNum] = swapped
        ? { CT: initialTeamMapping.T, T: initialTeamMapping.CT }
        : { CT: initialTeamMapping.CT, T: initialTeamMapping.T };
    });

    return assignments;
  }, [matchData, initialTeamMapping]);

  const getTeamNameForRound = (roundNum, side) => {
    const assignment = roundTeamAssignments[roundNum];
    if (!assignment) return null;
    return assignment[side] || null;
  };

  const mapName = useMemo(() => {
    return matchData?.header?.mapName || "de_ancient";
  }, [matchData]);

  // Initialize selected team when teamMapping is available
  useEffect(() => {
    if (initialTeamMapping.CT && !selectedTeamName) {
      setSelectedTeamName(initialTeamMapping.CT);
    }
  }, [initialTeamMapping, selectedTeamName]);

  const handleAutoTune = () => {
    console.log("🔧 handleAutoTune CALLED!", {
      matchData: !!matchData,
      selectedTeamName,
      selectedSide,
    });
    if (!matchData) {
      setLogs((prev) => [
        ...prev,
        "No data loaded - cannot auto-tune parameters",
      ]);
      return;
    }

    setLogs([]);
    setLogs((prev) => [...prev, "🔮 Auto-tuning parameters..."]);

    const allSnaps = extractSnapshots(matchData, {
      timepoints: [...timepoints],
    });
    const snaps = selectedTeamName
      ? allSnaps.filter((snap) => {
          const teamNameInRound = getTeamNameForRound(snap.roundNum, snap.team);
          return (
            teamNameInRound === selectedTeamName && snap.team === selectedSide
          );
        })
      : allSnaps.filter((snap) => snap.team === selectedSide);
    const { matrix } = buildFeatureMatrixWithRegions(
      snaps,
      [...timepoints],
      {
        economyWeight,
        impute: true,
        includeEconomy,
        normalizePositions,
        relativePositions,
      },
      selectedSide
    );

    const dataChar = {
      nSamples: matrix.length,
      nFeatures: matrix[0]?.length || 0,
    };

    setLogs((prev) => [
      ...prev,
      `Dataset: ${dataChar.nSamples} samples, ${dataChar.nFeatures} features`,
    ]);

    // Keep current reduction method, only optimize its parameters
    setLogs((prev) => [
      ...prev,
      `Using current method: ${reductionMethod.toUpperCase()}`,
    ]);

    // Suggest reduction params based on current method
    if (reductionMethod === "tsne") {
      const tsneParams = suggestTSNEParams(dataChar);
      setPerplexity(tsneParams.perplexity);
      setLearningRate(tsneParams.learningRate);
      setIterations(tsneParams.iterations);
      setLogs((prev) => [
        ...prev,
        `✓ t-SNE: perplexity=${tsneParams.perplexity}, lr=${tsneParams.learningRate}, iter=${tsneParams.iterations}`,
      ]);
    } else {
      const umapParams = suggestUMAPParams(dataChar);
      setNNeighbors(umapParams.nNeighbors);
      setMinDist(umapParams.minDist);
      setNEpochs(umapParams.nEpochs);
      setLogs((prev) => [
        ...prev,
        `✓ UMAP: neighbors=${umapParams.nNeighbors}, minDist=${umapParams.minDist}, epochs=${umapParams.nEpochs}`,
      ]);
    }

    // Suggest clustering method
    const clusterSuggestion = suggestClusteringMethod(dataChar);
    setLogs((prev) => [
      ...prev,
      `✓ Clustering: ${clusterSuggestion.method} - ${clusterSuggestion.reason}`,
    ]);
    setClusterMethod(clusterSuggestion.method);

    // Suggest clustering params
    if (clusterSuggestion.method === "kmeans") {
      const kmeansParams = suggestKMeansK(dataChar);
      setK(kmeansParams.k);
      setLogs((prev) => [
        ...prev,
        `✓ K-means: k=${kmeansParams.k} (try range ${kmeansParams.suggestedRange.min}-${kmeansParams.suggestedRange.max})`,
      ]);
    } else {
      const dbscanParams = suggestDBSCANParams(dataChar);
      setEps(dbscanParams.eps);
      setMinPts(dbscanParams.minPts);
      setLogs((prev) => [
        ...prev,
        `✓ DBSCAN: eps=${dbscanParams.eps}, minPts=${dbscanParams.minPts}`,
      ]);
    }

    setLogs((prev) => [
      ...prev,
      "✅ Auto-tune complete! Click 'Run' to apply.",
    ]);
  };

  const handleRunClustering = async () => {
    if (!matchData) return;
    setRunning(true);
    setLogs([]);
    setLogs((prev) => [...prev, "Starting clustering analysis..."]);

    try {
      const allSnaps = extractSnapshots(matchData, {
        timepoints: [...timepoints],
      });
      const snaps = selectedTeamName
        ? allSnaps.filter((snap) => {
            const teamNameInRound = getTeamNameForRound(
              snap.roundNum,
              snap.team
            );
            return (
              teamNameInRound === selectedTeamName && snap.team === selectedSide
            );
          })
        : allSnaps.filter((snap) => snap.team === selectedSide);

      snapshotsRef.current = snaps;

      if (snaps.length === 0) {
        setLogs((prev) => [...prev, "No snapshots found for selected filters"]);
        setRunning(false);
        return;
      }

      setLogs((prev) => [...prev, `Extracted ${snaps.length} snapshots`]);

      const { matrix, rows } = buildFeatureMatrixWithRegions(
        snaps,
        [...timepoints],
        {
          economyWeight,
          impute: true,
          includeEconomy,
          normalizePositions,
          relativePositions,
        },
        selectedSide
      );
      rowsRef.current = rows;

      try {
        if (reductionMethod === "umap") {
          setLogs((prev) => [...prev, "Initializing UMAP..."]);
          const result = await runUMAP(
            matrix,
            {
              umap: { nNeighbors, minDist, nEpochs },
              cluster:
                clusterMethod === "kmeans"
                  ? { method: "kmeans", k, maxIter: 100, tries: 5 }
                  : { method: "dbscan", eps, minPts },
              standardize: true,
            },
            (msg) => {
              setLogs((prev) => [...prev, msg]);
            }
          );

          labelsRef.current = result.labels || null;
          const tp0 = [...timepoints].sort((a, b) => a - b)[0];
          const pts = result.embedding.map((p, i) => ({
            x: p[0],
            y: p[1],
            cluster: result.labels ? result.labels[i] : undefined,
            roundNum: rows[i]?.roundNum,
            team: rows[i]?.team,
            timepoint: tp0,
          }));
          setPoints(pts);
          setRunning(false);
        } else {
          if (clusterWorkerRef.current) {
            clusterWorkerRef.current.worker.terminate();
            clusterWorkerRef.current.revoke();
            clusterWorkerRef.current = null;
          }
          const handle = createDimensionWorker();
          clusterWorkerRef.current = handle;
          handle.worker.onmessage = (ev) => {
            const { type, message, embedding, labels, error } = ev.data || {};
            if (type === "log" && message) {
              setLogs((prev) => [...prev, String(message)]);
            } else if (type === "error") {
              setLogs((prev) => [...prev, `Error: ${error}`]);
              setRunning(false);
            } else if (type === "result") {
              labelsRef.current = labels || null;
              const tp0 = [...timepoints].sort((a, b) => a - b)[0];
              const pts = (embedding || []).map((p, i) => ({
                x: p[0],
                y: p[1],
                cluster: labels ? labels[i] : undefined,
                roundNum: rows[i]?.roundNum,
                team: rows[i]?.team,
                timepoint: tp0,
              }));
              setPoints(pts);
              setRunning(false);
            }
          };

          handle.worker.postMessage({
            type: "run",
            matrix,
            params: {
              standardize: true,
              reductionMethod: "tsne",
              tsne: { perplexity, learningRate, nIter: iterations },
              cluster:
                clusterMethod === "kmeans"
                  ? { method: "kmeans", k, maxIter: 100, tries: 5 }
                  : { method: "dbscan", eps, minPts },
            },
          });
        }
      } catch (err) {
        const errorMsg = err?.message || String(err);
        setLogs((prev) => [...prev, `Error: ${errorMsg}`]);
        if (errorMsg.includes("umap-js package is not installed")) {
          setLogs((prev) => [
            ...prev,
            "To use UMAP, run: cd frontend && npm install",
          ]);
        }
        setRunning(false);
      }
    } catch (err) {
      setLogs((prev) => [...prev, `Error: ${err?.message || String(err)}`]);
      setRunning(false);
    }
  };

  const handlePredict = () => {
    try {
      const labels = labelsRef.current;
      const rows = rowsRef.current;
      const snaps = snapshotsRef.current;
      const tp = previewTimepoint ?? [...timepoints].sort((a, b) => a - b)[0];
      const previewTeam = selectedSide;
      if (!labels || !rows || !snaps || tp == null) return;
      const econ = economyBucket === "none" ? undefined : economyBucket;
      const res = predictMostLikelySetup(snaps, rows, labels, {
        team: previewTeam,
        timepoint: tp,
        economyBucket: econ,
      });
      if (res) {
        setSelectedCluster(res.cluster);
        setRepresentative(res.representative);
      }
    } catch {}
  };

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
            staticTeamMapping={staticTeamMapping}
            teamMapping={teamMapping}
            setCurrentRoundContext={setCurrentRoundContext}
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

          {/* Economy & Performance View */}
          {matchData && initialTeamMapping.CT && initialTeamMapping.T && (
            <EconomyPerformanceView
              matchData={matchData}
              teamMapping={initialTeamMapping}
              teamNames={teamNames}
            />
          )}
        </div>

        {/* Clustering Analysis Section */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
          <h2 className="text-2xl font-bold mb-2 text-white">
            Clustering Analysis
          </h2>
          <p className="text-gray-400 mb-4 text-sm">
            Visualize CS2 round strategies using dimensionality reduction (t-SNE
            or UMAP) and clustering.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className="space-y-4">
              <Controls
                selectedTeamName={selectedTeamName}
                onTeamNameChange={setSelectedTeamName}
                selectedSide={selectedSide}
                onSideChange={setSelectedSide}
                teamMapping={initialTeamMapping}
                selectedTimepoints={timepoints}
                onToggleTimepoint={(tp) => {
                  setTimepoints((prev) =>
                    prev.includes(tp)
                      ? prev.filter((t) => t !== tp)
                      : [...prev, tp]
                  );
                }}
                economyWeight={economyWeight}
                onEconomyWeightChange={setEconomyWeight}
                includeEconomy={includeEconomy}
                onIncludeEconomyChange={setIncludeEconomy}
                normalizePositions={normalizePositions}
                onNormalizePositionsChange={setNormalizePositions}
                relativePositions={relativePositions}
                onRelativePositionsChange={setRelativePositions}
                reductionMethod={reductionMethod}
                onReductionMethodChange={setReductionMethod}
                perplexity={perplexity}
                onPerplexityChange={setPerplexity}
                learningRate={learningRate}
                onLearningRateChange={setLearningRate}
                iterations={iterations}
                onIterationsChange={setIterations}
                nNeighbors={nNeighbors}
                onNNeighborsChange={setNNeighbors}
                minDist={minDist}
                onMinDistChange={setMinDist}
                nEpochs={nEpochs}
                onNEpochsChange={setNEpochs}
                clusterMethod={clusterMethod}
                onClusterMethodChange={setClusterMethod}
                k={k}
                onKChange={setK}
                eps={eps}
                onEpsChange={setEps}
                minPts={minPts}
                onMinPtsChange={setMinPts}
                economyBucket={economyBucket}
                onEconomyBucketChange={setEconomyBucket}
                onRun={handleRunClustering}
                onPredict={handlePredict}
                onAutoTune={handleAutoTune}
                disabled={isLoading || running}
              />

              {/* Logs below Controls in same column */}
              {logs.length > 0 && (
                <div className="border border-gray-700 rounded p-3 text-xs max-h-48 overflow-auto">
                  {running && (
                    <div className="mb-1 text-gray-400">Running…</div>
                  )}
                  {logs.map((l, idx) => (
                    <div key={idx} className="text-gray-300">
                      {l}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="lg:col-span-2">
              <div className="mb-6">
                <DimensionScatter
                  points={points}
                  selectedCluster={selectedCluster}
                  reductionMethod={reductionMethod}
                  onSelectCluster={(cid) => {
                    setSelectedCluster(cid);
                    try {
                      if (cid == null || cid < 0) {
                        setRepresentative(undefined);
                        return;
                      }
                      const labels = labelsRef.current;
                      const rows = rowsRef.current;
                      const snaps = snapshotsRef.current;
                      const tp =
                        previewTimepoint ??
                        [...timepoints].sort((a, b) => a - b)[0];
                      const previewTeam = selectedSide;
                      if (!labels || !rows || !snaps || tp == null) {
                        setRepresentative(undefined);
                        return;
                      }
                      const reps = computeRepresentatives(snaps, rows, labels, {
                        team: previewTeam,
                        timepoint: tp,
                      });
                      setRepresentative(reps.get(cid));
                    } catch {
                      setRepresentative(undefined);
                    }
                  }}
                />
              </div>
              <div>
                <ClusteringMapPreview
                  mapName={mapName}
                  team={selectedSide}
                  representative={representative}
                />
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-300">
                  <span>Preview timepoint:</span>
                  <div className="flex flex-wrap gap-2">
                    {[...timepoints]
                      .sort((a, b) => a - b)
                      .map((tp) => (
                        <button
                          key={tp}
                          onClick={() => {
                            setPreviewTimepoint(tp);
                            const cid = selectedCluster;
                            try {
                              if (cid == null || cid < 0) return;
                              const labels = labelsRef.current;
                              const rows = rowsRef.current;
                              const snaps = snapshotsRef.current;
                              const previewTeam = selectedSide;
                              if (!labels || !rows || !snaps) return;
                              const reps = computeRepresentatives(
                                snaps,
                                rows,
                                labels,
                                { team: previewTeam, timepoint: tp }
                              );
                              setRepresentative(reps.get(cid));
                            } catch {}
                          }}
                          className={`px-2 py-1 rounded border ${
                            tp === previewTimepoint
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300"
                          }`}
                        >
                          {tp}s
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CS2Dashboard;
