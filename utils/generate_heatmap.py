#!/usr/bin/env python3
"""
CS2 Static Heatmap Generator
Generates position density heatmaps overlaid on radar images
"""

import json
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from PIL import Image
import argparse
from pathlib import Path

# Map configurations (matching your React MAP_CONFIG)
MAP_CONFIG = {
    "de_ancient": {
        "minX": -2953,
        "maxX": 2119,
        "minY": -2887,
        "maxY": 1983,
        "radarImage": "/radar_images/de_ancient_radar_psd.png",
    },
    "de_mirage": {
        "minX": -3230,
        "maxX": 1890,
        "minY": -3407,
        "maxY": 1682,
        "radarImage": "/radar_images/de_mirage_radar_psd.png",
    },
}


def load_match_data(json_path):
    """Load match JSON data"""
    with open(json_path, 'r') as f:
        return json.load(f)


def filter_positions(match_data, side=None, rounds=None, alive_only=True, 
                    time_window=None, round_start_offset=0):
    """
    Extract and filter position data
    
    Args:
        match_data: Parsed JSON match data
        side: "CT", "T", or None for both
        rounds: List of round numbers, or None for all
        alive_only: Only include alive players
        time_window: Tuple (start_seconds, end_seconds) relative to round start
        round_start_offset: Seconds to skip from round start (e.g., freeze time)
    
    Returns:
        List of (x, y, side) tuples
    """
    positions = []
    
    # Get rounds info - handle both flat and nested game structure
    game_data = match_data.get('game', match_data)
    rounds_data = game_data.get('rounds', [])
    ticks_data = game_data.get('ticks', match_data.get('ticks', []))
    
    # Build round filters
    round_filter = set()
    if rounds:
        round_filter = set(rounds)
    else:
        round_filter = set(r['roundNum'] for r in rounds_data if 'roundNum' in r)
    
    # Build tick ranges for filtered rounds
    tick_ranges = {}
    for round_info in rounds_data:
        if round_info['roundNum'] in round_filter:
            start_tick = round_info.get('freezeTimeEndTick', round_info['startTick'])
            end_tick = round_info['endTick']
            
            # Apply time window if specified
            if time_window:
                tick_rate = match_data.get('header', {}).get('tickRate', 64)
                start_offset = int(time_window[0] * tick_rate)
                end_offset = int(time_window[1] * tick_rate)
                start_tick = start_tick + start_offset
                end_tick = min(start_tick + end_offset, end_tick)
            
            tick_ranges[round_info['roundNum']] = (start_tick, end_tick)
    
    # Extract positions
    for tick_data in ticks_data:
        tick = tick_data.get('tick', 0)
        
        # Check if tick is in any filtered round
        in_range = False
        for start, end in tick_ranges.values():
            if start <= tick <= end:
                in_range = True
                break
        
        if not in_range:
            continue
        
        # Apply filters
        if alive_only and not tick_data.get('isAlive', True):
            continue
        
        player_side = tick_data.get('side', '')
        if side and player_side != side:
            continue
        
        x = tick_data.get('x')
        y = tick_data.get('y')
        
        if x is not None and y is not None:
            positions.append((x, y, player_side))
    
    return positions


def create_density_grid(positions, map_config, grid_size=50):
    """
    Create 2D density grid from positions
    
    Args:
        positions: List of (x, y, side) tuples
        map_config: Map configuration dict
        grid_size: Number of bins per dimension
    
    Returns:
        2D numpy array of densities (normalized 0-1)
    """
    if not positions:
        return np.zeros((grid_size, grid_size))
    
    xs = [p[0] for p in positions]
    ys = [p[1] for p in positions]
    
    # Create 2D histogram
    x_edges = np.linspace(map_config['minX'], map_config['maxX'], grid_size + 1)
    y_edges = np.linspace(map_config['minY'], map_config['maxY'], grid_size + 1)
    
    # hist[i, j] corresponds to x in [x_edges[i], x_edges[i+1]] and y in [y_edges[j], y_edges[j+1]]
    hist, _, _ = np.histogram2d(xs, ys, bins=[x_edges, y_edges])
    
    # Transpose to get [y, x] indexing (row, col) and flip Y to match canvas top-down
    hist = np.flipud(hist.T)
    
    # Normalize to 0-1
    if hist.max() > 0:
        hist = hist / hist.max()
    
    return hist


def generate_heatmap_overlay(density_grid, map_config, radar_image_path, 
                             output_path, side='T', alpha=0.6):
    """
    Generate heatmap overlay on radar image
    
    Args:
        density_grid: 2D numpy array of densities
        map_config: Map configuration
        radar_image_path: Path to radar background image
        output_path: Output PNG path
        side: "CT" or "T" for color scheme
        alpha: Transparency of heatmap overlay
    """
    fig, ax = plt.subplots(figsize=(10, 10), dpi=150)
    
    # Load and display radar image if available
    if Path(radar_image_path).exists():
        radar_img = Image.open(radar_image_path)
        ax.imshow(radar_img, extent=[0, density_grid.shape[1], 0, density_grid.shape[0]], 
                 aspect='auto', zorder=1)
    else:
        print(f"Warning: Radar image not found at {radar_image_path}")
        ax.set_facecolor('#1a1a1a')
    
    # Create color map (red for T, blue for CT)
    if side == 'T':
        colors = ['#00000000', '#ef444420', '#ef444460', '#ef4444aa', '#ef4444']
        cmap_name = 'red_heat'
    else:
        colors = ['#00000000', '#3b82f620', '#3b82f660', '#3b82f6aa', '#3b82f6']
        cmap_name = 'blue_heat'
    
    cmap = LinearSegmentedColormap.from_list(cmap_name, colors)
    
    # Overlay heatmap
    im = ax.imshow(density_grid, cmap=cmap, alpha=alpha, 
                   extent=[0, density_grid.shape[1], 0, density_grid.shape[0]],
                   aspect='auto', zorder=2, interpolation='gaussian')
    
    ax.axis('off')
    plt.tight_layout(pad=0)
    
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0, 
                facecolor='#1a1a1a', transparent=False)
    plt.close()
    
    print(f"✓ Heatmap saved to: {output_path}")


def generate_combined_heatmap(ct_grid, t_grid, map_config, radar_image_path,
                              output_path, alpha=0.6):
    """
    Generate combined CT + T heatmap overlay on radar image
    
    Args:
        ct_grid: 2D numpy array of CT densities
        t_grid: 2D numpy array of T densities
        map_config: Map configuration
        radar_image_path: Path to radar background image
        output_path: Output PNG path
        alpha: Transparency of heatmap overlay
    """
    # Convert to numpy if needed
    if not isinstance(ct_grid, np.ndarray):
        ct_grid = np.array(ct_grid)
    if not isinstance(t_grid, np.ndarray):
        t_grid = np.array(t_grid)
    
    fig, ax = plt.subplots(figsize=(10, 10), dpi=150)
    
    # Load and display radar image if available
    if Path(radar_image_path).exists():
        radar_img = Image.open(radar_image_path)
        ax.imshow(radar_img, extent=[0, ct_grid.shape[1], 0, ct_grid.shape[0]], 
                 aspect='auto', zorder=1)
    else:
        print(f"Warning: Radar image not found at {radar_image_path}")
        ax.set_facecolor('#1a1a1a')
    
    # Create color maps
    ct_colors = ['#00000000', '#3b82f620', '#3b82f660', '#3b82f6aa', '#3b82f6']
    t_colors = ['#00000000', '#ef444420', '#ef444460', '#ef4444aa', '#ef4444']
    
    ct_cmap = LinearSegmentedColormap.from_list('blue_heat', ct_colors)
    t_cmap = LinearSegmentedColormap.from_list('red_heat', t_colors)
    
    # Overlay CT heatmap (blue)
    ax.imshow(ct_grid, cmap=ct_cmap, alpha=alpha, 
              extent=[0, ct_grid.shape[1], 0, ct_grid.shape[0]],
              aspect='auto', zorder=2, interpolation='gaussian')
    
    # Overlay T heatmap (red)
    ax.imshow(t_grid, cmap=t_cmap, alpha=alpha, 
              extent=[0, t_grid.shape[1], 0, t_grid.shape[0]],
              aspect='auto', zorder=3, interpolation='gaussian')
    
    ax.axis('off')
    plt.tight_layout(pad=0)
    
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0, 
                facecolor='#1a1a1a', transparent=False)
    plt.close()
    
    print(f"✓ Combined heatmap saved to: {output_path}")


def export_combined_json(heatmap_data, map_config, filters, output_path):
    """
    Export combined heatmap data as JSON for frontend consumption
    
    Args:
        heatmap_data: Dictionary with 'ct' and 't' grid data
        map_config: Map configuration
        filters: Dictionary of applied filters
        output_path: Output JSON path
    """
    data = {
        "heatmapData": {
            "ct": heatmap_data.get('ct', {
                "grid": [],
                "samples": 0
            }),
            "t": heatmap_data.get('t', {
                "grid": [],
                "samples": 0
            }),
            "gridSize": filters.get('gridSize', 50),
            "bounds": {
                "minX": map_config['minX'],
                "maxX": map_config['maxX'],
                "minY": map_config['minY'],
                "maxY": map_config['maxY']
            },
            "filters": filters
        }
    }
    
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"✓ JSON data saved to: {output_path}")


def export_json_data(density_grid, map_config, filters, output_path):
    """
    Export heatmap data as JSON for frontend consumption (legacy single-side format)
    
    Args:
        density_grid: 2D numpy array
        map_config: Map configuration
        filters: Dictionary of applied filters
        output_path: Output JSON path
    """
    data = {
        "heatmapData": {
            "grid": density_grid.tolist(),
            "gridSize": density_grid.shape[0],
            "bounds": {
                "minX": map_config['minX'],
                "maxX": map_config['maxX'],
                "minY": map_config['minY'],
                "maxY": map_config['maxY']
            },
            "filters": filters
        }
    }
    
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"✓ JSON data saved to: {output_path}")


def main():
    parser = argparse.ArgumentParser(description='Generate CS2 position heatmaps')
    parser.add_argument('json_file', help='Path to match JSON file')
    parser.add_argument('--grid-size', type=int, default=50, 
                       help='Grid resolution (default: 50)')
    parser.add_argument('--side', choices=['CT', 'T', 'both'], default='both',
                       help='Filter by side (default: both)')
    parser.add_argument('--rounds', type=str, default=None,
                       help='Comma-separated round numbers (e.g., "1,2,3")')
    parser.add_argument('--alive-only', action='store_true', default=True,
                       help='Only include alive players (default: True)')
    parser.add_argument('--time-window', type=str, default=None,
                       help='Time window in seconds (e.g., "0,30" for first 30s)')
    parser.add_argument('--output-dir', type=str, default='.',
                       help='Output directory (default: current)')
    parser.add_argument('--radar-dir', type=str, default='./radar_images',
                       help='Radar images directory (default: ./radar_images)')
    parser.add_argument('--alpha', type=float, default=0.6,
                       help='Heatmap transparency (default: 0.6)')
    parser.add_argument('--skip-png', action='store_true',
                       help='Skip PNG generation (only generate JSON)')
    
    args = parser.parse_args()
    
    # Load match data
    print(f"Loading match data from {args.json_file}...")
    match_data = load_match_data(args.json_file)
    
    # Get map name
    map_name = match_data.get('header', {}).get('mapName', 'de_ancient')
    map_config = MAP_CONFIG.get(map_name, MAP_CONFIG['de_ancient'])
    print(f"Map: {map_name}")
    
    # Parse filters
    rounds_filter = None
    if args.rounds:
        rounds_filter = [int(r.strip()) for r in args.rounds.split(',')]
    
    time_window = None
    if args.time_window:
        start, end = args.time_window.split(',')
        time_window = (float(start), float(end))
    
    # Process both sides
    sides_to_process = ['CT', 'T'] if args.side == 'both' else [args.side]
    
    heatmap_data = {}
    
    for side in sides_to_process:
        print(f"\nProcessing {side} side...")
        
        # Filter positions
        positions = filter_positions(
            match_data,
            side=side,
            rounds=rounds_filter,
            alive_only=args.alive_only,
            time_window=time_window
        )
        
        print(f"  Found {len(positions)} position samples")
        
        if not positions:
            print(f"  Warning: No positions found for {side} side")
            heatmap_data[side.lower()] = {
                "grid": [[0] * args.grid_size for _ in range(args.grid_size)],
                "samples": 0
            }
            continue
        
        # Create density grid
        density_grid = create_density_grid(positions, map_config, args.grid_size)
        heatmap_data[side.lower()] = {
            "grid": density_grid.tolist(),
            "samples": len(positions)
        }
    
    # Generate output paths
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    json_path = output_dir / f"heatmap_{map_name}_combined.json"
    
    # Generate PNG only if not skipped
    if not args.skip_png:
        png_path = output_dir / f"heatmap_{map_name}_combined.png"
        
        # Find radar image
        radar_path = Path(args.radar_dir) / map_config['radarImage'].split('/')[-1]
        
        # Generate combined heatmap overlay
        if args.side == 'both':
            generate_combined_heatmap(
                heatmap_data.get('ct', {}).get('grid', np.zeros((args.grid_size, args.grid_size))),
                heatmap_data.get('t', {}).get('grid', np.zeros((args.grid_size, args.grid_size))),
                map_config,
                radar_path,
                png_path,
                alpha=args.alpha
            )
        else:
            # Single side
            side_key = args.side.lower()
            grid = heatmap_data.get(side_key, {}).get('grid', np.zeros((args.grid_size, args.grid_size)))
            generate_heatmap_overlay(
                np.array(grid),
                map_config,
                radar_path,
                png_path,
                side=args.side,
                alpha=args.alpha
            )
    
    # Export combined JSON data
    filters_info = {
        "side": args.side,
        "rounds": rounds_filter or "all",
        "aliveOnly": args.alive_only,
        "timeWindow": time_window,
        "gridSize": args.grid_size
    }
    export_combined_json(heatmap_data, map_config, filters_info, json_path)
    
    print("\n✓ Heatmap generated successfully!")


if __name__ == '__main__':
    main()