# CS2 Visual Analytics System
## Project Presentation

---

# Slide 1: Title Slide

**Title:** Visual Analytics System for Multi-Match Counter-Strike 2 (CS2) Analysis

**Subtitle:** Uncovering Spatiotemporal Patterns and Tactics in Esports

**Team Members:**
- Gebriel Abebe Fanta
- Hallak MohamadAnas
- Hui Ma

**Course/Context:** Information Visualization Project / [Date]

---

# Slide 2: The Problem (Motivation)

**Current State of CS2 Analytics:**
- Most tools analyze **single matches** in isolation.
- Identifying **cross-match patterns** (e.g., "Do they always rush B against ECO rounds?") is manual, time-consuming, and error-prone.
- Analysts lack tools to visualize **aggregated behavior** over a series of games.

**The Gap:**
- Need for a system that aggregates multiple replays.
- Need for reproducible, data-driven insights into team positioning, economy, and strategies.

---

# Slide 3: Our Solution (Project Goal)

**Goal:**
- Develop a **Visual Analytics System** for multi-match CS2 analysis.
- **Aggregate** many replays to reveal recurring spatiotemporal patterns.
- **Integrate** computation (Clustering) with interactive Visualization.

**Key Value Proposition:**
- **Pattern Discovery:** Automatically identify standard defaults, fast executes, and economic trends.
- **Decision Support:** Link spatial patterns to round outcomes and player performance.
- **Human-in-the-loop:** Allow analysts to steer the analysis (filter matches, adjust clustering).

---

# Slide 4: System Architecture

**Frontend (Client-Side):**
- **Framework:** Next.js 15 (React 19 + TypeScript).
- **Clustering:** Groups rounds using **K-Means & DBSCAN** entirely in the **browser** (Web Worker) for real-time interactivity.
- **Demo Parsing:** Client-side parsing via **WebAssembly (Go)** to extract events (kills, economy, positions).
- **Visualization:** D3.js & Plotly.js.

**Backend (Python):**
- **Framework:** **FastAPI**.
- **Role:** Full REST API for managing the analytical workflow.
- **Storage:** **SQLite** database for metadata and file storage for parsed demo JSONs.
- **Processing:** On-the-fly generation of **Heatmap Density Grids** from stored match data.

---

# Slide 5: Key Feature - Demo Parsing

**Challenge:** CS2 Demos (`.dem`) are large binary files (often ~500MB).
**Solution:** Client-side parsing using WebAssembly.
- **Compression:** Based on our tests, we reduce file size significantly (e.g., **500MB → ~70MB**) by extracting only relevant events.
- **Efficiency:** Uses a Go-based parser compiled to WASM.
- **Workflow:** 
   1. User uploads `.dem` file.
   2. Browser extracts events via WASM.
   3. Extracted JSON is compressed and sent to the Backend for persistent storage.

---

# Slide 6: Key Feature - Clustering & Tactics

**Objective:** Group similar rounds to identify "Tactics" (e.g., "A Execute", "Default Slow").

**Methodology:**
- **Techniques Used:** **t-SNE** and **UMAP** for dimensionality reduction.
- **Algorithms:** **K-Means** (Speed) & **DBSCAN** (Outlier detection) running in a Web Worker.
- **Features Used:**
  - **Spatial:** Average player positions, team spread/geometry.
  - **Economy:** Team spending and equipment value.
  - **Kills:** Player kill events and trades.

---

# Slide 7: Visualization Components (Maps)

**1. Playback & Heatmap View:**
- **Purpose:** Analyzing aggregate team behavior and watching round replays.
- **Features:**
  - Overlays **Heatmaps** (fetched from Backend API) to show density.
  - Animates player movements tick-by-tick.

**2. Prediction / Cluster View:**
- **Purpose:** Visualizing the "Representative Strategy" of a cluster.
- **Features:**
  - Shows **Predicted Player Positions** (a 5-player setup) that best represents the cluster.
  - Static view to quickly understand the gist of a tactic (e.g., "3A, 2B Setup").

---

# Slide 8: Analytical Components

**3. Dimension Scatter Plot:**
- **Purpose:** Visualizes the structure of the round clusters using **t-SNE** or **UMAP** projections.
- **Features:**
  - Dots represent individual rounds, colored by Cluster ID.
  - Interactive zooming and filtering.
  - **Note:** Focuses on separation of tactics; no map overlay.

**4. Player Performance Tracking:**
- **Purpose:** Visualize individual player impact across matches.
- **Metrics:** Kill contributions, survival rates, and economic efficiency.

---

# Slide 9: Implementation Highlights

- **Client-Side Heavy Lifting:** Interactive Clustering and initial Parsing run in the browser to ensure a responsive UI.
- **Robust Backend API:** Manages the lifecycle of analysis—storing processed demos, managing metadata, and serving aggregated heatmaps on demand.
- **Performance:**
  - **Web Workers:** Used to keep the main thread unblocked.
  - **Data Reduction:** Smart parsing reduces 500MB demos to ~70MB JSONs.
- **Theme:** Modern, Dark-themed UI suitable for gaming analytics.

---

# Slide 10: Demo / Q&A

**Demonstration:**
- [Walk through the live application]
  1. Upload a Demo (parsed in browser, stored in backend).
  2. View the Heatmaps & Replay.
  3. Interactive Clustering (Scatter Plot with t-SNE/UMAP).
  4. View Predicted Strategies on the Map Preview.

**Questions?**
