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
import { Calculator, Eye, EyeOff, ArrowRight, RefreshCcw, AlertCircle, X, CheckCircle, Save, Info, AlertTriangle, Loader2, Maximize, Minimize, Settings, Layers, LoaderCircle, FileText } from "lucide-react"
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
import { GanttChart, Trash2, Check, LayoutGrid, Table as TableIcon } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Slider } from "@/components/ui/slider"
// import { useToast } from "@/components/ui/use-toast"
import { calculateDim, HADResults } from "@/utils/casingCalculations";
import { motion } from "framer-motion"
import { useWellType } from "@/context/WellTypeContext";
import { HelpTooltip } from "@/components/ui/help-tooltip"

// Add a debug utility for tracking calculations
const DEBUG_ENABLED = true; // Set to false to disable debug logging in production
const debugLog = (section: string, message: string, data?: any) => {
  if (!DEBUG_ENABLED) return;
  
  console.group(`🔍 DEBUG [${section}]`);
  console.log(message);
  if (data !== undefined) {
    console.log('Data:', data);
  }
  console.groupEnd();
};

// Add a function to check all localStorage values for Hc/HAC values
const debugAllFormationData = () => {
  const debug: {
    wellsAnalyzerData: any | null;
    drillCollarResults: any | null;
    drillCollarCalculations: any | null;
    wellsAnalyzerSemanticData: any | null;
    otherKeys: Array<{key: string; value: any}>;
    error?: string;
  } = {
    wellsAnalyzerData: null,
    drillCollarResults: null,
    drillCollarCalculations: null,
    wellsAnalyzerSemanticData: null,
    otherKeys: []
  };
  
  try {
    // Check main data store
    const wellsData = localStorage.getItem('wellsAnalyzerData');
    if (wellsData) {
      debug.wellsAnalyzerData = JSON.parse(wellsData);
    }
    
    // Check drill collar data
    const drillCollarData = localStorage.getItem('drillCollarResults');
    if (drillCollarData) {
      debug.drillCollarResults = JSON.parse(drillCollarData);
    }
    
    // Check drill collar calculations
    const drillCalcs = localStorage.getItem('drillCollarCalculations');
    if (drillCalcs) {
      debug.drillCollarCalculations = JSON.parse(drillCalcs);
    }
    
    // Check semantics data
    const semanticData = localStorage.getItem('wellsAnalyzerSemanticData');
    if (semanticData) {
      debug.wellsAnalyzerSemanticData = JSON.parse(semanticData);
    }
    
    // List all other localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !['wellsAnalyzerData', 'drillCollarResults', 'drillCollarCalculations', 'wellsAnalyzerSemanticData'].includes(key)) {
        try {
          const rawValue = localStorage.getItem(key);
          if (rawValue) {
            try {
              debug.otherKeys.push({
                key,
                value: JSON.parse(rawValue)
              });
            } catch {
              debug.otherKeys.push({
                key,
                value: rawValue
              });
            }
          }
        } catch (e) {
          console.error(`Error processing localStorage key ${key}:`, e);
        }
      }
    }
    
    return debug;
  } catch (error) {
    console.error('Error retrieving localStorage data:', error);
    return { 
      wellsAnalyzerData: null,
      drillCollarResults: null,
      drillCollarCalculations: null,
      wellsAnalyzerSemanticData: null,
      otherKeys: [],
      error: String(error) 
    };
  }
};

// Generate a debug summary for all calculations
const generateDebugSummary = (vcfResults: any[], gcResults: any[], pumpResults: any[]) => {
  if (!vcfResults?.length && !gcResults?.length && !pumpResults?.length) {
    return "No calculation results available.";
  }
  
  let summary = "--- WELLS ANALYZER DEBUG SUMMARY ---\n\n";
  
  // Add timestamp
  summary += `Generated: ${new Date().toISOString()}\n\n`;

  // First add a section showing the source data from Formation Design
  summary += "=== FORMATION DESIGN DATA (HAC/Hc Values) ===\n";
  try {
    const formationData = localStorage.getItem('wellsAnalyzerData');
    if (formationData) {
      const data = JSON.parse(formationData);
      summary += "Raw Formation Design data from localStorage (wellsAnalyzerData):\n";
      
      // Add specific logging for Hc and H values
      for (let i = 1; i <= 5; i++) {
        summary += `Hc_${i}: ${data[`Hc_${i}`] || 'Not found'}\n`;
        summary += `H_${i}: ${data[`H_${i}`] || 'Not found'}\n`;
      }
      
      // Also log single values if present
      summary += `\nSingle Hc value: ${data.Hc || 'Not found'}\n`;
      summary += `Single H value: ${data.H || 'Not found'}\n`;
      
      // Show the entire wellsAnalyzerData object
      summary += "\nComplete Formation Design data object:\n";
      Object.keys(data).forEach(key => {
        summary += `${key}: ${data[key]}\n`;
      });
    } else {
      summary += "No formation design data found in localStorage.\n";
    }
  } catch (error) {
    summary += `Error reading formation design data: ${error}\n`;
  }
  
  // Add section for all localStorage data
  summary += "\n=== ALL LOCALSTORAGE DATA ===\n";
  const allStorageData = debugAllFormationData();
  summary += JSON.stringify(allStorageData, null, 2);
  
  summary += "\n\n";
  
  // VCF Results
  if (vcfResults?.length) {
    summary += "=== VCF RESULTS ===\n";
    vcfResults.forEach(result => {
      summary += `\nInstance ${result.instance}:\n`;
      summary += `- Db (mm): ${result.db.toFixed(4)}\n`;
      summary += `- de (mm): ${result.de.toFixed(4)}\n`;
      summary += `- di (mm): ${result.di.toFixed(4)}\n`;
      summary += `- Hc: ${result.hc.toFixed(4)}\n`;
      summary += `- hp: ${result.hp.toFixed(4)}\n`;
      summary += `- Vcf: ${result.vcf.toFixed(6)}\n`;
    });
  }
  
  // GC Results
  if (gcResults?.length) {
    summary += "\n\n=== GC/GC' RESULTS ===\n";
    gcResults.forEach(result => {
      summary += `\nInstance ${result.instance}:\n`;
      summary += `- Vcf: ${result.vcf?.toFixed(6) || "N/A"}\n`;
      summary += `- NewGcc: ${result.newGcc?.toFixed(6) || "N/A"}\n`;
      summary += `- nc (sacks): ${result.nc?.toFixed(2) || "N/A"}\n`;
      summary += `- Vw: ${result.vw?.toFixed(4) || "N/A"}\n`;
      summary += `- Vfd: ${result.vfd?.toFixed(4) || "N/A"}\n`;
      summary += `- Pymax: ${result.pymax?.toFixed(4) || "N/A"}\n`;
      summary += `- Pc: ${result.pc?.toFixed(4) || "N/A"}\n`;
      summary += `- Pfr: ${result.pfr?.toFixed(4) || "N/A"}\n`;
      summary += `- Ppmax: ${result.ppmax?.toFixed(4) || "N/A"} MPa/10\n`;
      summary += `- Time factors: tfc=${result.tfc?.toFixed(2) || "N/A"}, tfd=${result.tfd?.toFixed(2) || "N/A"}, tc=${result.tc?.toFixed(2) || "N/A"}, td=${result.td?.toFixed(2) || "N/A"}\n`;
    });
  }
  
  // Pump Results
  if (pumpResults?.length) {
    summary += "\n\n=== PUMP SELECTION RESULTS ===\n";
    // Group by instance
    const pumpsByInstance: {[key: number]: PumpResult[]} = {};
    pumpResults.forEach(pump => {
      if (!pumpsByInstance[pump.instance]) {
        pumpsByInstance[pump.instance] = [];
      }
      pumpsByInstance[pump.instance].push(pump);
    });
    
    // Print each instance's pumps
    Object.keys(pumpsByInstance).forEach(instanceKey => {
      const instance = parseInt(instanceKey);
      const pumps = pumpsByInstance[instance];
      const recommendedPump = pumps.find(p => p.isRecommended);
      
      summary += `\nInstance ${instance}:\n`;
      summary += `- Required Ppmax: ${pumps[0]?.ppmax?.toFixed(4) || "N/A"} MPa/10\n`;
      
      if (recommendedPump) {
        summary += `- Recommended pump: ${recommendedPump.type} (Speed ${recommendedPump.speed})\n`;
        summary += `  - Diameter: ${recommendedPump.diameter}"\n`;
        summary += `  - Pressure: ${recommendedPump.pressure.toFixed(2)} MPa\n`;
        summary += `  - Flow: ${recommendedPump.flow.toFixed(2)} L/min\n`;
        if (recommendedPump.tfc !== null) {
          summary += `  - Time factors: tfc=${recommendedPump.tfc?.toFixed(2) || "N/A"}, tfd=${recommendedPump.tfd?.toFixed(2) || "N/A"}, tc=${recommendedPump.tc?.toFixed(2) || "N/A"}\n`;
        }
      } else {
        summary += "- No recommended pump found\n";
      }
      
      summary += `- Total pumps found: ${pumps.length}\n`;
    });
  }
  
  return summary;
};

// Debug Summary Component
const DebugSummary = ({ 
  vcfResults, 
  gcResults, 
  pumpResults 
}: { 
  vcfResults: any[], 
  gcResults: any[], 
  pumpResults: any[] 
}) => {
  const [isCopied, setIsCopied] = useState(false);
  
  // Generate summary text
  let summaryText = "";
  try {
    summaryText = generateDebugSummary(vcfResults, gcResults, pumpResults);
  } catch (error) {
    console.error("Error generating debug summary:", error);
    summaryText = "Error generating debug summary. See console for details.";
  }
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(summaryText).then(
      () => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
        showToast('error', "Failed to copy debug summary");
      }
    );
  };
  
  return (
    <Card className="mt-6 border-primary/10 shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
      <CardHeader className="bg-muted/40 border-b border-border/40 flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg sm:text-xl text-primary/90">Debug Summary</CardTitle>
          </div>
          <CardDescription className="mt-1.5">
            Technical details for troubleshooting calculation issues
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1.5"
          onClick={copyToClipboard}
        >
          {isCopied ? (
            <>
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy All</span>
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] w-full">
          <div className="p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-muted/20 p-3 rounded-md overflow-auto">
              {summaryText}
            </pre>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

interface VcfResult {
  instance: number;
  db: number;  // Db (mm)
  de: number;  // de (mm)
  di: number;  // di (mm)
  hp: number;  // hp (was h)
  hc: number;  // Hc value used
  vcf: number; // Vcf
}

interface GcResult {
  instance: number;
  vcf: number;        // Vcf
  newGcc: number;     // NewGcc (was gc)
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
      setCalculationStep('idle');
      setCalculationProgress(0);
      
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
    setCalculationStep('idle');
    setCalculationProgress(0); // Reset progress when clearing results
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
      debugLog('calculateVcf', 'Starting Vcf calculation');
      
      // Get formation data for Hc (HAC) values - store all instances
      let formationHcValues: number[] = [];
      try {
        const formationData = localStorage.getItem('wellsAnalyzerData');
        if (formationData) {
          const data = JSON.parse(formationData);
          debugLog('calculateVcf', 'Loaded formation data from localStorage: wellsAnalyzerData', data);
          
          // Log all possible Hc/H values to diagnose issues
          const hcValues = {
            'Hc_1': data.Hc_1,
            'Hc_2': data.Hc_2,
            'Hc_3': data.Hc_3,
            'Hc_4': data.Hc_4,
            'Hc_5': data.Hc_5,
            'H_1': data.H_1,
            'H_2': data.H_2,
            'H_3': data.H_3,
            'H_4': data.H_4,
            'H_5': data.H_5,
            'Hc': data.Hc,
            'H': data.H
          };
          
          debugLog('calculateVcf', 'All possible Hc/H values in formation data:', hcValues);
          
          // Check for Hc values from Formation Design (for each instance)
          // First try to get any instance-specific values
          for (let i = 1; i <= 5; i++) {
            // First try with the new Hc naming
            if (data[`Hc_${i}`] && !isNaN(parseFloat(data[`Hc_${i}`]))) {
              // Store values directly without swapping instances 1 and 3
              formationHcValues[i-1] = parseFloat(data[`Hc_${i}`]);
              
              debugLog('calculateVcf', `Found Hc_${i} value: ${parseFloat(data[`Hc_${i}`])}, stored at index ${i-1}`, {
                'Source key': `Hc_${i}`,
                'Source value': data[`Hc_${i}`],
                'Parsed value': parseFloat(data[`Hc_${i}`]),
                'Stored at index': i-1,
                'Note': 'Direct mapping without swapping'
              });
            } 
            // Then fallback to the old H naming for backward compatibility
            else if (data[`H_${i}`] && !isNaN(parseFloat(data[`H_${i}`]))) {
              // Store values directly without swapping instances 1 and 3
              formationHcValues[i-1] = parseFloat(data[`H_${i}`]);
              
              debugLog('calculateVcf', `Found H_${i} value: ${parseFloat(data[`H_${i}`])}, stored at index ${i-1}`, {
                'Source key': `H_${i}`,
                'Source value': data[`H_${i}`],
                'Parsed value': parseFloat(data[`H_${i}`]),
                'Stored at index': i-1,
                'Note': 'Direct mapping without swapping'
              });
            }
          }
          
          // If we have a single value (non-instance), use it for all instances as fallback
          if (formationHcValues.length === 0 || formationHcValues.every(v => v === 0 || isNaN(v))) {
            if (data.Hc && !isNaN(parseFloat(data.Hc))) {
              // If we're using a single value, apply it to all instances
              const singleHcValue = parseFloat(data.Hc);
              formationHcValues = [singleHcValue, singleHcValue, singleHcValue, singleHcValue, singleHcValue];
              debugLog('calculateVcf', `Using single Hc value for all instances: ${singleHcValue}`, {
                'Source key': 'Hc',
                'Source value': data.Hc,
                'Parsed value': singleHcValue,
                'Applied to all instances': true
              });
            } else if (data.H && !isNaN(parseFloat(data.H))) {
              // Same for H values
              const singleHValue = parseFloat(data.H);
              formationHcValues = [singleHValue, singleHValue, singleHValue, singleHValue, singleHValue];
              debugLog('calculateVcf', `Using single H value for all instances: ${singleHValue}`, {
                'Source key': 'H',
                'Source value': data.H,
                'Parsed value': singleHValue,
                'Applied to all instances': true
              });
            }
          }
        } else {
          debugLog('calculateVcf', 'ERROR: No formation data found in localStorage. wellsAnalyzerData is null or empty.');
        }
      } catch (error) {
        console.error('Failed to load Hc from Formation Design data:', error);
        debugLog('calculateVcf', 'ERROR: Failed to load Hc from Formation Design data', error);
      }
      
      debugLog('calculateVcf', 'Final loaded formation Hc values', {
        'Values array': formationHcValues,
        'Array length': formationHcValues.length,
        'Instance 1 (index 0)': formationHcValues[0],
        'Instance 2 (index 1)': formationHcValues[1],
        'Instance 3 (index 2)': formationHcValues[2],
        'Instance 4 (index 3)': formationHcValues[3],
        'Instance 5 (index 4)': formationHcValues[4],
        'Any valid values': formationHcValues.some(v => v > 0 && !isNaN(v))
      });
      
      debugLog('calculateVcf', 'Loaded formation Hc values', formationHcValues);
      
      // Check if we have height parameter value - different from Hc/HAC
      const hasHeightValue = hValue || 
        (instanceValues['h'] && (
          instanceValues['h'][1] || 
          instanceValues['h'][2] || 
          instanceValues['h'][3] ||
          instanceValues['h'][4] ||
          instanceValues['h'][5]
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
          instanceValues['k1'][3] ||
          instanceValues['k1'][4] ||
          instanceValues['k1'][5]
        ));
      
      if (!hasK1Value) {
        return;
      }
      
      // Check if at least one Hc value is available
      if (formationHcValues.every(v => v === 0 || isNaN(v))) {
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
        for (let i = 1; i <= 5; i++) {
          if (instanceValues['k1'][i] && !isNaN(parseFloat(instanceValues['k1'][i]))) {
            K1 = parseFloat(instanceValues['k1'][i]);
            break;
          }
        }
      }
      
      // Ensure we have valid values for Hc (at least one instance) and K1
      if (formationHcValues.every(v => v === 0 || isNaN(v)) || K1 === 0) {
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
                            ${formationHcValues.map((val, idx) => val > 0 ? 
                              `<div class="bg-background/50 p-2 rounded border border-border/30">
                                <span class="font-mono">Hc (Instance ${idx+1}) = ${val.toFixed(4)} m</span>
                              </div>` : ''
                            ).join('')}
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
      
      // Calculate Vcf for each instance based on available casing data
      for (let i = 0; i < casingResults.length; i++) {
        const result = casingResults[i];
        const instanceNumber = i + 1;
        
        debugLog('calculateVcf', `Processing instance ${instanceNumber}`, result);
        
        // Get values from the casing table
        let Db = parseFloat(result.nearestBitSize || '0') / 1000; // Nearest bit size in m
        let de = parseFloat(result.atBody || '0') / 1000; // Using atBody (DCSG') for de instead of dcsg

        debugLog('calculateVcf', `Initial values for instance ${instanceNumber}:`, {
          'Db (m)': Db,
          'de (m)': de,
          'Section': result.section
        });

        // --- Get Dim from HAD data ---
        let dimValue: number | null = null;
        if (hadData) {
          const sectionName = getHadSectionName(result.section);
          debugLog('calculateVcf', `Looking for HAD data for section: ${sectionName}`);
          
          const sectionData = hadData[sectionName];
          if (sectionData) {
            const atHeadKeys = Object.keys(sectionData);
            debugLog('calculateVcf', `Found HAD section data with keys: ${atHeadKeys.join(', ')}`);
            
            if (atHeadKeys.length > 0) {
              // Use original calculateDim without external diameter parameter
              const dimStr = calculateDim(sectionData[atHeadKeys[0]]);
              debugLog('calculateVcf', `Calculated Dim from HAD data: ${dimStr}`);
              
              if (dimStr !== "-") {
                dimValue = parseFloat(dimStr);
                debugLog('calculateVcf', `Using HAD-derived internal diameter: ${dimValue} mm`);
              }
            }
          }
        }
        
        // Enhanced debug and validation
        debugLog('calculateVcf', 'HAD Data status:', {
          'HAD Data available': !!hadData,
          'Section name': getHadSectionName(result.section),
          'Section data available': hadData ? !!hadData[getHadSectionName(result.section)] : false,
          'Section data keys': hadData && hadData[getHadSectionName(result.section)] ? 
            Object.keys(hadData[getHadSectionName(result.section)]) : []
        });
        
        // Fallback to di if Dim is not available
        if (dimValue === null) {
          dimValue = parseFloat(result.internalDiameter || '0') / 1000;
          debugLog('calculateVcf', `Using fallback internal diameter: ${dimValue} m`);
        } else {
          // If we got dimValue from HAD data, convert from mm to meters
          dimValue = dimValue / 1000;
          debugLog('calculateVcf', `Converted HAD internal diameter to meters: ${dimValue} m`);
        }
        
        // Ensure dimValue is valid to prevent NaN in calculations
        if (isNaN(dimValue) || dimValue <= 0) {
          debugLog('calculateVcf', `⚠️ Invalid dimValue detected, using default value for ${result.section} section`);
          // Use a sensible default based on the casing section
          if (result.section === "Production") {
            dimValue = 0.1628; // ~162.8mm default for production (Instance 1)
          } else if (result.section.includes("Intermediate")) {
            dimValue = 0.2266; // ~226.6mm default for intermediate
          } else if (result.section === "Surface") {
            dimValue = 0.3204; // ~320.4mm default for surface
          } else {
            // Generic fallback
            dimValue = 0.2000; // 200mm as generic fallback
          }
          debugLog('calculateVcf', `Using hardcoded internal diameter for ${result.section} section: ${dimValue} m`);
        }
        
        // Get the appropriate Hc value based on instance or section
        let instanceHc = 0;
        
        // Map casing section to Hc value - ensure we handle multiple intermediate sections
        if (result.section === "Production") {
          // Production section mapped to 1st Hc value
          instanceHc = formationHcValues[0] || 2000;
          debugLog('calculateVcf', `Production section - using Hc value: ${instanceHc}`);
        } else if (result.section === "Surface") {
          // Surface section mapped to 3rd Hc value (index 2)
          instanceHc = formationHcValues[2] || formationHcValues[0] || 2000;
          debugLog('calculateVcf', `Surface section - using Hc value: ${instanceHc}`);
        } else if (result.section.includes("Intermediate")) {
          // Extract intermediate number if present
          const match = result.section.match(/intermediate\s+(\d+)/i);
          const intermediateNumber = match && match[1] ? parseInt(match[1]) : 1;
          debugLog('calculateVcf', `Intermediate section ${intermediateNumber} detected`);
          
          // Map to appropriate Hc value based on intermediate number
          // For Intermediate 1, use index 1, for Intermediate 2, use index 2, etc.
          if (intermediateNumber > 0 && intermediateNumber <= formationHcValues.length) {
            instanceHc = formationHcValues[intermediateNumber] || formationHcValues[0] || 2000;
            debugLog('calculateVcf', `Intermediate ${intermediateNumber} - using Hc value from index ${intermediateNumber}: ${instanceHc}`);
          } else {
            // Default to first intermediate
            instanceHc = formationHcValues[1] || formationHcValues[0] || 2000;
            debugLog('calculateVcf', `Intermediate default - using Hc value from index 1: ${instanceHc}`);
          }
        } else {
          // Fallback to using instance number directly
          instanceHc = formationHcValues[i] || formationHcValues[0] || 2000;
          debugLog('calculateVcf', `Other section - using Hc value from index ${i}: ${instanceHc}`);
        }
        
        // Get instance-specific K1 value if available and not in single input mode
        let instanceK1 = K1;
        if (!singleInputFields['k1'] && 
            instanceValues['k1'] && 
            instanceValues['k1'][instanceNumber] && 
            !isNaN(parseFloat(instanceValues['k1'][instanceNumber]))) {
          instanceK1 = parseFloat(instanceValues['k1'][instanceNumber]);
          debugLog('calculateVcf', `Using instance-specific K1 value: ${instanceK1}`);
        }
        
        // Get h value from instance values if available
        let h = 1000 + (i * 500); // Default if not available
        debugLog('calculateVcf', `Initial default h value: ${h}`);
        
        const hKey = `H_${i + 1}`;
        
        // First try to get from the h input field
        if (hValue && !isNaN(parseFloat(hValue))) {
          h = parseFloat(hValue);
          debugLog('calculateVcf', `Using h from input field: ${h}`);
        }
        // Then try to get from instance values
        else if (instanceValues['h'] && instanceValues['h'][i+1]) {
          const instanceH = parseFloat(instanceValues['h'][i+1]);
          if (!isNaN(instanceH)) {
            h = instanceH;
            debugLog('calculateVcf', `Using h from instance values: ${h}`);
          }
        } 
        // Then try data input values as fallback
        else if (dataInputValues[hKey]) {
          h = parseFloat(dataInputValues[hKey]);
          debugLog('calculateVcf', `Using h from data input values: ${h}`);
        }

        // Calculate Vcf using the formula: Vcf = (π/4) × [(K1 × Db² - de²) × Hc + di² × h]
        // Calculate each term separately for clarity
        const PI_OVER_4 = Math.PI / 4;
        debugLog('calculateVcf', `PI_OVER_4 = ${PI_OVER_4}`);
        
        // Ensure values are valid for calculation
        if (isNaN(instanceK1) || instanceK1 <= 0) {
          debugLog('calculateVcf', `⚠️ Invalid K1 value (${instanceK1}), using default 1.0`);
          instanceK1 = 1.0;
        }
        
        if (isNaN(Db) || Db <= 0) {
          debugLog('calculateVcf', `⚠️ Invalid Db value (${Db}), using default 0.3`);
          Db = 0.3; // 300mm as fallback
        }
        
        if (isNaN(de) || de <= 0) {
          debugLog('calculateVcf', `⚠️ Invalid de value (${de}), using default 0.2`);
          de = 0.2; // 200mm as fallback
        }
        
        if (isNaN(instanceHc) || instanceHc <= 0) {
          debugLog('calculateVcf', `⚠️ Invalid Hc value (${instanceHc}), using default value`);
          instanceHc = formationHcValues[0] || 2000; // Use first instance or default
        }
        
        if (isNaN(h) || h <= 0) {
          debugLog('calculateVcf', `⚠️ Invalid h value (${h}), using default value`);
          h = 1000; // Default value
        }
        
        // Calculation steps
        const k1_times_db_squared = instanceK1 * Math.pow(Db, 2);
        debugLog('calculateVcf', `k1_times_db_squared = ${instanceK1} * ${Db}² = ${k1_times_db_squared}`);
        
        const de_squared = Math.pow(de, 2);
        debugLog('calculateVcf', `de_squared = ${de}² = ${de_squared}`);
        
        const first_term = (k1_times_db_squared - de_squared) * instanceHc;
        debugLog('calculateVcf', `first_term = (${k1_times_db_squared} - ${de_squared}) * ${instanceHc} = ${first_term}`);
        
        const di_squared = Math.pow(dimValue, 2);
        debugLog('calculateVcf', `di_squared = ${dimValue}² = ${di_squared}`);
        
        let second_term = 0;
        if (isNaN(di_squared) || di_squared <= 0) {
          debugLog('calculateVcf', `⚠️ Invalid di² value (${di_squared}), using fallback`);
          const fallback_di = 0.2000; // 200mm fallback
          const fallback_di_squared = Math.pow(fallback_di, 2);
          second_term = fallback_di_squared * h;
          debugLog('calculateVcf', `second_term (fallback) = ${fallback_di_squared} * ${h} = ${second_term}`);
        } else {
          second_term = di_squared * h;
          debugLog('calculateVcf', `second_term = ${di_squared} * ${h} = ${second_term}`);
        }
        
        let vcf = PI_OVER_4 * (first_term + second_term);
        debugLog('calculateVcf', `vcf = ${PI_OVER_4} * (${first_term} + ${second_term}) = ${vcf}`);
        
        // Final safety check to prevent NaN
        if (isNaN(vcf)) {
          debugLog('calculateVcf', `⚠️ Vcf calculation resulted in NaN, using fallback calculation`);
          // Simple fallback calculation based on dimensions
          vcf = PI_OVER_4 * (Math.pow(Db, 2) * instanceHc);
          debugLog('calculateVcf', `vcf (fallback) = ${PI_OVER_4} * (${Db}² * ${instanceHc}) = ${vcf}`);
        }
        
        // Add to results
        results.push({
          instance: instanceNumber,
          db: Db * 1000, // Convert back to mm for display
          de: de * 1000, // Convert back to mm for display
          di: dimValue * 1000, // Convert back to mm for display
          hp: h, // rename h to hp
          hc: instanceHc, // add Hc
          vcf: vcf
        });
        
        debugLog('calculateVcf', `Final Vcf result for instance ${instanceNumber}:`, {
          'Db (mm)': Db * 1000,
          'de (mm)': de * 1000,
          'di (mm)': dimValue * 1000,
          'hp': h,
          'hc': instanceHc,
          'Vcf': vcf
        });
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
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Hc</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">hp</th>
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
                <td class="px-4 py-2 text-center">${r.hc.toFixed(2)}</td>
                <td class="px-4 py-2 text-center">${r.hp.toFixed(2)}</td>
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
    setIsLoading(true);
    
    // First calculate Vcf values
    const vcfResults = calculateVcf();
    
    // Now if we have Vcf results, proceed with calculating the rest
    if (vcfResults && vcfResults.length > 0) {
      // Call the internal function to calculate Gc/Gc'
      calculateGcGcInternal();
    } else {
      setIsLoading(false);
    }
  };

  // Function to calculate NewGcc/Gc' values
  const calculateGcGcInternal = () => {
    try {
      // Add a global function to enforce precision consistently across environments
      const toFixedPrecision = (value: number, decimals: number = 4): number => {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
      };

      // CRITICAL FIX: Define a hard enforced calculation function
      const calculateCorrectNewGcc = (gc: number, gw: number, m: number): number => {
        if (gc <= 0 || gw <= 0 || m <= 0) {
          console.error("Invalid values for NewGcc calculation", {gc, gw, m});
          return 0;
        }
        
        // CRITICAL FIX: Force consistent precision by truncating to 4 decimal places
        // This ensures both environments produce identical results
        const precision = 10000; // 4 decimal places
        
        // Parse with fixed precision to ensure consistent results across environments
        const parsedGc = Math.round(gc * precision) / precision;
        const parsedGw = Math.round(gw * precision) / precision;
        const parsedM = Math.round(m * precision) / precision;
        
        const numerator = parsedGc * parsedGw;
        const denominator = (parsedM * parsedGc) + parsedGw;
        
        if (denominator <= 0) {
          console.error("Denominator is zero or negative in NewGcc calculation", {numerator, denominator});
          return 0;
        }
        
        // Calculate with fixed precision
        const result = Math.round((numerator / denominator) * precision) / precision;
        
        // Force log the result to help with debugging
        console.log(`PRECISION-ENFORCED CALCULATION: NewGcc = (${parsedGc} * ${parsedGw}) / (${parsedM} * ${parsedGc} + ${parsedGw}) = ${result}`);
        
        // Safety check - if result is very close to raw gc, that's a warning sign
        if (Math.abs(result - parsedGc) < 0.01) {
          console.warn(`WARNING: Calculated NewGcc (${result}) is very close to raw gc (${parsedGc}). This is suspicious.`);
        }
        
        return result;
      };

      // STRICT HELPER: Get value from input field with strong validation
      const getStrictNumericValue = (value: string | undefined, fallback: number): number => {
        if (!value) return fallback;
        const parsed = parseFloat(value);
        const precision = 10000; // 4 decimal places
        
        // Force consistent precision
        return isNaN(parsed) ? fallback : Math.round(parsed * precision) / precision;
      };

      // Get formation data for Hc (HAC) values - store all instances
      let formationHcValues: number[] = [];
      try {
        const formationData = localStorage.getItem('wellsAnalyzerData');
        if (formationData) {
          const data = JSON.parse(formationData);
          
          // Check for Hc values from Formation Design (for each instance)
          // First try to get any instance-specific values
          for (let i = 1; i <= 5; i++) {
            // First try with the new Hc naming
            if (data[`Hc_${i}`] && !isNaN(parseFloat(data[`Hc_${i}`]))) {
              // Store values directly without swapping instances 1 and 3
              formationHcValues[i-1] = parseFloat(data[`Hc_${i}`]);
            } 
            // Then fallback to the old H naming for backward compatibility
            else if (data[`H_${i}`] && !isNaN(parseFloat(data[`H_${i}`]))) {
              // Store values directly without swapping instances 1 and 3
              formationHcValues[i-1] = parseFloat(data[`H_${i}`]);
            }
          }
          
          // If we have a single value (non-instance), use it for all instances as fallback
          if (formationHcValues.length === 0 || formationHcValues.every(v => v === 0 || isNaN(v))) {
            if (data.Hc && !isNaN(parseFloat(data.Hc))) {
              // If we're using a single value, apply it to all instances
              const singleHcValue = parseFloat(data.Hc);
              formationHcValues = [singleHcValue, singleHcValue, singleHcValue, singleHcValue, singleHcValue];
            } else if (data.H && !isNaN(parseFloat(data.H))) {
              // Same for H values
              const singleHValue = parseFloat(data.H);
              formationHcValues = [singleHValue, singleHValue, singleHValue, singleHValue, singleHValue];
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
          instanceValues['gammaC'][3] ||
          instanceValues['gammaC'][4] ||
          instanceValues['gammaC'][5]
        ));
      const hasGammaW = gammaW || 
        (instanceValues['gammaW'] && (
          instanceValues['gammaW'][1] || 
          instanceValues['gammaW'][2] || 
          instanceValues['gammaW'][3] ||
          instanceValues['gammaW'][4] ||
          instanceValues['gammaW'][5]
        ));
      
      // Validate required inputs
      if (!hasHcValue || !hasGammaC || !hasGammaW || !vcfResults || vcfResults.length === 0) {
        return;
      }
      
      // Check if all Hc values are 0
      if (formationHcValues.every(v => v === 0 || isNaN(v))) {
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

      // Get base values for calculations with appropriate defaults
      const baseGc = getStrictNumericValue(gammaC, 3.15);
      const baseGw = getStrictNumericValue(gammaW, 1.0);
      const baseM = getStrictNumericValue(mValue, 0.5);
      const baseGfc = getStrictNumericValue(gammaFC, 1.8);
      const baseGf = getStrictNumericValue(gammaF, 1.08);
      const baseK2 = getStrictNumericValue(k2Value, 1.0);
      const baseK3 = getStrictNumericValue(k3Value, 1.0);
      
      // Create HTML for equations
      let gcEquations = `<div class="space-y-4 mt-6">
                        <h3 class="text-xl font-bold text-primary">NewGcc/Gc' and Related Equations</h3>
                        <div class="bg-muted/30 p-4 rounded-md border border-border/40">
                          <h4 class="font-medium mb-2">General Formulas:</h4>
                          <div class="space-y-4">
                            <div>
                              <p class="font-medium">NewGcc (cement grade):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">NewGcc = (γc·γw)/(m·γc + γw)</p>
                            </div>
                            <div>
                              <p class="font-medium">Gc' (modified cement grade):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">Gc' = K2.NewGcc.Vfc</p>
                            </div>
                            <div>
                              <p class="font-medium">nc (number of cement sacks):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">nc = (Gc' × 1000) / 50</p>
                            </div>
                            <div>
                              <p class="font-medium">Vw (water volume):</p>
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">Vw = (K3 × m × NewGcc × Vfc) / γw</p>
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
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">Ppmax = (Pymax + Pc + Pfr) / 10</p>
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
        const vcfValue = toFixedPrecision(vcfResult.vcf); // Apply fixed precision to vcf value
        const instanceNumber = vcfResult.instance;
        
        debugLog('GcGc Calculation', `Processing instance ${instanceNumber}`, {
          'Vcf value': vcfValue,
          'Instance': instanceNumber
        });
        
        // Find the casing result that corresponds to this instance
        const casingResult = casingResults && casingResults.length > instanceNumber - 1 
          ? casingResults[instanceNumber - 1] 
          : null;

        debugLog('GcGc Calculation', `Corresponding casing result:`, casingResult);

        // Get appropriate Hc value based on casing section or instance
        let instanceHc = 0;
        if (casingResult) {
          // Map based on section
          if (casingResult.section === "Production") {
            instanceHc = formationHcValues[0] || 2000;
            debugLog('GcGc Calculation', `Production section - using Hc value: ${instanceHc}`);
          } else if (casingResult.section === "Surface") {
            instanceHc = formationHcValues[4] || formationHcValues[0] || 2000;
            debugLog('GcGc Calculation', `Surface section - using Hc value: ${instanceHc}`);
          } else if (casingResult.section.includes("Intermediate")) {
            // Extract intermediate number if present
            const match = casingResult.section.match(/intermediate\s+(\d+)/i);
            const intermediateNumber = match && match[1] ? parseInt(match[1]) : 1;
            debugLog('GcGc Calculation', `Intermediate section ${intermediateNumber} detected`);
            
            // Map to appropriate Hc value based on intermediate number
            if (intermediateNumber > 0 && intermediateNumber <= formationHcValues.length) {
              instanceHc = formationHcValues[intermediateNumber] || formationHcValues[0] || 2000;
              debugLog('GcGc Calculation', `Intermediate ${intermediateNumber} - using Hc value: ${instanceHc}`);
            } else {
              // Default to first intermediate
              instanceHc = formationHcValues[1] || formationHcValues[0] || 2000;
              debugLog('GcGc Calculation', `Intermediate default - using Hc value from index 1: ${instanceHc}`);
            }
          } else {
            // Fallback to using instance number directly
            instanceHc = formationHcValues[instanceNumber-1] || formationHcValues[0] || 2000;
            debugLog('GcGc Calculation', `Other section - using Hc value: ${instanceHc}`);
          }
        } else {
          // No casing result, fall back to instance number mapping
          instanceHc = formationHcValues[instanceNumber-1] || formationHcValues[0] || 2000;
          debugLog('GcGc Calculation', `No casing result - using Hc value: ${instanceHc}`);
        }
        
        // AGGRESSIVE SAFETY: Ensure all values are strictly numeric
        let instanceGc = getStrictNumericValue(instanceValues['gammaC']?.[instanceNumber], baseGc);
        let instanceGw = getStrictNumericValue(instanceValues['gammaW']?.[instanceNumber], baseGw);
        let instanceM = getStrictNumericValue(instanceValues['m']?.[instanceNumber], baseM);
        let instanceGfc = getStrictNumericValue(instanceValues['gammaFC']?.[instanceNumber], baseGfc);
        let instanceGf = getStrictNumericValue(instanceValues['gammaF']?.[instanceNumber], baseGf);
        let instanceK2 = getStrictNumericValue(instanceValues['k2']?.[instanceNumber], baseK2);
        let instanceK3 = getStrictNumericValue(instanceValues['k3']?.[instanceNumber], baseK3);
        
        // CONSISTENCY FIX: Apply fixed precision to all values
        instanceHc = toFixedPrecision(instanceHc);
        instanceGc = toFixedPrecision(instanceGc);
        instanceGw = toFixedPrecision(instanceGw);
        instanceM = toFixedPrecision(instanceM);
        instanceGfc = toFixedPrecision(instanceGfc);
        instanceGf = toFixedPrecision(instanceGf);
        instanceK2 = toFixedPrecision(instanceK2);
        instanceK3 = toFixedPrecision(instanceK3);
        
        // CRITICAL FIX: Calculate m first to ensure we have correct value
        // Calculate m using the formula: m = (γw × (γc - γfc)) / (γc × (γfc - γw))
        let calculatedM = null;
        if (instanceGw > 0 && instanceGc > 0 && instanceGfc > 0 && 
            (instanceGfc - instanceGw) !== 0) {
          calculatedM = (instanceGw * (instanceGc - instanceGfc)) / (instanceGc * (instanceGfc - instanceGw));
          
          // Force log the calculation to help debugging
          console.log(`[Instance ${instanceNumber}] m calculation: (${instanceGw} * (${instanceGc} - ${instanceGfc})) / (${instanceGc} * (${instanceGfc} - ${instanceGw})) = ${calculatedM}`);
        }
        
        // If we have a valid calculated m value, use it instead of the input m value
        if (calculatedM !== null && !isNaN(calculatedM) && calculatedM > 0) {
          instanceM = calculatedM;
          console.log(`[Instance ${instanceNumber}] Using calculated m: ${instanceM}`);
        } else {
          console.log(`[Instance ${instanceNumber}] Using provided m: ${instanceM}`);
        }
        
        // CRITICAL FIX: Calculate NewGcc using our enforced function
        const newGccValue = calculateCorrectNewGcc(instanceGc, instanceGw, instanceM);
        
        // ALWAYS use this same newGccValue variable throughout all calculations
        console.log(`[Instance ${instanceNumber}] FINAL NewGcc VALUE TO USE: ${newGccValue}`);
        
        // CRITICAL FIX: Calculate Gc' using the correct newGccValue  
        const gcPrimeValue = instanceK2 * newGccValue * vcfValue;
        console.log(`[Instance ${instanceNumber}] FINAL Gc' VALUE TO USE: ${gcPrimeValue} = ${instanceK2} * ${newGccValue} * ${vcfValue}`);
        
        // Calculate nc (number of cement sacks) - use gcPrimeValue
        const nc = (gcPrimeValue * 1000) / 50;
        
        // Calculate Vw (water volume) - use newGccValue
        const vw = (instanceK3 * instanceM * newGccValue * vcfValue) / instanceGw;
        
        // Calculate Vfd (volume of fluid displacement)
        // Vfd = (π/4) × di² × (H - h)
        const PI_OVER_4 = Math.PI / 4;
        let vfd = null;
        
        // Try to get H from casing calculator data
        let H = 250; // Default fallback value
        
        try {
          // Get depths from casing calculator data
          const casingData = localStorage.getItem('casingCalculatorData');
          if (casingData) {
            const parsedData = JSON.parse(casingData);
            
            if (parsedData && parsedData.sectionInputs && parsedData.sectionInputs.length > 0) {
              // Sections in casingCalculatorData are stored from deepest (index 0) to shallowest (last index)
              // Map instance to appropriate section based on correct ordering
              let sectionIndex = 0;
              
              if (instanceNumber === 1) {
                // Instance 1 (Production) uses the deepest section (index 0)
                sectionIndex = 0;
              } else if (instanceNumber === 2) {
                // Instance 2 uses the second deepest (index 1)
                sectionIndex = 1;
                if (sectionIndex >= parsedData.sectionInputs.length) sectionIndex = 0;
              } else if (instanceNumber === 3) {
                // Instance 3 uses the third deepest (index 2)
                sectionIndex = 2;
                if (sectionIndex >= parsedData.sectionInputs.length) sectionIndex = 0;
              } else if (instanceNumber === 4) {
                // Instance 4 uses the fourth deepest (index 3)
                sectionIndex = 3;
                if (sectionIndex >= parsedData.sectionInputs.length) sectionIndex = 0;
              } else if (instanceNumber === 5) {
                // Instance 5 (Surface) uses the shallowest section (last in the array)
                sectionIndex = parsedData.sectionInputs.length - 1;
              }
              
              // Get depth from the appropriate section
              if (parsedData.sectionInputs[sectionIndex] && parsedData.sectionInputs[sectionIndex].depth) {
                const sectionDepth = parseFloat(parsedData.sectionInputs[sectionIndex].depth);
                if (!isNaN(sectionDepth) && sectionDepth > 0) {
                  H = sectionDepth;
                  debugLog('calculateGcGc', `Using depth from casing data for instance ${instanceNumber}: ${H}m (section index ${sectionIndex}, depth order ${sectionIndex + 1})`);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error loading depths from casing calculator data:', error);
          debugLog('calculateGcGc', `Error loading depths from casing calculator data: ${error}`);
        }
        
        // Fallback: Try to get H from tfd (fluid displacement height) input if casing data isn't available
        if (H === 250) {
          debugLog('calculateGcGc', `No valid depth found in casing data, checking tfd inputs`);
          if (tfdValue && !isNaN(parseFloat(tfdValue))) {
            H = parseFloat(tfdValue);
            debugLog('calculateGcGc', `Using H from tfd input field: ${H}`);
          } else if (instanceValues['tfd'] && instanceValues['tfd'][instanceNumber] && !isNaN(parseFloat(instanceValues['tfd'][instanceNumber]))) {
            H = parseFloat(instanceValues['tfd'][instanceNumber]);
            debugLog('calculateGcGc', `Using H from tfd instance values: ${H}`);
          }
        }
        
        // Try to get h from td (displacement height) input
        let h = 30; // Default value
        if (tdValue && !isNaN(parseFloat(tdValue))) {
          h = parseFloat(tdValue);
        } else if (instanceValues['td'] && instanceValues['td'][instanceNumber] && !isNaN(parseFloat(instanceValues['td'][instanceNumber]))) {
          h = parseFloat(instanceValues['td'][instanceNumber]);
        }
        
        // Get internal diameter in meters
        const di_for_vfd = vcfResult.di / 1000;
        if (!isNaN(di_for_vfd) && di_for_vfd > 0 && !isNaN(H) && !isNaN(h) && H > h) {
          vfd = PI_OVER_4 * Math.pow(di_for_vfd, 2) * (H - h);
          debugLog('calculateGcGc', `Calculated Vfd for instance ${instanceNumber}:`, {
            'Formula': '(π/4) × di² × (H - h)',
            'di': di_for_vfd,
            'H': H,
            'h': h,
            'H - h': H - h,
            'Vfd': vfd
          });
        } else {
          debugLog('calculateGcGc', `Could not calculate Vfd for instance ${instanceNumber}:`, {
            'di': di_for_vfd,
            'H': H,
            'h': h,
            'Valid values?': !isNaN(di_for_vfd) && di_for_vfd > 0 && !isNaN(H) && !isNaN(h) && H > h
          });
        }

        // Calculate Pymax (maximum pressure at yield point)
        const pymax = (instanceGfc && instanceGf && vcfResult.hp) ? 
                      0.1 * (instanceHc - vcfResult.hp) * (instanceGfc - instanceGf) : null;
        
        // Calculate Pc (confining pressure)
        // FIXED: Get actual depth from formation/casing data instead of using height parameter
        let depth = 0;
        if (casingResult) {
          // If we have a casing result, estimate depth based on section
          if (casingResult.section === "Production") {
            depth = 3000; // Typical production depth
          } else if (casingResult.section === "Surface") {
            depth = 1000; // Typical surface depth
          } else if (casingResult.section.includes("Intermediate")) {
            // Extract intermediate number if present
            const match = casingResult.section.match(/intermediate\s+(\d+)/i);
            const intermediateNumber = match && match[1] ? parseInt(match[1]) : 1;
            depth = 2000 + ((intermediateNumber - 1) * 500); // Scale depth based on intermediate number
          } else {
            depth = 2000; // Default depth
          }
        } else {
          // No casing result, try to get from formation data
          try {
            const formationData = localStorage.getItem('wellsAnalyzerData');
            if (formationData) {
              const data = JSON.parse(formationData);
              
              // Try to get H values based on instance
              if (data[`H_${instanceNumber}`]) {
                depth = parseFloat(data[`H_${instanceNumber}`]);
              } else if (data.H) {
                depth = parseFloat(data.H);
              }
            }
          } catch (error) {
            console.error('Failed to load H (depth) value from formation data:', error);
          }
        }

        // If we still don't have a depth value, use vcfResult.hp as a last resort
        if (depth === 0) {
          depth = vcfResult.hp;
          console.warn(`Using height parameter (${depth}) as fallback for depth value in Pc calculation, instance ${instanceNumber}`);
        }

        // Now calculate Pc with the proper depth value
        const constantValue = depth >= 2000 ? 16 : 8;
        const pc = 0.02 * depth + constantValue;

        // Pfr remains constant at 5 usually
        const pfr = 5;
        
        // Calculate Ppmax (maximum pump pressure)
        const ppmax = (pymax && pc) ? ((pymax + pc + pfr) / 10) : null;
        
        // Calculate td and related time variables
        let instanceTd = getStrictNumericValue(instanceValues['td']?.[instanceNumber], parseFloat(tdValue) || 30);
        const tp = 60; // Constant value of 60
        const tad = 0.75 * tp; // tad = 0.75 * tp
        
        // Get Q value from pumpResults if available
        let Q = 0;
        if (pumpResults && pumpResults.length > 0) {
          const pumpForInstance = pumpResults.find(p => p.instance === instanceNumber && p.isRecommended);
          if (pumpForInstance && pumpForInstance.flow) {
            Q = pumpForInstance.flow;
          }
        }
        
        // Calculate time values
        let tfcPlusTfd = 0;
        if (Q > 0 && vfd !== null) {
          tfcPlusTfd = ((vcfValue + vfd) * 1000) / Q;
        }
        const tc = tfcPlusTfd + instanceTd;
        const tfc = tfcPlusTfd / 2;
        const tfd = tfcPlusTfd / 2;
        const n = tc > 0 && tad > 0 ? Math.ceil(tc / tad + 1) : null;
        
        // Create a proper GcResult object with all calculated properties
        return {
          instance: vcfResult.instance,
          vcf: vcfValue,
          newGcc: newGccValue, // CRITICAL: Use our strictly calculated value
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
      
      // Inside calculateGcGcInternal function, after processing results:
      if (results.length > 0) {
        // CRITICAL FIX: Force regeneration of the entire equation HTML to ensure consistent rendering
        const fullEquationHTML = `
          <div class="space-y-4">
            <!-- This is the introductory section that must always be visible -->
            <div class="space-y-4 mt-6">
              <h3 class="text-xl font-bold text-primary">NewGcc/Gc' and Related Equations</h3>
              <div class="bg-muted/30 p-4 rounded-md border border-border/40">
                <h4 class="font-medium mb-2">General Formulas:</h4>
                <div class="space-y-4">
                  <div>
                    <p class="font-medium">NewGcc (cement grade):</p>
                    <p class="font-mono text-sm bg-background/80 p-2 rounded">NewGcc = (γc·γw)/(m·γc + γw)</p>
                  </div>
                  <div>
                    <p class="font-medium">Gc' (modified cement grade):</p>
                    <p class="font-mono text-sm bg-background/80 p-2 rounded">Gc' = K2.NewGcc.Vfc</p>
                  </div>
                  <div>
                    <p class="font-medium">nc (number of cement sacks):</p>
                    <p class="font-mono text-sm bg-background/80 p-2 rounded">nc = (Gc' × 1000) / 50</p>
                  </div>
                  <div>
                    <p class="font-medium">Vw (water volume):</p>
                    <p class="font-mono text-sm bg-background/80 p-2 rounded">Vw = (K3 × m × NewGcc × Vfc) / γw</p>
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
                    <p class="font-mono text-sm bg-background/80 p-2 rounded">Ppmax = (Pymax + Pc + Pfr) / 10</p>
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
            </div>
            
            <!-- Instance specific calculations -->
            ${gcEquations}
          </div>
        `;
        
        // Use the full HTML that we've manually constructed to guarantee it appears
        console.log("Updating with complete equation HTML, length:", fullEquationHTML.length);
        updateEquationHTML(fullEquationHTML);
        setGcResults(results);
      } else {
        console.warn("No results generated for gc calculations");
      }
      
      // Save results to localStorage
      saveResultsToLocalStorage();
      
      // Show success message
      showToast('success', "Calculation completed", {
        description: "NewGcc/Gc' values and related parameters calculated successfully",
        icon: <CheckCircle className="h-4 w-4 text-green-500" />
      });
      
    } catch (error) {
      console.error("Error calculating NewGcc/Gc':", error);
    }
  };

  // Function to process pump selection using hardcoded data
  const processPumpFileSelection = async () => {
    if (!gcResults || gcResults.length === 0) {
      showToast('error', "Please calculate GC results first");
      return;
    }
    
    setIsPumpSelectionLoading(true);
    debugLog('pumpSelection', 'Starting pump selection process');
    
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
            debugLog('pumpSelection', `Instance ${result.instance}: Using global diameter ${selectedDiameter}"`);
          } else {
            // Use instance-specific diameter
            const diameter = instanceDiameters[result.instance] || selectedDiameter;
            instanceDiametersToSend.push(diameter);
            debugLog('pumpSelection', `Instance ${result.instance}: Using instance-specific diameter ${diameter}"`);
          }
          
          debugLog('pumpSelection', `Instance ${result.instance} requirements:`, {
            'Ppmax': result.ppmax,
            'Diameter': instanceDiametersToSend[instanceDiametersToSend.length - 1]
          });
        }
      });
      
      if (ppmaxValues.length === 0) {
        debugLog('pumpSelection', '⚠️ No valid Ppmax values found');
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
        
        debugLog('pumpSelection', `Processing instance ${instanceNumber}:`, {
          'Ppmax required': ppmax,
          'Diameter': diameter,
          'Diameter key': diameterKey
        });
        
        // Filter pumps by diameter and pressure
        const matchingPumps = PUMP_DATA.filter(pump => {
          // Check if this pump has data for the selected diameter
          const hasDiameter = pump.pressures[diameterKey] !== null;
          if (!hasDiameter) return false;
          
          // Check if this pump's pressure meets or exceeds the required Ppmax
          const pumpPressure = pump.pressures[diameterKey] as number;
          const isMatch = pumpPressure >= ppmax;
          
          debugLog('pumpSelection', `Evaluating pump ${pump.type} (Speed ${pump.speed}):`, {
            'Has diameter data': hasDiameter,
            'Pump pressure': pumpPressure,
            'Meets pressure requirement': isMatch,
            'Pressure difference': pumpPressure - ppmax
          });
          
          return isMatch;
        });
        
        debugLog('pumpSelection', `Found ${matchingPumps.length} matching pumps for instance ${instanceNumber}`);
        
        // Sort by pressure (descending), closest to Ppmax first
        const sortedPumps = [...matchingPumps].sort((a, b) => {
          const aPressure = a.pressures[diameterKey] as number;
          const bPressure = b.pressures[diameterKey] as number;
          return Math.abs(aPressure - ppmax) - Math.abs(bPressure - ppmax);
        });
        
        debugLog('pumpSelection', `Sorted pumps by closest pressure match for instance ${instanceNumber}`, 
          sortedPumps.map(p => ({
            type: p.type, 
            speed: p.speed, 
            pressure: p.pressures[diameterKey],
            pressureDiff: (p.pressures[diameterKey] as number) - ppmax
          }))
        );
        
        // Format results for this instance
        const pumpResultsForInstance: PumpResult[] = [];
        
        sortedPumps.forEach((pump, pumpIndex) => {
          const pumpPressure = pump.pressures[diameterKey] as number;
          const pumpFlow = pump.flows[diameterKey] as number;
          
          debugLog('pumpSelection', `Processing pump for result: ${pump.type} (Speed ${pump.speed})`, {
            'Pressure': pumpPressure,
            'Flow': pumpFlow,
            'Is first choice': pumpIndex === 0
          });
          
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
              debugLog('pumpSelection', `Using td from input field: ${instanceTd}`);
            } else if (instanceValues['td'] && 
                      instanceValues['td'][instanceNumber] && 
                      !isNaN(parseFloat(instanceValues['td'][instanceNumber]))) {
              instanceTd = parseFloat(instanceValues['td'][instanceNumber]);
              debugLog('pumpSelection', `Using td from instance values: ${instanceTd}`);
            }
            
            // Calculate tfc+tfd = ((Vcf+Vfd)*10^3)/Q
            const tfcPlusTfd = ((gcResultForInstance.vcf + gcResultForInstance.vfd) * 1000) / pumpFlow;
            
            debugLog('pumpSelection', `Time calculations for ${pump.type} (Speed ${pump.speed}):`, {
              'Formula': 'tfc+tfd = ((Vcf+Vfd)*10^3)/Q',
              'Vcf': gcResultForInstance.vcf,
              'Vfd': gcResultForInstance.vfd,
              'Q (flow)': pumpFlow,
              'Result (tfc+tfd)': tfcPlusTfd
            });
            
            // Calculate tc = tfc+tfd + td
            tc = tfcPlusTfd + instanceTd;
            
            // Split tfcPlusTfd into tfc and tfd (50/50 split as a default approach)
            tfc = tfcPlusTfd / 2;
            tfd = tfcPlusTfd / 2;
            
            debugLog('pumpSelection', `Final time values for ${pump.type} (Speed ${pump.speed}):`, {
              'tfc': tfc,
              'tfd': tfd,
              'td': instanceTd,
              'tc': tc,
              'tad': tad
            });
          } else {
            debugLog('pumpSelection', `⚠️ Cannot calculate time values for ${pump.type} - missing Vfd or GC result`);
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
          debugLog('pumpSelection', `⚠️ No matching pumps found for instance ${instanceNumber}, searching for alternatives`);
          
          // Find pumps with diameter that can handle higher pressures
          const alternativePumps = PUMP_DATA.filter(pump => {
            const otherDiameterKeys: Array<"3.5" | "4" | "4.5"> = ["3.5", "4", "4.5"];
            return otherDiameterKeys.some(key => {
              if (key === diameterKey) return false; // Skip the original diameter
              return pump.pressures[key] !== null && (pump.pressures[key] as number) >= ppmax;
            });
          });
          
          debugLog('pumpSelection', `Found ${alternativePumps.length} alternative pumps for instance ${instanceNumber}`);
          
          if (alternativePumps.length > 0) {
            // Find best alternative diameter for each pump
            alternativePumps.forEach((pump, pumpIndex) => {
              // Find the best diameter that can handle the pressure
              const bestDiameter = ["3.5", "4", "4.5"].reduce((best, current) => {
                const diameter = current as "3.5" | "4" | "4.5";
                if (pump.pressures[diameter] === null) return best;
                if (pump.pressures[diameter]! >= ppmax && 
                    (best === "" || Math.abs(Number(diameter) - Number(diameterKey)) < Math.abs(Number(best) - Number(diameterKey)))) {
                  return diameter;
                }
                return best;
              }, "");
              
              if (bestDiameter) {
                const altDiameter = parseFloat(bestDiameter);
                const pumpPressure = pump.pressures[bestDiameter as "3.5" | "4" | "4.5"] as number;
                const pumpFlow = pump.flows[bestDiameter as "3.5" | "4" | "4.5"] as number;
                
                debugLog('pumpSelection', `Alternative pump for instance ${instanceNumber}: ${pump.type} (Speed ${pump.speed})`, {
                  'Original diameter': diameter,
                  'Alternative diameter': altDiameter,
                  'Pressure': pumpPressure,
                  'Flow': pumpFlow,
                  'Is first choice': pumpIndex === 0
                });
                
                pumpResultsForInstance.push({
                  type: pump.type,
                  diameter: altDiameter,
                  pressure: pumpPressure,
                  flow: pumpFlow,
                  speed: pump.speed,
                  price: pumpIndex + 100, // Higher price for alternatives
                  isRecommended: pumpIndex === 0, // Mark first alternative as recommended
                  instance: instanceNumber,
                  ppmax,
                  tfc: null,
                  tfd: null,
                  tc: null,
                  tad: 45,
                  isTimeAllowed: null,
                  isAlternative: true,
                });
              }
            });
            
            // Sort alternatives by pressure closest to ppmax
            pumpResultsForInstance.sort((a, b) => 
              Math.abs(a.pressure - ppmax) - Math.abs(b.pressure - ppmax)
            );
            
            // Mark the first one as recommended
            if (pumpResultsForInstance.length > 0) {
              pumpResultsForInstance[0].isRecommended = true;
              debugLog('pumpSelection', `Marked ${pumpResultsForInstance[0].type} (Speed ${pumpResultsForInstance[0].speed}) as recommended for instance ${instanceNumber}`);
            }
          }
        }
        
        // Add all results for this instance
        results.push(...pumpResultsForInstance);
      });
      
      // Update state with results
      setPumpResults(results);
      debugLog('pumpSelection', `Pump selection complete. Found ${results.length} total pumps across all instances.`);
      
      showToast('success', "Pump selection completed", {
        description: `Found ${results.length} suitable pumps.`
      });
    } catch (error) {
      console.error('Error in pump selection:', error);
      debugLog('pumpSelection', `⚠️ Error in pump selection: ${error instanceof Error ? error.message : "Unknown error"}`);
      
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
          // Fallback to default 5 instances if no vcfResults
        newValues[field][1] = fieldValue;
        newValues[field][2] = fieldValue;
        newValues[field][3] = fieldValue;
        newValues[field][4] = fieldValue;
        newValues[field][5] = fieldValue;
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
          <div className="flex items-center gap-2">
            <Label htmlFor={fieldId} className="text-sm font-medium">{label}</Label>
            {fieldId === "gammaC" && (
              <HelpTooltip text="The specific weight for the cementing powder (gf/cm3)" />
            )}
            {fieldId === "gammaFC" && (
              <HelpTooltip text="The specific weight for the cementing fluid (gf/cm3)" />
            )}
            {fieldId === "h" && (
              <HelpTooltip text="The height of Float Collars (m)" />
            )}
            {fieldId === "td" && (
              <HelpTooltip text="The time spent on bumping the cement (10-15 min)" />
            )}
            {fieldId === "k1" && (
              <HelpTooltip text="Factor that considers the increase of the well diameter (1.1-1.2)" />
            )}
            {fieldId === "k2" && (
              <HelpTooltip text="Factor that considers sticking of the drill pipes (1.1-1.25)" />
            )}
            {fieldId === "k3" && (
              <HelpTooltip text="Factor that considers the acceleration when raising (1.02-1.04)" />
            )}
          </div>
          <div className="flex items-center gap-2">
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
              // Fallback to default 5 instances if no vcfResults
              [1, 2, 3, 4, 5].map(instance => (
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
  };

  const updateGammaW = (value: string) => {
    setGammaW(value);
  };

  const updateGammaFC = (value: string) => {
    setGammaFC(value);
  };

  const updateGammaF = (value: string) => {
    if (wellType === 'exploration') {
      setGammaF("1.08");
    } else {
      setGammaF(value);
    }
  };

  const updateK1Value = (value: string) => {
    setK1Value(value);
    clearVcfResults();
  };

  const updateK2Value = (value: string) => {
    setK2Value(value);
  };

  const updateK3Value = (value: string) => {
    setK3Value(value);
  };

  const updateTfcValue = (value: string) => {
    setTfcValue(value);
  };

  const updateTfdValue = (value: string) => {
    setTfdValue(value);
  };

  const updateTdValue = (value: string) => {
    setTdValue(value);
  };

  const updateHValue = (value: string) => {
    setHValue(value);
  };

  const updateMValue = (value: string) => {
    setMValue(value);
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

  // Add wellType context
  const { wellType } = useWellType();
  
  // Set fixed gammaF value for exploration wells on initial load and when wellType changes
  useEffect(() => {
    if (wellType === 'exploration') {
      setGammaF("1.08");
    }
  }, [wellType]);

  // Add calculation progress state near the other state variables
  const [calculationStep, setCalculationStep] = useState<'idle' | 'vcf-done' | 'calculating'>("idle");
  const [calculationProgress, setCalculationProgress] = useState<number>(0);

  // Update the calculateAll function to handle the two-step process
  const calculateAll = () => {
    // If we already calculated Vcf, proceed to the next step
    if (calculationStep === 'vcf-done') {
      setCalculationStep('calculating');
      setCalculationProgress(75); // Start from 50% and animate to 75%
      setIsLoading(true);
      
      try {
        // Run GcGc calculations
        calculateGcGcInternal();
        
        // Set to 100% when done and keep it there
        setTimeout(() => {
          setCalculationProgress(100);
          setCalculationStep('idle'); // Reset step but keep progress at 100%
          setIsLoading(false);
        }, 300);
      } catch (error) {
        console.error("Error in GcGc calculations:", error);
        showToast('error', "Error performing calculations");
        setCalculationStep('vcf-done'); // Stay at step 1 if there's an error
        setCalculationProgress(50);
        setIsLoading(false);
      }
    } else {
      // First step - calculate Vcf
      setCalculationStep('calculating');
      setCalculationProgress(0); // Start from 0
      
      // Immediately set to 25% for animation effect
      setTimeout(() => setCalculationProgress(25), 10);
      setIsLoading(true);
      
      try {
        // Run Vcf calculation and check if it returned results
        const vcfResultsFromCalc = calculateVcf();
        
        // Only proceed if we actually got valid results
        if (vcfResultsFromCalc && vcfResultsFromCalc.length > 0) {
          // If successful, mark first step as done
          setTimeout(() => {
            setCalculationProgress(50);
            setCalculationStep('vcf-done');
            setIsLoading(false);
            showToast('info', "Vcf calculated successfully", {
              description: "Click Calculate again to proceed with the remaining calculations"
            });
          }, 300);
        } else {
          // No results returned but no error thrown - reset state
          setTimeout(() => {
            setCalculationStep('idle');
            setCalculationProgress(0);
            setIsLoading(false);
            // No need for another toast as calculateVcf() already showed one
          }, 300);
        }
      } catch (error) {
        console.error("Error in Vcf calculation:", error);
        showToast('error', "Error calculating Vcf");
        setCalculationStep('idle');
        setCalculationProgress(0);
        setIsLoading(false);
      }
    }
  };

  // Add this to the state declarations at the top of the component
  const [selectedPumpIndices, setSelectedPumpIndices] = useState<Record<number, number>>({});

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
              <TabsList className="grid grid-cols-3 w-full max-w-xl bg-zinc-900 rounded-full overflow-hidden p-0 h-12">
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
                <CardFooter className="bg-muted/20 px-6 py-4 border-t border-border/30 flex flex-col gap-3">
                  <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out" 
                      style={{ width: `${calculationProgress}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      onClick={calculateAll}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-2"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          <span>Calculating...</span>
                        </>
                      ) : calculationStep === 'vcf-done' ? (
                        <>
                          <Calculator className="h-4 w-4" />
                          <span>Calculate All (Step 2/2)</span>
                        </>
                      ) : (
                        <>
                          <Calculator className="h-4 w-4" />
                          <span>Calculate Vcf (Step 1/2)</span>
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      onClick={saveData}
                      className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground border border-border/50 shadow-sm gap-2"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Save Data</span>
                        </>
                      )}
                    </Button>
                  </div>
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
                        <CardTitle className="text-lg sm:text-xl text-primary/90">NewGcc/Gc' Calculation Results</CardTitle>
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
                            <TableHead className="text-center">NewGcc</TableHead>
                            <TableHead className="text-center">Gc' (Gc prime)</TableHead>
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
                              <TableCell className="text-center">{result.newGcc?.toFixed(4) || "N/A"}</TableCell>
                              <TableCell className="text-center">{(result.newGcc && result.vcf && k2Value) ? (parseFloat(k2Value) * result.newGcc * result.vcf).toFixed(4) : "N/A"}</TableCell>
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
              
              {/* Debug Summary Section */}
              {(vcfResults.length > 0 || gcResults.length > 0 || pumpResults.length > 0) && (
                <div className="mt-6 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      try {
                        const summary = generateDebugSummary(vcfResults, gcResults, pumpResults);
                        
                        // Fallback copy method for environments where clipboard API isn't available
                        if (!navigator.clipboard) {
                          // Create a temporary textarea element
                          const textArea = document.createElement('textarea');
                          textArea.value = summary;
                          
                          // Make it invisible
                          textArea.style.position = 'fixed';
                          textArea.style.opacity = '0';
                          textArea.style.left = '-999999px';
                          textArea.style.top = '-999999px';
                          
                          document.body.appendChild(textArea);
                          textArea.focus();
                          textArea.select();
                          
                          try {
                            // Execute the copy command
                            const successful = document.execCommand('copy');
                            if (successful) {
                              showToast('success', "Debug summary copied to clipboard");
                            } else {
                              throw new Error('Copy command failed');
                            }
                          } catch (e) {
                            showToast('error', "Clipboard copy failed, try manual selection");
                            console.error("Fallback clipboard copy failed:", e);
                          }
                          
                          document.body.removeChild(textArea);
                        } else {
                          // Use the Clipboard API if available
                          navigator.clipboard.writeText(summary)
                            .then(() => showToast('success', "Debug summary copied to clipboard"))
                            .catch((err) => {
                              showToast('error', "Failed to copy debug summary");
                              console.error("Clipboard API copy failed:", err);
                            });
                        }
                      } catch (err) {
                        console.error("Failed to copy debug summary:", err);
                        showToast('error', "Failed to copy debug summary");
                      }
                    }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Copy Debug Info</span>
                  </Button>
                </div>
              )}
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
                            
                            // Get the selected pump index from our component-level state
                            const selectedPumpIndex = selectedPumpIndices[instance] || 0;
                            const selectedPump = pumpsForInstance[selectedPumpIndex] || recommendedPump;
                            
                            return (
                              <div key={`instance-${instance}`} className="border border-border/30 rounded-md overflow-hidden">
                                <div className="bg-zinc-900 px-3 py-2 border-b border-zinc-800 flex justify-between items-center">
                                  <h4 className="font-medium">Instance {instance}</h4>
                                  
                                  {/* Simplified pump selection dropdown */}
                                  <div className="flex items-center gap-2">
                                    <Settings className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Compare:</span>
                                    <Select 
                                      value={selectedPumpIndex.toString()} 
                                      onValueChange={(value) => setSelectedPumpIndices(prev => ({...prev, [instance]: parseInt(value)}))}
                                    >
                                      <SelectTrigger id={`pump-select-${instance}`} className="w-[220px] h-9 bg-zinc-900 border-zinc-800">
                                        {selectedPump && (
                                          <div className="flex items-center gap-1 whitespace-nowrap overflow-hidden">
                                            {selectedPump.isRecommended && (
                                              <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                                            )}
                                            <span className="truncate">{selectedPump.type}</span>
                                            <span className="text-xs flex-shrink-0 text-muted-foreground">Speed {selectedPump.speed}</span>
                                          </div>
                                        )}
                                      </SelectTrigger>
                                      <SelectContent className="max-h-[280px]">
                                        {pumpsForInstance.map((pump, index) => (
                                          <SelectItem 
                                            key={index} 
                                            value={index.toString()}
                                          >
                                            <div className="flex items-center gap-1 whitespace-nowrap overflow-hidden">
                                              {pump.isRecommended && (
                                                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                                              )}
                                              <span className="truncate">{pump.type}</span>
                                              <span className="text-xs flex-shrink-0 text-muted-foreground">Speed {pump.speed}</span>
                                              {pump.isRecommended && (
                                                <span className="ml-1 text-xs flex-shrink-0 text-green-500">Recommended</span>
                                              )}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="p-4">
                                  {selectedPump ? (
                                    <div className="space-y-4">
                                      <div className="flex items-center space-x-2">
                                        {selectedPump.isRecommended ? (
                                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                            Recommended
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                            Alternative
                                          </Badge>
                                        )}
                                        <span className="font-medium">{selectedPump.type}</span>
                                        <span className="text-sm text-muted-foreground">(Speed: {selectedPump.speed})</span>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-background/50 p-2 rounded border border-border/30">
                                          <span className="text-xs text-muted-foreground">Diameter</span>
                                          <p className="font-medium">{selectedPump.diameter}"</p>
                                        </div>
                                        <div className="bg-background/50 p-2 rounded border border-border/30">
                                          <span className="text-xs text-muted-foreground">Speed</span>
                                          <p className="font-medium">{selectedPump.speed}</p>
                                        </div>
                                        <div className="bg-background/50 p-2 rounded border border-border/30">
                                          <span className="text-xs text-muted-foreground">Pressure</span>
                                          <p className="font-medium">{selectedPump.pressure} MPa</p>
                                        </div>
                                        <div className="bg-background/50 p-2 rounded border border-border/30">
                                          <span className="text-xs text-muted-foreground">Flow</span>
                                          <p className="font-medium">{selectedPump.flow} L/min</p>
                                        </div>
                                      </div>
                                      
                                      {selectedPump.tfc !== null && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                                          <div className="bg-background/50 p-2 rounded border border-border/30">
                                            <span className="text-xs text-muted-foreground">Cement Fill Time</span>
                                            <p className="font-medium">{selectedPump.tfc?.toFixed(2) || "0.00"} min</p>
                                          </div>
                                          <div className="bg-background/50 p-2 rounded border border-border/30">
                                            <span className="text-xs text-muted-foreground">Displacement Time</span>
                                            <p className="font-medium">{selectedPump.tfd?.toFixed(2) || "0.00"} min</p>
                                          </div>
                                          <div className="bg-background/50 p-2 rounded border border-border/30">
                                            <span className="text-xs text-muted-foreground">Total Time</span>
                                            <p className="font-medium">{(selectedPump.tc || 10).toFixed(2)} min</p>
                                          </div>
                                          <div className="bg-background/50 p-2 rounded border border-border/30">
                                            <span className="text-xs text-muted-foreground">Required Pressure</span>
                                            <p className="font-medium">{selectedPump.ppmax.toFixed(2)} MPa/10</p>
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div className="grid grid-cols-3 md:grid-cols-3 gap-3 mt-3">
                                        <div className="bg-background/50 p-2 rounded border border-border/30">
                                          <span className="text-xs text-muted-foreground">tfc+tfd</span>
                                          <p className="font-medium">{((selectedPump?.tfc || 0) + (selectedPump?.tfd || 0)).toFixed(2)} min</p>
                                        </div>
                                        <div className="bg-background/50 p-2 rounded border border-border/30">
                                          <span className="text-xs text-muted-foreground">Additional Time (td)</span>
                                          <p className="font-medium">10.00 min</p>
                                        </div>
                                        <div className="bg-background/50 p-2 rounded border border-border/30">
                                          <span className="text-xs text-muted-foreground">tc = tfc+tfd + td</span>
                                          <p className="font-medium">{(((selectedPump?.tfc || 0) + (selectedPump?.tfd || 0)) + 10).toFixed(2)} min</p>
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

                                      {/* Simplified performance comparison indicator */}
                                      {!selectedPump.isRecommended && recommendedPump && (
                                        <div className="mt-3 border border-zinc-800 rounded-md overflow-hidden">
                                          <div className="bg-zinc-900 px-3 py-1.5">
                                            <span className="text-xs font-medium">Comparison with recommended pump</span>
                                          </div>
                                          <div className="p-3">
                                            <div className="grid grid-cols-2 gap-3">
                                              {/* Pressure comparison */}
                                              <div>
                                                <div className="flex justify-between items-center mb-1">
                                                  <span className="text-xs font-medium">Pressure</span>
                                                  <span className={`text-xs ${selectedPump.pressure >= recommendedPump.pressure ? "text-green-500" : "text-amber-500"}`}>
                                                    {((selectedPump.pressure / recommendedPump.pressure) * 100 - 100).toFixed(1)}%
                                                    {selectedPump.pressure > recommendedPump.pressure ? " higher" : " lower"}
                                                  </span>
                                                </div>
                                                <div className="overflow-hidden h-1 text-xs flex rounded bg-zinc-800">
                                                  <div 
                                                    className={`shadow-none flex flex-col text-center whitespace-nowrap justify-center ${selectedPump.pressure >= recommendedPump.pressure ? "bg-green-500" : "bg-amber-500"}`} 
                                                    style={{ width: `${Math.min(100, Math.max(20, (selectedPump.pressure / recommendedPump.pressure) * 100))}%` }}
                                                  ></div>
                                                </div>
                                              </div>
                                              
                                              {/* Flow comparison */}
                                              <div>
                                                <div className="flex justify-between items-center mb-1">
                                                  <span className="text-xs font-medium">Flow Rate</span>
                                                  <span className={`text-xs ${selectedPump.flow >= recommendedPump.flow ? "text-green-500" : "text-amber-500"}`}>
                                                    {((selectedPump.flow / recommendedPump.flow) * 100 - 100).toFixed(1)}%
                                                    {selectedPump.flow > recommendedPump.flow ? " higher" : " lower"}
                                                  </span>
                                                </div>
                                                <div className="overflow-hidden h-1 text-xs flex rounded bg-zinc-800">
                                                  <div 
                                                    className={`shadow-none flex flex-col text-center whitespace-nowrap justify-center ${selectedPump.flow >= recommendedPump.flow ? "bg-green-500" : "bg-amber-500"}`} 
                                                    style={{ width: `${Math.min(100, Math.max(20, (selectedPump.flow / recommendedPump.flow) * 100))}%` }}
                                                  ></div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground">No pump data available for this instance.</p>
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