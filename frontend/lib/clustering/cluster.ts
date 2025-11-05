"use client";

// Optional helper: KMeans on 2D embeddings when running on main thread

export type Point2D = [number, number];

export interface KMeansOptions {
  k?: number;
  maxIter?: number;
  tries?: number;
}

export interface KMeansResult {
  labels: number[];
  centers: Point2D[];
}

function dist2(a: Point2D, b: Point2D) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

export function kmeans2D(points: Point2D[], opts?: KMeansOptions): KMeansResult {
  const n = points.length;
  const k = Math.max(1, Math.min(opts?.k ?? 3, n));
  const maxIter = opts?.maxIter ?? 100;
  const tries = opts?.tries ?? 5;
  if (n === 0) return { labels: [], centers: [] };

  function runOnce() {
    // k-means++ init
    const centers: Point2D[] = [] as any;
    centers.push(points[Math.floor(Math.random() * n)]);
    while (centers.length < k) {
      const dists = points.map((p) => centers.reduce((m, c) => Math.min(m, dist2(p, c)), Infinity));
      const sum = dists.reduce((s, v) => s + v, 0) || 1;
      let r = Math.random() * sum, acc = 0, idx = 0;
      for (let i = 0; i < n; i++) {
        acc += dists[i];
        if (acc >= r) { idx = i; break; }
      }
      centers.push(points[idx]);
    }

    const labels = new Array(n).fill(0);
    for (let it = 0; it < maxIter; it++) {
      let changed = false;
      for (let i = 0; i < n; i++) {
        let best = 0, bestD = Infinity;
        for (let c = 0; c < k; c++) {
          const d = dist2(points[i], centers[c]);
          if (d < bestD) { bestD = d; best = c; }
        }
        if (labels[i] !== best) { labels[i] = best; changed = true; }
      }
      const sums: Point2D[] = Array.from({ length: k }, () => [0, 0]);
      const counts = new Array(k).fill(0);
      for (let i = 0; i < n; i++) { const c = labels[i]; sums[c][0] += points[i][0]; sums[c][1] += points[i][1]; counts[c]++; }
      for (let c = 0; c < k; c++) {
        if (counts[c] > 0) { centers[c] = [sums[c][0] / counts[c], sums[c][1] / counts[c]]; }
      }
      if (!changed) break;
    }
    let inertia = 0; for (let i = 0; i < n; i++) inertia += dist2(points[i], centers[labels[i]]);
    return { labels, centers, inertia } as KMeansResult & { inertia: number };
  }

  let best: (KMeansResult & { inertia: number }) | null = null;
  for (let t = 0; t < tries; t++) {
    const res = runOnce();
    if (!best || res.inertia < best.inertia) best = res;
  }
  return { labels: best!.labels, centers: best!.centers };
}

