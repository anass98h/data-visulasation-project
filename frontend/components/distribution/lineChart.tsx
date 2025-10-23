"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface LineChartProps {
  data?: {
    x: number[];
    y: number[];
  };
  title?: string;
  description?: string;
  xLabel?: string;
  yLabel?: string;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  title = "Economy Over Rounds",
  description = "Track economy performance across game rounds",
  xLabel = "Rounds",
  yLabel = "Economy",
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !data ||
      !data.x ||
      !data.y ||
      data.x.length === 0 ||
      !svgRef.current ||
      !containerRef.current
    ) {
      return;
    }

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
      .domain([d3.min(data.x) || 1, d3.max(data.x) || 21])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, (d3.max(data.y) || 0) * 1.1]) // Add 10% padding to top
      .range([height, 0]);

    // Create line generator
    const line = d3
      .line<number>()
      .x((d, i) => xScale(data.x[i]))
      .y((d) => yScale(d))
      .curve(d3.curveMonotoneX); // Smooth curve

    // Create gradient for area
    const gradient = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", "area-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#3b82f6") // Blue color
      .attr("stop-opacity", 0.3);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#3b82f6")
      .attr("stop-opacity", 0);

    // Create area generator
    const area = d3
      .area<number>()
      .x((d, i) => xScale(data.x[i]))
      .y0(height)
      .y1((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    // Add area
    svg
      .append("path")
      .datum(data.y)
      .attr("fill", "url(#area-gradient)")
      .attr("d", area);

    // Add X axis
    // Create tick values dynamically based on number of rounds
    const numRounds = data.x.length;
    let tickValues: number[] = [];

    if (numRounds <= 10) {
      // Show all rounds if 10 or fewer
      tickValues = data.x;
    } else if (numRounds <= 20) {
      // Show every 2nd round, plus first and last
      tickValues = data.x.filter(
        (val, i) => i === 0 || i === numRounds - 1 || val % 2 === 1
      );
    } else if (numRounds <= 30) {
      // Show every 3rd round, plus first and last
      tickValues = data.x.filter(
        (val, i) => i === 0 || i === numRounds - 1 || val % 3 === 0
      );
    } else {
      // Show every 5th round, plus first and last
      tickValues = data.x.filter(
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

    // Add the line path
    svg
      .append("path")
      .datum(data.y)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6") // blue-500
      .attr("stroke-width", 2.5)
      .attr("d", line);

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
      .selectAll(".dot")
      .data(data.y)
      .join("circle")
      .attr("class", "dot")
      .attr("cx", (d, i) => xScale(data.x[i]))
      .attr("cy", (d) => yScale(d))
      .attr("r", 4)
      .attr("fill", "#3b82f6") // blue-500
      .attr("stroke", "#1f2937") // gray-800
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        const i = data.y.indexOf(d);
        d3.select(this).transition().duration(200).attr("r", 6);

        tooltip.style("visibility", "visible").html(`
            <div style="font-weight: 600; margin-bottom: 4px;">${xLabel} ${data.x[i]}</div>
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

    // Add axis styling
    svg.selectAll(".domain, .tick line").attr("stroke", "#4b5563"); // gray-600
  }, [data, xLabel, yLabel]);

  if (!data || !data.x || !data.y || data.x.length === 0) {
    return (
      <div className="bg-gray-700 rounded-lg border border-gray-600 p-6">
        <div className="mb-4">
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
      <div className="mb-4">
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
