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

interface MatchDropdownProps {
  value?: string;
  onValueChange?: (value: string) => void;
}

export function MatchDropdown({
  value,
  onValueChange,
}: MatchDropdownProps) {
  return (
    <Select value={value} onValueChange={onValueChange} defaultValue="match1">
      <SelectTrigger className="w-[180px] bg-gray-700 text-white border-gray-600 hover:bg-gray-600 focus:ring-blue-500 data-[state=open]:ring-blue-500">
        <SelectValue placeholder="Select match" />
      </SelectTrigger>
      <SelectContent className="bg-gray-700 border-gray-600">
        <SelectGroup>
          <SelectLabel className="text-gray-400">Select Match</SelectLabel>
          <SelectItem
            value="match1"
            className="text-white hover:bg-gray-600 focus:bg-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
          >
            Match 1
          </SelectItem>
          <SelectItem
            value="match2"
            className="text-white hover:bg-gray-600 focus:bg-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
          >
            Match 2
          </SelectItem>
          <SelectItem
            value="match3"
            className="text-white hover:bg-gray-600 focus:bg-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
          >
            Match 3
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
