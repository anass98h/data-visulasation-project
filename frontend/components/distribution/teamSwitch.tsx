"use client";

import React from "react";

interface TeamSwitchProps {
  value?: number;
  onValueChange?: (value: number) => void;
  teamNames?: Record<number, string>;
}

export function TeamSwitch({
  value,
  onValueChange,
  teamNames,
}: TeamSwitchProps) {
  const handleClick = (teamValue: number) => {
    if (onValueChange) {
      onValueChange(teamValue);
    }
  };

  const baseButtonClass =
    "px-6 py-2 font-medium transition-all duration-200 focus:outline-none";
  const activeClass = "bg-blue-600 text-white";
  const inactiveClass =
    "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white";

  const getButtonClass = (teamValue: number) => {
    const isActive = value === teamValue;
    let positionClass = "";

    if (teamValue === 1) {
      positionClass = "rounded-l-lg"; // Left button
    } else if (teamValue === 0) {
      positionClass = ""; // Middle button
    } else {
      positionClass = "rounded-r-lg"; // Right button
    }

    return `${baseButtonClass} ${positionClass} ${
      isActive ? activeClass : inactiveClass
    }`;
  };

  return (
    <div className="flex justify-center">
      <div className="inline-flex border border-gray-600 rounded-lg overflow-hidden">
        <button
          onClick={() => handleClick(1)}
          className={getButtonClass(1)}
          type="button"
        >
          {teamNames?.[1] || "Team 1"}
        </button>
        <button
          onClick={() => handleClick(0)}
          className={getButtonClass(0)}
          type="button"
        >
          Both Teams
        </button>
        <button
          onClick={() => handleClick(2)}
          className={getButtonClass(2)}
          type="button"
        >
          {teamNames?.[2] || "Team 2"}
        </button>
      </div>
    </div>
  );
}
