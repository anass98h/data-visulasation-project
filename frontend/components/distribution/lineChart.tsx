"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import * as d3 from "d3";

interface DataSeries {
  x: number[];
  y: number[];
  label: string; // e.g., "Vitality", "The MongolZ"
  color: string; // e.g., "#3b82f6", "#ef4444" (reference color)
  teamId?: number; // Team identifier (1 or 2)
  winners?: number[]; // Array of winner team IDs per round
  sides?: string[]; // Array of "CT" or "T" per round
  lineStyle?: 'solid' | 'dashed'; // Line style
}

interface LineChartProps {
  seriesData?: DataSeries[];
  title?: string;
  description?: string;
  xLabel?: string;
  yLabel?: string;
}

// Side color constants for CT/T
const SIDE_COLORS = {
  CT: '#3b82f6',  // Blue
  T: '#ef4444'    // Red
} as const;

const LineChart: React.FC<LineChartProps> = ({
  seriesData,
  title = "Economy Over Rounds",
  description = "Track economy performance across game rounds",
  xLabel = "Rounds",
  yLabel = "Economy",
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track which teams are active (both active by default)
  const [activeTeams, setActiveTeams] = useState<Set<number>>(new Set([1, 2]));

  // D3-based team filtering function (memoized)
  const updateTeamVisibility = useCallback((activeTeamsSet: Set<number>) => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const duration = 500;
    const easing = d3.easeCubicInOut;

    // Fade team 1 elements
    svg.selectAll(".team-1")
      .transition()
      .duration(duration)
      .ease(easing)
      .style("opacity", activeTeamsSet.has(1) ? 1 : 0)
      .style("pointer-events", activeTeamsSet.has(1) ? "auto" : "none");

    // Fade team 2 elements
    svg.selectAll(".team-2")
      .transition()
      .duration(duration)
      .ease(easing)
      .style("opacity", activeTeamsSet.has(2) ? 1 : 0)
      .style("pointer-events", activeTeamsSet.has(2) ? "auto" : "none");
  }, []);


  useEffect(() => {
    if (
      !seriesData ||
      !Array.isArray(seriesData) ||
      seriesData.length === 0 ||
      !svgRef.current ||
      !containerRef.current
    ) {
      return;
    }

    // Combine all x and y data for calculating global domain
    const allX = seriesData.flatMap((s) => s.x);
    const allY = seriesData.flatMap((s) => s.y);

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Get container dimensions
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = 400;

    // Set up margins and dimensions
    const margin = { top: 20, right: 100, bottom: 50, left: 80 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", containerHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(allX) as [number, number]) // Use extent across all X data
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, (d3.max(allY) || 0) * 1.1]) // Max across all Y data
      .range([height, 0]);

    // Add X axis - Show all rounds
    const firstSeriesX = seriesData[0].x;

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3.axisBottom(xScale).tickValues(firstSeriesX).tickFormat(d3.format("d"))
      )
      .selectAll("text")
      .attr("fill", "#9ca3af"); // gray-400

    // Add Y axis
    svg
      .append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .attr("fill", "#9ca3af"); // gray-400

    // Add X axis label
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .attr("fill", "#ffffff") // white
      .attr("font-size", "14px")
      .attr("font-weight", "500")
      .text(xLabel);

    // Add Y axis label
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -60)
      .attr("text-anchor", "middle")
      .attr("fill", "#ffffff") // white
      .attr("font-size", "14px")
      .attr("font-weight", "500")
      .text(yLabel);

    // Add grid lines
    svg
      .append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-width)
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "#ffffff");

    // Add threshold lines for buy types with matching colors
    const thresholds = [
      { value: 5000, color: "#fb923c" }, // orange
      { value: 10000, color: "#eab308" }, // yellow
      { value: 20000, color: "#22c55e" } // green
    ];

    thresholds.forEach((threshold) => {
      // Add horizontal threshold line
      svg
        .append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(threshold.value))
        .attr("y2", yScale(threshold.value))
        .attr("stroke", threshold.color)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,5")
        .attr("opacity", 0.6);

      // Add label for threshold line
      svg
        .append("text")
        .attr("x", width - 5)
        .attr("y", yScale(threshold.value) - 5)
        .attr("text-anchor", "end")
        .attr("fill", threshold.color)
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .text(`$${(threshold.value / 1000).toFixed(0)}k`);
    });

    // Add zone labels at threshold line positions with different colors
    // Position labels to the right of the chart, aligned with threshold lines
    const zones = [
      { label: "Semi-eco", value: 5000, color: "#fb923c" }, // orange at 5k line
      { label: "Semi-buy", value: 10000, color: "#eab308" }, // yellow at 10k line
      { label: "Full buy", value: 20000, color: "#22c55e" } // green at 20k line
    ];

    zones.forEach((zone) => {
      svg
        .append("text")
        .attr("x", width + 10)
        .attr("y", yScale(zone.value))
        .attr("text-anchor", "start")
        .attr("fill", zone.color)
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .attr("alignment-baseline", "middle")
        .text(zone.label);
    });

    // Loop through each series to draw line and data points
    seriesData.forEach((series, seriesIndex) => {
      // Determine if we need to split the line (if sides data exists)
      const hasSideData = series.sides && series.sides.length > 0;

      if (!hasSideData) {
        // Fallback: Render as before (single color line)
        const currentLine = d3
          .line<number>()
          .x((d, i) => xScale(series.x[i]))
          .y((d) => yScale(d))
          .curve(d3.curveLinear);

        svg
          .append("path")
          .datum(series.y)
          .attr("class", `line-path series-${seriesIndex} team-${series.teamId}`)
          .attr("fill", "none")
          .attr("stroke", series.color)
          .attr("stroke-width", 2.5)
          .attr("stroke-dasharray", series.lineStyle === 'dashed' ? '5,5' : null)
          .attr("d", currentLine);
      } else {
        // Render segmented line with side-based colors

        // Find the halftime point (round 12 -> index where round > 12)
        const halftimeIndex = series.x.findIndex(round => round > 12);

        if (halftimeIndex === -1 || halftimeIndex === 0) {
          // No halftime swap in data, render single segment
          const lineGen = d3
            .line<number>()
            .x((d, i) => xScale(series.x[i]))
            .y((d) => yScale(d))
            .curve(d3.curveLinear);

          const sideColor = SIDE_COLORS[series.sides[0] as keyof typeof SIDE_COLORS] || series.color;

          svg
            .append("path")
            .datum(series.y)
            .attr("class", `line-path series-${seriesIndex} team-${series.teamId}`)
            .attr("fill", "none")
            .attr("stroke", sideColor)
            .attr("stroke-width", 2.5)
            .attr("stroke-dasharray", series.lineStyle === 'dashed' ? '5,5' : null)
            .attr("d", lineGen);
        } else {
          // Render two segments: rounds 1-12 and 13+

          // Segment 1: Rounds 1-12 (indices 0 to halftimeIndex-1, inclusive of halftimeIndex for continuity)
          const segment1Data = series.y.slice(0, halftimeIndex);
          const segment1X = series.x.slice(0, halftimeIndex);
          const segment1Side = series.sides[0]; // First half side

          const line1 = d3
            .line<number>()
            .x((d, i) => xScale(segment1X[i]))
            .y((d) => yScale(d))
            .curve(d3.curveLinear);

          svg
            .append("path")
            .datum(segment1Data)
            .attr("class", `line-path series-${seriesIndex} team-${series.teamId}`)
            .attr("fill", "none")
            .attr("stroke", SIDE_COLORS[segment1Side as keyof typeof SIDE_COLORS])
            .attr("stroke-width", 2.5)
            .attr("stroke-dasharray", series.lineStyle === 'dashed' ? '5,5' : null)
            .attr("d", line1);

          // Segment 2: Rounds 13+ (from halftimeIndex-1 onwards for continuity)
          const segment2Data = series.y.slice(halftimeIndex - 1);
          const segment2X = series.x.slice(halftimeIndex - 1);
          const segment2Side = series.sides[halftimeIndex]; // Second half side

          const line2 = d3
            .line<number>()
            .x((d, i) => xScale(segment2X[i]))
            .y((d) => yScale(d))
            .curve(d3.curveLinear);

          svg
            .append("path")
            .datum(segment2Data)
            .attr("class", `line-path series-${seriesIndex} team-${series.teamId}`)
            .attr("fill", "none")
            .attr("stroke", SIDE_COLORS[segment2Side as keyof typeof SIDE_COLORS])
            .attr("stroke-width", 2.5)
            .attr("stroke-dasharray", series.lineStyle === 'dashed' ? '5,5' : null)
            .attr("d", line2);
        }
      }

      // Add data points
      const tooltip = d3
        .select("body")
        .selectAll(".chart-tooltip")
        .data([null])
        .join("div")
        .attr("class", "chart-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "#374151") // gray-700
        .style("color", "#ffffff")
        .style("border", "1px solid #4b5563") // gray-600
        .style("border-radius", "6px")
        .style("padding", "8px 12px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("z-index", "1000")
        .style("box-shadow", "0 4px 6px -1px rgb(0 0 0 / 0.1)");

      svg
        .selectAll(`.dot-${seriesIndex}`)
        .data(series.y)
        .join("circle")
        .attr("class", `dot series-${seriesIndex} team-${series.teamId}`)
        .attr("cx", (d, i) => xScale(series.x[i]))
        .attr("cy", (d) => yScale(d))
        .attr("r", 4)
        .attr("fill", (d, i) => {
          // Use side-based color if sides data is available
          if (hasSideData && series.sides && series.sides[i]) {
            return SIDE_COLORS[series.sides[i] as keyof typeof SIDE_COLORS] || series.color;
          }
          return series.color;
        })
        .attr("stroke", "#1f2937") // gray-800
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          const i = series.y.indexOf(d);
          d3.select(this).transition().duration(200).attr("r", 6);

          tooltip.style("visibility", "visible").html(`
                    <div style="font-weight: 600; margin-bottom: 4px;">${
                      series.label
                    } - ${xLabel} ${series.x[i]}</div>
                    <div style="color: #9ca3af;">${yLabel}: ${d.toLocaleString()}</div>
                `);
        })
        .on("mousemove", function (event) {
          tooltip
            .style("top", `${event.pageY - 10}px`)
            .style("left", `${event.pageX + 10}px`);
        })
        .on("mouseout", function () {
          d3.select(this).transition().duration(200).attr("r", 4);
          tooltip.style("visibility", "hidden");
        });

      // Add trophy icons for winning rounds
      if (series.teamId && series.winners) {
        series.y.forEach((d, i) => {
          // Check if this team won this round
          if (series.winners![i] === series.teamId) {
            svg
              .append("text")
              .attr("class", `trophy series-${seriesIndex} team-${series.teamId}`)
              .attr("x", xScale(series.x[i]))
              .attr("y", yScale(d) - 15) // Position above the point
              .text("🏆")
              .attr("font-size", "16px")
              .attr("text-anchor", "middle")
              .style("pointer-events", "none"); // Don't interfere with hover
          }
        });
      }
    });

    // Add axis styling
    svg.selectAll(".domain, .tick line").attr("stroke", "#4b5563"); // gray-600
  }, [seriesData, xLabel, yLabel]);

  // Separate effect for updating visibility when activeTeams changes
  useEffect(() => {
    updateTeamVisibility(activeTeams);
  }, [activeTeams, updateTeamVisibility]);

  if (!seriesData || seriesData.length === 0) {
    return (
      <div className="bg-gray-700 rounded-lg border border-gray-600 p-6">
        <div className="mb-4 text-center">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
        <div className="flex items-center justify-center h-[400px] text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  const toggleTeam = (teamId: number) => {
    const newActive = new Set(activeTeams);
    if (newActive.has(teamId)) {
      // Don't allow deactivating if it's the last active team
      if (newActive.size > 1) {
        newActive.delete(teamId);
      }
    } else {
      newActive.add(teamId);
    }
    setActiveTeams(newActive);
    updateTeamVisibility(newActive);
  };

  return (
    <div className="bg-gray-700 rounded-lg border border-gray-600 p-6">
      {/* Interactive Legend - Above Chart */}
      <div className="flex items-center justify-center gap-6 mb-6">
        {seriesData.map((series) => {
          const isActive = activeTeams.has(series.teamId || 0);

          return (
            <button
              key={series.teamId}
              onClick={() => toggleTeam(series.teamId || 0)}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-gray-600 hover:bg-gray-500'
                  : 'bg-gray-800 hover:bg-gray-700 opacity-50'
              }`}
            >
              {/* Line Preview */}
              <svg width="30" height="12" className="flex-shrink-0">
                <line
                  x1="0"
                  y1="6"
                  x2="30"
                  y2="6"
                  stroke={isActive ? '#ffffff' : '#6b7280'}
                  strokeWidth="2.5"
                  strokeDasharray={series.lineStyle === 'dashed' ? '4,3' : undefined}
                />
              </svg>

              <span
                className="text-sm font-semibold"
                style={{ color: isActive ? '#ffffff' : '#9ca3af' }}
              >
                {series.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chart Container */}
      <div ref={containerRef}>
        <svg ref={svgRef} className="w-full" />
      </div>
    </div>
  );
};

export default LineChart;
