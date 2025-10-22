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

export function economyDropdown() {
  return (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select the side" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>side</SelectLabel>
          <SelectItem value="ct">ct</SelectItem>
          <SelectItem value="t">t</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

