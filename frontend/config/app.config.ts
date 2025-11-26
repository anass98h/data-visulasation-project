"use client";

/**
 * Application-wide configuration constants
 *
 * ⭐ QUICK SETTINGS FOR PLAYER PERFORMANCE:
 *
 * 1. To change match mode (single vs multiple):
 *    → Go to line 34: MULTI_MATCH_MODE
 *    → Set to `true` for multiple matches, `false` for single match
 *
 * 2. To change chart size:
 *    → Go to line 35: CHART_HEIGHT
 *    → Set the height in pixels (e.g., 50, 100, 200)
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

  /**
   * Player Performance Settings
   *
   * CHANGE THIS TO SWITCH BETWEEN SINGLE AND MULTIPLE MATCH MODE:
   * - MULTI_MATCH_MODE: true  = Load multiple matches (future feature)
   * - MULTI_MATCH_MODE: false = Load single match only (current implementation)
   */
  PLAYER_PERFORMANCE: {
    MULTI_MATCH_MODE: false,  // ⭐ CHANGE THIS: true for multi-match, false for single match
    CHART_HEIGHT: 180,        // ⭐ CHANGE THIS: Chart height in pixels (default: 180px)
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
