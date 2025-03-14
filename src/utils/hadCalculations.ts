/**
 * Utility functions for HAD (Hydraulic Analysis and Design) calculations
 * Based on Python implementation to ensure exact calculation matches
 */

// We'll import HADData interface from casingCalculations.ts
import { HADData } from './casingCalculations';

interface LValues {
  l1: number;
  l2?: number;
  l3?: number;
  l4?: number;
}

/**
 * Calculate Y1 and Z1 values for a given L1
 * @param l1 The L1 value
 * @param depth The depth value
 * @param hadRow2 The HAD value for row 2
 * @param tensileStrengthRow2 The tensile strength for row 2
 * @param unitWeightRow1 The unit weight for row 1
 * @returns A tuple of [y1, z1]
 */
function calculateY1Z1(
  l1: number,
  depth: number,
  hadRow2: number,
  tensileStrengthRow2: number,
  unitWeightRow1: number
): [number, number] {
  // y1 = (depth - l1) / hadRow2
  const y1 = (depth - l1) / hadRow2;
  
  // z1 = (l1 * unitWeightRow1 * 1.488) / (tensileStrengthRow2 * 1000)
  const z1 = (l1 * unitWeightRow1 * 1.488) / (tensileStrengthRow2 * 1000);
  
  return [y1, z1];
}

/**
 * Find the best L1 value
 * @param depth The depth value
 * @param hadRow2 The HAD value for row 2
 * @param tensileStrengthRow2 The tensile strength for row 2
 * @param unitWeightRow1 The unit weight for row 1
 * @returns The best L1 value
 */
export function findBestL1(
  depth: number,
  hadRow2: number,
  tensileStrengthRow2: number,
  unitWeightRow1: number
): number {
  console.log(`Finding best L1 for: depth=${depth}, hadRow2=${hadRow2}, tensileStrengthRow2=${tensileStrengthRow2}, unitWeightRow1=${unitWeightRow1}`);
  
  // Calculate the condition difference for a given L1
  const calculateConditionDifference = (l1: number): number => {
    const [y1, z1] = calculateY1Z1(l1, depth, hadRow2, tensileStrengthRow2, unitWeightRow1);
    // Calculate difference from the target condition (y1^2 + z1^2 + y1*z1 = 1.00)
    return Math.abs(y1*y1 + z1*z1 + y1*z1 - 1.00);
  };

  let bestL1 = 0;
  let minDifference = Number.POSITIVE_INFINITY;
  
  // Based on the Python log, we know L1 values are much less than the total depth
  // Add an upper bound constraint to match Python implementation
  const maxSearchDepth = Math.min(depth, 1500);
  
  // Iterate through possible L1 values (1 to maxSearchDepth)
  for (let i = 1; i < maxSearchDepth; i++) {
    const diff = calculateConditionDifference(i);
    
    if (diff < minDifference) {
      minDifference = diff;
      bestL1 = i;
    }
    
    // If we're very close to the target condition, we can stop early
    if (diff < 0.0001) {
      break;
    }
  }
  
  console.log(`Best L1 value: ${bestL1} with difference: ${minDifference}`);
  return bestL1;
}

/**
 * Calculate Y2 and Z2 values for a given L2
 * @param l1 The L1 value
 * @param l2 The L2 value
 * @param depth The depth value
 * @param hadRow3 The HAD value for row 3
 * @param tensileStrengthRow3 The tensile strength for row 3
 * @param unitWeightRow1 The unit weight for row 1
 * @param unitWeightRow2 The unit weight for row 2
 * @returns A tuple of [y2, z2]
 */
function calculateY2Z2(
  l1: number,
  l2: number,
  depth: number,
  hadRow3: number,
  tensileStrengthRow3: number,
  unitWeightRow1: number,
  unitWeightRow2: number
): [number, number] {
  // y2 = (depth - (l1 + l2)) / hadRow3
  const y2 = (depth - (l1 + l2)) / hadRow3;
  
  // z2 = (l1 * unitWeightRow1 + l2 * unitWeightRow2) * 1.488 / (tensileStrengthRow3 * 1000)
  const z2 = (l1 * unitWeightRow1 + l2 * unitWeightRow2) * 1.488 / (tensileStrengthRow3 * 1000);
  
  return [y2, z2];
}

/**
 * Find the best L2 value
 * @param depth The depth value
 * @param l1 The L1 value
 * @param hadRow3 The HAD value for row 3
 * @param tensileStrengthRow3 The tensile strength for row 3
 * @param unitWeightRow1 The unit weight for row 1
 * @param unitWeightRow2 The unit weight for row 2
 * @returns The best L2 value
 */
export function findBestL2(
  depth: number,
  l1: number,
  hadRow3: number,
  tensileStrengthRow3: number,
  unitWeightRow1: number,
  unitWeightRow2: number
): number {
  console.log(`Finding best L2 for: depth=${depth}, l1=${l1}, hadRow3=${hadRow3}, tensileStrengthRow3=${tensileStrengthRow3}, unitWeightRow1=${unitWeightRow1}, unitWeightRow2=${unitWeightRow2}`);
  
  // Calculate the condition difference for a given L2
  const calculateConditionDifference = (l2: number): number => {
    const [y2, z2] = calculateY2Z2(l1, l2, depth, hadRow3, tensileStrengthRow3, unitWeightRow1, unitWeightRow2);
    // Calculate difference from the target condition (y2^2 + z2^2 + y2*z2 = 1.00)
    return Math.abs(y2*y2 + z2*z2 + y2*z2 - 1.00);
  };

  let bestL2 = 0;
  let minDifference = Number.POSITIVE_INFINITY;
  
  // Add constraints similar to Python implementation
  // Instead of checking all values up to depth-l1, use a reasonable range
  const maxSearchDepth = Math.min(depth - l1, 1200);
  
  // If l1 is too large, we might not be able to find a valid L2
  if (maxSearchDepth <= 1) {
    console.log("Search range for L2 is too small, using default value");
    return 1; // Return a small default value
  }
  
  // Iterate through possible L2 values (1 to maxSearchDepth)
  for (let i = 1; i < maxSearchDepth; i++) {
    const diff = calculateConditionDifference(i);
    
    if (diff < minDifference) {
      minDifference = diff;
      bestL2 = i;
    }
    
    // If we're very close to the target condition, we can stop early
    if (diff < 0.0001) {
      break;
    }
  }
  
  console.log(`Best L2 value: ${bestL2} with difference: ${minDifference}`);
  return bestL2;
}

/**
 * Calculate L3 value
 * @param l1 The L1 value
 * @param l2 The L2 value
 * @param tensileStrengthRow3 The tensile strength for row 3
 * @param unitWeightRow1 The unit weight for row 1
 * @param unitWeightRow2 The unit weight for row 2
 * @param unitWeightRow3 The unit weight for row 3
 * @returns The L3 value
 */
function calculateL3(
  l1: number,
  l2: number,
  tensileStrengthRow3: number,
  unitWeightRow1: number,
  unitWeightRow2: number,
  unitWeightRow3: number
): number {
  // L3 = ((tensileStrengthRow3 * 1000 / 1.75) - (l1 * unitWeightRow1 * 1.488 + l2 * unitWeightRow2 * 1.488)) / (unitWeightRow3 * 1.488)
  const l3 = ((tensileStrengthRow3 * 1000 / 1.75) - (l1 * unitWeightRow1 * 1.488 + l2 * unitWeightRow2 * 1.488)) / (unitWeightRow3 * 1.488);
  console.log(`Calculating L3 value: ${l3}`);
  return l3;
}

/**
 * Calculate L4 value
 * @param l1 The L1 value
 * @param l2 The L2 value
 * @param l3 The L3 value
 * @param tensileStrengthRow4 The tensile strength for row 4
 * @param unitWeightRow1 The unit weight for row 1
 * @param unitWeightRow2 The unit weight for row 2
 * @param unitWeightRow3 The unit weight for row 3
 * @param unitWeightRow4 The unit weight for row 4
 * @returns The L4 value
 */
function calculateL4(
  l1: number,
  l2: number,
  l3: number,
  tensileStrengthRow4: number,
  unitWeightRow1: number,
  unitWeightRow2: number,
  unitWeightRow3: number,
  unitWeightRow4: number
): number {
  // L4 = ((tensileStrengthRow4 * 1000 / 1.75) - (l1 * unitWeightRow1 * 1.488 + l2 * unitWeightRow2 * 1.488 + l3 * unitWeightRow3 * 1.488)) / (unitWeightRow4 * 1.488)
  return ((tensileStrengthRow4 * 1000 / 1.75) - 
          (l1 * unitWeightRow1 * 1.488 + 
          l2 * unitWeightRow2 * 1.488 + 
          l3 * unitWeightRow3 * 1.488)) / (unitWeightRow4 * 1.488);
}

/**
 * Calculate L values
 * @param dataList The list of HAD data (already sorted by HAD in descending order)
 * @param depth The depth value
 * @returns The L values
 */
export function calculateLValues(
  dataList: HADData[],
  depth: number
): LValues {
  console.log(`Calculating L values for ${dataList.length} rows of data at depth ${depth}`);
  
  // Handle special cases for 1 or 2 rows exactly like the Python implementation
  if (dataList.length === 1) {
    console.log("Special case: 1 row of data");
    const l1 = findBestL1(
      depth, 
      dataList[0].had,
      dataList[0].tensileStrength, 
      dataList[0].unitWeight
    );
    console.log(`For 1 row, calculated L1: ${l1}`);
    return { l1 };
  } 
  
  if (dataList.length === 2) {
    console.log("Special case: 2 rows of data");
    // For 2 rows, Python uses row[1] for had/tensileStrength and row[0] for unitWeight
    const l1 = findBestL1(
      depth, 
      dataList[1].had,
      dataList[1].tensileStrength, 
      dataList[0].unitWeight
    );
    console.log(`Calculated L1 value: ${l1}`);
    
    const l2 = findBestL2(
      depth, 
      l1, 
      dataList[1].had,
      dataList[1].tensileStrength,
      dataList[0].unitWeight,
      dataList[1].unitWeight
    );
    console.log(`Calculated L2 value: ${l2}`);
    
    return { l1, l2 };
  }
  
  // Standard case with 3+ rows - match Python implementation closely
  console.log("Case: Multiple rows (3+) of HAD data");
  
  // Use the last 3 rows (lowest HAD values) instead of the first 3
  // Python implementation consistently uses the rows with the lowest HAD values
  const lastIndex = dataList.length - 1;
  const hadRow1 = dataList[lastIndex - 2].had;
  const hadRow2 = dataList[lastIndex - 1].had;
  const hadRow3 = dataList[lastIndex].had;
  
  const tensileStrengthRow1 = dataList[lastIndex - 2].tensileStrength;
  const tensileStrengthRow2 = dataList[lastIndex - 1].tensileStrength;
  const tensileStrengthRow3 = dataList[lastIndex].tensileStrength;
  
  const unitWeightRow1 = dataList[lastIndex - 2].unitWeight;
  const unitWeightRow2 = dataList[lastIndex - 1].unitWeight;
  const unitWeightRow3 = dataList[lastIndex].unitWeight;
  
  console.log("Using rows for calculation:", {
    row1: `${lastIndex - 2} (HAD: ${hadRow1})`,
    row2: `${lastIndex - 1} (HAD: ${hadRow2})`,
    row3: `${lastIndex} (HAD: ${hadRow3})`
  });
  
  // Find best L1 using row2 had and tensileStrength with row1 unitWeight
  // This matches the pattern we see in the Python log
  const bestL1 = findBestL1(depth, hadRow2, tensileStrengthRow2, unitWeightRow1);
  console.log(`Best L1 value: ${bestL1}`);
  
  // Find best L2 using row3 had and tensileStrength with row1/row2 unitWeights
  const bestL2 = findBestL2(depth, bestL1, hadRow3, tensileStrengthRow3, unitWeightRow1, unitWeightRow2);
  console.log(`Best L2 value: ${bestL2}`);
  
  // Calculate L3
  console.log("Calculating L3 value");
  const bestL3 = calculateL3(bestL1, bestL2, tensileStrengthRow3, unitWeightRow1, unitWeightRow2, unitWeightRow3);
  console.log(`L3 value: ${bestL3}`);
  
  const result: LValues = { l1: bestL1, l2: bestL2, l3: bestL3 };
  
  // Calculate L4 if needed and if we have a 4th row
  const totalLength = bestL1 + bestL2 + bestL3;
  if (totalLength < depth && dataList.length > 3) {
    const tensileStrengthRow4 = dataList[lastIndex - 3].tensileStrength;
    const unitWeightRow4 = dataList[lastIndex - 3].unitWeight;
    
    if (tensileStrengthRow4 && unitWeightRow4) {
      const bestL4 = calculateL4(
        bestL1, bestL2, bestL3, tensileStrengthRow4,
        unitWeightRow1, unitWeightRow2, unitWeightRow3, unitWeightRow4
      );
      console.log(`Calculated L4: ${bestL4}`);
      
      result.l4 = bestL4;
    }
  }
  
  console.log(`Final L values: ${JSON.stringify(result)}`);
  return result;
} 