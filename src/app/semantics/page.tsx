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
import { Calculator, Eye, EyeOff, ArrowRight, RefreshCcw, AlertCircle, X, CheckCircle, Save, Info, AlertTriangle, Loader2, Maximize, Minimize, Settings, Layers, LoaderCircle } from "lucide-react"
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
import { motion } from "framer-motion"
import { useWellType } from "@/context/WellTypeContext";

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
  const [k1Value, setK1Value] = useState("");
  const [k2Value, setK2Value] = useState("");
  const [k3Value, setK3Value] = useState("");
  const [gammaC, setGammaC] = useState("");
  const [gammaW, setGammaW] = useState("1"); // Fixed at 1
  const [gammaFC, setGammaFC] = useState("");
  const [gammaF, setGammaF] = useState(""); // Will be set to 1.08 for exploration wells in useEffect
  const [tfcValue, setTfcValue] = useState("");
  const [tfdValue, setTfdValue] = useState("");
  const [tdValue, setTdValue] = useState("");
  const [hValue, setHValue] = useState("");
  const [mValue, setMValue] = useState(""); // Re-add this line
  
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
    try {
      // Combine all inputs into a single object
      const inputData = {
        gammaC,
        gammaW,
        gammaFC,
        gammaF,
        k1: k1Value,
        k2: k2Value,
        k3: k3Value,
        tfc: tfcValue,
        tfd: tfdValue,
        td: tdValue,
        h: hValue,
        m: mValue, // Add mValue to input data
        // Include instance values
        instanceValues,
        // Include single input preferences
        singleInputFields
      };
      
      localStorage.setItem('wellsAnalyzerSemanticData', JSON.stringify(inputData));
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
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
      const savedData = localStorage.getItem('wellsAnalyzerSemanticData');
      
      if (savedData) {
        const data = JSON.parse(savedData);
        
        // Load single values
        if (data.gammaC !== undefined) setGammaC(data.gammaC);
        if (data.gammaW !== undefined) setGammaW(data.gammaW);
        if (data.gammaFC !== undefined) setGammaFC(data.gammaFC);
        if (data.gammaF !== undefined) setGammaF(data.gammaF);
        if (data.k1 !== undefined) setK1Value(data.k1);
        if (data.k2 !== undefined) setK2Value(data.k2);
        if (data.k3 !== undefined) setK3Value(data.k3);
        if (data.tfc !== undefined) setTfcValue(data.tfc);
        if (data.tfd !== undefined) setTfdValue(data.tfd);
        if (data.td !== undefined) setTdValue(data.td);
        if (data.h !== undefined) setHValue(data.h);
        if (data.m !== undefined) setMValue(data.m); // Load mValue from data
        
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
      }
      return false;
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
      setMValue(""); // Reset mValue
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
    gammaC, gammaW, gammaFC, gammaF,
    k1Value, k2Value, k3Value,
    tfcValue,
    tfdValue,
    tdValue,
    hValue, mValue, instanceValues, singleInputFields
  ]);

  // Update a field with single or multiple values
  const updateField = (field: string, value: string, instance?: number) => {
    // If this is a single input field or no instance specified, update the main state
    if (singleInputFields[field] || !instance) {
      switch(field) {
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
        case 'm': updateMValue(value); break; // Add this line
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
      // Get formation data for Hc (HAC) values - store all three instances
      let formationHcValues = [0, 0, 0]; // Initialize with 0 for each instance (index 0, 1, 2)
      try {
        const formationData = localStorage.getItem('wellsAnalyzerData');
        if (formationData) {
          const data = JSON.parse(formationData);
          
          // Check for Hc values from Formation Design (for each instance)
          for (let i = 1; i <= 3; i++) {
            // First try with the new Hc naming
            if (data[`Hc_${i}`] && !isNaN(parseFloat(data[`Hc_${i}`]))) {
              // Store Hc3 in index 0 and Hc1 in index 2 (swap Hc1 and Hc3)
              if (i === 1) {
                formationHcValues[2] = parseFloat(data[`Hc_${i}`]);
              } else if (i === 3) {
                formationHcValues[0] = parseFloat(data[`Hc_${i}`]);
              } else {
                formationHcValues[i-1] = parseFloat(data[`Hc_${i}`]);
              }
            } 
            // Then fallback to the old H naming for backward compatibility
            else if (data[`H_${i}`] && !isNaN(parseFloat(data[`H_${i}`]))) {
              // Store H3 in index 0 and H1 in index 2 (swap H1 and H3)
              if (i === 1) {
                formationHcValues[2] = parseFloat(data[`H_${i}`]);
              } else if (i === 3) {
                formationHcValues[0] = parseFloat(data[`H_${i}`]);
              } else {
                formationHcValues[i-1] = parseFloat(data[`H_${i}`]);
              }
            }
          }
          
          // If we have a single value (non-instance), use it for all instances as fallback
          if (formationHcValues.every(v => v === 0)) {
            if (data.Hc && !isNaN(parseFloat(data.Hc))) {
              // If we're using a single value, apply it to all instances but in the swapped order (Hc3, Hc2, Hc1)
              const singleHcValue = parseFloat(data.Hc);
              formationHcValues = [singleHcValue, singleHcValue, singleHcValue];
            } else if (data.H && !isNaN(parseFloat(data.H))) {
              // Same for H values
              const singleHValue = parseFloat(data.H);
              formationHcValues = [singleHValue, singleHValue, singleHValue];
            }
          }
        }
      } catch (error) {
        console.error('Failed to load Hc from Formation Design data:', error);
      }
      
      // Check if we have height parameter value - different from Hc/HAC
      const hasHeightValue = hValue || 
        (instanceValues['h'] && (
          instanceValues['h'][1] || 
          instanceValues['h'][2] || 
          instanceValues['h'][3]
        ));
      
      if (!hasHeightValue) {
        showToast('error', "Please enter a value for h (height parameter)");
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
        return;
      }
      
      // Check if at least one Hc value is available
      if (formationHcValues.every(v => v === 0)) {
        console.warn('No Hc values found in Formation Design data');
        showToast('error', "Height Above Cementation (HAC) values not found", {
          description: "Please enter HAC values in Formation Design - Drill Pipes Design tab first."
        });
        setIsLoading(false);
        return;
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
      
      // Ensure we have valid values for Hc (at least one instance) and K1
      if (formationHcValues.every(v => v === 0) || K1 === 0) {
        return;
      }
      
      // Create results array
      const results: VcfResult[] = [];
      
      // Generate HTML for equations - display the instance-specific Hc values
      let equations = `<div class="space-y-4">
                        <h3 class="text-xl font-bold text-primary">Vcf Equations</h3>
                        <div class="bg-muted/30 p-4 rounded-md border border-border/40">
                          <h4 class="font-medium mb-2">General Formula:</h4>
                          <p class="font-mono text-sm bg-background/80 p-2 rounded">Vcf = (π/4) × [(K1 × Db² - de²) × Hc + di² × h]</p>
                          <p class="text-sm mt-2">Where:</p>
                          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mt-2">
                            <div class="bg-background/50 p-2 rounded border border-border/30">
                              <span class="font-mono">K1 = ${K1.toFixed(4)} (coefficient)</span>
                            </div>
                            <div class="bg-background/50 p-2 rounded border border-border/30">
                              <span class="font-mono">Hc (Instance 1) = ${formationHcValues[0].toFixed(4)} m</span>
                            </div>
                            ${formationHcValues[1] > 0 ? `<div class="bg-background/50 p-2 rounded border border-border/30">
                              <span class="font-mono">Hc (Instance 2) = ${formationHcValues[1].toFixed(4)} m</span>
                            </div>` : ''}
                            ${formationHcValues[2] > 0 ? `<div class="bg-background/50 p-2 rounded border border-border/30">
                              <span class="font-mono">Hc (Instance 3) = ${formationHcValues[2].toFixed(4)} m</span>
                            </div>` : ''}
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
        const de = parseFloat(result.atBody || '0') / 1000; // Using atBody (DCSG') for de instead of dcsg
        // const di = parseFloat(result.internalDiameter || '0') / 1000; // Internal diameter in m

        // --- Get Dim from HAD data ---
        let dimValue: number | null = null;
        if (hadData) {
          const sectionName = getHadSectionName(result.section);
          const sectionData = hadData[sectionName];
          if (sectionData) {
            const atHeadKeys = Object.keys(sectionData);
            if (atHeadKeys.length > 0) {
              // Use original calculateDim without external diameter parameter
              const dimStr = calculateDim(sectionData[atHeadKeys[0]]);
              if (dimStr !== "-") {
                dimValue = parseFloat(dimStr);
              }
            }
          }
        }
        // Fallback to di if Dim is not available
        if (dimValue === null) {
          dimValue = parseFloat(result.internalDiameter || '0') / 1000;
        } else {
          // If we got dimValue from HAD data, convert from mm to meters
          dimValue = dimValue / 1000;
        }
        
        // Add logging to debug
        console.log('Casing result:', result);
        console.log('Db:', Db, 'de:', de, 'di:', dimValue);
        
        // Get instance-specific Hc value from the formation design
        // With our swapped values, formationHcValues[0] is Hc3, formationHcValues[1] is Hc2, formationHcValues[2] is Hc1
        let instanceHc = formationHcValues[i] || formationHcValues[0]; // Use instance-specific value or fallback to first instance
        
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
        
        // Calculate Vcf using instance-specific Hc value and the formula
        // Calculate Vcf using the formula: Vcf = (π/4) × [(K1 × Db² - de²) × Hc + di² × h]
        // Calculate each term separately for clarity
        const PI_OVER_4 = Math.PI / 4;
        const k1_times_db_squared = instanceK1 * Math.pow(Db, 2);
        const de_squared = Math.pow(de, 2);
        const first_term = (k1_times_db_squared - de_squared) * instanceHc; // Using instanceHc from formation design
        const di_squared = Math.pow(dimValue, 2);
        const second_term = di_squared * h;
        const vcf = PI_OVER_4 * (first_term + second_term);
        
        // Add to results
        results.push({
          instance: instanceNumber,
          db: Db * 1000, // Convert back to mm for display
          de: de * 1000, // Convert back to mm for display
          di: dimValue * 1000, // Convert back to mm for display
          h: h,
          vcf: vcf
        });
        
        // Add calculation details to the equations HTML
        equations += `
          <div class="mt-6 border border-primary/20 rounded-md overflow-hidden">
            <div class="bg-primary/10 p-3 border-b border-primary/20">
              <h4 class="font-semibold">Instance ${instanceNumber} Calculations</h4>
            </div>
            <div class="p-4 space-y-4 bg-muted/20">
              <div>
                <p class="font-medium mb-2">Input Values:</p>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">K1 = ${instanceK1.toFixed(4)}</span>
                  </div>
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">Hc = ${instanceHc.toFixed(4)} m</span>
                  </div>
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">h = ${h.toFixed(4)} m</span>
                  </div>
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">Db = ${(Db * 1000).toFixed(4)} mm</span>
                  </div>
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">de = ${(de * 1000).toFixed(4)} mm</span>
                  </div>
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">di = ${(dimValue * 1000).toFixed(4)} mm</span>
                  </div>
                </div>
              </div>
              
              <div class="border-t border-border/30 pt-4">
                <p class="font-medium">Vcf Calculation:</p>
                <div class="mt-2 bg-background/60 p-3 rounded">
                  <p class="font-mono text-sm">Vcf = (π/4) × [(K1 × Db² - de²) × Hc + di² × h]</p>
                  <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                    <li>K1 × Db² = ${instanceK1.toFixed(4)} × ${(Db * Db).toFixed(6)} = ${k1_times_db_squared.toFixed(6)}</li>
                    <li>de² = ${(de * de).toFixed(6)}</li>
                    <li>K1 × Db² - de² = ${k1_times_db_squared.toFixed(6)} - ${(de * de).toFixed(6)} = ${(k1_times_db_squared - de * de).toFixed(6)}</li>
                    <li>(K1 × Db² - de²) × Hc = ${(k1_times_db_squared - de * de).toFixed(6)} × ${instanceHc.toFixed(4)} = ${first_term.toFixed(6)}</li>
                    <li>di² = ${(dimValue * dimValue).toFixed(6)}</li>
                    <li>di² × h = ${(dimValue * dimValue).toFixed(6)} × ${h.toFixed(4)} = ${second_term.toFixed(6)}</li>
                    <li>(K1 × Db² - de²) × Hc + di² × h = ${first_term.toFixed(6)} + ${second_term.toFixed(6)} = ${(first_term + second_term).toFixed(6)}</li>
                    <li>π/4 × [(K1 × Db² - de²) × Hc + di² × h] = ${PI_OVER_4.toFixed(6)} × ${(first_term + second_term).toFixed(6)} = ${vcf.toFixed(6)}</li>
                  </ol>
                  <p class="font-mono text-sm mt-2 font-bold">Vcf = ${vcf.toFixed(4)} m³</p>
                </div>
              </div>
            </div>
          </div>
        `;
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
      // Get formation data for Hc (HAC) values - store all three instances
      let formationHcValues = [0, 0, 0]; // Initialize with 0 for each instance (index 0, 1, 2)
      try {
        const formationData = localStorage.getItem('wellsAnalyzerData');
        if (formationData) {
          const data = JSON.parse(formationData);
          
          // Check for Hc values from Formation Design (for each instance)
          for (let i = 1; i <= 3; i++) {
            // First try with the new Hc naming
            if (data[`Hc_${i}`] && !isNaN(parseFloat(data[`Hc_${i}`]))) {
              // Store Hc3 in index 0 and Hc1 in index 2 (swap Hc1 and Hc3)
              if (i === 1) {
                formationHcValues[2] = parseFloat(data[`Hc_${i}`]);
              } else if (i === 3) {
                formationHcValues[0] = parseFloat(data[`Hc_${i}`]);
              } else {
                formationHcValues[i-1] = parseFloat(data[`Hc_${i}`]);
              }
            } 
            // Then fallback to the old H naming for backward compatibility
            else if (data[`H_${i}`] && !isNaN(parseFloat(data[`H_${i}`]))) {
              // Store H3 in index 0 and H1 in index 2 (swap H1 and H3)
              if (i === 1) {
                formationHcValues[2] = parseFloat(data[`H_${i}`]);
              } else if (i === 3) {
                formationHcValues[0] = parseFloat(data[`H_${i}`]);
              } else {
                formationHcValues[i-1] = parseFloat(data[`H_${i}`]);
              }
            }
          }
          
          // If we have a single value (non-instance), use it for all instances as fallback
          if (formationHcValues.every(v => v === 0)) {
            if (data.Hc && !isNaN(parseFloat(data.Hc))) {
              // If we're using a single value, apply it to all instances but in the swapped order (Hc3, Hc2, Hc1)
              const singleHcValue = parseFloat(data.Hc);
              formationHcValues = [singleHcValue, singleHcValue, singleHcValue];
            } else if (data.H && !isNaN(parseFloat(data.H))) {
              // Same for H values
              const singleHValue = parseFloat(data.H);
              formationHcValues = [singleHValue, singleHValue, singleHValue];
            }
          }
        }
      } catch (error) {
        console.error('Failed to load Hc from Formation Design data:', error);
      }
      
      // Check if we have at least one valid Hc value
      const hasHcValue = formationHcValues.some(v => v > 0);
      
      // Rest of the validation
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
        return;
      }
      
      // Check if all Hc values are 0
      if (formationHcValues.every(v => v === 0)) {
        console.warn('No Hc values found in Formation Design data');
        showToast('error', "Height Above Cementation (HAC) values not found", {
          description: "Please enter HAC values in Formation Design - Drill Pipes Design tab first."
        });
        setIsLoading(false);
        return;
      }
      
      // Use formation design Hc value
      let hc = formationHcValues[0]; // Use the first instance's Hc value
      if (hc === 0) {
        console.warn('No Hc value found in Formation Design data');
        showToast('error', "Height Above Cementation (HAC) value not found", {
          description: "Please enter HAC value in Formation Design - Drill Pipes Design tab first."
        });
        setIsLoading(false);
        return;
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
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">Gc = (γc·γw)/(m·γc + γw)</p>
                            </div>
                            <div>
                              <p class="font-medium">G'c (modified cement grade):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">G'c = K2·Gc·Vfc</p>
                            </div>
                            <div>
                              <p class="font-medium">nc (number of cement sacks):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">nc = (G'c × 1000) / 50</p>
                            </div>
                            <div>
                              <p class="font-medium">Vw (water volume):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">Vw = Vcf × γw</p>
                            </div>
                            <div>
                              <p class="font-medium">Vfd (volume of fluid displacement):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">Vfd = (π/4) × di² × (H - h)</p>
                            </div>
                            <div>
                              <p class="font-medium">Pymax (maximum pressure at yield point):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">Pymax = 0.1[(Hc - h)(γfc - γf)]</p>
                              <p class="text-xs mt-1">Where Hc is Height Above Cementation from Formation Design and h is the height parameter from the semantic screen</p>
                            </div>
                            <div>
                              <p class="font-medium">Pc (confining pressure):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">Pc = 0.2H + (8 or 16)</p>
                              <p class="text-xs mt-1">Where H is the depth and 8 is used if H < 2000, otherwise 16 is used</p>
                            </div>
                            <div>
                              <p class="font-medium">Ppmax (maximum pump pressure):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">Ppmax = Pymax + Pc + Pfr</p>
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
        // Use the instance-specific Hc value from formationHcValues
        // With our swapped values, formationHcValues[0] is Hc3, formationHcValues[1] is Hc2, formationHcValues[2] is Hc1
        let instanceHc = formationHcValues[instanceNumber - 1] || formationHcValues[0]; // Fallback to first instance if current one isn't available
        
        let instanceGc = gc;
        let instanceGw = gw;
        let instanceGfc = gfc;
        let instanceGf = gf;
        let instanceM = m;
        
        // Check for instance-specific gammaC
        if (!singleInputFields['gammaC'] && 
            instanceValues['gammaC'] && 
            instanceValues['gammaC'][instanceNumber] && 
            !isNaN(parseFloat(instanceValues['gammaC'][instanceNumber]))) {
          instanceGc = parseFloat(instanceValues['gammaC'][instanceNumber]);
        }
        
        // Force numeric type to avoid any string comparison issues
        instanceGc = Number(instanceGc);
        
        // Check for instance-specific gammaW
        if (!singleInputFields['gammaW'] && 
            instanceValues['gammaW'] && 
            instanceValues['gammaW'][instanceNumber] && 
            !isNaN(parseFloat(instanceValues['gammaW'][instanceNumber]))) {
          instanceGw = parseFloat(instanceValues['gammaW'][instanceNumber]);
        }
        
        // Force numeric type
        instanceGw = Number(instanceGw);
        
        // Check for instance-specific m value
        if (!singleInputFields['m'] && 
            instanceValues['m'] && 
            instanceValues['m'][instanceNumber] && 
            !isNaN(parseFloat(instanceValues['m'][instanceNumber]))) {
          instanceM = parseFloat(instanceValues['m'][instanceNumber]);
        }
        
        // Force numeric type
        instanceM = Number(instanceM);
        
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
        
        // Calculate Gc using instance-specific values - gc = (γc.γw)/(m.γc + γw)
        console.log(`[Instance ${instanceNumber}] Debug - Before Gc calculation:`, {
          instanceGc,
          instanceGw,
          instanceM,
          numerator: (instanceGc * instanceGw),
          denominator: (instanceM * instanceGc + instanceGw)
        });
        
        // Calculate Gc with safeguards
        let gc_value = 0;
        const denominator = (instanceM * instanceGc + instanceGw);
        
        if (denominator !== 0 && !isNaN(denominator) && instanceGc > 0 && instanceGw > 0 && instanceM > 0) {
          // Apply the correct formula with validation
          gc_value = (instanceGc * instanceGw) / denominator;
          
          // Sanity check - if gc_value equals instanceGc, something is likely wrong
          if (Math.abs(gc_value - instanceGc) < 0.0001) {
            console.warn(`[Instance ${instanceNumber}] Warning: gc_value (${gc_value}) is suspiciously close to instanceGc (${instanceGc}). Rechecking calculation.`);
            // Force recalculation with explicit values
            gc_value = Number((instanceGc * instanceGw) / (instanceM * instanceGc + instanceGw));
          }
        } else {
          console.error(`[Instance ${instanceNumber}] Error: Invalid values for Gc calculation:`, {instanceGc, instanceGw, instanceM, denominator});
          // Set a default that's clearly not just instanceGc to avoid confusion
          gc_value = 0;
        }
        
        console.log(`[Instance ${instanceNumber}] Debug - After Gc calculation:`, {
          gc_value,
          formula: '(instanceGc * instanceGw) / (instanceM * instanceGc + instanceGw)',
          expectedValue: instanceM > 0 ? (instanceGc * instanceGw) / (instanceM * instanceGc + instanceGw) : 'Invalid (m=0)'
        });
        
        // Final check to ensure gc_value is never equal to instanceGc
        if (Math.abs(gc_value - instanceGc) < 0.0001) {
          console.error(`[Instance ${instanceNumber}] Critical Error: gc_value (${gc_value}) still equals instanceGc (${instanceGc}) after safeguards. Forcing recalculation.`);
          
          // Force different calculation approach with explicit operations
          const num = Number(instanceGc) * Number(instanceGw);
          const den = (Number(instanceM) * Number(instanceGc)) + Number(instanceGw);
          
          if (den !== 0) {
            gc_value = num / den;
            console.log(`[Instance ${instanceNumber}] Forced recalculation result:`, gc_value);
          } else {
            // If still problematic, set to zero for visibility of the issue
            gc_value = 0;
            console.error(`[Instance ${instanceNumber}] Division by zero in forced recalculation:`, {num, den});
          }
        }
        
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
        
        // Calculate nc in sacks - always use the formula: nc = (G'c * 1000) / 50
        const nc = (gc_prime * 1000) / 50;
        
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
        
        // If we have a valid calculated m value, use it instead of the input m value
        if (calculatedM !== null) {
          instanceM = calculatedM;
        }
        
        // Calculate Vw (water volume) using the new formula with calculated m
        // Only calculate if we have a valid calculated m value
        const vw = (calculatedM !== null && instanceGw > 0) ? 
                  (instanceK3 * calculatedM * gc_value * vcfValue) / instanceGw : null;
        
        // Calculate Vfd (volume of fluid displacement)
        // Using the formula: Vfd = (π/4) × di² × (H - h)
        // Where di is the casing inner diameter in meters, H is instanceHc, and h is vcfResult.h
        
        // Get the correct H value based on the instance (reverse mapping)
        // Instance 1 (Production) should use the highest H value
        // Instance 3 (Surface) should use the lowest H value
        let hValue;
        
        // Try to get H from formation data 
        // With our swapped values, formationHcValues[0] is Hc3, formationHcValues[1] is Hc2, formationHcValues[2] is Hc1
        // Instance 1 (Production) should use Hc1 value
        // Instance 3 (Surface) should use Hc3 value
        let correctH;
        if (instanceNumber === 1) {
          // Production (instance 1) should use Hc1 which is now at index 2
          correctH = formationHcValues[2] || instanceHc;
        } else if (instanceNumber === 3) {
          // Surface (instance 3) should use Hc3 which is now at index 0
          correctH = formationHcValues[0] || instanceHc;
        } else {
          // For intermediate (instance 2), use Hc2 which is still at index 1
          correctH = formationHcValues[1] || instanceHc;
        }
        
        // Convert di from mm to meters for the calculation
        const diInMeters = vcfResult.di / 1000;
        
        // Calculate Vfd using the formula with the correct H value
        const vfd = (Math.PI / 4) * Math.pow(diInMeters, 2) * (correctH - vcfResult.h);
        
        // Calculate Pymax (maximum pressure at yield point) - using the new formula from the image
        // Pymax = 0.1[(Hc - h)(γfc - γf)]
        const pymax = (instanceGfc && instanceGf && vcfResult.h) ? 
                      0.1 * (instanceHc - vcfResult.h) * (instanceGfc - instanceGf) : null;
        
        // Calculate Pc (confining pressure) using the correct formula:
        // Pc = 0.2H + (8 or 16), where 8 is used if H < 2000, otherwise 16 is used
        // Use the same H value as in Vfd calculation
        const constantValue = correctH >= 2000 ? 16 : 8;
        const pc = 0.2 * correctH + constantValue;
        
        // Pfr remains constant at 5 usually
        const pfr = 5;
        
        // Calculate Ppmax (maximum pump pressure) based on the formula
        // Ppmax = Pymax + Pc + Pfr
        const ppmax = (pymax && pc) ? ((pymax + pc + pfr) / 10) : null;
        
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
                    <span class="font-mono">m = ${calculatedM !== null ? calculatedM.toFixed(4) : instanceM.toFixed(4)}</span>
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
                    <p class="font-mono text-sm">nc = (G'c × 1000) / 50</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>G'c × 1000 = ${gc_prime.toFixed(4)} × 1000 = ${(gc_prime * 1000).toFixed(4)}</li>
                      <li>(G'c × 1000) / 50 = ${(gc_prime * 1000).toFixed(4)} / 50 = ${nc !== null ? nc.toFixed(4) : "N/A"}</li>
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
                    <p class="font-mono text-sm">Vfd = (π/4) × di² × (H - h)</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>di = ${(vcfResult.di / 1000).toFixed(4)} m (${vcfResult.di.toFixed(4)} mm)</li>
                      <li>di² = ${Math.pow(vcfResult.di / 1000, 2).toFixed(6)}</li>
                      <li>H - h = ${correctH.toFixed(4)} - ${vcfResult.h.toFixed(4)} = ${(correctH - vcfResult.h).toFixed(4)}</li>
                      <li>π/4 = ${(Math.PI / 4).toFixed(6)}</li>
                      <li>(π/4) × di² × (H - h) = ${(Math.PI / 4).toFixed(6)} × ${Math.pow(vcfResult.di / 1000, 2).toFixed(6)} × ${(correctH - vcfResult.h).toFixed(4)} = ${vfd.toFixed(4)}</li>
                    </ol>
                    <p class="font-mono text-sm mt-2 font-bold">Vfd = ${vfd.toFixed(4)}</p>
                  </div>
                </div>
                ` : ''}
                
                ${nc !== null && instanceGf ? `
                <div class="border-t border-border/30 pt-4">
                  <p class="font-medium">Pymax (Max Pressure at Yield) Calculation:</p>
                  <div class="mt-2 bg-background/60 p-3 rounded">
                    <p class="font-mono text-sm">Pymax = 0.1[(Hc - h)(γfc - γf)]</p>
                    <p class="text-xs text-muted-foreground mt-1">Where Hc is Height Above Cementation from Formation Design and h is the height parameter from semantic screen</p>
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
                    <p class="font-mono text-sm">Pc = 0.2H + (8 or 16)</p>
                    <p class="font-mono text-sm mt-1">Where H is the depth and 8 is used if H < 2000, otherwise 16 is used</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>H = ${correctH.toFixed(4)}</li>
                      <li>Constant value = ${correctH >= 2000 ? '16 (since H ≥ 2000)' : '8 (since H < 2000)'}</li>
                      <li>0.2 × H = 0.2 × ${correctH.toFixed(4)} = ${(0.2 * correctH).toFixed(4)}</li>
                      <li>0.2H + ${constantValue} = ${(0.2 * correctH).toFixed(4)} + ${constantValue} = ${pc.toFixed(4)}</li>
                    </ol>
                    <p class="font-mono text-sm mt-2 font-bold">Pc = ${pc.toFixed(4)} MPa</p>
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
                                ` : ''}
                
                <div class="border-t border-border/30 pt-4">
                  <p class="font-medium">m Variable Calculation:</p>
                  <div class="mt-2 bg-background/60 p-3 rounded">
                    <p class="font-mono text-sm">m = (γw × (γc - γfc)) / (γc × (γfc - γw))</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      ${instanceGfc ? `
                      <li>γw × (γc - γfc) = ${instanceGw.toFixed(4)} × (${instanceGc.toFixed(4)} - ${instanceGfc.toFixed(4)}) = ${instanceGw.toFixed(4)} × ${(instanceGc - instanceGfc).toFixed(4)} = ${(instanceGw * (instanceGc - instanceGfc)).toFixed(4)}</li>
                      <li>γc × (γfc - γw) = ${instanceGc.toFixed(4)} × (${instanceGfc.toFixed(4)} - ${instanceGw.toFixed(4)}) = ${instanceGc.toFixed(4)} × ${(instanceGfc - instanceGw).toFixed(4)} = ${(instanceGc * (instanceGfc - instanceGw)).toFixed(4)}</li>
                      <li>(γw × (γc - γfc)) / (γc × (γfc - γw)) = ${(instanceGw * (instanceGc - instanceGfc)).toFixed(4)} / ${(instanceGc * (instanceGfc - instanceGw)).toFixed(4)} = ${calculatedM !== null ? calculatedM.toFixed(4) : "N/A"}</li>
                      ` : `<li>Cannot calculate m: missing γfc value</li>`}
                    </ol>
                    <p class="font-mono text-sm mt-2 font-bold">Calculated m = ${calculatedM !== null ? calculatedM.toFixed(4) : "N/A"}</p>
                    <p class="text-xs text-muted-foreground mt-1">Calculated m value is used for water volume calculations</p>
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
      
      // Extract Ppmax values from GC results in MPa/10 units
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
        
        // Get all instance numbers from vcfResults
        if (vcfResults && vcfResults.length > 0) {
          // Apply the value to each instance from Vcf results
          vcfResults.forEach(result => {
            newValues[field][result.instance] = fieldValue;
          });
        } else {
          // Fallback to default 3 instances if no vcfResults
        newValues[field][1] = fieldValue;
        newValues[field][2] = fieldValue;
        newValues[field][3] = fieldValue;
        }
        
        setInstanceValues(newValues);
        // Save after updating instance values
        setTimeout(() => saveInputData(), 0);
      }
    }
  };
  
  // Get current value for a field
  const getFieldValue = (field: string): string => {
    switch(field) {
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
      case 'm': return mValue; // Add this line
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
    gammaC, gammaW, gammaFC, gammaF,
    k1Value, k2Value, k3Value,
    tfcValue,
    tfdValue,
    tdValue,
    hValue, mValue, instanceValues, singleInputFields
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
            {vcfResults && vcfResults.length > 0 ? (
              // Show inputs for each instance from vcfResults
              vcfResults.map(result => (
                <div key={`${fieldId}_${result.instance}`} className="space-y-1">
                  <Label htmlFor={`${fieldId}_${result.instance}`} className="text-sm text-muted-foreground">
                    Instance {result.instance}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`${fieldId}_${result.instance}`}
                      placeholder={`Enter ${label} (${result.instance})`}
                      value={instanceValues[fieldId]?.[result.instance] || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        updateField(fieldId, e.target.value, result.instance)
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
              ))
            ) : (
              // Fallback to default 3 instances if no vcfResults
              [1, 2, 3].map(instance => (
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
              ))
            )}
          </div>
        )}
      </div>
    );
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

  // Add wellType context
  const { wellType } = useWellType();
  
  // Set fixed gammaF value for exploration wells on initial load and when wellType changes
  useEffect(() => {
    if (wellType === 'exploration') {
      setGammaF("1.08");
    }
  }, [wellType]);
  
  const updateGammaF = (value: string) => {
    // For exploration wells, gammaF should be fixed at 1.08
    if (wellType === 'exploration') {
      setGammaF("1.08");
    } else {
      setGammaF(value);
    }
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

  const updateMValue = (value: string) => {
    setMValue(value);
    // Auto-save after changing value
    setTimeout(() => saveInputData(), 0);
  };

  // Helper to get HAD section name from casing result section
  const getHadSectionName = (section: string) => {
    if (section.toLowerCase().includes("production")) return "Production Section";
    if (section.toLowerCase().includes("surface")) return "Surface Section";
    
    // Handle numbered intermediate sections
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavBar />
      <div className="flex-1 overflow-auto">
        {/* Hero section with gradient background */}
        <div className="relative bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/10">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" style={{
            backgroundSize: '20px 20px',
            backgroundImage: `linear-gradient(to right, var(--primary)/20 1px, transparent 1px), 
                            linear-gradient(to bottom, var(--primary)/20 1px, transparent 1px)`
          }} />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">
                  Semantics Design
                </h1>
                <p className="mt-2 text-muted-foreground max-w-xl">
                  Calculate and analyze semantic parameters for well construction and design
                </p>
              </div>
              {/* Visual indicator of process step */}
              <div className="hidden md:flex items-center space-x-2 bg-background/80 backdrop-blur-sm p-2 rounded-lg border border-border/40 shadow-sm">
                <div className="flex space-x-1.5">
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  <div className="h-2 w-6 rounded-full bg-primary"></div>
                </div>
                <span className="text-xs font-medium text-primary">Phase 3</span>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="px-4 sm:px-6 md:px-8 lg:px-10 max-w-7xl mx-auto w-full py-6 md:py-10 space-y-6 md:space-y-8">
          <Tabs defaultValue="inputs" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="grid grid-cols-4 w-full max-w-xl bg-zinc-900 rounded-full overflow-hidden p-0 h-12">
                <TabsTrigger 
                  value="inputs" 
                  className="flex items-center justify-center gap-2 h-full rounded-full
                    data-[state=inactive]:bg-transparent
                    data-[state=inactive]:text-zinc-400
                    data-[state=inactive]:hover:text-zinc-300
                    data-[state=active]:bg-zinc-800
                    data-[state=active]:text-white"
                >
                  <Settings className="h-4 w-4" />
                  <span>Parameters</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="results" 
                  className="flex items-center justify-center gap-2 h-full rounded-full
                    data-[state=inactive]:bg-transparent
                    data-[state=inactive]:text-zinc-400
                    data-[state=inactive]:hover:text-zinc-300
                    data-[state=active]:bg-zinc-800
                    data-[state=active]:text-white"
                >
                  <Calculator className="h-4 w-4" />
                  <span>Results</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="equations" 
                  className="flex items-center justify-center gap-2 h-full rounded-full
                    data-[state=inactive]:bg-transparent
                    data-[state=inactive]:text-zinc-400
                    data-[state=inactive]:hover:text-zinc-300
                    data-[state=active]:bg-zinc-800
                    data-[state=active]:text-white"
                >
                  <FileText className="h-4 w-4" />
                  <span>Equations</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="pump-selection" 
                  className="flex items-center justify-center gap-2 h-full rounded-full
                    data-[state=inactive]:bg-transparent
                    data-[state=inactive]:text-zinc-400
                    data-[state=inactive]:hover:text-zinc-300
                    data-[state=active]:bg-zinc-800
                    data-[state=active]:text-white"
                >
                  <Layers className="h-4 w-4" />
                  <span>Pump</span>
                </TabsTrigger>
              </TabsList>
              
              {(vcfResults.length > 0 || gcResults.length > 0) && (
              <Button 
                  onClick={clearSavedData} 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Clear</span>
              </Button>
              )}
            </div>

            <TabsContent value="inputs" className="mt-0 space-y-4">
                <Card className="border-primary/10 shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/40 border-b border-border/40 flex items-center">
                    <div>
                      <div className="flex items-center space-x-2">
                      <Settings className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg sm:text-xl text-primary/90">Input Parameters</CardTitle>
                      </div>
                    <CardDescription className="mt-1.5">
                      Enter essential parameters for semantics calculations
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid gap-6">
                      {/* Remove this line that renders the Hc field */}
                      {/* {renderInputField('hc', 'Hc Value', hValue, updateHValue, 'm')} */}

                      <div className="grid grid-cols-2 gap-4">
                        {renderInputField('gammaC', 'γc', gammaC, updateGammaC)}
                        <div className="space-y-2">
                        <Label htmlFor="tab-gamma-w" className="text-sm font-medium">γw (fixed at 1)</Label>
                          <Input
                          id="tab-gamma-w"
                            value="1"
                            disabled
                          className="border-border/50 focus:border-primary bg-muted/50"
                          />
                        </div>
                        {renderInputField('gammaFC', 'γfc', gammaFC, updateGammaFC)}
                        {wellType === 'exploration' ? (
  <div className="space-y-2">
    <Label htmlFor="gamma-f" className="text-sm font-medium">γf (fixed at 1.08 for exploration wells)</Label>
    <Input
      id="gamma-f"
      placeholder="Enter γf"
      value="1.08"
      className="focus:ring-1 focus:ring-primary bg-background/80 border-border text-muted-foreground"
      disabled={true}
    />
  </div>
) : (
  renderInputField('gammaF', 'γf', gammaF, updateGammaF)
)}
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
                <CardFooter className="bg-muted/20 px-6 py-4 border-t border-border/30 flex flex-col sm:flex-row gap-2">
                      <Button 
                        onClick={calculateVcf}
                    className="flex-1 bg-primary/80 hover:bg-primary/90 text-primary-foreground shadow-sm gap-2"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        <span>Calculating...</span>
                          </>
                        ) : (
                          <>
                        <Calculator className="h-4 w-4" />
                        <span>Calculate Vcf</span>
                          </>
                        )}
                      </Button>
                    
                    <Button 
                      onClick={calculateGcGc}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-2"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        <span>Calculating...</span>
                        </>
                      ) : (
                        <>
                        <Calculator className="h-4 w-4" />
                        <span>Calculate All</span>
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
            </TabsContent>

            <TabsContent value="results" className="mt-0 space-y-4">
              <Card className="border-primary/10 shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/40 border-b border-border/40 flex items-center">
                            <div>
                    <div className="flex items-center space-x-2">
                      <Calculator className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg sm:text-xl text-primary/90">Vcf Calculation Results</CardTitle>
                            </div>
                    <CardDescription className="mt-1.5">
                      View calculated volume of cement fluid values
                    </CardDescription>
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
                <Card className="border-primary/10 shadow-md overflow-hidden bg-card/50 backdrop-blur-sm mt-6">
                  <CardHeader className="bg-muted/40 border-b border-border/40 flex items-center">
                          <div>
                      <div className="flex items-center space-x-2">
                        <Layers className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg sm:text-xl text-primary/90">Gc/G'c Calculation Results</CardTitle>
                          </div>
                      <CardDescription className="mt-1.5">
                        View cement grade calculation parameters
                      </CardDescription>
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
                              <TableCell className="text-center">{result.ppmax?.toFixed(2) || "N/A"} MPa/10</TableCell>
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
              <Card className="border-primary/10 shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/40 border-b border-border/40 flex items-center">
                            <div>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg sm:text-xl text-primary/90">Calculation Equations</CardTitle>
                            </div>
                    <CardDescription className="mt-1.5">
                      Detailed explanation of the formulas used in calculations
                    </CardDescription>
                          </div>
                          <Button
                    variant="ghost" 
                    size="icon" 
                            onClick={toggleEquationsMinimized}
                    className="ml-auto"
                          >
                    {equationsMinimized ? <Maximize className="h-4 w-4" /> : <Minimize className="h-4 w-4" />}
                          </Button>
                      </CardHeader>
                <CardContent className={cn("transition-all duration-300", equationsMinimized ? "max-h-96" : "max-h-[800px]")}>
                  <ScrollArea className={cn("w-full", equationsMinimized ? "h-96" : "h-[800px]")}>
                    <div className="p-6">
                      {equationHTML ? (
                        <div 
                          dangerouslySetInnerHTML={{ __html: equationHTML }}
                          className="prose prose-sm max-w-none dark:prose-invert"
                        />
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Calculate parameters to view equations and steps</p>
                          </div>
                        )}
                    </div>
                  </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
            <TabsContent value="pump-selection" className="mt-0 space-y-4">
              <Card className="border-primary/10 shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/40 border-b border-border/40 flex items-center">
                            <div>
                    <div className="flex items-center space-x-2">
                      <Layers className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg sm:text-xl text-primary/90">Pump Selection</CardTitle>
                            </div>
                    <CardDescription className="mt-1.5">
                      Find optimal pumps based on calculated parameters
                    </CardDescription>
                          </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="diameter-selection" className="text-base font-medium text-primary">Select Diameter</Label>
                          <div className="flex items-center gap-2">
                            <Label htmlFor="toggle-diameter" className="text-xs text-muted-foreground">
                              Use for all instances
                            </Label>
                            <Switch 
                              id="toggle-diameter"
                              checked={useSingleDiameter}
                              onCheckedChange={setUseSingleDiameter}
                            />
                          </div>
                        </div>
                        
                        {useSingleDiameter ? (
                          <Select
                            value={selectedDiameter.toString()}
                            onValueChange={(value) => setSelectedDiameter(parseFloat(value))}
                          >
                            <SelectTrigger id="diameter-selection" className="w-full focus:ring-1 focus:ring-primary">
                              <SelectValue placeholder="Select pump diameter" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3.5">3.5"</SelectItem>
                              <SelectItem value="4">4"</SelectItem>
                              <SelectItem value="4.5">4.5"</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="space-y-3">
                            {vcfResults.map(result => (
                              <div key={`diameter-${result.instance}`} className="flex items-center gap-3">
                                <Label className="w-24 text-sm">Instance {result.instance}</Label>
                                <Select
                                  value={instanceDiameters[result.instance]?.toString() || "4"}
                                  onValueChange={(value) => updateInstanceDiameter(result.instance, parseFloat(value))}
                                >
                                  <SelectTrigger className="w-full focus:ring-1 focus:ring-primary">
                                    <SelectValue placeholder="Select diameter" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="3.5">3.5"</SelectItem>
                                    <SelectItem value="4">4"</SelectItem>
                                    <SelectItem value="4.5">4.5"</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col justify-end space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Select the appropriate pump diameter for your calculations. Run the process to find the best pump configurations.
                        </p>
                            <Button
                          onClick={processPumpFileSelection} 
                          disabled={isPumpSelectionLoading || gcResults.length === 0} 
                          className="mt-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-2"
                        >
                          {isPumpSelectionLoading ? (
                            <>
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <Calculator className="h-4 w-4" />
                              <span>Run Pump Selection</span>
                            </>
                          )}
                            </Button>
                      </div>
                    </div>
                            
                    <div className="pt-4 border-t border-border/30">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-primary/90">Pump Data</h3>
                            <Button
                          variant="ghost" 
                              size="sm"
                          onClick={togglePumpDataTableMinimized}
                          className="gap-1"
                            >
                          {pumpDataTableMinimized ? "Show Details" : "Hide Details"}
                          {pumpDataTableMinimized ? <Maximize className="h-3.5 w-3.5" /> : <Minimize className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                      
                      {!pumpDataTableMinimized && (
                        <div className="border border-border/30 rounded-md overflow-hidden">
                          <ScrollArea className="h-80 w-full">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Pump Type</TableHead>
                                  <TableHead>Speed</TableHead>
                                  <TableHead>3.5" Pressure</TableHead>
                                  <TableHead>3.5" Flow</TableHead>
                                  <TableHead>4" Pressure</TableHead>
                                  <TableHead>4" Flow</TableHead>
                                  <TableHead>4.5" Pressure</TableHead>
                                  <TableHead>4.5" Flow</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {PUMP_DATA.map((pump, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{pump.type}</TableCell>
                                    <TableCell>{pump.speed}</TableCell>
                                    <TableCell>{pump.pressures["3.5"] !== null ? pump.pressures["3.5"] : "-"}</TableCell>
                                    <TableCell>{pump.flows["3.5"] !== null ? pump.flows["3.5"] : "-"}</TableCell>
                                    <TableCell>{pump.pressures["4"] !== null ? pump.pressures["4"] : "-"}</TableCell>
                                    <TableCell>{pump.flows["4"] !== null ? pump.flows["4"] : "-"}</TableCell>
                                    <TableCell>{pump.pressures["4.5"] !== null ? pump.pressures["4.5"] : "-"}</TableCell>
                                    <TableCell>{pump.flows["4.5"] !== null ? pump.flows["4.5"] : "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                    
                    {/* Pump Results Section */}
                    {pumpResults && pumpResults.length > 0 && (
                      <div className="pt-4 border-t border-border/30">
                        <h3 className="text-lg font-medium text-primary/90 mb-4">Selected Pumps</h3>
                          <div className="space-y-6">
                          {[...new Set(pumpResults.map(pump => pump.instance))].map(instance => {
                            const pumpsForInstance = pumpResults.filter(pump => pump.instance === instance);
                            const recommendedPump = pumpsForInstance.find(pump => pump.isRecommended);
                            
                            return (
                              <div key={`instance-${instance}`} className="border border-border/30 rounded-md overflow-hidden">
                                <div className="bg-muted/30 px-4 py-3 border-b border-border/30">
                                  <h4 className="font-medium">Instance {instance}</h4>
                                </div>
                                <div className="p-4">
                                  {recommendedPump ? (
                                    <div className="space-y-4">
                                      <div className="flex items-center space-x-2">
                                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                          Recommended
                                        </Badge>
                                        <span className="font-medium">{recommendedPump.type}</span>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-background/50 p-2 rounded border border-border/30">
                                          <span className="text-xs text-muted-foreground">Diameter</span>
                                          <p className="font-medium">{recommendedPump.diameter}"</p>
                                        </div>
                                        <div className="bg-background/50 p-2 rounded border border-border/30">
                                          <span className="text-xs text-muted-foreground">Speed</span>
                                          <p className="font-medium">{recommendedPump.speed}</p>
                                        </div>
                                        <div className="bg-background/50 p-2 rounded border border-border/30">
                                          <span className="text-xs text-muted-foreground">Pressure</span>
                                          <p className="font-medium">{recommendedPump.pressure} MPa</p>
                                        </div>
                                        <div className="bg-background/50 p-2 rounded border border-border/30">
                                          <span className="text-xs text-muted-foreground">Flow</span>
                                          <p className="font-medium">{recommendedPump.flow} L/min</p>
                                        </div>
                                      </div>
                                      
                                      {recommendedPump.tfc !== null && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                                          <div className="bg-background/50 p-2 rounded border border-border/30">
                                            <span className="text-xs text-muted-foreground">Cement Fill Time</span>
                                            <p className="font-medium">{recommendedPump.tfc?.toFixed(2) || "0.00"} min</p>
                                          </div>
                                          <div className="bg-background/50 p-2 rounded border border-border/30">
                                            <span className="text-xs text-muted-foreground">Displacement Time</span>
                                            <p className="font-medium">{recommendedPump.tfd?.toFixed(2) || "0.00"} min</p>
                                          </div>
                                          <div className="bg-background/50 p-2 rounded border border-border/30">
                                            <span className="text-xs text-muted-foreground">Total Time</span>
                                            <p className="font-medium">{(recommendedPump.tc || 10).toFixed(2)} min</p>
                                          </div>
                                          <div className="bg-background/50 p-2 rounded border border-border/30">
                                            <span className="text-xs text-muted-foreground">Required Pressure</span>
                                            <p className="font-medium">{recommendedPump.ppmax.toFixed(2)} MPa/10</p>
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div className="grid grid-cols-3 md:grid-cols-3 gap-3 mt-3">
                                        <div className="bg-background/50 p-2 rounded border border-border/30">
                                          <span className="text-xs text-muted-foreground">tfc+tfd</span>
                                          <p className="font-medium">{((recommendedPump?.tfc || 0) + (recommendedPump?.tfd || 0)).toFixed(2)} min</p>
                                        </div>
                                        <div className="bg-background/50 p-2 rounded border border-border/30">
                                          <span className="text-xs text-muted-foreground">Additional Time (td)</span>
                                          <p className="font-medium">10.00 min</p>
                                        </div>
                                        <div className="bg-background/50 p-2 rounded border border-border/30">
                                          <span className="text-xs text-muted-foreground">tc = tfc+tfd + td</span>
                                          <p className="font-medium">{(((recommendedPump?.tfc || 0) + (recommendedPump?.tfd || 0)) + 10).toFixed(2)} min</p>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 md:grid-cols-2 gap-3 mt-2">
                                        <div className="bg-background/50 p-2 rounded border border-border/30">
                                          <span className="text-xs text-muted-foreground">Constant Time (tp)</span>
                                          <p className="font-medium">60.00 min</p>
                                        </div>
                                        <div className="bg-background/50 p-2 rounded border border-border/30">
                                          <span className="text-xs text-muted-foreground">Additional Time (tad)</span>
                                          <p className="font-medium">45.00 min</p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground">No recommended pump found for this instance.</p>
                                  )}
                            </div>
                              </div>
                            );
                          })}
                        </div>
                          </div>
                        )}
                  </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
        </div>
      </div>
    </div>
  );
} 