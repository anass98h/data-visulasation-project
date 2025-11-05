#!/usr/bin/env python3
"""
CS2 Static Heatmap Generator
Generates position density heatmaps overlaid on radar images
(MODIFIED to generate heatmaps per round)
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


def filter_positions(match_data, round_info, side=None, alive_only=True, 
                    time_window=None):
    """
    Extract and filter position data for a single round.
    
    Args:
        match_data: Parsed JSON match data
        round_info: Dictionary for the specific round
        side: "CT", "T", or None for both
        alive_only: Only include alive players
        time_window: Tuple (start_seconds, end_seconds) relative to round start
    
    Returns:
        List of (x, y, side) tuples
    """
    positions = []
    
    game_data = match_data.get('game', match_data)
    ticks_data = game_data.get('ticks', match_data.get('ticks', []))
    
    start_tick = round_info.get('freezeTimeEndTick', round_info['startTick'])
    end_tick = round_info['endTick']
    
    # Apply time window if specified
    if time_window:
        tick_rate = match_data.get('header', {}).get('tickRate', 64)
        start_offset = int(time_window[0] * tick_rate)
        end_offset = int(time_window[1] * tick_rate)
        start_tick = start_tick + start_offset
        end_tick = min(start_tick + end_offset, end_tick)
        
    for tick_data in ticks_data:
        tick = tick_data.get('tick', 0)
        
        if not (start_tick <= tick <= end_tick):
            continue
        
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
    """
    if not positions:
        return np.zeros((grid_size, grid_size)), 0
    
    xs = [p[0] for p in positions]
    ys = [p[1] for p in positions]
    
    x_edges = np.linspace(map_config['minX'], map_config['maxX'], grid_size + 1)
    y_edges = np.linspace(map_config['minY'], map_config['maxY'], grid_size + 1)
    
    hist, _, _ = np.histogram2d(xs, ys, bins=[x_edges, y_edges])
    
    hist = np.flipud(hist.T)
    
    # Normalize to 0-1
    if hist.max() > 0:
        hist = hist / hist.max()
    
    return hist, len(positions)


def export_round_heatmaps_json(round_heatmaps, map_config, filters, output_path):
    """
    Export all round heatmaps data as JSON for frontend consumption
    """
    data = {
        "roundHeatmaps": round_heatmaps,
        "gridSize": filters.get('gridSize', 50),
        "bounds": {
            "minX": map_config['minX'],
            "maxX": map_config['maxX'],
            "minY": map_config['minY'],
            "maxY": map_config['maxY']
        },
        "filters": filters
    }
    
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"✓ JSON data saved to: {output_path}")


def main():
    parser = argparse.ArgumentParser(description='Generate CS2 position heatmaps')
    parser.add_argument('json_file', help='Path to match JSON file')
    parser.add_argument('--grid-size', type=int, default=50, 
                       help='Grid resolution (default: 50)')
    parser.add_argument('--alive-only', action='store_true', default=True,
                       help='Only include alive players (default: True)')
    parser.add_argument('--time-window', type=str, default=None,
                       help='Time window in seconds (e.g., "0,30" for first 30s)')
    parser.add_argument('--output-dir', type=str, default='.',
                       help='Output directory (default: current)')
    
    args = parser.parse_args()
    
    print(f"Loading match data from {args.json_file}...")
    match_data = load_match_data(args.json_file)
    
    map_name = match_data.get('header', {}).get('mapName', 'de_ancient')
    map_config = MAP_CONFIG.get(map_name, MAP_CONFIG['de_ancient'])
    print(f"Map: {map_name}")
    
    rounds_data = match_data.get('rounds', [])
    
    time_window = None
    if args.time_window:
        start, end = args.time_window.split(',')
        time_window = (float(start), float(end))
    
    round_heatmaps = {}
    
    # Iterate through all rounds
    for round_info in rounds_data:
        round_num = round_info['roundNum']
        print(f"Processing Round {round_num}...")
        
        round_data = {}
        
        # Process CT side for the current round
        ct_positions = filter_positions(
            match_data, round_info, side='CT', alive_only=args.alive_only, time_window=time_window
        )
        ct_grid, ct_samples = create_density_grid(ct_positions, map_config, args.grid_size)
        round_data['ct'] = {
            "grid": ct_grid.tolist(),
            "samples": ct_samples
        }
        
        # Process T side for the current round
        t_positions = filter_positions(
            match_data, round_info, side='T', alive_only=args.alive_only, time_window=time_window
        )
        t_grid, t_samples = create_density_grid(t_positions, map_config, args.grid_size)
        round_data['t'] = {
            "grid": t_grid.tolist(),
            "samples": t_samples
        }
        
        # Store results keyed by round number
        round_heatmaps[str(round_num)] = round_data
        print(f"  CT samples: {ct_samples}, T samples: {t_samples}")
    
    # Generate output paths
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / f"round_heatmaps_{map_name}.json"
    
    # Export combined JSON data
    filters_info = {
        "aliveOnly": args.alive_only,
        "timeWindow": time_window,
        "gridSize": args.grid_size
    }
    export_round_heatmaps_json(round_heatmaps, map_config, filters_info, json_path)
    
    print("\n✓ Per-round heatmaps generated successfully!")


if __name__ == '__main__':
    main()