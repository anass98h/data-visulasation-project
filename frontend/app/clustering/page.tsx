"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { MultiDemoSelector } from "@/components/clustering/MultiDemoSelector";
import Controls from "@/components/clustering/Controls";
import DimensionScatter from "@/components/clustering/DimensionScatter";
import ClusteringMapPreview from "@/components/clustering/ClusteringMapPreview";
import { DEFAULT_TIMEPOINTS } from "@/config/clustering.config";
import type { ScatterPoint, Team, Representative } from "@/types/clustering";
import { extractSnapshots } from "@/lib/clustering/extractSnapshots";
// Use the extended feature builder that imputes missing timepoints
// and appends region (A/B) occupancy features.
import { buildFeatureMatrixWithRegions } from "@/lib/clustering/features_plus";
import { createDimensionWorker } from "@/lib/clustering/dimensionWorkerClient";
import { runUMAP } from "@/lib/clustering/umapClient";
import { computeRepresentatives, predictMostLikelySetup } from "@/lib/clustering/representatives";
import {
  suggestTSNEParams,
  suggestUMAPParams,
  suggestKMeansK,
  suggestDBSCANParams,
  suggestReductionMethod,
  suggestClusteringMethod,
} from "@/lib/clustering/autoTune";
import { Loader2 } from "lucide-react";

const API_URL = "http://localhost:8000";

export default function ClustringPage() {
  const [selectedDemoIds, setSelectedDemoIds] = useState<string[]>([]);
  const [matchDataList, setMatchDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch multiple demos
  useEffect(() => {
    if (selectedDemoIds.length === 0) {
      setMatchDataList([]);
      return;
    }

    const fetchDemos = async () => {
      setLoading(true);
      setError(null);
      try {
        const promises = selectedDemoIds.map(async (id) => {
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
        console.error("Error fetching demos:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setMatchDataList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDemos();
  }, [selectedDemoIds]);

  // Controls state (scaffold only)
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null); // Vitality, Mongols, etc.
  const [selectedSide, setSelectedSide] = useState<Team>("CT"); // CT or T
  const [timepoints, setTimepoints] = useState<number[]>([...DEFAULT_TIMEPOINTS]);
  const [economyWeight, setEconomyWeight] = useState<number>(0.5);
  const [includeEconomy, setIncludeEconomy] = useState<boolean>(true);
  const [normalizePositions, setNormalizePositions] = useState<boolean>(true);
  const [relativePositions, setRelativePositions] = useState<boolean>(false);
  const [clusterMethod, setClusterMethod] = useState<"kmeans" | "dbscan">("kmeans");
  const [k, setK] = useState<number>(5);
  const [eps, setEps] = useState<number>(0.8);
  const [minPts, setMinPts] = useState<number>(6);
  const [economyBucket, setEconomyBucket] = useState<"none" | "low" | "mid" | "high">("none");
  const [reductionMethod, setReductionMethod] = useState<"tsne" | "umap">("tsne");
  const [perplexity, setPerplexity] = useState<number>(10);
  const [iterations, setIterations] = useState<number>(1500);
  const [learningRate, setLearningRate] = useState<number>(200);
  const [nNeighbors, setNNeighbors] = useState<number>(15);
  const [minDist, setMinDist] = useState<number>(0.1);
  const [nEpochs, setNEpochs] = useState<number>(400);

  // Results and working state
  const [points, setPoints] = useState<ScatterPoint[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [representative, setRepresentative] = useState<Representative | undefined>(undefined);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const workerRef = useRef<ReturnType<typeof createDimensionWorker> | null>(null);
  const labelsRef = useRef<number[] | null>(null);
  const rowsRef = useRef<{ roundNum: number; team: Team }[] | null>(null);
  const snapshotsRef = useRef<any[] | null>(null);
  const [previewTimepoint, setPreviewTimepoint] = useState<number | null>(null);

  const mapName: string = useMemo(() => {
    return matchDataList?.[0]?.header?.mapName || "de_ancient";
  }, [matchDataList]);

  // Helper to get team mapping for a single match
  const getMatchTeamMapping = (match: any) => {
    const teams = { CT: null as string | null, T: null as string | null };
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
  const areTeamNamesEqual = (a: string | null, b: string | null) => {
    if (!a || !b) return a === b;
    return a.toLowerCase() === b.toLowerCase();
  };

  // Extract all unique team names from all matches
  const availableTeams = useMemo(() => {
    const teams = new Map<string, string>(); // lowerCase -> displayCase
    matchDataList.forEach((match: any) => {
      const mapping = getMatchTeamMapping(match);
      if (mapping.CT) teams.set(mapping.CT.toLowerCase(), mapping.CT);
      if (mapping.T) teams.set(mapping.T.toLowerCase(), mapping.T);
    });
    return Array.from(teams.values());
  }, [matchDataList]);

  // Find common teams across all matches
  const commonTeams = useMemo(() => {
    if (matchDataList.length === 0) return [];
    
    // Get teams for the first match
    const firstMatch = matchDataList[0];
    const firstMapping = getMatchTeamMapping(firstMatch);
    let intersection = new Set<string>();
    if (firstMapping.CT) intersection.add(firstMapping.CT.toLowerCase());
    if (firstMapping.T) intersection.add(firstMapping.T.toLowerCase());

    // Intersect with subsequent matches
    for (let i = 1; i < matchDataList.length; i++) {
      const match = matchDataList[i];
      const mapping = getMatchTeamMapping(match);
      const currentTeams = new Set<string>();
      if (mapping.CT) currentTeams.add(mapping.CT.toLowerCase());
      if (mapping.T) currentTeams.add(mapping.T.toLowerCase());
      
      // Filter intersection
      intersection = new Set(
        [...intersection].filter(x => currentTeams.has(x))
      );
    }
    
    // Map back to display names (using availableTeams map logic or just finding one)
    const displayNames: string[] = [];
    intersection.forEach(lowerName => {
      // Find a display name from availableTeams that matches
      const match = availableTeams.find(t => t.toLowerCase() === lowerName);
      if (match) displayNames.push(match);
    });
    
    return displayNames;
  }, [matchDataList, availableTeams]);

  // Initialize selected team when availableTeams is available
  // Prefer common teams if available
  React.useEffect(() => {
    if (commonTeams.length > 0) {
      // If current selection is not in common teams (case-insensitive), switch to a common team
      const isSelectedCommon = selectedTeamName && commonTeams.some(ct => areTeamNamesEqual(ct, selectedTeamName));
      if (!isSelectedCommon) {
        setSelectedTeamName(commonTeams[0]);
      }
    } else if (availableTeams.length > 0 && !selectedTeamName) {
      setSelectedTeamName(availableTeams[0]);
    }
  }, [availableTeams, commonTeams, selectedTeamName]);

  // Helper to get team name for a side in a specific round of a match
  const getTeamNameForRound = (match: any, roundNum: number, side: Team): string | null => {
    const mapping = getMatchTeamMapping(match);
    if (!match?.rounds || !mapping.CT || !mapping.T) return null;
    
    const roundsPerHalf = match?.header?.roundsPerHalf ?? 12;
    const halfIndex = Math.floor((roundNum - 1) / roundsPerHalf);
    const swapped = halfIndex % 2 === 1; // halves 2,4,... swap sides
    
    const assignment = swapped
      ? { CT: mapping.T!, T: mapping.CT! }
      : { CT: mapping.CT!, T: mapping.T! };
      
    return assignment[side] || null;
  };

  // Auto-tune when team, side, or economy bucket changes
  React.useEffect(() => {
    if (matchDataList.length > 0 && selectedTeamName) {
      handleAutoTune();
    }
  }, [selectedTeamName, selectedSide, economyBucket, includeEconomy, normalizePositions, relativePositions, matchDataList]);

  // Auto-tune handler
  const handleAutoTune = () => {
    if (!matchDataList.length) {
      setLogs((prev) => [...prev, "No data loaded - cannot auto-tune parameters"]);
      return;
    }

    setLogs([]);
    setLogs((prev) => [...prev, "🔮 Auto-tuning parameters..."]);

    // Extract data to analyze
    let allSnaps: any[] = [];
    
    matchDataList.forEach((match) => {
      const matchSnaps = extractSnapshots(match, { timepoints: [...timepoints] });
      const filtered = selectedTeamName 
        ? matchSnaps.filter(snap => {
            const teamNameInRound = getTeamNameForRound(match, snap.roundNum, snap.team);
            return areTeamNamesEqual(teamNameInRound, selectedTeamName) && snap.team === selectedSide;
          })
        : matchSnaps.filter(snap => snap.team === selectedSide);
      allSnaps = [...allSnaps, ...filtered];
    });

    if (allSnaps.length === 0) {
      setLogs((prev) => [...prev, "No snapshots found for selected criteria."]);
      return;
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

    setLogs((prev) => [...prev, `Dataset: ${dataChar.nSamples} samples, ${dataChar.nFeatures} features`]);

    // Keep current reduction method, only optimize its parameters
    setLogs((prev) => [...prev, `Using current method: ${reductionMethod.toUpperCase()}`]);

    // Suggest reduction params based on current method
    if (reductionMethod === "tsne") {
      const tsneParams = suggestTSNEParams(dataChar);
      setPerplexity(tsneParams.perplexity);
      setLearningRate(tsneParams.learningRate);
      setIterations(tsneParams.iterations);
      setLogs((prev) => [...prev, `✓ t-SNE: perplexity=${tsneParams.perplexity}, lr=${tsneParams.learningRate}, iter=${tsneParams.iterations}`]);
    } else {
      const umapParams = suggestUMAPParams(dataChar);
      setNNeighbors(umapParams.nNeighbors);
      setMinDist(umapParams.minDist);
      setNEpochs(umapParams.nEpochs);
      setLogs((prev) => [...prev, `✓ UMAP: neighbors=${umapParams.nNeighbors}, minDist=${umapParams.minDist}, epochs=${umapParams.nEpochs}`]);
    }

    // Suggest clustering method
    const clusterSuggestion = suggestClusteringMethod(dataChar);
    setLogs((prev) => [...prev, `✓ Clustering: ${clusterSuggestion.method} - ${clusterSuggestion.reason}`]);
    setClusterMethod(clusterSuggestion.method);

    // Suggest clustering params
    if (clusterSuggestion.method === "kmeans") {
      const kmeansParams = suggestKMeansK(dataChar);
      setK(kmeansParams.k);
      setLogs((prev) => [...prev, `✓ K-means: k=${kmeansParams.k} (try range ${kmeansParams.suggestedRange.min}-${kmeansParams.suggestedRange.max})`]);
    } else {
      const dbscanParams = suggestDBSCANParams(dataChar);
      setEps(dbscanParams.eps);
      setMinPts(dbscanParams.minPts);
      setLogs((prev) => [...prev, `✓ DBSCAN: eps=${dbscanParams.eps}, minPts=${dbscanParams.minPts}`]);
    }

    setLogs((prev) => [...prev, "✅ Auto-tune complete! Click 'Run' to apply."]);
  };

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white">
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Clustering Analysis</h1>
          <p className="text-gray-400 mt-1">
            Visualize CS2 round strategies using dimensionality reduction (t-SNE or UMAP) and clustering.
          </p>
          <div className="mt-4 mb-4">
             <MultiDemoSelector 
                selectedDemoIds={selectedDemoIds}
                onDemoSelect={setSelectedDemoIds}
                disabled={loading}
             />
          </div>
          <div className="mt-2 text-sm text-gray-400">
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading {selectedDemoIds.length} matches...</span>
              </div>
            ) : matchDataList.length > 0 ? (
              <div className="space-y-1">
                <div>
                  Loaded {matchDataList.length} matches. Total rounds: {matchDataList.reduce((acc: any, m: any) => acc + (m.rounds?.length || 0), 0)}
                </div>
                {commonTeams.length > 0 && (
                   <div className="text-xs text-green-400">
                      Common teams found: {commonTeams.join(", ")}
                   </div>
                )}
              </div>
            ) : (
              <span>Select matches to begin analysis.</span>
            )}
            {error && <span className="ml-2 text-red-400">{error}</span>}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-1">
            <Controls
              selectedTeamName={selectedTeamName}
              onTeamNameChange={setSelectedTeamName}
              selectedSide={selectedSide}
              onSideChange={setSelectedSide}
              availableTeams={availableTeams}
              selectedTimepoints={timepoints}
              onToggleTimepoint={(tp) => {
                setTimepoints((prev) =>
                  prev.includes(tp) ? prev.filter((t) => t !== tp) : [...prev, tp]
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
              iterations={iterations}
              onIterationsChange={setIterations}
              learningRate={learningRate}
              onLearningRateChange={setLearningRate}
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
              onAutoTune={handleAutoTune}
              onRun={async () => {
                if (!matchDataList.length) return;
                if (!timepoints.length) return;
                setRunning(true);
                setSelectedCluster(null);
                setRepresentative(undefined);
                setPoints([]);
                setLogs([]);

                // 1) Extract snapshots
                let allSnaps: any[] = [];
                matchDataList.forEach((match) => {
                  const matchSnaps = extractSnapshots(match, { timepoints: [...timepoints] });
                  const filtered = selectedTeamName 
                    ? matchSnaps.filter(snap => {
                        const teamNameInRound = getTeamNameForRound(match, snap.roundNum, snap.team);
                        return areTeamNamesEqual(teamNameInRound, selectedTeamName) && snap.team === selectedSide;
                      })
                    : matchSnaps.filter(snap => snap.team === selectedSide);
                  allSnaps = [...allSnaps, ...filtered];
                });

                if (allSnaps.length === 0) {
                  setLogs((prev) => [...prev, "No snapshots found for selected criteria."]);
                  setRunning(false);
                  return;
                }

                snapshotsRef.current = allSnaps;
                const tpSorted = [...timepoints].sort((a, b) => a - b);
                setPreviewTimepoint(tpSorted[0] ?? null);

                // 2) Build feature matrix
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
                rowsRef.current = rows as any;

                // 3) Run dimensionality reduction
                try {
                  if (reductionMethod === "umap") {
                    // Use direct UMAP implementation
                    setLogs((prev) => [...prev, "Initializing UMAP..."]);
                    const result = await runUMAP(matrix, {
                      umap: { nNeighbors, minDist, nEpochs },
                      cluster: clusterMethod === "kmeans"
                        ? { method: "kmeans", k, maxIter: 100, tries: 5 }
                        : { method: "dbscan", eps, minPts },
                      standardize: true,
                    }, (msg) => {
                      setLogs((prev) => [...prev, msg]);
                    });

                    labelsRef.current = result.labels || null;
                    const tp0 = [...timepoints].sort((a, b) => a - b)[0];
                    const pts: ScatterPoint[] = result.embedding.map((p, i) => ({
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
                    // Use t-SNE via worker
                    if (workerRef.current) {
                      workerRef.current.worker.terminate();
                      workerRef.current.revoke();
                      workerRef.current = null;
                    }
                    const handle = createDimensionWorker();
                    workerRef.current = handle;
                    handle.worker.onmessage = (ev: MessageEvent<any>) => {
                      const { type, message, embedding, labels, error } = ev.data || {};
                      if (type === "log" && message) {
                        setLogs((prev) => [...prev, String(message)]);
                      } else if (type === "error") {
                        setLogs((prev) => [...prev, `Error: ${error}`]);
                        setRunning(false);
                      } else if (type === "result") {
                        labelsRef.current = labels || null;
                        const tp0 = [...timepoints].sort((a, b) => a - b)[0];
                        const pts: ScatterPoint[] = (embedding || []).map((p: [number, number], i: number) => ({
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
                        cluster: clusterMethod === "kmeans"
                          ? { method: "kmeans", k, maxIter: 100, tries: 5 }
                          : { method: "dbscan", eps, minPts },
                      },
                    });
                  }
                } catch (err: any) {
                  const errorMsg = err?.message || String(err);
                  setLogs((prev) => [...prev, `Error: ${errorMsg}`]);
                  if (errorMsg.includes('umap-js package is not installed')) {
                    setLogs((prev) => [...prev, 'To use UMAP, run: cd frontend && npm install']);
                    setLogs((prev) => [...prev, 'Falling back to t-SNE for now...']);
                    // Could optionally auto-switch to t-SNE here
                  }
                  setRunning(false);
                }
              }}
              onPredict={() => {
                try {
                  const labels = labelsRef.current;
                  const rows = rowsRef.current as { roundNum: number; team: Team }[] | null;
                  const snaps = snapshotsRef.current as any[] | null;
                  const tp = previewTimepoint ?? [...timepoints].sort((a, b) => a - b)[0];
                  const previewTeam: Team = selectedSide;
                  if (!labels || !rows || !snaps || tp == null) return;
                  const econ = economyBucket === "none" ? undefined : (economyBucket as any);
                  const res = predictMostLikelySetup(snaps, rows, labels, { team: previewTeam, timepoint: tp, economyBucket: econ });
                  if (res) {
                    setSelectedCluster(res.cluster);
                    setRepresentative(res.representative);
                  }
                } catch {}
              }}
              disabled={loading || running}
            />
          </section>

          <section className="lg:col-span-2">
            <div className="mb-4">
              <DimensionScatter
                points={points}
                selectedCluster={selectedCluster}
                reductionMethod={reductionMethod}
                onSelectCluster={(cid) => {
                  setSelectedCluster(cid);
                  try {
                    if (cid == null || cid < 0) { setRepresentative(undefined); return; }
                    const labels = labelsRef.current;
                    const rows = rowsRef.current as { roundNum: number; team: Team }[] | null;
                    const snaps = snapshotsRef.current as any[] | null;
                    const tp = previewTimepoint ?? [...timepoints].sort((a, b) => a - b)[0];
                    const previewTeam: Team = selectedSide;
                    if (!labels || !rows || !snaps || tp == null) { setRepresentative(undefined); return; }
                    const reps = computeRepresentatives(snaps, rows, labels, { team: previewTeam, timepoint: tp });
                    setRepresentative(reps.get(cid));
                  } catch { setRepresentative(undefined); }
                }}
              />
            </div>
            <div>
              <ClusteringMapPreview
                mapName={mapName}
                team={selectedSide}
                representative={representative}
                width={1024}
                height={600}
              />
              {/* Preview timepoint selector */}
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-300">
                <span>Preview timepoint:</span>
                <div className="flex flex-wrap gap-2">
                  {[...timepoints].sort((a, b) => a - b).map((tp) => (
                    <button
                      key={tp}
                      onClick={() => {
                        setPreviewTimepoint(tp);
                        // refresh representative for selected cluster
                        const cid = selectedCluster;
                        try {
                          if (cid == null || cid < 0) return;
                          const labels = labelsRef.current;
                          const rows = rowsRef.current as { roundNum: number; team: Team }[] | null;
                          const snaps = snapshotsRef.current as any[] | null;
                          const previewTeam: Team = selectedSide;
                          if (!labels || !rows || !snaps) return;
                          const reps = computeRepresentatives(snaps, rows, labels, { team: previewTeam, timepoint: tp });
                          setRepresentative(reps.get(cid));
                        } catch {}
                      }}
                      className={`px-2 py-1 rounded border ${tp === previewTimepoint ? "bg-blue-600 border-blue-500" : "bg-gray-700 border-gray-600 hover:bg-gray-600"}`}
                    >
                      {tp}s
                    </button>
                  ))}
                </div>
              </div>
              {logs.length > 0 && (
                <div className="mt-4 bg-gray-800 border border-gray-700 rounded p-3 text-xs max-h-48 overflow-auto">
                  {running && <div className="mb-1 text-gray-400">Running…</div>}
                  {logs.map((l, idx) => (
                    <div key={idx} className="text-gray-300">{l}</div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

