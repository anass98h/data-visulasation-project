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

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="text-2xl font-semibold">Loading data...</div>
            <div className="text-muted-foreground">Please wait while we fetch the match data</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Economy Distribution</h1>
          <p className="text-muted-foreground mt-2">
            Analyze team economy performance across game rounds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Select Team:</span>
          <EconomyDropdown
            value={dropdownValue}
            onValueChange={setDropdownValue}
          />
        </div>
      </div>

      {/* Economy Cards */}
      <Economy totalEconomy={totalEconomy}/>

      {/* Line Chart */}
      <LineChart
        data={lineChartData}
        title={`${dropdownValue.toUpperCase()} Economy Over Rounds`}
        description={`Track ${dropdownValue === 'ct' ? 'Counter-Terrorist' : 'Terrorist'} economy performance across game rounds`}
      />
    </div>
  );
}
