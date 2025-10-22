'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
  title = 'Economy Over Rounds',
  description = 'Track economy performance across game rounds',
  xLabel = 'Round',
  yLabel = 'Economy',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !data.x || !data.y || data.x.length === 0 || !svgRef.current || !containerRef.current) {
      return;
    }

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Get container dimensions
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = 400;

    // Set up margins and dimensions
    const margin = { top: 20, right: 30, bottom: 50, left: 80 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', containerHeight)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3
      .scaleLinear()
      .domain([d3.min(data.x) || 1, d3.max(data.x) || 1])
      .range([0, width])
      .nice(); // Extends the domain to nice round values

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
      .append('defs')
      .append('linearGradient')
      .attr('id', 'area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'hsl(var(--primary))')
      .attr('stop-opacity', 0.3);

    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'hsl(var(--primary))')
      .attr('stop-opacity', 0);

    // Create area generator
    const area = d3
      .area<number>()
      .x((d, i) => xScale(data.x[i]))
      .y0(height)
      .y1((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    // Add area
    svg
      .append('path')
      .datum(data.y)
      .attr('fill', 'url(#area-gradient)')
      .attr('d', area);

    // Add X axis
    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(Math.min(data.x.length, 10)))
      .attr('class', 'text-muted-foreground text-sm')
      .selectAll('text')
      .attr('class', 'fill-muted-foreground');

    // Add Y axis
    svg
      .append('g')
      .call(d3.axisLeft(yScale))
      .attr('class', 'text-muted-foreground text-sm')
      .selectAll('text')
      .attr('class', 'fill-muted-foreground');

    // Add X axis label
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', height + 40)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-foreground text-sm font-medium')
      .text(xLabel);

    // Add Y axis label
    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -60)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-foreground text-sm font-medium')
      .text(yLabel);

    // Add grid lines
    svg
      .append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', 'currentColor');

    // Add the line path
    svg
      .append('path')
      .datum(data.y)
      .attr('fill', 'none')
      .attr('stroke', 'hsl(var(--primary))')
      .attr('stroke-width', 2.5)
      .attr('d', line);

    // Add data points
    const tooltip = d3.select('body')
      .selectAll('.chart-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'hsl(var(--popover))')
      .style('color', 'hsl(var(--popover-foreground))')
      .style('border', '1px solid hsl(var(--border))')
      .style('border-radius', '6px')
      .style('padding', '8px 12px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('box-shadow', '0 4px 6px -1px rgb(0 0 0 / 0.1)');

    svg
      .selectAll('.dot')
      .data(data.y)
      .join('circle')
      .attr('class', 'dot')
      .attr('cx', (d, i) => xScale(data.x[i]))
      .attr('cy', (d) => yScale(d))
      .attr('r', 4)
      .attr('fill', 'hsl(var(--primary))')
      .attr('stroke', 'hsl(var(--background))')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        const i = data.y.indexOf(d);
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 6);

        tooltip
          .style('visibility', 'visible')
          .html(`
            <div class="font-semibold">${xLabel} ${data.x[i]}</div>
            <div class="text-muted-foreground">${yLabel}: ${d.toLocaleString()}</div>
          `);
      })
      .on('mousemove', function (event) {
        tooltip
          .style('top', `${event.pageY - 10}px`)
          .style('left', `${event.pageX + 10}px`);
      })
      .on('mouseout', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 4);

        tooltip.style('visibility', 'hidden');
      });

    // Add axis styling
    svg.selectAll('.domain, .tick line')
      .attr('stroke', 'hsl(var(--border))');

  }, [data, xLabel, yLabel]);

  if (!data || !data.x || !data.y || data.x.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent ref={containerRef}>
        <svg ref={svgRef} className="w-full" />
      </CardContent>
    </Card>
  );
};

export default LineChart;
