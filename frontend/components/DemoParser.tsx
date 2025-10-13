"use client";

import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface ParseResult {
  header: {
    mapName: string;
    tickRate: number;
  };
  ticks: any[];
  kills: any[];
  damages: any[];
  grenades: any[];
  bombs: any[];
  rounds: any[];
  players: any[];
}

// Create worker code as a string
const createWorkerCode = () => {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `
    let wasmReady = false;

    const loadWasm = async () => {
      try {
        importScripts('${baseUrl}/wasm_exec.js');
        
        const go = new Go();
        const result = await WebAssembly.instantiateStreaming(
          fetch('${baseUrl}/demo_processor.wasm'),
          go.importObject
        );
        
        go.run(result.instance);
        wasmReady = true;
        self.postMessage({ type: 'ready' });
      } catch (err) {
        self.postMessage({
          type: 'wasm-error',
          error: 'Failed to load WASM: ' + err.message
        });
      }
    };

    loadWasm();

    self.onmessage = async (e) => {
      const { type, buffer, options } = e.data;

      if (type === 'parse') {
        if (!wasmReady) {
          self.postMessage({
            type: 'error',
            error: 'WASM not ready yet'
          });
          return;
        }

        try {
          const uint8Array = new Uint8Array(buffer);
          
          parseDemo(uint8Array, (result) => {
            try {
              const data = JSON.parse(result);
              
              if ('error' in data) {
                self.postMessage({
                  type: 'error',
                  error: data.error
                });
              } else {
                self.postMessage({
                  type: 'result',
                  data: data
                });
              }
            } catch (err) {
              self.postMessage({
                type: 'error',
                error: 'Parse error: ' + err.message
              });
            }
          }, options);
        } catch (err) {
          self.postMessage({
            type: 'error',
            error: 'Processing error: ' + err.message
          });
        }
      }
    };
  `;
};

export default function DemoParser() {
  const [wasmReady, setWasmReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [wasmError, setWasmError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create worker from blob
    const workerCode = createWorkerCode();
    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);

    const wasmWorker = new Worker(workerUrl);

    wasmWorker.onmessage = (e) => {
      const { type, data, error: workerError } = e.data;

      if (type === "ready") {
        setWasmReady(true);
      } else if (type === "result") {
        setParseResult(data);
        setLoading(false);
      } else if (type === "error") {
        setError(workerError);
        setLoading(false);
      } else if (type === "wasm-error") {
        setWasmError(workerError);
      }
    };

    workerRef.current = wasmWorker;

    return () => {
      wasmWorker.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workerRef.current) return;

    console.log("File selected:", file.name);
    setLoading(true);
    setError(null);
    setParseResult(null);

    try {
      const buffer = await file.arrayBuffer();

      workerRef.current.postMessage({
        type: "parse",
        buffer: buffer,
        options: { tickInterval: 10, removeZ: true },
      });
    } catch (err) {
      console.error("File read error:", err);
      setError(
        `Error reading file: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    if (!parseResult) return;

    const blob = new Blob([JSON.stringify(parseResult, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "demo-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (
    dataType: keyof Pick<
      ParseResult,
      "kills" | "damages" | "ticks" | "grenades"
    >
  ) => {
    if (!parseResult || !parseResult[dataType]) return;

    const data = parseResult[dataType];
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row: any) =>
        headers
          .map((header) => {
            const value = row[header];
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demo-${dataType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold">
              CS:2 Demo Parser
            </CardTitle>
            <CardDescription>
              Upload a CS:2 demo file (.dem) to extract and analyze game data
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {wasmError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-1">Setup Required</div>
                  <p className="text-sm">{wasmError}</p>
                </AlertDescription>
              </Alert>
            ) : wasmReady ? (
              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-900 dark:text-green-100">
                  WASM loaded successfully - ready to parse demos
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>Loading WASM module...</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="block">
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer bg-white dark:bg-gray-800">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-300 mb-2 font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    CS:GO demo file (.dem)
                  </p>
                  <Input
                    type="file"
                    accept=".dem"
                    onChange={handleFile}
                    disabled={!wasmReady || loading}
                    className="hidden"
                  />
                </div>
              </label>
            </div>

            {loading && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Parsing demo file... This may take a moment.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {parseResult && (
              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <CardHeader>
                    <CardTitle className="text-xl">Parse Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Map
                        </p>
                        <p className="text-lg font-bold">
                          {parseResult.header?.mapName || "N/A"}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Tick Rate
                        </p>
                        <p className="text-lg font-bold">
                          {parseResult.header?.tickRate || "N/A"}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Total Kills
                        </p>
                        <p className="text-lg font-bold">
                          {parseResult.kills?.length || 0}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Total Rounds
                        </p>
                        <p className="text-lg font-bold">
                          {parseResult.rounds?.length || 0}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Button
                        onClick={downloadJSON}
                        className="w-full"
                        size="lg"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download Full Data (JSON)
                      </Button>

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => downloadCSV("kills")}
                          variant="outline"
                          disabled={!parseResult.kills?.length}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Kills CSV
                        </Button>
                        <Button
                          onClick={() => downloadCSV("damages")}
                          variant="outline"
                          disabled={!parseResult.damages?.length}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Damages CSV
                        </Button>
                        <Button
                          onClick={() => downloadCSV("ticks")}
                          variant="outline"
                          disabled={!parseResult.ticks?.length}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Ticks CSV
                        </Button>
                        <Button
                          onClick={() => downloadCSV("grenades")}
                          variant="outline"
                          disabled={!parseResult.grenades?.length}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Grenades CSV
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {parseResult.players && parseResult.players.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Player Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {parseResult.players
                          .slice(0, 5)
                          .map((player: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                            >
                              <div>
                                <p className="font-semibold">{player.name}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Team {player.team}
                                </p>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <div className="text-center">
                                  <p className="font-bold text-green-600">
                                    {player.kills}
                                  </p>
                                  <p className="text-gray-500">K</p>
                                </div>
                                <div className="text-center">
                                  <p className="font-bold text-red-600">
                                    {player.deaths}
                                  </p>
                                  <p className="text-gray-500">D</p>
                                </div>
                                <div className="text-center">
                                  <p className="font-bold text-blue-600">
                                    {player.assists}
                                  </p>
                                  <p className="text-gray-500">A</p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
