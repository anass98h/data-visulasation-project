"use client";

export const DEFAULT_TIMEPOINTS = [15, 30, 45, 60, 75] as const;

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

