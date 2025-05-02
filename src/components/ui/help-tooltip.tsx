"use client"

import * as React from "react"
import { HelpCircle } from "lucide-react"

interface HelpTooltipProps {
  text: string
  className?: string
}

export function HelpTooltip({ text, className }: HelpTooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const tooltipRef = React.useRef<HTMLDivElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  // Close tooltip when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current && 
        buttonRef.current && 
        !tooltipRef.current.contains(event.target as Node) && 
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        className={`inline-flex items-center text-muted-foreground hover:text-primary focus:outline-none ${className}`}
        aria-label="Help"
        onClick={() => setIsVisible(!isVisible)}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className="absolute z-50 bottom-6 left-1/2 transform -translate-x-1/2 w-max max-w-xs bg-popover text-popover-foreground rounded-md border shadow-md px-3 py-1.5 text-sm animate-in fade-in-0 zoom-in-95"
        >
          <p className="text-sm whitespace-normal">{text}</p>
        </div>
      )}
    </div>
  )
} 