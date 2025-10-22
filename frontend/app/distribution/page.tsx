'use client';

import { EconomyDropdown } from "@/components/distribution/Dropdown";
import LineChart from "@/components/distribution/LineChart";
import Economy from "@/components/distribution/Economy";
import { useEffect, useState } from "react";
import * as dataHelpers from "@/lib/dataHelpers";
import * as distributionHelpers from "@/lib/distribution";


export default function Home() {
  console.log("🚀 Distribution page is rendering on server!");
  console.log("Rendering Economy Component");



  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dropdownValue, setDropdownValue] = useState<string>('ct');
  const [economyData, setEconomyData] = useState<Record<string, any>>({});
  const [roundsData, setRoundsData] = useState<any[]>([]);
  const [lineChartData, setLineChartData] = useState<any>({});
 

  // will load every time when the page refresh
  useEffect(() => {

    console.log("Rendering Economy Component (client)");
    const fetchData = async () => {
      try {
        const loaded = await dataHelpers.loadMatchData('file');
        console.log("Loaded match data:", loaded);
        setData(loaded);

        //2. extract the rounds
        const extractedRounds = dataHelpers.extractFeatures([loaded], ['rounds']);
        console.log("Extracted rounds data:", extractedRounds);
        setRoundsData(extractedRounds);

        //3. calculate economy
        const calculatedEconomy = distributionHelpers.calculateEconomy([loaded]);
        console.log("Calculated economy:", calculatedEconomy);
        setEconomyData(calculatedEconomy);
        setLoading(false);
      } catch (error) {
        console.error("Error loading match data:", error);
        setLoading(false);
      }
    };

    fetchData();

  }, []);

  //will be invoked when the data is changed
  useEffect(() => {
    console.log("Dropdown value changed:", dropdownValue);
    // when the dropdown value changes, we will render different side's economy

    if (!economyData.ct_economy && !economyData.t_economy) return;

    // x will be automatically set to round numbers (1, 2, 3, ...)
    // pass economyData, y feature name ('economy'), and the side based on dropdown
    const result = distributionHelpers.extractXY(economyData, 'economy', undefined, dropdownValue as 'ct' | 't');
    setLineChartData(result);
    console.log("Extracted XY data:", result);

  }, [dropdownValue, economyData]);

  // Create totalEconomy object from new structure
  const totalEconomy = economyData.ct_economy && economyData.t_economy ? {
    ct_economy: economyData.ct_economy.total_value,
    t_economy: economyData.t_economy.total_value
  } : undefined;

  return <>
  <div className="container mx-auto p-6 space-y-6">
    <EconomyDropdown />
    <Economy totalEconomy={totalEconomy}/>
    <LineChart
      data={lineChartData}
      title={`${dropdownValue.toUpperCase()} Economy Over Rounds`}
      description={`Track ${dropdownValue === 'ct' ? 'Counter-Terrorist' : 'Terrorist'} economy performance across game rounds`}
    />
  </div>
  </>;
}
