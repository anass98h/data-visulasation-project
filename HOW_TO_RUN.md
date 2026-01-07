# How to Run the Project

This guide explains how to set up and run both the **Frontend** and **Backend** services for the CS2 Visual Analytics System.

## Prerequisites

- **Node.js** (v22 recommended)
- **Python** (v3.9 or higher)
- **npm** (comes with Node.js)

---

## 1. Backend Setup (FastAPI)

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

---

## 2. Frontend Setup (Next.js)

The frontend is the user interface where you can upload demos and visualize data.

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

---

## 3. Usage

1. Open your browser and visit `http://localhost:3000`.
2. **Upload a Demo**: Click the upload area to select a `.dem` file (Counter-Strike 2 replay).
3. **Wait for Parsing**: The file acts locally (WASM) and extracts data.
4. **Explore**:
   - **Dashboard**: View the heatmap and replay.
   - **Clustering**: Switch to the analysis view to see round clusters.

## Troubleshooting

- **Backend Connection Error**: Ensure the backend is running on port `8000`.
- **WASM Errors**: If the parser fails, ensure you are using a modern browser.
- **Dependencies**: If `pip install` fails, make sure you have the latest `pip` (`pip install --upgrade pip`).
