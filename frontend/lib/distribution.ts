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
export function calculateEconomy(data: any[]): {} {

    const rounds = extractFeatures(data, ['rounds'])

    const result: Record<number, { economy: number; currency: string }> = {};
    rounds.forEach((item, index) => {
        const roundInfo = item['rounds'];
    });
    return result;
}


