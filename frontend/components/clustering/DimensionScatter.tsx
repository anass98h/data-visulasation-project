"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScatterPoint } from "@/types/clustering";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface DimensionScatterProps {
  points: ScatterPoint[];
  selectedCluster?: number | null;
  onSelectCluster?: (cluster: number | null) => void;
  reductionMethod?: "tsne" | "umap";
}

const DimensionScatter: React.FC<DimensionScatterProps> = ({
  points,
  selectedCluster,
  onSelectCluster,
  reductionMethod = "tsne",
}) => {
  const data = useMemo(() => {
    if (!points || points.length === 0) return [] as any[];

    // Group by cluster id (undefined -> -1)
    const groups = new Map<number, ScatterPoint[]>();
    points.forEach((p) => {
      const key = typeof p.cluster === "number" ? p.cluster : -1;
      const arr = groups.get(key) || [];
      arr.push(p);
      groups.set(key, arr);
    });

    const palette = [
      "#60a5fa",
      "#f87171",
      "#34d399",
      "#fbbf24",
      "#a78bfa",
      "#f472b6",
      "#22d3ee",
      "#fb7185",
      "#4ade80",
      "#f59e0b",
    ];

    const traces: any[] = [];
    Array.from(groups.entries()).forEach(([clusterId, pts]) => {
      const color =
        clusterId === -1 ? "#9ca3af" : palette[clusterId % palette.length];
      traces.push({
        x: pts.map((p) => p.x),
        y: pts.map((p) => p.y),
        mode: "markers",
        type: "scattergl",
        name: clusterId === -1 ? "unclustered" : `cluster ${clusterId}`,
        marker: {
          size: 8,
          color,
          opacity:
            selectedCluster == null || selectedCluster === clusterId
              ? 0.9
              : 0.25,
        },
        text: pts.map((p) => `R${p.roundNum ?? "?"} • ${p.team ?? "?"}`),
        hoverinfo: "text",
      });
    });
    return traces;
  }, [points, selectedCluster]);

  const layout: any = useMemo(
    () => ({
      paper_bgcolor: "#1f2937",
      plot_bgcolor: "#111827",
      margin: { l: 40, r: 20, t: 10, b: 40 },
      xaxis: {
        showgrid: true,
        gridcolor: "#374151",
        zeroline: false,
        color: "#e5e7eb",
      },
      yaxis: {
        showgrid: true,
        gridcolor: "#374151",
        zeroline: false,
        color: "#e5e7eb",
      },
      legend: { font: { color: "#e5e7eb" } },
      height: 360,
    }),
    []
  );

  const methodLabel = reductionMethod === "umap" ? "UMAP" : "t‑SNE";

  return (
    <Card className="bg-gray-800 border border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg text-gray-200">
          {methodLabel} Scatter
        </CardTitle>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <div className="h-[360px] flex items-center justify-center text-gray-400 text-sm">
            No data yet — click Run in Controls to populate a placeholder.
          </div>
        ) : (
          <Plot
            data={data}
            layout={layout}
            config={{ displayModeBar: false }}
            onClick={(ev: any) => {
              if (!onSelectCluster) return;
              const traceIndex: number | undefined =
                ev?.points?.[0]?.curveNumber;
              if (traceIndex == null) return;
              const traceName: string | undefined = (data[traceIndex] as any)
                ?.name;
              if (!traceName) return;
              if (traceName === "unclustered") {
                onSelectCluster(-1);
              } else {
                const m = traceName.match(/cluster\s+(\d+)/i);
                const cid = m ? Number(m[1]) : null;
                if (cid != null) onSelectCluster(cid);
              }
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default DimensionScatter;
