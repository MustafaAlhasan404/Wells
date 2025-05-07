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
  wallThickness?: string; // Optional wall thickness parameter
  useWallThickness?: boolean; // Flag to indicate if wall thickness should be used for this section
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
  wallThickness?: number;    // Wall thickness in mm from Excel
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
  conditionCheck?: number; // y_i^2 + y_i*z_i + z_i^2 value for each row i
  conditionMet?: boolean;  // Whether condition is within [0.999, 1.001]
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
  wallThickness?: number;  // Wall thickness in mm from Excel
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
    'C-90': 1.125,
    'T-95': 1.125,
    'P-110': 1.125,
    'Q-125': 1.125,
    'V-150': 1.125
  };

  // Get S value for the metal type or use default 1.08
  const s = sValues[metalType] || 1.08;
  
  // HAD calculation formula
  const had = (100 * externalPressure) / (s * 1.08);
  
  return had;
}

/**
 * Calculate the objective function value for a given row
 * @param y y-value for the row
 * @param z z-value for the row
 * @returns The calculated objective function: y^2 + y*z + z^2
 */
export function calculateObjective(y: number, z: number): number {
  // Ensure precision in calculation
  const ySquared = Math.pow(y, 2);
  const yz = y * z;
  const zSquared = Math.pow(z, 2);
  const result = ySquared + yz + zSquared;
  
  return result;
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
  
  // Create a copy of the array to avoid mutating the original
  const updatedData = [...hadDataArray];
  
  // Sort by HAD values (assumption: higher HAD values first)
  updatedData.sort((a, b) => b.had - a.had);
  
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
  }
  
  // Check if we need to borrow data from other sections
  let calculationRows = [...rows];
  
  // If we have allSectionsData and not enough rows in current section, use data from other sections
  if (allSectionsData && allSectionsData.length > 0 && rows.length < 3) {
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
      }
    }
  }
  
  // We need at least 2 rows for L1 calculation
  if (calculationRows.length >= 2) {
    // Function to calculate y1, z1 for a given L1
    const calculateY1Z1 = (L1: number) => {
      const y1 = (H - L1) / calculationRows[1].had;
      const z1 = (L1 * calculationRows[0].unitWeight * 1.488) / 
                 (calculationRows[1].tensileStrength * 1000);
      return { y1, z1 };
    };
    
    // Function to calculate y2, z2 for given L1, L2
    const calculateY2Z2 = (L1: number, L2: number) => {
      if (calculationRows.length < 3) return { y2: 0, z2: 0, condition: 999 };
      
      const y2 = (H - L1 - L2) / calculationRows[2].had;
      const z2 = ((L1 * calculationRows[0].unitWeight * 1.488) + (L2 * calculationRows[1].unitWeight * 1.488)) /
                (calculationRows[2].tensileStrength * 1000);
      
      const condition = calculateObjective(y2, z2);
      
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
    
    // Function to find L1 that satisfies the objective equation for a given precision
    const findOptimalL1 = () => {
      const targetCondition = 1.0;
      const tolerance = 0.0001; // Tighter tolerance for better precision
      
    let bestL1 = 0;
      let bestDiff = Number.MAX_VALUE;
    let bestY1 = 0;
    let bestZ1 = 0;
      
      // Binary search for optimal L1
      let minL1 = 10; // Minimum reasonable L1
      let maxL1 = H * 0.9; // Maximum reasonable L1
      
      // First, do a coarse-grained search to find a good starting point
      const step = (maxL1 - minL1) / 100; // 100 steps across the range
      for (let L1 = minL1; L1 <= maxL1; L1 += step) {
      const { y1, z1 } = calculateY1Z1(L1);
        const condition = calculateObjective(y1, z1);
        const diff = Math.abs(condition - targetCondition);
        
        if (diff < bestDiff) {
          bestL1 = L1;
          bestY1 = y1;
          bestZ1 = z1;
          bestDiff = diff;
          
          // Early exit if we find an excellent match
          if (diff < tolerance) {
            break;
          }
        }
      }
      
      // Now do binary search for more precision, starting from our best approximation
      if (bestDiff > tolerance) {
        // Set search range around the best L1 found
        minL1 = Math.max(10, bestL1 - 100);
        maxL1 = Math.min(H * 0.95, bestL1 + 100);
        
        const maxIterations = 100; // Prevent infinite loops
        let iteration = 0;
        
        while (maxL1 - minL1 > 0.01 && iteration < maxIterations && bestDiff > tolerance) {
          iteration++;
          
          // Try three points: left, middle, right
          const midL1 = (minL1 + maxL1) / 2;
          const leftL1 = (minL1 + midL1) / 2;
          const rightL1 = (midL1 + maxL1) / 2;
          
          // Calculate conditions
          const { y1: midY1, z1: midZ1 } = calculateY1Z1(midL1);
          const midCondition = calculateObjective(midY1, midZ1);
          const midDiff = Math.abs(midCondition - targetCondition);
          
          const { y1: leftY1, z1: leftZ1 } = calculateY1Z1(leftL1);
          const leftCondition = calculateObjective(leftY1, leftZ1);
          const leftDiff = Math.abs(leftCondition - targetCondition);
          
          const { y1: rightY1, z1: rightZ1 } = calculateY1Z1(rightL1);
          const rightCondition = calculateObjective(rightY1, rightZ1);
          const rightDiff = Math.abs(rightCondition - targetCondition);
          
          // Update best values if we found a better match
          if (midDiff < bestDiff) {
            bestL1 = midL1;
            bestY1 = midY1;
            bestZ1 = midZ1;
            bestDiff = midDiff;
          }
          
          if (leftDiff < bestDiff) {
            bestL1 = leftL1;
            bestY1 = leftY1;
            bestZ1 = leftZ1;
            bestDiff = leftDiff;
          }
          
          if (rightDiff < bestDiff) {
            bestL1 = rightL1;
            bestY1 = rightY1;
            bestZ1 = rightZ1;
            bestDiff = rightDiff;
          }
          
          // Narrow search space based on where the best value likely is
          if (leftDiff < midDiff) {
            maxL1 = midL1;
          } else if (rightDiff < midDiff) {
            minL1 = midL1;
          } else {
            // The minimum is likely in between left and right
            minL1 = leftL1;
            maxL1 = rightL1;
          }
          
          // Early exit if we find an excellent match
          if (bestDiff < tolerance) {
            break;
          }
        }
      }
      
      // If we need even more precision, use final fine-tuning
      if (bestDiff > tolerance) {
        // Very small step size for final tuning
        const fineStep = 0.01;
        const fineRange = 1.0; // Search 1 meter in each direction
        
        for (let delta = -fineRange; delta <= fineRange; delta += fineStep) {
          const testL1 = bestL1 + delta;
          
          // Skip invalid values
          if (testL1 <= 0 || testL1 >= H) continue;
          
          const { y1, z1 } = calculateY1Z1(testL1);
          const condition = calculateObjective(y1, z1);
          const diff = Math.abs(condition - targetCondition);
          
          if (diff < bestDiff) {
            bestL1 = testL1;
            bestY1 = y1;
            bestZ1 = z1;
            bestDiff = diff;
            
            // Early exit if we find an excellent match
            if (diff < tolerance) {
              break;
            }
          }
        }
      }
      
      return {
        L1: bestL1,
        y1: bestY1,
        z1: bestZ1,
        condition: calculateObjective(bestY1, bestZ1)
      };
    };
    
    // Function to find L2 that satisfies the objective equation for a given L1
    const findOptimalL2 = (L1: number, y1: number, z1: number) => {
      if (calculationRows.length < 3) return { L2: H - L1, y2: 0, z2: 0, condition: 999 };
      
      const targetCondition = 1.0;
      const tolerance = 0.0001; // Tighter tolerance for better precision
      
      let bestL2 = 0;
      let bestDiff = Number.MAX_VALUE;
      let bestY2 = 0;
      let bestZ2 = 0;
      
      // Binary search for optimal L2
      let minL2 = 10; // Minimum reasonable L2
      let maxL2 = H - L1 - 10; // Maximum reasonable L2 (leaving at least 10m for potential L3)
      
      if (maxL2 <= minL2) {
        // If L1 is too large, there's not enough room for a reasonable L2
        return { 
          L2: Math.max(10, H - L1 - 10), 
          y2: 0, 
          z2: 0, 
          condition: 999 
        };
      }
      
      // First, do a coarse-grained search to find a good starting point
      const step = (maxL2 - minL2) / 100; // 100 steps across the range
      for (let L2 = minL2; L2 <= maxL2; L2 += step) {
        const { y2, z2, condition } = calculateY2Z2(L1, L2);
        const diff = Math.abs(condition - targetCondition);
        
        if (diff < bestDiff) {
          bestL2 = L2;
          bestY2 = y2;
          bestZ2 = z2;
          bestDiff = diff;
          
          // Early exit if we find an excellent match
          if (diff < tolerance) {
            break;
          }
        }
      }
      
      // Now do binary search for more precision, starting from our best approximation
      if (bestDiff > tolerance) {
        // Set search range around the best L2 found
        minL2 = Math.max(10, bestL2 - 100);
        maxL2 = Math.min(H - L1 - 10, bestL2 + 100);
        
        const maxIterations = 100; // Prevent infinite loops
        let iteration = 0;
        
        while (maxL2 - minL2 > 0.01 && iteration < maxIterations && bestDiff > tolerance) {
          iteration++;
          
          // Try three points: left, middle, right
          const midL2 = (minL2 + maxL2) / 2;
          const leftL2 = (minL2 + midL2) / 2;
          const rightL2 = (midL2 + maxL2) / 2;
          
          // Calculate conditions
          const { y2: midY2, z2: midZ2, condition: midCondition } = calculateY2Z2(L1, midL2);
          const midDiff = Math.abs(midCondition - targetCondition);
          
          const { y2: leftY2, z2: leftZ2, condition: leftCondition } = calculateY2Z2(L1, leftL2);
          const leftDiff = Math.abs(leftCondition - targetCondition);
          
          const { y2: rightY2, z2: rightZ2, condition: rightCondition } = calculateY2Z2(L1, rightL2);
          const rightDiff = Math.abs(rightCondition - targetCondition);
          
          // Update best values if we found a better match
          if (midDiff < bestDiff) {
            bestL2 = midL2;
            bestY2 = midY2;
            bestZ2 = midZ2;
            bestDiff = midDiff;
          }
          
          if (leftDiff < bestDiff) {
            bestL2 = leftL2;
            bestY2 = leftY2;
            bestZ2 = leftZ2;
            bestDiff = leftDiff;
          }
          
          if (rightDiff < bestDiff) {
            bestL2 = rightL2;
            bestY2 = rightY2;
            bestZ2 = rightZ2;
            bestDiff = rightDiff;
          }
          
          // Narrow search space based on where the best value likely is
          if (leftDiff < midDiff) {
            maxL2 = midL2;
          } else if (rightDiff < midDiff) {
            minL2 = midL2;
      } else {
            // The minimum is likely in between left and right
            minL2 = leftL2;
            maxL2 = rightL2;
          }
          
          // Early exit if we find an excellent match
          if (bestDiff < tolerance) {
            break;
          }
        }
      }
      
      // If we need even more precision, use final fine-tuning
      if (bestDiff > tolerance) {
        // Very small step size for final tuning
        const fineStep = 0.01;
        const fineRange = 1.0; // Search 1 meter in each direction
        
        for (let delta = -fineRange; delta <= fineRange; delta += fineStep) {
          const testL2 = bestL2 + delta;
          
          // Skip invalid values
          if (testL2 <= 0 || testL2 >= H - L1) continue;
          
          const { y2, z2, condition } = calculateY2Z2(L1, testL2);
          const diff = Math.abs(condition - targetCondition);
          
          if (diff < bestDiff) {
            bestL2 = testL2;
            bestY2 = y2;
            bestZ2 = z2;
            bestDiff = diff;
            
            // Early exit if we find an excellent match
            if (diff < tolerance) {
              break;
            }
          }
        }
      }
      
      return {
        L2: bestL2,
        y2: bestY2,
        z2: bestZ2,
        condition: calculateObjective(bestY2, bestZ2)
      };
    };
    
    // Improved solve strategy: first find optimal L1, then find optimal L2 given L1
    // Adjust calculation strategy based on number of rows
    if (rows.length === 1) {
      rows[0].L1 = H;
      // Calculate y1 and z1 for completeness (but they won't be used for condition check)
      const { y1, z1 } = calculateY1Z1(H);
      rows[0].y1 = y1;
      rows[0].z1 = z1;
      
      // No condition check needed for single row
      rows[0].conditionCheck = undefined;
      rows[0].conditionMet = true;
    } 
    else if (rows.length === 2) {
      // Find optimal L1
      const { L1, y1, z1, condition: condition1 } = findOptimalL1();
      
      // Set L2 to remaining depth
      const L2 = H - L1;
      
      // Calculate y2, z2 for the assigned L2
      const { y2, z2, condition: condition2 } = calculateY2Z2(L1, L2);
      
      // Apply values to dataset
      rows[0].L1 = L1;
      rows[0].y1 = y1;
      rows[0].z1 = z1;
      rows[0].conditionCheck = condition1;
      rows[0].conditionMet = Math.abs(condition1 - 1) < 0.001;
      
      rows[1].L2 = L2;
      rows[1].y2 = y2;
      rows[1].z2 = z2;
      rows[1].conditionCheck = condition2;
      rows[1].conditionMet = Math.abs(condition2 - 1) < 0.001;
    } 
    else if (rows.length >= 3) {
      // Find the best L1, L2 that satisfy conditions as closely as possible
      // Find optimal L1
      const { L1, y1, z1, condition: condition1 } = findOptimalL1();
      
      // Find optimal L2 based on the optimal L1
      const { L2, y2, z2, condition: condition2 } = findOptimalL2(L1, y1, z1);
      
      // Distribute remaining depth
      const remainingDepth = H - L1 - L2;
      let L3 = 0;
      let L4 = 0;
      
      if (rows.length === 3) {
        // For 3 rows, assign all remaining depth to L3
        L3 = remainingDepth;
      } 
      else if (rows.length >= 4) {
        // For 4+ rows, optimize L3 so that the condition check for row 3 is as close to 1 as possible
        let bestL3 = 0;
        let bestDiff = Number.MAX_VALUE;
        let bestY3 = 0;
        let bestZ3 = 0;
        let bestCondition3 = 0;
        // Search L3 from 10m to remainingDepth-10m (to leave at least 10m for L4)
        for (let testL3 = 10; testL3 <= remainingDepth - 10; testL3 += 0.1) {
          const y3 = (H - L1 - L2 - testL3) / calculationRows[3].had;
          const z3 = ((L1 * calculationRows[0].unitWeight * 1.488) + 
                     (L2 * calculationRows[1].unitWeight * 1.488) + 
                     (testL3 * calculationRows[2].unitWeight * 1.488)) / 
                     (calculationRows[3].tensileStrength * 1000);
          const condition3 = calculateObjective(y3, z3);
          const diff = Math.abs(condition3 - 1);
          if (diff < bestDiff) {
            bestL3 = testL3;
            bestY3 = y3;
            bestZ3 = z3;
            bestCondition3 = condition3;
            bestDiff = diff;
            if (diff < 0.001) break; // Early exit if perfect match
          }
        }
        L3 = bestL3;
        // Assign the rest to L4
        L4 = remainingDepth - L3;
      }
      
      // Apply values to dataset
      rows[0].L1 = L1;
      rows[0].y1 = y1;
      rows[0].z1 = z1;
        rows[0].conditionCheck = condition1;
        rows[0].conditionMet = Math.abs(condition1 - 1) < 0.001;
        
      rows[1].L2 = L2;
      rows[1].y2 = y2;
      rows[1].z2 = z2;
        rows[1].conditionCheck = condition2;
        rows[1].conditionMet = Math.abs(condition2 - 1) < 0.001;
        
      if (rows.length >= 3 && L3 > 0) {
        rows[2].L3 = L3;
        // For 3-row case with no 4th row, do not calculate y3, z3, or condition check
        if (calculationRows.length >= 4) {
          const y3 = (H - L1 - L2 - L3) / calculationRows[3].had;
          // Updated z3 formula: sum weighted L1, L2, and L3 in numerator
          const z3 = ((L1 * calculationRows[0].unitWeight * 1.488) + 
                     (L2 * calculationRows[1].unitWeight * 1.488) + 
                     (L3 * calculationRows[2].unitWeight * 1.488)) / 
                     (calculationRows[3].tensileStrength * 1000);
          rows[2].y3 = y3;
          rows[2].z3 = z3;
          const condition3 = calculateObjective(y3, z3);
          rows[2].conditionCheck = condition3;
          rows[2].conditionMet = Math.abs(condition3 - 1) < 0.001;
        } else {
          // If we don't have a 4th row for calculations, do not calculate y3, z3, or condition check
          rows[2].y3 = undefined;
          rows[2].z3 = undefined;
          rows[2].conditionCheck = undefined;
          rows[2].conditionMet = undefined;
        }
      }
      
      if (rows.length >= 4 && L4 > 0) {
        rows[3].L4 = L4;
        // For 4-row case, do not calculate y4, z4, or condition check
        rows[3].y4 = undefined;
        rows[3].z4 = undefined;
        rows[3].conditionCheck = undefined;
        rows[3].conditionMet = undefined;
      }
    }
  } 
  else if (rows.length === 1 && rows[0].depth) {
    // Special case for single row with depth already set
    rows[0].L1 = rows[0].depth;
  }
  
  // Also process Intermediate and Surface sections if they exist
  updatedData.forEach(item => {
    // For special sections with depth, use that depth directly
    if (item.depth && !item.L1 && !item.L2 && !item.L3 && !item.L4) {
        item.L1 = item.depth;
      }
  });
  
  // Verify total depth coverage
  let totalL = 0;
  let lValues = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (i === 0 && row.L1) {
      totalL += row.L1;
      lValues.push(`L1=${row.L1.toFixed(2)}`);
    }
    if (i === 1 && row.L2) {
      totalL += row.L2;
      lValues.push(`L2=${row.L2.toFixed(2)}`);
    }
    if (i === 2 && row.L3) {
      totalL += row.L3;
      lValues.push(`L3=${row.L3.toFixed(2)}`);
    }
    if (i === 3 && row.L4) {
      totalL += row.L4;
      lValues.push(`L4=${row.L4.toFixed(2)}`);
    }
  }
  
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
  
  // Multiple L values - calculate weighted average
  if (filtered.length > 1) {
    const numerator = filtered.reduce((sum, p) => sum + p.L * p.di, 0);
    const denominator = filtered.reduce((sum, p) => sum + p.L, 0);
    if (denominator === 0) return "-";
    return (numerator / denominator).toFixed(2);
  } 
  
  // For single L value, we'll use the internal diameter as is from the data
  // Note: The actual calculation of Di = de - 2*Wall Thickness should be handled
  // in the CasingResults component where we have access to both the external diameter
  // and wall thickness values.
  return filtered[0].di.toFixed(2);
}

/**
 * Calculate Wall Thickness from external (DCSG) and internal diameters
 * @param externalDiameter External diameter in mm
 * @param internalDiameter Internal diameter in mm
 * @returns Wall thickness as a string with 2 decimal places, or "-" if calculation is not possible
 */
export function calculateWallThickness(externalDiameter: number | string, internalDiameter: number | string): string {
  // Parse values if strings
  const extValue = typeof externalDiameter === 'string' ? parseFloat(externalDiameter) : externalDiameter;
  const intValue = typeof internalDiameter === 'string' ? parseFloat(internalDiameter) : internalDiameter;
  
  // Validate inputs
  if (isNaN(extValue) || isNaN(intValue) || intValue <= 0 || extValue <= 0 || intValue >= extValue) {
    return "-";
  }
  
  // Wall thickness = (OD - ID) / 2
  return ((extValue - intValue) / 2).toFixed(2);
} 