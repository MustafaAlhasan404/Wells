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
import { Calculator, Eye, EyeOff, ArrowRight, RefreshCcw, AlertCircle, X, CheckCircle, Save } from "lucide-react"
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
}

interface DataInputValues {
  K1?: string;
  K2?: string;
  K3?: string;
  [key: string]: string | undefined;
}

export default function SemanticsPage() {
  // Input parameters
  const [hcValue, setHcValue] = useState<string>("");
  const [gammaC, setGammaC] = useState<string>("");
  const [gammaW, setGammaW] = useState<string>("1"); // Default to 1
  const [gammaFC, setGammaFC] = useState<string>("");
  const [gammaF, setGammaF] = useState<string>("");
  const [k1Value, setK1Value] = useState<string>("");  // K1 state variable
  const [k2Value, setK2Value] = useState<string>("");  // K2 state variable
  const [k3Value, setK3Value] = useState<string>("");  // K3 state variable
  const [mValue, setMValue] = useState<string>("");    // m value for gc calculation
  const [tfcValue, setTfcValue] = useState<string>(""); // tfc value
  const [tfdValue, setTfdValue] = useState<string>(""); // tfd value
  const [tdValue, setTdValue] = useState<string>("");   // td value
  const [hValue, setHValue] = useState<string>("");     // h value for Vcf calculation
  
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
  
  // Access results from other pages
  const { 
    drillCollarResults,
    casingResults,
    pumpFile,
    pumpFileName,
    pumpResults,
    setPumpFile,
    setPumpFileName,
    setPumpResults
  } = useFileUpload();

  // Toggle minimized state for equations card
  const toggleEquationsMinimized = () => {
    const newState = !equationsMinimized;
    setEquationsMinimized(newState);
  };

  // Save all input data explicitly to localStorage
  const saveInputData = () => {
    try {
      // Save all form values
      const dataToSave = {
        hc: hcValue,
        gammaC,
        gammaW,
        gammaFC,
        gammaF,
        k1: k1Value,
        k2: k2Value,
        k3: k3Value,
        m: mValue,
        tfc: tfcValue,
        tfd: tfdValue,
        td: tdValue,
        h: hValue,
        // Also save instance values
        instanceValues,
      };
      
      console.log("Saving data to localStorage:", dataToSave);
      
      // Save to localStorage
      localStorage.setItem('wellsAnalyzerSemanticData', JSON.stringify(dataToSave));
      console.log("Data saved to localStorage - wellsAnalyzerSemanticData");
      
      // Save input preferences separately
      localStorage.setItem('wellsAnalyzerSemanticInputPrefs', JSON.stringify(singleInputFields));
      console.log("Input prefs saved to localStorage - wellsAnalyzerSemanticInputPrefs");
      
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
  
  // Load all saved input data from localStorage
  const loadInputData = () => {
    try {
      console.log("Loading data from localStorage...");
      
      // Get data from localStorage
      const savedData = localStorage.getItem('wellsAnalyzerSemanticData');
      console.log("Loaded wellsAnalyzerSemanticData:", savedData);
      
      if (savedData) {
        const data = JSON.parse(savedData);
        console.log("Parsed data:", data);
        
        // Set values from saved data
        if (data.hc) setHcValue(data.hc);
        if (data.gammaC) setGammaC(data.gammaC);
        if (data.gammaW) setGammaW(data.gammaW);
        if (data.gammaFC) setGammaFC(data.gammaFC);
        if (data.gammaF) setGammaF(data.gammaF);
        if (data.k1) setK1Value(data.k1);
        if (data.k2) setK2Value(data.k2);
        if (data.k3) setK3Value(data.k3);
        if (data.m) setMValue(data.m);
        if (data.tfc) setTfcValue(data.tfc);
        if (data.tfd) setTfdValue(data.tfd);
        if (data.td) setTdValue(data.td);
        if (data.h) setHValue(data.h);
        
        // Load instance values if available
        if (data.instanceValues) {
          setInstanceValues(data.instanceValues);
        }
      }
      
      // Try to load the single input preferences
      const savedInputPrefs = localStorage.getItem('wellsAnalyzerSemanticInputPrefs');
      console.log("Loaded wellsAnalyzerSemanticInputPrefs:", savedInputPrefs);
      
      if (savedInputPrefs) {
        setSingleInputFields(JSON.parse(savedInputPrefs));
      }
      
      // Also load calculation results if available
      try {
        // Load Vcf results
        const savedVcfResults = localStorage.getItem('wellsAnalyzerVcfResults');
        console.log("Loaded wellsAnalyzerVcfResults:", savedVcfResults);
        
        if (savedVcfResults) {
          setVcfResults(JSON.parse(savedVcfResults));
        }
        
        // Load Gc results
        const savedGcResults = localStorage.getItem('wellsAnalyzerGcResults');
        console.log("Loaded wellsAnalyzerGcResults:", savedGcResults);
        
        if (savedGcResults) {
          setGcResults(JSON.parse(savedGcResults));
        }
        
        // Load equation HTML
        const savedEquationHTML = localStorage.getItem('wellsAnalyzerEquationHTML');
        console.log("Loaded wellsAnalyzerEquationHTML:", savedEquationHTML ? "Found" : "Not found");
        
        if (savedEquationHTML) {
          setEquationHTML(savedEquationHTML);
        }
        
        // Load results HTML
        const savedResultsHTML = localStorage.getItem('wellsAnalyzerResultsHTML');
        console.log("Loaded wellsAnalyzerResultsHTML:", savedResultsHTML ? "Found" : "Not found");
        
        if (savedResultsHTML) {
          setResultsHTML(savedResultsHTML);
        }
      } catch (error) {
        console.error('Failed to load calculation results:', error);
      }
      
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
        
        // Set K values from legacy data if available
        if (data.K1) setK1Value(data.K1);
        if (data.K2) setK2Value(data.K2);
        if (data.K3) setK3Value(data.K3);
        
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
      setMValue("");
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
    k1Value, k2Value, k3Value, mValue,
    tfcValue, tfdValue, tdValue,
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
        case 'm': updateMValue(value); break;
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
                          <p class="font-mono text-sm bg-background/80 p-2 rounded">Vcf = (π/4) × [K1 × Db² - de] × Hc + di² × h</p>
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
        const di = parseFloat(result.internalDiameter || '0') / 1000; // Internal diameter in m
        
        // Add logging to debug
        console.log('Casing result:', result);
        console.log('Db:', Db, 'de:', de, 'di:', di);
        
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
        
        // Calculate Vcf: (π/4)×[K1Db^2-de].Hc+di^2.h
        const vcf = (Math.PI/4) * ((instanceK1 * (Db**2) - de) * instanceHc) + (di**2) * h;
        
        // Add to results
        results.push({
          instance: i + 1,
          db: Db * 1000,
          de: de * 1000,
          di: di * 1000,
          h: h,
          vcf: vcf
        });
        
        // Step by step calculation for this instance
        const step1 = instanceK1 * (Db**2);
        const step2 = step1 - de;
        const step3 = step2 * instanceHc;
        const step4 = (Math.PI/4) * step3;
        const step5 = di**2;
        const step6 = step5 * h;
        const step7 = step4 + step6;
        
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
                    <span class="font-mono">di = ${di.toFixed(4)} m (${(di*1000).toFixed(2)} mm)</span>
                  </div>
                  <div class="bg-background/50 p-2 rounded border border-border/30">
                    <span class="font-mono">h = ${h.toFixed(4)}</span>
                  </div>
                </div>
              </div>
              
              <div class="border-t border-border/30 pt-4">
                <p class="font-medium">Vcf Calculation:</p>
                <div class="mt-2 bg-background/60 p-3 rounded">
                  <p class="font-mono text-sm">Vcf = (π/4) × [K1 × Db² - de] × Hc + di² × h</p>
                  <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                    <li>K1 × Db² = ${instanceK1.toFixed(4)} × ${Db.toFixed(4)}² = ${step1.toFixed(6)}</li>
                    <li>(K1 × Db²) - de = ${step1.toFixed(6)} - ${de.toFixed(4)} = ${step2.toFixed(6)}</li>
                    <li>[(K1 × Db²) - de] × Hc = ${step2.toFixed(6)} × ${instanceHc.toFixed(4)} = ${step3.toFixed(6)}</li>
                    <li>(π/4) × [(K1 × Db²) - de] × Hc = ${(Math.PI/4).toFixed(4)} × ${step3.toFixed(6)} = ${step4.toFixed(6)}</li>
                    <li>di² = ${di.toFixed(4)}² = ${step5.toFixed(6)}</li>
                    <li>di² × h = ${step5.toFixed(6)} × ${h.toFixed(4)} = ${step6.toFixed(6)}</li>
                    <li>(π/4) × [(K1 × Db²) - de] × Hc + di² × h = ${step4.toFixed(6)} + ${step6.toFixed(6)} = ${step7.toFixed(6)}</li>
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
                              <p class="font-mono text-sm bg-background/80 p-2 rounded">Gc = (Hc × (γc - γw)) / Vcf</p>
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
        
        // Calculate Gc using instance-specific values - (Hc * (gc - gw)) / Vcf
        const gc_value = (instanceHc * (instanceGc - instanceGw)) / vcfValue;
        
        // Calculate G'c (prime) using instance-specific values - gc_value * (1 - (gw / gc))
        const gc_prime = gc_value * (1 - (instanceGw / instanceGc));
        
        // Calculate nc in sacks - (Vcf * gc_value) / m
        const nc = instanceM > 0 ? (vcfValue * gc_value) / instanceM : null;
        
        // Calculate Vw (water volume) - assumes water ratio to cement
        const vw = instanceM > 0 ? vcfValue * instanceGw : null;
        
        // Calculate Vfd (volume of fluid displacement)
        const vfd = (instanceGfc && instanceGf) ? 
                   vcfValue * (instanceGfc / instanceGf) * (1 - (instanceGw / instanceGc)) : null;
        
        // Calculate Pymax (maximum pressure at yield point)
        const pymax = nc && instanceGf ? nc * instanceGf * 9.81 : null;
        
        // Calculate Pc (confining pressure)
        const pc = pymax ? pymax * 0.85 : null; // Typical value is 85% of Pymax
        
        // Pfr remains constant at 5 usually
        const pfr = 5;
        
        // Calculate Ppmax (maximum pump pressure)
        const ppmax = pc ? (pc + pfr) / 10 : null;
        
        // Number of pump devices typically related to pressure requirements
        const n = ppmax ? Math.ceil(ppmax) : null; // ppmax is already in units of MPa/10
        
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
                    <p class="font-mono text-sm">Gc = (Hc × (γc - γw)) / Vcf</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>γc - γw = ${instanceGc.toFixed(4)} - ${instanceGw.toFixed(4)} = ${(instanceGc - instanceGw).toFixed(4)}</li>
                      <li>Hc × (γc - γw) = ${instanceHc.toFixed(4)} × ${(instanceGc - instanceGw).toFixed(4)} = ${(instanceHc * (instanceGc - instanceGw)).toFixed(4)}</li>
                      <li>(Hc × (γc - γw)) / Vcf = ${(instanceHc * (instanceGc - instanceGw)).toFixed(4)} / ${vcfValue.toFixed(4)} = ${gc_value.toFixed(4)}</li>
                    </ol>
                    <p class="font-mono text-sm mt-2 font-bold">Gc = ${gc_value.toFixed(4)}</p>
                  </div>
                </div>
                
                <div class="border-t border-border/30 pt-4">
                  <p class="font-medium">G'c Calculation:</p>
                  <div class="mt-2 bg-background/60 p-3 rounded">
                    <p class="font-mono text-sm">G'c = Gc × (1 - (γw / γc))</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>γw / γc = ${instanceGw.toFixed(4)} / ${instanceGc.toFixed(4)} = ${(instanceGw / instanceGc).toFixed(4)}</li>
                      <li>1 - (γw / γc) = 1 - ${(instanceGw / instanceGc).toFixed(4)} = ${(1 - (instanceGw / instanceGc)).toFixed(4)}</li>
                      <li>Gc × (1 - (γw / γc)) = ${gc_value.toFixed(4)} × ${(1 - (instanceGw / instanceGc)).toFixed(4)} = ${gc_prime.toFixed(4)}</li>
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
                    <p class="font-mono text-sm">Vw = Vcf × γw</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>Vcf × γw = ${vcfValue.toFixed(4)} × ${instanceGw.toFixed(4)} = ${vw !== null ? vw.toFixed(4) : "N/A"}</li>
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
                    <p class="font-mono text-sm">Pymax = nc × γf × 9.81</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>nc × γf = ${nc.toFixed(4)} × ${instanceGf.toFixed(4)} = ${(nc * instanceGf).toFixed(4)}</li>
                      <li>nc × γf × 9.81 = ${(nc * instanceGf).toFixed(4)} × 9.81 = ${pymax !== null ? pymax.toFixed(4) : "N/A"}</li>
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
                    <p class="font-mono text-sm">Ppmax = (Pc + Pfr) / 10</p>
                    <p class="font-mono text-sm mt-1">Where Pfr (friction pressure) = 5 MPa (constant)</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>Pc + Pfr = ${pc !== null ? pc.toFixed(4) : "N/A"} + ${pfr} = ${pc !== null ? (pc + pfr).toFixed(4) : "N/A"}</li>
                      <li>(Pc + Pfr) / 10 = ${pc !== null ? (pc + pfr).toFixed(4) : "N/A"} / 10 = ${ppmax !== null ? ppmax.toFixed(4) : "N/A"}</li>
                    </ol>
                    <p class="font-mono text-sm mt-2 font-bold">Ppmax = ${ppmax !== null ? ppmax.toFixed(4) : "N/A"} MPa/10</p>
                  </div>
                </div>
                
                <div class="border-t border-border/30 pt-4">
                  <p class="font-medium">n (Number of Pumps) Calculation:</p>
                  <div class="mt-2 bg-background/60 p-3 rounded">
                    <p class="font-mono text-sm">n = Ceiling(Ppmax)</p>
                    <p class="font-mono text-sm mt-1">Since Ppmax is already in units of MPa/10</p>
                    <ol class="list-decimal list-inside space-y-1 mt-2 font-mono text-sm">
                      <li>Ceiling(Ppmax) = Ceiling(${ppmax !== null ? ppmax.toFixed(4) : "N/A"}) = ${n !== null ? n : "N/A"}</li>
                    </ol>
                    <p class="font-mono text-sm mt-2 font-bold">n = ${n !== null ? n : "N/A"} pumps</p>
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
          n: n
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

  // Function to handle pump file selection and processing
  const handlePumpFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setPumpFile(file);
    setPumpFileName(file.name);
  };
  
  // Function to process pump file and select suitable ones based on Ppmax
  const processPumpFileSelection = async () => {
    if (!pumpFile || !gcResults || gcResults.length === 0) {
      // showToast('error', "Please upload a pump data file and calculate GC results first");
      return;
    }
    
    setIsPumpSelectionLoading(true);
    
    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append('file', pumpFile);
      
      // Add Ppmax values for each instance
      const ppmaxValues: Record<string, number> = {};
      
      // Extract Ppmax values from GC results
      gcResults.forEach(result => {
        if (result.ppmax !== null) {
          ppmaxValues[`ppmax_${result.instance}`] = result.ppmax;
        }
      });
      
      formData.append('ppmaxValues', JSON.stringify(ppmaxValues));
      formData.append('diameter', selectedDiameter.toString());
      
      // Send file to server for processing
      const response = await fetch('/api/process-pump-file', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPumpResults(data.results);
        // showToast('success', "Pump selection completed successfully");
      } else {
        // showToast('error', data.message || "Error processing pump file");
      }
    } catch (error) {
      console.error('Error processing pump file:', error);
      // showToast('error', "Failed to process pump file");
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
      case 'm': return mValue;
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
    loadInputData();
    
    // Try to load from legacy storage if needed
    loadInputsFromLegacyStorage();

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
    k1Value, k2Value, k3Value, mValue,
    tfcValue, tfdValue, tdValue,
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

  const updateMValue = (value: string) => {
    setMValue(value);
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

                  {renderInputField('m', 'm value (for gc only)', mValue, updateMValue)}

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {renderInputField('tfc', 'tfc', tfcValue, updateTfcValue)}
                    {renderInputField('tfd', 'tfd', tfdValue, updateTfdValue)}
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

                      {renderInputField('m', 'm value (for gc only)', mValue, updateMValue)}
                      
                      {renderInputField('h', 'h (height parameter)', hValue, updateHValue, 'm')}

                      <div className="grid grid-cols-3 gap-4 mt-4">
                        {renderInputField('tfc', 'tfc', tfcValue, updateTfcValue)}
                        {renderInputField('tfd', 'tfd', tfdValue, updateTfdValue)}
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

                {/* Results Table */}
                {pumpResults.length > 0 && (
                  <Card className="border-border/40 shadow-sm">
                    <CardHeader className="bg-muted/30 border-b border-border/30">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-1 bg-green-500 rounded-full" />
                        <CardTitle>Matching Pumps</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[600px] w-full">
                        <div className="p-0">
                          {/* Group pumps by instance */}
                          {Array.from(new Set(pumpResults.map(p => p.instance))).sort((a, b) => a - b).map(instance => (
                            <div key={instance} className="mb-8">
                              <div className="px-6 py-3 bg-muted/50 border-y border-border/50">
                                <h3 className="text-lg font-medium">
                                  Instance {instance} - Ppmax: {pumpResults.find(p => p.instance === instance)?.ppmax.toFixed(4)} MPa
                                </h3>
                              </div>
                              
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[180px]">Type/Model</TableHead>
                                    <TableHead>Diameter (in)</TableHead>
                                    <TableHead>Pressure (MPa)</TableHead>
                                    <TableHead>Flow Rate</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead className="text-right"></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {pumpResults
                                    .filter(pump => pump.instance === instance)
                                    .map((pump, index) => (
                                      <TableRow 
                                        key={`${instance}-${index}`}
                                        className={pump.isRecommended ? "bg-green-500/10" : ""}
                                      >
                                        <TableCell className="font-medium flex items-center">
                                          {pump.type}
                                          {pump.isRecommended && (
                                            <Badge className="ml-2 bg-green-500 hover:bg-green-600">
                                              Recommended
                                            </Badge>
                                          )}
                                        </TableCell>
                                        <TableCell>{pump.diameter}</TableCell>
                                        <TableCell>{pump.pressure.toFixed(2)}</TableCell>
                                        <TableCell>{pump.flow.toFixed(2)}</TableCell>
                                        <TableCell>{pump.price.toFixed(2)}</TableCell>
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
                              <TableHead className="text-center">n</TableHead>
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
                                <TableCell className="text-center">{result.n?.toFixed(0) || "N/A"}</TableCell>
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
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-medium">Pump Data File</Label>
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
                        
                        <div className="flex justify-center">
                          <div className="w-full max-w-md">
                            <div className="flex items-center justify-center w-full">
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 border-border/50 hover:border-primary/50">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <svg className="w-8 h-8 mb-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                  </svg>
                                  <p className="mb-2 text-sm text-muted-foreground">
                                    <span className="font-medium">Click to upload</span> or drag and drop
                                  </p>
                                  <p className="text-xs text-muted-foreground">Excel file (.xlsx, .xls)</p>
                                </div>
                                <input 
                                  id="dropzone-file" 
                                  type="file" 
                                  className="hidden" 
                                  accept=".xlsx,.xls"
                                  onChange={handlePumpFileChange}
                                  ref={fileInputRef}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Pump Diameter Selection */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Select Pump Diameter</Label>
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
                                  {result.ppmax ? `${result.ppmax.toFixed(4)} MPa` : "N/A"}
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
                        disabled={isPumpSelectionLoading || !pumpFile}
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
} 