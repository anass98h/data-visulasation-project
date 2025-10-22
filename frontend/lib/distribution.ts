'use client';
import {extractFeatures} from '@/lib/dataHelpers';

// function that calculates the economy 
// the return should {1:{"economy":value, "currency":value}, 2:{...}, ...}
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

    // changed code
    const result: Record<string, any> = {};
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

            result[String(idx)] = {
                roundNum: round.roundNum ?? idx,
                ct_economy,
                t_economy,
                currency: round.currency ?? 'USD'
            };
            idx += 1;
        });
    });

    // add running totals
    result['economy_in_total'] = {
        ct_economy: totalCtEconomy,
        t_economy: totalTEconomy
    };

    return result;
}

//todo 
// The method work for extract the data for plot such as linchart or scatter plot
// the input dataset would be like [{a:...., b:...,c....}, {}]
//the return data should be {x:[], y:[]}

export function extractXY(dataset, xFeatureName, yFeatureName) {

}

