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
      
      // Ensure At Head and Bit Size values are mapped by section name, not by index
      const sectionOrder = ["Production", "Intermediate", "Surface"];
      const atHeadValues = sectionOrder.map(sectionName => {
        const result = casingResults.find(r => r.section.toLowerCase().includes(sectionName.toLowerCase()));
        if (!result || !result.atBody) return 0;
        const match = result.atBody.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
      });
      const nearestBitSizes = sectionOrder.map(sectionName => {
        const result = casingResults.find(r => r.section.toLowerCase().includes(sectionName.toLowerCase()));
        if (!result || !result.nearestBitSize) return 0;
        const match = result.nearestBitSize.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
      });
      
      console.log("Extracted values (At Head = DCSG'):", { initialDcsg, atHeadValues, nearestBitSizes });
      
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
    
    return (
      <div className="space-y-6 mt-8 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-lg font-medium text-amber-700 dark:text-amber-400">Debug Information</h3>
          </div>
          <Button 
            onClick={() => setShowDebugInfo(false)} 
            variant="outline" 
            size="sm"
            className="text-amber-600 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
          >
            <Minimize className="h-3.5 w-3.5" />
            <span className="ml-1.5">Hide Debug</span>
          </Button>
        </div>
        
        <ScrollArea className="h-[500px] w-full rounded-md border border-amber-200 dark:border-amber-800/50">
          {debugData.map((data, index) => (
            <div key={index} className="p-4 border-b border-amber-200 dark:border-amber-800/50">
              <h4 className="text-md font-medium mb-2 text-amber-700 dark:text-amber-400">
                Instance {data.instance} Calculations
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-white/80 dark:bg-background/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Core Values</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">T:</div>
                      <div>{data.T.toFixed(4)} (N)</div>
                      
                      <div className="font-medium">Tc:</div>
                      <div>{data.Tc.toFixed(4)} (N)</div>
                      
                      <div className="font-medium">Tec:</div>
                      <div>{data.Tec.toFixed(4)}</div>
                      
                      <div className="font-medium">tau:</div>
                      <div>{data.tau.toFixed(4)}</div>
                      
                      <div className="font-medium">eq:</div>
                      <div>{data.eq.toFixed(4)}</div>
                      
                      <div className="font-medium">C_new:</div>
                      <div>{data.C_new.toFixed(4)}</div>
                      
                      <div className="font-medium">SegmaC:</div>
                      <div>{data.SegmaC.toFixed(2)} (MPa)</div>
                      
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
                      <div className="font-medium">Np:</div>
                      <div>{data.Np?.toFixed(4) || 'N/A'}</div>
                      
                      <div className="font-medium">NB:</div>
                      <div>{data.NB?.toFixed(4) || 'N/A'}</div>
                      
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
                        <div className="font-medium">Numerator:</div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                          {data.numerator_formula || `${data.numerator?.toFixed(4)}`}
                        </div>
                        
                        <div className="font-medium">Denominator:</div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                          {data.denominator_formula || `${data.denominator?.toFixed(4)}`}
                        </div>
                        
                        <div className="font-medium">Square Root Result:</div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                          {data.sqrt_result_formula || `${data.sqrt_result?.toFixed(4)}`}
                        </div>
                        
                        <div className="font-medium">Lmax Subtraction Formula:</div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                          {data.subtraction_formula || `Lmax = ${data.Lmax.toFixed(4)}`}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <Card className="bg-white/80 dark:bg-background/80 md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Formulas Used</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-1 gap-2">
                      <div className="font-medium">T Formula:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        {data.formulas.T || 'Not available'}
                      </div>
                      
                      <div className="font-medium">Tc Formula:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        {data.formulas.Tc || 'Not available'}
                      </div>
                      
                      <div className="font-medium">Tec Formula:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        {data.formulas.Tec || 'Not available'}
                      </div>
                      
                      <div className="font-medium">Np Formula:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        {data.formulas.Np || 'Not available'}
                      </div>
                      
                      <div className="font-medium">NB Formula:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        {data.formulas.NB || 'Not available'}
                      </div>
                      
                      <div className="font-medium">tau Formula:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        {data.formulas.tau || 'Not available'}
                      </div>
                      
                      <div className="font-medium">eq Formula:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        {data.formulas.eq || 'Not available'}
                      </div>
                      
                      <div className="font-medium">C_new Formula:</div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs font-mono">
                        {data.formulas.C_new || 'Not available'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {data.availableGrades && data.availableGrades.length > 0 && (
                  <Card className="bg-white/80 dark:bg-background/80 md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Metal Grade Selection</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <div className="font-medium">Available Grades:</div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                          {data.availableGrades.map((grade, i) => (
                            <span key={i} className="inline-block mr-2 mb-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/50 rounded text-xs">
                              {grade}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-medium">Available Strengths (MPa):</div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                          {data.availableStrengths.map((strength, i) => (
                            <span key={i} className="inline-block mr-2 mb-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/50 rounded text-xs">
                              {strength}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-medium">Selected MPI:</div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                          {data.nearestMpi || 'Not available'}
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
                  className={cn(
                    "flex items-center gap-1.5",
                    showDebugInfo ? "text-amber-600 border-amber-300 dark:border-amber-700" : "text-muted-foreground"
                  )}
                >
                  <Bug className="h-3.5 w-3.5" />
                  <span>{showDebugInfo ? "Hide Debug" : "Show Debug"}</span>
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