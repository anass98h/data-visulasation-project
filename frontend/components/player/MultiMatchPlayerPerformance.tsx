"use client";

import React, { useEffect, useState } from "react";

interface MultiMatchPlayerPerformanceProps {
  selectedDemoIds: string[];
  matchDataList: any[];
  isLoading: boolean;
}

export default function MultiMatchPlayerPerformance({
  selectedDemoIds,
  matchDataList,
  isLoading,
}: MultiMatchPlayerPerformanceProps) {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Process data when matchDataList changes
    if (matchDataList.length > 0) {
      setProcessing(true);

      // Simulate async processing
      setTimeout(() => {
        // TODO: Add your actual data processing logic here
        const processedData = {
          totalMatches: matchDataList.length,
          demoIds: selectedDemoIds,
          // Add more processed data as needed
        };

        setResult(processedData);
        setProcessing(false);
      }, 500);
    } else {
      setResult(null);
    }
  }, [matchDataList, selectedDemoIds]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading match data...</p>
        </div>
      </div>
    );
  }

  if (processing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Processing player performance data...</p>
        </div>
      </div>
    );
  }

  if (!selectedDemoIds.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-400 text-lg">Select matches to view player performance</p>
      </div>
    );
  }

  return (
    <div className="min-h-[400px] p-4">
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">
          Player Performance Analysis
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700/50 rounded p-4">
              <p className="text-gray-400 text-sm">Selected Matches</p>
              <p className="text-2xl font-bold text-white mt-1">
                {result?.totalMatches || 0}
              </p>
            </div>

            <div className="bg-gray-700/50 rounded p-4">
              <p className="text-gray-400 text-sm">Demo IDs</p>
              <p className="text-sm text-white mt-1">
                {selectedDemoIds.join(", ")}
              </p>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-4">
            <p className="text-blue-300 text-sm">
              Data received! Ready for player performance analysis.
            </p>
            <p className="text-gray-400 text-xs mt-2">
              Implement your player performance visualization logic here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
