
import json
import numpy as np
from pathlib import Path
from app.config import DEMOS_DIR

# Map configurations 
# Map configurations 
MAP_CONFIG = {
    "ar_baggage": {
        "minX": -1316,
        "maxX": -1316 + 1024 * 2.539062,
        "minY": 1288 - 1024 * 2.539062,
        "maxY": 1288,
    },
    "ar_shoots": {
        "minX": -1368,
        "maxX": -1368 + 1024 * 2.6875,
        "minY": 1952 - 1024 * 2.6875,
        "maxY": 1952,
    },
    "cs_italy": {
        "minX": -2647,
        "maxX": -2647 + 1024 * 4.6,
        "minY": 2592 - 1024 * 4.6,
        "maxY": 2592,
    },
    "cs_office": {
        "minX": -1838,
        "maxX": -1838 + 1024 * 4.1,
        "minY": 1858 - 1024 * 4.1,
        "maxY": 1858,
    },
    "de_ancient": {
        "minX": -2953,
        "maxX": -2953 + 1024 * 5,
        "minY": 2164 - 1024 * 5,
        "maxY": 2164,
    },
    "de_anubis": {
        "minX": -2796,
        "maxX": -2796 + 1024 * 5.22,
        "minY": 3328 - 1024 * 5.22,
        "maxY": 3328,
    },
    "de_dust2": {
        "minX": -2476,
        "maxX": -2476 + 1024 * 4.4,
        "minY": 3239 - 1024 * 4.4,
        "maxY": 3239,
    },
    "de_inferno": {
        "minX": -2087,
        "maxX": -2087 + 1024 * 4.9,
        "minY": 3870 - 1024 * 4.9,
        "maxY": 3870,
    },
    "de_mirage": {
        "minX": -3230,
        "maxX": -3230 + 1024 * 5.0,
        "minY": 1713 - 1024 * 5.0,
        "maxY": 1713,
    },
    "de_nuke": {
        "minX": -3453,
        "maxX": -3453 + 1024 * 7,
        "minY": 2887 - 1024 * 7,
        "maxY": 2887,
    },
    "de_overpass": {
        "minX": -4831,
        "maxX": -4831 + 1024 * 5.2,
        "minY": 1781 - 1024 * 5.2,
        "maxY": 1781,
    },
    "de_train": {
        "minX": -2308,
        "maxX": -2308 + 1024 * 4.082077,
        "minY": 2078 - 1024 * 4.082077,
        "maxY": 2078,
    },
    "de_vertigo": {
        "minX": -3168,
        "maxX": -3168 + 1024 * 4.0,
        "minY": 1762 - 1024 * 4.0,
        "maxY": 1762,
    },
    # Default to ancient if unknown
    "default": {
        "minX": -3000,
        "maxX": 2000,
        "minY": -3000,
        "maxY": 2000,
    }
}

class HeatmapGenerator:
    def __init__(self, demo_id: str):
        self.demo_id = demo_id
        self.file_path = DEMOS_DIR / f"{demo_id}.json"
        
        if not self.file_path.exists():
            raise FileNotFoundError(f"Demo file not found: {demo_id}")
            
        with open(self.file_path, 'r') as f:
            self.match_data = json.load(f)
            
        map_name = self.match_data.get('header', {}).get('mapName', 'default')
        self.map_config = MAP_CONFIG.get(map_name, MAP_CONFIG['default'])

    def _filter_positions(self, round_filter=None, side=None, team_name=None, alive_only=True):
        """Extract and filter position data"""
        positions = []
        
        # Determine rounds to include
        game_data = self.match_data.get('game', self.match_data)
        rounds_data = game_data.get('rounds', [])
        ticks_data = game_data.get('ticks', self.match_data.get('ticks', []))
        
        target_rounds = set()
        if round_filter:
            if isinstance(round_filter, int):
                target_rounds.add(round_filter)
            else:
                target_rounds = set(round_filter)
        else:
            target_rounds = set(r['roundNum'] for r in rounds_data)
            
        # Build tick ranges
        tick_ranges = {}
        for round_info in rounds_data:
            if round_info['roundNum'] in target_rounds:
                # Use freezeTimeEndTick if available to skip freeze time
                start = round_info.get('freezeTimeEndTick', round_info['startTick'])
                end = round_info['endTick']
                tick_ranges[round_info['roundNum']] = (start, end)
                
        # Extract positions
        for tick_data in ticks_data:
            tick = tick_data.get('tick', 0)
            
            # Check if tick is in valid range
            valid_tick = False
            for start, end in tick_ranges.values():
                if start <= tick <= end:
                    valid_tick = True
                    break
            
            if not valid_tick:
                continue
                
            if alive_only and not tick_data.get('isAlive', True):
                continue
                
            player_side = tick_data.get('side', '')
            if side and player_side != side:
                continue

            # Filter by team if specified
            if team_name and tick_data.get('team') != team_name:
                continue
                
            x = tick_data.get('x')
            y = tick_data.get('y')
            
            if x is not None and y is not None:
                positions.append((x, y, player_side))
                
        return positions

    def _create_density_grid(self, positions, grid_size=50):
        """Create normalized 2D density grid"""
        if not positions:
            return np.zeros((grid_size, grid_size)).tolist(), 0
            
        xs = [p[0] for p in positions]
        ys = [p[1] for p in positions]
        
        x_edges = np.linspace(self.map_config['minX'], self.map_config['maxX'], grid_size + 1)
        y_edges = np.linspace(self.map_config['minY'], self.map_config['maxY'], grid_size + 1)
        
        hist, _, _ = np.histogram2d(xs, ys, bins=[x_edges, y_edges])
        
        # Match canvas coordinate system (flip vertical)
        hist = np.flipud(hist.T)
        
        # Normalize
        if hist.max() > 0:
            hist = hist / hist.max()
            
        return hist.tolist(), len(positions)

    def generate_overall_heatmap(self, grid_size=50):
        """Generate heatmaps broken down by team and side"""
        game_data = self.match_data.get('game', self.match_data)
        ticks_data = game_data.get('ticks', self.match_data.get('ticks', []))
        
        # Identify all teams involved
        teams = set()
        for t in ticks_data:
            if 'team' in t:
                teams.add(t['team'])
        
        heatmap_data = {
            "gridSize": grid_size,
            "bounds": self.map_config
        }
        
        for team in teams:
            for side in ['CT', 'T']:
                positions = self._filter_positions(side=side, team_name=team)
                if not positions:
                    continue
                    
                grid, samples = self._create_density_grid(positions, grid_size)
                
                # Key format: "Team Name_as_Side"
                key = f"{team}_as_{side}"
                heatmap_data[key] = {
                    "grid": grid,
                    "samples": samples
                }
        
        return {
            "heatmapData": heatmap_data
        }

    def generate_round_heatmaps(self, grid_size=50):
        """Generate heatmaps for each round separately"""
        game_data = self.match_data.get('game', self.match_data)
        rounds = game_data.get('rounds', [])
        
        round_heatmaps = {}
        
        for r in rounds:
            round_num = r['roundNum']
            
            # CT side
            ct_positions = self._filter_positions(round_filter=round_num, side='CT')
            ct_grid, ct_samples = self._create_density_grid(ct_positions, grid_size)
            
            # T side
            t_positions = self._filter_positions(round_filter=round_num, side='T')
            t_grid, t_samples = self._create_density_grid(t_positions, grid_size)
            
            round_heatmaps[str(round_num)] = {
                "ct": {"grid": ct_grid, "samples": ct_samples},
                "t": {"grid": t_grid, "samples": t_samples}
            }
            
        return {
            "roundHeatmaps": round_heatmaps,
            "gridSize": grid_size,
            "bounds": self.map_config
        }
