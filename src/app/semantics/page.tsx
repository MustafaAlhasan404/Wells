"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { NavBar } from "@/components/nav-bar"
import { Calculator, Eye, EyeOff, ArrowRight, RefreshCcw, AlertCircle, X, CheckCircle, Save, Info, AlertTriangle, Loader2, Maximize, Minimize } from "lucide-react"
import { toast } from "sonner"
import { useFileUpload } from "@/context/FileUploadContext"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { showToast } from "@/utils/toast-utils"
import { Switch } from "@/components/ui/switch"
import { Copy } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select"
import { GanttChart, Trash2, Check, FileText, LayoutGrid, Table as TableIcon } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Slider } from "@/components/ui/slider"
// import { useToast } from "@/components/ui/use-toast"
import { calculateDim, HADResults } from "@/utils/casingCalculations";

interface VcfResult {
  instance: number;
  db: number;  // Db (mm)
  de: number;  // de (mm)
  di: number;  // di (mm)
  h: number;   // h
  vcf: number; // Vcf
}

interface GcResult {
  instance: number;
  vcf: number;        // Vcf
  gc: number;         // Gc
  nc: number | null;  // Number of cement sacks
  vw: number | null;  // Water volume
  vfd: number | null; // Volume of fluid displacement
  pymax: number | null; // Maximum pressure at yield point (MPa)
  pc: number | null;    // Confining pressure (MPa)
  pfr: number;          // Friction pressure (MPa)
  ppmax: number | null; // Maximum pump pressure (MPa/10)
  n: number | null;     // Number of pumps
  tfc: number | null;   // Cement filling time
  tfd: number | null;   // Displacement time
  tc: number | null;    // Total pumping time
  td: number | null;    // Additional time
  tp: number;           // Constant time (60)
  tad: number;          // Additional time (75% of tp)
}

// Define type for pump data
interface PumpData {
  type: string;
  speed: number;
  pressures: {
    "3.5": number | null;
    "4": number | null;
    "4.5": number | null;
  };
  flows: {
    "3.5": number | null;
    "4": number | null;
    "4.5": number | null;
  };
}

// Define type for pump results
interface PumpResult {
  type: string;
  diameter: number;
  pressure: number;
  flow: number;
  speed: number | null;
  price: number;
  isRecommended: boolean;
  instance: number;
  ppmax: number;
  // Time factor fields
  tfc: number | null;
  tfd: number | null;
  tc: number | null;
  tad: number;
  isTimeAllowed: boolean | null;
  // New fields
  isAlternative?: boolean;
}

// Define the hardcoded pump data based on the provided table
const PUMP_DATA: PumpData[] = [
  // AC-300
  { 
    type: "AC-300", 
    speed: 1, 
    pressures: { "3.5": null, "4": 30, "4.5": null }, 
    flows: { "3.5": null, "4": 100, "4.5": null } 
  },
  { 
    type: "AC-300", 
    speed: 2, 
    pressures: { "3.5": null, "4": 22, "4.5": null }, 
    flows: { "3.5": null, "4": 250, "4.5": null } 
  },
  { 
    type: "AC-300", 
    speed: 3, 
    pressures: { "3.5": null, "4": 10, "4.5": null }, 
    flows: { "3.5": null, "4": 450, "4.5": null } 
  },
  { 
    type: "AC-300", 
    speed: 4, 
    pressures: { "3.5": null, "4": 6, "4.5": null }, 
    flows: { "3.5": null, "4": 635, "4.5": null } 
  },
  
  // AC-400.B
  { 
    type: "AC-400.B", 
    speed: 1, 
    pressures: { "3.5": 40, "4": 32, "4.5": 24 }, 
    flows: { "3.5": 243, "4": 300, "4.5": 397 } 
  },
  { 
    type: "AC-400.B", 
    speed: 2, 
    pressures: { "3.5": 21.5, "4": 17.5, "4.5": 13 }, 
    flows: { "3.5": 444, "4": 549, "4.5": 724 } 
  },
  { 
    type: "AC-400.B", 
    speed: 3, 
    pressures: { "3.5": 13, "4": 10.8, "4.5": 8.2 }, 
    flows: { "3.5": 717, "4": 885, "4.5": 1171 } 
  },
  
  // AC-500
  { 
    type: "AC-500", 
    speed: 1, 
    pressures: { "3.5": 50, "4": 35.5, "4.5": 27 }, 
    flows: { "3.5": 250, "4": 308, "4.5": 409 } 
  },
  { 
    type: "AC-500", 
    speed: 2, 
    pressures: { "3.5": 24, "4": 19.5, "4.5": 14.8 }, 
    flows: { "3.5": 459, "4": 569, "4.5": 750 } 
  },
  { 
    type: "AC-500", 
    speed: 3, 
    pressures: { "3.5": 15.5, "4": 12.5, "4.5": 9.5 }, 
    flows: { "3.5": 717, "4": 885, "4.5": 1171 } 
  },
  
  // ACF-700
  { 
    type: "ACF-700", 
    speed: 1, 
    pressures: { "3.5": null, "4": 70, "4.5": 55 }, 
    flows: { "3.5": null, "4": 158, "4.5": 208 } 
  },
  { 
    type: "ACF-700", 
    speed: 2, 
    pressures: { "3.5": null, "4": 52, "4.5": 40 }, 
    flows: { "3.5": null, "4": 217, "4.5": 287 } 
  },
  { 
    type: "ACF-700", 
    speed: 3, 
    pressures: { "3.5": null, "4": 40, "4.5": 30 }, 
    flows: { "3.5": null, "4": 284, "4.5": 275 } 
  },
  { 
    type: "ACF-700", 
    speed: 4, 
    pressures: { "3.5": null, "4": 30, "4.5": 24 }, 
    flows: { "3.5": null, "4": 391, "4.5": 518 } 
  },
  { 
    type: "ACF-700", 
    speed: 5, 
    pressures: { "3.5": null, "4": 27, "4.5": 20 }, 
    flows: { "3.5": null, "4": 416, "4.5": 550 } 
  },
  { 
    type: "ACF-700", 
    speed: 6, 
    pressures: { "3.5": null, "4": 21, "4.5": 15 }, 
    flows: { "3.5": null, "4": 544, "4.5": 720 } 
  },
  { 
    type: "ACF-700", 
    speed: 7, 
    pressures: { "3.5": null, "4": 15, "4.5": 11 }, 
    flows: { "3.5": null, "4": 749, "4.5": 990 } 
  },
  { 
    type: "ACF-700", 
    speed: 8, 
    pressures: { "3.5": null, "4": 12, "4.5": 9 }, 
    flows: { "3.5": null, "4": 981, "4.5": 1297 } 
  },
  
  // T-10
  { 
    type: "T-10", 
    speed: 1, 
    pressures: { "3.5": null, "4": null, "4.5": 63 }, 
    flows: { "3.5": null, "4": null, "4.5": 175 } 
  },
  { 
    type: "T-10", 
    speed: 2, 
    pressures: { "3.5": null, "4": null, "4.5": 53 }, 
    flows: { "3.5": null, "4": null, "4.5": 225 } 
  },
  { 
    type: "T-10", 
    speed: 3, 
    pressures: { "3.5": null, "4": null, "4.5": 39.2 }, 
    flows: { "3.5": null, "4": null, "4.5": 303 } 
  },
  { 
    type: "T-10", 
    speed: 4, 
    pressures: { "3.5": null, "4": null, "4.5": 28 }, 
    flows: { "3.5": null, "4": null, "4.5": 428 } 
  },
  { 
    type: "T-10", 
    speed: 5, 
    pressures: { "3.5": null, "4": null, "4.5": 20.3 }, 
    flows: { "3.5": null, "4": null, "4.5": 588 } 
  },
  { 
    type: "T-10", 
    speed: 6, 
    pressures: { "3.5": null, "4": null, "4.5": 15.4 }, 
    flows: { "3.5": null, "4": null, "4.5": 781 } 
  },
  { 
    type: "T-10", 
    speed: 7, 
    pressures: { "3.5": null, "4": null, "4.5": 11 }, 
    flows: { "3.5": null, "4": null, "4.5": 1125 } 
  },
  { 
    type: "T-10", 
    speed: 8, 
    pressures: { "3.5": null, "4": null, "4.5": 7.7 }, 
    flows: { "3.5": null, "4": null, "4.5": 1520 } 
  },
];

interface DataInputValues {
  K1?: string;
  K2?: string;
  K3?: string;
  [key: string]: string | undefined;
}

export default function SemanticsPage() {
  // Input parameters
  const [hcValue, setHcValue] = useState<string>("");  // Hc state variable
  const [gammaC, setGammaC] = useState<string>("");    // gammaC state variable
  const [gammaW, setGammaW] = useState<string>("1");   // gammaW state variable with default of 1
  const [gammaFC, setGammaFC] = useState<string>("");  // gammaFC state variable
  const [gammaF, setGammaF] = useState<string>("");    // gammaF state variable
  const [k1Value, setK1Value] = useState<string>("");  // K1 state variable
  const [k2Value, setK2Value] = useState<string>("");  // K2 state variable
  const [k3Value, setK3Value] = useState<string>("");  // K3 state variable
  const [tfcValue, setTfcValue] = useState<string>(""); // tfc value (for compatibility only)
  const [tfdValue, setTfdValue] = useState<string>(""); // tfd value (for compatibility only)
  const [tdValue, setTdValue] = useState<string>("");   // td value
  const [hValue, setHValue] = useState<string>("");     // h value for Vcf calculation
  const [mValue, setMValue] = useState<string>("");     // m value for Gc calculation
  
  // Track which fields are using single input mode
  const [singleInputFields, setSingleInputFields] = useState<Record<string, boolean>>({});
  
  // Multiple value state for different instances
  const [instanceValues, setInstanceValues] = useState<Record<string, Record<number, string>>>({});
  
  // Use a flag to prevent saving immediately after loading
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  
  // Pump selection state
  const [selectedDiameter, setSelectedDiameter] = useState<number>(3.5);
  const [isPumpSelectionLoading, setIsPumpSelectionLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Data Input values - keep for backward compatibility but don't use for K1, K2, K3
  const [dataInputValues, setDataInputValues] = useState<DataInputValues>({});
  
  // Results
  const [vcfResults, setVcfResults] = useState<VcfResult[]>([]);
  const [gcResults, setGcResults] = useState<GcResult[]>([]);
  
  // Equation and results displays
  const [equationHTML, setEquationHTML] = useState<string>("");
  const [resultsHTML, setResultsHTML] = useState<string>("");
  
  // UI States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [equationsMinimized, setEquationsMinimized] = useState<boolean>(true);
  const [pumpDataTableMinimized, setPumpDataTableMinimized] = useState<boolean>(true);
  
  // Access results from other pages
  const { 
    drillCollarResults,
    casingResults,
    pumpFile,
    pumpFileName,
    pumpResults,
    setPumpFile,
    setPumpFileName,
    setPumpResults,
    hadData // <-- add hadData from context
  } = useFileUpload();

  // Add to state declarations near the top of the component
  const [instanceDiameters, setInstanceDiameters] = useState<Record<number, number>>({
    1: 4,   // Default to 4" for all instances
    2: 4,
    3: 4
  });

  // Added state for toggling between single or instance-specific diameters
  const [useSingleDiameter, setUseSingleDiameter] = useState<boolean>(true);

  // ... add new function to update instance diameter
  const updateInstanceDiameter = (instance: number, diameter: number) => {
    setInstanceDiameters(prev => ({
      ...prev,
      [instance]: diameter
    }));
  };

  // Toggle minimized state for equations card
  const toggleEquationsMinimized = () => {
    const newState = !equationsMinimized;
    setEquationsMinimized(newState);
  };

  // Toggle minimized state for pump data table
  const togglePumpDataTableMinimized = () => {
    const newState = !pumpDataTableMinimized;
    setPumpDataTableMinimized(newState);
  };

  // Save input data to localStorage
  const saveInputData = () => {
    if (!initialLoadComplete) {
      console.log("Skipping save during initial load");
      return;
    }
    
    const data = {
      hc: hcValue,
      gammaC: gammaC,
      gammaW: gammaW,
      gammaFC: gammaFC,
      gammaF: gammaF,
      k1: k1Value,
      k2: k2Value,
      k3: k3Value,
      td: tdValue,
      h: hValue,
      instanceValues: instanceValues,
      singleInputFields: singleInputFields
    };
    
    const dataStr = JSON.stringify(data);
    console.log("Saving input data:", data);
    localStorage.setItem('wellsAnalyzerSemanticData', dataStr);
  };

  // Manual save function with feedback for save button
  const saveData = async () => {
    setIsLoading(true);
    try {
      // Save input data
      saveInputData();
      
      // Save results if available
      saveResultsToLocalStorage();
      
      // Log localStorage state after saving
      console.log("All localStorage data after saving:");
      console.log("wellsAnalyzerSemanticData:", localStorage.getItem('wellsAnalyzerSemanticData'));
      console.log("wellsAnalyzerSemanticInputPrefs:", localStorage.getItem('wellsAnalyzerSemanticInputPrefs'));
      console.log("wellsAnalyzerVcfResults:", localStorage.getItem('wellsAnalyzerVcfResults'));
      console.log("wellsAnalyzerGcResults:", localStorage.getItem('wellsAnalyzerGcResults'));
      
      showToast('success', "Data saved successfully", {
        description: "Your semantics data has been saved to your browser.",
        icon: <CheckCircle className="h-4 w-4 text-green-500" />
      });
    } catch (error) {
      console.error('Failed to save data:', error);
      // showToast('error', "Failed to save data", {
      //   description: "There was an error saving your data. Please try again.",
      //   icon: <AlertCircle className="h-4 w-4 text-destructive" />
      // });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load input data from localStorage
  const loadInputData = () => {
    try {
      const dataStr = localStorage.getItem('wellsAnalyzerSemanticData');
      if (!dataStr) {
        console.log("No saved data found in localStorage");
        return;
      }
      
      console.log("Loading input data from localStorage");
      const data = JSON.parse(dataStr);
      
      // Load form values
      if (data.hc) setHcValue(data.hc);
      if (data.gammaC) setGammaC(data.gammaC);
      if (data.gammaW) setGammaW(data.gammaW);
      if (data.gammaFC) setGammaFC(data.gammaFC);
      if (data.gammaF) setGammaF(data.gammaF);
      if (data.k1) setK1Value(data.k1);
      if (data.k2) setK2Value(data.k2);
      if (data.k3) setK3Value(data.k3);
      // Skip tfc and tfd - no longer used
      if (data.td) setTdValue(data.td);
      if (data.h) setHValue(data.h);
      
      // Load instance values
      if (data.instanceValues) {
        setInstanceValues(data.instanceValues);
      }
      
      // Load single input preferences
      if (data.singleInputFields) {
        setSingleInputFields(data.singleInputFields);
      }
      
      console.log("Data loaded from localStorage:", data);
      return true;
    } catch (error) {
      console.error('Failed to load data:', error);
      return false;
    }
  };

  // Load inputs from legacy storage for backward compatibility
  const loadInputsFromLegacyStorage = () => {
    try {
      // Check if we have legacy data
      const legacyData = localStorage.getItem('wellsAnalyzerData');
      if (legacyData) {
        const data = JSON.parse(legacyData);
        
        // Only set K values from legacy data if we don't already have semantics data
        const semanticsData = localStorage.getItem('wellsAnalyzerSemanticData');
        if (!semanticsData) {
          // Only set K values if they're not already set
          if (data.K1 && !k1Value) setK1Value(data.K1);
          if (data.K2 && !k2Value) setK2Value(data.K2);
          if (data.K3 && !k3Value) setK3Value(data.K3);
        }
        
        // Copy legacy data to dataInputValues state for reference
        setDataInputValues(data);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load legacy data:', error);
      return false;
    }
  };

  // Save inputs to localStorage
  const saveInputsToLocalStorage = () => {
    saveInputData();
  };

  // Save calculation results to localStorage
  const saveResultsToLocalStorage = () => {
    try {
      // Save Vcf results
      if (vcfResults.length > 0) {
        localStorage.setItem('wellsAnalyzerVcfResults', JSON.stringify(vcfResults));
      }
      
      // Save Gc results
      if (gcResults.length > 0) {
        localStorage.setItem('wellsAnalyzerGcResults', JSON.stringify(gcResults));
      }
      
      // Save equation and results HTML
      if (equationHTML) {
        localStorage.setItem('wellsAnalyzerEquationHTML', equationHTML);
      }
      
      if (resultsHTML) {
        localStorage.setItem('wellsAnalyzerResultsHTML', resultsHTML);
      }
    } catch (error) {
      console.error('Failed to save results:', error);
    }
  };

  // Function to clear all saved data
  const clearSavedData = () => {
    try {
      // Clear input data
      localStorage.removeItem('wellsAnalyzerSemanticData');
      localStorage.removeItem('wellsAnalyzerSemanticInputPrefs');
      
      // Clear results
      localStorage.removeItem('wellsAnalyzerVcfResults');
      localStorage.removeItem('wellsAnalyzerGcResults');
      localStorage.removeItem('wellsAnalyzerEquationHTML');
      localStorage.removeItem('wellsAnalyzerResultsHTML');
      
      // Reset state
      setHcValue("");
      setGammaC("");
      setGammaW("1");
      setGammaFC("");
      setGammaF("");
      setK1Value("");
      setK2Value("");
      setK3Value("");
      setTfcValue("");
      setTfdValue("");
      setTdValue("");
      setHValue("");
      setInstanceValues({});
      setSingleInputFields({});
      setVcfResults([]);
      setGcResults([]);
      setEquationHTML("");
      setResultsHTML("");
      
      showToast('success', "All data cleared successfully");
    } catch (error) {
      console.error('Failed to clear data:', error);
      // showToast('error', "Failed to clear data");
    }
  };

  // Function to save all input state to localStorage
  const saveAllInputState = useCallback(() => {
    saveInputData();
  }, [
    hcValue, gammaC, gammaW, gammaFC, gammaF,
    k1Value, k2Value, k3Value,
    tdValue,
    hValue, instanceValues, singleInputFields
  ]);

  // Update a field with single or multiple values
  const updateField = (field: string, value: string, instance?: number) => {
    // If this is a single input field or no instance specified, update the main state
    if (singleInputFields[field] || !instance) {
      switch(field) {
        case 'hc': updateHcValue(value); break;
        case 'gammaC': updateGammaC(value); break;
        case 'gammaFC': updateGammaFC(value); break;
        case 'gammaF': updateGammaF(value); break;
        case 'k1': updateK1Value(value); break;
        case 'k2': updateK2Value(value); break;
        case 'k3': updateK3Value(value); break;
        case 'tfc': updateTfcValue(value); break;
        case 'tfd': updateTfdValue(value); break;
        case 'td': updateTdValue(value); break;
        case 'h': updateHValue(value); break;
      }
      
      // If in single input mode, update all instances
      if (singleInputFields[field]) {
        updateInstanceValue(field, 1, value);
        updateInstanceValue(field, 2, value);
        updateInstanceValue(field, 3, value);
      } else if (instance) {
        updateInstanceValue(field, instance, value);
      }
    } else if (instance) {
      // Just update the specific instance
      updateInstanceValue(field, instance, value);
    }
  };

  // Clear Vcf results
  const clearVcfResults = () => {
    setVcfResults([]);
  };

  // Update setVcfResults
  const updateVcfResults = (results: VcfResult[]) => {
    setVcfResults(results);
    // Save after updating
    setTimeout(() => saveResultsToLocalStorage(), 0);
  };

  // Update setGcResults
  const updateGcResults = (results: GcResult[]) => {
    setGcResults(results);
    // Save after updating
    setTimeout(() => saveResultsToLocalStorage(), 0);
  };

  // Update setEquationHTML
  const updateEquationHTML = (html: string) => {
    setEquationHTML(html);
    // Save after updating
    setTimeout(() => saveResultsToLocalStorage(), 0);
  };

  // Update setResultsHTML
  const updateResultsHTML = (html: string) => {
    setResultsHTML(html);
    // Save after updating
    setTimeout(() => saveResultsToLocalStorage(), 0);
  };

  // Calculate Vcf values
  const calculateVcf = () => {
    try {
      // Check if we have Hc value either in the main field or in any of the instances
      const hasHcValue = hcValue || 
        (instanceValues['hc'] && (
          instanceValues['hc'][1] || 
          instanceValues['hc'][2] || 
          instanceValues['hc'][3]
        ));
      
      if (!hasHcValue) {
        showToast('error', "Please enter a value for Hc");
        return;
      }
      
      // Need casing data to proceed
      if (!casingResults || casingResults.length === 0) {
        showToast('error', "Casing data not available. Please calculate casing data first.");
        return;
      }
      
      // Check if we have K1 value either in the main field or in any of the instances
      const hasK1Value = k1Value || 
        (instanceValues['k1'] && (
          instanceValues['k1'][1] || 
          instanceValues['k1'][2] || 
          instanceValues['k1'][3]
        ));
      
      if (!hasK1Value) {
        // showToast('error', "K1 value not found. Please enter it above.");
        return;
      }
      
      // Get Hc value - use main value or first available instance value
      let Hc = 0;
      if (hcValue && !isNaN(parseFloat(hcValue))) {
        Hc = parseFloat(hcValue);
      } else if (instanceValues['hc']) {
        // Find the first available instance value
        for (let i = 1; i <= 3; i++) {
          if (instanceValues['hc'][i] && !isNaN(parseFloat(instanceValues['hc'][i]))) {
            Hc = parseFloat(instanceValues['hc'][i]);
            break;
          }
        }
      }
      
      // Get K1 value - use main value or first available instance value
      let K1 = 0;
      if (k1Value && !isNaN(parseFloat(k1Value))) {
        K1 = parseFloat(k1Value);
      } else if (instanceValues['k1']) {
        // Find the first available instance value
        for (let i = 1; i <= 3; i++) {
          if (instanceValues['k1'][i] && !isNaN(parseFloat(instanceValues['k1'][i]))) {
            K1 = parseFloat(instanceValues['k1'][i]);
            break;
          }
        }
      }
      
      // Ensure we have valid values for Hc and K1
      if (Hc === 0 || K1 === 0) {
        // showToast('error', "Invalid or missing values for Hc or K1");
        return;
      }
      
      // Create results array
      const results: VcfResult[] = [];
      
      // Generate HTML for equations
      let equations = `<div class="space-y-4">
                        <h3 class="text-xl font-bold text-primary">Vcf Equations</h3>
                        <div class="bg-muted/30 p-4 rounded-md border border-border/40">
                          <h4 class="font-medium mb-2">General Formula:</h4>
                          <p class="font-mono text-sm bg-background/80 p-2 rounded">Vcf = [(K1 × Db² - de²) × Hc + di² × h]</p>
                          <p class="text-sm mt-2">Where:</p>
                          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mt-2">
                            <div class="bg-background/50 p-2 rounded border border-border/30">
                              <span class="font-mono">K1 = ${K1.toFixed(4)} (coefficient)</span>
                            </div>
                            <div class="bg-background/50 p-2 rounded border border-border/30">
                              <span class="font-mono">Hc = ${Hc.toFixed(4)} m</span>
                            </div>
                            <div class="bg-background/50 p-2 rounded border border-border/30">
                              <span class="font-mono">Db = Bit diameter (m)</span>
                            </div>
                            <div class="bg-background/50 p-2 rounded border border-border/30">
                              <span class="font-mono">de = Casing outer diameter (m)</span>
                            </div>
                            <div class="bg-background/50 p-2 rounded border border-border/30">
                              <span class="font-mono">di = Casing inner diameter (m)</span>
                            </div>
                            <div class="bg-background/50 p-2 rounded border border-border/30">
                              <span class="font-mono">h = Height parameter</span>
                            </div>
                          </div>
                        </div>
                      </div>`;
      
      // Calculate Vcf for each instance
      for (let i = 0; i < casingResults.length; i++) {
        const result = casingResults[i];
        const instanceNumber = i + 1;
        
        // Get values from the casing table
        const Db = parseFloat(result.nearestBitSize || '0') / 1000; // Nearest bit size in m
        const de = parseFloat(result.dcsg || '0') / 1000; // dcsg in m
        // const di = parseFloat(result.internalDiameter || '0') / 1000; // Internal diameter in m

        // --- Get Dim from HAD data ---
        let dimValue: number | null = null;
        if (hadData) {
          const sectionName = getHadSectionName(result.section);
          const sectionData = hadData[sectionName];
          if (sectionData) {
            const atHeadKeys = Object.keys(sectionData);
            if (atHeadKeys.length > 0) {
              const hadRows = sectionData[atHeadKeys[0]];
              const dimStr = calculateDim(hadRows);
              const dimNum = parseFloat(dimStr);
              if (!isNaN(dimNum)) {
                dimValue = dimNum / 1000; // Convert mm to m
              }
            }
          }
        }
        // Fallback to di if Dim is not available
        if (dimValue === null) {
          dimValue = parseFloat(result.internalDiameter || '0') / 1000;
        }
        
        // Add logging to debug
        console.log('Casing result:', result);
        console.log('Db:', Db, 'de:', de, 'di:', dimValue);
        
        // Get instance-specific Hc value if available and not in single input mode
        let instanceHc = Hc;
        if (!singleInputFields['hc'] && 
            instanceValues['hc'] && 
            instanceValues['hc'][instanceNumber] && 
            !isNaN(parseFloat(instanceValues['hc'][instanceNumber]))) {
          instanceHc = parseFloat(instanceValues['hc'][instanceNumber]);
        }
        
        // Get instance-specific K1 value if available and not in single input mode
        let instanceK1 = K1;
        if (!singleInputFields['k1'] && 
            instanceValues['k1'] && 
            instanceValues['k1'][instanceNumber] && 
            !isNaN(parseFloat(instanceValues['k1'][instanceNumber]))) {
          instanceK1 = parseFloat(instanceValues['k1'][instanceNumber]);
        }
        
        // Get h value from instance values if available
        let h = 1000 + (i * 500); // Default if not available
        
        const hKey = `H_${i + 1}`;
        
        // First try to get from the h input field
        if (hValue && !isNaN(parseFloat(hValue))) {
          h = parseFloat(hValue);
        }
        // Then try to get from instance values
        else if (instanceValues['h'] && instanceValues['h'][i+1]) {
          const instanceH = parseFloat(instanceValues['h'][i+1]);
          if (!isNaN(instanceH)) {
            h = instanceH;
          }
        } 
        // Then try data input values as fallback
        else if (dataInputValues[hKey]) {
          h = parseFloat(dataInputValues[hKey]);
        }
        
        // Calculate Vcf: [(k1Db^2-de^2).Hc+di^2.h]
        const vcf = ((instanceK1 * (Db**2) - de**2) * instanceHc) + (dimValue**2) * h;
        
        // Add to results
        results.push({
          instance: i + 1,
          db: Db * 1000,
          de: de * 1000,
          di: dimValue * 1000, // Store Dim as di for display
          h: h,
          vcf: vcf
        });
        
        // Step by step calculation for this instance
        const step1 = instanceK1 * (Db**2);
        const step2 = step1 - (de**2);
        const step3 = step2 * instanceHc;
        const step4 = dimValue**2;
        const step5 = step4 * h;
        const step6 = step3 + step5;
        
        // Add equation steps for this instance
        equations += `
          <div class="mt-6 border border-primary/20 rounded-md overflow-hidden">
            <div class="bg-primary/10 p-3 border-b border-primary/20">
              <h4 class="font-semibold">Instance ${i+1} Calculation</h4>
            </div>
            <div class="p-4 space-y-4 bg-muted/20">
              <div>
                <p class="font-medium mb-2">Input Values:</p>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">K1 = ${instanceK1.toFixed(4)}</span>
                  </div>
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">Db = ${Db.toFixed(4)} m (${(Db*1000).toFixed(2)} mm)</span>
                  </div>
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">de = ${de.toFixed(4)} m (${(de*1000).toFixed(2)} mm)</span>
                  </div>
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">Hc = ${instanceHc.toFixed(4)} m</span>
                  </div>
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">di = ${dimValue.toFixed(4)} m (${(dimValue*1000).toFixed(2)} mm)</span>
                  </div>
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">h = ${h.toFixed(4)}</span>
                  </div>
                </div>
              </div>
              
              <div class="border-t border-border/30 pt-4">
                <p class="font-medium">Vcf Calculation:</p>
                <div class="mt-2 bg-background/60 p-3 rounded">
                  <p class="font-mono text-sm">Vcf = [(k1Db^2-de^2).Hc+di^2.h]</p>
                  <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                    <li>K1 × Db² = ${instanceK1.toFixed(4)} × ${Db.toFixed(4)}² = ${step1.toFixed(6)}</li>
                    <li>K1 × Db² - de² = ${step1.toFixed(6)} - ${de.toFixed(4)}² = ${step2.toFixed(6)}</li>
                    <li>[(K1 × Db² - de²) × Hc = ${step2.toFixed(6)} × ${instanceHc.toFixed(4)} = ${step3.toFixed(6)}</li>
                    <li>di² = ${dimValue.toFixed(4)}² = ${step4.toFixed(6)}</li>
                    <li>di² × h = ${step4.toFixed(6)} × ${h.toFixed(4)} = ${step5.toFixed(6)}</li>
                    <li>[(K1 × Db² - de²) × Hc + di² × h] = ${step3.toFixed(6)} + ${step5.toFixed(6)} = ${step6.toFixed(6)}</li>
                  </ol>
                  <p class="font-mono text-sm mt-2 font-bold">Vcf = ${vcf.toFixed(6)}</p>
                </div>
              </div>
              
              <div class="mt-3 pt-3 border-t border-border/30">
                <p class="text-center font-medium">Final Result:</p>
                <div class="grid grid-cols-1 gap-2 mt-2">
                  <div class="bg-primary/10 p-2 rounded border border-primary/30 text-center">
                    <span class="font-mono text-sm">Vcf = ${vcf.toFixed(6)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>`;
      }
      
      // Using the updated methods to persist results
      updateVcfResults(results);
      updateEquationHTML(equations);
      
      // Set results HTML
      const resultsTable = `
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Instance</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Db (mm)</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">de (mm)</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">di (mm)</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">h</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Vcf</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => `
              <tr class="bg-transparent border-b border-gray-200 dark:border-gray-700">
                <td class="px-4 py-2 text-center">${r.instance}</td>
                <td class="px-4 py-2 text-center">${r.db.toFixed(2)}</td>
                <td class="px-4 py-2 text-center">${r.de.toFixed(2)}</td>
                <td class="px-4 py-2 text-center">${r.di.toFixed(2)}</td>
                <td class="px-4 py-2 text-center">${r.h.toFixed(2)}</td>
                <td class="px-4 py-2 text-center">${r.vcf.toFixed(4)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      updateResultsHTML(resultsTable);
      
      setIsLoading(false); // Clear loading state
      showToast('success', "Vcf calculation completed");
      
      return results;
    } catch (error) {
      setIsLoading(false); // Clear loading state on error
      console.error('Error calculating Vcf:', error);
      showToast('error', "Error calculating Vcf");
      return [];
    }
  };

  // Calculate Gc and Gc
  const calculateGcGc = () => {
    // Validate that we have Vcf results first
    if (!vcfResults || vcfResults.length === 0) {
      alert("Please calculate Vcf values first");
      return;
    }
    
    // Call the actual calculation function
    calculateGcGcInternal();
  };

  // Function to calculate Gc/G'c values
  const calculateGcGcInternal = () => {
    try {
      // Check if we have required values in main fields or instances
      const hasHcValue = hcValue || 
        (instanceValues['hc'] && (
          instanceValues['hc'][1] || 
          instanceValues['hc'][2] || 
          instanceValues['hc'][3]
        ));
      const hasGammaC = gammaC || 
        (instanceValues['gammaC'] && (
          instanceValues['gammaC'][1] || 
          instanceValues['gammaC'][2] || 
          instanceValues['gammaC'][3]
        ));
      const hasGammaW = gammaW || 
        (instanceValues['gammaW'] && (
          instanceValues['gammaW'][1] || 
          instanceValues['gammaW'][2] || 
          instanceValues['gammaW'][3]
        ));
      
      // Validate required inputs
      if (!hasHcValue || !hasGammaC || !hasGammaW || !vcfResults || vcfResults.length === 0) {
        // showToast('error', "Missing required inputs", {
        //   description: "Missing required inputs for Gc/G'c calculation",
        //   icon: <AlertCircle className="h-4 w-4 text-destructive" />
        // });
        return;
      }
      
      // Get Hc value - use main value or first available instance value
      let hc = 0;
      if (hcValue && !isNaN(parseFloat(hcValue))) {
        hc = parseFloat(hcValue);
      } else if (instanceValues['hc']) {
        // Find the first available instance value
        for (let i = 1; i <= 3; i++) {
          if (instanceValues['hc'][i] && !isNaN(parseFloat(instanceValues['hc'][i]))) {
            hc = parseFloat(instanceValues['hc'][i]);
            break;
          }
        }
      }
      
      // Get gammaC value - use main value or first available instance value
      let gc = 0;
      if (gammaC && !isNaN(parseFloat(gammaC))) {
        gc = parseFloat(gammaC);
      } else if (instanceValues['gammaC']) {
        // Find the first available instance value
        for (let i = 1; i <= 3; i++) {
          if (instanceValues['gammaC'][i] && !isNaN(parseFloat(instanceValues['gammaC'][i]))) {
            gc = parseFloat(instanceValues['gammaC'][i]);
            break;
          }
        }
      }
      
      // Get gammaW value - use main value or first available instance value
      let gw = 1; // Default to 1
      if (gammaW && !isNaN(parseFloat(gammaW))) {
        gw = parseFloat(gammaW);
      } else if (instanceValues['gammaW']) {
        // Find the first available instance value
        for (let i = 1; i <= 3; i++) {
          if (instanceValues['gammaW'][i] && !isNaN(parseFloat(instanceValues['gammaW'][i]))) {
            gw = parseFloat(instanceValues['gammaW'][i]);
            break;
          }
        }
      }
      
      // Get gammaFC value - use main value or first available instance value
      let gfc = 0;
      if (gammaFC && !isNaN(parseFloat(gammaFC))) {
        gfc = parseFloat(gammaFC);
      } else if (instanceValues['gammaFC']) {
        // Find the first available instance value
        for (let i = 1; i <= 3; i++) {
          if (instanceValues['gammaFC'][i] && !isNaN(parseFloat(instanceValues['gammaFC'][i]))) {
            gfc = parseFloat(instanceValues['gammaFC'][i]);
            break;
          }
        }
      }
      
      // Get gammaF value - use main value or first available instance value
      let gf = 0;
      if (gammaF && !isNaN(parseFloat(gammaF))) {
        gf = parseFloat(gammaF);
      } else if (instanceValues['gammaF']) {
        // Find the first available instance value
        for (let i = 1; i <= 3; i++) {
          if (instanceValues['gammaF'][i] && !isNaN(parseFloat(instanceValues['gammaF'][i]))) {
            gf = parseFloat(instanceValues['gammaF'][i]);
            break;
          }
        }
      }
      
      // Get m value for calculations
      let m = 0;
      if (mValue && !isNaN(parseFloat(mValue))) {
        m = parseFloat(mValue);
      } else if (instanceValues['m']) {
        // Find the first available instance value
        for (let i = 1; i <= 3; i++) {
          if (instanceValues['m'][i] && !isNaN(parseFloat(instanceValues['m'][i]))) {
            m = parseFloat(instanceValues['m'][i]);
            break;
          }
        }
      }
      
      // Ensure we have valid values for calculations
      if (hc === 0 || gc === 0) {
        // showToast('error', "Invalid values", {
        //   description: "Invalid or missing values for Hc or γc",
        //   icon: <AlertCircle className="h-4 w-4 text-destructive" />
        // });
        return;
      }
    
      // Create HTML for equations
      let gcEquations = `<div class="space-y-4 mt-6">
                        <h3 class="text-xl font-bold text-primary">Gc/G'c and Related Equations</h3>
                        <div class="bg-muted/30 p-4 rounded-md border border-border/40">
                          <h4 class="font-medium mb-2">General Formulas:</h4>
                          <div class="space-y-4">
                            <div>
                              <p class="font-medium">Gc (cement grade):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">Gc = (γc.γw)/(m.γc + γw)</p>
                            </div>
                            <div>
                              <p class="font-medium">G'c (modified cement grade):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">G'c = K2.gc.Vfc</p>
                            </div>
                            <div>
                              <p class="font-medium">nc (number of cement sacks):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">nc = (Vcf × Gc) / m</p>
                            </div>
                            <div>
                              <p class="font-medium">Vw (water volume):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">Vw = Vcf × γw</p>
                            </div>
                            <div>
                              <p class="font-medium">Vfd (volume of fluid displacement):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">Vfd = Vcf × (γfc / γf) × (1 - (γw / γc))</p>
                            </div>
                            <div>
                              <p class="font-medium">Pymax (maximum pressure at yield point):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">Pymax = nc × γf × 9.81</p>
                            </div>
                            <div>
                              <p class="font-medium">Pc (confining pressure):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">Pc = Pymax × 0.85</p>
                            </div>
                            <div>
                              <p class="font-medium">Ppmax (maximum pump pressure):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">Ppmax = Pc + Pfr</p>
                              <p class="text-sm mt-1">Where Pfr (friction pressure) = 5 MPa (constant)</p>
                            </div>
                            <div>
                              <p class="font-medium">Time Calculations:</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">tfc+tfd = ((Vcf+Vfd)*10^3)/Q</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">tc = tfc+tfd + td</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">tad = 0.75 * tp</p>
                              <p class="text-sm mt-1">Where Q is the pump flow rate, td is input value, tp = 60</p>
                            </div>
                          </div>
                        </div>
                      </div>`;

      // Calculate for each Vcf result
      const results: GcResult[] = vcfResults.map(vcfResult => {
        const vcfValue = vcfResult.vcf;
        const instanceNumber = vcfResult.instance;
        
        // Get instance-specific values if available
        let instanceHc = hc;
        let instanceGc = gc;
        let instanceGw = gw;
        let instanceGfc = gfc;
        let instanceGf = gf;
        let instanceM = m;
        
        // Check for instance-specific hc
        if (!singleInputFields['hc'] && 
            instanceValues['hc'] && 
            instanceValues['hc'][instanceNumber] && 
            !isNaN(parseFloat(instanceValues['hc'][instanceNumber]))) {
          instanceHc = parseFloat(instanceValues['hc'][instanceNumber]);
        }
        
        // Check for instance-specific gammaC
        if (!singleInputFields['gammaC'] && 
            instanceValues['gammaC'] && 
            instanceValues['gammaC'][instanceNumber] && 
            !isNaN(parseFloat(instanceValues['gammaC'][instanceNumber]))) {
          instanceGc = parseFloat(instanceValues['gammaC'][instanceNumber]);
        }
        
        // Check for instance-specific gammaW
        if (!singleInputFields['gammaW'] && 
            instanceValues['gammaW'] && 
            instanceValues['gammaW'][instanceNumber] && 
            !isNaN(parseFloat(instanceValues['gammaW'][instanceNumber]))) {
          instanceGw = parseFloat(instanceValues['gammaW'][instanceNumber]);
        }
        
        // Check for instance-specific gammaFC
        if (!singleInputFields['gammaFC'] && 
            instanceValues['gammaFC'] && 
            instanceValues['gammaFC'][instanceNumber] && 
            !isNaN(parseFloat(instanceValues['gammaFC'][instanceNumber]))) {
          instanceGfc = parseFloat(instanceValues['gammaFC'][instanceNumber]);
        }
        
        // Check for instance-specific gammaF
        if (!singleInputFields['gammaF'] && 
            instanceValues['gammaF'] && 
            instanceValues['gammaF'][instanceNumber] && 
            !isNaN(parseFloat(instanceValues['gammaF'][instanceNumber]))) {
          instanceGf = parseFloat(instanceValues['gammaF'][instanceNumber]);
        }
        
        // Check for instance-specific m value
        if (!singleInputFields['m'] && 
            instanceValues['m'] && 
            instanceValues['m'][instanceNumber] && 
            !isNaN(parseFloat(instanceValues['m'][instanceNumber]))) {
          instanceM = parseFloat(instanceValues['m'][instanceNumber]);
        }
        
        // Calculate Gc using instance-specific values - gc = (γc.γw)/(m.γc + γw)
        const gc_value = (instanceGc * instanceGw) / (instanceM * instanceGc + instanceGw);
        
        // Get K2 value for this instance
        let instanceK2 = 0;
        if (k2Value && !isNaN(parseFloat(k2Value))) {
          instanceK2 = parseFloat(k2Value);
        } else if (instanceValues['k2'] && 
                  instanceValues['k2'][instanceNumber] && 
                  !isNaN(parseFloat(instanceValues['k2'][instanceNumber]))) {
          instanceK2 = parseFloat(instanceValues['k2'][instanceNumber]);
        }
        
        // Calculate G'c using instance-specific values - G'c = K2.gc.Vfc
        const gc_prime = instanceK2 * gc_value * vcfValue;
        
        // Calculate nc in sacks - (Vcf * gc_value) / m
        const nc = instanceM > 0 ? (vcfValue * gc_value) / instanceM : null;
        
        // Get K3 value for this instance
        let instanceK3 = 0;
        if (k3Value && !isNaN(parseFloat(k3Value))) {
          instanceK3 = parseFloat(k3Value);
        } else if (instanceValues['k3'] && 
                  instanceValues['k3'][instanceNumber] && 
                  !isNaN(parseFloat(instanceValues['k3'][instanceNumber]))) {
          instanceK3 = parseFloat(instanceValues['k3'][instanceNumber]);
        }
        
        // Calculate m using the formula: m = (γw * (γc - γfc)) / (γc * (γfc - γw))
        let calculatedM = null;
        if (instanceGw > 0 && instanceGc > 0 && instanceGfc > 0 && 
            (instanceGfc - instanceGw) !== 0) {
          calculatedM = (instanceGw * (instanceGc - instanceGfc)) / (instanceGc * (instanceGfc - instanceGw));
        }
        
        // Calculate Vw (water volume) using the new formula with calculated m
        // Only calculate if we have a valid calculated m value
        const vw = (calculatedM !== null && instanceGw > 0) ? 
                  (instanceK3 * calculatedM * gc_value * vcfValue) / instanceGw : null;
        
        // Calculate Vfd (volume of fluid displacement)
        const vfd = (instanceGfc && instanceGf) ? 
                   vcfValue * (instanceGfc / instanceGf) * (1 - (instanceGw / instanceGc)) : null;
        
        // Calculate Pymax (maximum pressure at yield point) - using the new formula from the image
        // Pymax = 0.1[(Hc - h)(γfc - γf)]
        const pymax = (instanceGfc && instanceGf && vcfResult.h) ? 
                      0.1 * (instanceHc - vcfResult.h) * (instanceGfc - instanceGf) : null;
        
        // Calculate Pc (confining pressure)
        const pc = pymax ? pymax * 0.85 : null; // Typical value is 85% of Pymax
        
        // Pfr remains constant at 5 usually
        const pfr = 5;
        
        // Calculate Ppmax (maximum pump pressure) based on the image formula
        // Ppmax = (Pymax + Pc + Pfr) / 10
        const ppmax = (pymax && pc) ? (pymax + pc + pfr) / 10 : null;
        
        // Calculate n (number of pumps) using tc/tad + 1 formula
        // Get td value - from input
        let instanceTd = 0;
        if (tdValue && !isNaN(parseFloat(tdValue))) {
          instanceTd = parseFloat(tdValue);
        } else if (instanceValues['td'] && 
                  instanceValues['td'][instanceNumber] && 
                  !isNaN(parseFloat(instanceValues['td'][instanceNumber]))) {
          instanceTd = parseFloat(instanceValues['td'][instanceNumber]);
        }
        
        // Calculate total time variables
        const tp = 60; // Constant value of 60
        const tad = 0.75 * tp; // tad = 0.75 * tp
        
        // Get Q value from pumpResults if available
        let Q = 0;
        if (pumpResults && pumpResults.length > 0) {
          // Look for pump data for this instance
          const pumpForInstance = pumpResults.find(p => p.instance === instanceNumber && p.isRecommended);
          if (pumpForInstance && pumpForInstance.flow) {
            Q = pumpForInstance.flow;
          }
        }
        
        // Calculate tfc+tfd = ((Vcf+Vfd)*10^3)/Q
        let tfcPlusTfd = 0;
        if (Q > 0 && vfd !== null) {
          tfcPlusTfd = ((vcfValue + vfd) * 1000) / Q;
        }
        
        // Calculate tc = tfc+tfd + td
        const tc = tfcPlusTfd + instanceTd;
        
        // Split tfcPlusTfd into tfc and tfd (50/50 split as a default approach)
        const tfc = tfcPlusTfd / 2;
        const tfd = tfcPlusTfd / 2;
        
        // Calculate n (number of pumps) based on the formula: n = tc/tad + 1
        const n = tc > 0 && tad > 0 ? Math.ceil(tc / tad + 1) : null;
        
        // Add equation steps for this instance
        gcEquations += `
          <div class="mt-6 border border-primary/20 rounded-md overflow-hidden">
            <div class="bg-primary/10 p-3 border-b border-primary/20">
              <h4 class="font-semibold">Instance ${instanceNumber} Calculations</h4>
            </div>
            <div class="p-4 space-y-4 bg-muted/20">
              <div>
                <p class="font-medium mb-2">Input Values:</p>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">Hc = ${instanceHc.toFixed(4)} m</span>
                  </div>
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">γc = ${instanceGc.toFixed(4)}</span>
                  </div>
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">γw = ${instanceGw.toFixed(4)}</span>
                  </div>
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">Vcf = ${vcfValue.toFixed(4)}</span>
                  </div>
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">m = ${instanceM.toFixed(4)}</span>
                  </div>
                  ${instanceGfc ? `<div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">γfc = ${instanceGfc.toFixed(4)}</span>
                  </div>` : ''}
                  ${instanceGf ? `<div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">γf = ${instanceGf.toFixed(4)}</span>
                  </div>` : ''}
                </div>
              </div>
              
              <div class="space-y-6">
                <div class="border-t border-border/30 pt-4">
                  <p class="font-medium">Gc Calculation:</p>
                  <div class="mt-2 bg-background/60 p-3 rounded">
                    <p class="font-mono text-sm">Gc = (γc.γw)/(m.γc + γw)</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>γc.γw = ${instanceGc.toFixed(4)} × ${instanceGw.toFixed(4)} = ${(instanceGc * instanceGw).toFixed(4)}</li>
                      <li>m.γc = ${instanceM.toFixed(4)} × ${instanceGc.toFixed(4)} = ${(instanceM * instanceGc).toFixed(4)}</li>
                      <li>m.γc + γw = ${(instanceM * instanceGc).toFixed(4)} + ${instanceGw.toFixed(4)} = ${(instanceM * instanceGc + instanceGw).toFixed(4)}</li>
                      <li>(γc.γw)/(m.γc + γw) = ${(instanceGc * instanceGw).toFixed(4)} / ${(instanceM * instanceGc + instanceGw).toFixed(4)} = ${gc_value.toFixed(4)}</li>
                    </ol>
                    <p class="font-mono text-sm mt-2 font-bold">Gc = ${gc_value.toFixed(4)} tonf/m3</p>
                  </div>
                </div>
                
                <div class="border-t border-border/30 pt-4">
                  <p class="font-medium">G'c Calculation:</p>
                  <div class="mt-2 bg-background/60 p-3 rounded">
                    <p class="font-mono text-sm">G'c = K2.gc.Vfc</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>K2 = ${instanceK2.toFixed(4)}</li>
                      <li>K2.gc = ${instanceK2.toFixed(4)} × ${gc_value.toFixed(4)} = ${(instanceK2 * gc_value).toFixed(4)}</li>
                      <li>K2.gc.Vfc = ${(instanceK2 * gc_value).toFixed(4)} × ${vcfValue.toFixed(4)} = ${gc_prime.toFixed(4)}</li>
                    </ol>
                    <p class="font-mono text-sm mt-2 font-bold">G'c = ${gc_prime.toFixed(4)}</p>
                  </div>
                </div>
                
                <div class="border-t border-border/30 pt-4">
                  <p class="font-medium">nc (Cement Sacks) Calculation:</p>
                  <div class="mt-2 bg-background/60 p-3 rounded">
                    <p class="font-mono text-sm">nc = (Vcf × Gc) / m</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>Vcf × Gc = ${vcfValue.toFixed(4)} × ${gc_value.toFixed(4)} = ${(vcfValue * gc_value).toFixed(4)}</li>
                      <li>(Vcf × Gc) / m = ${(vcfValue * gc_value).toFixed(4)} / ${instanceM.toFixed(4)} = ${nc !== null ? nc.toFixed(4) : "N/A"}</li>
                    </ol>
                    <p class="font-mono text-sm mt-2 font-bold">nc = ${nc !== null ? nc.toFixed(4) : "N/A"} sacks</p>
                  </div>
                </div>
                
                <div class="border-t border-border/30 pt-4">
                  <p class="font-medium">Vw (Water Volume) Calculation:</p>
                  <div class="mt-2 bg-background/60 p-3 rounded">
                    <p class="font-mono text-sm">Vw = (K3 × m × Gc × Vfc) / γw</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>K3 = ${instanceK3.toFixed(4)}</li>
                      <li>Calculated m = (γw × (γc - γfc)) / (γc × (γfc - γw)) = ${calculatedM !== null ? calculatedM.toFixed(4) : "N/A"}</li>
                      <li>K3 × m = ${instanceK3.toFixed(4)} × ${calculatedM !== null ? calculatedM.toFixed(4) : "N/A"} = ${calculatedM !== null ? (instanceK3 * calculatedM).toFixed(4) : "N/A"}</li>
                      <li>(K3 × m) × Gc = ${calculatedM !== null ? (instanceK3 * calculatedM).toFixed(4) : "N/A"} × ${gc_value.toFixed(4)} = ${calculatedM !== null ? (instanceK3 * calculatedM * gc_value).toFixed(4) : "N/A"}</li>
                      <li>(K3 × m × Gc) × Vfc = ${calculatedM !== null ? (instanceK3 * calculatedM * gc_value).toFixed(4) : "N/A"} × ${vcfValue.toFixed(4)} = ${calculatedM !== null ? (instanceK3 * calculatedM * gc_value * vcfValue).toFixed(4) : "N/A"}</li>
                      <li>(K3 × m × Gc × Vfc) / γw = ${calculatedM !== null ? (instanceK3 * calculatedM * gc_value * vcfValue).toFixed(4) : "N/A"} / ${instanceGw.toFixed(4)} = ${vw !== null ? vw.toFixed(4) : "N/A"}</li>
                    </ol>
                    <p class="font-mono text-sm mt-2 font-bold">Vw = ${vw !== null ? vw.toFixed(4) : "N/A"}</p>
                  </div>
                </div>
                
                ${instanceGfc && instanceGf ? `
                <div class="border-t border-border/30 pt-4">
                  <p class="font-medium">Vfd (Fluid Displacement) Calculation:</p>
                  <div class="mt-2 bg-background/60 p-3 rounded">
                    <p class="font-mono text-sm">Vfd = Vcf × (γfc / γf) × (1 - (γw / γc))</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>γfc / γf = ${instanceGfc.toFixed(4)} / ${instanceGf.toFixed(4)} = ${(instanceGfc / instanceGf).toFixed(4)}</li>
                      <li>γw / γc = ${instanceGw.toFixed(4)} / ${instanceGc.toFixed(4)} = ${(instanceGw / instanceGc).toFixed(4)}</li>
                      <li>1 - (γw / γc) = 1 - ${(instanceGw / instanceGc).toFixed(4)} = ${(1 - (instanceGw / instanceGc)).toFixed(4)}</li>
                      <li>Vcf × (γfc / γf) × (1 - (γw / γc)) = ${vcfValue.toFixed(4)} × ${(instanceGfc / instanceGf).toFixed(4)} × ${(1 - (instanceGw / instanceGc)).toFixed(4)} = ${vfd !== null ? vfd.toFixed(4) : "N/A"}</li>
                    </ol>
                    <p class="font-mono text-sm mt-2 font-bold">Vfd = ${vfd !== null ? vfd.toFixed(4) : "N/A"}</p>
                  </div>
                </div>
                ` : ''}
                
                ${nc !== null && instanceGf ? `
                <div class="border-t border-border/30 pt-4">
                  <p class="font-medium">Pymax (Max Pressure at Yield) Calculation:</p>
                  <div class="mt-2 bg-background/60 p-3 rounded">
                    <p class="font-mono text-sm">Pymax = 0.1[(Hc - h)(γfc - γf)]</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>Hc - h = ${instanceHc.toFixed(4)} - ${vcfResult.h.toFixed(4)} = ${(instanceHc - vcfResult.h).toFixed(4)}</li>
                      <li>γfc - γf = ${instanceGfc.toFixed(4)} - ${instanceGf.toFixed(4)} = ${(instanceGfc - instanceGf).toFixed(4)}</li>
                      <li>0.1 × (Hc - h) × (γfc - γf) = 0.1 × ${(instanceHc - vcfResult.h).toFixed(4)} × ${(instanceGfc - instanceGf).toFixed(4)} = ${pymax !== null ? pymax.toFixed(4) : "N/A"}</li>
                    </ol>
                    <p class="font-mono text-sm mt-2 font-bold">Pymax = ${pymax !== null ? pymax.toFixed(4) : "N/A"} MPa</p>
                  </div>
                </div>
                
                <div class="border-t border-border/30 pt-4">
                  <p class="font-medium">Pc (Confining Pressure) Calculation:</p>
                  <div class="mt-2 bg-background/60 p-3 rounded">
                    <p class="font-mono text-sm">Pc = Pymax × 0.85</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>Pymax × 0.85 = ${pymax !== null ? pymax.toFixed(4) : "N/A"} × 0.85 = ${pc !== null ? pc.toFixed(4) : "N/A"}</li>
                    </ol>
                    <p class="font-mono text-sm mt-2 font-bold">Pc = ${pc !== null ? pc.toFixed(4) : "N/A"} MPa</p>
                  </div>
                </div>
                
                <div class="border-t border-border/30 pt-4">
                  <p class="font-medium">Ppmax (Maximum Pump Pressure) Calculation:</p>
                  <div class="mt-2 bg-background/60 p-3 rounded">
                    <p class="font-mono text-sm">Ppmax = (Pymax + Pc + Pfr) / 10</p>
                    <p class="font-mono text-sm mt-1">Where Pfr (friction pressure) = 5 MPa (constant)</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>Pymax + Pc + Pfr = ${pymax !== null ? pymax.toFixed(4) : "N/A"} + ${pc !== null ? pc.toFixed(4) : "N/A"} + ${pfr} = ${pymax !== null && pc !== null ? (pymax + pc + pfr).toFixed(4) : "N/A"}</li>
                      <li>(Pymax + Pc + Pfr) / 10 = ${pymax !== null && pc !== null ? (pymax + pc + pfr).toFixed(4) : "N/A"} / 10 = ${ppmax !== null ? ppmax.toFixed(4) : "N/A"}</li>
                    </ol>
                    <p class="font-mono text-sm mt-2 font-bold">Ppmax = ${ppmax !== null ? ppmax.toFixed(4) : "N/A"} MPa/10</p>
                  </div>
                </div>
                
                <div class="border-t border-border/30 pt-4">
                  <p class="font-medium">n (Number of Pumps) Calculation:</p>
                  <div class="mt-2 bg-background/60 p-3 rounded">
                    <p class="font-mono text-sm">n = tc/tad + 1</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>tc = ${tc > 0 ? tc.toFixed(2) : "N/A"}</li>
                      <li>tad = ${tad.toFixed(2)}</li>
                      <li>tc/tad = ${tc > 0 && tad > 0 ? (tc/tad).toFixed(4) : "N/A"}</li>
                      <li>tc/tad + 1 = ${tc > 0 && tad > 0 ? (tc/tad).toFixed(4) : "N/A"} + 1 = ${tc > 0 && tad > 0 ? (tc/tad + 1).toFixed(4) : "N/A"}</li>
                      <li>Ceiling(tc/tad + 1) = ${n !== null ? n : "N/A"}</li>
                    </ol>
                    <p class="font-mono text-sm mt-2 font-bold">n = ${n !== null ? n : "N/A"} pumps</p>
                  </div>
                </div>
                
                <div class="border-t border-border/30 pt-4">
                  <p class="font-medium">Time Calculations:</p>
                  <div class="mt-2 bg-background/60 p-3 rounded">
                    <p class="font-mono text-sm">tfc+tfd = ((Vcf+Vfd)*10^3)/Q</p>
                    <p class="font-mono text-sm">tc = tfc+tfd + td</p>
                    <p class="font-mono text-sm">tad = 0.75 * tp, where tp = 60</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>tp = 60 (constant)</li>
                      <li>tad = 0.75 * tp = 0.75 * 60 = ${tad.toFixed(2)}</li>
                      <li>Vcf + Vfd = ${vcfValue.toFixed(4)} + ${vfd !== null ? vfd.toFixed(4) : "N/A"} = ${vfd !== null ? (vcfValue + vfd).toFixed(4) : "N/A"}</li>
                      <li>(Vcf + Vfd) * 10^3 = ${vfd !== null ? (vcfValue + vfd).toFixed(4) : "N/A"} * 1000 = ${vfd !== null ? ((vcfValue + vfd) * 1000).toFixed(2) : "N/A"}</li>
                      <li>Q (flow rate from pump) = ${Q > 0 ? Q.toFixed(2) : "N/A"}</li>
                      <li>tfc+tfd = ((Vcf+Vfd)*10^3)/Q = ${vfd !== null && Q > 0 ? ((vcfValue + vfd) * 1000).toFixed(2) : "N/A"} / ${Q > 0 ? Q.toFixed(2) : "N/A"} = ${tfcPlusTfd > 0 ? tfcPlusTfd.toFixed(2) : "N/A"}</li>
                      <li>tfc = (tfc+tfd)/2 = ${tfcPlusTfd > 0 ? (tfcPlusTfd/2).toFixed(2) : "N/A"}</li>
                      <li>tfd = (tfc+tfd)/2 = ${tfcPlusTfd > 0 ? (tfcPlusTfd/2).toFixed(2) : "N/A"}</li>
                      <li>td (additional time) = ${instanceTd.toFixed(2)}</li>
                      <li>tc = tfc+tfd + td = ${tfcPlusTfd > 0 ? tfcPlusTfd.toFixed(2) : "N/A"} + ${instanceTd.toFixed(2)} = ${tc > 0 ? tc.toFixed(2) : "N/A"}</li>
                    </ol>
                    <div class="grid grid-cols-2 gap-2 mt-2">
                      <p class="font-mono text-sm font-bold">tfc = ${tfc > 0 ? tfc.toFixed(2) : "N/A"}</p>
                      <p class="font-mono text-sm font-bold">tfd = ${tfd > 0 ? tfd.toFixed(2) : "N/A"}</p>
                      <p class="font-mono text-sm font-bold">tc = ${tc > 0 ? tc.toFixed(2) : "N/A"}</p>
                      <p class="font-mono text-sm font-bold">td = ${instanceTd.toFixed(2)}</p>
                      <p class="font-mono text-sm font-bold">tp = ${tp.toFixed(2)}</p>
                      <p class="font-mono text-sm font-bold">tad = ${tad.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                ` : ''}
              </div>
              
              <div class="mt-3 pt-3 border-t border-border/30">
                <p class="text-center font-medium">Final Results:</p>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                  <div class="bg-primary/10 p-2 rounded border border-primary/30">
                    <span class="font-mono text-sm">Gc = ${gc_value.toFixed(4)}</span>
                  </div>
                  <div class="bg-primary/10 p-2 rounded border border-primary/30">
                    <span class="font-mono text-sm">G'c = ${gc_prime.toFixed(4)}</span>
                  </div>
                  <div class="bg-primary/10 p-2 rounded border border-primary/30">
                    <span class="font-mono text-sm">nc = ${nc !== null ? nc.toFixed(4) : "N/A"}</span>
                  </div>
                  <div class="bg-primary/10 p-2 rounded border border-primary/30">
                    <span class="font-mono text-sm">Vw = ${vw !== null ? vw.toFixed(4) : "N/A"}</span>
                  </div>
                  ${vfd !== null ? `<div class="bg-primary/10 p-2 rounded border border-primary/30">
                    <span class="font-mono text-sm">Vfd = ${vfd.toFixed(4)}</span>
                  </div>` : ''}
                  ${pymax !== null ? `<div class="bg-primary/10 p-2 rounded border border-primary/30">
                    <span class="font-mono text-sm">Pymax = ${pymax.toFixed(4)}</span>
                  </div>` : ''}
                  ${pc !== null ? `<div class="bg-primary/10 p-2 rounded border border-primary/30">
                    <span class="font-mono text-sm">Pc = ${pc.toFixed(4)}</span>
                  </div>` : ''}
                  ${ppmax !== null ? `<div class="bg-primary/10 p-2 rounded border border-primary/30">
                    <span class="font-mono text-sm">Ppmax = ${ppmax.toFixed(4)}</span>
                  </div>` : ''}
                  ${n !== null ? `<div class="bg-primary/10 p-2 rounded border border-primary/30">
                    <span class="font-mono text-sm">n = ${n}</span>
                  </div>` : ''}
                </div>
              </div>
            </div>
          </div>`;
        
        // Create a proper GcResult object with all calculated properties
        return {
          instance: vcfResult.instance,
          vcf: vcfValue,
          gc: gc_value,
          nc: nc,
          vw: vw,
          vfd: vfd,
          pymax: pymax,
          pc: pc,
          pfr: pfr,
          ppmax: ppmax,
          n: n,
          tfc: tfc,
          tfd: tfd,
          tc: tc,
          td: instanceTd,
          tp: tp,
          tad: tad
        };
      });
      
      // Update the equation HTML with the enhanced version
      if (equationHTML) {
        updateEquationHTML(equationHTML + gcEquations);
      } else {
        updateEquationHTML(gcEquations);
      }
      
      // Update state with calculated results
      setGcResults(results);
      
      // Save results to localStorage
      saveResultsToLocalStorage();
      
      // Show success message
      showToast('success', "Calculation completed", {
        description: "Gc/G'c values and related parameters calculated successfully",
        icon: <CheckCircle className="h-4 w-4 text-green-500" />
      });
      
    } catch (error) {
      console.error("Error calculating Gc/G'c:", error);
      // showToast('error', "Error in calculations", {
      //   description: "There was an error calculating values. Please check your inputs.",
      //   icon: <AlertCircle className="h-4 w-4 text-destructive" />
      // });
    }
  };

  // Function to process pump selection using hardcoded data
  const processPumpFileSelection = async () => {
    if (!gcResults || gcResults.length === 0) {
      showToast('error', "Please calculate GC results first");
      return;
    }
    
    setIsPumpSelectionLoading(true);
    
    try {
      // Extract Ppmax values from GC results
      const ppmaxValues: number[] = [];
      // Also extract diameters for each instance
      const instanceDiametersToSend: number[] = [];
      
      // Extract Ppmax values from GC results and convert from MPa/10 to MPa
      // Also use instance-specific diameters if enabled
      gcResults.forEach(result => {
        if (result.ppmax !== null) {
          // Use the value as is (no multiplication)
          ppmaxValues.push(result.ppmax);
          
          // Add the appropriate diameter for this instance
          if (useSingleDiameter) {
            // Use the globally selected diameter for all instances
            instanceDiametersToSend.push(selectedDiameter);
          } else {
            // Use instance-specific diameter
            const diameter = instanceDiameters[result.instance] || selectedDiameter;
            instanceDiametersToSend.push(diameter);
          }
        }
      });
      
      if (ppmaxValues.length === 0) {
        showToast('error', "No valid Ppmax values found. Please calculate parameters first.");
        setIsPumpSelectionLoading(false);
        return;
      }
      
      // Process the pump data locally
      const results: PumpResult[] = [];
      
      // For each instance, find matching pumps
      ppmaxValues.forEach((ppmax, index) => {
        const instanceNumber = gcResults[index].instance;
        const diameter = instanceDiametersToSend[index];
        const diameterKey = diameter.toString() as "3.5" | "4" | "4.5";
        
        // Filter pumps by diameter and pressure
        const matchingPumps = PUMP_DATA.filter(pump => {
          // Check if this pump has data for the selected diameter
          const hasDiameter = pump.pressures[diameterKey] !== null;
          if (!hasDiameter) return false;
          
          // Check if this pump's pressure meets or exceeds the required Ppmax
          const pumpPressure = pump.pressures[diameterKey] as number;
          return pumpPressure >= ppmax;
        });
        
        // Sort by pressure (descending), closest to Ppmax first
        const sortedPumps = [...matchingPumps].sort((a, b) => {
          const aPressure = a.pressures[diameterKey] as number;
          const bPressure = b.pressures[diameterKey] as number;
          return Math.abs(aPressure - ppmax) - Math.abs(bPressure - ppmax);
        });
        
        // Format results for this instance
        const pumpResultsForInstance: PumpResult[] = [];
        
        sortedPumps.forEach((pump, pumpIndex) => {
          const pumpPressure = pump.pressures[diameterKey] as number;
          const pumpFlow = pump.flows[diameterKey] as number;
          
          // Calculate time factors for the pump
          let tfc = null;
          let tfd = null;
          let tc = null;
          let tad = 45; // 0.75 * 60 (default value)
          
          // Get the corresponding Gc result for this instance
          const gcResultForInstance = gcResults.find(r => r.instance === instanceNumber);
          
          if (gcResultForInstance && gcResultForInstance.vfd !== null) {
            // Get td value from inputs
            let instanceTd = 0;
            if (tdValue && !isNaN(parseFloat(tdValue))) {
              instanceTd = parseFloat(tdValue);
            } else if (instanceValues['td'] && 
                      instanceValues['td'][instanceNumber] && 
                      !isNaN(parseFloat(instanceValues['td'][instanceNumber]))) {
              instanceTd = parseFloat(instanceValues['td'][instanceNumber]);
            }
            
            // Calculate tfc+tfd = ((Vcf+Vfd)*10^3)/Q
            const tfcPlusTfd = ((gcResultForInstance.vcf + gcResultForInstance.vfd) * 1000) / pumpFlow;
            
            // Calculate tc = tfc+tfd + td
            tc = tfcPlusTfd + instanceTd;
            
            // Split tfcPlusTfd into tfc and tfd (50/50 split as a default approach)
            tfc = tfcPlusTfd / 2;
            tfd = tfcPlusTfd / 2;
          }
          
          pumpResultsForInstance.push({
            type: pump.type,
            diameter,
            pressure: pumpPressure,
            flow: pumpFlow,
            speed: pump.speed,
            price: pumpIndex + 1, // Placeholder price based on index
            isRecommended: pumpIndex === 0, // Mark the pump with closest pressure as recommended
            instance: instanceNumber,
            ppmax,
            tfc,
            tfd,
            tc,
            tad,
            isTimeAllowed: null,
            isAlternative: false,
          });
        });
        
        // If no exact matches, try to find alternatives with higher pressure
        if (pumpResultsForInstance.length === 0) {
          // Implementation for finding alternatives...
          // Current logic omitted for brevity
        }
        
        // Add all results for this instance
        results.push(...pumpResultsForInstance);
      });
      
      // Update state with results
      setPumpResults(results);
      
      showToast('success', "Pump selection completed", {
        description: `Found ${results.length} suitable pumps.`
      });
    } catch (error) {
      console.error('Error in pump selection:', error);
      showToast('error', "Pump selection failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsPumpSelectionLoading(false);
    }
  };

  // Function to clear Gc results
  const clearGcResults = () => {
    setGcResults([]);
    setEquationHTML("");
    setResultsHTML("");
    // showToast('info', "Results cleared");
  };
  
  // Function to clear pump results
  const clearPumpResults = () => {
    setPumpResults([]);
    setPumpFile(null);
    setPumpFileName("");
    
    // Try to clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    
    // showToast('success', "Pump selection data cleared");
  };
  
  // Toggle single input mode
  const toggleSingleInput = (field: string) => {
    setSingleInputFields(prev => {
      const newState = {
        ...prev,
        [field]: !prev[field]
      };
      
      // Save preferences to localStorage
      localStorage.setItem('wellsAnalyzerSemanticInputPrefs', JSON.stringify(newState));
      
      return newState;
    });
    
    // If toggling to single input mode, copy the first instance value to all instances
    if (!singleInputFields[field]) {
      const fieldValue = getFieldValue(field);
      if (fieldValue) {
        // Apply this value to all instances
        const newValues = {...instanceValues};
        if (!newValues[field]) newValues[field] = {};
        
        newValues[field][1] = fieldValue;
        newValues[field][2] = fieldValue;
        newValues[field][3] = fieldValue;
        
        setInstanceValues(newValues);
        // Save after updating instance values
        setTimeout(() => saveInputData(), 0);
      }
    }
  };
  
  // Get current value for a field
  const getFieldValue = (field: string): string => {
    switch(field) {
      case 'hc': return hcValue;
      case 'gammaC': return gammaC;
      case 'gammaFC': return gammaFC;
      case 'gammaF': return gammaF;
      case 'k1': return k1Value;
      case 'k2': return k2Value;
      case 'k3': return k3Value;
      case 'tfc': return tfcValue;
      case 'tfd': return tfdValue;
      case 'td': return tdValue;
      case 'h': return hValue;
      default: return '';
    }
  };
  
  // Update multiple instance values
  const updateInstanceValue = (field: string, instance: number, value: string) => {
    // Create a copy of the current state
    const newValues = {...instanceValues};
    if (!newValues[field]) newValues[field] = {};
    newValues[field][instance] = value;
    
    // Update state
    setInstanceValues(newValues);
    
    // Save after updating
    setTimeout(() => saveInputData(), 0);
  };

  // Add useEffect to load data on mount and save on state changes
  useEffect(() => {
    // Load data on component mount
    console.log("Initial mount effect - loading data");
    
    // First try to load semantics-specific data
    const hasSemanticData = loadInputData();
    
    // Only try to load from legacy storage if no semantics data was found
    if (!hasSemanticData) {
      loadInputsFromLegacyStorage();
    }

    // Force display a toast to confirm data was loaded
    if(localStorage.getItem('wellsAnalyzerSemanticData')) {
      // showToast('info', "Data loaded", {
      //   description: "Your saved data has been loaded from browser storage.",
      //   icon: <CheckCircle className="h-4 w-4 text-green-500" />
      // });
    }
  }, []);
  
  // Add a separate effect to mark initial load as complete
  useEffect(() => {
    // Set a timer to mark initial load as complete after a short delay
    const timer = setTimeout(() => {
      console.log("Setting initialLoadComplete to true");
      setInitialLoadComplete(true);
    }, 1000); // Wait 1 second before enabling auto-save
    
    return () => clearTimeout(timer);
  }, []);
  
  // Save inputs to localStorage when they change, but only after initial load
  useEffect(() => {
    // Skip saving during the initial load
    if (!initialLoadComplete) {
      console.log("Skipping auto-save during initial load");
      return;
    }
    
    console.log("Auto-saving inputs to localStorage");
    saveInputData();
  }, [
    initialLoadComplete,
    hcValue, gammaC, gammaW, gammaFC, gammaF,
    k1Value, k2Value, k3Value,
    tdValue,
    hValue, instanceValues, singleInputFields
  ]);
  
  // Render input field with toggle
  const renderInputField = (fieldId: string, label: string, value: string, onChange: (value: string) => void, unit?: string) => {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor={fieldId} className="text-sm font-medium">{label}</Label>
          <div className="flex items-center gap-2">
            <Label htmlFor={`toggle-${fieldId}`} className="text-xs text-muted-foreground">
              Single value
            </Label>
            <Switch 
              id={`toggle-${fieldId}`} 
              checked={!!singleInputFields[fieldId]} 
              onCheckedChange={() => toggleSingleInput(fieldId)}
            />
          </div>
        </div>
        
        {singleInputFields[fieldId] ? (
          // Single input mode
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}_single`} className="text-sm text-muted-foreground flex items-center gap-1">
              <Copy className="h-3 w-3" />
              Applied to all instances
            </Label>
            <div className="relative">
              <Input
                id={`${fieldId}_single`}
                placeholder={`Enter ${label} (all instances)`}
                value={value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(fieldId, e.target.value)}
                className="pl-3 pr-12 h-10 border-border/50 focus:border-primary"
              />
              {unit && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {unit}
                </span>
              )}
            </div>
          </div>
        ) : (
          // Multiple inputs mode
          <div className="space-y-2">
            {[1, 2, 3].map(instance => (
              <div key={`${fieldId}_${instance}`} className="space-y-1">
                <Label htmlFor={`${fieldId}_${instance}`} className="text-sm text-muted-foreground">
                  Instance {instance}
                </Label>
                <div className="relative">
                  <Input
                    id={`${fieldId}_${instance}`}
                    placeholder={`Enter ${label} (${instance})`}
                    value={instanceValues[fieldId]?.[instance] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      updateField(fieldId, e.target.value, instance)
                    }
                    className="pl-3 pr-12 h-10 border-border/50 focus:border-primary"
                  />
                  {unit && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Save inputs to localStorage when they change
  const updateHcValue = (value: string) => {
    setHcValue(value);
    // Auto-save after changing value
    setTimeout(() => saveInputData(), 0);
  };

  const updateGammaC = (value: string) => {
    setGammaC(value);
    // Auto-save after changing value
    setTimeout(() => saveInputData(), 0);
  };

  const updateGammaW = (value: string) => {
    setGammaW(value);
    // Auto-save after changing value
    setTimeout(() => saveInputData(), 0);
  };

  const updateGammaFC = (value: string) => {
    setGammaFC(value);
    // Auto-save after changing value
    setTimeout(() => saveInputData(), 0);
  };

  const updateGammaF = (value: string) => {
    setGammaF(value);
    // Auto-save after changing value
    setTimeout(() => saveInputData(), 0);
  };

  const updateK1Value = (value: string) => {
    setK1Value(value);
    // Clear Vcf results when K1 changes
    clearVcfResults();
    // Auto-save after changing value
    setTimeout(() => saveInputData(), 0);
  };

  const updateK2Value = (value: string) => {
    setK2Value(value);
    // Auto-save after changing value
    setTimeout(() => saveInputData(), 0);
  };

  const updateK3Value = (value: string) => {
    setK3Value(value);
    // Auto-save after changing value
    setTimeout(() => saveInputData(), 0);
  };

  const updateTfcValue = (value: string) => {
    setTfcValue(value);
    // Auto-save after changing value
    setTimeout(() => saveInputData(), 0);
  };

  const updateTfdValue = (value: string) => {
    setTfdValue(value);
    // Auto-save after changing value
    setTimeout(() => saveInputData(), 0);
  };

  const updateTdValue = (value: string) => {
    setTdValue(value);
    // Auto-save after changing value
    setTimeout(() => saveInputData(), 0);
  };

  const updateHValue = (value: string) => {
    setHValue(value);
    // Auto-save after changing value
    setTimeout(() => saveInputData(), 0);
  };

  // Helper to get HAD section name from casing result section
  const getHadSectionName = (section: string) => {
    if (section.toLowerCase().includes("production")) return "Production Section";
    if (section.toLowerCase().includes("surface")) return "Surface Section";
    if (section.toLowerCase().includes("intermediate")) return "Intermediate Section";
    return section + " Section";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background/95 dark:bg-background">
      <NavBar />
      <div className="flex-1 container mx-auto px-4 py-6 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Semantics Analysis
            </h1>
            <p className="text-muted-foreground">
              Calculate and analyze semantic parameters for well construction
            </p>
          </div>
          
          <Button 
            onClick={saveData} 
            disabled={isLoading} 
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
          >
            {isLoading ? (
              <>
                <RefreshCcw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Data
              </>
            )}
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Input Section */}
          <div className="lg:col-span-5 space-y-6 lg:hidden">
            {/* Input Parameters Card */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border/30">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-1 bg-primary rounded-full" />
                  <div>
                    <CardTitle>Input Parameters</CardTitle>
                    <CardDescription>Enter values for calculation</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-6">
                  {renderInputField('hc', 'Hc Value', hcValue, updateHcValue, 'm')}

                  <div className="grid grid-cols-2 gap-4">
                    {renderInputField('gammaC', 'γc', gammaC, updateGammaC)}
                    <div className="space-y-2">
                      <Label htmlFor="gamma-w" className="text-sm font-medium">γw (fixed at 1)</Label>
                      <Input
                        id="gamma-w"
                        value="1"
                        disabled
                        className="border-border/50 focus:border-primary bg-muted"
                      />
                    </div>
                    {renderInputField('gammaFC', 'γfc', gammaFC, updateGammaFC)}
                    {renderInputField('gammaF', 'γf', gammaF, updateGammaF)}
                  </div>

                  <div className="grid grid-cols-1 gap-4 mt-4">
                    {renderInputField('td', 'td', tdValue, updateTdValue)}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {renderInputField('k1', 'K1', k1Value, updateK1Value)}
                    {renderInputField('k2', 'K2', k2Value, updateK2Value)}
                    {renderInputField('k3', 'K3', k3Value, updateK3Value)}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/20 px-6 py-4 border-t border-border/30 flex flex-col space-y-2">
                <div className="flex gap-2 w-full">
                  <Button 
                    onClick={calculateVcf}
                    className="flex-1 bg-primary/80 hover:bg-primary/90 text-primary-foreground shadow-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                        Calculating Vcf...
                      </>
                    ) : (
                      <>
                        <Calculator className="mr-2 h-4 w-4" />
                        Calculate Vcf
                      </>
                    )}
                  </Button>
                </div>
                
                <Button 
                  onClick={calculateGcGc}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                      Calculating All Parameters...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Calculate All Parameters
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Right Column - Results Section */}
          <div className="lg:col-span-12 space-y-6">
            <Tabs defaultValue="inputs" className="w-full">
              <div className="flex items-center justify-between mb-6">
                <TabsList className="inline-flex h-9 items-center justify-center rounded-full bg-background border border-border/50 p-0.5">
                  <TabsTrigger 
                    value="inputs" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r from-primary/90 to-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/40"
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Inputs
                  </TabsTrigger>
                  <TabsTrigger 
                    value="results" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r from-primary/90 to-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/40"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Results
                  </TabsTrigger>
                  <TabsTrigger 
                    value="equations" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r from-primary/90 to-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/40"
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 7C4 6.44772 4.44772 6 5 6H19C19.5523 6 20 6.44772 20 7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7Z" fill="currentColor"/>
                      <path d="M4 12C4 11.4477 4.44772 11 5 11H19C19.5523 11 20 11.4477 20 12C20 12.5523 19.5523 13 19 13H5C4.44772 13 4 12.5523 4 12Z" fill="currentColor"/>
                      <path d="M5 16C4.44772 16 4 16.4477 4 17C4 17.5523 4.44772 18 5 18H19C19.5523 18 20 17.5523 20 17C20 16.4477 19.5523 16 19 16H5Z" fill="currentColor"/>
                    </svg>
                    Equations
                  </TabsTrigger>
                  <TabsTrigger 
                    value="pump-selection" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r from-primary/90 to-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/40"
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 8V4C14 3.44772 13.5523 3 13 3H4C3.44772 3 3 3.44772 3 4V8C3 8.55228 3.44772 9 4 9H13C13.5523 9 14 8.55228 14 8Z" fill="currentColor"/>
                      <path d="M4 11C3.44772 11 3 11.4477 3 12V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V12C21 11.4477 20.5523 11 20 11H4Z" fill="currentColor"/>
                      <circle cx="17.5" cy="6.5" r="3.5" fill="currentColor"/>
                    </svg>
                    Pump Selection
                  </TabsTrigger>
                </TabsList>
                
                {(vcfResults.length > 0 || gcResults.length > 0) && (
                  <Button 
                    onClick={clearSavedData} 
                    variant="outline" 
                    className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Clear all saved data"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>

              <TabsContent value="inputs" className="mt-0 space-y-4">
                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="bg-muted/30 border-b border-border/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-1 bg-primary rounded-full" />
                        <CardTitle>Input Parameters</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid gap-6">
                      {renderInputField('hc', 'Hc Value', hcValue, updateHcValue, 'm')}

                      <div className="grid grid-cols-2 gap-4">
                        {renderInputField('gammaC', 'γc', gammaC, updateGammaC)}
                        <div className="space-y-2">
                          <Label htmlFor="tab-gamma-w" className="text-sm font-medium">γw (fixed at 1)</Label>
                          <Input
                            id="tab-gamma-w"
                            value="1"
                            disabled
                            className="border-border/50 focus:border-primary bg-muted"
                          />
                        </div>
                        {renderInputField('gammaFC', 'γfc', gammaFC, updateGammaFC)}
                        {renderInputField('gammaF', 'γf', gammaF, updateGammaF)}
                      </div>

                      {renderInputField('h', 'h (height parameter)', hValue, updateHValue, 'm')}

                      <div className="grid grid-cols-1 gap-4 mt-4">
                        {renderInputField('td', 'td', tdValue, updateTdValue)}
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        {renderInputField('k1', 'K1', k1Value, updateK1Value)}
                        {renderInputField('k2', 'K2', k2Value, updateK2Value)}
                        {renderInputField('k3', 'K3', k3Value, updateK3Value)}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/20 px-6 py-4 border-t border-border/30 flex flex-col space-y-2">
                    <div className="flex gap-2 w-full">
                      <Button 
                        onClick={calculateVcf}
                        className="flex-1 bg-primary/80 hover:bg-primary/90 text-primary-foreground shadow-sm"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                            Calculating Vcf...
                          </>
                        ) : (
                          <>
                            <Calculator className="mr-2 h-4 w-4" />
                            Calculate Vcf
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <Button 
                      onClick={calculateGcGc}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                          Calculating All Parameters...
                        </>
                      ) : (
                        <>
                          <Calculator className="mr-2 h-4 w-4" />
                          Calculate All Parameters
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="results" className="mt-0 space-y-4">
                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="bg-muted/30 border-b border-border/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-1 bg-primary rounded-full" />
                        <CardTitle>Vcf Calculation Results</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[300px] w-full">
                      <div className="p-6">
                        {isLoading ? (
                          <div className="space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-[90%]" />
                            <Skeleton className="h-4 w-[95%]" />
                          </div>
                        ) : resultsHTML ? (
                          <div 
                            dangerouslySetInnerHTML={{ __html: resultsHTML }}
                            className="prose prose-sm max-w-none dark:prose-invert"
                          />
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Enter parameters and calculate to see results</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* GcResults Table */}
                {gcResults.length > 0 && (
                  <Card className="border-border/40 shadow-sm mt-6">
                    <CardHeader className="bg-muted/30 border-b border-border/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="h-8 w-1 bg-green-500 rounded-full" />
                          <CardTitle>Gc/G'c Calculation Results</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-center">Instance</TableHead>
                              <TableHead className="text-center">Vcf</TableHead>
                              <TableHead className="text-center">Gc</TableHead>
                              <TableHead className="text-center">nc (sacks)</TableHead>
                              <TableHead className="text-center">Vw</TableHead>
                              <TableHead className="text-center">Vfd</TableHead>
                              <TableHead className="text-center">Pymax</TableHead>
                              <TableHead className="text-center">Pc</TableHead>
                              <TableHead className="text-center">Pfr</TableHead>
                              <TableHead className="text-center">Ppmax</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {gcResults.map((result, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-center font-medium">{result.instance}</TableCell>
                                <TableCell className="text-center">{result.vcf?.toFixed(4) || "N/A"}</TableCell>
                                <TableCell className="text-center">{result.gc?.toFixed(4) || "N/A"}</TableCell>
                                <TableCell className="text-center">{result.nc?.toFixed(2) || "N/A"}</TableCell>
                                <TableCell className="text-center">{result.vw?.toFixed(2) || "N/A"}</TableCell>
                                <TableCell className="text-center">{result.vfd?.toFixed(2) || "N/A"}</TableCell>
                                <TableCell className="text-center">{result.pymax?.toFixed(2) || "N/A"}</TableCell>
                                <TableCell className="text-center">{result.pc?.toFixed(2) || "N/A"}</TableCell>
                                <TableCell className="text-center">{result.pfr?.toFixed(2) || "N/A"}</TableCell>
                                <TableCell className="text-center">{result.ppmax?.toFixed(2) || "N/A"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="equations" className="mt-0 space-y-4">
                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="bg-muted/30 border-b border-border/30">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-1 bg-primary rounded-full" />
                      <CardTitle>Calculation Equations</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px] w-full">
                      <div className="p-6">
                        {equationHTML ? (
                          <div 
                            dangerouslySetInnerHTML={{ __html: equationHTML }}
                            className="prose prose-sm max-w-none dark:prose-invert"
                          />
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <svg className="h-12 w-12 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M4 7C4 6.44772 4.44772 6 5 6H19C19.5523 6 20 6.44772 20 7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7Z" fill="currentColor"/>
                              <path d="M4 12C4 11.4477 4.44772 11 5 11H19C19.5523 11 20 11.4477 20 12C20 12.5523 19.5523 13 19 13H5C4.44772 13 4 12.5523 4 12Z" fill="currentColor"/>
                              <path d="M5 16C4.44772 16 4 16.4477 4 17C4 17.5523 4.44772 18 5 18H19C19.5523 18 20 17.5523 20 17C20 16.4477 19.5523 16 19 16H5Z" fill="currentColor"/>
                            </svg>
                            <p>Equations will appear after calculation</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pump-selection" className="mt-0 space-y-4">
                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="bg-muted/30 border-b border-border/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-1 bg-primary rounded-full" />
                        <div>
                          <CardTitle>Pump Selection</CardTitle>
                          <CardDescription>Upload Excel file to select suitable pumps based on Ppmax</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid gap-6">
                      {/* File Upload Section */}
                      <div className="">
                        <div className="flex items-center justify-between">
                          {/* <Label className="text-base font-medium">Pump Data File</Label> */}
                          {pumpFileName && (
                            <Badge variant="outline" className="px-3 py-1 flex items-center gap-2">
                              {pumpFileName}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4 w-4 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  setPumpFile(null);
                                  setPumpFileName("");
                                  if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          )}
                        </div>
                        
                        {/* File Upload UI - Replace with Pump Data Table */}
                        <div className="flex justify-center">
                          <div className="w-full overflow-x-auto">
                            <div className="flex justify-between items-center mb-2">
                              <h3 className="text-base font-medium">Pump Data Table</h3>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={togglePumpDataTableMinimized}
                                className="ml-2 h-8 w-8 p-0"
                              >
                                {pumpDataTableMinimized ? (
                                  <Maximize className="h-4 w-4" />
                                ) : (
                                  <Minimize className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            {!pumpDataTableMinimized && (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Speed</TableHead>
                                    <TableHead>Diameter (ɸ=3 1/2")</TableHead>
                                    <TableHead>Flow (L/min)</TableHead>
                                    <TableHead>Diameter (ɸ=4")</TableHead>
                                    <TableHead>Flow (L/min)</TableHead>
                                    <TableHead>Diameter (ɸ=4 1/2")</TableHead>
                                    <TableHead>Flow (L/min)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {PUMP_DATA.map((pump, index) => (
                                    <TableRow key={index}>
                                      <TableCell>{pump.type}</TableCell>
                                      <TableCell>{pump.speed}</TableCell>
                                      <TableCell>{pump.pressures["3.5"] !== null ? `${pump.pressures["3.5"]} MPa` : "-"}</TableCell>
                                      <TableCell>{pump.flows["3.5"] !== null ? pump.flows["3.5"] : "-"}</TableCell>
                                      <TableCell>{pump.pressures["4"] !== null ? `${pump.pressures["4"]} MPa` : "-"}</TableCell>
                                      <TableCell>{pump.flows["4"] !== null ? pump.flows["4"] : "-"}</TableCell>
                                      <TableCell>{pump.pressures["4.5"] !== null ? `${pump.pressures["4.5"]} MPa` : "-"}</TableCell>
                                      <TableCell>{pump.flows["4.5"] !== null ? pump.flows["4.5"] : "-"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Pump Diameter Selection */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-medium">Pump Diameters</Label>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id="use-instance-diameters"
                              checked={!useSingleDiameter}
                              onCheckedChange={(checked) => setUseSingleDiameter(!checked)}
                            />
                            <Label htmlFor="use-instance-diameters" className="text-sm font-normal">
                              Use instance-specific diameters
                            </Label>
                          </div>
                        </div>

                        {useSingleDiameter ? (
                          // Global diameter selector (original UI)
                          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="diameter-3.5"
                                value="3.5"
                                name="pump-diameter"
                                className="h-4 w-4 text-primary border-primary/50 focus:ring-primary/30"
                                checked={selectedDiameter === 3.5}
                                onChange={() => setSelectedDiameter(3.5)}
                              />
                              <Label htmlFor="diameter-3.5" className="text-sm font-normal">3.5 inch</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="diameter-4"
                                value="4"
                                name="pump-diameter"
                                className="h-4 w-4 text-primary border-primary/50 focus:ring-primary/30"
                                checked={selectedDiameter === 4}
                                onChange={() => setSelectedDiameter(4)}
                              />
                              <Label htmlFor="diameter-4" className="text-sm font-normal">4 inch</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="diameter-4.5"
                                value="4.5"
                                name="pump-diameter"
                                className="h-4 w-4 text-primary border-primary/50 focus:ring-primary/30"
                                checked={selectedDiameter === 4.5}
                                onChange={() => setSelectedDiameter(4.5)}
                              />
                              <Label htmlFor="diameter-4.5" className="text-sm font-normal">4.5 inch</Label>
                            </div>
                          </div>
                        ) : (
                          // Instance-specific diameter selectors
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {gcResults && gcResults.length > 0 ? (
                              gcResults.map((result) => (
                                <div key={`diameter-instance-${result.instance}`} className="space-y-2">
                                  <Label className="text-sm">Instance {result.instance}</Label>
                                  <Select 
                                    value={instanceDiameters[result.instance]?.toString() || "4"} 
                                    onValueChange={(value) => updateInstanceDiameter(result.instance, parseFloat(value))}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select diameter" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="3.5">3.5 inch</SelectItem>
                                      <SelectItem value="4">4 inch</SelectItem>
                                      <SelectItem value="4.5">4.5 inch</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-3 text-center text-muted-foreground py-2">
                                Calculate parameters first to set instance-specific diameters
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Ppmax Value Display */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Current Ppmax Values</Label>
                        <div className="bg-muted/40 p-3 rounded-md border border-border/50 space-y-2">
                          {gcResults && gcResults.length > 0 ? (
                            gcResults.map((result, index) => (
                              <div key={index} className="flex justify-between items-center">
                                <span className="text-sm font-medium">Instance {index + 1}:</span>
                                <span className="font-mono">
                                  {result.ppmax ? `${result.ppmax.toFixed(4)} MPa/10` : "N/A"}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-muted-foreground">
                              Calculate parameters first to get Ppmax values
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/20 px-6 py-4 border-t border-border/30 flex flex-col space-y-2">
                    <div className="flex gap-2 w-full">
                      <Button 
                        onClick={processPumpFileSelection}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                        disabled={isPumpSelectionLoading || gcResults.length === 0}
                      >
                        {isPumpSelectionLoading ? (
                          <>
                            <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                            Finding Pumps...
                          </>
                        ) : (
                          <>
                            <Calculator className="mr-2 h-4 w-4" />
                            Find Matching Pumps
                          </>
                        )}
                      </Button>
                      {pumpResults.length > 0 && (
                        <Button 
                          onClick={clearPumpResults}
                          variant="outline" 
                          className="px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
                
                {/* Add the pump results display here where it belongs */}
                {pumpResults.length > 0 && (
                  <Card className="border-border/40 shadow-sm mt-4">
                    <CardHeader className="bg-muted/30 border-b border-border/30">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-1 bg-green-500 rounded-full" />
                        <CardTitle>Matching Pumps</CardTitle>
                      </div>
                      <CardDescription>
                        Showing pumps that meet or exceed the required pressure values
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[600px] w-full">
                        <div className="p-0">
                          {/* Group pumps by instance */}
                          {Array.from(new Set(pumpResults.map(p => p.instance))).sort((a, b) => a - b).map(instance => (
                            <div key={instance} className="mb-8">
                              <div className="px-6 py-3 bg-muted/50 border-y border-border/50">
                                <h3 className="text-lg font-medium flex items-center justify-between">
                                  <span>
                                    Instance {instance} - Ppmax: {pumpResults.find(p => p.instance === instance)?.ppmax.toFixed(4)} MPa
                                  </span>
                                  <span className="text-sm font-normal flex items-center gap-2">
                                    <span className="text-muted-foreground">Diameter:</span>
                                    <Badge variant="outline" className="bg-muted/80">
                                      {pumpResults.find(p => p.instance === instance)?.diameter}" 
                                    </Badge>
                                  </span>
                                </h3>
                              </div>
                              
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[180px]">Type/Model</TableHead>
                                    <TableHead>Diameter (in)</TableHead>
                                    <TableHead>Pressure (MPa)</TableHead>
                                    <TableHead>Flow Rate</TableHead>
                                    <TableHead>Speed</TableHead>
                                    <TableHead>tfc+tfd</TableHead>
                                    <TableHead>tc</TableHead>
                                    <TableHead>n</TableHead>
                                    <TableHead className="text-right"></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {pumpResults
                                    .filter(pump => pump.instance === instance)
                                    .map((pump, index) => (
                                      <TableRow 
                                        key={`${instance}-${index}`}
                                        className={pump.isRecommended ? "bg-green-500/10" : 
                                                 pump.isAlternative ? "bg-amber-500/10" : ""}
                                      >
                                        <TableCell className="font-medium flex items-center gap-2">
                                          {pump.type}
                                          {pump.isRecommended && (
                                            <Badge className="bg-green-500 hover:bg-green-600">
                                              Recommended
                                            </Badge>
                                          )}
                                          {pump.isAlternative && (
                                            <Badge className="bg-amber-500 hover:bg-amber-600">
                                              Alternative
                                            </Badge>
                                          )}
                                        </TableCell>
                                        <TableCell>{pump.diameter}</TableCell>
                                        <TableCell>{pump.pressure.toFixed(2)}</TableCell>
                                        <TableCell>{pump.flow.toFixed(2)}</TableCell>
                                        <TableCell>{pump.speed || '-'}</TableCell>
                                        <TableCell>{(pump.tfc && pump.tfd) ? (pump.tfc + pump.tfd).toFixed(2) : "N/A"}</TableCell>
                                        <TableCell>{pump.tc?.toFixed(2) || "N/A"}</TableCell>
                                        <TableCell>{pump.tc && pump.tad ? Math.ceil(pump.tc / pump.tad + 1).toString() : "N/A"}</TableCell>
                                        <TableCell className="text-right">
                                          {pump.isRecommended && (
                                            <CheckCircle className="h-5 w-5 text-green-500 inline-block" />
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                          ))}
                          
                          {/* Show message if no results for any instance */}
                          {pumpResults.length === 0 && (
                            <div className="py-10 text-center text-muted-foreground">
                              No matching pumps found for any instance
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
} 