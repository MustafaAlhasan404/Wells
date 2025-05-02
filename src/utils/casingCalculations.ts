/**
 * Utility functions for casing calculations
 * Ported directly from casing.py to maintain exact calculations
 */

/**
 * Convert millimeters to fractional inches
 * @param mm Value in millimeters
 * @returns String representation in fractional inches
 */
export function mmToFractionalInches(mm: number): string {
  const inches = mm * 0.03937;
  const wholeInches = Math.floor(inches);
  const fraction = inches - wholeInches;
  
  const fractions: Record<number, string> = {
    0.125: "1/8", 0.250: "1/4", 0.375: "3/8", 0.500: "1/2",
    0.625: "5/8", 0.750: "3/4", 0.875: "7/8", 0.0625: "1/16",
    0.1875: "3/16", 0.3125: "5/16", 0.4375: "7/16", 0.5625: "9/16",
    0.6875: "11/16", 0.8125: "13/16", 0.9375: "15/16"
  };
  
  const closestFraction = Object.keys(fractions).reduce((prev, curr) => {
    return Math.abs(parseFloat(curr) - fraction) < Math.abs(parseFloat(prev) - fraction) ? curr : prev;
  }, "0");
  
  if (Math.abs(parseFloat(closestFraction) - fraction) < 0.05) {
    return `${wholeInches} ${fractions[parseFloat(closestFraction)]}`;
  }
  
  return `${wholeInches}`;
}

/**
 * Format a value as mm with fractional inches
 * @param value Value in mm
 * @returns Formatted string
 */
export function formatMmWithInches(value: number | string): string {
  if (!value) return "-";
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(numValue) 
    ? "-" 
    : `${numValue} mm (${mmToFractionalInches(numValue)}")`;
}

/**
 * Interface for section input parameters
 */
export interface SectionInput {
  multiplier: string;
  metalType: string;
  depth: string;
}

/**
 * Interface for calculation results
 */
export interface CalculationResult {
  section: string;
  nearestBitSize: number | null;
  dcsg: string | null;
  atBody: string | null;
  internalDiameter: number | null;
}

/**
 * Interface for HAD data
 */
export interface HADData {
  had: number;
  externalPressure: number;
  metalType: string;
  tensileStrength: number;
  unitWeight: number;
  internalDiameter?: number; // Internal diameter for this row
  depth?: number; // Optional depth for Surface Section
  L1?: number;    // Length of section 1
  L2?: number;    // Length of section 2
  L3?: number;    // Length of section 3
  L4?: number;    // Length of section 4
  y1?: number;    // y value for L1 condition check
  z1?: number;    // z value for L1 condition check
  y2?: number;    // y value for L2 condition check
  z2?: number;    // z value for L2 condition check
  y3?: number;    // y value for L3 condition check
  z3?: number;    // z value for L3 condition check
  y4?: number;    // y value for L4 condition check
  z4?: number;    // z value for L4 condition check
  conditionCheck?: number; // (y_i^2 + y_i) × (z_i^2 + z_i) value
  conditionMet?: boolean;  // Whether condition is within [0.9, 1.1]
}

/**
 * Interface for HAD results by section
 */
export interface HADResults {
  [section: string]: {
    [atHead: string]: HADData[];
  };
}

/**
 * Interface for additional information extracted from Excel files
 */
export interface AdditionalInfo {
  atHead: number;
  externalPressure: number;
  metalType: string;
  tensileStrength: number;
  unitWeight: number;
  internalDiameter: number; // Internal diameter for this row
}

/**
 * Calculate HAD (Hydraulic Analysis Design) value
 * HAD = (100 * externalPressure) / (s * 1.08)
 * where s is a factor based on metal type
 * @param externalPressure External pressure in MPa
 * @param metalType Type of metal (K-55, L-80, etc.)
 * @returns The calculated HAD value
 */
export function calculateHAD(externalPressure: number, metalType: string): number {
  // S values based on metal type
  const sValues: { [key: string]: number } = {
    'K-55': 1.05,
    'L-80': 1.08,
    'N-80': 1.08,
    'P-110': 1.125,
    'Q-125': 1.125,
    'T-95': 1.125,
    'C-90': 1.125,
    'H-40': 1.05,
    'J-55': 1.05
  };

  // Get S value for the metal type or use default 1.08
  const s = sValues[metalType] || 1.08;
  
  // HAD calculation formula
  const had = (100 * externalPressure) / (s * 1.08);
  
  return had;
}

/**
 * Calculate L values and associated y and z parameters
 * Uses an iterative approach to ensure y_2^2 + y_1 * z_2 + z_1^2 = 1 within tolerance
 * while respecting the depth constraint L1 + L2 + L3 <= H
 * @param hadDataArray Array of HAD data items for one section
 * @param allSectionsData Optional data from all sections to use when a section has insufficient HAD values
 * @returns Updated HAD data with L values and condition checks
 */
export function calculateLValues(hadDataArray: HADData[], allSectionsData?: HADData[]): HADData[] {
  if (!hadDataArray || hadDataArray.length === 0) {
    return hadDataArray;
  }
  
  console.log("Starting L value calculations with data:", JSON.stringify(hadDataArray, null, 2));
  
  // Create a copy of the array to avoid mutating the original
  const updatedData = [...hadDataArray];
  
  // Sort by HAD values (assumption: higher HAD values first)
  updatedData.sort((a, b) => b.had - a.had);
  
  console.log("Sorted data:", updatedData.map(item => ({
    had: item.had,
    metalType: item.metalType,
    unitWeight: item.unitWeight,
    tensileStrength: item.tensileStrength
  })));
  
  // Get the rows (first 4 or fewer as available)
  const rows = updatedData.slice(0, Math.min(4, updatedData.length));
  
  // Find total depth (H) - use depth from first row if available, otherwise use HAD value
  let H = 0;
  rows.forEach(row => {
    if (row.depth && row.depth > H) {
      H = row.depth;
    }
  });
  
  if (H === 0) {
    H = rows[0]?.had || 2000; // Default if no depth found
    console.log("No depth found, using HAD as depth:", H);
  } else {
    console.log("Using depth (H) for calculations:", H);
  }
  
  // Check if we need to borrow data from other sections
  let calculationRows = [...rows];
  
  // If we have allSectionsData and not enough rows in current section, use data from other sections
  if (allSectionsData && allSectionsData.length > 0 && rows.length < 3) {
    console.log("Not enough HAD values in current section, borrowing from all sections");
    
    // Sort all sections data by HAD values
    const sortedAllData = [...allSectionsData].sort((a, b) => b.had - a.had);
    
    // For existing rows, make sure they match with what's in the current section
    for (let i = 0; i < rows.length; i++) {
      calculationRows[i] = rows[i];
    }
    
    // Add rows from all sections data if needed
    for (let i = rows.length; i < 4 && i < sortedAllData.length; i++) {
      // Find a row from all sections that's not already in our calculation rows
      const rowToAdd = sortedAllData.find(item => 
        !calculationRows.some(row => row.had === item.had && row.metalType === item.metalType)
      );
      
      if (rowToAdd) {
        calculationRows.push(rowToAdd);
        console.log(`Borrowed row with HAD=${rowToAdd.had} from other sections`);
      }
    }
    
    console.log("Calculation rows after borrowing:", calculationRows.map(item => ({
      had: item.had,
      metalType: item.metalType
    })));
  }
  
  // We need at least 2 rows for L1 calculation
  if (calculationRows.length >= 2) {
    console.log("======= EXHAUSTIVE SEARCH FOR EXACT OBJECTIVE VALUE (1.0) WITH DEPTH CONSTRAINT =======");
    console.log(`Depth constraint: L1 + L2 + L3 <= ${H} meters`);
    
    // Function to calculate y1, z1 for a given L1
    const calculateY1Z1 = (L1: number) => {
      const y1 = (H - L1) / calculationRows[1].had;
      const z1 = (L1 * calculationRows[0].unitWeight * 1.488) / 
                 (calculationRows[1].tensileStrength * 1000);
      return { y1, z1 };
    };
    
    // Function to calculate y2, z2 for given L1, L2
    const calculateY2Z2 = (L1: number, L2: number, y1: number, z1: number) => {
      if (calculationRows.length < 3) return { y2: 0, z2: 0, condition: 999 };
      
      const y2 = (H - L1 - L2) / calculationRows[2].had;
      const z2 = (L2 * calculationRows[1].unitWeight * 1.488) / 
                (calculationRows[2].tensileStrength * 1000);
      
      // Calculate objective function: y2^2 + y1*z2 + z1^2 = 1
      const condition = y2*y2 + y1*z2 + z1*z1;
      
      return { y2, z2, condition };
    };
    
    // Function to calculate L3 for given L1, L2
    const calculateL3 = (L1: number, L2: number) => {
      if (calculationRows.length < 3) return 0;
      
      // L3 calculation formula
      const L3 = ((calculationRows[2].tensileStrength * 1000 / 1.75) - 
            (L1 * calculationRows[0].unitWeight * 1.488 + 
             L2 * calculationRows[1].unitWeight * 1.488)) / 
            (calculationRows[2].unitWeight * 1.488);
      
      return L3;
    };
    
    // Store best solutions
    let bestL1 = 0;
    let bestL2 = 0;
    let bestL3 = 0;
    let bestY1 = 0;
    let bestZ1 = 0;
    let bestY2 = 0;
    let bestZ2 = 0;
    let bestCondition = 999;
    let bestDepthSum = 0;
    let bestDepthConstraintMet = false;
    
    // First, try a broad search for L1 using different percentages of H
    // Use more densely spaced percentages for a more thorough search
    const L1SearchPercentages = [];
    for (let p = 0.05; p <= 0.75; p += 0.02) {
      L1SearchPercentages.push(p);
    }
    
    console.log(`[SEARCH] Starting broad L1 search with ${L1SearchPercentages.length} different values`);
    
    // Two-phase search: first try to find any valid solution that meets depth constraint
    let foundDepthConstraintSolution = false;
    
    for (const percentage of L1SearchPercentages) {
      const L1 = Math.round(H * percentage);
      
      // Skip if L1 is too small 
      if (L1 < 10) continue;
      
      const { y1, z1 } = calculateY1Z1(L1);
      
      // For single-row evaluation of L1 (when we don't have L2)
      if (calculationRows.length < 3) {
        const condition = y1*y1 + z1*z1;
        console.log(`[SEARCH] Testing L1=${L1} (${percentage * 100}% of H=${H}), y1=${y1.toFixed(6)}, z1=${z1.toFixed(6)}, condition=${condition.toFixed(6)}, diff=${Math.abs(condition-1).toFixed(6)}`);
        
        if (Math.abs(condition - 1) < Math.abs(bestCondition - 1)) {
          bestL1 = L1;
          bestY1 = y1;
          bestZ1 = z1;
          bestCondition = condition;
          bestDepthSum = L1; // With only L1, depth constraint is always met
          bestDepthConstraintMet = (bestDepthSum <= H);
          console.log(`[SEARCH] ✓ New best L1 found: ${bestL1}, condition: ${bestCondition.toFixed(6)}, diff: ${Math.abs(bestCondition-1).toFixed(6)}`);
        }
        continue; // Skip L2 search since we don't have enough rows
      }
      
      // If we have enough rows, search for L2 that works with this L1
      console.log(`[SEARCH] Testing L1=${L1} (${percentage * 100}% of H=${H}), y1=${y1.toFixed(6)}, z1=${z1.toFixed(6)}`);
      
      // Try different L2 values for each L1
      const remainingH = H - L1;
      // Use more densely spaced percentages for L2 as well
      const L2SearchPercentages = [];
      for (let p = 0.05; p <= 0.75; p += 0.02) {
        L2SearchPercentages.push(p);
      }
      
      for (const L2percentage of L2SearchPercentages) {
        const L2 = Math.round(remainingH * L2percentage);
        
        // Skip if L2 is too small or if L1+L2 exceeds H
        if (L2 < 10 || L1 + L2 >= H) continue;
        
        const { y2, z2, condition } = calculateY2Z2(L1, L2, y1, z1);
        
        // Calculate L3 for this combination and check depth constraint
        const L3 = calculateL3(L1, L2);
        const totalLength = L1 + L2 + (L3 > 0 ? L3 : 0);
        const depthConstraintMet = totalLength <= H;
        
        console.log(`[SEARCH]   L2=${L2} (${L2percentage * 100}% of remaining=${remainingH}), L3=${L3.toFixed(2)}, ` +
                   `total=${totalLength.toFixed(2)}/${H}, depth constraint: ${depthConstraintMet ? 'MET ✓' : 'FAILED ✗'}, ` +
                   `condition=${condition.toFixed(6)}, diff=${Math.abs(condition-1).toFixed(6)}`);
        
        // First prioritize finding ANY solution that meets the depth constraint
        if (!foundDepthConstraintSolution && depthConstraintMet && L3 > 0 && Math.abs(condition - 1) < 0.2) {
          bestL1 = L1;
          bestL2 = L2;
          bestL3 = L3;
          bestY1 = y1;
          bestZ1 = z1;
          bestY2 = y2;
          bestZ2 = z2;
          bestCondition = condition;
          bestDepthSum = totalLength;
          bestDepthConstraintMet = true;
          foundDepthConstraintSolution = true;
          console.log(`[SEARCH]   ✓ FOUND FIRST VALID DEPTH SOLUTION: L1=${bestL1}, L2=${bestL2}, L3=${bestL3.toFixed(2)}, ` +
                    `total=${bestDepthSum.toFixed(2)}/${H}, condition: ${bestCondition.toFixed(6)}`);
        }
        // Then look for better solutions that meet depth constraint
        else if (depthConstraintMet && L3 > 0) {
          // If we already have a solution that meets the depth constraint, prefer better condition values
          if (Math.abs(condition - 1) < Math.abs(bestCondition - 1) || !bestDepthConstraintMet) {
            bestL1 = L1;
            bestL2 = L2;
            bestL3 = L3;
            bestY1 = y1;
            bestZ1 = z1;
            bestY2 = y2;
            bestZ2 = z2;
            bestCondition = condition;
            bestDepthSum = totalLength;
            bestDepthConstraintMet = true;
            console.log(`[SEARCH]   ✓ New best combination with valid depth: L1=${bestL1}, L2=${bestL2}, L3=${bestL3.toFixed(2)}, ` +
                      `total=${bestDepthSum.toFixed(2)}/${H}, condition: ${bestCondition.toFixed(6)}`);
          }
        } 
        // If we haven't found any depth-valid solution yet, keep track of the best condition result just in case
        else if (!bestDepthConstraintMet && Math.abs(condition - 1) < Math.abs(bestCondition - 1)) {
          bestL1 = L1;
          bestL2 = L2;
          bestL3 = L3;
          bestY1 = y1;
          bestZ1 = z1;
          bestY2 = y2;
          bestZ2 = z2;
          bestCondition = condition;
          bestDepthSum = totalLength;
          bestDepthConstraintMet = depthConstraintMet;
          console.log(`[SEARCH]   ✓ New best combination (depth constraint not met): L1=${bestL1}, L2=${bestL2}, ` +
                    `L3=${bestL3.toFixed(2)}, total=${bestDepthSum.toFixed(2)}/${H}, condition: ${bestCondition.toFixed(6)}`);
        }
        
        // Early termination if we find an exact match that meets depth constraint
        if (depthConstraintMet && Math.abs(condition - 1) < 0.001) {
          console.log(`[SEARCH]   ✓ Found exact solution with valid depth! Stopping search.`);
          break;
        }
      }
      
      // Early termination if we find an exact match that meets depth constraint
      if (bestDepthConstraintMet && Math.abs(bestCondition - 1) < 0.001) {
        console.log(`[SEARCH] Found exact solution with valid depth! Stopping entire search.`);
        break;
      }
    }
    
    // If we found a solution that meets the depth constraint, do a more precise search around it
    if (bestDepthConstraintMet && bestL1 > 0 && bestL2 > 0 && Math.abs(bestCondition - 1) > 0.001) {
      console.log(`[PRECISE] Starting precise search around L1=${bestL1}, L2=${bestL2} (depth constraint met solution)`);
      
      // Try values close to best L1
      const rangeL1 = Math.max(20, Math.round(bestL1 * 0.05)); // 5% or at least 20m
      const minL1 = Math.max(10, bestL1 - rangeL1);
      const maxL1 = bestL1 + rangeL1;
      
      for (let L1 = minL1; L1 <= maxL1; L1 += 1) {
        const { y1, z1 } = calculateY1Z1(L1);
        
        // For L2, search close to the best value
        const rangeL2 = Math.max(20, Math.round(bestL2 * 0.05)); // 5% or at least 20m
        const minL2 = Math.max(10, bestL2 - rangeL2);
        const maxL2 = Math.min(H - L1 - 10, bestL2 + rangeL2);
        
        for (let L2 = minL2; L2 <= maxL2; L2 += 1) {
          // Skip if L1+L2 exceeds H
          if (L1 + L2 >= H) continue;
          
          const { y2, z2, condition } = calculateY2Z2(L1, L2, y1, z1);
          
          // Calculate L3 and check depth constraint
          const L3 = calculateL3(L1, L2);
          const totalLength = L1 + L2 + (L3 > 0 ? L3 : 0);
          const depthConstraintMet = totalLength <= H;
          
          if (depthConstraintMet && L3 > 0 && Math.abs(condition - 1) < Math.abs(bestCondition - 1)) {
            bestL1 = L1;
            bestL2 = L2;
            bestL3 = L3;
            bestY1 = y1;
            bestZ1 = z1;
            bestY2 = y2;
            bestZ2 = z2;
            bestCondition = condition;
            bestDepthSum = totalLength;
            console.log(`[PRECISE] ✓ New best combination: L1=${bestL1}, L2=${bestL2}, L3=${bestL3.toFixed(2)}, ` +
                     `total=${bestDepthSum.toFixed(2)}/${H}, condition: ${bestCondition.toFixed(6)}, diff: ${Math.abs(bestCondition-1).toFixed(6)}`);
            
            // Early termination if we find an exact match
            if (Math.abs(condition - 1) < 0.001) {
              console.log(`[PRECISE] ✓ Found exact solution! Stopping.`);
              break;
            }
          }
        }
        
        // Early termination if we find an exact match
        if (Math.abs(bestCondition - 1) < 0.001) {
          break;
        }
      }
    }
    
    console.log(`======= SEARCH COMPLETED =======`);
    console.log(`Best L1: ${bestL1}, Best L2: ${bestL2}, Best L3: ${bestL3.toFixed(2)}`);
    console.log(`Total length: ${bestDepthSum.toFixed(2)} meters (Depth: ${H} meters)`);
    console.log(`Depth constraint met: ${bestDepthConstraintMet ? 'YES' : 'NO'}`);
    console.log(`Best condition: ${bestCondition.toFixed(6)}, Difference from 1: ${Math.abs(bestCondition-1).toFixed(6)}`);
    console.log(`Best y1: ${bestY1.toFixed(6)}, Best z1: ${bestZ1.toFixed(6)}`);
    if (calculationRows.length >= 3) {
      console.log(`Best y2: ${bestY2.toFixed(6)}, Best z2: ${bestZ2.toFixed(6)}`);
    }
    
    // Check if our best condition is an exact match
    const isExactMatch = Math.abs(bestCondition - 1) < 0.01;
    console.log(`Is exact match to 1.0? ${isExactMatch ? 'YES' : 'NO'}`);
    
    // Store final values
    if (rows.length >= 1) {
      rows[0].L1 = bestL1;
      rows[0].y1 = bestY1;
      rows[0].z1 = bestZ1;
      
      // For L2, only store if we have enough rows and found a valid L2
      if (calculationRows.length >= 3 && bestL2 > 0) {
        rows[0].conditionCheck = bestCondition;
        // Only mark it as "met" if it's an exact match
        rows[0].conditionMet = isExactMatch;
        
        if (rows.length >= 2) {
          rows[1].L2 = bestL2;
          rows[1].y2 = bestY2;
          rows[1].z2 = bestZ2;
          rows[1].conditionCheck = bestCondition;
          rows[1].conditionMet = isExactMatch;
        }
        
        // L3 Calculation - use the best L3 we found during search
        if (calculationRows.length >= 3 && bestL3 > 0) {
          // Recalculate L3 for the final values to ensure consistency
      const L3 = ((calculationRows[2].tensileStrength * 1000 / 1.75) - 
                (bestL1 * calculationRows[0].unitWeight * 1.488 + bestL2 * calculationRows[1].unitWeight * 1.488)) / 
            (calculationRows[2].unitWeight * 1.488);
      
          // Ensure L3 doesn't exceed remaining depth
          const maxL3 = H - bestL1 - bestL2;
          const finalL3 = Math.min(L3, maxL3);
          
          console.log(`Final L3 calculation: ${L3.toFixed(2)}, capped to: ${finalL3.toFixed(2)}`);
          
          if (finalL3 > 0) {
        // Only store the L3 value if we have at least 3 rows in the current section
        if (rows.length >= 3) {
              rows[2].L3 = finalL3;
              
              // Calculate y3 and z3 for consistency using the finalized L3
              const y3 = (H - bestL1 - bestL2 - finalL3) / Math.max(1, calculationRows[3]?.had || 1);
              
              if (y3 >= 0) {
                const z3 = (finalL3 * calculationRows[2].unitWeight * 1.488) /
                        ((calculationRows[3]?.tensileStrength || calculationRows[2].tensileStrength) * 1000);
              
              rows[2].y3 = y3;
              rows[2].z3 = z3;
              
                console.log(`Stored L3 in row 2: ${finalL3.toFixed(2)}, y3: ${y3.toFixed(6)}, z3: ${z3.toFixed(6)}`);
            } else {
                console.log("Warning: L3 resulted in negative y3 value");
              }
            }
          } else {
            console.log("Warning: L3 calculation resulted in a negative or zero value");
      }
      
      // L4 Calculation (direct formula) - only if we have 4 rows
          if (calculationRows.length >= 4 && finalL3 > 0) {
            const remainingLength = H - bestL1 - bestL2 - finalL3;
            
            if (remainingLength > 10) { // If there's enough space for an L4 section
        const L4 = ((calculationRows[3].tensileStrength * 1000 / 1.75) - 
                    (bestL1 * calculationRows[0].unitWeight * 1.488 + 
                    bestL2 * calculationRows[1].unitWeight * 1.488 + 
                    finalL3 * calculationRows[2].unitWeight * 1.488)) / 
              (calculationRows[3].unitWeight * 1.488);
        
              // Cap L4 to remaining depth
              const finalL4 = Math.min(L4, remainingLength);
              
              console.log(`L4 calculation: ${L4.toFixed(2)}, capped to: ${finalL4.toFixed(2)}`);
        
        // Only store the L4 value if we have at least 4 rows in the current section
              if (rows.length >= 4 && finalL4 > 0) {
                rows[3].L4 = finalL4;
          
            // Calculate y4 and z4 for consistency
                const y4 = (H - bestL1 - bestL2 - finalL3 - finalL4) / 1; // Using 1 as default HAD
                const z4 = (finalL4 * calculationRows[3].unitWeight * 1.488) / 
                          (calculationRows[3].tensileStrength * 1000);
            
            rows[3].y4 = y4;
            rows[3].z4 = z4;
                
                console.log(`Stored L4 in row 3: ${finalL4.toFixed(2)}, y4: ${y4.toFixed(6)}, z4: ${z4.toFixed(6)}`);
              }
            } else {
              console.log("Warning: Not enough remaining depth for L4 section");
            }
          }
        }
      } else {
        // If we don't have enough rows for L2, just use the condition from L1
        const condition = bestY1*bestY1 + bestZ1*bestZ1;
        rows[0].conditionCheck = condition;
        rows[0].conditionMet = Math.abs(condition - 1) < 0.001;
      }
    }
  }
  
  // Also process incomplete data scenarios
  // This section runs AFTER the main calculation logic, using the results we already have
  console.log("Processing incomplete data scenarios...");
  
  // Case 1: If we have only 1 row but calculated L1, use all remaining depth
  if (rows.length === 1 && rows[0].L1) {
    console.log("Only 1 row with L1 calculated - no further processing needed");
  }
  
  // Case 2: If we have 2 rows, calculated L1, but couldn't calculate L2
  if (rows.length === 2 && rows[0].L1 && !rows[1].L2) {
    const L1 = rows[0].L1;
    const L2 = H - L1;
    
    if (L2 > 0) {
      console.log(`Setting L2 to use all remaining depth: L2 = H - L1 = ${H} - ${L1} = ${L2}`);
      rows[1].L2 = L2;
      
      // Calculate y2 and z2 if possible
      if (calculationRows.length >= 2) {
        let nextHad = calculationRows.length >= 3 ? calculationRows[2].had : calculationRows[1].had;
        let nextTensile = calculationRows.length >= 3 ? calculationRows[2].tensileStrength : calculationRows[1].tensileStrength;
        
        const y2 = (H - L1 - L2) / nextHad; // Should be close to 0
        const z2 = (L2 * calculationRows[1].unitWeight * 1.488) / (nextTensile * 1000);
        
        rows[1].y2 = y2;
        rows[1].z2 = z2;
        
        // Calculate condition for display
        const y1 = rows[0].y1 || 0;
        const z1 = rows[0].z1 || 0;
        const condition = y2*y2 + y1*z2 + z1*z1;
        
        rows[0].conditionCheck = condition;
        rows[0].conditionMet = Math.abs(condition - 1) < 0.01;
        rows[1].conditionCheck = condition;
        rows[1].conditionMet = Math.abs(condition - 1) < 0.01;
        
        console.log(`Calculated values for L2=${L2}: y2=${y2.toFixed(6)}, z2=${z2.toFixed(6)}, condition=${condition.toFixed(6)}`);
      }
    } else {
      console.log(`Warning: Cannot set L2 - L1 (${L1}) is greater than or equal to total depth (${H})`);
    }
  }
  
  // NEW CASE: If we have 2 rows with both L1 and L2 calculated but they don't sum to total depth
  // or the condition check is not valid
  if (rows.length === 2 && rows[0].L1 && rows[1].L2) {
    const L1 = rows[0].L1;
    const L2 = rows[1].L2;
    const currentSum = L1 + L2;
    const conditionCheck = rows[0].conditionCheck || 0;
    const conditionValid = rows[0].conditionMet || false;
    
    // Check if we need to ensure L1 + L2 = total depth for the 2-row case
    // We should ALWAYS prioritize L1 + L2 = H in the 2-row case, not run the search algorithm
    if (Math.abs(currentSum - H) > 1) {
      console.log(`Two-row case detected: L1 (${L1}) + L2 (${L2}) = ${currentSum}, which should equal H = ${H}`);
      
      // Keep L1 and recalculate L2 to ensure L1 + L2 = H
      const newL2 = H - L1;
      
      if (newL2 > 0 && rows[1]) {
        console.log(`[2-ROW CASE] Adjusting L2 to ${newL2}m to ensure total depth coverage of ${H}m`);
        
        // Keep L1 as is, just adjust L2
        rows[1].L2 = newL2;
        
        // Recalculate y2 and z2 for the new L2
        const nextHad = calculationRows.length >= 3 ? calculationRows[2].had : calculationRows[1].had;
        const nextTensile = calculationRows.length >= 3 ? calculationRows[2].tensileStrength : calculationRows[1].tensileStrength;
        
        const y2 = (H - L1 - newL2) / nextHad; // Should be close to 0
        const z2 = (newL2 * calculationRows[1].unitWeight * 1.488) / (nextTensile * 1000);
        
        rows[1].y2 = y2;
        rows[1].z2 = z2;
        
        // Recalculate condition check with new values
        const y1 = rows[0].y1 || 0;
        const z1 = rows[0].z1 || 0;
        const newCondition = y2*y2 + y1*z2 + z1*z1;
        
        rows[0].conditionCheck = newCondition;
        rows[0].conditionMet = Math.abs(newCondition - 1) < 0.01;
        rows[1].conditionCheck = newCondition;
        rows[1].conditionMet = Math.abs(newCondition - 1) < 0.01;
        
        console.log(`[2-ROW CASE] New values: L1=${L1}, L2=${newL2}, depth sum=${L1+newL2}/${H}, condition=${newCondition.toFixed(4)}`);
      } else {
        console.log(`[2-ROW CASE] Warning: Cannot adjust L2 - L1 (${L1}) is greater than or equal to total depth (${H})`);
      }
    }
    // Only run the search algorithm if this is not a 2-row case
    else if (rows.length > 2 && (!conditionValid || Math.abs(currentSum - H) > 10)) {
      console.log(`Need to recalculate L values. Current L1 (${L1}) + L2 (${L2}) = ${currentSum}, H = ${H}`);
      console.log(`Current condition check: ${conditionCheck.toFixed(2)}, valid: ${conditionValid}`);
      
      // APPROACH DECISION: If L1 is valid but L1+L2 doesn't equal H, and there's no L3,
      // simply keep L1 and adjust L2 to cover the remaining depth
      if (Math.abs(conditionCheck - 1) < 0.05 && Math.abs(currentSum - H) > 10 && rows.length === 2) {
        console.log(`[DIRECT] L1 (${L1}) has a good condition value, keeping it and adjusting L2 to cover total depth`);
        
        const newL2 = H - L1;
        
        if (newL2 > 0 && rows[1]) {
          // Keep L1 as is, just adjust L2
          rows[1].L2 = newL2;
          
          // Recalculate y2 and z2 for the new L2
          const nextHad = calculationRows.length >= 3 ? calculationRows[2].had : calculationRows[1].had;
          const nextTensile = calculationRows.length >= 3 ? calculationRows[2].tensileStrength : calculationRows[1].tensileStrength;
          
          const y2 = (H - L1 - newL2) / nextHad; // Should be close to 0
          const z2 = (newL2 * calculationRows[1].unitWeight * 1.488) / (nextTensile * 1000);
          
          rows[1].y2 = y2;
          rows[1].z2 = z2;
          
          // Recalculate condition check with new values
          const y1 = rows[0].y1 || 0;
          const z1 = rows[0].z1 || 0;
          const newCondition = y2*y2 + y1*z2 + z1*z1;
          
          rows[0].conditionCheck = newCondition;
          rows[0].conditionMet = Math.abs(newCondition - 1) < 0.01;
          rows[1].conditionCheck = newCondition;
          rows[1].conditionMet = Math.abs(newCondition - 1) < 0.01;
          
          console.log(`[DIRECT] Adjusted L2 to ${newL2}m to ensure total depth coverage of ${H}m`);
          console.log(`[DIRECT] New values: L1=${L1}, L2=${newL2}, depth sum=${L1+newL2}/${H}, condition=${newCondition.toFixed(4)}`);
          return updatedData;
        } else {
          console.log(`[DIRECT] Warning: Cannot adjust L2 - L1 (${L1}) is greater than or equal to total depth (${H})`);
        }
      }
      
      // If we can't use the direct approach, continue with the search algorithm
      console.log(`[SEARCH] Starting search for L1-L2 pair that satisfies both total depth (${H}m) and condition equation`);
      
      // Search for both L1 and L2
      let bestDiff = Number.MAX_VALUE;
      let bestL1 = L1;
      let bestL2 = L2;
      let bestY1 = rows[0].y1 || 0;
      let bestZ1 = rows[0].z1 || 0;
      let bestY2 = rows[1]?.y2 || 0;
      let bestZ2 = rows[1]?.z2 || 0;
      let bestCondition = conditionCheck;
      let bestDepthDiff = Math.abs(H - currentSum);
      
      // Function to calculate y1, z1 for a given L1
      const calculateY1Z1 = (testL1: number) => {
        const y1 = (H - testL1) / calculationRows[1].had;
        const z1 = (testL1 * calculationRows[0].unitWeight * 1.488) / 
                 (calculationRows[1].tensileStrength * 1000);
        return { y1, z1 };
      };
      
      // Function to calculate y2, z2 for L2 and check condition
      const calculateY2Z2 = (testL1: number, testL2: number, y1: number, z1: number) => {
        // For 2 rows without a 3rd row, use default fallback values
        const nextHad = calculationRows.length >= 3 ? calculationRows[2].had : calculationRows[1].had;
        const nextTensile = calculationRows.length >= 3 ? calculationRows[2].tensileStrength : calculationRows[1].tensileStrength;
        
        const y2 = (H - testL1 - testL2) / nextHad;
        const z2 = (testL2 * calculationRows[1].unitWeight * 1.488) / (nextTensile * 1000);
        
        // Calculate objective function: y2^2 + y1*z2 + z1^2 = 1
        const condition = y2*y2 + y1*z2 + z1*z1;
        
        return { y2, z2, condition };
      };
      
      // Two-step approach:
      // 1. Perform a broad search first with wider range (5% to 95% of H)
      const L1Percentages = [];
      for (let p = 0.05; p <= 0.95; p += 0.05) {
        L1Percentages.push(p);
      }
      
      // Add more granularity in likely regions (10-50%)
      for (let p = 0.10; p <= 0.50; p += 0.02) {
        if (!L1Percentages.includes(p)) {
          L1Percentages.push(p);
        }
      }
      
      // Sort percentages for cleaner logging
      L1Percentages.sort((a, b) => a - b);
      
      console.log(`[SEARCH] Testing ${L1Percentages.length} percentages from 5% to 95% of total depth (${H}m)`);
      
      for (const percentage of L1Percentages) {
        const testL1 = Math.round(H * percentage);
        const testL2 = H - testL1; // Ensure L1 + L2 = H
        
        const { y1, z1 } = calculateY1Z1(testL1);
        const { y2, z2, condition } = calculateY2Z2(testL1, testL2, y1, z1);
        
        console.log(`[SEARCH] Testing L1=${testL1} (${(percentage*100).toFixed(0)}%), L2=${testL2}, condition=${condition.toFixed(4)}, diff=${Math.abs(condition-1).toFixed(4)}`);
        
        // Check if this is better than our current best
        if (Math.abs(condition - 1) < Math.abs(bestCondition - 1)) {
          bestL1 = testL1;
          bestL2 = testL2;
          bestY1 = y1;
          bestZ1 = z1;
          bestY2 = y2;
          bestZ2 = z2;
          bestCondition = condition;
          bestDiff = Math.abs(condition - 1);
          bestDepthDiff = 0; // L1 + L2 = H by design
          console.log(`[SEARCH] ✓ New best: L1=${bestL1}, L2=${bestL2}, condition=${bestCondition.toFixed(4)}, diff=${Math.abs(bestCondition-1).toFixed(4)}`);
        }
        
        // Early exit if we find a very good match
        if (Math.abs(condition - 1) < 0.01) {
          console.log(`[SEARCH] ✓ Found excellent match, stopping search.`);
          break;
        }
      }
      
      // 2. If we found a good starting point, refine around it
      if (Math.abs(bestCondition - 1) < 0.2) {
        console.log(`[REFINE] Starting refined search around L1=${bestL1}`);
        
        const refineRange = Math.max(20, Math.round(bestL1 * 0.05)); // 5% range or at least 20m
        const minL1 = Math.max(10, bestL1 - refineRange);
        const maxL1 = Math.min(H - 10, bestL1 + refineRange);
        
        for (let testL1 = minL1; testL1 <= maxL1; testL1 += 1) {
          const testL2 = H - testL1; // Ensure L1 + L2 = H
          
          const { y1, z1 } = calculateY1Z1(testL1);
          const { y2, z2, condition } = calculateY2Z2(testL1, testL2, y1, z1);
          
          if (Math.abs(condition - 1) < Math.abs(bestCondition - 1)) {
            bestL1 = testL1;
            bestL2 = testL2;
            bestY1 = y1;
            bestZ1 = z1;
            bestY2 = y2;
            bestZ2 = z2;
            bestCondition = condition;
            console.log(`[REFINE] ✓ Better solution: L1=${bestL1}, L2=${bestL2}, condition=${bestCondition.toFixed(6)}`);
          }
          
          // Early exit for an excellent match
          if (Math.abs(condition - 1) < 0.001) {
            console.log(`[REFINE] ✓ Found exact match, stopping refinement.`);
            break;
          }
        }
      }
      
      // Apply the best solution we found
      if (bestL1 > 0 && bestL2 > 0) {
        console.log(`[FINAL] Applying best solution: L1=${bestL1}, L2=${bestL2}, condition=${bestCondition.toFixed(4)}`);
        console.log(`Original values: L1=${L1}, L2=${L2}, condition=${conditionCheck.toFixed(4)}`);
        
        // Update with the best values found
        rows[0].L1 = bestL1;
        rows[0].y1 = bestY1;
        rows[0].z1 = bestZ1;
        rows[0].conditionCheck = bestCondition;
        rows[0].conditionMet = Math.abs(bestCondition - 1) < 0.01;
        
        rows[1].L2 = bestL2;
        rows[1].y2 = bestY2;
        rows[1].z2 = bestZ2;
        rows[1].conditionCheck = bestCondition;
        rows[1].conditionMet = Math.abs(bestCondition - 1) < 0.01;
        
        console.log(`Updated with L1=${bestL1}, L2=${bestL2}, y1=${bestY1.toFixed(4)}, z1=${bestZ1.toFixed(4)}, ` +
                    `y2=${bestY2.toFixed(4)}, z2=${bestZ2.toFixed(4)}, condition=${bestCondition.toFixed(4)}`);
        console.log(`Depth coverage: ${bestL1 + bestL2}/${H} (${((bestL1 + bestL2)/H*100).toFixed(1)}%)`);
        console.log(`Condition equation value: ${bestCondition.toFixed(4)}, valid: ${Math.abs(bestCondition - 1) < 0.01}`);
      } else {
        console.log(`[ERROR] Could not find valid L1-L2 combination.`);
      }
    } else {
      console.log(`L1 (${L1}) + L2 (${L2}) = ${currentSum} is close to H = ${H}, and condition check is ${conditionValid ? 'valid' : 'invalid'}`);
    }
  }
  
  // Case 3: If we have 3+ rows, calculated L1 and L2, but couldn't calculate L3
  if (rows.length >= 3 && rows[0].L1 && rows[1].L2 && !rows[2].L3) {
    const L1 = rows[0].L1;
    const L2 = rows[1].L2;
    const L3 = H - L1 - L2;
    
    if (L3 > 0) {
      console.log(`Setting L3 to use all remaining depth: L3 = H - L1 - L2 = ${H} - ${L1} - ${L2} = ${L3}`);
      rows[2].L3 = L3;
      
      // Calculate y3 and z3 if possible
      if (calculationRows.length >= 3) {
        let nextHad = calculationRows.length >= 4 ? calculationRows[3].had : calculationRows[2].had;
        let nextTensile = calculationRows.length >= 4 ? calculationRows[3].tensileStrength : calculationRows[2].tensileStrength;
        
        const y3 = (H - L1 - L2 - L3) / nextHad; // Should be close to 0
        const z3 = (L3 * calculationRows[2].unitWeight * 1.488) / (nextTensile * 1000);
        
        rows[2].y3 = y3;
        rows[2].z3 = z3;
        
        console.log(`Calculated values for L3=${L3}: y3=${y3.toFixed(6)}, z3=${z3.toFixed(6)}`);
      }
    } else {
      console.log(`Warning: Cannot set L3 - L1+L2 (${L1+L2}) is greater than or equal to total depth (${H})`);
    }
  }
  
  // Case 4: If we have 4+ rows, calculated L1, L2, and L3, but couldn't calculate L4
  if (rows.length >= 4 && rows[0].L1 && rows[1].L2 && rows[2].L3 && !rows[3].L4) {
    const L1 = rows[0].L1;
    const L2 = rows[1].L2;
    const L3 = rows[2].L3;
    const L4 = H - L1 - L2 - L3;
    
    if (L4 > 0) {
      console.log(`Setting L4 to use all remaining depth: L4 = H - L1 - L2 - L3 = ${H} - ${L1} - ${L2} - ${L3} = ${L4}`);
      rows[3].L4 = L4;
      
      // Calculate y4 and z4
      const y4 = 0; // Since we're using all remaining depth
      const z4 = (L4 * calculationRows[3].unitWeight * 1.488) / (calculationRows[3].tensileStrength * 1000);
      
      rows[3].y4 = y4;
      rows[3].z4 = z4;
      
      console.log(`Calculated values for L4=${L4}: y4=${y4.toFixed(6)}, z4=${z4.toFixed(6)}`);
    } else {
      console.log(`Warning: Cannot set L4 - L1+L2+L3 (${L1+L2+L3}) is greater than or equal to total depth (${H})`);
    }
  }
  
  // Also process Intermediate and Surface sections if they exist
  updatedData.forEach(item => {
    // For sections with only one HAD value, always use L1 regardless of what was there before
    if (rows.length === 1 && item === rows[0]) {
      // Reset any existing L values
      item.L2 = undefined;
      item.L3 = undefined;
      item.L4 = undefined;
      
      // Always assign L1 for first/single HAD in any section
      if (item.depth) {
        item.L1 = item.depth;
      }
    } 
    // For rows that don't have any L value yet
    else if (!item.L1 && !item.L2 && !item.L3 && !item.L4) {
      // This is likely from Intermediate or Surface section
      if (item.depth) {
        // Always assign L1 for first/single HAD in any section
        item.L1 = item.depth;
      }
    }
  });
  
  console.log("Final calculated data:", JSON.stringify(rows, null, 2));
  
  return updatedData;
}

/**
 * Calculate Dim (mean internal diameter) for a HAD section
 * @param hadSectionData Array of HADData for a section
 * @returns Dim as a string (mean internal diameter)
 */
export function calculateDim(hadSectionData: HADData[] | undefined): string {
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