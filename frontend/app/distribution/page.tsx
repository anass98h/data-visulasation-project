'use client';

import { EconomyDropdown } from "@/components/distribution/dropdown";
import LineChart from "@/components/distribution/lineChart";
import Economy from "@/components/distribution/economy";
import { useEffect, useState } from "react";
import * as dataHelpers from "@/lib/dataHelpers";
import * as distributionHelpers from "@/lib/distribution";


export default function Home() {
  // console.log("🚀 Distribution page is rendering on server!");
  // console.log("Rendering Economy Component");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dropdownValue, setDropdownValue] = useState<number>(1);
  const [teamNames, setTeamNames] = useState<Record<number, string>>({});
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

        //1. extract team names
        const extractedTeamNames = dataHelpers.extractTeamNames(loaded);
        console.log("Extracted team names:", extractedTeamNames);
        setTeamNames(extractedTeamNames);

        //2. extract the rounds
        const extractedRounds = dataHelpers.extractFeatures([loaded], ['rounds']);
        console.log("Extracted rounds data:", extractedRounds);
        setRoundsData(extractedRounds);

        //3. calculate economy with team names
        const calculatedEconomy = distributionHelpers.calculateEconomy([loaded], extractedTeamNames);
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
    // when the dropdown value changes, we will render different team's economy

    if (!economyData.teams) return;

    // If "Both Teams" is selected (value = 0), use extractXYForBothTeams
    // Otherwise, use extractXY for single team
    if (dropdownValue === 0) {
      const result = distributionHelpers.extractXYForBothTeams(economyData, 'economy');
      setLineChartData(result);
      console.log("Extracted XY data for both teams:", result);
    } else {
      // Single team selected (1 or 2)
      const result = distributionHelpers.extractXY(economyData, 'economy', undefined, dropdownValue);
      // Convert to array format for LineChart with team name and color
      const teamData = [{
        x: result.x,
        y: result.y,
        label: economyData.teams[dropdownValue]?.name || `Team ${dropdownValue}`,
        color: dropdownValue === 1 ? '#3b82f6' : '#ef4444'
      }];
      setLineChartData(teamData);
      console.log("Extracted XY data for single team:", teamData);
    }

  }, [dropdownValue, economyData]);

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
            teamNames={teamNames}
          />
        </div>
      </div>

      {/* Economy Cards */}
      <Economy economyData={economyData} teamNames={teamNames} />

      {/* Line Chart */}
      <LineChart
        seriesData={lineChartData}
        title={dropdownValue === 0 ? 'Both Teams Economy Over Rounds' : `${economyData.teams?.[dropdownValue]?.name || 'Team'} Economy Over Rounds`}
        description={dropdownValue === 0 ? 'Compare economy performance across game rounds' : `Track ${economyData.teams?.[dropdownValue]?.name || 'team'} economy performance across game rounds`}
      />
    </div>
  );
}
