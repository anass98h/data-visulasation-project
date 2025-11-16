"use client";

// Dynamic import for browser compatibility
async function loadUMAP() {
  const { UMAP } = await import('umap-js');
  return UMAP;
}

export type UMAPParams = {
  nNeighbors?: number;
  minDist?: number;
  nComponents?: number;
  nEpochs?: number;
};

export type ClusterParams = {
  method?: "kmeans" | "dbscan" | "none";
  k?: number;
  maxIter?: number;
  tries?: number;
  eps?: number;
  minPts?: number;
};

// Standardize features (z-score normalization)
function standardize(matrix: number[][]): number[][] {
  if (!matrix || matrix.length === 0) return matrix;
  
  const rows = matrix.length;
  const cols = matrix[0].length;
  const means = new Array(cols).fill(0);
  const stds = new Array(cols).fill(0);
  
  // Calculate means
  for (let j = 0; j < cols; j++) {
    let sum = 0;
    for (let i = 0; i < rows; i++) {
      sum += matrix[i][j];
    }
    means[j] = sum / rows;
  }
  
  // Calculate standard deviations
  for (let j = 0; j < cols; j++) {
    let sum = 0;
    for (let i = 0; i < rows; i++) {
      const diff = matrix[i][j] - means[j];
      sum += diff * diff;
    }
    stds[j] = Math.sqrt(sum / Math.max(1, rows - 1)) || 1;
  }
  
  // Standardize
  const result = new Array(rows);
  for (let i = 0; i < rows; i++) {
    result[i] = new Array(cols);
    for (let j = 0; j < cols; j++) {
      result[i][j] = (matrix[i][j] - means[j]) / stds[j];
    }
  }
  
  return result;
}

// K-means clustering
function kmeans2D(points: [number, number][], k: number, maxIter: number = 100, tries: number = 5) {
  const n = points.length;
  if (n === 0) return { labels: [], centers: [] };
  
  k = Math.max(1, Math.min(k, n));
  
  function dist2(a: [number, number], b: [number, number]) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return dx * dx + dy * dy;
  }
  
  function runOnce() {
    // k-means++ initialization
    const centers: [number, number][] = [];
    centers.push(points[Math.floor(Math.random() * n)]);
    
    while (centers.length < k) {
      const dists = points.map(p => {
        let minDist = Infinity;
        for (const c of centers) {
          const d = dist2(p, c);
          if (d < minDist) minDist = d;
        }
        return minDist;
      });
      
      const sum = dists.reduce((s, v) => s + v, 0) || 1;
      const r = Math.random() * sum;
      let acc = 0;
      let idx = 0;
      for (let i = 0; i < n; i++) {
        acc += dists[i];
        if (acc >= r) {
          idx = i;
          break;
        }
      }
      centers.push(points[idx]);
    }
    
    const labels = new Array(n).fill(0);
    
    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;
      
      // Assignment step
      for (let i = 0; i < n; i++) {
        let best = 0;
        let bestDist = Infinity;
        for (let c = 0; c < k; c++) {
          const d = dist2(points[i], centers[c]);
          if (d < bestDist) {
            bestDist = d;
            best = c;
          }
        }
        if (labels[i] !== best) {
          labels[i] = best;
          changed = true;
        }
      }
      
      // Update step
      const sums: [number, number][] = new Array(k).fill(0).map(() => [0, 0]);
      const counts = new Array(k).fill(0);
      
      for (let i = 0; i < n; i++) {
        const c = labels[i];
        sums[c][0] += points[i][0];
        sums[c][1] += points[i][1];
        counts[c]++;
      }
      
      for (let c = 0; c < k; c++) {
        if (counts[c] > 0) {
          centers[c] = [sums[c][0] / counts[c], sums[c][1] / counts[c]];
        }
      }
      
      if (!changed) break;
    }
    
    let inertia = 0;
    for (let i = 0; i < n; i++) {
      inertia += dist2(points[i], centers[labels[i]]);
    }
    
    return { labels, centers, inertia };
  }
  
  let best = runOnce();
  for (let t = 1; t < tries; t++) {
    const result = runOnce();
    if (result.inertia < best.inertia) {
      best = result;
    }
  }
  
  return { labels: best.labels, centers: best.centers };
}

// DBSCAN clustering
function dbscan2D(points: [number, number][], eps: number = 0.8, minPts: number = 6) {
  const n = points.length;
  if (n === 0) return { labels: [], centers: [] };
  
  const labels = new Array(n).fill(-1);
  const visited = new Array(n).fill(false);
  
  function dist(a: [number, number], b: [number, number]) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  function regionQuery(i: number) {
    const neighbors: number[] = [];
    for (let j = 0; j < n; j++) {
      if (dist(points[i], points[j]) <= eps) {
        neighbors.push(j);
      }
    }
    return neighbors;
  }
  
  let clusterId = 0;
  
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = true;
    
    const neighbors = regionQuery(i);
    
    if (neighbors.length < minPts) {
      labels[i] = -1; // noise
      continue;
    }
    
    labels[i] = clusterId;
    const seeds = [...neighbors];
    
    for (let s = 0; s < seeds.length; s++) {
      const idx = seeds[s];
      
      if (!visited[idx]) {
        visited[idx] = true;
        const neighbors2 = regionQuery(idx);
        if (neighbors2.length >= minPts) {
          seeds.push(...neighbors2);
        }
      }
      
      if (labels[idx] === -1 || labels[idx] === undefined) {
        labels[idx] = clusterId;
      }
    }
    
    clusterId++;
  }
  
  // Compute cluster centers
  const centers: [number, number][] = [];
  for (let c = 0; c < clusterId; c++) {
    let sx = 0, sy = 0, cnt = 0;
    for (let i = 0; i < n; i++) {
      if (labels[i] === c) {
        sx += points[i][0];
        sy += points[i][1];
        cnt++;
      }
    }
    centers.push(cnt ? [sx / cnt, sy / cnt] : [0, 0]);
  }
  
  return { labels, centers };
}

export async function runUMAP(
  matrix: number[][],
  params: {
    umap?: UMAPParams;
    cluster?: ClusterParams;
    standardize?: boolean;
  } = {},
  onProgress?: (message: string) => void
): Promise<{
  embedding: [number, number][];
  labels: number[] | null;
  centers: [number, number][] | null;
}> {
  const { umap: umapParams = {}, cluster: clusterParams = {}, standardize: doStandardize = true } = params;
  
  onProgress?.('Preparing data...');
  
  // Standardize if requested
  let processedMatrix = matrix;
  if (doStandardize) {
    processedMatrix = standardize(matrix);
  }
  
  // Run UMAP
  const nNeighbors = umapParams.nNeighbors || 15;
  const minDist = umapParams.minDist || 0.1;
  const nEpochs = umapParams.nEpochs || 400;
  
  onProgress?.(`Running UMAP with nNeighbors=${nNeighbors}, minDist=${minDist}, nEpochs=${nEpochs}...`);
  
  const UMAPClass = await loadUMAP();
  const umap = new UMAPClass({
    nComponents: 2,
    nNeighbors,
    minDist,
    nEpochs,
  });
  
  const embedding = await umap.fitAsync(processedMatrix, (epochNumber: number) => {
    if (epochNumber % 50 === 0) {
      onProgress?.(`UMAP epoch ${epochNumber}/${nEpochs}...`);
    }
  });
  
  // Normalize embedding
  const xs = embedding.map((p: number[]) => p[0]);
  const ys = embedding.map((p: number[]) => p[1]);
  
  const meanX = xs.reduce((s: number, v: number) => s + v, 0) / xs.length;
  const meanY = ys.reduce((s: number, v: number) => s + v, 0) / ys.length;
  
  const stdX = Math.sqrt(xs.reduce((s: number, v: number) => s + (v - meanX) ** 2, 0) / Math.max(1, xs.length - 1)) || 1;
  const stdY = Math.sqrt(ys.reduce((s: number, v: number) => s + (v - meanY) ** 2, 0) / Math.max(1, ys.length - 1)) || 1;
  
  const normalizedEmbedding: [number, number][] = embedding.map((p: number[]) => [
    (p[0] - meanX) / stdX,
    (p[1] - meanY) / stdY,
  ]);
  
  // Clustering
  let labels: number[] | null = null;
  let centers: [number, number][] | null = null;
  
  const method = clusterParams.method || 'kmeans';
  
  if (method === 'kmeans') {
    onProgress?.('Running k-means clustering...');
    const k = clusterParams.k || 5;
    const result = kmeans2D(normalizedEmbedding, k, clusterParams.maxIter || 100, clusterParams.tries || 5);
    labels = result.labels;
    centers = result.centers;
  } else if (method === 'dbscan') {
    onProgress?.('Running DBSCAN clustering...');
    const eps = clusterParams.eps || 0.8;
    const minPts = clusterParams.minPts || 6;
    const result = dbscan2D(normalizedEmbedding, eps, minPts);
    labels = result.labels;
    centers = result.centers;
  }
  
  onProgress?.('Complete!');
  
  return {
    embedding: normalizedEmbedding,
    labels,
    centers,
  };
}
