"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  TrendingUp,
  Target,
  Clock,
  Upload,
  DollarSign,
  HelpCircle,
} from "lucide-react";
import CS2MapRenderer from "./CS2MapRenderer";
import { EconomyPerformanceView } from "@/components/distribution/EconomyPerformanceView";
import { DemoSelector } from "@/components/DemoSelector";
import { MultiDemoSelector } from "@/components/clustering/MultiDemoSelector";

// Clustering imports
import Controls from "@/components/clustering/Controls";
import DimensionScatter from "@/components/clustering/DimensionScatter";
import ClusteringMapPreview from "@/components/clustering/ClusteringMapPreview";
import MultiMatchPlayerPerformance from "@/components/player/MultiMatchPlayerPerformance";
import { InfoTooltip } from "@/components/InfoTooltip";
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
  const [isLoading, setIsLoading] = useState(false);
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
  const [clusteringDemoIds, setClusteringDemoIds] = useState([]);
  const [matchDataList, setMatchDataList] = useState([]);
  const [loadingClusteringDemos, setLoadingClusteringDemos] = useState(false);
  const [demoNamesMap, setDemoNamesMap] = useState({});
  const [showQuickGuide, setShowQuickGuide] = useState(false);
  const [activeView, setActiveView] = useState("clustering");

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

  // Helper to get team mapping for a single match (for clustering)
  const getMatchTeamMapping = (match) => {
    const teams = { CT: null, T: null };
    if (!match?.ticks) return teams;

    for (const tick of match.ticks) {
      if (tick.side === "CT" && !teams.CT) {
        teams.CT = tick.team;
      }
      if (tick.side === "T" && !teams.T) {
        teams.T = tick.team;
      }
      if (teams.CT && teams.T) break;
    }
    return teams;
  };

  // Helper for case-insensitive string comparison
  const areTeamNamesEqual = (a, b) => {
    if (!a || !b) return a === b;
    return a.toLowerCase() === b.toLowerCase();
  };

  // Extract all unique team names from clustering matches
  const availableTeams = useMemo(() => {
    const teams = new Map(); // lowerCase -> displayCase
    matchDataList.forEach((match) => {
      const mapping = getMatchTeamMapping(match);
      if (mapping.CT) teams.set(mapping.CT.toLowerCase(), mapping.CT);
      if (mapping.T) teams.set(mapping.T.toLowerCase(), mapping.T);
    });
    return Array.from(teams.values());
  }, [matchDataList]);

  // Find common teams across all clustering matches
  const commonTeams = useMemo(() => {
    if (matchDataList.length === 0) return [];

    const firstMatch = matchDataList[0];
    const firstMapping = getMatchTeamMapping(firstMatch);
    let intersection = new Set();
    if (firstMapping.CT) intersection.add(firstMapping.CT.toLowerCase());
    if (firstMapping.T) intersection.add(firstMapping.T.toLowerCase());

    for (let i = 1; i < matchDataList.length; i++) {
      const match = matchDataList[i];
      const mapping = getMatchTeamMapping(match);
      const currentTeams = new Set();
      if (mapping.CT) currentTeams.add(mapping.CT.toLowerCase());
      if (mapping.T) currentTeams.add(mapping.T.toLowerCase());

      intersection = new Set(
        [...intersection].filter((x) => currentTeams.has(x))
      );
    }

    const displayNames = [];
    intersection.forEach((lowerName) => {
      const match = availableTeams.find((t) => t.toLowerCase() === lowerName);
      if (match) displayNames.push(match);
    });

    return displayNames;
  }, [matchDataList, availableTeams]);

  // Helper to get team name for a side in a specific round of a match
  const getTeamNameForRound = (match, roundNum, side) => {
    const mapping = getMatchTeamMapping(match);
    if (!match?.rounds || !mapping.CT || !mapping.T) return null;

    const roundsPerHalf = match?.header?.roundsPerHalf ?? 12;
    const halfIndex = Math.floor((roundNum - 1) / roundsPerHalf);
    const swapped = halfIndex % 2 === 1; // halves 2,4,... swap sides

    const assignment = swapped
      ? { CT: mapping.T, T: mapping.CT }
      : { CT: mapping.CT, T: mapping.T };

    return assignment[side] || null;
  };

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

  // Fetch clustering demos when selection changes
  useEffect(() => {
    if (clusteringDemoIds.length === 0) {
      setMatchDataList([]);
      setDemoNamesMap({});
      return;
    }

    const fetchClusteringDemos = async () => {
      setLoadingClusteringDemos(true);
      try {
        // First fetch demo metadata to get names
        const metadataResponse = await fetch(`${API_URL}/demos`);
        const metadataResult = await metadataResponse.json();
        const allDemos = metadataResult.demos || [];

        // Create mapping from demoId to demo name
        const namesMapping = {};
        clusteringDemoIds.forEach((id, index) => {
          const demo = allDemos.find((d) => d.demo_id === id);
          namesMapping[index] =
            demo?.demo_name || demo?.demo_id || `Demo${index}`;
        });
        setDemoNamesMap(namesMapping);

        // Then fetch the actual demo data
        const promises = clusteringDemoIds.map(async (id) => {
          const response = await fetch(`${API_URL}/demo/${id}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch demo ${id}`);
          }
          const result = await response.json();
          return result.data;
        });

        const results = await Promise.all(promises);
        setMatchDataList(results);
      } catch (err) {
        console.error("Error fetching clustering demos:", err);
        setMatchDataList([]);
        setDemoNamesMap({});
      } finally {
        setLoadingClusteringDemos(false);
      }
    };

    fetchClusteringDemos();
  }, [clusteringDemoIds]);

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

  const mapName = useMemo(() => {
    return matchData?.header?.mapName || "de_ancient";
  }, [matchData]);

  // Initialize selected team when availableTeams is available
  // Prefer common teams if available
  React.useEffect(() => {
    if (matchDataList.length > 0 && commonTeams.length > 0) {
      // Auto-select first common team if:
      // 1. No team is selected yet, OR
      // 2. Current selected team is not in common teams
      const isSelectedInCommon =
        selectedTeamName &&
        commonTeams.some((ct) => areTeamNamesEqual(ct, selectedTeamName));

      if (!selectedTeamName || !isSelectedInCommon) {
        console.log(`Auto-selecting common team: ${commonTeams[0]}`);
        setSelectedTeamName(commonTeams[0]);
      }
    } else if (
      matchDataList.length > 0 &&
      availableTeams.length > 0 &&
      !selectedTeamName
    ) {
      // Fallback to first available team if no common teams
      setSelectedTeamName(availableTeams[0]);
    }
  }, [matchDataList, commonTeams, availableTeams]);

  const handleAutoTune = async () => {
    console.log("🔧 handleAutoTune CALLED!", {
      matchDataList: matchDataList.length,
      selectedSide,
    });

    if (matchDataList.length === 0) {
      setLogs(["Please select at least one demo for auto-tuning"]);
      return;
    }

    setLogs([]);
    setLogs((prev) => [...prev, "🔮 Auto-tuning parameters..."]);

    try {
      // Extract and combine snapshots from all demos
      let allSnaps = [];
      let demoIndex = 0;
      for (const demoData of matchDataList) {
        const demoSnaps = extractSnapshots(demoData, {
          timepoints: [...timepoints],
        });

        // Filter by team and side - use same logic as handleRunClustering
        let filteredSnaps = demoSnaps.filter(
          (snap) => snap.team === selectedSide
        );

        if (selectedTeamName) {
          filteredSnaps = filteredSnaps.filter((snap) => {
            // Use getTeamNameForRound to account for side switching
            const teamNameInRound = getTeamNameForRound(
              demoData,
              snap.roundNum,
              snap.team
            );
            const matches = areTeamNamesEqual(
              teamNameInRound,
              selectedTeamName
            );
            return matches;
          });
        }

        // Add demoId and demoIndex to each snapshot for identification
        // IMPORTANT: Replace roundNum with a unique value to prevent collapsing across demos
        filteredSnaps = filteredSnaps.map((snap, idx) => ({
          ...snap,
          originalRoundNum: snap.roundNum, // Keep original for reference
          roundNum: demoIndex * 10000 + snap.roundNum, // Make roundNum unique across demos
          demoId: clusteringDemoIds[demoIndex],
          demoIndex: demoIndex,
          uniqueRoundId: `${demoIndex}_${snap.roundNum}`,
        }));

        allSnaps = allSnaps.concat(filteredSnaps);
        demoIndex++;
      }

      const { matrix } = buildFeatureMatrixWithRegions(
        allSnaps,
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
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        `Error during auto-tune: ${err?.message || String(err)}`,
      ]);
    }
  };

  const handleRunClustering = async () => {
    // Check if we have demos selected for clustering
    if (matchDataList.length === 0) {
      setLogs(["Please select at least one demo for clustering analysis"]);
      return;
    }

    setRunning(true);
    setLogs([]);
    setLogs((prev) => [
      ...prev,
      `Processing ${matchDataList.length} demo(s)...`,
    ]);

    try {
      // Extract snapshots from all demos and combine them
      let allSnaps = [];
      let demoIndex = 0;
      for (const demoData of matchDataList) {
        const demoSnaps = extractSnapshots(demoData, {
          timepoints: [...timepoints],
        });

        // DEBUG: Check what fields the snapshots actually have
        if (demoIndex === 0 && demoSnaps.length > 0) {
          console.log("Raw snapshot structure:", Object.keys(demoSnaps[0]));
          console.log("First raw snapshot:", demoSnaps[0]);
        }

        // Filter snapshots: first by side, then optionally by team
        let filteredSnaps = demoSnaps.filter(
          (snap) => snap.team === selectedSide
        );

        console.log(
          `Demo ${demoIndex}: ${demoSnaps.length} total snaps, ${filteredSnaps.length} for ${selectedSide} side`
        );

        // If a specific team is selected, check if that team was playing on this side
        if (selectedTeamName) {
          console.log(
            `Looking for team: ${selectedTeamName} on side: ${selectedSide}`
          );

          const beforeTeamFilter = filteredSnaps.length;
          filteredSnaps = filteredSnaps.filter((snap) => {
            // Use getTeamNameForRound to account for side switching
            const teamNameInRound = getTeamNameForRound(
              demoData,
              snap.roundNum,
              snap.team
            );
            const matches = areTeamNamesEqual(
              teamNameInRound,
              selectedTeamName
            );
            return matches;
          });
          console.log(
            `After team filter: ${beforeTeamFilter} -> ${filteredSnaps.length} snaps`
          );
        }

        // Add demoId and demoIndex to each snapshot for identification
        // IMPORTANT: Replace roundNum with a unique value to prevent collapsing across demos
        filteredSnaps = filteredSnaps.map((snap, idx) => ({
          ...snap,
          originalRoundNum: snap.roundNum, // Keep original for reference
          roundNum: demoIndex * 10000 + snap.roundNum, // Make roundNum unique across demos
          demoId: clusteringDemoIds[demoIndex],
          demoIndex: demoIndex,
          uniqueRoundId: `${demoIndex}_${snap.roundNum}`,
        }));

        allSnaps = allSnaps.concat(filteredSnaps);
        demoIndex++;
      }

      snapshotsRef.current = allSnaps;

      if (allSnaps.length === 0) {
        setLogs((prev) => [...prev, "No snapshots found for selected filters"]);
        setRunning(false);
        return;
      }

      setLogs((prev) => [
        ...prev,
        `Extracted ${allSnaps.length} snapshots from all demos`,
      ]);

      // Debug: log snapshot distribution per demo
      const snapsPerDemo = {};
      allSnaps.forEach((snap) => {
        const key = snap.demoIndex;
        snapsPerDemo[key] = (snapsPerDemo[key] || 0) + 1;
      });
      console.log("Snapshots per demo:", snapsPerDemo);
      console.log(
        "Sample snapshots with roundNums:",
        allSnaps.slice(0, 10).map((s) => ({
          roundNum: s.roundNum,
          originalRoundNum: s.originalRoundNum,
          demoIndex: s.demoIndex,
          team: s.team,
        }))
      );
      setLogs((prev) => [
        ...prev,
        `Distribution: ${Object.entries(snapsPerDemo)
          .map(([idx, count]) => `Demo${idx}=${count}`)
          .join(", ")}`,
      ]);

      const { matrix, rows } = buildFeatureMatrixWithRegions(
        allSnaps,
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

      // Create a mapping from modified roundNum to original data
      const roundNumMapping = new Map();
      allSnaps.forEach((snap) => {
        if (!roundNumMapping.has(snap.roundNum)) {
          roundNumMapping.set(snap.roundNum, {
            originalRoundNum: snap.originalRoundNum,
            demoId: snap.demoId,
            demoIndex: snap.demoIndex,
            uniqueRoundId: snap.uniqueRoundId,
          });
        }
      });

      // Restore the custom fields to rows
      rows.forEach((row) => {
        const mapping = roundNumMapping.get(row.roundNum);
        if (mapping) {
          row.originalRoundNum = mapping.originalRoundNum;
          row.demoId = mapping.demoId;
          row.demoIndex = mapping.demoIndex;
          row.uniqueRoundId = mapping.uniqueRoundId;
        }
      });

      console.log(
        "Mapping sample:",
        Array.from(roundNumMapping.entries()).slice(0, 5)
      );
      console.log(
        "Rows after restoration:",
        rows.slice(0, 5).map((r) => ({
          roundNum: r.roundNum,
          originalRoundNum: r.originalRoundNum,
          demoIndex: r.demoIndex,
        }))
      );

      rowsRef.current = rows;

      console.log(
        `Matrix shape: ${matrix.length} rows x ${matrix[0]?.length || 0} cols`
      );
      console.log(`Rows metadata length: ${rows.length}`);
      console.log(
        "Sample rows:",
        rows.slice(0, 10).map((r) => ({
          roundNum: r.roundNum,
          originalRoundNum: r.originalRoundNum,
          demoIndex: r.demoIndex,
          team: r.team,
        }))
      );
      setLogs((prev) => [
        ...prev,
        `Matrix: ${matrix.length} rows x ${matrix[0]?.length || 0} features`,
      ]);

      // Validate and auto-adjust parameters for small datasets
      const numRows = matrix.length;

      if (numRows < 10) {
        setLogs((prev) => [
          ...prev,
          `ERROR: Too few data points (${numRows}). Need at least 10 rounds.`,
        ]);
        setRunning(false);
        return;
      }

      // Auto-adjust parameters for small datasets to prevent crashes
      let adjustedPerplexity = perplexity;
      let adjustedNNeighbors = nNeighbors;
      let adjustedK = k;
      let adjustedMinPts = minPts;

      if (numRows < 50) {
        // t-SNE: perplexity should be less than numRows/3
        adjustedPerplexity = Math.min(
          perplexity,
          Math.max(5, Math.floor((numRows - 1) / 3))
        );

        // UMAP: nNeighbors should be less than numRows
        adjustedNNeighbors = Math.min(nNeighbors, Math.max(2, numRows - 1));

        // K-means: k should be less than numRows
        adjustedK = Math.min(k, Math.max(2, Math.floor(numRows / 2)));

        // DBSCAN: minPts should be reasonable
        adjustedMinPts = Math.min(minPts, Math.max(2, Math.floor(numRows / 5)));

        console.log(
          `Small dataset (${numRows} rows) - auto-adjusting parameters:`
        );
        if (adjustedPerplexity !== perplexity)
          console.log(
            `  t-SNE Perplexity: ${perplexity} → ${adjustedPerplexity}`
          );
        if (adjustedNNeighbors !== nNeighbors)
          console.log(
            `  UMAP nNeighbors: ${nNeighbors} → ${adjustedNNeighbors}`
          );
        if (adjustedK !== k) console.log(`  K-means K: ${k} → ${adjustedK}`);
        if (adjustedMinPts !== minPts)
          console.log(`  DBSCAN minPts: ${minPts} → ${adjustedMinPts}`);

        setLogs((prev) => [
          ...prev,
          `⚠️  Small dataset (${numRows} rounds) - parameters auto-adjusted for stability`,
        ]);
      }

      try {
        if (reductionMethod === "umap") {
          setLogs((prev) => [...prev, "Initializing UMAP..."]);
          const result = await runUMAP(
            matrix,
            {
              umap: { nNeighbors: adjustedNNeighbors, minDist, nEpochs },
              cluster:
                clusterMethod === "kmeans"
                  ? { method: "kmeans", k: adjustedK, maxIter: 100, tries: 5 }
                  : { method: "dbscan", eps, minPts: adjustedMinPts },
              standardize: true,
            },
            (msg) => {
              setLogs((prev) => [...prev, msg]);
            }
          );

          labelsRef.current = result.labels || null;
          const tp0 = [...timepoints].sort((a, b) => a - b)[0];
          const pts = result.embedding.map((p, i) => {
            const modifiedRoundNum = rows[i]?.roundNum || 0;
            // Calculate original round number and demo index from modified value
            const demoIdx = Math.floor(modifiedRoundNum / 10000);
            const originalRound = modifiedRoundNum % 10000;

            return {
              x: p[0],
              y: p[1],
              cluster: result.labels ? result.labels[i] : undefined,
              roundNum: modifiedRoundNum,
              originalRoundNum: originalRound,
              team: rows[i]?.team,
              timepoint: tp0,
              demoId: rows[i]?.demoId,
              demoIndex: demoIdx,
              demoName: demoNamesMap[demoIdx] || `Demo${demoIdx}`,
              uniqueRoundId: rows[i]?.uniqueRoundId,
            };
          });
          console.log(`Created ${pts.length} points from UMAP`);
          console.log(
            "Sample points with roundNum info:",
            pts.slice(0, 5).map((p) => ({
              roundNum: p.roundNum,
              originalRoundNum: p.originalRoundNum,
              demoIndex: p.demoIndex,
              cluster: p.cluster,
            }))
          );
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

              console.log(
                `Received embedding with ${embedding?.length || 0} points`
              );
              console.log(`Labels: ${labels?.length || 0} items`);

              if (!embedding || embedding.length === 0) {
                console.error("ERROR: Empty embedding received from worker!");
                setLogs((prev) => [
                  ...prev,
                  "ERROR: Clustering produced empty results",
                ]);
                setRunning(false);
                return;
              }

              const pts = (embedding || []).map((p, i) => {
                const modifiedRoundNum = rows[i]?.roundNum || 0;
                // Calculate original round number and demo index from modified value
                const demoIdx = Math.floor(modifiedRoundNum / 10000);
                const originalRound = modifiedRoundNum % 10000;

                return {
                  x: p[0],
                  y: p[1],
                  cluster: labels ? labels[i] : undefined,
                  roundNum: modifiedRoundNum,
                  originalRoundNum: originalRound,
                  team: rows[i]?.team,
                  timepoint: tp0,
                  demoId: rows[i]?.demoId,
                  demoIndex: demoIdx,
                  demoName: demoNamesMap[demoIdx] || `Demo${demoIdx}`,
                  uniqueRoundId: rows[i]?.uniqueRoundId,
                };
              });
              console.log(`Created ${pts.length} points from t-SNE`);
              console.log(
                "Sample points with roundNum info:",
                pts.slice(0, 5).map((p) => ({
                  roundNum: p.roundNum,
                  originalRoundNum: p.originalRoundNum,
                  demoIndex: p.demoIndex,
                  cluster: p.cluster,
                }))
              );

              // Check for missing originalRoundNum
              const missingOriginal = pts.filter(
                (p) => p.originalRoundNum == null
              );
              if (missingOriginal.length > 0) {
                console.warn(
                  `${missingOriginal.length} points missing originalRoundNum!`,
                  missingOriginal.slice(0, 3)
                );
              }

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
              tsne: {
                perplexity: adjustedPerplexity,
                learningRate,
                nIter: iterations,
              },
              cluster:
                clusterMethod === "kmeans"
                  ? { method: "kmeans", k: adjustedK, maxIter: 100, tries: 5 }
                  : { method: "dbscan", eps, minPts: adjustedMinPts },
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
          <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xl font-bold text-white">Player Heatmap</h2>
              <InfoTooltip
                content="Visualize player positions and movement patterns across all rounds. Use filters to show specific teams, sides, or round ranges. Click 'Show Heatmap' to display death locations and hot zones on the map."
                side="right"
              />
            </div>
            <div className="overflow-hidden rounded-lg">
              <CS2MapRenderer
                matchData={matchData}
                heatmapData={heatmapData}
                teamSideHeatmapData={teamSideHeatmapData}
                teamMapping={dynamicTeamMapping}
                staticTeamMapping={initialTeamMapping}
                setCurrentRoundContext={setCurrentRoundContext}
              />
            </div>
          </div>

          {/* Economy & Performance View */}
          {matchData && initialTeamMapping.CT && initialTeamMapping.T && (
            <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xl font-bold text-white">
                  Economy & Performance
                </h2>
                <InfoTooltip
                  content="Track team economy, equipment value, and round outcomes over time. View money spent, weapons bought, and correlations between economy and round wins. Analyze how economic advantages translate to tactical success."
                  side="right"
                />
              </div>
              <EconomyPerformanceView
                matchData={matchData}
                teamMapping={initialTeamMapping}
                teamNames={teamNames}
              />
            </div>
          )}
        </div>

        {/* Clustering Analysis Section */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-white">
                Clustering Analysis
              </h2>
              <InfoTooltip content="Analyze tactical patterns by grouping similar round strategies. Select demos, choose a team and side, then run the analysis to see strategy clusters visualized on a 2D plot." />
            </div>
            <button
              onClick={() => setShowQuickGuide(!showQuickGuide)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg border border-blue-500/30 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              {showQuickGuide ? "Hide Guide" : "Show Guide"}
            </button>
          </div>
          <div className="text-gray-400 mb-4 text-sm flex items-center gap-2 flex-wrap">
            <span>Visualize CS2 round strategies using</span>
            <span className="inline-flex items-center gap-1">
              <span>dimensionality reduction</span>
              <InfoTooltip
                content="t-SNE and UMAP reduce high-dimensional player position data to 2D plots. t-SNE preserves local structure (similar rounds stay close). UMAP preserves both local and global structure. Start with t-SNE."
                side="bottom"
              />
            </span>
            <span>and</span>
            <span className="inline-flex items-center gap-1">
              <span>clustering</span>
              <InfoTooltip
                content="K-means groups rounds into K clusters. DBSCAN finds clusters of varying sizes automatically. K-means is faster and requires setting K (number of clusters). DBSCAN handles noise better."
                side="bottom"
              />
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 flex gap-6 border-b border-gray-700">
            <button
              onClick={() => setActiveView("clustering")}
              className={`px-1 py-3 text-sm font-medium transition-all relative ${
                activeView === "clustering"
                  ? "text-blue-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Clustering Analysis
              {activeView === "clustering" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
              )}
            </button>
            <button
              onClick={() => setActiveView("player-performance")}
              className={`px-1 py-3 text-sm font-medium transition-all relative ${
                activeView === "player-performance"
                  ? "text-blue-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Player Performance
              {activeView === "player-performance" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
              )}
            </button>
          </div>

          {activeView === "clustering" ? (
            <>
              {/* Quick Guide - Collapsible */}
              {showQuickGuide && (
            <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm text-gray-300">
                  <p className="font-semibold text-blue-300 text-base">
                    Quick Guide:
                  </p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li className="leading-relaxed">
                      <strong className="text-gray-200">Select demos</strong> -
                      Choose one or more matches to analyze together
                    </li>
                    <li className="leading-relaxed">
                      <strong className="text-gray-200">
                        Pick team & side
                      </strong>{" "}
                      - Select which team's CT or T strategies to study
                    </li>
                    <li className="leading-relaxed">
                      <strong className="text-gray-200">Adjust settings</strong>{" "}
                      - Configure timepoints, clustering method, and reduction
                      technique
                    </li>
                    <li className="leading-relaxed">
                      <strong className="text-gray-200">Run analysis</strong> -
                      Click "Run" to generate the visualization
                    </li>
                    <li className="leading-relaxed">
                      <strong className="text-gray-200">
                        Explore clusters
                      </strong>{" "}
                      - Click colored points to see representative setups
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Multi-Demo Selector with Analysis Summary */}
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Demo Selector - 2 columns */}
            <div className="lg:col-span-2">
              <MultiDemoSelector
                onDemoSelect={setClusteringDemoIds}
                selectedDemoIds={clusteringDemoIds}
                disabled={running || loadingClusteringDemos}
              />
              {loadingClusteringDemos && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
                  <span className="text-sm text-blue-300">
                    Loading selected demos...
                  </span>
                </div>
              )}
              {matchDataList.length > 0 && !loadingClusteringDemos && (
                <div className="mt-3 space-y-2">
                  {/* Match Stats */}
                  <div className="flex items-center gap-3 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-green-300">
                        {matchDataList.length}{" "}
                        {matchDataList.length === 1 ? "Match" : "Matches"}
                      </span>
                    </div>
                    <div className="h-4 w-px bg-green-500/30"></div>
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="w-3.5 h-3.5 text-green-400/70"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      <span className="text-xs text-green-300/80">
                        {matchDataList.reduce(
                          (sum, m) => sum + (m.rounds?.length || 0),
                          0
                        )}{" "}
                        Rounds
                      </span>
                    </div>
                  </div>

                  {/* Common Teams */}
                  {commonTeams.length > 0 && (
                    <div className="flex items-start gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <svg
                        className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-blue-300/70 mb-1">
                          Common Teams
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {commonTeams.map((team) => (
                            <span
                              key={team}
                              className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-300 rounded border border-blue-500/30"
                            >
                              {team}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Analysis Summary Panel - 1 column */}
            <div className="bg-gradient-to-br from-gray-700/40 to-gray-800/40 border border-gray-600 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="w-5 h-5 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-gray-200">
                  Current Config
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                {/* Selected Team & Side */}
                {selectedTeamName && (
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                    <div className="text-gray-400 font-medium mb-2">Target</div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-3.5 h-3.5 text-blue-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                        </svg>
                        <span className="text-gray-200 font-medium">
                          {selectedTeamName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            selectedSide === "CT"
                              ? "bg-blue-400"
                              : "bg-orange-400"
                          }`}
                        ></div>
                        <span className="text-gray-300">
                          {selectedSide} Side
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Algorithm Settings */}
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                  <div className="text-gray-400 font-medium mb-2">
                    Algorithm
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Reduction:</span>
                      <span className="text-gray-200 font-mono text-[11px] bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                        {reductionMethod.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Clustering:</span>
                      <span className="text-gray-200 font-mono text-[11px] bg-green-500/20 px-2 py-0.5 rounded border border-green-500/30">
                        {clusterMethod === "kmeans"
                          ? `K-means (${k})`
                          : `DBSCAN`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Data Points */}
                {points.length > 0 && (
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                    <div className="text-gray-400 font-medium mb-2">
                      Results
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Data Points:</span>
                        <span className="text-blue-400 font-bold">
                          {points.length}
                        </span>
                      </div>
                      {labelsRef.current && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Clusters:</span>
                          <span className="text-green-400 font-bold">
                            {
                              new Set(labelsRef.current.filter((l) => l >= 0))
                                .size
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Ready indicator */}
                {matchDataList.length > 0 && !running && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-lg border border-green-500/30">
                    <svg
                      className="w-4 h-4 text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-green-400 text-xs font-medium">
                      Ready
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className="space-y-4">
              {/* Team & Side Selection */}
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-200">
                  Analysis Parameters
                </h3>
                <InfoTooltip
                  content="Choose which team and side (CT/T) to analyze. Teams automatically swap sides at halftime. Timepoints determine when during each round to capture player positions."
                  side="right"
                />
              </div>

              <Controls
                selectedTeamName={selectedTeamName}
                onTeamNameChange={setSelectedTeamName}
                selectedSide={selectedSide}
                onSideChange={setSelectedSide}
                teamMapping={
                  matchDataList.length > 0
                    ? {
                        CT: availableTeams[0] || null,
                        T: availableTeams[1] || null,
                      }
                    : initialTeamMapping
                }
                availableTeams={availableTeams}
                commonTeams={commonTeams}
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
                disabled={isLoading || running || loadingClusteringDemos}
              />

              {/* Logs below Controls in same column */}
              {logs.length > 0 && (
                <div className="border border-gray-700 rounded p-3 text-xs max-h-48 overflow-auto custom-scrollbar bg-gray-800/30">
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

              {/* Custom scrollbar styles */}
              <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 6px;
                  height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: rgba(31, 41, 55, 0.5);
                  border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(75, 85, 99, 0.8);
                  border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: rgba(107, 114, 128, 0.9);
                }
              `}</style>
            </section>

            <section className="lg:col-span-2">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-200">
                    Strategy Clusters
                  </h3>
                  <InfoTooltip
                    content="Each point represents a round. Points close together are similar strategies. Click a cluster to see the representative setup on the map below. Colors represent different strategy groups."
                    side="right"
                  />
                </div>
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
                  <InfoTooltip
                    content="Choose which round time (in seconds) to visualize on the map. Different timepoints show how the strategy evolves during a round."
                    side="right"
                  />
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
            </>
          ) : (
            <MultiMatchPlayerPerformance
              selectedDemoIds={clusteringDemoIds}
              matchDataList={matchDataList}
              isLoading={loadingClusteringDemos}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CS2Dashboard;
