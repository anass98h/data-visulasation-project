#!/usr/bin/env python3
"""
Script to extract match data from the backend API and save different fields into separate JSON files.
"""

import requests
import json
from pathlib import Path
from typing import Dict, Any, List
from collections import OrderedDict


# Configuration
API_BASE_URL = "http://0.0.0.0:8000"
OUTPUT_DIR = Path(__file__).parent.parent / "sampledata"


def fetch_demo_list() -> List[Dict[str, Any]]:
    """Fetch list of all available demos from the API."""
    try:
        response = requests.get(f"{API_BASE_URL}/demos")
        response.raise_for_status()
        data = response.json()
        return data.get('demos', [])
    except requests.RequestException as e:
        print(f"Error fetching demo list: {e}")
        return []


def fetch_demo_data(demo_id: str) -> Dict[str, Any]:
    """Fetch full data for a specific demo."""
    try:
        response = requests.get(f"{API_BASE_URL}/demo/{demo_id}")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching demo {demo_id}: {e}")
        return {}


def save_json(data: Any, filename: str):
    """Save data to a JSON file in the output directory."""
    filepath = OUTPUT_DIR / filename
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved: {filename}")


def extract_and_save_demo(demo_id: str):
    """Extract and save different fields from a demo into separate JSON files."""
    print(f"\n{'='*60}")
    print(f"Processing Demo: {demo_id}")
    print(f"{'='*60}")

    demo_data = fetch_demo_data(demo_id)

    if not demo_data:
        print(f"✗ Failed to fetch data for demo {demo_id}")
        return

    # Extract and save metadata
    if 'metadata' in demo_data:
        metadata_file = OUTPUT_DIR / "metadata.json"
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(demo_data['metadata'], f, indent=2, ensure_ascii=False)
        print(f"✓ Saved: metadata.json")

    # Extract and save all first-level data fields
    data = demo_data.get('data', {})

    # Iterate through all first-level keys and save each to a separate file
    for field_name, field_data in data.items():
        field_file = OUTPUT_DIR / f"{field_name}.json"
        with open(field_file, 'w', encoding='utf-8') as f:
            json.dump(field_data, f, indent=2, ensure_ascii=False)

        # Get count/size info
        if isinstance(field_data, list):
            info = f"({len(field_data)} items)"
        elif isinstance(field_data, dict):
            info = f"({len(field_data)} keys)"
        else:
            info = ""

        print(f"✓ Saved: {field_name}.json {info}")

    print(f"\n✓ Demo processing complete")


def print_players_summary(demo_data: Dict[str, Any]):
    """Print a quick summary of players to verify extraction."""
    players = get_players(demo_data)
    print("\nPlayers (derived):")
    for p in players:
        name = p.get("name", "")
        team = p.get("team", "")
        side = p.get("side", "")
        steam_id = p.get("steamId", "")
        print(f" - {name} | {team} | {side} | steamId={steam_id}")
    print(f"Total players: {len(players)}")


def get_players(demo_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Return list of player entries.
    - Prefer the players list under demo_data['data'] if present and complete (10 players).
    - Otherwise derive players from ticks with an early-exit once 10 uniques are found to avoid a full scan.
    """
    data = demo_data.get("data", {})
    players = data.get("players")
    if isinstance(players, list) and len(players) == 10:
        return players

    ticks = data.get("ticks", [])
    seen = OrderedDict()
    for tick in ticks:
        player_id = tick.get("steamId")
        if not player_id or player_id in seen:
            continue
        seen[player_id] = {
            "steamId": player_id,
            "name": tick.get("name", ""),
            "team": tick.get("team"),
            "side": tick.get("side"),
        }
        if len(seen) == 10:
            break

    return list(seen.values())


def main():
    """Main function to extract match data from first available demo."""
    print("="*60)
    print("CS2 Match Data Extractor")
    print("="*60)

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"\nOutput directory: {OUTPUT_DIR}")

    # Fetch list of demos
    print("\nFetching demo list from API...")
    demos = fetch_demo_list()

    if not demos:
        print("\n✗ No demos found or unable to connect to API")
        print(f"  Make sure the backend is running at {API_BASE_URL}")
        return

    print(f"✓ Found {len(demos)} demo(s)")

    # Process only the first demo
    if demos:
        demo_id = demos[0].get('demo_id')
        if demo_id:
            demo_data = fetch_demo_data(demo_id)
            if demo_data:
                print_players_summary(demo_data)
                extract_and_save_demo(demo_id)

    print("\n" + "="*60)
    print("Extraction Complete!")
    print("="*60)
    print(f"All data saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
