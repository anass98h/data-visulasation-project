'use client';

import { APP_CONFIG } from '@/config/app.config';

// function that load the data
export async function loadMatchData(where: 'file' | 'db', demoId?: string) {
    if (where === 'file') {
        return await loadMatchDataFromFile();
    } else {
        return await loadMatchDataFromDB(demoId);
    }
}

async function loadMatchDataFromFile() {
    //use fetch to load data from a file
    const filePath = APP_CONFIG.DATA_PATHS.MATCH_DATA;
    // console.log('📂 Loading data from:', filePath);

    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('✅ Data loaded successfully!');
        return data;
    } catch (error) {
        console.error('❌ Error loading data:', error);
        throw error;
    }
}

/**
 * Load match data from backend database
 * @param demoId - Optional demo ID. If provided, fetches specific demo data. If omitted, fetches all demos metadata.
 * @returns Demo data object (if demoId provided) or array of demo metadata (if no demoId)
 */
async function loadMatchDataFromDB(demoId?: string) {
    const { API } = APP_CONFIG;

    try {
        let url: string;

        if (demoId) {
            // Fetch specific demo by ID
            url = `${API.BASE_URL}${API.ENDPOINTS.DEMO}/${demoId}`;
            console.log('📂 Loading demo from DB:', demoId);
        } else {
            // Fetch all demos metadata
            url = `${API.BASE_URL}${API.ENDPOINTS.DEMOS}`;
            console.log('📂 Loading all demos from DB');
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        // If fetching specific demo, return just the data field
        // If fetching all demos, return the demos array
        const data = demoId ? result.data : result.demos;

        console.log('✅ Data loaded successfully from DB!');
        return data;
    } catch (error) {
        console.error('❌ Error loading data from DB:', error);
        throw error;
    }
}


// function that extract specifc features from the data
export function extractFeatures(data: any, features: string[]): Record<string, any>[] {
    return data.map((item: any) => {
        const extracted: any = {};
        features.forEach((feature) => {
            extracted[feature] = item[feature];
        });
        return extracted;
    }); 
}

// function that extracts team names from match data
// Returns mapping of team identifiers to actual team names
// 1 = team that started as CT, 2 = team that started as T
export function extractTeamNames(matchData: any): Record<number, string> {
    const teams: Record<number, string> = {};

    if (!matchData?.ticks || matchData.ticks.length === 0) {
        return teams;
    }

    // Look through early ticks to find which team started on which side
    for (const tick of matchData.ticks) {
        if (tick.side === "CT" && !teams[1]) {
            teams[1] = tick.team;
        }
        if (tick.side === "T" && !teams[2]) {
            teams[2] = tick.team;
        }
        // Stop once we've found both teams
        if (teams[1] && teams[2]) break;
    }

    return teams;
}

// function that calculates
