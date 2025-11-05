'use client';
import {extractFeatures} from '@/lib/dataHelpers';

// Team configuration constants
export const TEAM_CONFIG = {
    TEAM_1: 1,  // Team that started as CT
    TEAM_2: 2,  // Team that started as T
    BOTH: 0
};

// function that calculates the economy based on team names
// Handles halftime swap: rounds 1-15 teams on original sides, rounds 16+ teams swap sides
/**
 * Round data structure:
 *   "rounds": [
    {
      "roundNum": 1,
      "startTick": 1136,
      "endTick": 8131,
      "freezeTimeEndTick": 2925,
      "winner": "CT",
      "reason": "CTWin",
      "ctScore": 1,
      "tScore": 0,
      "winnerSide": "CT",
      "ctStartMoney": 600,
      "tStartMoney": 600,
      "ctEquipmentValue": 4500,
      "tEquipmentValue": 4900,
      "bombPlantTick": -1
    },
 */
export function calculateEconomy(data: any[], teamNames: Record<number, string>): Record<string, any> {

    const rounds = extractFeatures(data, ['rounds'])

    // Initialize result structure with team names
    const result: Record<string, any> = {
        teams: {
            1: {
                name: teamNames[1] || 'Team 1',
                total_value: 0,
                rounds: {}
            },
            2: {
                name: teamNames[2] || 'Team 2',
                total_value: 0,
                rounds: {}
            }
        }
    };

    let totalTeam1Economy = 0;
    let totalTeam2Economy = 0;
    let idx = 1; // sequential key for "all rounds"

    rounds.forEach((item: any) => {
        const roundArray = item['rounds'];
        if (!Array.isArray(roundArray)) return;

        roundArray.forEach((round: any) => {
            const roundNum = round.roundNum || idx;
            const ctStart = Number(round.ctStartMoney ?? 0);
            const tStart = Number(round.tStartMoney ?? 0);
            const ctEquip = Number(round.ctEquipmentValue ?? 0);
            const tEquip = Number(round.tEquipmentValue ?? 0);

            const ctEconomy = ctStart + ctEquip;
            const tEconomy = tStart + tEquip;

            // Determine which team gets which economy based on round number
            // Rounds 1-12: Team 1 is CT, Team 2 is T
            // Rounds 13+: Teams swap sides (Team 1 is T, Team 2 is CT)
            let team1Economy: number;
            let team2Economy: number;

            if (roundNum <= 12) {
                team1Economy = ctEconomy; // Team 1 started as CT
                team2Economy = tEconomy;  // Team 2 started as T
            } else {
                team1Economy = tEconomy;  // Team 1 swapped to T
                team2Economy = ctEconomy; // Team 2 swapped to CT
            }

            // Determine which team won this round
            const winnerSide = round.winnerSide; // "CT" or "T"
            let winnerTeam: 1 | 2;

            if (roundNum <= 12) {
                // First half: Team 1 = CT, Team 2 = T
                winnerTeam = winnerSide === "CT" ? 1 : 2;
            } else {
                // Second half: SWAPPED - Team 1 = T, Team 2 = CT
                winnerTeam = winnerSide === "CT" ? 2 : 1;
            }

            totalTeam1Economy += team1Economy;
            totalTeam2Economy += team2Economy;

            // Store Team 1 economy for this round
            result.teams[1].rounds[String(idx)] = {
                economy: team1Economy,
                currency: round.currency ?? 'USD',
                winner: winnerTeam
            };

            // Store Team 2 economy for this round
            result.teams[2].rounds[String(idx)] = {
                economy: team2Economy,
                currency: round.currency ?? 'USD',
                winner: winnerTeam
            };

            idx += 1;
        });
    });

    // Set total values
    result.teams[1].total_value = totalTeam1Economy;
    result.teams[2].total_value = totalTeam2Economy;

    return result;
}


// The method work for extract the data for plot such as linchart or scatter plot
// the input dataset can be:
//   1. An array like [{a:...., b:...,c....}, {}]
//   2. An economyData object like {teams: {1: {name: ..., rounds: {...}}, 2: {name: ..., rounds: {...}}}}
// the return data should be {x:[], y:[]}
// If xFeatureName is not provided, x will automatically be the array index (0, 1, 2, ...)

export function extractXY(dataset: any[] | any, yFeatureName?: any, xFeatureName?: any, team?: number) {
    const x: any[] = [];
    const y: any[] = [];

    // Check if dataset is an economyData object (has teams structure)
    if (!Array.isArray(dataset) && dataset.teams) {
        // It's an economyData object - extract rounds based on team
        let rounds = {};
        if (team === 1 && dataset.teams[1]?.rounds) {
            rounds = dataset.teams[1].rounds;
        } else if (team === 2 && dataset.teams[2]?.rounds) {
            rounds = dataset.teams[2].rounds;
        } else {
            // Default to team 1 if available, otherwise team 2
            rounds = dataset.teams[1]?.rounds || dataset.teams[2]?.rounds || {};
        }

        const roundsArray = Object.values(rounds);

        roundsArray.forEach((item: any, index) => {
            x.push(index + 1); // Start from 1 for round numbers
            if (yFeatureName && yFeatureName in item) {
                y.push(item[yFeatureName]);
            }
        });
    } else if (Array.isArray(dataset)) {
        // It's a regular array
        dataset.forEach((item, index) => {
            // x: use index if no xFeatureName provided
            if (xFeatureName && xFeatureName in item) {
                x.push(item[xFeatureName]);
            } else {
                x.push(index);
            }
            // y: extract from item if yFeatureName provided
            if (yFeatureName && yFeatureName in item) {
                y.push(item[yFeatureName]);
            }
        });
    }

    return { x, y };
}

// Extract data for both teams and return array of series for LineChart
export function extractXYForBothTeams(dataset: any, yFeatureName: string): any[] {
    if (!dataset.teams || !dataset.teams[1] || !dataset.teams[2]) {
        return [];
    }

    const seriesData = [];

    // Extract winner data from rounds
    const winners: number[] = [];
    if (dataset.teams[1].rounds) {
        const roundsArray = Object.values(dataset.teams[1].rounds);
        roundsArray.forEach((round: any) => {
            winners.push(round.winner);
        });
    }

    // Extract data for Team 1
    const team1Data = extractXY(dataset, yFeatureName, undefined, 1);
    seriesData.push({
        x: team1Data.x,
        y: team1Data.y,
        label: dataset.teams[1].name,
        color: '#3b82f6', // blue
        teamId: 1,
        winners: winners
    });

    // Extract data for Team 2
    const team2Data = extractXY(dataset, yFeatureName, undefined, 2);
    seriesData.push({
        x: team2Data.x,
        y: team2Data.y,
        label: dataset.teams[2].name,
        color: '#ef4444', // red
        teamId: 2,
        winners: winners
    });

    return seriesData;
}

