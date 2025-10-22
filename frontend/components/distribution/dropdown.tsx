'use client'

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface EconomyDropdownProps {
  value?: string;
  onValueChange?: (value: string) => void;
}

export function EconomyDropdown({ value, onValueChange }: EconomyDropdownProps) {
  return (
    <Select value={value} onValueChange={onValueChange} defaultValue="ct">
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select the side" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Team Side</SelectLabel>
          <SelectItem value="ct">Counter-Terrorist (CT)</SelectItem>
          <SelectItem value="t">Terrorist (T)</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

