"use client";

export const DEFAULT_TIMEPOINTS = [15, 30, 45, 60, 75] as const;

// Default parameters for t-SNE
export const DEFAULT_TSNE_PARAMS = {
  perplexity: 10,
  learningRate: 200,
  iterations: 1500,
  earlyExaggeration: 4.0,
} as const;

// Default parameters for UMAP
export const DEFAULT_UMAP_PARAMS = {
  nNeighbors: 15,
  minDist: 0.1,
  nEpochs: 400,
  nComponents: 2,
} as const;

export const MAP_CONFIG = {
  de_ancient: {
    minX: -2953,
    maxX: 2119,
    minY: -2887,
    maxY: 1983,
    radarImage: "/radar_images/de_ancient_radar_psd.png",
  },
  de_mirage: {
    minX: -3230,
    maxX: 1890,
    minY: -3407,
    maxY: 1713,
    radarImage: "/radar_images/de_mirage_radar_psd.png",
  },
} as const;

export const TEAM_COLORS = {
  CT_MAIN: "#2563eb",
  T_MAIN: "#dc2626",
} as const;

export type MapKey = keyof typeof MAP_CONFIG;

