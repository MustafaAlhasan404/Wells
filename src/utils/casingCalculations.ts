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
 * Uses an iterative approach to ensure (y_i^2 + y_i) × (z_i^2 + z_i) = 1 within tolerance
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
  
  // Find total depth
  let depth = 0;
  rows.forEach(row => {
    if (row.depth && row.depth > depth) {
      depth = row.depth;
    }
  });
  
  if (depth === 0) {
    depth = 2000; // Default if no depth found
    console.log("No depth found, using default:", depth);
  } else {
    console.log("Using depth for calculations:", depth);
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
    // L1 Calculation (iterative)
    let L1 = Math.round(depth * 0.35); // Initial guess
    let iterations = 0;
    let bestL1 = L1;
    let bestConditionValue = 999;
    const maxIterations = 100; // Maximum number of iterations to try
    
    console.log(`Starting L1 calculation with initial guess: ${L1}`);
    
    // Always run through all iterations to find the best value
    while (iterations < maxIterations) {
      // Calculate y1 and z1 according to the formula
      const y1 = L1 / (depth - L1);
      const z1 = (calculationRows[0].unitWeight * calculationRows[1].tensileStrength) / 
                 (calculationRows[1].unitWeight * calculationRows[0].tensileStrength);
      
      // Calculate condition check
      const condition1 = (y1 * y1 + y1) * (z1 * z1 + z1);
      
      console.log(`L1 Iteration ${iterations}: L1=${L1}, y1=${y1}, z1=${z1}, condition=${condition1}`);
      
      // Check if this is closer to 1 than our previous best
      if (Math.abs(condition1 - 1) < Math.abs(bestConditionValue - 1)) {
        bestL1 = L1;
        bestConditionValue = condition1;
        console.log(`New best L1 found: ${bestL1} with condition: ${bestConditionValue}`);
      }
      
      // Check if condition is within range
      const conditionInRange = condition1 >= 0.9 && condition1 <= 1.1;
      
      // Determine direction and step size based on current condition
      let stepSize = Math.max(5, Math.round(L1 * 0.02)); // Smaller step size for more precision
      
      if (iterations > 50) {
        stepSize = Math.max(2, Math.round(L1 * 0.01)); // Even smaller steps in later iterations
      }
      
      if (condition1 < 1.0) {
        L1 += stepSize; // Increase L1 if condition is below 1.0
      } else {
        L1 -= stepSize; // Decrease L1 if condition is above 1.0
      }
      
      // Make sure L1 doesn't exceed depth
      if (L1 >= depth - 10) {
        L1 = depth - 100; // Leave room at the end
      }
      
      // Make sure L1 is positive
      if (L1 <= 10) {
        L1 = 10; // Minimum value
      }
      
      // If we're close to 1.0 and have tried enough iterations, we can stop
      if (Math.abs(bestConditionValue - 1) < 0.01 && iterations > 20) {
        console.log(`Found very good L1 value with condition: ${bestConditionValue}, stopping`);
        break;
      }
      
      iterations++;
    }
    
    // Always use the best L1 found
    L1 = bestL1;
    console.log(`Final best L1 value: ${L1} with condition: ${bestConditionValue}`);
    
    // Store final L1 and related values
    const y1 = L1 / (depth - L1);
    const z1 = (calculationRows[0].unitWeight * calculationRows[1].tensileStrength) / 
               (calculationRows[1].unitWeight * calculationRows[0].tensileStrength);
    const condition1 = (y1 * y1 + y1) * (z1 * z1 + z1);
    
    // Only store the L1 value in the actual rows from the current section
    if (rows.length >= 1) {
      rows[0].L1 = L1;
      rows[0].y1 = y1;
      rows[0].z1 = z1;
      rows[0].conditionCheck = condition1;
      rows[0].conditionMet = condition1 >= 0.9 && condition1 <= 1.1;
      
      console.log(`Stored L1 in row 0: ${L1}, y1: ${y1}, z1: ${z1}, condition: ${condition1}`);
    }
    
    // L2 Calculation (iterative) - only if we have at least 3 rows for calculation
    if (calculationRows.length >= 3) {
      let L2 = Math.round((depth - L1) * 0.5); // Initial guess
      iterations = 0;
      let bestL2 = L2;
      let bestConditionValue = 999;
      
      console.log(`Starting L2 calculation with initial guess: ${L2}`);
      
      // Always run through all iterations to find the best value
      while (iterations < maxIterations) {
        // Calculate y2 and z2 according to the formula
        const y2 = L2 / (depth - L1 - L2);
        const z2 = ((L1 * calculationRows[0].unitWeight + L2 * calculationRows[1].unitWeight) * calculationRows[2].tensileStrength) / 
                   (calculationRows[2].unitWeight * calculationRows[0].tensileStrength * L1);
        
        // Calculate condition check
        const condition2 = (y2 * y2 + y2) * (z2 * z2 + z2);
        
        console.log(`L2 Iteration ${iterations}: L2=${L2}, y2=${y2}, z2=${z2}, condition=${condition2}`);
        
        // Check if this is closer to 1 than our previous best
        if (Math.abs(condition2 - 1) < Math.abs(bestConditionValue - 1)) {
          bestL2 = L2;
          bestConditionValue = condition2;
          console.log(`New best L2 found: ${bestL2} with condition: ${bestConditionValue}`);
        }
        
        // Check if condition is within range
        const conditionInRange = condition2 >= 0.9 && condition2 <= 1.1;
        
        // Determine direction and step size based on current condition
        let stepSize = Math.max(5, Math.round(L2 * 0.02)); // Smaller step size for more precision
        
        if (iterations > 50) {
          stepSize = Math.max(2, Math.round(L2 * 0.01)); // Even smaller steps in later iterations
        }
        
        if (condition2 < 1.0) {
          L2 += stepSize; // Increase L2 if condition is below 1.0
        } else {
          L2 -= stepSize; // Decrease L2 if condition is above 1.0
        }
        
        // Make sure L1 + L2 doesn't exceed depth
        if (L1 + L2 >= depth - 10) {
          L2 = depth - L1 - 100; // Leave some room
        }
        
        // Make sure L2 is positive
        if (L2 <= 10) {
          L2 = 10; // Minimum value
        }
        
        // If we're close to 1.0 and have tried enough iterations, we can stop
        if (Math.abs(bestConditionValue - 1) < 0.01 && iterations > 20) {
          console.log(`Found very good L2 value with condition: ${bestConditionValue}, stopping`);
          break;
        }
        
        iterations++;
      }
      
      // Always use the best L2 found
      L2 = bestL2;
      console.log(`Final best L2 value: ${L2} with condition: ${bestConditionValue}`);
      
      // Store final L2 and related values
      const y2 = L2 / (depth - L1 - L2);
      const z2 = ((L1 * calculationRows[0].unitWeight + L2 * calculationRows[1].unitWeight) * calculationRows[2].tensileStrength) / 
                 (calculationRows[2].unitWeight * calculationRows[0].tensileStrength * L1);
      const condition2 = (y2 * y2 + y2) * (z2 * z2 + z2);
      
      // Only store the L2 value if we have at least 2 rows in the current section
      if (rows.length >= 2) {
        rows[1].L2 = L2;
        rows[1].y2 = y2;
        rows[1].z2 = z2;
        rows[1].conditionCheck = condition2;
        rows[1].conditionMet = condition2 >= 0.9 && condition2 <= 1.1;
        
        console.log(`Stored L2 in row 1: ${L2}, y2: ${y2}, z2: ${z2}, condition: ${condition2}`);
      }
      
      // L3 Calculation (direct formula)
      const L3 = ((calculationRows[2].tensileStrength * 1000 / 1.75) - 
            (L1 * calculationRows[0].unitWeight * 1.488 + L2 * calculationRows[1].unitWeight * 1.488)) / 
            (calculationRows[2].unitWeight * 1.488);
      
      console.log(`L3 calculation: ${L3}`);
      
      if (L3 > 0) {
        // Only store the L3 value if we have at least 3 rows in the current section
        if (rows.length >= 3) {
          rows[2].L3 = L3;
          
          // Check if there's room left for L3
          if (L1 + L2 + L3 <= depth) {
            // Calculate y3 and z3 for consistency
            const y3 = L3 / (depth - L1 - L2 - L3);
            
            if (y3 > 0) {
              const z3 = ((L1 * calculationRows[0].unitWeight + L2 * calculationRows[1].unitWeight + L3 * calculationRows[2].unitWeight) * calculationRows[2].tensileStrength) / 
                       (calculationRows[2].unitWeight * calculationRows[0].tensileStrength * L1);
              const condition3 = (y3 * y3 + y3) * (z3 * z3 + z3);
              
              rows[2].y3 = y3;
              rows[2].z3 = z3;
              rows[2].conditionCheck = condition3;
              rows[2].conditionMet = condition3 >= 0.9 && condition3 <= 1.1;
              
              console.log(`Stored L3 in row 2: ${L3}, y3: ${y3}, z3: ${z3}, condition: ${condition3}`);
            } else {
              console.log("Warning: L3 resulted in negative or zero y3 value");
            }
          } else {
            console.log("Warning: L1 + L2 + L3 exceeds depth");
          }
        }
      } else {
        console.log("Warning: L3 calculation resulted in a negative value");
      }
      
      // L4 Calculation (direct formula) - only if we have 4 rows
      if (calculationRows.length >= 4 && L3 > 0) {
        const L4 = ((calculationRows[3].tensileStrength * 1000 / 1.75) - 
              (L1 * calculationRows[0].unitWeight * 1.488 + 
               L2 * calculationRows[1].unitWeight * 1.488 + 
               L3 * calculationRows[2].unitWeight * 1.488)) / 
              (calculationRows[3].unitWeight * 1.488);
        
        console.log(`L4 calculation: ${L4}`);
        
        // Only store the L4 value if we have at least 4 rows in the current section
        // Removed the check for L4 > 0 to allow negative values
        if (rows.length >= 4) {
          rows[3].L4 = L4;
          
          // Only calculate y4/z4 and condition check if L4 is positive and there's room
          if (L4 > 0 && L1 + L2 + L3 + L4 <= depth) {
            // Calculate y4 and z4 for consistency
            const y4 = L4 / Math.max(1, depth - L1 - L2 - L3 - L4);
            const z4 = ((L1 * calculationRows[0].unitWeight + L2 * calculationRows[1].unitWeight + 
                         L3 * calculationRows[2].unitWeight + L4 * calculationRows[3].unitWeight) * calculationRows[3].tensileStrength) / 
                       (calculationRows[3].unitWeight * calculationRows[0].tensileStrength * L1);
            const condition4 = (y4 * y4 + y4) * (z4 * z4 + z4);
            
            rows[3].y4 = y4;
            rows[3].z4 = z4;
            rows[3].conditionCheck = condition4;
            rows[3].conditionMet = condition4 >= 0.9 && condition4 <= 1.1;
            
            console.log(`Stored L4 in row 3: ${L4}, y4: ${y4}, z4: ${z4}, condition: ${condition4}`);
          } else {
            if (L4 <= 0) {
              console.log(`L4 (${L4}) is negative, skipping y4/z4 calculations`);
            } else {
              console.log("Warning: L1 + L2 + L3 + L4 exceeds depth");
            }
          }
        }
      }
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