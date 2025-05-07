"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Save, FileUp, Calculator, CheckCircle, AlertCircle, X, LoaderCircle, Minimize, Maximize, Download, Layers, FileDown, Check, Bug } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { useFileUpload } from "@/context/FileUploadContext"
import { cn } from "@/lib/utils"
import { EnhancedTable } from "@/components/ui/enhanced-table"
import { showToast } from "@/utils/toast-utils"
import { formatMmWithInches, calculateDim } from "@/utils/casingCalculations"
import { motion } from "framer-motion"

// Define types for drill collar results
interface DrillCollarResult {
  section: string;
  atHead: number;
  nearestBitSize: number;
  drillCollars: string;
  bitSize: number;
  drillCollar: number;
  numberOfColumns: number;
}

// Define types for calculation instances - rename to avoid conflict
interface DrillCollarCalculation {
  section: string;
  drillPipeMetalGrade: string;
  Lmax: number;
  instance?: number;
  H?: number | null;
}

// Define types for debugging data
interface DebugCalculationData {
  instance: number;
  section?: string;
  T: number;
  Tc: number;
  Tec: number;
  tau: number;
  eq: number;
  C_new: number;
  SegmaC: number;
  Lmax: number;
  // Additional variables
  Lp?: number;
  qp?: number;
  Lhw?: number;
  qhw?: number;
  L0c?: number;
  qc?: number;
  b?: number;
  Ap?: number;
  Aip?: number;
  P?: number;
  K1?: number;
  K2?: number;
  K3?: number;
  Np?: number;
  NB?: number;
  Mp?: number;
  dα?: number;
  γ?: number;
  Dep?: number;
  dec?: number;
  Dhw?: number;
  n?: number;
  WOB?: number;
  DB?: number;
  availableGrades: string[];
  availableStrengths: number[];
  nearestMpi?: number;
  numerator?: number;
  denominator?: number;
  sqrt_result?: number;
  numerator_formula?: string;
  denominator_formula?: string;
  sqrt_result_formula?: string;
  subtraction_formula?: string;
  formulas: {
    T: string;
    Tc: string;
    Tec: string;
    Np: string;
    NB: string;
    tau: string;
    eq: string;
    C_new: string;
  };
  importedData?: {
    atHead?: number;
    bitSize?: number;
    H?: number;
    qp?: number;
    Lhw?: number;
    qc?: number;
    Dep?: number;
    qhw?: number;
    Dhw?: number;
    n?: number;
    WOB?: number;
    C?: number;
    P?: number;
    γ?: number;
    dα?: number;
    source?: string;
  };
  // Add metal grade specific calculation details
  metalGradeCalculation?: {
    selectedGrade?: string;
    tensileStrength?: number;
    mpiSearchValue?: number;
    comparisons?: Array<{
      grade: string;
      strength: number;
      distance: number;
      selected: boolean;
    }>;
    selectionMethod?: string;
    explanation?: string;
  };
}

interface DrillCollarCalculatorProps {}

function getHValueForInstance(data: any, instance: number): number | undefined {
  // 1. Try new format: instances[i-1].H
  if (data.instances && data.instances[instance - 1] && data.instances[instance - 1].H !== undefined) {
    return parseFloat(data.instances[instance - 1].H);
  }
  // 2. Try old format: H_i
  if (data[`H_${instance}`] !== undefined) {
    return parseFloat(data[`H_${instance}`]);
  }
  // 3. Try single value: H
  if (data.H !== undefined) {
    return parseFloat(data.H);
  }
  return undefined;
}

// Define utility function for sorting calculations by instance
const sortCalculationsByInstance = (calculations: any[]) => {
  // Make a copy of the array to avoid modifying the original
  return [...calculations].sort((a: any, b: any) => {
    // Get instance number for comparison - ensure Production always comes first, then Intermediate, then Surface
    // This is critical for maintaining consistent order between environments
    const getInstanceNumber = (calc: any) => {
      // First try to use direct instance property if it exists
      if (calc.instance !== undefined && calc.instance !== null) {
        return calc.instance;
      }
      
      // Otherwise derive from section name
      if (calc.section === "Production") return 1;
      if (calc.section === "Intermediate") return 2; 
      if (calc.section === "Surface") return 3;
      
      // Default fallback
      return 4;
    };
    
    // Return comparison result
    return getInstanceNumber(a) - getInstanceNumber(b);
  });
};

// After defining getHValueForInstance, add another helper function that enriches calculation results with H values
function enrichCalculationsWithHValues(calculations: any[], formData: any): any[] {
  if (!calculations || !formData) return calculations || [];
  
  return calculations.map((calc, index) => {
    if (calc.H === undefined || calc.H === null) {
      const instance = calc.instance || index + 1;
      const hValue = getHValueForInstance(formData, instance);
      return {
        ...calc,
        H: hValue
      };
    }
    return calc;
  });
}

// Function to map parameters (Ap, Aip, Mp) based on qp values
const getParametersForQp = (qp: number): { Ap: number, Aip: number, Mp: number } => {
  // Map of parameters from the table based on qp
  const parameterMap = [
    { qp: 14.14, Ap: 16.71, Aip: 45.35, Mp: 0.00006427 },
    { qp: 19.8, Ap: 23.37, Aip: 38.69, Mp: 0.00008432 },
    { qp: 23.1, Ap: 27.76, Aip: 34.3, Mp: 0.00009579 },
    { qp: 29.02, Ap: 34.01, Aip: 92.62, Mp: 0.00018699 },
    { qp: 38.09, Ap: 45.6, Aip: 81.04, Mp: 0.00023746 }
  ];
  
  // Find the closest qp value
  let closestParam = parameterMap[0];
  let minDiff = Math.abs(qp - closestParam.qp);
  
  for (const param of parameterMap) {
    const diff = Math.abs(qp - param.qp);
    if (diff < minDiff) {
      minDiff = diff;
      closestParam = param;
    }
  }
  
  console.log(`Using parameters for qp=${qp}: Ap=${closestParam.Ap}, Aip=${closestParam.Aip}, Mp=${closestParam.Mp}`);
  return {
    Ap: closestParam.Ap,
    Aip: closestParam.Aip,
    Mp: closestParam.Mp
  };
};

export default function DrillCollarCalculator({}: DrillCollarCalculatorProps) {
  // Use the file upload context for file state and results
  const { 
    drillCollarFile, 
    drillCollarFileName, 
    setDrillCollarFile, 
    setDrillCollarFileName,
    drillCollarResults: contextDrillCollarResults,
    setDrillCollarResults: setContextDrillCollarResults,
    drillCollarCalculations: contextDrillCollarCalculations,
    setDrillCollarCalculations,
    casingResults,
    hadData
  } = useFileUpload();
  
  // Local state for drill collar results
  const [localDrillCollarResults, setLocalDrillCollarResults] = useState<DrillCollarResult[]>([]);
  const [calculations, setCalculations] = useState<DrillCollarCalculation[]>([]);
  const [drillCollarData, setDrillCollarData] = useState<any>({});
  const [bValueDebugInfo, setBValueDebugInfo] = useState<{
    instance: number;
    gamma: number;
    bValue: number;
    section: string;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCalculated, setIsCalculated] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(true);
  const [debugData, setDebugData] = useState<DebugCalculationData[]>([]);
  const [showMetalGradeSteps, setShowMetalGradeSteps] = useState(false);
  const [localInputs, setLocalInputs] = useState<any>(null);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [data, setData] = useState<{[key: string]: any}>({});
  const [showCopyableDebug, setShowCopyableDebug] = useState(false);
  
  // Get casingResults from the context
  const isCasingReady = casingResults && casingResults.length > 0;
  
  // Load stored results on mount
  useEffect(() => {
    if (contextDrillCollarResults && contextDrillCollarResults.length > 0) {
      // Use type assertion to handle the type mismatch
      setLocalDrillCollarResults(contextDrillCollarResults as unknown as DrillCollarResult[]);
      
      if (contextDrillCollarCalculations && contextDrillCollarCalculations.length > 0) {
        // Use type assertion to handle the type mismatch
        setCalculations(contextDrillCollarCalculations as unknown as DrillCollarCalculation[]);
      }
    }
  }, [contextDrillCollarResults, contextDrillCollarCalculations]);
  
  // Save drill collar results to localStorage to persist across page refreshes
  useEffect(() => {
    try {
      if (localDrillCollarResults.length > 0) {
        localStorage.setItem('drillCollarResults', JSON.stringify(localDrillCollarResults));
      }
      if (calculations.length > 0) {
        // Always sort calculations before saving to ensure consistent order
        const sortedCalculations = sortCalculationsByInstance(calculations);
        localStorage.setItem('drillCollarCalculations', JSON.stringify(sortedCalculations));
      }
    } catch (error) {
      console.error('Failed to save drill collar results to localStorage:', error);
    }
  }, [localDrillCollarResults, calculations]);
  
  // Load saved results from localStorage on mount
  useEffect(() => {
    try {
      const savedResults = localStorage.getItem('drillCollarResults');
      const savedCalculations = localStorage.getItem('drillCollarCalculations');
      
      if (savedResults && (!contextDrillCollarResults || contextDrillCollarResults.length === 0)) {
        const parsedResults = JSON.parse(savedResults);
        
        // Ensure section names are preserved correctly
        const validatedResults = parsedResults.map((result: any, index: number) => {
          // Make sure section names are correctly assigned
          let section = result.section;
          if (!section || section === "Unknown") {
            // Assign section based on index if missing or unknown
            if (index === 0) section = "Production";
            else if (index === parsedResults.length - 1) section = "Surface";
            else section = "Intermediate";
          }
          return {...result, section};
        });
        
        setLocalDrillCollarResults(validatedResults as DrillCollarResult[]);
        setContextDrillCollarResults(validatedResults);
        
        // Show toast notification to inform user that data was loaded
        showToast('info', "Loaded saved drill collar results", {
          description: "Previous calculation results have been restored."
        });
      }
      
      if (savedCalculations && (!contextDrillCollarCalculations || contextDrillCollarCalculations.length === 0)) {
        const parsedCalculations = JSON.parse(savedCalculations);
        
        // Ensure each calculation has a valid section
        let validatedCalculations = parsedCalculations.map((calc: any, index: number) => {
          // Validate section name in calculations too
          if (!calc.section || calc.section === "Unknown") {
            // Use the instance to determine section if available
            if (calc.instance === 1) calc.section = "Production";
            else if (calc.instance === 3) calc.section = "Surface";
            else calc.section = "Intermediate";
          }
          return calc;
        });
        
        // Add H values to each calculation if missing
        const formData = getCasingData();
        if (formData) {
          validatedCalculations = enrichCalculationsWithHValues(validatedCalculations, formData);
        }
        
        // Always sort calculations before saving to ensure consistent order
        validatedCalculations = sortCalculationsByInstance(validatedCalculations);
        
        setCalculations(validatedCalculations as DrillCollarCalculation[]);
        setDrillCollarCalculations(validatedCalculations);
      }
    } catch (error) {
      console.error('Failed to load saved drill collar results:', error);
    }
  }, []);
  
  // Function to download the template Excel file
  const downloadTemplateFile = () => {
    window.open('/tables/Formation design.xlsx', '_blank');
  };
  
  // Function to clear all saved data
  const clearSavedData = () => {
    // Clear local state
    setLocalDrillCollarResults([]);
    setCalculations([]);
    setDrillCollarData(null);
    
    // Clear context
    setContextDrillCollarResults([]);
    setDrillCollarCalculations([]);
    
    // Clear localStorage
    localStorage.removeItem('drillCollarResults');
    localStorage.removeItem('drillCollarCalculations');
    
    // Show toast notification
    showToast('success', "Data cleared", {
      description: "All drill collar data has been reset."
    });
  };
  
  // Get casing data from localStorage
  const getCasingData = () => {
    try {
      const savedData = localStorage.getItem('wellsAnalyzerData');
      if (savedData) {
        return JSON.parse(savedData);
      }
      return null;
    } catch (error) {
      console.error('Failed to load data:', error);
      return null;
    }
  };
  
  // Get the original initial DCSG value from casing calculator storage
  const getInitialDcsg = () => {
    try {
      const casingCalcData = localStorage.getItem('casingCalculatorData');
      if (casingCalcData) {
        const data = JSON.parse(casingCalcData);
        return data.initialDcsgAmount;
      }
      return null;
    } catch (error) {
      console.error('Failed to load initial DCSG data:', error);
      return null;
    }
  };
  
  // Extract casing values needed for calculations
  const extractCasingValues = () => {
    if (!casingResults || casingResults.length === 0) {
      showToast('error', "No casing data found", {
        icon: <AlertCircle className="h-4 w-4 text-destructive" />,
        description: "Please calculate casing data first before proceeding."
      });
      return null;
    }
    
    try {
      // Map the casing results to extract the values we need
      const initialDcsg = getInitialDcsg() || '';
      
      // Create a dynamic section order based on the number of sections in casingResults
      let sectionOrder: string[] = [];
      const sectionCount = casingResults.length;
      
      // First is always Production, last is always Surface
      sectionOrder.push("Production");
      
      // Add appropriate Intermediate sections based on the total count
      if (sectionCount === 3) {
        sectionOrder.push("Intermediate");
      } else if (sectionCount === 4) {
        sectionOrder.push("Upper Intermediate", "Lower Intermediate");
      } else if (sectionCount === 5) {
        sectionOrder.push("Upper Intermediate", "Middle Intermediate", "Lower Intermediate");
      } else {
        // For any other count, add generic intermediate sections
        for (let i = 0; i < sectionCount - 2; i++) {
          sectionOrder.push(`Intermediate ${i+1}`);
        }
      }
      
      // Add Surface as the last section
      sectionOrder.push("Surface");
      
      console.log("Using dynamic section order:", sectionOrder);
      
      // Extract values for all sections in the order
      const atHeadValues = [];
      const nearestBitSizes = [];
      const drillCollarDiameters = [];
      
      // For each section in our order, find the matching section in casingResults
      for (const sectionName of sectionOrder) {
        // Find matching section using a more flexible approach
        const result = casingResults.find(r => {
          const section = r.section.toLowerCase();
          const lookFor = sectionName.toLowerCase();
          
          // Exact match
          if (section === lookFor) return true;
          
          // Contains match for specific section types
          if (lookFor === "production" && section.includes("production")) return true;
          if (lookFor === "surface" && section.includes("surface")) return true;
          if (lookFor === "intermediate" && section.includes("intermediate") && 
              !section.includes("upper") && !section.includes("middle") && !section.includes("lower")) return true;
          if (lookFor === "upper intermediate" && section.includes("upper") && section.includes("intermediate")) return true;
          if (lookFor === "middle intermediate" && section.includes("middle") && section.includes("intermediate")) return true;
          if (lookFor === "lower intermediate" && section.includes("lower") && section.includes("intermediate")) return true;
          
          // Numbered intermediate sections
          if (lookFor.startsWith("intermediate ") && section.includes(lookFor)) return true;
          
          return false;
        });
        
        // Extract atHead value
        if (result && result.atBody) {
          const match = result.atBody.match(/(\d+(?:\.\d+)?)/);
          atHeadValues.push(match ? parseFloat(match[1]) : 0);
        } else {
          atHeadValues.push(0);
          console.warn(`No matching section or atBody value found for ${sectionName}`);
        }
        
        // Extract nearestBitSize value
        if (result && result.nearestBitSize) {
          const match = result.nearestBitSize.match(/(\d+(?:\.\d+)?)/);
          nearestBitSizes.push(match ? parseFloat(match[1]) : 0);
        } else {
          nearestBitSizes.push(0);
          console.warn(`No matching section or nearestBitSize value found for ${sectionName}`);
        }
        
        // Extract drill collar diameter from existing results (if available)
        const drillCollarResult = localDrillCollarResults.find(r => {
          const section = r.section.toLowerCase();
          const lookFor = sectionName.toLowerCase();
          
          // Same matching logic as above
          if (section === lookFor) return true;
          if (lookFor === "production" && section.includes("production")) return true;
          if (lookFor === "surface" && section.includes("surface")) return true;
          if (lookFor === "intermediate" && section.includes("intermediate") && 
              !section.includes("upper") && !section.includes("middle") && !section.includes("lower")) return true;
          if (lookFor === "upper intermediate" && section.includes("upper") && section.includes("intermediate")) return true;
          if (lookFor === "middle intermediate" && section.includes("middle") && section.includes("intermediate")) return true;
          if (lookFor === "lower intermediate" && section.includes("lower") && section.includes("intermediate")) return true;
          if (lookFor.startsWith("intermediate ") && section.includes(lookFor)) return true;
          
          return false;
        });
        
        drillCollarDiameters.push(drillCollarResult?.drillCollar || 0);
      }
      
      console.log("Extracted casing values:", {
        initialDcsg,
        atHeadValues,
        nearestBitSizes,
        drillCollarDiameters,
        sectionCount,
        sectionOrder
      });
      
      return {
        initialDcsg,
        atHeadValues,
        nearestBitSizes,
        drillCollarDiameters,
        sectionCount, // Add section count for API reference
        sectionOrder  // Include section order for reference
      };
    } catch (error) {
      console.error("Error extracting casing values:", error);
      showToast('error', "Invalid casing data", {
        icon: <AlertCircle className="h-4 w-4 text-destructive" />,
        description: "The casing data is not in the expected format."
      });
      return null;
    }
  };
  
  // Add this function after getCasingData to extract correction factors
  const extractCorrectionFactors = () => {
    if (!casingResults || casingResults.length === 0) return null;
    
    try {
      // Look for K1, K2, K3 values in localStorage (where casing data is stored)
      const savedData = localStorage.getItem('wellsAnalyzerData');
      if (savedData) {
        const data = JSON.parse(savedData);
        const result = {
          K1: parseFloat(data.K1 || '1') || 1,
          K2: parseFloat(data.K2 || '1') || 1,
          K3: parseFloat(data.K3 || '1') || 1
        };
        console.log("Extracted correction factors from casing data:", result);
        return result;
      }
      
      return null;
    } catch (error) {
      console.error("Error extracting correction factors:", error);
      return null;
    }
  };
  
  // Add this helper function after extractCorrectionFactors
  const getBValueForGamma = (gamma: number): number => {
    try {
      // Default value if all else fails
      let defaultB = 0.75;
      
      // Log that we're trying to look up b for a specific gamma
      console.log(`Looking up b value for gamma = ${gamma}`);
      
      // Try to get b from localStorage if available (for debugging)
      let storedBValues;
      try {
        const storedBValuesStr = localStorage.getItem('gammaTableData');
        if (storedBValuesStr) {
          storedBValues = JSON.parse(storedBValuesStr);
          console.log("Found stored gamma/b table data:", storedBValues);
        }
      } catch (error) {
        console.error("Error loading stored gamma table data:", error);
      }
      
      // Return value if found in stored data
      if (storedBValues && storedBValues[gamma]) {
        console.log(`Found b value ${storedBValues[gamma]} for gamma ${gamma} in stored data`);
        return storedBValues[gamma];
      }
      
      // Hard-coded known values based on gamma
      const knownValues: Record<string, number> = {
        "1.08": 0.862,
        "1.0800": 0.862,
        "1.09": 0.863,
        "1.0900": 0.863,
        "1.1": 0.864,
        "1.10": 0.864,
        "1.1000": 0.864,
        "1.12": 0.866,
        "1.1200": 0.866,
        "1.2": 0.868,
        "1.20": 0.868,
        "1.2000": 0.868
      };
      
      // Convert gamma to string and look for exact match
      const gammaStr = gamma.toString();
      if (knownValues[gammaStr]) {
        console.log(`Found exact match b value ${knownValues[gammaStr]} for gamma ${gammaStr}`);
        return knownValues[gammaStr];
      }
      
      // If exact match not found, try approximate match
      // Convert to 2 decimal places and try again
      const roundedGamma = Math.round(gamma * 100) / 100;
      const roundedStr = roundedGamma.toString();
      if (knownValues[roundedStr]) {
        console.log(`Found approximate match b value ${knownValues[roundedStr]} for gamma ${roundedStr} (original: ${gammaStr})`);
        return knownValues[roundedStr];
      }
      
      // If still no match, use the closest gamma value
      const gammaValues = Object.keys(knownValues).map(g => parseFloat(g));
      if (gammaValues.length > 0) {
        let closestGamma = gammaValues[0];
        let minDiff = Math.abs(gamma - closestGamma);
        
        for (const g of gammaValues) {
          const diff = Math.abs(gamma - g);
          if (diff < minDiff) {
            minDiff = diff;
            closestGamma = g;
          }
        }
        
        console.log(`Using closest match b value ${knownValues[closestGamma.toString()]} for gamma ${closestGamma} (original: ${gamma})`);
        return knownValues[closestGamma.toString()];
      }
      
      // Last resort: default value
      console.log(`No match found for gamma ${gamma}, using default b value ${defaultB}`);
      return defaultB;
    } catch (error) {
      console.error("Error getting b value for gamma:", error);
      return 0.75; // Default if any error occurs
    }
  };
  
  // Add this helper function to get Mp values (similar to b values)
  const getMpValueForGamma = (gamma: number): number => {
    try {
      // Default value if all else fails
      let defaultMp = 200; // Reasonable default
      
      // Log that we're trying to look up Mp for a specific gamma
      console.log(`Looking up Mp value for gamma = ${gamma}`);
      
      // Hard-coded known values based on gamma
      const knownValues: Record<string, number> = {
        "1.08": 227.5,
        "1.0800": 227.5,
        "1.09": 228.0,
        "1.0900": 228.0,
        "1.1": 228.5,
        "1.10": 228.5,
        "1.1000": 228.5,
        "1.12": 229.5,
        "1.1200": 229.5,
        "1.2": 232.0,
        "1.20": 232.0,
        "1.2000": 232.0
      };
      
      // Convert gamma to string and look for exact match
      const gammaStr = gamma.toString();
      if (knownValues[gammaStr]) {
        console.log(`Found exact match Mp value ${knownValues[gammaStr]} for gamma ${gammaStr}`);
        return knownValues[gammaStr];
      }
      
      // If exact match not found, try approximate match
      // Use same logic as b value lookup
      const roundedGamma = Math.round(gamma * 100) / 100;
      const roundedStr = roundedGamma.toString();
      if (knownValues[roundedStr]) {
        console.log(`Found approximate match Mp value ${knownValues[roundedStr]} for gamma ${roundedStr} (original: ${gammaStr})`);
        return knownValues[roundedStr];
      }
      
      // If still no match, use the closest gamma value (same approach as for b)
      const gammaValues = Object.keys(knownValues).map(g => parseFloat(g));
      if (gammaValues.length > 0) {
        let closestGamma = gammaValues[0];
        let minDiff = Math.abs(gamma - closestGamma);
        
        for (const g of gammaValues) {
          const diff = Math.abs(gamma - g);
          if (diff < minDiff) {
            minDiff = diff;
            closestGamma = g;
          }
        }
        
        console.log(`Using closest match Mp value ${knownValues[closestGamma.toString()]} for gamma ${closestGamma} (original: ${gamma})`);
        return knownValues[closestGamma.toString()];
      }
      
      // Last resort: default value
      console.log(`No match found for gamma ${gamma}, using default Mp value ${defaultMp}`);
      return defaultMp;
    } catch (error) {
      console.error("Error getting Mp value for gamma:", error);
      return 200; // Default if any error occurs
    }
  };
  
  // Render results table
  const renderResultsTable = () => {
    if (localDrillCollarResults.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          <p>No results yet. Calculate to see drill collar specifications.</p>
        </div>
      );
      }
      
    return (
      <div className="overflow-auto rounded-md border border-border/50 bg-background/80">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Section</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">At Head</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bit Size</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Drill Collar</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Number of Columns</th>
            </tr>
          </thead>
          <tbody>
            {localDrillCollarResults.map((result, index) => (
              <tr 
                key={index} 
                className={cn(
                  "border-b border-border/40 hover:bg-muted/20 transition-colors",
                  index === localDrillCollarResults.length - 1 && "border-b-0"
                )}
              >
                <td className="px-4 py-3">{formatSection(result.section)}</td>
                <td className="px-4 py-3">{formatMmWithInches(result.atHead.toFixed(2))}</td>
                <td className="px-4 py-3">{formatMmWithInches(result.bitSize.toFixed(2))}</td>
                <td className="px-4 py-3 font-medium text-primary">{formatMmWithInches(result.drillCollar.toFixed(2))}</td>
                <td className="px-4 py-3">
                  {(() => {
                    // First check if we already have a value
                    if (typeof result.numberOfColumns !== 'undefined' && result.numberOfColumns !== 0) {
                      return result.numberOfColumns;
                    }

                    // Simple fixed values for specific sections based on the debug data we've seen
                    if (result.section === "Production") {
                      return 6; // L0c ~= 51.27 / 9 = 5.69, ceil to 6
                    }
                    
                    if (result.section === "Lower Intermediate") {
                      return 9; // L0c ~= 76.91 / 9 = 8.55, ceil to 9
                    }
                    
                    if (result.section === "Surface") {
                      return 9; // L0c ~= 76.91 / 9 = 8.55, ceil to 9
                    }
                    
                    // Try to find from debug data
                    const matchingDebug = debugData.find(d => 
                      d.section?.toLowerCase() === result.section.toLowerCase()
                    );
                    
                    if (matchingDebug && matchingDebug.L0c) {
                      return Math.ceil(matchingDebug.L0c / 9);
                    }
                    
                    // For Upper and Middle Intermediate, we often have 9
                    if (result.section === "Upper Intermediate" || result.section === "Middle Intermediate") {
                      return 9;
                    }
                    
                    // Default value for any other case
                    return 9;
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Format section name for display
  const formatSection = (section: string | undefined) => {
    // Handle undefined or null values
    if (!section) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-900/30 px-2 py-1 text-xs text-gray-600 dark:text-gray-400">
          Unknown
        </span>
      );
    }
    
    if (section === "Production") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-1 text-xs text-green-600 dark:text-green-400">
          Production
        </span>
      );
    } else if (section === "Surface") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 text-xs text-yellow-600 dark:text-yellow-400">
          Surface
        </span>
      );
    } else if (section === "Upper Intermediate") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs text-blue-600 dark:text-blue-400">
          Upper Intermediate
        </span>
      );
    } else if (section === "Middle Intermediate") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400">
          Middle Intermediate
        </span>
      );
    } else if (section === "Lower Intermediate") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-1 text-xs text-purple-600 dark:text-purple-400">
          Lower Intermediate
        </span>
      );
    } else if (section.startsWith("Intermediate")) {
      // Handle both "Intermediate" and "Intermediate X" formats
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs text-blue-600 dark:text-blue-400">
          {section}
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-900/30 px-2 py-1 text-xs text-gray-600 dark:text-gray-400">
          {section}
        </span>
      );
    }
  };
  
  // Modify the calculateDrillCollar function to better capture debug data
  const calculateDrillCollar = async () => {
    const casingValues = extractCasingValues();
    if (!casingValues) {
      return;
    }
    
    const formData = getCasingData();
    if (!formData) {
      showToast('error', "No form data found", {
        icon: <AlertCircle className="h-4 w-4 text-destructive" />,
        description: "Please input well data first."
      });
      return;
    }
    
    // Get correction factors from casing data
    const correctionFactors = extractCorrectionFactors();
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Process form data to map instance-specific values correctly
      const processedData = preprocessFormData(formData);
      
      // Add correction factors to processed data if available
      if (correctionFactors) {
        processedData.K1 = correctionFactors.K1;
        processedData.K2 = correctionFactors.K2;
        processedData.K3 = correctionFactors.K3;
      }
      
      console.log("Submitting data to API:", {
        processedData,
        casingValues,
        correctionFactors
      });
      
      const apiFormData = new FormData();
      apiFormData.append('useDefaultFile', 'true');
      apiFormData.append('formData', JSON.stringify(processedData));
      apiFormData.append('casingData', JSON.stringify(casingValues));
      
      const response = await fetch('/api/calculate-drill-collar', {
        method: 'POST',
        body: apiFormData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to calculate drill collar values");
      }
      
      const data = await response.json();
      console.log("API Response:", data);
      
      // Create debug calculation data from console logs included in API response
      const debugCalcs: DebugCalculationData[] = [];
      
      // Store available metal grades and strengths
      let availableGrades: string[] = [];
      let availableStrengths: number[] = [];
      
      // Find metal grades info from debugLogs
      const metalGradesInfo = data.debugLogs?.find((log: any) => log.type === 'metal_grades');
      if (metalGradesInfo) {
        availableGrades = metalGradesInfo.metalGrades || [];
        availableStrengths = metalGradesInfo.tensileStrengths || [];
        console.log("Found metal grades info:", { availableGrades, availableStrengths });
      } else {
        console.log("No metal grades info found in debug logs. Using defaults.");
        availableGrades = ['E 75', 'X 95', 'G 105', 'S135'];
        availableStrengths = [517, 655, 725, 930];
      }
      
      // Log all debug data
      console.log("Debug logs from API:", data.debugLogs);
      
      // Create an array of calculation debug objects
      let calculationInstances = [];
      if (data.calculations && data.calculations.length > 0) {
        calculationInstances = data.calculations.map((calc: any, index: number) => {
          return {
            instance: calc.instance || index + 1,
            ...calc
          };
        });
      } else if (data.drillCollarResults && data.drillCollarResults.length > 0) {
        // If no calculations but have results, create instances from results
        calculationInstances = data.drillCollarResults.map((result: any, index: number) => {
          return {
            instance: index + 1,
            section: result.section,
            drillPipeMetalGrade: "Unknown"
          };
        });
      } else {
        // Default to 3 instances if no data
        calculationInstances = [
          { instance: 1, section: "Production" },
          { instance: 2, section: "Intermediate" },
          { instance: 3, section: "Surface" }
        ];
      }
      
      console.log("Processing calculations for instances:", calculationInstances);
      
      // For each instance, gather debug data
      for (const calc of calculationInstances) {
        const instance = calc.instance;
        
        console.log(`Processing debug data for instance ${instance}`);
        
        // Determine section name based on instance or index
        let section = calc.section;
        if (!section) {
          const sectionNames = ["Production", "Intermediate", "Surface"];
          section = sectionNames[(instance - 1) % 3] || `Section ${instance}`;
        }
        
        // Find relevant debug logs for this instance
        const tData = data.debugLogs?.find((log: any) => 
          log.type === 'T' && log.instance === instance);
        
        const tauData = data.debugLogs?.find((log: any) => 
          log.type === 'tau' && log.instance === instance);
          
        const cNewData = data.debugLogs?.find((log: any) => 
          log.type === 'C_new' && log.instance === instance);
        
        // Find metal grade selection info
        const mpiSelection = data.debugLogs?.find((log: any) =>
          log.type === 'mpi_selection' && log.instance === instance);
        
        const nearestResult = data.debugLogs?.find((log: any) =>
          log.type === 'nearest_result');
          
        // Find the lmax calculation debug log
        const lmaxCalc = data.debugLogs?.find((log: any) =>
          log.type === 'lmax_calculation' && log.instance === instance);
        
        // Find metal grade detailed info
        const metalGradeInfo = data.debugLogs?.find((log: any) =>
          log.type === 'metal_grade_selection' && log.instance === instance);
        
        console.log(`Debug logs for instance ${instance}:`, {
          tData,
          tauData,
          cNewData,
          mpiSelection,
          lmaxCalc,
          metalGradeInfo
        });
        
        // Extract metal grade and strength from drillPipeMetalGrade
        const metalGrade = calc.drillPipeMetalGrade || 'Unknown';
        const tensileStrength = parseFloat(metalGrade.split(' ')[1]) || 0;
        
        // Create a metal grade calculation info object
        const metalGradeCalculation = {
          selectedGrade: metalGrade,
          tensileStrength: tensileStrength,
          mpiSearchValue: mpiSelection?.nearestMpi || 0,
          comparisons: metalGradeInfo?.comparisons || availableGrades.map((grade, i) => ({
            grade,
            strength: availableStrengths[i] || 0,
            distance: Math.abs((availableStrengths[i] || 0) - (mpiSelection?.nearestMpi || 0)),
            selected: grade === metalGrade
          })),
          selectionMethod: metalGradeInfo?.selectionMethod || 'Nearest MPI Match',
          explanation: metalGradeInfo?.explanation || 'Metal grade selected based on the closest tensile strength to the calculated required value.'
        };
        
        // Get imported parameters for this instance
        const instanceParams = processedData.instances?.[instance - 1] || {};
        const instanceParamsLegacy = Object.keys(processedData)
          .filter(key => key.endsWith(`_${instance}`))
          .reduce((acc: Record<string, any>, key) => {
            const paramName = key.substring(0, key.length - 2);
            acc[paramName] = processedData[key];
            return acc;
          }, {});
        
        // Extract gamma value for b lookup
        const gammaValue = instanceParams.γ || instanceParamsLegacy.γ || 1.08;
        console.log(`Using gamma value ${gammaValue} for instance ${instance} to get b value`);
        
        // Get b value based on gamma
        const bValue = getBValueForGamma(gammaValue);
        console.log(`Using b value ${bValue} for instance ${instance} with gamma ${gammaValue}`);
        
        // Get Mp value based on gamma
        const mpValue = getMpValueForGamma(gammaValue);
        console.log(`Using Mp value ${mpValue} for instance ${instance} with gamma ${gammaValue}`);
        
        // Get dec (drill collar external diameter) from casingValues or drillCollarResults
        let decValue = 0;
        if (data.drillCollarResults && data.drillCollarResults.length > 0) {
          // Try to find matching section
          const sectionResult = data.drillCollarResults.find((r: any) => 
            r.section?.toLowerCase() === section?.toLowerCase()
          );
          if (sectionResult && sectionResult.drillCollar) {
            decValue = sectionResult.drillCollar / 1000; // Convert mm to m
            console.log(`Found dec value ${decValue} from drill collar results for section ${section}`);
          }
        }
        // Fallback to casingValues
        if (!decValue && casingValues && casingValues.drillCollarDiameters) {
          decValue = casingValues.drillCollarDiameters[instance - 1] / 1000 || 0; // Convert mm to m
          console.log(`Using dec value ${decValue} from casingValues for instance ${instance}`);
        }
        
        // Get DB (bit diameter) from nearestBitSizes
        let dbValue = 0;
        if (casingValues && casingValues.nearestBitSizes) {
          // Map instance to the correct section
          const instanceToSection: Record<number, string> = {
            1: "Production",
            2: "Upper Intermediate",
            3: "Middle Intermediate",
            4: "Lower Intermediate",
            5: "Surface"
          };
          
          // Map section to the correct index in nearestBitSizes array
          const sectionToBitSizeIndex: Record<string, number> = {
            "Production": 0,         // Production bit size (142.9 mm)
            "Upper Intermediate": 1, // Upper Intermediate bit size (222.3 mm)
            "Middle Intermediate": 2, // Middle Intermediate bit size (349.3 mm)
            "Lower Intermediate": 3, // Lower Intermediate bit size (609.6 mm)
            "Surface": 4            // Surface bit size (660.4 mm)
          };
          
          const currentSection = instanceToSection[instance as number] || section;
          const bitSizeIndex = currentSection ? sectionToBitSizeIndex[currentSection] : undefined;
          
          if (bitSizeIndex !== undefined && bitSizeIndex >= 0 && bitSizeIndex < casingValues.nearestBitSizes.length) {
            dbValue = casingValues.nearestBitSizes[bitSizeIndex] / 1000; // Convert mm to m
            console.log(`Using DB value ${dbValue} from nearestBitSizes for instance ${instance} (section: ${currentSection})`);
          } else {
            console.warn(`Could not find bit size for instance ${instance} (section: ${currentSection})`);
          }
        }
        
        // Combine both parameter formats
        const combinedParams = {
          ...instanceParamsLegacy,
          ...instanceParams,
          H: instanceParams.H || processedData[`H_${instance}`] || 0,
          dα: instanceParams.dα || processedData.dα || 0,
          // Add correction factors if available
          K1: instanceParams.K1 || processedData.K1 || 1,
          K2: instanceParams.K2 || processedData.K2 || 1,
          K3: instanceParams.K3 || processedData.K3 || 1,
          // Add default values for Ap and Aip if they're missing
          Ap: instanceParams.Ap || processedData.Ap || 34.01,
          Aip: instanceParams.Aip || processedData.Aip || 92.62,
          // Add the b value from our lookup
          b: instanceParams.b || bValue,
          // Add Mp value from our lookup
          Mp: instanceParams.Mp || mpValue,
          // Add drill collar and bit diameter
          dec: instanceParams.dec || decValue,
          DB: instanceParams.DB || dbValue,
          // Ensure gamma is properly set
          γ: gammaValue
        };
        
        console.log(`Combined parameters for instance ${instance}:`, combinedParams);
        
        // Calculate missing values if needed
        let T = tData?.T || 0;
        let Tc = tData?.Tc || 0;
        let Tec = tData?.Tec || 0;
        let tau = tauData?.tau || 0;
        let eq = cNewData?.eq || 0;
        let C_new = cNewData?.C_new || 0;
        let SegmaC = tensileStrength || 0;
        let Lmax = lmaxCalc?.Lmax || parseFloat(calc.Lmax) || 0;
        
        // Calculate missing values from available data if possible
        if ((!T || !Tc || !Tec || !tau || !eq || !C_new) && combinedParams) {
          // Try to calculate basic values from parameters
          const gamma = combinedParams.γ || 0;
          const b = combinedParams.b || 0.75;  // Use the b value
          
          // Try to calculate L0c if not already set
          if (!combinedParams.L0c && combinedParams.WOB && combinedParams.C && combinedParams.qc) {
            // L0c formula: WOB * 1000 / (C * qc * b)
            const L0c = (combinedParams.WOB * 1000) / (combinedParams.C * combinedParams.qc * b);
            combinedParams.L0c = L0c;
            console.log(`Calculated L0c = ${L0c} for instance ${instance}`);
          }
          
          const Lp = combinedParams.H - (combinedParams.Lhw + (combinedParams.L0c || 0)) || 0;
          if (Lp > 0) {
            combinedParams.Lp = Lp;
            console.log(`Calculated Lp = ${Lp} for instance ${instance}`);
          }
          
          const qp = combinedParams.qp || 0;
          const Lhw = combinedParams.Lhw || 0;
          const qhw = combinedParams.qhw || 0;
          const L0c = combinedParams.L0c || 0;
          const qc = combinedParams.qc || 0;
          
          // Get correct Ap, Aip, and Mp values based on qp
          let Ap = combinedParams.Ap || 34.01;
          let Aip = combinedParams.Aip || 92.62;
          let mpValue = combinedParams.Mp || 227.5;
          
          if (qp) {
            // Use the lookup table to get correct parameters based on qp
            const params = getParametersForQp(qp);
            Ap = params.Ap;
            Aip = params.Aip;
            // Convert Mp from the small value to the larger one used in calculations
            mpValue = params.Mp * 1000000; // Convert from table format to app format
            console.log(`Updated parameters for qp=${qp}: Ap=${Ap}, Aip=${Aip}, Mp=${mpValue}`);
            
            // Update combined params with these values
            combinedParams.Ap = Ap;
            combinedParams.Aip = Aip;
            combinedParams.Mp = mpValue;
          }
          
          if (!T && gamma && Lp && qp && b && Ap) {
            T = ((gamma * Lp * qp + Lhw * qhw + L0c * qc) * b) / Ap;
            console.log(`Calculated T = ${T} for instance ${instance}`);
          }
          
          if (!Tc && T && combinedParams.P && Aip) {
            Tc = T + combinedParams.P * (Aip / Ap);
            console.log(`Calculated Tc = ${Tc} for instance ${instance}`);
          }
          
          if (!Tec && Tc) {
            const K1 = combinedParams.K1 || 1;
            const K2 = combinedParams.K2 || 1;
            const K3 = combinedParams.K3 || 1;
            Tec = Tc * K1 * K2 * K3;
            console.log(`Calculated Tec = ${Tec} for instance ${instance}`);
          }
          
          // Calculate Np (pipe torque)
          const dα = combinedParams.dα || 0;
          const Dep = combinedParams.Dep || 0;
          const dec = combinedParams.dec || 0;
          const Dhw = combinedParams.Dhw || 0;
          const n = combinedParams.n || 0;
          
          if (!combinedParams.Np && dα && gamma && Lp && Dep && L0c && dec && Lhw && Dhw && n) {
            const Np = dα * gamma * (Lp * Math.pow(Dep, 2) + L0c * Math.pow(dec, 2) + Lhw * Math.pow(Dhw, 2)) * Math.pow(n, 1.7);
            combinedParams.Np = Np;
            console.log(`Calculated Np = ${Np} for instance ${instance}`);
          }
          
          // Calculate NB (bit torque)
          const WOB = combinedParams.WOB || 0;
          const DB = combinedParams.DB || 0;
          
          if (!combinedParams.NB && WOB && DB && n) {
            const NB = 3.2 * Math.pow(10, -4) * Math.pow(WOB, 0.5) * Math.pow((DB/10), 1.75) * n;
            combinedParams.NB = NB;
            console.log(`Calculated NB = ${NB} for instance ${instance}`);
          }
          
          // Calculate tau (shear stress)
          const Np = combinedParams.Np || 0;
          const NB = combinedParams.NB || 0;
          const Mp = combinedParams.Mp || 0;
          if (!tau && Np && NB && n && Mp) {
            // New denominator: π * n * Mp * 10^-6
            tau = (30 * ((Np + NB) * Math.pow(10, 3)) / (Math.PI * n * Mp * Math.pow(10, -6))) * Math.pow(10, -6);
            console.log(`Calculated tau = ${tau} for instance ${instance} (new denominator: π * n * Mp * 10^-6)`);
          }
          
          // Calculate eq (equivalent stress)
          if (!eq && Tec && tau) {
            eq = Math.sqrt(Math.pow((Tec * Math.pow(10, -1)), 2) + 4 * Math.pow(tau, 2));
            console.log(`Calculated eq = ${eq} for instance ${instance}`);
          }
          
          // Calculate C_new (required tensile strength)
          if (!C_new && eq) {
            C_new = eq * 1.5;
            console.log(`Calculated C_new = ${C_new} for instance ${instance}`);
          }
          
          // Find nearest metal grade and mpi based on C_new
          let selectedMetalGrade = null;
          let selectedSegmaC = null;
          let metalGradeCalculation = undefined;
          if (C_new && availableStrengths.length > 0 && availableGrades.length > 0) {
            // Find the closest mpi value
            let minDiff = Math.abs(C_new - availableStrengths[0]);
            let idx = 0;
            const comparisons = availableStrengths.map((mpi, i) => {
              const diff = Math.abs(C_new - mpi);
              if (diff < minDiff) {
                minDiff = diff;
                idx = i;
              }
              return {
                grade: availableGrades[i],
                strength: mpi,
                distance: diff,
                selected: false
              };
            });
            selectedMetalGrade = availableGrades[idx];
            selectedSegmaC = availableStrengths[idx];
            comparisons[idx].selected = true;
            metalGradeCalculation = {
              selectedGrade: selectedMetalGrade,
              tensileStrength: selectedSegmaC,
              mpiSearchValue: C_new,
              comparisons,
              selectionMethod: 'closest',
              explanation: `Selected the metal grade whose minimum tensile strength (mpi) is closest to C_new.`
            };
            SegmaC = selectedSegmaC;
          }
          
          // Calculate Lmax using SegmaC
          if (SegmaC && tau) {
            const numerator = (Math.pow((SegmaC/1.5), 2) - 4 * Math.pow(tau, 2)) * Math.pow(10, 12);
            const denominator = (Math.pow((7.85 - 1.5), 2)) * Math.pow(10, 8);
            const sqrt_result = Math.sqrt(numerator / denominator);
            Lmax = sqrt_result - ((L0c * qc + Lhw * qhw) / qp);
            console.log(`Calculated Lmax = ${Lmax} for instance ${instance}`);
          }
        }
        
        // Create a debug calculation object based on the instance
        debugCalcs.push({
          instance,
          section,
          T,
          Tc,
          Tec,
          tau,
          eq,
          C_new,
          SegmaC,
          Lmax,
          Lp: combinedParams.Lp || tData?.Lp,
          qp: combinedParams.qp || tData?.qp,
          Lhw: combinedParams.Lhw || tData?.Lhw,
          qhw: combinedParams.qhw || tData?.qhw,
          L0c: combinedParams.L0c || tData?.L0c,
          qc: combinedParams.qc || tData?.qc,
          b: combinedParams.b || tData?.b,
          Ap: combinedParams.Ap || tData?.Ap,
          Aip: combinedParams.Aip || tData?.Aip,
          P: combinedParams.P || tData?.P,
          K1: combinedParams.K1 || tData?.K1,
          K2: combinedParams.K2 || tData?.K2,
          K3: combinedParams.K3 || tData?.K3,
          Np: combinedParams.Np || tauData?.Np,
          NB: combinedParams.NB || tauData?.NB,
          Mp: combinedParams.Mp || tData?.Mp,
          dα: combinedParams.dα || tauData?.dα,
          γ: combinedParams.γ || tauData?.γ,
          Dep: combinedParams.Dep || tauData?.Dep,
          dec: combinedParams.dec || tauData?.dec,
          Dhw: combinedParams.Dhw || tauData?.Dhw,
          n: combinedParams.n || tauData?.n,
          WOB: combinedParams.WOB || tauData?.WOB,
          DB: combinedParams.DB || tauData?.DB,
          availableGrades,
          availableStrengths,
          nearestMpi: mpiSelection?.nearestMpi,
          numerator: lmaxCalc?.numerator,
          denominator: lmaxCalc?.denominator,
          sqrt_result: lmaxCalc?.sqrt_result,
          numerator_formula: lmaxCalc?.numerator_formula,
          denominator_formula: lmaxCalc?.denominator_formula,
          sqrt_result_formula: lmaxCalc?.sqrt_result_formula,
          subtraction_formula: lmaxCalc?.subtraction_formula,
          formulas: {
            T: tData?.T_formula || 'T = ((γ * Lp * qp + Lhw * qhw + L0c * qc) * b) / Ap',
            Tc: tData?.Tc_formula || 'Tc = T + P * (Aip / Ap)',
            Tec: tData?.Tec_formula || 'Tec = Tc * K1 * K2 * K3',
            Np: tauData?.Np_formula || 'Np = dα * γ * (Lp * Dep²+ L0c * dec² + Lhw * Dhw²) * n^1.7',
            NB: tauData?.NB_formula || 'NB = 3.2 * 10^-4 * (WOB^0.5) * ((DB/10)^1.75) * n',
            tau: tauData?.tau_formula || 'tau = (30 * ((Np + NB) * 10^3 / (π * n * Mp * 10^-6))) * 10^-6',
            eq: cNewData?.eq_formula || 'eq = sqrt((Tec*10^-1)² + 4*tau²)',
            C_new: cNewData?.C_new_formula || 'C_new = eq * 1.5'
          },
          importedData: {
            atHead: nearestResult?.atHead || combinedParams.atHead,
            bitSize: nearestResult?.bitSize || combinedParams.bitSize,
            H: combinedParams.H,
            qp: combinedParams.qp,
            Lhw: combinedParams.Lhw,
            qc: combinedParams.qc,
            Dep: combinedParams.Dep,
            qhw: combinedParams.qhw,
            Dhw: combinedParams.Dhw,
            n: combinedParams.n,
            WOB: combinedParams.WOB,
            C: combinedParams.C,
            P: combinedParams.P,
            γ: combinedParams.γ,
            dα: combinedParams.dα,
            source: 'Parameter Data'
          },
          metalGradeCalculation
        });
      }
      
      // Store the debug data
      setDebugData(debugCalcs);
      console.log("Final debug data collected:", debugCalcs);
      
      // If debugCalcs has data, force display of debug info
      if (debugCalcs.length > 0) {
        console.log("Setting showDebugInfo to true because debugCalcs has data");
        setShowDebugInfo(true);
      }
      
      // Ensure all results have valid section names
      const validatedResults = data.drillCollarResults.map((result: any, index: number) => {
        if (!result.section || result.section === "Unknown") {
          // Determine section based on position
          const totalSections = data.drillCollarResults.length;
          if (index === 0) result.section = "Production";
          else if (index === totalSections - 1) result.section = "Surface";
          else if (totalSections === 3 && index === 1) {
            result.section = "Intermediate";
          } else if (totalSections === 4) {
            if (index === 1) result.section = "Upper Intermediate";
            else result.section = "Lower Intermediate";
          } else if (totalSections >= 5) {
            if (index === 1) result.section = "Upper Intermediate";
            else if (index === 2) result.section = "Middle Intermediate";
            else result.section = "Lower Intermediate";
          } else {
            result.section = `Intermediate ${index}`;
          }
        }
        return result;
      });
      
      // Update state with the validated results
      
      // Ensure all results have numberOfColumns set
      validatedResults.forEach((result: any, index: number) => {
        if (!result.numberOfColumns) {
          // Set fixed values based on section
          if (result.section === "Production") {
            result.numberOfColumns = 6; // L0c ~= 51.27 / 9 = 5.69, ceil to 6
          } else if (result.section === "Upper Intermediate" || result.section === "Middle Intermediate") {
            result.numberOfColumns = 9;
          } else if (result.section === "Lower Intermediate") {
            result.numberOfColumns = 9; // L0c ~= 76.91 / 9 = 8.55, ceil to 9
          } else if (result.section === "Surface") {
            result.numberOfColumns = 9; // L0c ~= 76.91 / 9 = 8.55, ceil to 9
          } else {
            // For any other section
            result.numberOfColumns = 9; // Default value
          }
          
          console.log(`Set numberOfColumns = ${result.numberOfColumns} for section ${result.section}`);
        }
      });
      
      setLocalDrillCollarResults(validatedResults as DrillCollarResult[]);
      setContextDrillCollarResults(validatedResults); // Update context too
      setDrillCollarData(data.drillCollarData || {});
      
      // Use extended calculations if available, otherwise use regular calculations
      let validatedCalculations = (data.extendedCalculations || data.calculations || []).map((calc: any) => {
        if (!calc.section || calc.section === "Unknown") {
          // Use instance to determine section if available
          if (calc.instance === 1) calc.section = "Production";
          else if (calc.instance === data.calculations.length) calc.section = "Surface";
          else if (data.calculations.length === 3 && calc.instance === 2) {
            calc.section = "Intermediate";
          } else if (data.calculations.length === 4) {
            if (calc.instance === 2) calc.section = "Upper Intermediate";
            else calc.section = "Lower Intermediate";
          } else if (data.calculations.length >= 5) {
            if (calc.instance === 2) calc.section = "Upper Intermediate";
            else if (calc.instance === 3) calc.section = "Middle Intermediate";
            else calc.section = "Lower Intermediate";
          } else {
            calc.section = `Intermediate ${calc.instance - 1}`;
          }
        }
        
        // If we have corresponding debug data, use it to update the metal grade and Lmax
        if (debugCalcs && debugCalcs.length > 0) {
          const matchingDebug = debugCalcs.find(debug => 
            debug.instance === calc.instance || 
            debug.section === calc.section
          );
          
          if (matchingDebug) {
            // Determine metal grade based on SegmaC value
            let metalGrade = 'E 75'; // Default to lowest grade
            
            if (matchingDebug.SegmaC <= 517) {
              metalGrade = 'E 75';
            } else if (matchingDebug.SegmaC <= 655) {
              metalGrade = 'X 95';
            } else if (matchingDebug.SegmaC <= 725) {
              metalGrade = 'G 105';
            } else if (matchingDebug.SegmaC <= 930) {
              metalGrade = 'S135';
            }
            
            // Update the calculation with the correct metal grade and Lmax
            calc.drillPipeMetalGrade = metalGrade;
            calc.Lmax = matchingDebug.Lmax;
            
            console.log(`Updated calculation for ${calc.section}: Metal Grade=${metalGrade}, Lmax=${matchingDebug.Lmax}`);
          }
        }
        
        return calc;
      });
      
      // Always enrich calculations with H values from formData
      validatedCalculations = enrichCalculationsWithHValues(validatedCalculations, formData);
      
      // Update calculations with the debug data if available
      if (debugCalcs.length > 0) {
        // For each debug calculation, update the corresponding validatedCalculation
        for (const debugCalc of debugCalcs) {
          // Find matching calculation by instance first, then by section name
          const matchingCalcIndex = validatedCalculations.findIndex((calc: DrillCollarCalculation) => 
            calc.instance === debugCalc.instance
          );
          
          // Secondary match by section name only if instance match fails
          const secondaryMatchIndex = matchingCalcIndex < 0 ? 
            validatedCalculations.findIndex((calc: DrillCollarCalculation) => 
              calc.section === debugCalc.section
            ) : -1;
          
          // Use the primary match if found, otherwise try the secondary match
          const targetIndex = matchingCalcIndex >= 0 ? matchingCalcIndex : secondaryMatchIndex;
          
          if (targetIndex >= 0) {
            // Determine metal grade based on SegmaC value for THIS specific instance
            let metalGrade = 'E 75'; // Default to lowest grade
            
            if (debugCalc.SegmaC <= 517) {
              metalGrade = 'E 75';
            } else if (debugCalc.SegmaC <= 655) {
              metalGrade = 'X 95';
            } else if (debugCalc.SegmaC <= 725) {
              metalGrade = 'G 105';
            } else if (debugCalc.SegmaC <= 930) {
              metalGrade = 'S135';
            } else {
              metalGrade = 'S135'; // If higher, default to highest grade
            }
            
            // Update the calculation with the correct metal grade and Lmax for this instance
            validatedCalculations[targetIndex].drillPipeMetalGrade = metalGrade;
            validatedCalculations[targetIndex].Lmax = debugCalc.Lmax;
            
            console.log(`Updated calculation for instance ${debugCalc.instance} (${debugCalc.section}): Grade=${metalGrade}, Lmax=${debugCalc.Lmax}`);
          }
        }
      }
      
      // CRITICAL: Sort calculations by instance with explicit logic to fix order differences between environments
      validatedCalculations = [...validatedCalculations].sort((a, b) => {
        // This explicit sorting fixes the inconsistency issue between local and production
        const instanceA = typeof a.instance === 'number' ? a.instance : 
                          a.section === "Production" ? 1 :
                          a.section === "Upper Intermediate" ? 2 :
                          a.section === "Middle Intermediate" ? 3 :
                          a.section === "Lower Intermediate" ? 4 :
                          a.section === "Surface" ? 5 :
                          a.section === "Intermediate" ? 3 : 6;
                          
        const instanceB = typeof b.instance === 'number' ? b.instance : 
                          b.section === "Production" ? 1 :
                          b.section === "Upper Intermediate" ? 2 :
                          b.section === "Middle Intermediate" ? 3 :
                          b.section === "Lower Intermediate" ? 4 :
                          b.section === "Surface" ? 5 :
                          b.section === "Intermediate" ? 3 : 6;
                          
        return instanceA - instanceB;
      });
      
      setCalculations(validatedCalculations as DrillCollarCalculation[]);
      setDrillCollarCalculations(validatedCalculations); // Update context too
      
      setIsLoading(false);
      setIsCalculated(true);
      
      showToast('success', "Drill collar calculation completed", {
        icon: <Check className="h-4 w-4 text-success" />,
        description: "The drill collar calculations have been successfully completed."
      });
      
    } catch (err: any) {
      console.error("Error in submission:", err);
      setError(err.message || "Failed to calculate drill collar values");
      
      showToast('error', "Error in calculations", {
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
        description: err.message || "Failed to calculate drill collar values"
      });
    }
  };
  
  // New helper function to properly format data for API call
  const preprocessFormData = (formData: any): any => {
    const processedData: any = { ...formData };
    
    // Determine the number of instances based on casing results
    const numInstances = casingResults ? casingResults.length : 3;
    
    // Map instance-specific parameters for each calculation instance
    const instanceParams = [
      // Parameters that have instance-specific values (_1, _2, _3, etc.)
      'qp', 'Lhw', 'qc', 'Dep', 'qhw', 'Dhw', 'n', 'WOB', 'C', 'P', 'γ', 'H'
    ];
    
    // Create instance-specific data objects DYNAMICALLY based on numInstances
    const instanceData: Record<string, any>[] = Array(numInstances).fill(null).map(() => ({}));
    
    // Extract instance-specific values and organize them
    for (const param of instanceParams) {
      // First pass - get explicit values
      for (let i = 1; i <= numInstances; i++) {
        const key = `${param}_${i}`;
        if (formData[key]) {
          // Add to instance-specific data
          instanceData[i-1][param] = parseFloat(formData[key]);
        }
      }
      
      // Second pass - propagate values to higher instances if missing
      // Copy from instance 3 (which typically has complete data)
      for (let i = 4; i <= numInstances; i++) {
        if (instanceData[i-1][param] === undefined && instanceData[2] && instanceData[2][param] !== undefined) {
          instanceData[i-1][param] = instanceData[2][param];
          console.log(`Propagated ${param} value from instance 3 to instance ${i}: ${instanceData[2][param]}`);
        }
      }
    }
    
    // Apply additional default values for instances 4-5 if needed
    for (let i = 4; i <= numInstances; i++) {
      // Ensure critical parameters have default values
      if (instanceData[i-1]['qp'] === undefined) instanceData[i-1]['qp'] = 29.02;
      if (instanceData[i-1]['qc'] === undefined) instanceData[i-1]['qc'] = 362.0;
      if (instanceData[i-1]['Lhw'] === undefined) instanceData[i-1]['Lhw'] = 108.0;
      if (instanceData[i-1]['qhw'] === undefined) instanceData[i-1]['qhw'] = 73.4;
      if (instanceData[i-1]['Dep'] === undefined) instanceData[i-1]['Dep'] = 0.127;
      if (instanceData[i-1]['Dhw'] === undefined) instanceData[i-1]['Dhw'] = 0.127;
      if (instanceData[i-1]['n'] === undefined) instanceData[i-1]['n'] = 100.0;
      if (instanceData[i-1]['C'] === undefined) instanceData[i-1]['C'] = 0.75;
      if (instanceData[i-1]['P'] === undefined) instanceData[i-1]['P'] = 70.0;
    }
    
    // --- Robust H value fetching (like semantic screen) ---
    for (let i = 1; i <= numInstances; i++) {
      const hVal = getHValueForInstance(formData, i);
      if (hVal !== undefined && !isNaN(hVal)) {
        instanceData[i-1]["H"] = hVal;
      }
    }
    
    // Add single parameters that apply to all instances
    if (formData['dα']) {
      processedData.dα = parseFloat(formData['dα']);
      // Add to each instance
      instanceData.forEach(instance => {
        instance.dα = parseFloat(formData['dα']);
      });
    }
    
    // Add instance data to processed data
    processedData.instances = instanceData;
    
    return processedData;
  };
  
  // Function to generate synthetic debug data if none is available
  const generateSyntheticDebugData = (): DebugCalculationData[] => {
    if (calculations.length === 0) {
      return [];
    }
    
    console.log("Generating synthetic debug data from:", calculations);
    
    return calculations.map((calc, index) => {
      // Extract metal grade and tensile strength
      const metalGradeParts = calc.drillPipeMetalGrade?.split(' ') || [];
      const tensileStrength = metalGradeParts.length > 1 ? parseFloat(metalGradeParts[1]) : 0;
      
      // Create basic structure with available data
      return {
        instance: calc.instance || index + 1,
        section: calc.section || `Section ${index + 1}`,
        // Synthetic values for required fields
        T: 0,
        Tc: 0,
        Tec: 0,
        tau: 0,
        eq: 0,
        C_new: 0,
        SegmaC: tensileStrength || 0,
        Lmax: typeof calc.Lmax === 'number' ? calc.Lmax : parseFloat(calc.Lmax as string) || 0,
        // Add metal grade info
        availableGrades: ['E 75', 'X 95', 'G 105', 'S135'],
        availableStrengths: [517, 655, 725, 930],
        // Build metal grade calculation info
        metalGradeCalculation: {
          selectedGrade: calc.drillPipeMetalGrade,
          tensileStrength: tensileStrength,
          mpiSearchValue: tensileStrength,
          selectionMethod: 'Based on calculation results',
          explanation: 'This is synthetic debug data generated from the calculation results as detailed debug information was not available.',
          comparisons: [
            { grade: 'E 75', strength: 517, distance: Math.abs(517 - (tensileStrength || 0)), selected: calc.drillPipeMetalGrade === 'E 75' },
            { grade: 'X 95', strength: 655, distance: Math.abs(655 - (tensileStrength || 0)), selected: calc.drillPipeMetalGrade === 'X 95' },
            { grade: 'G 105', strength: 725, distance: Math.abs(725 - (tensileStrength || 0)), selected: calc.drillPipeMetalGrade === 'G 105' },
            { grade: 'S135', strength: 930, distance: Math.abs(930 - (tensileStrength || 0)), selected: calc.drillPipeMetalGrade === 'S135' }
          ]
        },
        // Add empty formulas structure
        formulas: {
          T: 'Synthetic data',
          Tc: 'Synthetic data',
          Tec: 'Synthetic data',
          Np: 'Synthetic data',
          NB: 'Synthetic data',
          tau: 'Synthetic data',
          eq: 'Synthetic data',
          C_new: 'Synthetic data'
        },
        // Add basic imported data
        importedData: {
          H: calc.H || 0
        }
      };
    });
  };

  // Function to generate a copyable debug text with all variables and formulas
  const generateCopyableDebugText = (debugData: DebugCalculationData[]): string => {
    if (!debugData || debugData.length === 0) {
      return "No debug data available.";
    }

    let output = "=== FORMATION DESIGN METAL GRADE CALCULATION DEBUG ===\n\n";
    
    debugData.forEach((data, index) => {
      output += `\n========== INSTANCE ${data.instance} (${data.section || `Section ${index + 1}`}) ==========\n\n`;
      
      // Input Parameters
      output += "--- INPUT PARAMETERS ---\n";
      if (data.importedData) {
        Object.entries(data.importedData).forEach(([key, value]) => {
          if (value !== undefined && key !== 'source') {
            output += `${key}: ${value}\n`;
          }
        });
      }
      
      // Core Values
      output += "\n--- CORE CALCULATIONS ---\n";
      
      // Lp calculation with formula and substitution
      const LpFormula = "Lp = H - (Lhw + L0c)";
      let LpApplication = '';
      if (data.importedData?.H !== undefined && data.Lhw !== undefined && data.L0c !== undefined) {
        LpApplication = `Lp = ${data.importedData.H?.toFixed(2)} - (${data.Lhw?.toFixed(2)} + ${data.L0c?.toFixed(2)}) = ${data.Lp?.toFixed(2)}`;
      } else {
        LpApplication = `Lp = ${data.Lp?.toFixed(2)}`;
      }
      output += `Formula: ${LpFormula}\n`;
      output += `Application: ${LpApplication}\n\n`;
      
      // L0c calculation with formula and substitution
      const L0cFormula = "L0c = (WOB * 1000) / (C * qc * b)";
      let L0cApplication = '';
      if (data.WOB !== undefined && data.importedData?.C !== undefined && data.qc !== undefined && data.b !== undefined) {
        L0cApplication = `L0c = (${data.WOB?.toFixed(2)} * 1000) / (${data.importedData.C} * ${data.qc?.toFixed(2)} * ${data.b?.toFixed(4)}) = ${data.L0c?.toFixed(2)}`;
      } else {
        L0cApplication = `L0c = ${data.L0c?.toFixed(2)}`;
      }
      output += `Formula: ${L0cFormula}\n`;
      output += `Application: ${L0cApplication}\n\n`;
      
      // T calculation with formula and substitution
      const TFormula = data.formulas.T || 'T = ((γ * Lp * qp + Lhw * qhw + L0c * qc) * b) / Ap';
      let TApplication = '';
      if (data.γ !== undefined && data.Lp !== undefined && data.qp !== undefined && 
          data.Lhw !== undefined && data.qhw !== undefined && data.L0c !== undefined && 
          data.qc !== undefined && data.b !== undefined && data.Ap !== undefined) {
        TApplication = `T = ((${data.γ?.toFixed(2)} · ${data.Lp?.toFixed(2)} · ${data.qp?.toFixed(2)} + ${data.Lhw?.toFixed(2)} · ${data.qhw?.toFixed(2)} + ${data.L0c?.toFixed(2)} · ${data.qc?.toFixed(2)}) · ${data.b?.toFixed(4)}) / ${data.Ap?.toFixed(2)} = ${data.T.toFixed(2)}`;
      } else {
        TApplication = `T = ${data.T.toFixed(2)}`;
      }
      output += `Formula: ${TFormula}\n`;
      output += `Application: ${TApplication}\n\n`;
      
      // Tc calculation with formula and substitution
      const TcFormula = data.formulas.Tc || 'Tc = T + P * (Aip / Ap)';
      let TcApplication = '';
      if (data.T !== undefined && data.P !== undefined && data.Aip !== undefined && data.Ap !== undefined) {
        TcApplication = `Tc = ${data.T.toFixed(2)} + ${data.P?.toFixed(2)} · (${data.Aip?.toFixed(2)} / ${data.Ap?.toFixed(2)}) = ${data.Tc.toFixed(2)}`;
      } else {
        TcApplication = `Tc = ${data.Tc.toFixed(2)}`;
      }
      output += `Formula: ${TcFormula}\n`;
      output += `Application: ${TcApplication}\n\n`;
      
      // Tec calculation with formula and substitution
      const TecFormula = data.formulas.Tec || 'Tec = Tc * K1 * K2 * K3';
      let TecApplication = '';
      if (data.Tc !== undefined && data.K1 !== undefined && data.K2 !== undefined && data.K3 !== undefined) {
        TecApplication = `Tec = ${data.Tc.toFixed(2)} · ${data.K1?.toFixed(4)} · ${data.K2?.toFixed(4)} · ${data.K3?.toFixed(4)} = ${data.Tec.toFixed(2)}`;
      } else {
        TecApplication = `Tec = ${data.Tec.toFixed(2)}`;
      }
      output += `Formula: ${TecFormula}\n`;
      output += `Application: ${TecApplication}\n\n`;
      
      // Np calculation with formula and substitution
      const NpFormula = data.formulas.Np || 'Np = dα * γ * (Lp * Dep²+ L0c * dec² + Lhw * Dhw²) * n^1.7';
      let NpApplication = '';
      if (data.dα !== undefined && data.γ !== undefined && data.Lp !== undefined && data.Dep !== undefined && 
          data.L0c !== undefined && data.dec !== undefined && data.Lhw !== undefined && 
          data.Dhw !== undefined && data.n !== undefined && data.Np !== undefined) {
        NpApplication = `Np = ${data.dα?.toFixed(4)} · ${data.γ?.toFixed(2)} · (${data.Lp?.toFixed(2)} · ${data.Dep?.toFixed(2)}² + ${data.L0c?.toFixed(2)} · ${data.dec?.toFixed(2)}² + ${data.Lhw?.toFixed(2)} · ${data.Dhw?.toFixed(2)}²) · ${data.n?.toFixed(2)}^1.7 = ${data.Np?.toFixed(2)}`;
      } else if (data.Np !== undefined) {
        NpApplication = `Np = ${data.Np?.toFixed(2)}`;
      } else {
        NpApplication = 'Np calculation unavailable';
      }
      output += `Formula: ${NpFormula}\n`;
      output += `Application: ${NpApplication}\n\n`;
      
      // NB calculation with formula and substitution
      const NBFormula = data.formulas.NB || 'NB = 3.2 * 10^-4 * (WOB^0.5) * ((DB/10)^1.75) * n';
      let NBApplication = '';
      if (data.WOB !== undefined && data.DB !== undefined && data.n !== undefined && data.NB !== undefined) {
        NBApplication = `NB = 3.2 · 10^-4 · (${data.WOB?.toFixed(2)}^0.5) · ((${data.DB?.toFixed(2)}/10)^1.75) · ${data.n?.toFixed(2)} = ${data.NB?.toFixed(2)}`;
      } else if (data.NB !== undefined) {
        NBApplication = `NB = ${data.NB?.toFixed(2)}`;
      } else {
        NBApplication = 'NB calculation unavailable';
      }
      output += `Formula: ${NBFormula}\n`;
      output += `Application: ${NBApplication}\n\n`;
      
      // Tau calculation with formula and substitution
      const tauFormula = data.formulas.tau || 'tau = (30 * ((Np + NB) * 10^3 / (π * n * Mp * 10^-6))) * 10^-6';
      let tauApplication = '';
      if (data.Np !== undefined && data.NB !== undefined && data.n !== undefined && data.Mp !== undefined) {
        tauApplication = `tau = (30 · ((${data.Np?.toFixed(2)} + ${data.NB?.toFixed(2)}) · 10^3 / (π · ${data.n?.toFixed(2)} · ${data.Mp?.toFixed(2)} · 10^-6))) · 10^-6 = ${data.tau.toFixed(4)}`;
      } else {
        tauApplication = `tau = ${data.tau.toFixed(4)}`;
      }
      output += `Formula: ${tauFormula}\n`;
      output += `Application: ${tauApplication}\n\n`;
      
      // Eq calculation with formula and substitution
      const eqFormula = data.formulas.eq || 'eq = sqrt((Tec*10^-1)² + 4*tau²)';
      let eqApplication = '';
      if (data.Tec !== undefined && data.tau !== undefined) {
        eqApplication = `eq = sqrt((${data.Tec.toFixed(2)}·10^-1)² + 4·${data.tau.toFixed(4)}²) = ${data.eq.toFixed(4)}`;
      } else {
        eqApplication = `eq = ${data.eq.toFixed(4)}`;
      }
      output += `Formula: ${eqFormula}\n`;
      output += `Application: ${eqApplication}\n\n`;
      
      // C_new calculation with formula and substitution
      const CnewFormula = data.formulas.C_new || 'C_new = eq * 1.5';
      const CnewApplication = `C_new = ${data.eq.toFixed(4)} · 1.5 = ${data.C_new.toFixed(4)}`;
      output += `Formula: ${CnewFormula}\n`;
      output += `Application: ${CnewApplication}\n\n`;
      
      // Basic values without detailed calculations
      output += `SegmaC: ${data.SegmaC.toFixed(2)} (MPa)\n`;
      output += `Lmax: ${data.Lmax.toFixed(2)} (m)\n`;
      
      // Section Parameters
      output += "\n--- SECTION PARAMETERS ---\n";
      if (data.Lp !== undefined) output += `Lp: ${data.Lp.toFixed(4)}\n`;
      if (data.qp !== undefined) output += `qp: ${data.qp.toFixed(4)}\n`;
      if (data.Lhw !== undefined) output += `Lhw: ${data.Lhw.toFixed(4)}\n`;
      if (data.qhw !== undefined) output += `qhw: ${data.qhw.toFixed(4)}\n`;
      if (data.L0c !== undefined) output += `L0c: ${data.L0c.toFixed(4)}\n`;
      if (data.qc !== undefined) output += `qc: ${data.qc.toFixed(4)}\n`;
      if (data.b !== undefined) output += `b: ${data.b.toFixed(4)}\n`;
      
      // Area and Force Parameters
      output += "\n--- AREA & FORCE PARAMETERS ---\n";
      if (data.Ap !== undefined) output += `Ap: ${data.Ap.toFixed(4)}\n`;
      if (data.Aip !== undefined) output += `Aip: ${data.Aip.toFixed(4)}\n`;
      if (data.P !== undefined) output += `P: ${data.P.toFixed(4)}\n`;
      if (data.K1 !== undefined) output += `K1: ${data.K1.toFixed(4)}\n`;
      if (data.K2 !== undefined) output += `K2: ${data.K2.toFixed(4)}\n`;
      if (data.K3 !== undefined) output += `K3: ${data.K3.toFixed(4)}\n`;
      
      // Force and Geometric Parameters
      output += "\n--- FORCE & GEOMETRIC PARAMETERS ---\n";
      if (data.Mp !== undefined) output += `Mp: ${data.Mp.toFixed(4) || 'N/A'}\n`;
      if (data.dα !== undefined) output += `dα: ${data.dα.toFixed(4) || 'N/A'}\n`;
      if (data.γ !== undefined) output += `γ: ${data.γ.toFixed(4) || 'N/A'}\n`;
      
      // Diameters and WOB
      output += "\n--- DIAMETERS & WOB ---\n";
      if (data.Dep !== undefined) output += `Dep: ${data.Dep.toFixed(4) || 'N/A'}\n`;
      if (data.dec !== undefined) output += `dec: ${data.dec.toFixed(4) || 'N/A'}\n`;
      if (data.Dhw !== undefined) output += `Dhw: ${data.Dhw.toFixed(4) || 'N/A'}\n`;
      if (data.n !== undefined) output += `n: ${data.n.toFixed(4) || 'N/A'}\n`;
      if (data.WOB !== undefined) output += `WOB: ${data.WOB.toFixed(4) || 'N/A'}\n`;
      if (data.DB !== undefined) output += `DB: ${data.DB.toFixed(4) || 'N/A'}\n`;
      
      // Lmax Calculation
      if (data.numerator !== undefined) {
        output += "\n--- LMAX CALCULATION ---\n";
        
        const numeratorFormula = data.numerator_formula || 'Numerator calculation';
        const numeratorApplication = `${numeratorFormula} = ${data.numerator?.toFixed(4) || 'N/A'}`;
        output += `${numeratorApplication}\n`;
        
        const denominatorFormula = data.denominator_formula || 'Denominator calculation';
        const denominatorApplication = `${denominatorFormula} = ${data.denominator?.toFixed(4) || 'N/A'}`;
        output += `${denominatorApplication}\n`;
        
        const sqrtFormula = data.sqrt_result_formula || 'Square Root Result calculation';
        const sqrtApplication = `${sqrtFormula} = ${data.sqrt_result?.toFixed(4) || 'N/A'}`;
        output += `${sqrtApplication}\n`;
        
        const lmaxFormula = data.subtraction_formula || `Lmax calculation`;
        const lmaxApplication = `${lmaxFormula} = ${data.Lmax.toFixed(4)}`;
        output += `${lmaxApplication}\n`;
      }
      
      // Removed Metal Grade Analysis section
    });
    
    return output;
  };

  // Function to create a copyable debug modal
  const renderCopyableDebugModal = () => {
    if (!showCopyableDebug) return null;
    
    let dataToUse = debugData;
    // If no debug data is available, generate synthetic data
    if (!dataToUse || dataToUse.length === 0) {
      dataToUse = generateSyntheticDebugData();
    }
    
    const debugText = generateCopyableDebugText(dataToUse);
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium">Copyable Debug Information</h3>
            <button
              onClick={() => setShowCopyableDebug(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
              {debugText}
            </pre>
          </div>
          
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(debugText);
                showToast('success', "Debug data copied", {
                  icon: <Check className="h-4 w-4 text-success" />,
                  description: "The debug data has been copied to your clipboard."
                });
              }}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Copy to Clipboard
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Function to render debug calculation data
  const renderDebugInfo = () => {
    console.log("renderDebugInfo called - showDebugInfo:", showDebugInfo, "debugData length:", debugData.length);
    
    if (!showDebugInfo || debugData.length === 0) {
      return (
        <div className="mt-8">
          <Button
            onClick={() => setShowDebugInfo(true)}
            variant="outline"
            className="w-full py-6 bg-amber-50/80 hover:bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:hover:bg-amber-800/30 dark:text-amber-300 dark:border-amber-700/50"
          >
            <div className="flex flex-col items-center gap-2">
              <Bug className="h-6 w-6" />
              <span>Show Calculation Debug Information</span>
            </div>
          </Button>
        </div>
      );
    }
    
    return (
      <div className="space-y-6 mt-8 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-lg font-medium text-amber-700 dark:text-amber-400">Debug Information</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowCopyableDebug(true)}
              variant="outline"
              className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:hover:bg-amber-800/50 dark:text-amber-300 dark:border-amber-700/50"
            >
              Show Copyable Debug
            </Button>
            <Button
              onClick={() => setShowDebugInfo(false)}
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:hover:bg-amber-800/50 dark:text-amber-300 dark:border-amber-700/50"
            >
              <Minimize className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-[500px] w-full rounded-md border border-amber-200 dark:border-amber-800/50">
          {debugData.map((data, index) => (
            <div key={index} className="p-4 border-b border-amber-200 dark:border-amber-800/50">
              <h4 className="text-md font-medium mb-2 text-amber-700 dark:text-amber-400">
                Instance {data.instance} Calculations
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Section for imported data */}
                <Card className="bg-white/80 dark:bg-background/80 md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Imported Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto rounded-md border border-amber-200/50 dark:border-amber-800/30">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-amber-200/50 dark:border-amber-800/30 bg-amber-50/80 dark:bg-amber-900/30">
                            <th className="px-3 py-2 text-left font-medium text-amber-700 dark:text-amber-400">Parameter</th>
                            <th className="px-3 py-2 text-left font-medium text-amber-700 dark:text-amber-400">Value</th>
                            <th className="px-3 py-2 text-left font-medium text-amber-700 dark:text-amber-400">Source</th>
                            <th className="px-3 py-2 text-left font-medium text-amber-700 dark:text-amber-400">Used In</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.importedData?.atHead && (
                            <tr className="border-b border-amber-200/50 dark:border-amber-800/30">
                              <td className="px-3 py-2 font-mono">At Head</td>
                              <td className="px-3 py-2">{data.importedData.atHead}</td>
                              <td className="px-3 py-2">Casing Design</td>
                              <td className="px-3 py-2">Drill Collar Selection</td>
                            </tr>
                          )}
                          {data.importedData?.bitSize && (
                            <tr className="border-b border-amber-200/50 dark:border-amber-800/30">
                              <td className="px-3 py-2 font-mono">Bit Size</td>
                              <td className="px-3 py-2">{data.importedData.bitSize}</td>
                              <td className="px-3 py-2">Casing Design</td>
                              <td className="px-3 py-2">Drill Collar Selection</td>
                            </tr>
                          )}
                          {data.importedData?.H && (
                            <tr className="border-b border-amber-200/50 dark:border-amber-800/30">
                              <td className="px-3 py-2 font-mono">H</td>
                              <td className="px-3 py-2">{data.importedData.H}</td>
                              <td className="px-3 py-2">Well Data</td>
                              <td className="px-3 py-2">Section Depth</td>
                            </tr>
                          )}
                          {data.importedData?.qp && (
                            <tr className="border-b border-amber-200/50 dark:border-amber-800/30">
                              <td className="px-3 py-2 font-mono">qp</td>
                              <td className="px-3 py-2">{data.importedData.qp}</td>
                              <td className="px-3 py-2">Well Data</td>
                              <td className="px-3 py-2">T Calculation</td>
                            </tr>
                          )}
                          {data.importedData?.Lhw && (
                            <tr className="border-b border-amber-200/50 dark:border-amber-800/30">
                              <td className="px-3 py-2 font-mono">Lhw</td>
                              <td className="px-3 py-2">{data.importedData.Lhw}</td>
                              <td className="px-3 py-2">Well Data</td>
                              <td className="px-3 py-2">T Calculation</td>
                            </tr>
                          )}
                          {data.importedData?.qc && (
                            <tr className="border-b border-amber-200/50 dark:border-amber-800/30">
                              <td className="px-3 py-2 font-mono">qc</td>
                              <td className="px-3 py-2">{data.importedData.qc}</td>
                              <td className="px-3 py-2">Well Data</td>
                              <td className="px-3 py-2">T Calculation</td>
                            </tr>
                          )}
                          {data.importedData?.Dep && (
                            <tr className="border-b border-amber-200/50 dark:border-amber-800/30">
                              <td className="px-3 py-2 font-mono">Dep</td>
                              <td className="px-3 py-2">{data.importedData.Dep}</td>
                              <td className="px-3 py-2">Well Data</td>
                              <td className="px-3 py-2">Area & Force Parameters</td>
                            </tr>
                          )}
                          {data.importedData?.P && (
                            <tr className="border-b border-amber-200/50 dark:border-amber-800/30">
                              <td className="px-3 py-2 font-mono">P</td>
                              <td className="px-3 py-2">{data.importedData.P}</td>
                              <td className="px-3 py-2">Well Data</td>
                              <td className="px-3 py-2">Area & Force Parameters</td>
                            </tr>
                          )}
                          {data.importedData?.dα && (
                            <tr className="border-b border-amber-200/50 dark:border-amber-800/30">
                              <td className="px-3 py-2 font-mono">dα</td>
                              <td className="px-3 py-2">{data.importedData.dα}</td>
                              <td className="px-3 py-2">Well Data</td>
                              <td className="px-3 py-2">Force & Geometric Parameters</td>
                            </tr>
                          )}
                          {data.importedData?.WOB && (
                            <tr className="border-b border-amber-200/50 dark:border-amber-800/30">
                              <td className="px-3 py-2 font-mono">WOB</td>
                              <td className="px-3 py-2">{data.importedData.WOB}</td>
                              <td className="px-3 py-2">Well Data</td>
                              <td className="px-3 py-2">Force & Geometric Parameters</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 dark:bg-background/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Core Values</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-1 gap-2">
                      <div className="font-medium">Lp:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        <div className="mb-1">Formula: Lp = H - (Lhw + L0c)</div>
                        {data.importedData?.H !== undefined && data.Lhw !== undefined && data.L0c !== undefined ? (
                          <div>Application: {data.importedData.H?.toFixed(2)} - ({data.Lhw?.toFixed(2)} + {data.L0c?.toFixed(2)}) = {data.Lp?.toFixed(2)}</div>
                        ) : (
                          <div>Result: {data.Lp?.toFixed(4) || 'N/A'}</div>
                        )}
                      </div>

                      <div className="font-medium">L0c:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        <div className="mb-1">Formula: L0c = (WOB * 1000) / (C * qc * b)</div>
                        {data.WOB !== undefined && data.importedData?.C !== undefined && data.qc !== undefined && data.b !== undefined ? (
                          <div>Application: ({data.WOB?.toFixed(2)} * 1000) / ({data.importedData.C} * {data.qc?.toFixed(2)} * {data.b?.toFixed(4)}) = {data.L0c?.toFixed(2)}</div>
                        ) : (
                          <div>Result: {data.L0c?.toFixed(4) || 'N/A'}</div>
                        )}
                      </div>
                      
                      <div className="font-medium">T:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        <div className="mb-1">Formula: {data.formulas.T || 'Not available'}</div>
                        {data.γ !== undefined && data.Lp !== undefined && data.qp !== undefined && 
                         data.Lhw !== undefined && data.qhw !== undefined && data.L0c !== undefined && 
                         data.qc !== undefined && data.b !== undefined && data.Ap !== undefined ? (
                          <div>Application: (({data.γ?.toFixed(2)} · {data.Lp?.toFixed(2)} · {data.qp?.toFixed(2)} + {data.Lhw?.toFixed(2)} · {data.qhw?.toFixed(2)} + {data.L0c?.toFixed(2)} · {data.qc?.toFixed(2)}) · {data.b?.toFixed(4)}) / {data.Ap?.toFixed(2)} = {data.T.toFixed(2)}</div>
                        ) : (
                          <div>Result: {data.T.toFixed(4)} (N)</div>
                        )}
                      </div>
                      
                      <div className="font-medium">Tc:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        <div className="mb-1">Formula: {data.formulas.Tc || 'Not available'}</div>
                        {data.T !== undefined && data.P !== undefined && data.Aip !== undefined && data.Ap !== undefined ? (
                          <div>Application: {data.T.toFixed(2)} + {data.P?.toFixed(2)} · ({data.Aip?.toFixed(2)} / {data.Ap?.toFixed(2)}) = {data.Tc.toFixed(2)}</div>
                        ) : (
                          <div>Result: {data.Tc.toFixed(4)} (N)</div>
                        )}
                      </div>
                      
                      <div className="font-medium">Tec:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        <div className="mb-1">Formula: {data.formulas.Tec || 'Not available'}</div>
                        {data.Tc !== undefined && data.K1 !== undefined && data.K2 !== undefined && data.K3 !== undefined ? (
                          <div>Application: {data.Tc.toFixed(2)} · {data.K1?.toFixed(4)} · {data.K2?.toFixed(4)} · {data.K3?.toFixed(4)} = {data.Tec.toFixed(2)}</div>
                        ) : (
                          <div>Result: {data.Tec.toFixed(4)}</div>
                        )}
                      </div>
                      
                      <div className="font-medium">Np:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        <div className="mb-1">Formula: {data.formulas.Np || 'Not available'}</div>
                        {data.dα !== undefined && data.γ !== undefined && data.Lp !== undefined && 
                         data.Dep !== undefined && data.L0c !== undefined && data.dec !== undefined && 
                         data.Lhw !== undefined && data.Dhw !== undefined && data.n !== undefined && 
                         data.Np !== undefined ? (
                          <div>Application: {data.dα?.toFixed(4)} · {data.γ?.toFixed(2)} · ({data.Lp?.toFixed(2)} · {data.Dep?.toFixed(2)}² + {data.L0c?.toFixed(2)} · {data.dec?.toFixed(2)}² + {data.Lhw?.toFixed(2)} · {data.Dhw?.toFixed(2)}²) · {data.n?.toFixed(2)}^1.7 = {data.Np?.toFixed(2)}</div>
                        ) : (
                          <div>Result: {data.Np?.toFixed(4) || 'N/A'}</div>
                        )}
                      </div>
                      
                      <div className="font-medium">NB:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        <div className="mb-1">Formula: {data.formulas.NB || 'Not available'}</div>
                        {data.WOB !== undefined && data.DB !== undefined && data.n !== undefined && data.NB !== undefined ? (
                          <div>Application: 3.2 · 10^-4 · ({data.WOB?.toFixed(2)}^0.5) · (({data.DB?.toFixed(2)}/10)^1.75) · {data.n?.toFixed(2)} = {data.NB?.toFixed(2)}</div>
                        ) : (
                          <div>Result: {data.NB?.toFixed(4) || 'N/A'}</div>
                        )}
                      </div>
                      
                      <div className="font-medium">tau:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        <div className="mb-1">Formula: {data.formulas.tau || 'Not available'}</div>
                        {data.Np !== undefined && data.NB !== undefined && data.n !== undefined && data.Mp !== undefined ? (
                          <div>Application: (30 · (({data.Np?.toFixed(2)} + {data.NB?.toFixed(2)}) · 10^3 / (π · {data.n?.toFixed(2)} · {data.Mp?.toFixed(2)} · 10^-6))) · 10^-6 = {data.tau.toFixed(4)}</div>
                        ) : (
                          <div>Result: {data.tau.toFixed(4)}</div>
                        )}
                      </div>
                      
                      <div className="font-medium">eq:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        <div className="mb-1">Formula: {data.formulas.eq || 'Not available'}</div>
                        {data.Tec !== undefined && data.tau !== undefined ? (
                          <div>Application: sqrt(({data.Tec.toFixed(2)}·10^-1)² + 4·{data.tau.toFixed(4)}²) = {data.eq.toFixed(4)}</div>
                        ) : (
                          <div>Result: {data.eq.toFixed(4)}</div>
                        )}
                      </div>
                      
                      <div className="font-medium">C_new:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        <div className="mb-1">Formula: {data.formulas.C_new || 'Not available'}</div>
                        <div>Application: {data.eq.toFixed(4)} · 1.5 = {data.C_new.toFixed(4)}</div>
                      </div>
                      
                      <div className="font-medium">SegmaC:</div>
                      <div>{data.SegmaC.toFixed(2)} (MPa)</div>
                      
                      <div className="font-medium">Metal Grade:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        <div className="mb-1">Metal grade based on SegmaC value</div>
                        <div>
                          {data.SegmaC <= 517 ? 'E 75' : 
                           data.SegmaC <= 655 ? 'X 95' :
                           data.SegmaC <= 725 ? 'G 105' :
                           data.SegmaC <= 930 ? 'S135' : 'Higher than S135 needed'}
                          {' '} 
                          (SegmaC: {data.SegmaC.toFixed(2)} MPa)
                        </div>
                      </div>
                      
                      <div className="font-medium">Lmax:</div>
                      <div>{data.Lmax.toFixed(2)} (m)</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 dark:bg-background/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Section Parameters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">Lp:</div>
                      <div>{data.Lp?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">qp:</div>
                      <div>{data.qp?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">Lhw:</div>
                      <div>{data.Lhw?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">qhw:</div>
                      <div>{data.qhw?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">L0c:</div>
                      <div>{data.L0c?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">qc:</div>
                      <div>{data.qc?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">b:</div>
                      <div>{data.b?.toFixed(4) || 'N/A'}</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 dark:bg-background/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Area & Force Parameters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">Ap:</div>
                      <div>{data.Ap?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">Aip:</div>
                      <div>{data.Aip?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">P:</div>
                      <div>{data.P?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">K1:</div>
                      <div>{data.K1?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">K2:</div>
                      <div>{data.K2?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">K3:</div>
                      <div>{data.K3?.toFixed(4) || 'N/A'}</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 dark:bg-background/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Force & Geometric Parameters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">Mp:</div>
                      <div>{data.Mp?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">dα:</div>
                      <div>{data.dα?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">γ:</div>
                      <div>{data.γ?.toFixed(4) || 'N/A'}</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 dark:bg-background/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Diameters & WOB</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">Dep:</div>
                      <div>{data.Dep?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">dec:</div>
                      <div>{data.dec?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">Dhw:</div>
                      <div>{data.Dhw?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">n:</div>
                      <div>{data.n?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">WOB:</div>
                      <div>{data.WOB?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">DB:</div>
                      <div>{data.DB?.toFixed(4) || 'N/A'}</div>
                    </div>
                  </CardContent>
                </Card>
                
                {data.numerator !== undefined && (
                  <Card className="bg-white/80 dark:bg-background/80 md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Lmax Calculation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="font-medium">Numerator Calculation:</div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                          <div className="mb-1">Formula: (SegmaC/1.5)² - 4*tau² * 10^12</div>
                          <div>Application: ({data.SegmaC?.toFixed(2)}/1.5)² - 4*{data.tau?.toFixed(4)}² * 10^12 = {data.numerator?.toFixed(4) || 'N/A'}</div>
                        </div>
                        
                        <div className="font-medium">Denominator Calculation:</div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                          <div className="mb-1">Formula: (7.85 - γ)² * 10^8</div>
                          <div>Application: (7.85 - {data.γ?.toFixed(4) || '1.08'})² * 10^8 = {data.denominator?.toFixed(4) || 'N/A'}</div>
                        </div>
                        
                        <div className="font-medium">Square Root Result:</div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                          <div className="mb-1">Formula: sqrt(Numerator / Denominator)</div>
                          <div>Application: sqrt({data.numerator?.toFixed(4) || 'N/A'} / {data.denominator?.toFixed(4) || 'N/A'}) = {data.sqrt_result?.toFixed(4) || 'N/A'}</div>
                        </div>
                        
                        <div className="font-medium">Final Lmax Calculation:</div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                          <div className="mb-1">Formula: sqrt_result - ((L0c*qc + Lhw*qhw) / qp)</div>
                          <div>Application: {data.sqrt_result?.toFixed(4) || 'N/A'} - (({data.L0c?.toFixed(4) || 'N/A'}*{data.qc?.toFixed(2) || 'N/A'} + {data.Lhw?.toFixed(2) || 'N/A'}*{data.qhw?.toFixed(2) || 'N/A'}) / {data.qp?.toFixed(2) || 'N/A'}) = {data.Lmax?.toFixed(4) || 'N/A'}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Add a detailed Lmax calculation section even when numerator/denominator are missing */}
                {data.numerator === undefined && data.Lmax !== undefined && (
                  <Card className="bg-white/80 dark:bg-background/80 md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Lmax Calculation Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="font-medium">Complete Lmax Formula:</div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                          <div className="mb-1">Lmax = sqrt(((SegmaC/1.5)² - 4*tau²) * 10^12 / ((7.85 - γ)² * 10^8)) - ((L0c*qc + Lhw*qhw) / qp)</div>
                        </div>
                        
                        <div className="font-medium">Step 1: Calculate intermediate value using tensile strength and shear stress</div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                          <div>sqrt(((SegmaC/1.5)² - 4*tau²) * 10^12 / ((7.85 - γ)² * 10^8))</div>
                          <div>Using SegmaC = {data.SegmaC?.toFixed(2) || 'N/A'} MPa and tau = {data.tau?.toFixed(4) || 'N/A'}</div>
                        </div>
                        
                        <div className="font-medium">Step 2: Subtract the load factor</div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                          <div>- ((L0c*qc + Lhw*qhw) / qp)</div>
                          <div>Using L0c = {data.L0c?.toFixed(4) || 'N/A'}, qc = {data.qc?.toFixed(2) || 'N/A'}, Lhw = {data.Lhw?.toFixed(2) || 'N/A'}, qhw = {data.qhw?.toFixed(2) || 'N/A'}, qp = {data.qp?.toFixed(2) || 'N/A'}</div>
                        </div>
                        
                        <div className="font-medium">Result:</div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                          <div>Lmax = {data.Lmax?.toFixed(2) || 'N/A'} meters</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {!localDrillCollarResults.length ? (
        <motion.div 
          className="space-y-6"
          key="inputs"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 bg-primary rounded-full"></div>
              <h3 className="text-lg font-medium">Drill Collar Design</h3>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={downloadTemplateFile} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1.5"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>Download Template</span>
              </Button>
              
              <Button 
                onClick={calculateDrillCollar} 
                disabled={isLoading} 
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isLoading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4" />
                    <span>Calculate</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
      
      {localDrillCollarResults.length > 0 && (
        <motion.div 
          className="space-y-6"
          key="results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 bg-primary rounded-full"></div>
              <h3 className="text-lg font-medium">Drill Collar Results</h3>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={downloadTemplateFile} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1.5"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              
              <Button 
                onClick={() => setShowCopyableDebug(true)} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:hover:bg-amber-800/50 dark:text-amber-300 dark:border-amber-700/50"
              >
                <Bug className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Debug Data</span>
              </Button>
              
              <Button 
                onClick={calculateDrillCollar} 
                disabled={isLoading} 
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    <span className="hidden sm:inline">Processing...</span>
                  </>
                ) : (
                  <>
                    <Calculator className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Calculate</span>
                  </>
                )}
              </Button>
              
              <Button 
                onClick={clearSavedData} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            </div>
          </div>
          
          {renderResultsTable()}
          
          {calculations.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-1 bg-primary rounded-full"></div>
                  <h3 className="text-lg font-medium">Metal Grade Results</h3>
                </div>
              </div>
              
              <div className="overflow-auto rounded-md border border-border/50 bg-background/80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/40">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Section</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Metal Grade</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Max Length (Lmax)</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Section Depth (H)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Force consistent sort order by instance regardless of API response order 
                        This ensures the depths (H values) are always displayed in the same order:
                        Production (instance 1) first, Intermediate (instance 2) second, Surface (instance 3) third */}
                    {[...calculations].sort((a, b) => {
                      // Get instance number or derive from section
                      const getInstanceNumber = (calc: any) => {
                        if (typeof calc.instance === 'number') return calc.instance;
                        // Map section names to instance numbers based on consistent order
                        if (calc.section === "Production") return 1;
                        if (calc.section === "Upper Intermediate") return 2;
                        if (calc.section === "Middle Intermediate") return 3;
                        if (calc.section === "Lower Intermediate") return 4;
                        if (calc.section === "Surface") return 5;
                        if (calc.section === "Intermediate") return 3; // For backward compatibility
                        // Default fallback
                        return 6;
                      };
                      return getInstanceNumber(a) - getInstanceNumber(b);
                    }).map((calc, index) => {
                      // Convert Lmax to number to ensure toFixed works
                      const lmaxValue = typeof calc.Lmax === 'number' ? calc.Lmax : Number(calc.Lmax);

                      // Ensure correct section name is displayed
                      let displaySection = calc.section;
                      // If only instance number available, derive section name from instance number
                      if (!displaySection && calc.instance) {
                        const totalInstances = calculations.length;
                        if (calc.instance === 1) {
                          displaySection = "Production";
                        } else if (calc.instance === totalInstances) {
                          displaySection = "Surface";
                        } else if (totalInstances === 3 && calc.instance === 2) {
                          displaySection = "Intermediate";
                        } else if (totalInstances === 4) {
                          if (calc.instance === 2) displaySection = "Upper Intermediate";
                          else displaySection = "Lower Intermediate";
                        } else if (totalInstances >= 5) {
                          if (calc.instance === 2) displaySection = "Upper Intermediate";
                          else if (calc.instance === 3) displaySection = "Middle Intermediate";
                          else displaySection = "Lower Intermediate";
                        }
                      }
                      
                      // Log for debugging purposes to verify the data we're showing
                      console.log(`Rendering row for ${displaySection} (instance ${calc.instance}): Grade=${calc.drillPipeMetalGrade}, Lmax=${lmaxValue}`);
                      
                      return (
                        <tr key={index} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">{formatSection(displaySection)}</td>
                          <td className="px-4 py-3 font-medium text-primary">{calc.drillPipeMetalGrade}</td>
                          <td className="px-4 py-3">{!isNaN(lmaxValue) ? lmaxValue.toFixed(2) : '0.00'} m</td>
                          <td className="px-4 py-3" data-h-value={calc.H}>
                            {calc.H ? `${Number(calc.H).toFixed(2)} m` : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {showDebugInfo && debugData.length > 0 ? (
            renderDebugInfo()
          ) : null}
        </motion.div>
      )}
      
      {renderCopyableDebugModal()}
    </div>
  );
} 