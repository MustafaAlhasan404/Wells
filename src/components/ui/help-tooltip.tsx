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
  const [position, setPosition] = React.useState({ x: 0, y: 0 })

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

  // Calculate tooltip position
  React.useEffect(() => {
    if (isVisible && buttonRef.current && tooltipRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      
      // Center the tooltip above the button
      let left = buttonRect.left + (buttonRect.width / 2) - (tooltipRect.width / 2)
      
      // Ensure tooltip doesn't go off the left edge of the screen
      if (left < 10) left = 10
      
      // Ensure tooltip doesn't go off the right edge of the screen
      if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10
      }
      
      setPosition({
        x: left,
        y: buttonRect.top - tooltipRect.height - 5
      })
    }
  }, [isVisible])

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
          className="fixed z-100 bg-popover text-popover-foreground rounded-md border shadow-md px-3 py-1.5 text-sm animate-in fade-in-0 zoom-in-95"
          style={{ 
            minWidth: "180px",
            maxWidth: "250px",
            top: `${position.y}px`,
            left: `${position.x}px`,
          }}
        >
          <p className="text-sm whitespace-normal">{text}</p>
        </div>
      )}
    </div>
  )
} 