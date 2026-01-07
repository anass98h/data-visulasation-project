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
  - Go toolchain matching `demoParser/go.mod`


## Getting Started

> [!NOTE]
> This project consists of two parts: a **Frontend** (Next.js) for visualization and a **Backend** (FastAPI) for data storage and processing. You must run both.

### Prerequisites
- **Node.js** (v22 recommended)
- **Python** (v3.9 or higher)
- **npm** (comes with Node.js)

### 1. Backend Setup (FastAPI)
The backend handles data storage, heatmap generation, and API requests.

1. **Open a terminal** and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. **Create a virtual environment** (recommended to isolate dependencies):
   ```bash
   python3 -m venv venv
   ```

3. **Activate the virtual environment**:
   - **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```
   - **Windows**:
     ```bash
     venv\Scripts\activate
     ```

4. **Install dependencies**:
   The `requirements.txt` file is located in the project root.
   ```bash
   pip install -r ../requirements.txt
   ```

5. **Run the server**:
   Start the FastAPI server using `uvicorn`.
   ```bash
   python -m uvicorn app.main:app --reload
   ```
   - The backend will start at `http://localhost:8000`.
   - API Docs available at: `http://localhost:8000/docs`.


### 2. Frontend Setup (Next.js)
The frontend provides the UI for uploading demos and visualizing data.

1. **Open a new terminal** and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```
   - The frontend will start at `http://localhost:3000`.



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


## Usage
1. Open your browser and visit `http://localhost:3000`.
2. **Upload a Demo**: Click the upload area to select a `.dem` file (Counter-Strike 2 replay).
3. **Wait for Parsing**: The parser runs locally (WASM) to extract data, then sends it to the backend for storage.
4. **Explore**:
   - **Dashboard**: View heatmaps and playback.
   - **Clustering**: Switch to the analysis view to see round clusters.

> **Note on Parsing**: Parsing is performed client-side via WebAssembly to respect privacy and bandwidth, but the extracted numerical data is sent to the backend for aggregation.





## Rebuilding the WASM Parser (advanced)
- Source module: `demoParser` (Go)
- Build command:
  ```bash
  GOOS=js GOARCH=wasm go build -o demo_processor.wasm main.go
  ```
- Artifacts used by the frontend: `frontend/public/demo_processor.wasm` and `frontend/public/wasm_exec.js`