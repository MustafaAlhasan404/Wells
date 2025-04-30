import React from "react";
import { EnhancedTable } from "@/components/ui/enhanced-table";
import { HADResults, HADData } from "@/utils/casingCalculations";

interface CasingResult {
  section: string;
  nearestBitSize: string;
  dcsg: string;
  atBody: string;
  internalDiameter: string;
}

interface CasingResultsProps {
  results: CasingResult[];
  hadData?: HADResults | null;
}

function calculateDim(hadSectionData: HADData[] | undefined): string {
  if (!hadSectionData || hadSectionData.length === 0) return "-";
  // Collect all Lvalues and their corresponding internal diameters
  const pairs: { L: number, di: number }[] = [];
  hadSectionData.forEach(row => {
    if (row.L1 && row.internalDiameter) pairs.push({ L: row.L1, di: row.internalDiameter });
    if (row.L2 && row.internalDiameter) pairs.push({ L: row.L2, di: row.internalDiameter });
    if (row.L3 && row.internalDiameter) pairs.push({ L: row.L3, di: row.internalDiameter });
    if (row.L4 && row.internalDiameter) pairs.push({ L: row.L4, di: row.internalDiameter });
  });
  // Remove zero or negative L values
  const filtered = pairs.filter(p => p.L > 0);
  if (filtered.length === 0) return "-";
  if (filtered.length === 1) return filtered[0].di.toFixed(2);
  const numerator = filtered.reduce((sum, p) => sum + p.L * p.di, 0);
  const denominator = filtered.reduce((sum, p) => sum + p.L, 0);
  if (denominator === 0) return "-";
  return (numerator / denominator).toFixed(2);
}

const CasingResults: React.FC<CasingResultsProps> = ({ results, hadData }) => {
  if (!results || results.length === 0) {
    return <div className="text-center py-4">No results available</div>;
  }

  // Helper to get HAD section name from casing result section
  const getHadSectionName = (section: string) => {
    if (section.toLowerCase().includes("production")) return "Production Section";
    if (section.toLowerCase().includes("surface")) return "Surface Section";
    
    // Handle numbered intermediate sections
    if (section.toLowerCase().includes("intermediate")) {
      // Extract the number if present (e.g., "Intermediate 1" -> "1")
      const match = section.match(/intermediate\s+(\d+)/i);
      if (match && match[1]) {
        return `Intermediate ${match[1]} Section`;
      }
      // Default to generic intermediate if no number found
      return "Intermediate Section";
    }
    
    return section + " Section";
  };

  return (
    <EnhancedTable
      headers={["Section", "Nearest Bit Size", "DCSG", "DCSG'", "Internal Diameter", "Dim"]}
      rows={results.map(result => {
        let dim = "-";
        if (hadData) {
          // Try to find the HAD section for this result
          const sectionName = getHadSectionName(result.section);
          const sectionData = hadData[sectionName];
          if (sectionData) {
            // Use the first atHead (usually only one per section)
            const atHeadKeys = Object.keys(sectionData);
            if (atHeadKeys.length > 0) {
              const hadRows = sectionData[atHeadKeys[0]];
              dim = calculateDim(hadRows);
            }
          }
        }
        return [
          result.section,
          result.nearestBitSize,
          result.dcsg,
          result.atBody,
          result.internalDiameter,
          dim
        ];
      })}
      rounded={true}
      highlightOnHover={true}
      alternateRows={true}
      showBorders={true}
      className="shadow-sm"
    />
  );
};

export default CasingResults; 