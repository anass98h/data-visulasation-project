'use client';

import { APP_CONFIG } from '@/config/app.config';

// function that load the data
export async function loadMatchData(where: 'file' | 'db') {
    if (where === 'file') {
        return await loadMatchDataFromFile();
    } else {
        return await loadMatchDataFromDB();
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

// TODO
async function loadMatchDataFromDB() {
    // const response = await fetch(config.dataPath);
    // const data = await response.json();
    // return data;
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

// function that calculates
