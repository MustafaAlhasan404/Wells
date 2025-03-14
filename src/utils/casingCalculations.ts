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
    'C-90': 1.125
  };

  // Get S value for the metal type or use default 1.08
  const s = sValues[metalType] || 1.08;
  
  // HAD calculation formula exactly as in Python
  const had = (100 * externalPressure) / (s * 1.08);
  
  // Special case for Surface Section - adjust HAD to match depth if needed
  // This is handled in the API route instead
  
  return had;
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
  lValue?: number;
  depth?: number; // Optional depth for filtering surface section
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
 * Interface for additional info from file
 */
export interface AdditionalInfo {
  atHead: number;
  externalPressure: number;
  metalType: string;
  tensileStrength: number;
  unitWeight: number;
} 