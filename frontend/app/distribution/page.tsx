'use client';

import { TeamSwitch } from "@/components/distribution/teamSwitch";
import { MatchDropdown } from "@/components/distribution/matchDropdown";
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
  const [teamSelection, setTeamSelection] = useState<number>(1);
  const [matchSelection, setMatchSelection] = useState<string>("match1");
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
    console.log("Team selection changed:", teamSelection);
    // when the team selection changes, we will render different team's economy

    if (!economyData.teams) return;

    // If "Both Teams" is selected (value = 0), use extractXYForBothTeams
    // Otherwise, use extractXY for single team
    if (teamSelection === 0) {
      const result = distributionHelpers.extractXYForBothTeams(economyData, 'economy');
      setLineChartData(result);
      console.log("Extracted XY data for both teams:", result);
    } else {
      // Single team selected (1 or 2)
      const result = distributionHelpers.extractXY(economyData, 'economy', undefined, teamSelection);

      // Extract winner data from rounds
      const winners: number[] = [];
      if (economyData.teams[teamSelection]?.rounds) {
        const roundsArray = Object.values(economyData.teams[teamSelection].rounds);
        roundsArray.forEach((round: any) => {
          winners.push(round.winner);
        });
      }

      // Convert to array format for LineChart with team name and color
      const teamData = [{
        x: result.x,
        y: result.y,
        label: economyData.teams[teamSelection]?.name || `Team ${teamSelection}`,
        color: teamSelection === 1 ? '#3b82f6' : '#ef4444',
        teamId: teamSelection,
        winners: winners
      }];
      setLineChartData(teamData);
      console.log("Extracted XY data for single team:", teamData);
    }

  }, [teamSelection, economyData]);

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
          <span className="text-sm font-medium text-muted-foreground">Match:</span>
          <MatchDropdown
            value={matchSelection}
            onValueChange={setMatchSelection}
          />
        </div>
      </div>

      {/* Economy Cards */}
      <Economy economyData={economyData} teamNames={teamNames} />

      {/* Line Chart */}
      <LineChart
        seriesData={lineChartData}
        title={teamSelection === 0 ? 'Both Teams Economy Over Rounds' : `${economyData.teams?.[teamSelection]?.name || 'Team'} Economy Over Rounds`}
        description={teamSelection === 0 ? 'Compare economy performance across game rounds' : `Track ${economyData.teams?.[teamSelection]?.name || 'team'} economy performance across game rounds`}
      />

      {/* Team Selection Switch (below chart) */}
      <TeamSwitch
        value={teamSelection}
        onValueChange={setTeamSelection}
        teamNames={teamNames}
      />
    </div>
  );
}
