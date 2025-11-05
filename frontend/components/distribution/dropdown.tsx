"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EconomyDropdownProps {
  value?: number;
  onValueChange?: (value: number) => void;
  teamNames?: Record<number, string>;
}

export function EconomyDropdown({
  value,
  onValueChange,
  teamNames,
}: EconomyDropdownProps) {
  // Convert number to string for Select component
  const stringValue = value?.toString();

  const handleValueChange = (newValue: string) => {
    if (onValueChange) {
      onValueChange(Number(newValue));
    }
  };

  return (
    <Select value={stringValue} onValueChange={handleValueChange} defaultValue="1">
      <SelectTrigger className="w-[200px] bg-gray-700 text-white border-gray-600 hover:bg-gray-600 focus:ring-blue-500 data-[state=open]:ring-blue-500">
        <SelectValue placeholder="Select team" />
      </SelectTrigger>
      <SelectContent className="bg-gray-700 border-gray-600">
        <SelectGroup>
          <SelectLabel className="text-gray-400">Select Team</SelectLabel>
          <SelectItem
            value="1"
            className="text-white hover:bg-gray-600 focus:bg-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
          >
            {teamNames?.[1] || 'Team 1'}
          </SelectItem>
          <SelectItem
            value="2"
            className="text-white hover:bg-gray-600 focus:bg-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
          >
            {teamNames?.[2] || 'Team 2'}
          </SelectItem>
          <SelectItem
            value="0"
            className="text-white hover:bg-gray-600 focus:bg-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
          >
            Both Teams
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
