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
  value?: string;
  onValueChange?: (value: string) => void;
}

export function EconomyDropdown({
  value,
  onValueChange,
}: EconomyDropdownProps) {
  return (
    <Select value={value} onValueChange={onValueChange} defaultValue="ct">
      <SelectTrigger className="w-[200px] bg-gray-700 text-white border-gray-600 hover:bg-gray-600 focus:ring-blue-500 data-[state=open]:ring-blue-500">
        <SelectValue placeholder="Select the side" />
      </SelectTrigger>
      <SelectContent className="bg-gray-700 border-gray-600">
        <SelectGroup>
          <SelectLabel className="text-gray-400">Team Side</SelectLabel>
          <SelectItem
            value="ct"
            className="text-white hover:bg-gray-600 focus:bg-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
          >
            Counter-Terrorist (CT)
          </SelectItem>
          <SelectItem
            value="t"
            className="text-white hover:bg-gray-600 focus:bg-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
          >
            Terrorist (T)
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
