"use client";

/**
 * Auto-tuning utilities for dimensionality reduction and clustering parameters
 */

export type DataCharacteristics = {
  nSamples: number;
  nFeatures: number;
  estimatedDensity?: number;
};

/**
 * Suggest optimal t-SNE parameters based on data characteristics
 */
export function suggestTSNEParams(data: DataCharacteristics) {
  const { nSamples, nFeatures } = data;
  
  // Perplexity: typically 5-50, should be less than n_samples
  // Rule of thumb: 5-50, with 30 being a good default
  // For small datasets, use lower perplexity
  let perplexity: number;
  if (nSamples < 30) {
    perplexity = Math.max(5, Math.floor(nSamples / 3));
  } else if (nSamples < 100) {
    perplexity = 15;
  } else if (nSamples < 500) {
    perplexity = 30;
  } else {
    perplexity = 50;
  }
  
  // Learning rate: 10-1000, typically 100-200
  // Higher for larger datasets
  const learningRate = nSamples < 100 ? 100 : 200;
  
  // Iterations: more for larger datasets
  let iterations: number;
  if (nSamples < 100) {
    iterations = 1000;
  } else if (nSamples < 500) {
    iterations = 1500;
  } else {
    iterations = 2000;
  }
  
  return {
    perplexity,
    learningRate,
    iterations,
    earlyExaggeration: 4.0,
    confidence: calculateConfidence(nSamples, 'tsne'),
  };
}

/**
 * Suggest optimal UMAP parameters based on data characteristics
 */
export function suggestUMAPParams(data: DataCharacteristics) {
  const { nSamples, nFeatures } = data;
  
  // nNeighbors: typically 5-100
  // Smaller values = more local structure, larger = more global
  // Rule: sqrt(n_samples) capped between 15-50
  let nNeighbors: number;
  const sqrtN = Math.sqrt(nSamples);
  if (nSamples < 50) {
    nNeighbors = Math.max(5, Math.min(15, Math.floor(nSamples / 3)));
  } else {
    nNeighbors = Math.max(15, Math.min(50, Math.floor(sqrtN)));
  }
  
  // minDist: 0.0-0.99
  // Smaller = tighter clusters, larger = more dispersed
  // Default 0.1 works well for most cases
  const minDist = 0.1;
  
  // nEpochs: more for larger datasets
  let nEpochs: number;
  if (nSamples < 100) {
    nEpochs = 200;
  } else if (nSamples < 500) {
    nEpochs = 400;
  } else {
    nEpochs = 500;
  }
  
  return {
    nNeighbors,
    minDist,
    nEpochs,
    nComponents: 2,
    confidence: calculateConfidence(nSamples, 'umap'),
  };
}

/**
 * Suggest optimal k for k-means using elbow method heuristic
 */
export function suggestKMeansK(data: DataCharacteristics) {
  const { nSamples } = data;
  
  // Rule of thumb: k = sqrt(n/2)
  const ruleSqrt = Math.floor(Math.sqrt(nSamples / 2));
  
  // Cap between 3 and 12 for practical visualization
  const k = Math.max(3, Math.min(12, ruleSqrt));
  
  // Suggest a range to try
  const minK = Math.max(2, k - 2);
  const maxK = Math.min(15, k + 3);
  
  return {
    k,
    suggestedRange: { min: minK, max: maxK },
    maxIter: 100,
    tries: 5,
    confidence: calculateConfidence(nSamples, 'kmeans'),
  };
}

/**
 * Suggest optimal DBSCAN parameters using heuristics
 */
export function suggestDBSCANParams(data: DataCharacteristics & { embedding?: [number, number][] }) {
  const { nSamples, embedding } = data;
  
  // minPts: typically 2*dimensions or more
  // For 2D visualization, start with 4-6
  const minPts = nSamples < 50 ? 4 : 6;
  
  // eps: estimated from k-distance graph
  // Without running k-distance, use heuristic based on sample size
  let eps: number;
  
  if (embedding && embedding.length > 0) {
    // Calculate average distance to 4th nearest neighbor as heuristic
    eps = estimateEpsFromEmbedding(embedding, minPts);
  } else {
    // Fallback heuristic
    if (nSamples < 50) {
      eps = 1.2;
    } else if (nSamples < 200) {
      eps = 0.8;
    } else {
      eps = 0.5;
    }
  }
  
  return {
    eps,
    minPts,
    suggestedEpsRange: { min: eps * 0.5, max: eps * 2 },
    confidence: calculateConfidence(nSamples, 'dbscan'),
  };
}

/**
 * Estimate optimal eps for DBSCAN from embedding
 */
function estimateEpsFromEmbedding(embedding: [number, number][], k: number): number {
  const n = embedding.length;
  const kDistances: number[] = [];
  
  // For each point, find distance to kth nearest neighbor
  for (let i = 0; i < Math.min(n, 100); i++) { // Sample first 100 points for speed
    const distances: number[] = [];
    
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const dx = embedding[i][0] - embedding[j][0];
      const dy = embedding[i][1] - embedding[j][1];
      distances.push(Math.sqrt(dx * dx + dy * dy));
    }
    
    distances.sort((a, b) => a - b);
    if (distances.length >= k) {
      kDistances.push(distances[k - 1]);
    }
  }
  
  // Use median of k-distances as eps estimate
  kDistances.sort((a, b) => a - b);
  const median = kDistances[Math.floor(kDistances.length / 2)] || 0.8;
  
  // Round to 2 decimal places
  return Math.round(median * 100) / 100;
}

/**
 * Calculate confidence score for suggestions (0-1)
 */
function calculateConfidence(nSamples: number, method: string): number {
  // Higher confidence with more samples
  if (nSamples < 20) return 0.5;
  if (nSamples < 50) return 0.6;
  if (nSamples < 100) return 0.7;
  if (nSamples < 300) return 0.8;
  return 0.9;
}

/**
 * Compute elbow score for k-means to help find optimal k
 * This runs k-means for multiple k values and returns scores
 */
export function computeElbowScores(
  embedding: [number, number][],
  kRange: number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10]
): { k: number; score: number }[] {
  const scores: { k: number; score: number }[] = [];
  
  for (const k of kRange) {
    const inertia = computeKMeansInertia(embedding, k);
    scores.push({ k, score: inertia });
  }
  
  return scores;
}

/**
 * Simple k-means inertia calculation
 */
function computeKMeansInertia(points: [number, number][], k: number): number {
  const n = points.length;
  if (n === 0) return 0;
  
  // Simple k-means++ initialization
  const centers: [number, number][] = [];
  centers.push(points[Math.floor(Math.random() * n)]);
  
  while (centers.length < k) {
    const dists = points.map(p => {
      let minDist = Infinity;
      for (const c of centers) {
        const dx = p[0] - c[0];
        const dy = p[1] - c[1];
        const d = dx * dx + dy * dy;
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
  
  // Assign points and compute inertia
  let inertia = 0;
  for (const p of points) {
    let minDist = Infinity;
    for (const c of centers) {
      const dx = p[0] - c[0];
      const dy = p[1] - c[1];
      const d = dx * dx + dy * dy;
      if (d < minDist) minDist = d;
    }
    inertia += minDist;
  }
  
  return inertia;
}

/**
 * Suggest best reduction method based on data characteristics
 */
export function suggestReductionMethod(data: DataCharacteristics): {
  method: 'tsne' | 'umap';
  reason: string;
  confidence: number;
} {
  const { nSamples, nFeatures } = data;
  
  // UMAP is generally better for:
  // - Larger datasets (>500 samples)
  // - Preserving global structure
  // - Faster computation
  
  // t-SNE is better for:
  // - Smaller datasets
  // - Fine-grained local structure
  // - Well-established method
  
  if (nSamples > 500) {
    return {
      method: 'umap',
      reason: 'UMAP handles large datasets more efficiently and preserves global structure',
      confidence: 0.8,
    };
  } else if (nSamples > 200) {
    return {
      method: 'umap',
      reason: 'UMAP provides good balance of speed and quality for medium datasets',
      confidence: 0.7,
    };
  } else {
    return {
      method: 'tsne',
      reason: 't-SNE excels at revealing local structure in smaller datasets',
      confidence: 0.7,
    };
  }
}

/**
 * Suggest best clustering method
 */
export function suggestClusteringMethod(data: DataCharacteristics & { hasNoise?: boolean }): {
  method: 'kmeans' | 'dbscan';
  reason: string;
  confidence: number;
} {
  const { nSamples, hasNoise } = data;
  
  // DBSCAN is better when:
  // - Expecting noise/outliers
  // - Clusters have arbitrary shapes
  // - Don't know number of clusters
  
  // K-means is better when:
  // - Know approximate number of clusters
  // - Clusters are roughly spherical
  // - Want consistent cluster sizes
  
  if (hasNoise) {
    return {
      method: 'dbscan',
      reason: 'DBSCAN handles noise and outliers effectively',
      confidence: 0.8,
    };
  } else if (nSamples < 100) {
    return {
      method: 'kmeans',
      reason: 'K-means provides clear cluster boundaries for smaller datasets',
      confidence: 0.75,
    };
  } else {
    return {
      method: 'kmeans',
      reason: 'K-means is efficient and produces consistent results',
      confidence: 0.7,
    };
  }
}
