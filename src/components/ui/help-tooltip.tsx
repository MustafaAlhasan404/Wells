"use client"

import * as React from "react"
import { HelpCircle } from "lucide-react"
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent
} from "./tooltip"

interface HelpTooltipProps {
  text: string
  className?: string
}

export function HelpTooltip({ text, className }: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <button type="button" className={`inline-flex items-center text-muted-foreground hover:text-primary focus:outline-none ${className}`} aria-label="Help">
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[300px]" side="right" align="start">
          <p className="text-sm">{text}</p>
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  )
} 