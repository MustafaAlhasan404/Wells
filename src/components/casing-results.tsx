import React from "react";
import { EnhancedTable } from "@/components/ui/enhanced-table";

interface CasingResult {
  section: string;
  nearestBitSize: string;
  dcsg: string;
  atBody: string;
  internalDiameter: string;
}

interface CasingResultsProps {
  results: CasingResult[];
}

const CasingResults: React.FC<CasingResultsProps> = ({ results }) => {
  if (!results || results.length === 0) {
    return <div className="text-center py-4">No results available</div>;
  }

  return (
    <EnhancedTable
      headers={["Section", "Nearest Bit Size", "DCSG", "DCSG'", "Internal Diameter"]}
      rows={results.map(result => [
        result.section,
        result.nearestBitSize,
        result.dcsg,
        result.atBody,
        result.internalDiameter
      ])}
      rounded={true}
      highlightOnHover={true}
      alternateRows={true}
      showBorders={true}
      className="shadow-sm"
    />
  );
};

export default CasingResults; 