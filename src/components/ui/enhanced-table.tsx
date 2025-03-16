import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EnhancedTableProps {
  headers: string[];
  rows: ReactNode[][];
  className?: string;
  headerClassName?: string;
  rowClassName?: string;
  cellClassName?: string;
  showBorders?: boolean;
  alternateRows?: boolean;
  rounded?: boolean;
  stickyHeader?: boolean;
  compact?: boolean;
  highlightOnHover?: boolean;
}

export function EnhancedTable({
  headers,
  rows,
  className,
  headerClassName,
  rowClassName,
  cellClassName,
  showBorders = true,
  alternateRows = true,
  rounded = true,
  stickyHeader = false,
  compact = false,
  highlightOnHover = true,
}: EnhancedTableProps) {
  return (
    <div className={cn(
      "w-full overflow-auto",
      rounded && "rounded-lg",
      showBorders && "border border-border",
      className
    )}>
      <table className="w-full relative">
        <thead className={cn(
          "bg-primary text-primary-foreground",
          stickyHeader && "sticky top-0",
          rounded && "rounded-t-lg overflow-hidden"
        )}>
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className={cn(
                  "py-3 px-4 text-center font-medium",
                  compact ? "py-2 px-3 text-sm" : "",
                  showBorders && "border-b border-primary-foreground/20",
                  index === 0 && rounded && "rounded-tl-lg",
                  index === headers.length - 1 && rounded && "rounded-tr-lg",
                  headerClassName
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(
                alternateRows && rowIndex % 2 === 1 ? "bg-muted/40" : "bg-background",
                highlightOnHover && "hover:bg-muted/60 transition-colors",
                rowClassName
              )}
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cn(
                    "py-3 px-4 text-center",
                    compact ? "py-2 px-3 text-sm" : "",
                    showBorders && "border-t border-border/50",
                    cellClassName
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 