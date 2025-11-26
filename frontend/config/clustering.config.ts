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
  ar_baggage: {
    minX: -1316,
    maxX: -1316 + 1024 * 2.539062,
    minY: 1288 - 1024 * 2.539062,
    maxY: 1288,
    radarImage: "/radar_images/ar_baggage_radar_psd.png",
  },
  ar_shoots: {
    minX: -1368,
    maxX: -1368 + 1024 * 2.6875,
    minY: 1952 - 1024 * 2.6875,
    maxY: 1952,
    radarImage: "/radar_images/ar_shoots_radar_psd.png",
  },
  cs_italy: {
    minX: -2647,
    maxX: -2647 + 1024 * 4.6,
    minY: 2592 - 1024 * 4.6,
    maxY: 2592,
    radarImage: "/radar_images/cs_italy_radar_psd.png",
  },
  cs_office: {
    minX: -1838,
    maxX: -1838 + 1024 * 4.1,
    minY: 1858 - 1024 * 4.1,
    maxY: 1858,
    radarImage: "/radar_images/cs_office_radar_psd.png",
  },
  de_ancient: {
    minX: -2953,
    maxX: -2953 + 1024 * 5,
    minY: 2164 - 1024 * 5,
    maxY: 2164,
    radarImage: "/radar_images/de_ancient_radar_psd.png",
  },
  de_anubis: {
    minX: -2796,
    maxX: -2796 + 1024 * 5.22,
    minY: 3328 - 1024 * 5.22,
    maxY: 3328,
    radarImage: "/radar_images/de_anubis_radar_psd.png",
  },
  de_dust2: {
    minX: -2476,
    maxX: -2476 + 1024 * 4.4,
    minY: 3239 - 1024 * 4.4,
    maxY: 3239,
    radarImage: "/radar_images/de_dust2_radar_psd.png",
  },
  de_inferno: {
    minX: -2087,
    maxX: -2087 + 1024 * 4.9,
    minY: 3870 - 1024 * 4.9,
    maxY: 3870,
    radarImage: "/radar_images/de_inferno_radar_psd.png",
  },
  de_mirage: {
    minX: -3230,
    maxX: -3230 + 1024 * 5.0,
    minY: 1713 - 1024 * 5.0,
    maxY: 1713,
    radarImage: "/radar_images/de_mirage_radar_psd.png",
  },
  de_nuke: {
    minX: -3453,
    maxX: -3453 + 1024 * 7,
    minY: 2887 - 1024 * 7,
    maxY: 2887,
    radarImage: "/radar_images/de_nuke_radar_psd.png",
  },
  de_overpass: {
    minX: -4831,
    maxX: -4831 + 1024 * 5.2,
    minY: 1781 - 1024 * 5.2,
    maxY: 1781,
    radarImage: "/radar_images/de_overpass_radar_psd.png",
  },
  de_train: {
    minX: -2308,
    maxX: -2308 + 1024 * 4.082077,
    minY: 2078 - 1024 * 4.082077,
    maxY: 2078,
    radarImage: "/radar_images/de_train_radar_psd.png",
  },
  de_vertigo: {
    minX: -3168,
    maxX: -3168 + 1024 * 4.0,
    minY: 1762 - 1024 * 4.0,
    maxY: 1762,
    radarImage: "/radar_images/de_vertigo_radar_psd.png",
  },
} as const;

export const TEAM_COLORS = {
  CT_MAIN: "#2563eb",
  T_MAIN: "#dc2626",
} as const;

export type MapKey = keyof typeof MAP_CONFIG;
