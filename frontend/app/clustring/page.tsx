"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Controls from "@/components/clustering/Controls";
import TSNEScatter from "@/components/clustering/TSNEScatter";
import ClusteringMapPreview from "@/components/clustering/ClusteringMapPreview";
import { DEFAULT_TIMEPOINTS } from "@/config/clustering.config";
import type { ScatterPoint, Team, Representative } from "@/types/clustering";
import { extractSnapshots } from "@/lib/clustering/extractSnapshots";
// Use the extended feature builder that imputes missing timepoints
// and appends region (A/B) occupancy features.
import { buildFeatureMatrixWithRegions } from "@/lib/clustering/features_plus";
import { createTSNEWorker } from "@/lib/clustering/tsneWorkerClient";
import { computeRepresentatives, predictMostLikelySetup } from "@/lib/clustering/representatives";

export default function ClustringPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<any | null>(null);

  // Controls state (scaffold only)
  const [team, setTeam] = useState<Team | "both">("both");
  const [timepoints, setTimepoints] = useState<number[]>([...DEFAULT_TIMEPOINTS]);
  const [economyWeight, setEconomyWeight] = useState<number>(0.5);
  const [clusterMethod, setClusterMethod] = useState<"kmeans" | "dbscan">("kmeans");
  const [k, setK] = useState<number>(5);
  const [eps, setEps] = useState<number>(0.8);
  const [minPts, setMinPts] = useState<number>(6);
  const [economyBucket, setEconomyBucket] = useState<"none" | "low" | "mid" | "high">("none");
  const [perplexity, setPerplexity] = useState<number>(10);
  const [iterations, setIterations] = useState<number>(1500);
  const [learningRate, setLearningRate] = useState<number>(200);

  // Results and working state
  const [points, setPoints] = useState<ScatterPoint[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [representative, setRepresentative] = useState<Representative | undefined>(undefined);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const workerRef = useRef<ReturnType<typeof createTSNEWorker> | null>(null);
  const labelsRef = useRef<number[] | null>(null);
  const rowsRef = useRef<{ roundNum: number; team: Team }[] | null>(null);
  const snapshotsRef = useRef<any[] | null>(null);
  const [previewTimepoint, setPreviewTimepoint] = useState<number | null>(null);

  useEffect(() => {
    // Load existing JSON, if present; otherwise show empty state
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/match_data.json");
        if (!res.ok) {
          setMatchData(null);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setMatchData(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load match_data.json");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const mapName: string = useMemo(() => {
    return matchData?.header?.mapName || "de_ancient";
  }, [matchData]);

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white">
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Clustering (t‑SNE) — Scaffold</h1>
          <p className="text-gray-400 mt-1">
            Route only, no data processing yet. We’ll wire logic in later steps.
          </p>
          <div className="mt-2 text-sm text-gray-400">
            {loading ? (
              <span>Loading match_data.json…</span>
            ) : matchData ? (
              <span>
                Loaded {matchData.rounds?.length ?? 0} rounds on {matchData.header?.mapName || "Unknown"}
              </span>
            ) : (
              <span>No match_data.json found in public. You can still use the scaffold.</span>
            )}
            {error && <span className="ml-2 text-red-400">{error}</span>}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-1">
            <Controls
              team={team}
              onTeamChange={setTeam}
              selectedTimepoints={timepoints}
              onToggleTimepoint={(tp) => {
                setTimepoints((prev) =>
                  prev.includes(tp) ? prev.filter((t) => t !== tp) : [...prev, tp]
                );
              }}
              economyWeight={economyWeight}
              onEconomyWeightChange={setEconomyWeight}
              perplexity={perplexity}
              onPerplexityChange={setPerplexity}
              iterations={iterations}
              onIterationsChange={setIterations}
              learningRate={learningRate}
              onLearningRateChange={setLearningRate}
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
              onRun={async () => {
                if (!matchData) return;
                if (!timepoints.length) return;
                setRunning(true);
                setSelectedCluster(null);
                setRepresentative(undefined);
                setPoints([]);
                setLogs([]);

                // 1) Extract snapshots
                const snaps = extractSnapshots(matchData, { timepoints: [...timepoints] });
                snapshotsRef.current = snaps;
                const tpSorted = [...timepoints].sort((a, b) => a - b);
                setPreviewTimepoint(tpSorted[0] ?? null);

                // 2) Build feature matrix
                const { matrix, rows } = buildFeatureMatrixWithRegions(snaps, [...timepoints], { economyWeight, impute: true }, team);
                rowsRef.current = rows as any;

                // 3) Start worker
                if (workerRef.current) {
                  workerRef.current.worker.terminate();
                  workerRef.current.revoke();
                  workerRef.current = null;
                }
                const handle = createTSNEWorker();
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
                    // Compose scatter points
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
                    tsne: { perplexity, learningRate, nIter: iterations },
                    cluster: clusterMethod === "kmeans"
                      ? { method: "kmeans", k, maxIter: 100, tries: 5 }
                      : { method: "dbscan", eps, minPts },
                  },
                });
              }}
              onPredict={() => {
                try {
                  const labels = labelsRef.current;
                  const rows = rowsRef.current as { roundNum: number; team: Team }[] | null;
                  const snaps = snapshotsRef.current as any[] | null;
                  const tp = previewTimepoint ?? [...timepoints].sort((a, b) => a - b)[0];
                  const previewTeam: Team = team === "both" ? "CT" : (team as Team);
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
              <TSNEScatter
                points={points}
                selectedCluster={selectedCluster}
                onSelectCluster={(cid) => {
                  setSelectedCluster(cid);
                  try {
                    if (cid == null || cid < 0) { setRepresentative(undefined); return; }
                    const labels = labelsRef.current;
                    const rows = rowsRef.current as { roundNum: number; team: Team }[] | null;
                    const snaps = snapshotsRef.current as any[] | null;
                    const tp = previewTimepoint ?? [...timepoints].sort((a, b) => a - b)[0];
                    const previewTeam: Team = team === "both" ? "CT" : (team as Team);
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
                team={team === "both" ? "CT" : (team as Team)}
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
                          const previewTeam: Team = team === "both" ? "CT" : (team as Team);
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
