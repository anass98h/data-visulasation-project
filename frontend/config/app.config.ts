"use client";

/**
 * Application-wide configuration constants
 */

export const APP_CONFIG = {
  /**
   * Data file paths (relative to public directory for client-side fetch)
   */
  DATA_PATHS: {
    MATCH_DATA: "/match_data.json",
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
