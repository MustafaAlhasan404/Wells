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
}

// Define types for debugging data
interface DebugCalculationData {
  instance: number;
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
}

interface DrillCollarCalculatorProps {}

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
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugData, setDebugData] = useState<DebugCalculationData[]>([]);
  
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
        localStorage.setItem('drillCollarCalculations', JSON.stringify(calculations));
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
        const validatedCalculations = parsedCalculations.map((calc: any, index: number) => {
          // Validate section name in calculations too
          if (!calc.section || calc.section === "Unknown") {
            // Use the instance to determine section if available
            if (calc.instance === 1) calc.section = "Production";
            else if (calc.instance === 3) calc.section = "Surface";
            else calc.section = "Intermediate";
          }
          return calc;
        });
        
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
      
      // Extract atHead values from dcsg property (strip formatting)
      const atHeadValues = casingResults.map(result => {
        // Extract numeric value from dcsg string, e.g. "244.5 mm (9 5/8")" -> 244.5
        if (!result.dcsg) return 0;
        const match = result.dcsg.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
      }).filter(val => val > 0); // Filter out zero values
      
      // Extract nearest bit sizes (strip formatting)
      const nearestBitSizes = casingResults.map(result => {
        // Extract numeric value from nearestBitSize string
        if (!result.nearestBitSize) return 0;
        const match = result.nearestBitSize.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
      });
      
      console.log("Extracted values:", { initialDcsg, atHeadValues, nearestBitSizes });
      
      return {
        initialDcsg,
        atHeadValues,
        nearestBitSizes
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
                <td className="px-4 py-3">{typeof result.numberOfColumns !== 'undefined' ? result.numberOfColumns : 'N/A'}</td>
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
    
    setIsLoading(true);
    setError(null);
    
    try {
      const apiFormData = new FormData();
      apiFormData.append('useDefaultFile', 'true');
      apiFormData.append('formData', JSON.stringify(formData));
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
      
      // Log the response data to debug
      console.log("API Response:", data);
      console.log("Calculations:", data.calculations);
      
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
        console.log("Found metal grades:", availableGrades);
        console.log("Found tensile strengths:", availableStrengths);
      }
      
      // Parse calculation data if available
      if (data.calculations && data.calculations.length > 0) {
        data.calculations.forEach((calc: any, index: number) => {
          // Create a debug calculation object based on the instance
          const instance = calc.instance || index + 1;
          
          // Extract formulas and values from console logs if they exist
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
          
          if (tData || tauData || cNewData) {
            debugCalcs.push({
              instance,
              T: tData?.T || 0,
              Tc: tData?.Tc || 0,
              Tec: tData?.Tec || 0,
              tau: tauData?.tau || 0,
              eq: cNewData?.eq || 0,
              C_new: cNewData?.C_new || 0,
              SegmaC: parseFloat(calc.drillPipeMetalGrade.split(' ')[1]) || 0,
              Lmax: parseFloat(calc.Lmax) || 0,
              Lp: tData?.Lp,
              qp: tData?.qp,
              Lhw: tData?.Lhw,
              qhw: tData?.qhw,
              L0c: tData?.L0c,
              qc: tData?.qc,
              b: tData?.b,
              Ap: tData?.Ap,
              Aip: tData?.Aip,
              P: tData?.P,
              K1: tData?.K1,
              K2: tData?.K2,
              K3: tData?.K3,
              Np: tauData?.Np,
              NB: tauData?.NB,
              Mp: tauData?.Mp,
              dα: tauData?.dα,
              γ: tauData?.γ,
              Dep: tauData?.Dep,
              dec: tauData?.dec,
              Dhw: tauData?.Dhw,
              n: tauData?.n,
              WOB: tauData?.WOB,
              DB: tauData?.DB,
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
                T: tData?.T_formula || '',
                Tc: tData?.Tc_formula || '',
                Tec: tData?.Tec_formula || '',
                Np: tauData?.Np_formula || '',
                NB: tauData?.NB_formula || '',
                tau: tauData?.tau_formula || '',
                eq: cNewData?.eq_formula || '',
                C_new: cNewData?.C_new_formula || ''
              }
            });
          }
        });
      }
      
      setDebugData(debugCalcs);
      
      // Ensure all results have valid section names
      const validatedResults = data.drillCollarResults.map((result: any, index: number) => {
        if (!result.section || result.section === "Unknown") {
          // Determine section based on position
          if (index === 0) result.section = "Production";
          else if (index === data.drillCollarResults.length - 1) result.section = "Surface";
          else result.section = "Intermediate";
        }
        return result;
      });
      
      // Update state with the validated results
      setLocalDrillCollarResults(validatedResults as DrillCollarResult[]);
      setContextDrillCollarResults(validatedResults); // Update context too
      setDrillCollarData(data.drillCollarData || {});
      
      // Use extended calculations if available, otherwise use regular calculations
      const validatedCalculations = (data.extendedCalculations || data.calculations || []).map((calc: any) => {
        if (!calc.section || calc.section === "Unknown") {
          // Use instance to determine section if available
          if (calc.instance === 1) calc.section = "Production";
          else if (calc.instance === 3) calc.section = "Surface";
          else calc.section = "Intermediate";
        }
        return calc;
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
  
  // Function to render debug calculation data
  const renderDebugInfo = () => {
    if (!showDebugInfo || debugData.length === 0) {
      return null;
    }

    // Extract findNearest debug logs (if any)
    const findNearestLogs = debugData.map(calc => {
      return `C_new: ${calc.C_new.toFixed(2)}, nearest to ${calc.availableStrengths?.join(', ')} => ${calc.nearestMpi}`;
    }).join('\n');

    return (
      <div className="mt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 bg-red-500 rounded-full"></div>
            <h3 className="text-lg font-medium">Debug Information</h3>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metal Grade Calculation Details</CardTitle>
            <CardDescription>Showing the detailed equation steps for each section</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {debugData.map((calc, index) => (
                <div key={index} className="p-4 border-b border-border/50 last:border-b-0">
                  <h4 className="font-medium mb-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs
                      ${calc.instance === 1 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 
                        calc.instance === 3 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' : 
                        'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                      {calc.instance === 1 ? 'Production' : calc.instance === 3 ? 'Surface' : 'Intermediate'}
                    </span>
                  </h4>
                  
                  <div className="space-y-6 text-sm">
                    {/* Metal Grades Section */}
                    <div className="space-y-2 pb-4 border-b">
                      <h5 className="font-medium">Available Metal Grades</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-muted/30 rounded text-xs">
                          <p className="font-medium">Grades:</p>
                          <p>{calc.availableGrades?.join(', ') || 'N/A'}</p>
                        </div>
                        <div className="p-2 bg-muted/30 rounded text-xs">
                          <p className="font-medium">Strengths (MPa):</p>
                          <p>{calc.availableStrengths?.join(', ') || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Variable Definitions Section */}
                    <div className="space-y-2">
                      <h5 className="font-medium border-b pb-1">Variable Values</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {calc.Lp !== undefined && (
                          <div className="p-2 bg-muted/20 rounded">
                            <p className="font-medium">Lp:</p>
                            <p className="font-mono">{calc.Lp?.toFixed(2)} m</p>
                            <p className="text-xs text-muted-foreground">Length of drill pipe</p>
                          </div>
                        )}
                        {calc.qp !== undefined && (
                          <div className="p-2 bg-muted/20 rounded">
                            <p className="font-medium">qp:</p>
                            <p className="font-mono">{calc.qp?.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Weight of drill pipe</p>
                          </div>
                        )}
                        {calc.Lhw !== undefined && (
                          <div className="p-2 bg-muted/20 rounded">
                            <p className="font-medium">Lhw:</p>
                            <p className="font-mono">{calc.Lhw?.toFixed(2)} m</p>
                            <p className="text-xs text-muted-foreground">Length of heavy-wall pipe</p>
                          </div>
                        )}
                        {calc.qhw !== undefined && (
                          <div className="p-2 bg-muted/20 rounded">
                            <p className="font-medium">qhw:</p>
                            <p className="font-mono">{calc.qhw?.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Weight of heavy-wall pipe</p>
                          </div>
                        )}
                        {calc.L0c !== undefined && (
                          <div className="p-2 bg-muted/20 rounded">
                            <p className="font-medium">L0c:</p>
                            <p className="font-mono">{calc.L0c?.toFixed(2)} m</p>
                            <p className="text-xs text-muted-foreground">Length of drill collar</p>
                          </div>
                        )}
                        {calc.qc !== undefined && (
                          <div className="p-2 bg-muted/20 rounded">
                            <p className="font-medium">qc:</p>
                            <p className="font-mono">{calc.qc?.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Weight of drill collar</p>
                          </div>
                        )}
                        {calc.b !== undefined && (
                          <div className="p-2 bg-muted/20 rounded">
                            <p className="font-medium">b:</p>
                            <p className="font-mono">{calc.b?.toFixed(3)}</p>
                            <p className="text-xs text-muted-foreground">Buoyancy parameter</p>
                          </div>
                        )}
                        {calc.Ap !== undefined && (
                          <div className="p-2 bg-muted/20 rounded">
                            <p className="font-medium">Ap:</p>
                            <p className="font-mono">{calc.Ap?.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Cross-sectional area</p>
                          </div>
                        )}
                        {calc.Aip !== undefined && (
                          <div className="p-2 bg-muted/20 rounded">
                            <p className="font-medium">Aip:</p>
                            <p className="font-mono">{calc.Aip?.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Internal area</p>
                          </div>
                        )}
                        {calc.P !== undefined && (
                          <div className="p-2 bg-muted/20 rounded">
                            <p className="font-medium">P:</p>
                            <p className="font-mono">{calc.P?.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Pressure</p>
                          </div>
                        )}
                        {calc.K1 !== undefined && (
                          <div className="p-2 bg-muted/20 rounded">
                            <p className="font-medium">K1:</p>
                            <p className="font-mono">{calc.K1?.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Correction factor</p>
                          </div>
                        )}
                        {calc.K2 !== undefined && (
                          <div className="p-2 bg-muted/20 rounded">
                            <p className="font-medium">K2:</p>
                            <p className="font-mono">{calc.K2?.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Correction factor</p>
                          </div>
                        )}
                        {calc.K3 !== undefined && (
                          <div className="p-2 bg-muted/20 rounded">
                            <p className="font-medium">K3:</p>
                            <p className="font-mono">{calc.K3?.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Correction factor</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* T Calculation */}
                    <div className="space-y-2 border-t pt-3">
                      <h5 className="font-medium">1. T Calculation (Tensile Force)</h5>
                      <div className="p-3 bg-muted/30 rounded text-xs font-mono">
                        <p className="mb-2">Equation: T = ((1.08 * Lp * qp + Lhw * qhw + L0c * qc) * b) / Ap</p>
                        <p className="mb-2">Variables:</p>
                        <ul className="list-disc pl-5 space-y-1 mb-2">
                          <li>Lp (pipe length) = {calc.Lp?.toFixed(2) || 'N/A'} m</li>
                          <li>qp (pipe weight) = {calc.qp?.toFixed(2) || 'N/A'}</li>
                          <li>Lhw (heavy-wall length) = {calc.Lhw?.toFixed(2) || 'N/A'} m</li>
                          <li>qhw (heavy-wall weight) = {calc.qhw?.toFixed(2) || 'N/A'}</li>
                          <li>L0c (collar length) = {calc.L0c?.toFixed(5) || 'N/A'} m</li>
                          <li>qc (collar weight) = {calc.qc?.toFixed(2) || 'N/A'}</li>
                          <li>b (buoyancy coefficient) = {calc.b?.toFixed(3) || 'N/A'}</li>
                          <li>Ap (cross-sectional area) = {calc.Ap?.toFixed(2) || 'N/A'}</li>
                        </ul>
                        <p className="mb-2">Applied Formula: {calc.formulas.T}</p>
                        <p className="font-bold">Result (T): {calc.T.toFixed(4)}</p>
                      </div>
                    </div>
                    
                    {/* Tc Calculation */}
                    <div className="space-y-2">
                      <h5 className="font-medium">2. Tc Calculation (Corrected Tensile Force)</h5>
                      <div className="p-3 bg-muted/30 rounded text-xs font-mono">
                        <p className="mb-2">Equation: Tc = T + P * (Aip / Ap)</p>
                        <p className="mb-2">Variables:</p>
                        <ul className="list-disc pl-5 space-y-1 mb-2">
                          <li>T (tensile force) = {calc.T?.toFixed(4) || 'N/A'}</li>
                          <li>P (pressure) = {calc.P?.toFixed(2) || 'N/A'}</li>
                          <li>Aip (internal area) = {calc.Aip?.toFixed(2) || 'N/A'}</li>
                          <li>Ap (cross-sectional area) = {calc.Ap?.toFixed(2) || 'N/A'}</li>
                        </ul>
                        <p className="mb-2">Applied Formula: {calc.formulas.Tc}</p>
                        <p className="font-bold">Result (Tc): {calc.Tc.toFixed(4)}</p>
                      </div>
                    </div>
                    
                    {/* Tec Calculation */}
                    <div className="space-y-2">
                      <h5 className="font-medium">3. Tec Calculation (Equivalent Tensile Force)</h5>
                      <div className="p-3 bg-muted/30 rounded text-xs font-mono">
                        <p className="mb-2">Equation: Tec = Tc * K1 * K2 * K3</p>
                        <p className="mb-2">Variables:</p>
                        <ul className="list-disc pl-5 space-y-1 mb-2">
                          <li>Tc (corrected tensile) = {calc.Tc?.toFixed(4) || 'N/A'}</li>
                          <li>K1 (correction factor) = {calc.K1?.toFixed(2) || 'N/A'}</li>
                          <li>K2 (correction factor) = {calc.K2?.toFixed(2) || 'N/A'}</li>
                          <li>K3 (correction factor) = {calc.K3?.toFixed(2) || 'N/A'}</li>
                        </ul>
                        <p className="mb-2">Applied Formula: {calc.formulas.Tec}</p>
                        <p className="font-bold">Result (Tec): {calc.Tec.toFixed(4)}</p>
                      </div>
                    </div>
                    
                    {/* Np & NB Calculation */}
                    <div className="space-y-2">
                      <h5 className="font-medium">4. Np & NB Calculation (Power Components)</h5>
                      <div className="p-3 bg-muted/30 rounded text-xs font-mono">
                        <p className="mb-2">Np Equation: Np = dα * γ * (Lp * Dep² + L0c * dec² + Lhw * Dhw²) * n^1.7</p>
                        <p className="mb-2">NB Equation: NB = 3.2 * 10⁻² * (WOB^0.5) * (DB^1.75) * n</p>
                        <p className="mb-2">Variables:</p>
                        <ul className="list-disc pl-5 space-y-1 mb-2">
                          <li>dα = {calc.dα?.toFixed(6) || 'N/A'}</li>
                          <li>γ (gamma) = {calc.γ?.toFixed(2) || 'N/A'}</li>
                          <li>Dep (pipe diameter) = {calc.Dep?.toFixed(3) || 'N/A'} m</li>
                          <li>dec (collar diameter) = {calc.dec?.toFixed(3) || 'N/A'} m</li>
                          <li>Dhw (heavy-wall diameter) = {calc.Dhw?.toFixed(3) || 'N/A'} m</li>
                          <li>n (rotation speed) = {calc.n || 'N/A'} rpm</li>
                          <li>WOB (weight on bit) = {calc.WOB?.toFixed(2) || 'N/A'}</li>
                          <li>DB (bit diameter) = {calc.DB?.toFixed(4) || 'N/A'} m</li>
                        </ul>
                        <p>Applied Np Formula: {calc.formulas.Np}</p>
                        <p>Np Result: {calc.Np?.toFixed(4) || 'N/A'}</p>
                        <p className="mt-2">Applied NB Formula: {calc.formulas.NB}</p>
                        <p>NB Result: {calc.NB?.toFixed(4) || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {/* Tau Calculation */}
                    <div className="space-y-2">
                      <h5 className="font-medium">5. Tau Calculation (Torque Factor)</h5>
                      <div className="p-3 bg-muted/30 rounded text-xs font-mono">
                        <p className="mb-2">Equation: tau = (30 * ((Np + NB) * 10³ / (π * n * Mp))) * 10⁻⁶</p>
                        <p className="mb-2">Variables:</p>
                        <ul className="list-disc pl-5 space-y-1 mb-2">
                          <li>Np = {calc.Np?.toFixed(4) || 'N/A'}</li>
                          <li>NB = {calc.NB?.toFixed(4) || 'N/A'}</li>
                          <li>n (rotation speed) = {calc.n || 'N/A'} rpm</li>
                          <li>Mp (torque parameter) = {calc.Mp?.toFixed(6) || 'N/A'}</li>
                        </ul>
                        <p className="mb-2">Applied Formula: {calc.formulas.tau}</p>
                        <p className="font-bold">Result (tau): {calc.tau.toFixed(4)}</p>
                      </div>
                    </div>
                    
                    {/* C_new Calculation */}
                    <div className="space-y-2">
                      <h5 className="font-medium">6. C_new Calculation (Safety Factor)</h5>
                      <div className="p-3 bg-muted/30 rounded text-xs font-mono">
                        <p className="mb-2">Equivalent Stress Equation: eq = √((Tec*10⁻¹)² + 4*tau²)</p>
                        <p className="mb-2">C_new Equation: C_new = eq * 1.5</p>
                        <p className="mb-2">Variables:</p>
                        <ul className="list-disc pl-5 space-y-1 mb-2">
                          <li>Tec = {calc.Tec?.toFixed(4) || 'N/A'}</li>
                          <li>tau = {calc.tau?.toFixed(4) || 'N/A'}</li>
                        </ul>
                        <p>Equivalent Stress Formula: {calc.formulas.eq}</p>
                        <p>Equivalent Stress Result: {calc.eq.toFixed(4)}</p>
                        <p className="mt-2">C_new Formula: {calc.formulas.C_new}</p>
                        <p className="font-bold">C_new Result: {calc.C_new.toFixed(4)}</p>
                      </div>
                    </div>
                    
                    {/* Metal Grade Selection */}
                    <div className="space-y-2">
                      <h5 className="font-medium">7. Metal Grade Selection</h5>
                      <div className="p-3 bg-muted/30 rounded text-xs font-mono">
                        <p className="mb-2">Process: Find nearest minimum tensile strength to C_new</p>
                        <p className="mb-2">Variables:</p>
                        <ul className="list-disc pl-5 space-y-1 mb-2">
                          <li>C_new = {calc.C_new.toFixed(4)}</li>
                          <li>Available strengths (MPa) = {calc.availableStrengths?.join(', ') || 'N/A'}</li>
                          <li>Available grades = {calc.availableGrades?.join(', ') || 'N/A'}</li>
                        </ul>
                        <p className="mb-2 text-blue-600 dark:text-blue-400 font-medium">Selected MPa value (SegmaC): {calc.nearestMpi || 'N/A'}</p>
                        <p className="font-bold">Selected Metal Grade: {calculations[index]?.drillPipeMetalGrade}</p>
                        
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-sm">
                          <p className="text-blue-700 dark:text-blue-300 font-medium">Important: The actual tensile strength ({calc.nearestMpi} MPa) is used in calculations, not the number from the grade name.</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Lmax Calculation */}
                    <div className="space-y-2">
                      <h5 className="font-medium">8. Lmax Calculation (Maximum Length)</h5>
                      <div className="p-3 bg-muted/30 rounded text-xs font-mono">
                        <p className="mb-2">Equation: Lmax = √(((SegmaC/1.5)² - 4*tau²)*10¹² / ((7.85-1.5)²*10⁸)) - ((L0c*qc + Lhw*qhw) / qp)</p>
                        <p className="mb-2">Variables:</p>
                        <ul className="list-disc pl-5 space-y-1 mb-2">
                          <li>SegmaC = {calc.nearestMpi || 'N/A'} MPa</li>
                          <li>tau = {calc.tau?.toFixed(4) || 'N/A'}</li>
                          <li>L0c = {calc.L0c?.toFixed(5) || 'N/A'}</li>
                          <li>qc = {calc.qc?.toFixed(2) || 'N/A'}</li>
                          <li>Lhw = {calc.Lhw?.toFixed(2) || 'N/A'}</li>
                          <li>qhw = {calc.qhw?.toFixed(2) || 'N/A'}</li>
                          <li>qp = {calc.qp?.toFixed(2) || 'N/A'}</li>
                        </ul>
                        
                        <div className="mt-3 border-t pt-3 space-y-2">
                          <p className="font-medium">Step 1: Calculate numerator</p>
                          <p className="text-xs">{calc.numerator_formula}</p>
                          <p className="text-xs">= {calc.numerator?.toExponential(4) || 'N/A'}</p>
                          
                          <p className="font-medium mt-2">Step 2: Calculate denominator</p>
                          <p className="text-xs">{calc.denominator_formula}</p>
                          <p className="text-xs">= {calc.denominator?.toExponential(4) || 'N/A'}</p>
                          
                          <p className="font-medium mt-2">Step 3: Calculate square root</p>
                          <p className="text-xs">{calc.sqrt_result_formula}</p>
                          <p className="text-xs">= {calc.sqrt_result?.toFixed(2) || 'N/A'}</p>
                          
                          <p className="font-medium mt-2">Step 4: Subtract the ratio</p>
                          <p className="text-xs">{calc.subtraction_formula}</p>
                        </div>
                        
                        <p className="font-bold mt-3 pt-3 border-t">Result (Lmax): {calc.Lmax.toFixed(2)} m</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
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
                
                <Button 
                  onClick={() => setShowDebugInfo(!showDebugInfo)} 
                  variant="outline" 
                  size="sm"
                  className={`flex items-center gap-1.5 ${showDebugInfo ? 'bg-red-100 text-red-600' : ''}`}
                >
                  <Bug className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{showDebugInfo ? 'Hide Debug' : 'Show Debug'}</span>
                </Button>
              </div>
              
              <div className="overflow-auto rounded-md border border-border/50 bg-background/80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/40">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Section</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Metal Grade</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Max Length (Lmax)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculations.map((calc, index) => {
                      // Convert Lmax to number to ensure toFixed works
                      const lmaxValue = typeof calc.Lmax === 'number' ? calc.Lmax : Number(calc.Lmax);
                      
                      return (
                        <tr key={index} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">{formatSection(calc.section)}</td>
                          <td className="px-4 py-3 font-medium text-primary">{calc.drillPipeMetalGrade}</td>
                          <td className="px-4 py-3">{!isNaN(lmaxValue) ? lmaxValue.toFixed(2) : '0.00'} m</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {renderDebugInfo()}
        </motion.div>
      )}
    </div>
  );
} 