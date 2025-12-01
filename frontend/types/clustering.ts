export type Team = "CT" | "T";

export interface PlayerPos {
  x: number;
  y: number;
  steamId?: string;
  name?: string;
}

export interface Snapshot {
  roundNum: number;
  team: Team;
  timepoint: number; // seconds after freeze end
  players: PlayerPos[]; // ordered by angle around team centroid
  economy: { ctStart: number; tStart: number; ctEquip: number; tEquip: number };
  mapName: string;
}

export interface Representative {
  players: PlayerPos[]; // 5 positions representing the cluster setup
  team: Team;
  timepoint: number;
}

export interface ScatterPoint {
  x: number;
  y: number;
  cluster?: number;
  roundNum?: number;
  originalRoundNum?: number; // NEW
  team?: Team;
  timepoint?: number;
  demoId?: string; // NEW
  demoIndex?: number; // NEW
  uniqueRoundId?: string; // NEW
  demoName?: string; // NEW
}

export interface WorkerRequest {
  type: "run";
  matrix: number[][]; // feature matrix
  params?: Record<string, any>;
}

export interface WorkerResponse {
  type: "result" | "error" | "log";
  embedding?: [number, number][];
  labels?: number[];
  message?: string;
  error?: string;
}
