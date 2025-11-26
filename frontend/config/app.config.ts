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

  /**
   * Backend API configuration
   */
  API: {
    BASE_URL: "http://localhost:8000",
    ENDPOINTS: {
      DEMOS: "/demos",
      DEMO: "/demo",
    },
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
