"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { ChartSeries } from "@/lib/playerPerformanceTransform";

interface KillPerformanceProps {
  playerName: string;
  seriesData: ChartSeries[];
  height?: number;
}

const SIDE_COLORS = {
  CT: "#3b82f6", // Blue
  T: "#ef4444", // Red
} as const;

export function KillPerformance({
  playerName,
  seriesData,
  height = 200,
}: KillPerformanceProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !seriesData ||
      seriesData.length === 0 ||
      !svgRef.current ||
      !containerRef.current
    ) {
      return;
    }

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    const containerWidth = containerRef.current.clientWidth;
    const margin = { top: 20, right: 80, bottom: 40, left: 50 };
    const width = containerWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Combine all data for scales
    const allX = seriesData.flatMap((s) => s.x);
    const allY = seriesData.flatMap((s) => s.y);

    // Create scales
    const xScale = d3
      .scaleLinear()
      .domain([1, Math.max(...allX)])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, Math.max(...allY, 5)]) // Min 5 for better visualization
      .nice()
      .range([chartHeight, 0]);

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
      );

    // Add axes
    const xAxis = svg
      .append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(Math.min(10, Math.max(...allX)))
          .tickFormat((d) => d.toString())
      );

    xAxis.selectAll("text").attr("fill", "#9ca3af");
    xAxis.selectAll("line").attr("stroke", "#374151");
    xAxis.select(".domain").attr("stroke", "#374151");

    const yAxis = svg.append("g").call(d3.axisLeft(yScale).ticks(5));

    yAxis.selectAll("text").attr("fill", "#9ca3af");
    yAxis.selectAll("line").attr("stroke", "#374151");
    yAxis.select(".domain").attr("stroke", "#374151");

    // Add axis labels
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", chartHeight + 35)
      .attr("text-anchor", "middle")
      .attr("fill", "#9ca3af")
      .attr("font-size", "12px")
      .text("Round");

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -chartHeight / 2)
      .attr("y", -35)
      .attr("text-anchor", "middle")
      .attr("fill", "#9ca3af")
      .attr("font-size", "12px")
      .text("Kills");

    // Create tooltip
    const tooltip = d3
      .select(containerRef.current)
      .append("div")
      .attr("class", "chart-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.9)")
      .style("color", "#fff")
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 1000);

    // Draw each series
    seriesData.forEach((series, seriesIdx) => {
      const lineColor = d3.schemeTableau10[seriesIdx % 10];

      // Split data at round 13 (halftime)
      const halftimeIndex = series.x.findIndex((r) => r > 12);

      // Helper function to render line segment
      const renderSegment = (
        data: { x: number; y: number }[],
        side: "CT" | "T"
      ) => {
        const line = d3
          .line<{ x: number; y: number }>()
          .x((d) => xScale(d.x))
          .y((d) => yScale(d.y));

        const path = svg
          .append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", SIDE_COLORS[side])
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", side === "T" ? "5,5" : null)
          .attr("d", line)
          .attr("opacity", 0.8);

        return path;
      };

      // Prepare data points
      const dataPoints = series.x.map((x, i) => ({ x, y: series.y[i] }));

      if (halftimeIndex === -1 || halftimeIndex === 0) {
        // No halftime or all second half
        const side = series.sides[0] || "CT";
        renderSegment(dataPoints, side);
      } else {
        // First half
        const firstHalfData = dataPoints.slice(0, halftimeIndex);
        const firstHalfSide = series.sides[0] || "CT";
        renderSegment(firstHalfData, firstHalfSide);

        // Second half
        const secondHalfData = dataPoints.slice(halftimeIndex - 1); // Include last point of first half for continuity
        const secondHalfSide = series.sides[halftimeIndex] || "T";
        renderSegment(secondHalfData, secondHalfSide);
      }

      // Draw points
      svg
        .selectAll(`.dot-${seriesIdx}`)
        .data(dataPoints)
        .enter()
        .append("circle")
        .attr("class", `dot-${seriesIdx}`)
        .attr("cx", (d) => xScale(d.x))
        .attr("cy", (d) => yScale(d.y))
        .attr("r", 4)
        .attr("fill", lineColor)
        .attr("stroke", "#1f2937")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          const roundNum = d.x;
          const kills = d.y;
          const side = series.sides[roundNum - 1];

          d3.select(this).attr("r", 6);

          tooltip
            .style("opacity", 1)
            .html(
              `
              <div><strong>${series.label}</strong></div>
              <div>Round ${roundNum}</div>
              <div>Kills: ${kills}</div>
              <div>Side: <span style="color: ${SIDE_COLORS[side]}">${side}</span></div>
            `
            )
            .style("left", `${event.pageX - containerRef.current!.getBoundingClientRect().left + 10}px`)
            .style("top", `${event.pageY - containerRef.current!.getBoundingClientRect().top - 10}px`);
        })
        .on("mouseout", function () {
          d3.select(this).attr("r", 4);
          tooltip.style("opacity", 0);
        });
    });

    // Add legend
    const legend = svg
      .append("g")
      .attr("transform", `translate(${width + 10}, 0)`);

    seriesData.forEach((series, i) => {
      const lineColor = d3.schemeTableau10[i % 10];
      const legendRow = legend
        .append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendRow
        .append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", 10)
        .attr("y2", 10)
        .attr("stroke", lineColor)
        .attr("stroke-width", 2);

      legendRow
        .append("text")
        .attr("x", 25)
        .attr("y", 14)
        .attr("font-size", "10px")
        .attr("fill", "#9ca3af")
        .text(series.label.length > 10 ? series.label.substring(0, 10) + "..." : series.label);
    });

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };
  }, [seriesData, playerName, height]);

  if (!seriesData || seriesData.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 text-sm"
        style={{ height: `${height}px` }}
      >
        No data available
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef}></svg>
    </div>
  );
}
