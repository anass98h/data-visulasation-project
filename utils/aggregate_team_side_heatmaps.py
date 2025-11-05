#!/usr/bin/env python3
"""
Aggregate Per-Round Heatmaps by Team+Side
Takes the per-round heatmap JSON and groups by team playing as T/CT
"""

import json
import numpy as np
import argparse
from pathlib import Path
from collections import defaultdict


def load_json(json_path):
    """Load JSON file"""
    with open(json_path, 'r') as f:
        return json.load(f)


def get_team_names_from_match(match_data):
    """Extract team names from match data"""
    teams = set()
    players = match_data.get('players', [])
    
    for player in players:
        team = player.get('team')
        if team:
            teams.add(team)
    
    teams = list(teams)
    if len(teams) >= 2:
        return teams[0], teams[1]
    else:
        return "Team1", "Team2"


def determine_team_sides_per_round(match_data):
    """
    Determine which team played which side in each round.
    Returns: { round_num: { 'Team A': 'T', 'Team B': 'CT' } }
    """
    round_team_sides = {}
    
    # Build player -> team mapping
    player_teams = {}
    for player in match_data.get('players', []):
        player_id = player.get('steamId') or player.get('name')
        player_teams[player_id] = player.get('team')
    
    rounds = match_data.get('rounds', [])
    ticks = match_data.get('ticks', [])
    
    for round_info in rounds:
        round_num = round_info['roundNum']
        start_tick = round_info.get('freezeTimeEndTick', round_info['startTick'])
        
        # Find which team is on which side at round start
        team_sides = {}
        for tick in ticks:
            if start_tick <= tick.get('tick', 0) <= start_tick + 100:
                player_id = tick.get('steamId') or tick.get('name')
                team = player_teams.get(player_id)
                side = tick.get('side')
                
                if team and side:
                    team_sides[team] = side
                
                if len(team_sides) >= 2:
                    break
        
        round_team_sides[round_num] = team_sides
    
    return round_team_sides


def aggregate_heatmaps_by_team_side(round_heatmaps_data, round_team_sides, team_a, team_b, grid_size):
    """
    Aggregate per-round heatmaps into team+side combinations.
    
    Args:
        round_heatmaps_data: The "roundHeatmaps" dict from per-round JSON
        round_team_sides: Dict mapping round_num -> {team: side}
        team_a, team_b: Team names
        grid_size: Grid dimensions
    
    Returns:
        Dict with structure:
        {
            "TeamA_as_T": { "grid": [...], "samples": N, "rounds": [1,2,3] },
            "TeamA_as_CT": { "grid": [...], "samples": N, "rounds": [13,14] },
            "TeamB_as_T": { "grid": [...], "samples": N, "rounds": [13,14] },
            "TeamB_as_CT": { "grid": [...], "samples": N, "rounds": [1,2,3] }
        }
    """
    
    # Initialize accumulators
    aggregated = {
        f"{team_a}_as_T": {"grids": [], "samples": 0, "rounds": []},
        f"{team_a}_as_CT": {"grids": [], "samples": 0, "rounds": []},
        f"{team_b}_as_T": {"grids": [], "samples": 0, "rounds": []},
        f"{team_b}_as_CT": {"grids": [], "samples": 0, "rounds": []},
    }
    
    for round_num_str, round_data in round_heatmaps_data.items():
        round_num = int(round_num_str)
        
        # Get which team played which side this round
        team_sides = round_team_sides.get(round_num, {})
        
        team_a_side = team_sides.get(team_a)
        team_b_side = team_sides.get(team_b)
        
        if not team_a_side or not team_b_side:
            print(f"Warning: Could not determine team sides for round {round_num}, skipping")
            continue
        
        # Get the heatmap grids for this round
        ct_grid = np.array(round_data['ct']['grid'])
        t_grid = np.array(round_data['t']['grid'])
        ct_samples = round_data['ct']['samples']
        t_samples = round_data['t']['samples']
        
        # Add to appropriate team+side bucket
        if team_a_side == 'T':
            # Team A was T, Team B was CT
            aggregated[f"{team_a}_as_T"]["grids"].append(t_grid)
            aggregated[f"{team_a}_as_T"]["samples"] += t_samples
            aggregated[f"{team_a}_as_T"]["rounds"].append(round_num)
            
            aggregated[f"{team_b}_as_CT"]["grids"].append(ct_grid)
            aggregated[f"{team_b}_as_CT"]["samples"] += ct_samples
            aggregated[f"{team_b}_as_CT"]["rounds"].append(round_num)
        else:
            # Team A was CT, Team B was T
            aggregated[f"{team_a}_as_CT"]["grids"].append(ct_grid)
            aggregated[f"{team_a}_as_CT"]["samples"] += ct_samples
            aggregated[f"{team_a}_as_CT"]["rounds"].append(round_num)
            
            aggregated[f"{team_b}_as_T"]["grids"].append(t_grid)
            aggregated[f"{team_b}_as_T"]["samples"] += t_samples
            aggregated[f"{team_b}_as_T"]["rounds"].append(round_num)
    
    # Average the grids
    result = {}
    for key, data in aggregated.items():
        if len(data["grids"]) > 0:
            # Average all grids
            avg_grid = np.mean(data["grids"], axis=0)
            
            # Renormalize to 0-1
            if avg_grid.max() > 0:
                avg_grid = avg_grid / avg_grid.max()
            
            result[key] = {
                "grid": avg_grid.tolist(),
                "samples": data["samples"],
                "rounds": data["rounds"],
                "numRounds": len(data["rounds"])
            }
        else:
            result[key] = {
                "grid": np.zeros((grid_size, grid_size)).tolist(),
                "samples": 0,
                "rounds": [],
                "numRounds": 0
            }
    
    return result


def main():
    parser = argparse.ArgumentParser(
        description='Aggregate per-round heatmaps by team+side'
    )
    parser.add_argument('match_json', help='Path to original match data JSON')
    parser.add_argument('round_heatmaps_json', help='Path to per-round heatmaps JSON')
    parser.add_argument('--output', '-o', type=str, default='heatmaps_by_team_side.json',
                       help='Output JSON filename (default: heatmaps_by_team_side.json)')
    
    args = parser.parse_args()
    
    print(f"Loading match data from {args.match_json}...")
    match_data = load_json(args.match_json)
    
    print(f"Loading per-round heatmaps from {args.round_heatmaps_json}...")
    round_heatmaps_full = load_json(args.round_heatmaps_json)
    
    # Extract data
    round_heatmaps_data = round_heatmaps_full['roundHeatmaps']
    grid_size = round_heatmaps_full['gridSize']
    bounds = round_heatmaps_full['bounds']
    filters = round_heatmaps_full['filters']
    
    # Get team names
    team_a, team_b = get_team_names_from_match(match_data)
    print(f"Teams: {team_a} vs {team_b}")
    
    # Determine team sides per round
    print("Determining team sides per round...")
    round_team_sides = determine_team_sides_per_round(match_data)
    
    # Aggregate
    print("Aggregating heatmaps by team+side...")
    team_side_heatmaps = aggregate_heatmaps_by_team_side(
        round_heatmaps_data, round_team_sides, team_a, team_b, grid_size
    )
    
    # Print summary
    print("\nSummary:")
    for key, data in team_side_heatmaps.items():
        print(f"  {key}: {data['numRounds']} rounds, {data['samples']} samples")
        print(f"    Rounds: {data['rounds']}")
    
    # Export
    output_data = {
        "teamSideHeatmaps": team_side_heatmaps,
        "teams": {
            "teamA": team_a,
            "teamB": team_b
        },
        "gridSize": grid_size,
        "bounds": bounds,
        "filters": filters
    }
    
    output_path = Path(args.output)
    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\n✓ Team+side heatmaps saved to: {output_path}")


if __name__ == '__main__':
    main()