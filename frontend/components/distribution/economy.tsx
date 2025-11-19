"use client";

interface EconomyProps {
  economyData: any;
  teamNames: Record<number, string>;
}

const Economy = ({ economyData, teamNames }: EconomyProps) => {
  console.log("Economy component is rendering");

  if (!economyData || !economyData.teams) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 text-center">
          <div className="mb-1">
            <h3 className="text-sm font-semibold text-white">
              {teamNames?.[1] || "Team 1"}
            </h3>
            <p className="text-xs text-gray-400">Total economy</p>
          </div>
          <div className="text-xl font-bold text-gray-500">Loading...</div>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 text-center">
          <div className="mb-1">
            <h3 className="text-sm font-semibold text-white">
              {teamNames?.[2] || "Team 2"}
            </h3>
            <p className="text-xs text-gray-400">Total economy</p>
          </div>
          <div className="text-xl font-bold text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 text-center">
        <div className="mb-1">
          <h3 className="text-sm font-semibold text-white">
            {economyData.teams[1]?.name || "Team 1"}
          </h3>
          <p className="text-xs text-gray-400">Total economy</p>
        </div>
        <div className="text-2xl font-bold text-blue-400">
          ${(economyData.teams[1]?.total_value ?? 0).toLocaleString()}
        </div>
      </div>
      <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 text-center">
        <div className="mb-1">
          <h3 className="text-sm font-semibold text-white">
            {economyData.teams[2]?.name || "Team 2"}
          </h3>
          <p className="text-xs text-gray-400">Total economy</p>
        </div>
        <div className="text-2xl font-bold text-red-400">
          ${(economyData.teams[2]?.total_value ?? 0).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default Economy;
