# Data Visualization Project

A monorepo for a browser-based Counter‑Strike 2 demo visualization tool. The frontend is a Next.js (React + TypeScript) app that parses .dem files fully client-side via a WebAssembly module compiled from Go. It exposes interactive charts (D3/Plotly) and utility UI components.

The project currently focuses on a Demo Parser UI that lets you upload a CS2 .dem file and download parsed results as JSON or CSV. Additional pages include dashboards and distribution visualizations.


## Tech Stack
- Language/runtime: TypeScript + JavaScript on Node.js 22 (pinned via mise)
- Frontend framework: Next.js 15 (App Router) with React 19
- Styling: Tailwind CSS v4
- Visualization: D3, Plotly.js, react-plotly.js
- WASM: Go-based parser compiled to WebAssembly
- Package manager: npm (package-lock.json present)
- Lint/format: Biome


## Requirements
- Node.js 22 (recommended to use mise for toolchain management)
  - If using mise (optional): this repo includes `mise.toml` with `node = "22"`
- npm 10+ (bundled with Node 22)
- Modern browser with WASM support (for running the parser client-side)
- Optional for development of the WASM module:
  - Go toolchain matching `demoParser/go.mod` (declares `go 1.25`) — TODO: confirm exact version used to compile the existing `demo_processor.wasm` and document rebuild steps


## Getting Started
This repo’s runnable app lives under the `frontend` directory.

1) Install dependencies
- Using npm
  - cd frontend
  - npm install

2) Run the development server
- npm run dev
- Open http://localhost:3000 in your browser.

3) Build for production
- npm run build
- npm start (starts the Next.js production server)


## Scripts (frontend/package.json)
- dev: Start Next.js in development mode
- build: Build the Next.js app for production
- start: Start the Next.js production server
- lint: Run Biome checks
- format: Format code with Biome

Usage examples:
- npm run dev
- npm run build && npm start
- npm run lint
- npm run format


## Environment Variables
- None required for local development discovered.
- No .env files were found, and `next.config.ts` is empty.
- TODO: Document any variables if introduced later (e.g., NEXT_PUBLIC_* keys).


## Entry Points and App Structure
- Next.js App Router
  - frontend/app/page.tsx → renders DemoParser component (default home page)
  - Additional routes:
    - frontend/app/dashboard/page.tsx → renders CS2ClusteringViz
    - frontend/app/distribution/page.tsx → distribution visualizations
- Main components
  - frontend/components/DemoParser.tsx
    - Provides UI to upload a .dem file
    - Spawns a Web Worker that loads `public/wasm_exec.js` and `public/demo_processor.wasm`
    - Produces structured parse results and offers JSON/CSV download
  - frontend/components/distribution/* → charts and UI for distribution views
  - frontend/components/ui/* → shared UI primitives (button, card, input, select, alert)
- Config and libs
  - frontend/config/app.config.ts → app-level config constants
  - frontend/lib/utils.ts → UI helpers
- Static assets
  - frontend/public/demo_processor.wasm → Go-compiled WASM parser
  - frontend/public/wasm_exec.js → Go WASM runtime helper
  - frontend/public/radar_images/* → images

Top-level repository layout:
- frontend/ → Next.js app
- demoParser/ → Go module source and artifacts for the demo parser (includes demo_processor.wasm and wasm_exec.js)
- utils/ → sample data (e.g., utils/sample.json)
- mise.toml → toolchain pinning for Node
- README.md → this file


## Using the Demo Parser
1) Start the dev server (npm run dev) and open http://localhost:3000.
2) Upload a Counter-Strike 2 `.dem` file using the UI.
3) Wait for processing; the page will show summary data.
4) Optional: Download parsed results as JSON or CSV for various event types (kills, damages, ticks, grenades).

Notes:
- Parsing is performed entirely in the browser using WebAssembly; large demos may take time and consume memory.
- The parser uses a Web Worker to avoid blocking the UI.


## Rebuilding the WASM Parser (advanced)
- Source module: demoParser (Go), with dependency `github.com/markus-wa/demoinfocs-golang/v4`
- Artifacts used by the frontend: `frontend/public/demo_processor.wasm` and `frontend/public/wasm_exec.js`
- TODO: Add exact build command(s) and Go version used to generate the current WASM. Example (to be confirmed):
  - GOOS=js GOARCH=wasm go build -o frontend/public/demo_processor.wasm ./demoParser
  - Copy or link the correct Go-provided wasm_exec.js to frontend/public/wasm_exec.js


## Testing
- No test suite was found in this repository at the time of writing.
- TODO: Add unit/integration tests and document how to run them (e.g., via Vitest/Jest/Playwright or Next.js testing recipes).


## Project Structure (summary)
- frontend/
  - app/
    - page.tsx (home → DemoParser)
    - dashboard/page.tsx
    - distribution/page.tsx
    - globals.css
  - components/
    - DemoParser.tsx
    - CS2ClusteringViz.jsx
    - distribution/
      - dropdown.tsx, lineChart.tsx, economy.tsx
    - ui/
      - alert.tsx, button.tsx, card.tsx, input.tsx, select.tsx
  - config/app.config.ts
  - lib/utils.ts
  - next.config.ts
  - package.json, package-lock.json
  - public/
    - demo_processor.wasm, wasm_exec.js, radar_images/*, vercel.svg
- demoParser/
  - go.mod, wasm_exec.js, demo_processor.wasm (source/artifacts)
- utils/
  - sample.json
- mise.toml


## Package Manager and Tooling
- npm is used for the frontend (package-lock.json present)
- Biome for linting/formatting: `npm run lint`, `npm run format`
- Node.js version is pinned via mise (optional usage):
  - Install mise, then run `mise install` at repo root to ensure Node 22


## Known Issues and TODOs
- TODO: Document exact steps and Go version to rebuild the WASM parser
- TODO: Add tests and CI workflow
- TODO: Add a LICENSE file and declare the project license
- TODO: Security audit of dependencies; consider removing the placeholder `fs` npm package if unnecessary


## License
- Not specified. TODO: Add a LICENSE file (e.g., MIT) and update this section accordingly.

---

# Project Proposal Summary (Context)

Authors: Gebriel Abebe Fanta (gf222gf@student.lnu.se), Hallak MohamadAnas (hm222ua@student.lnu.se), Hui Ma (hm223ab@student.lnu.se)

Date: October 6, 2025

Note: This section summarizes the accompanying project proposal and connects it to this repository. Where the current codebase does not yet implement parts of the proposal, items are marked as planned/TODO.

## 1. Introduction
Overview: A visual analytics system for multi‑match Counter‑Strike 2 (CS2) analysis. The system aggregates many replays to reveal spatiotemporal patterns in team positioning, utility usage, timing, and outcomes. Unlike single‑match tools, this approach integrates multiple matches into coordinated visual summaries (minimap overlays, timelines, player panels) and ties them to computation (clustering/classification) for reproducible cross‑match reasoning.

Data sources (planned + partial in repo):
- Match replays (.dem): Parsed locally in the browser via WebAssembly (see Demo Parser UI in this repo). Seed bundle of pre‑parsed matches is planned. Users can upload demos; derived artifacts (positions at ~1 Hz, utility events) are used for analysis.
- Minimap assets: Overhead images to register coordinates per map. Some radar images already exist under frontend/public/radar_images.
- Player performance metadata: Per‑player, per‑map stats (e.g., Rating 2.0, ADR, KAST, impact, opening‑duel metrics). Planned; not implemented yet in this repo. TODO.

What the data represents: Rounds on a map and side (CT/T) with timestamped positions (x, y), utility events (HE, flash, smoke, molly), and outcomes. Coordinates are aligned to a per‑map minimap transform.

## 2. Motivation
Problem: Most tools analyze one match at a time; cross‑match pattern discovery is manual, time‑consuming, and error‑prone. Our system surfaces recurring patterns directly and reduces analyst effort.

Value:
- Pattern discovery across matches (fast hits, defaults, late executes, etc.) with frequency/context.
- Decision support via links between spatial/utility patterns and outcomes/player form.
- Human‑in‑the‑loop analytics: analysts steer parameters (sampling, clustering, smoothing) and recompute to test hypotheses.
- Generalizable blueprint for other esports or sports scenarios with positional logs.

## 3. Data Report (planned scope v1)
Planned seed dataset scale (to be confirmed after parsing):
- Matches & maps: 7 best‑of‑three series → roughly 14–21 maps.
- Rounds: ≈ 336–504 regulation rounds (OT extra).
- Players: ≈ 40.
- Row counts (order‑of‑magnitude):
  - Positions (player‑tick, downsampled ~1–6 Hz effective): ≈ 0.42M – 2.42M rows.
  - Utility events: ≈ 4,000 – 10,000 rows.
  - Rounds/meta: 336 – 504 rows; Matches: 7; Maps: 14 – 21; Player perf (player‑map): ≈ 200 – 280 rows.

Feature tables (planned):
- Positions: round_id, t_s, player_id, side, x, y.
- Utility: round_id, type ∈ {he, flash, smoke, molly}, t_s, x, y, duration_s (when derivable).
- Rounds/meta: match_id, map_id, round_id, round_no, side_start, winner.
- Player performance: player_id, map_id, rating2/2.1, adr, kast, impact, opening duel metrics, sample_n.

Cleaning & QC (planned):
- Downsample every 10th tick; omit z; remove warmup.
- Normalize team/map names; validate coordinate bounds; compute smoke/molly durations when possible.
- Drop corrupt ticks; enforce monotonic time within rounds; de‑duplicate events; log missing fields.

Planned figures: histograms/KDEs (ADR, KAST, rating), 2D heatmaps (positions & utility), temporal profiles (utility‑per‑second, alive‑players over time), round‑level distributions.

## 4. Research Questions and Goals
Key questions:
1) Map & side habits (preferred sites, defaults, early control). 2) Timing/pace (fast vs slow; opponent/scoreline effects). 3) Utility patterns and their links to success. 4) Trading and spacing. 5) Opponent adjustments. 6) Player form over time. 7) Strategy mixtures via clustering.

Goals for the tool:
- Make patterns obvious (minimap overlays, timelines, mixture bars).
- Integrate proven methods (similarity, win‑probability) with clear visuals.
- Counter‑strat evidence cards per opponent.
- Human controls (match filters, time windows, clustering params).
- Player trend views (ADR, opening duels, etc.).

## 5. Solution Design (planned UI and analytics)
Visualizations & interactions:
- Minimap heat layers for positions and utility footprints; duration‑aware rendering for smokes/molotovs, pop events for flashes/HE.
- Scrollable, brushable timeline of rounds with filters and anchors (pistol, gun, OT).
- Player performance lines/areas with early/late trend markers.
- Strategy mixture view: small‑multiple minimaps per discovered tactic cluster.
- Human‑in‑the‑loop controls: clustering knobs (algorithm, k or ε/minPts, seed), sampling rate, spatial grid/regions, temporal windows, feature weights.

Advanced methods (planned):
- Round similarity search (occupancy + utility embeddings) inspired by ggviz.
- Economy context and Optimal Spending Error diagnostics (win‑probability model).
- Automatic tactic labeling (baselines → optional GNN when enabled and data permits).
- Action valuation/explanations via temporal heterogeneous GNN concepts.

## 6. Clustering Details (planned)
Two modes via a UI toggle: T‑side and CT‑side.
- T‑side discovers site preference, timing patterns, and utility coordination.
- CT‑side discovers setup patterns, rotations, and retake strategies.

Features per round (normalized [0,1]):
- T‑side (10): spatial (avg position @15s, spread, players per zone), temporal (time to first utility/engagement/plant), utility (counts by window, ratios).
- CT‑side (10): spatial (setup spread, players per site, mid presence), temporal (time to first rotation, retake timing), utility (defensive usage, retake reserves).

Algorithms:
- Primary: K‑means (k = 3–5 default, adjustable 2–8) for speed/interpretability.
- Alternative: DBSCAN (eps, min_samples) for irregular patterns and outliers.

Labeling workflow (assisted):
1) Characterize clusters (dominant site, timing, utility intensity, win rate). 2) Suggest labels by rules (e.g., Fast A Rush, Default Setup, B Execute). 3) Analyst can override.

Artifacts: Store cluster assignments, centroids/params, and timestamps for reproducibility. TODO: Define storage locations.

## 7. Interactive Controls and Recompute Triggers (planned)
- Match filtering (opponents, maps, date ranges) → recompute aggregates and clusters; update minimap, timeline, mixture bars, trends.
- Clustering params (k, algorithm, seed) → re‑run clustering only.
- Feature engineering (spatial grid, temporal smoothing, weights) → recompute features then re‑cluster.
- Long operations run async; UI shows last stable result and progress. TODO: Implement progress UI.

## 8. Implementation & Architecture (planned)
Current repo status vs target:
- Client (React/Next.js/TS): Present. Contains a Demo Parser that runs Go‑WASM in a Web Worker. Uses Plotly/D3 and Tailwind for UI. IndexedDB cache is planned. TODO.
- Backend (FastAPI + DuckDB/Polars + scikit‑learn/XGBoost + optional PyTorch): Planned. Not present in this repo. TODO to scaffold API endpoints such as /aggregate, /utility_density, /cluster, /similar, /classify, /winprob, /player_stats.
- Storage & formats: Planned Parquet/Arrow partitions and model artifacts. Currently, only frontend/public assets and local parsing exist. TODO.

Security & data handling: Default privacy (browser‑side parsing of demos); only derived features uploaded in future backend phase. HLTV usage would require server‑side caching and rate limits. TODO.

DevOps: Planned Docker compose for API + worker + DB; CI with lint/tests and bundle‑size checks. Current state: frontend uses Biome; no CI or tests. TODO.

## 9. Validation & Failure Handling (planned)
Quantitative: silhouette score, within‑cluster variance, per‑cluster win rates.
Qualitative: coach review, temporal stability across subsets.
Failure handling guidelines: adjust k/params when clusters are too few/many/imbalanced.

## 10. Responsibilities and Tasks (Preliminary)
All team members contribute across data, backend/ML, frontend/visualization, and evaluation/reporting; work completed collaboratively, section by section.

## 11. References
- [1] Björklund, A. Predicting the outcome of CS:GO games using machine learning. Master’s thesis, Chalmers, 2018. https://publications.lib.chalmers.se/records/fulltext/256129/256129.pdf
- [2] Csapó, S. Predicting Counter‑Strike tactics using graph neural networks. Master’s thesis, Twente, 2025. https://essay.utwente.nl/107599
- [3] Durst et al. Learning to move like professional Counter‑Strike players. arXiv:2408.13934, 2024. https://arxiv.org/abs/2408.13934
- [4] Szmida, P. P., and Toka, L. Evaluating player actions in professional Counter‑Strike using temporal heterogeneous GNNs. MIT Sloan Sports Analytics Conference, 2025. https://www.sloansportsconference.com/research-papers/evaluating-player-actions-in-professional-count
- [5] Xenopoulos, P., Coelho, B., and Silva, C. T. Optimal team economic decisions in Counter‑Strike. arXiv:2109.12990, 2021. https://arxiv.org/abs/2109.12990
- [6] Xenopoulos, P., Rulff, J., and Silva, C. T. ggviz: Accelerating large‑scale esports game analysis. PACM HCI 6(CHI PLAY), 2022. https://dl.acm.org/doi/10.1145/3549501


Note on scope: The sections above capture intent and planned capabilities from the proposal. The current implementation in this repo is primarily the client‑side demo parsing UI. Future work will add the backend, data store, and analytics outlined here.