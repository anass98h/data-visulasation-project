"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface DataSeries {
  x: number[];
  y: number[];
  label: string; // e.g., "Vitality", "The MongolZ"
  color: string; // e.g., "#3b82f6", "#ef4444"
  teamId?: number; // Team identifier (1 or 2)
  winners?: number[]; // Array of winner team IDs per round
}

interface LineChartProps {
  seriesData?: DataSeries[];
  title?: string;
  description?: string;
  xLabel?: string;
  yLabel?: string;
}

const LineChart: React.FC<LineChartProps> = ({
  seriesData,
  title = "Economy Over Rounds",
  description = "Track economy performance across game rounds",
  xLabel = "Rounds",
  yLabel = "Economy",
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    const margin = { top: 20, right: 60, bottom: 50, left: 80 };
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

    // Add X axis
    // Create tick values dynamically based on number of rounds (using the first series' X data)
    const firstSeriesX = seriesData[0].x;
    const numRounds = firstSeriesX.length;
    let tickValues: number[] = [];

    if (numRounds <= 10) {
      // Show all rounds if 10 or fewer
      tickValues = firstSeriesX;
    } else if (numRounds <= 20) {
      // Show every 2nd round, plus first and last
      tickValues = firstSeriesX.filter(
        (val, i) => i === 0 || i === numRounds - 1 || val % 2 === 1
      );
    } else if (numRounds <= 30) {
      // Show every 3rd round, plus first and last
      tickValues = firstSeriesX.filter(
        (val, i) => i === 0 || i === numRounds - 1 || val % 3 === 0
      );
    } else {
      // Show every 5th round, plus first and last
      tickValues = firstSeriesX.filter(
        (val, i) => i === 0 || i === numRounds - 1 || val % 5 === 0
      );
    }

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3.axisBottom(xScale).tickValues(tickValues).tickFormat(d3.format("d"))
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

    // Loop through each series to draw line and data points
    seriesData.forEach((series, seriesIndex) => {
      // Create line generator for current series
      const currentLine = d3
        .line<number>()
        .x((d, i) => xScale(series.x[i]))
        .y((d) => yScale(d))
        .curve(d3.curveLinear);

      // Add the line path
      svg
        .append("path")
        .datum(series.y)
        .attr("fill", "none")
        .attr("stroke", series.color)
        .attr("stroke-width", 2.5)
        .attr("d", currentLine);

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
        .attr("class", `dot dot-${seriesIndex}`)
        .attr("cx", (d, i) => xScale(series.x[i]))
        .attr("cy", (d) => yScale(d))
        .attr("r", 4)
        .attr("fill", series.color)
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

    // Add Legend (outside the loop, after all elements are drawn)
    const legend = svg.append("g").attr("class", "legend");

    seriesData.forEach((series, index) => {
      const legendItem = legend
        .append("g")
        .attr("transform", `translate(${width - 150}, ${index * 20})`); // Positioned top right

      // Legend color square
      legendItem
        .append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", series.color);

      // Legend label
      legendItem
        .append("text")
        .attr("x", 15)
        .attr("y", 9)
        .attr("fill", "#ffffff")
        .attr("font-size", "12px")
        .text(series.label);
    });
  }, [seriesData, xLabel, yLabel]);

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

  return (
    <div className="bg-gray-700 rounded-lg border border-gray-600 p-6">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      <div ref={containerRef}>
        <svg ref={svgRef} className="w-full" />
      </div>
    </div>
  );
};

export default LineChart;
