'use client';
import {extractFeatures} from '@/lib/dataHelpers';

// function that calculates the economy 

// the return should like {ct_economy: {total_value: value, {1:{"economy":value, "currency":value}, 2:{...}, ...}}, t_economy: {total_value: value, rounds:{1:{"economy":value, "currency":value}, 2:{...}, ...}}}
/**
 * 
 *   "rounds": [
    {
      "roundNum": 1,
      "startTick": 1136,
      "endTick": 8131,
      "freezeTimeEndTick": 2925,
      "winner": "CT", // winner will have a icon
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
export function calculateEconomy(data: any[]): Record<string, any> {

    const rounds = extractFeatures(data, ['rounds'])

    // Initialize result structure
    const result: Record<string, any> = {
        ct_economy: {
            total_value: 0,
            rounds: {}
        },
        t_economy: {
            total_value: 0,
            rounds: {}
        }
    };

    let totalCtEconomy = 0;
    let totalTEconomy = 0;
    let idx = 1; // sequential key for "all rounds"

    rounds.forEach((item: any) => {
        const roundArray = item['rounds'];
        if (!Array.isArray(roundArray)) return;

        roundArray.forEach((round: any) => {
            const ctStart = Number(round.ctStartMoney ?? 0);
            const tStart = Number(round.tStartMoney ?? 0);
            const ctEquip = Number(round.ctEquipmentValue ?? 0);
            const tEquip = Number(round.tEquipmentValue ?? 0);

            const ct_economy = ctStart + ctEquip;
            const t_economy = tStart + tEquip;

            totalCtEconomy += ct_economy;
            totalTEconomy += t_economy;

            // Store CT economy for this round
            result.ct_economy.rounds[String(idx)] = {
                economy: ct_economy,
                currency: round.currency ?? 'USD'
            };

            // Store T economy for this round
            result.t_economy.rounds[String(idx)] = {
                economy: t_economy,
                currency: round.currency ?? 'USD'
            };

            idx += 1;
        });
    });

    // Set total values
    result.ct_economy.total_value = totalCtEconomy;
    result.t_economy.total_value = totalTEconomy;

    return result;
}


// The method work for extract the data for plot such as linchart or scatter plot
// the input dataset can be:
//   1. An array like [{a:...., b:...,c....}, {}]
//   2. An economyData object like {ct_economy: {rounds: {...}}, t_economy: {rounds: {...}}}
// the return data should be {x:[], y:[]}
// need to check the data that plotly.js need to draw the line chart
// If xFeatureName is not provided, x will automatically be the array index (0, 1, 2, ...)

export function extractXY(dataset: any[] | any, yFeatureName?: any, xFeatureName?: any, side?: 'ct' | 't') {
    const x: any[] = [];
    const y: any[] = [];

    // Check if dataset is an economyData object (has ct_economy or t_economy)
    if (!Array.isArray(dataset) && (dataset.ct_economy || dataset.t_economy)) {
        // It's an economyData object - extract rounds based on side
        let rounds = {};
        if (side === 'ct' && dataset.ct_economy?.rounds) {
            rounds = dataset.ct_economy.rounds;
        } else if (side === 't' && dataset.t_economy?.rounds) {
            rounds = dataset.t_economy.rounds;
        } else {
            // Default to ct if available, otherwise t
            rounds = dataset.ct_economy?.rounds || dataset.t_economy?.rounds || {};
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

