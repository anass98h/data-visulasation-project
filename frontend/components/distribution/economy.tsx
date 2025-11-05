"use client";

const Economy = ({ totalEconomy }: { totalEconomy: any }) => {
  console.log("Economy component is rendering");

  if (!totalEconomy) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-gray-700 p-6 rounded-lg border border-gray-600 text-center">
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-white">CT Economy</h3>
            <p className="text-sm text-gray-400">
              Counter-Terrorist total economy
            </p>
          </div>
          <div className="text-2xl font-bold text-gray-500">Loading...</div>
        </div>
        <div className="bg-gray-700 p-6 rounded-lg border border-gray-600 text-center">
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-white">T Economy</h3>
            <p className="text-sm text-gray-400">Terrorist total economy</p>
          </div>
          <div className="text-2xl font-bold text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="bg-gray-700 p-6 rounded-lg border border-gray-600 text-center">
        <div className="mb-2">
          <h3 className="text-lg font-semibold text-white">CT Economy</h3>
          <p className="text-sm text-gray-400">
            Counter-Terrorist total economy
          </p>
        </div>
        <div className="text-3xl font-bold text-blue-400">
          ${(totalEconomy.ct_economy ?? 0).toLocaleString()}
        </div>
      </div>
      <div className="bg-gray-700 p-6 rounded-lg border border-gray-600 text-center">
        <div className="mb-2">
          <h3 className="text-lg font-semibold text-white">T Economy</h3>
          <p className="text-sm text-gray-400">Terrorist total economy</p>
        </div>
        <div className="text-3xl font-bold text-red-400">
          ${(totalEconomy.t_economy ?? 0).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default Economy;
