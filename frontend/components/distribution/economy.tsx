"use client";

interface EconomyProps {
  economyData: any;
  teamNames: Record<number, string>;
  teamMapping?: { CT: string; T: string };
  staticTeamMapping?: { CT: string; T: string };
}

const Economy = ({
  economyData,
  teamNames,
  teamMapping,
  staticTeamMapping,
}: EconomyProps) => {
  console.log("Economy component is rendering");

  // teamNames[1] is the team that started as CT
  // teamNames[2] is the team that started as T
  // economyData.teams[1] is the economy for team that started as CT
  // economyData.teams[2] is the economy for team that started as T

  const team1Name = teamNames?.[1] || staticTeamMapping?.CT || "Team 1";
  const team2Name = teamNames?.[2] || staticTeamMapping?.T || "Team 2";

  // Determine which team is currently on which side
  const team1IsCT = teamMapping?.CT === team1Name;
  const team2IsCT = teamMapping?.CT === team2Name;

  if (!economyData || !economyData.teams) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 text-center">
          <div className="mb-1">
            <h3 className="text-sm font-semibold text-white">{team1Name}</h3>
            <p className="text-xs text-gray-400">Total economy</p>
          </div>
          <div className="text-xl font-bold text-gray-500">Loading...</div>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 text-center">
          <div className="mb-1">
            <h3 className="text-sm font-semibold text-white">{team2Name}</h3>
            <p className="text-xs text-gray-400">Total economy</p>
          </div>
          <div className="text-xl font-bold text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  // Create cards with dynamic colors based on current side
  const team1Card = (
    <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 text-center">
      <div className="mb-1">
        <h3 className="text-sm font-semibold text-white">{team1Name}</h3>
        <p className="text-xs text-gray-400">Total economy</p>
      </div>
      <div
        className={`text-2xl font-bold ${
          team1IsCT ? "text-blue-400" : "text-red-400"
        }`}
      >
        ${(economyData.teams[1]?.total_value ?? 0).toLocaleString()}
      </div>
    </div>
  );

  const team2Card = (
    <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 text-center">
      <div className="mb-1">
        <h3 className="text-sm font-semibold text-white">{team2Name}</h3>
        <p className="text-xs text-gray-400">Total economy</p>
      </div>
      <div
        className={`text-2xl font-bold ${
          team2IsCT ? "text-blue-400" : "text-red-400"
        }`}
      >
        ${(economyData.teams[2]?.total_value ?? 0).toLocaleString()}
      </div>
    </div>
  );

  // Display CT team first (left), T team second (right)
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {team1IsCT ? team1Card : team2Card}
      {team1IsCT ? team2Card : team1Card}
    </div>
  );
};

export default Economy;
