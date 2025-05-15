import React from "react";
import { EnhancedTable } from "@/components/ui/enhanced-table";
import { HADResults, HADData, calculateDim } from "@/utils/casingCalculations";

interface CasingResult {
  section: string;
  nearestBitSize: string;
  dcsg: string;
  atBody: string;
  internalDiameter: string;
  specifiedWallThickness?: string;
}

interface CasingResultsProps {
  results: CasingResult[];
  hadData?: HADResults | null;
}

// Helper function to extract numeric value from formatted string like "244.5 mm (9 5/8")"
function extractNumericValue(formattedString: string): number {
  if (!formattedString) return 0;
  const match = formattedString.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

// Helper function to check if a HAD section has only a single L value
function hasSingleLValue(hadSectionData: HADData[]): boolean {
  if (!hadSectionData || hadSectionData.length === 0) return false;
  
  let lValueCount = 0;
  hadSectionData.forEach(row => {
    if (row.L1 && row.L1 > 0) lValueCount++;
    if (row.L2 && row.L2 > 0) lValueCount++;
    if (row.L3 && row.L3 > 0) lValueCount++;
    if (row.L4 && row.L4 > 0) lValueCount++;
  });
  
  return lValueCount === 1;
}

// Helper function to validate atBody value (DCSG')
function validateAtBody(result: CasingResult): string {
  if (!result.atBody) return "-";
  
  // Extract numeric values from both DCSG and DCSG'
  const dcsgValue = extractNumericValue(result.dcsg);
  const atBodyValue = extractNumericValue(result.atBody);
  
  // Validate that DCSG' is different from DCSG and is a valid value
  if (atBodyValue === 0 || Math.abs(dcsgValue - atBodyValue) < 0.1) {
    // If invalid, use a fallback calculation based on the section type
    const fallbackValue = calculateFallbackAtBody(result);
    return fallbackValue || result.atBody;
  }
  
  return result.atBody;
}

// Helper function to calculate a fallback DCSG' value if needed
function calculateFallbackAtBody(result: CasingResult): string | null {
  const dcsgValue = extractNumericValue(result.dcsg);
  if (dcsgValue === 0) return null;
  
  let calculatedValue: number;
  
  if (result.section.toLowerCase().includes("surface")) {
    // For Surface section, use standardized mappings based on common casing sizes
    const knownMappings: Record<number, number> = {
      365: 339.7,     // 365 mm (14 3/8") → 339.7 mm (13 3/8")
      339.7: 298.5,   // 339.7 mm (13 3/8") → 298.5 mm (11 3/4")
      298.5: 273.1,   // 298.5 mm (11 3/4") → 273.1 mm (10 3/4")
      273.1: 244.5,   // 273.1 mm (10 3/4") → 244.5 mm (9 5/8")
      244.5: 219.1,   // 244.5 mm (9 5/8") → 219.1 mm (8 5/8")
      219.1: 177.8,   // 219.1 mm (8 5/8") → 177.8 mm (7")
      177.8: 168.3,   // 177.8 mm (7") → 168.3 mm (6 5/8")
      168.3: 139.7,   // 168.3 mm (6 5/8") → 139.7 mm (5 1/2")
      139.7: 127.0    // 139.7 mm (5 1/2") → 127.0 mm (5")
    };
    
    // Round to nearest 0.1 mm to match with mappings
    const roundedDcsg = Math.round(dcsgValue * 10) / 10;
    
    if (knownMappings[roundedDcsg]) {
      calculatedValue = knownMappings[roundedDcsg];
    } else if (dcsgValue > 300) {
      calculatedValue = dcsgValue * 0.93; // 7% reduction for large casings
    } else if (dcsgValue > 200) {
      calculatedValue = dcsgValue * 0.91; // 9% reduction for medium casings
    } else {
      calculatedValue = dcsgValue * 0.89; // 11% reduction for smaller casings
    }
  } else {
    // For other sections, use a standard percentage reduction
    calculatedValue = dcsgValue * 0.9; // 10% reduction as a rough estimate
  }
  
  // Format the calculated value with inches
  const mmValue = calculatedValue.toFixed(1);
  const inchesStr = formatMmToInches(calculatedValue);
  return `${mmValue} mm (${inchesStr})`;
}

// Helper function to format mm to inches for display
function formatMmToInches(mm: number): string {
  const inches = mm / 25.4;
  
  // Common casing sizes and their inch representations
  const commonSizes: Record<number, string> = {
    339.7: "13 3/8\"",
    298.5: "11 3/4\"",
    273.1: "10 3/4\"",
    244.5: "9 5/8\"",
    219.1: "8 5/8\"",
    177.8: "7\"",
    168.3: "6 5/8\"",
    139.7: "5 1/2\"",
    127.0: "5\""
  };
  
  // Round to 1 decimal place to match with common sizes
  const roundedMm = Math.round(mm * 10) / 10;
  
  if (commonSizes[roundedMm]) {
    return commonSizes[roundedMm];
  }
  
  // If not a common size, format as a decimal
  return `${inches.toFixed(2)}\"`;
}

const CasingResults: React.FC<CasingResultsProps> = ({ results, hadData }) => {
  if (!results || results.length === 0) {
    return <div className="text-center py-4">No results available</div>;
  }

  // Helper to get HAD section name from casing result section
  const getHadSectionName = (section: string) => {
    if (section.toLowerCase().includes("production")) return "Production Section";
    if (section.toLowerCase().includes("surface")) return "Surface Section";
    
    // Handle Upper, Middle, Lower Intermediate sections
    if (section.toLowerCase().includes("upper intermediate")) {
      return "Upper Intermediate Section";
    }
    if (section.toLowerCase().includes("middle intermediate")) {
      return "Middle Intermediate Section";
    }
    if (section.toLowerCase().includes("lower intermediate")) {
      return "Lower Intermediate Section";
    }
    
    // Handle generic/numbered intermediate sections as fallback
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

  const calculateDimValue = (section: string): string => {
    if (hadData) {
      const sectionName = getHadSectionName(section);
      const sectionData = hadData[sectionName];
      
      if (sectionData) {
        const atHeadKeys = Object.keys(sectionData);
        if (atHeadKeys.length > 0) {
          const hadSectionData = sectionData[atHeadKeys[0]];
          
          // Check if we have only a single L value
          if (hasSingleLValue(hadSectionData)) {
            // Get the external diameter (DCSG) from the corresponding result
            const matchingResult = results.find(r => r.section === section);
            if (matchingResult) {
              const dcsgValue = extractNumericValue(matchingResult.dcsg);
              
              // First try to get the wall thickness directly from HAD data
              if (hadSectionData && hadSectionData.length > 0) {
                const firstHadRow = hadSectionData[0];
                
                if (firstHadRow.wallThickness !== undefined) {
                  // Use wall thickness from HAD data
                  const wallThickness = firstHadRow.wallThickness;
                  // Calculate Di = DE - 2*Wall Thickness
                  const di = dcsgValue - (2 * wallThickness);
                  return di.toFixed(2);
                }
                // If HAD data has internal diameter but no wall thickness
                else if (firstHadRow.internalDiameter !== undefined && dcsgValue > 0) {
                  return firstHadRow.internalDiameter.toFixed(2);
                }
              }
              
              // Fallback to calculating from internal diameter if HAD wall thickness is not available
              const internalValue = extractNumericValue(matchingResult.internalDiameter);
              if (dcsgValue > 0 && internalValue > 0) {
                // Calculate wall thickness: (DE - DI) / 2
                const wallThickness = (dcsgValue - internalValue) / 2;
                // Calculate Di = DE - 2*Wall Thickness
                const di = dcsgValue - (2 * wallThickness);
                return di.toFixed(2);
              }
            }
          }
          
          // For multiple L values or if we couldn't calculate Di, use the normal calculateDim
          return calculateDim(hadSectionData);
        }
      }
    }
    return "-";
  };

  // Reverse the order of results for display: Surface -> Intermediate -> Production
  const displayResults = [...results].sort((a, b) => {
    // Helper function to get section priority (Surface first, Production last)
    const getSectionPriority = (section: string): number => {
      if (section.toLowerCase().includes("surface")) return 0;
      if (section.toLowerCase().includes("lower intermediate")) return 1;
      if (section.toLowerCase().includes("middle intermediate")) return 2;
      if (section.toLowerCase().includes("upper intermediate")) return 3;
      if (section.toLowerCase().includes("intermediate")) return 4;
      if (section.toLowerCase().includes("production")) return 5;
      return 6; // Any other section
    };
    
    return getSectionPriority(a.section) - getSectionPriority(b.section);
  });

  return (
    <EnhancedTable
      headers={["Section", "Nearest Bit Size", "DCSG", "DCSG'", "Internal Diameter", "Dim"]}
      rows={displayResults.map(result => {
        let dim = "-";
        let internalDiameter = result.internalDiameter;
        
        // Validate and potentially fix the DCSG' (atBody) value
        const validatedAtBody = validateAtBody(result);
        
        if (hadData) {
          // Try to find the HAD section for this result
          const sectionName = getHadSectionName(result.section);
          const sectionData = hadData[sectionName];
          if (sectionData) {
            // Use the first atHead (usually only one per section)
            const atHeadKeys = Object.keys(sectionData);
            if (atHeadKeys.length > 0) {
              const hadRows = sectionData[atHeadKeys[0]];
              
              // Calculate Dim value
              dim = calculateDimValue(result.section);
              
              // Check if we have a single L value - if so, we'll display "Di" instead of "Dim"
              if (hasSingleLValue(hadRows)) {
                dim = dim + " (Di)";
              }
            }
          }
        }
        
        // For production casing, we'll use the internal HAD data for wall thickness
        // but not display the internal diameter
        const showInternalDiameter = !result.section.toLowerCase().includes("production");
        
        return [
          result.section,
          result.nearestBitSize,
          validatedAtBody,
          result.dcsg,
          showInternalDiameter ? internalDiameter : "-",
          dim
        ];
      })}
    />
  );
};

export default CasingResults; 