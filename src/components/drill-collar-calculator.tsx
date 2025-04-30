"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Save, FileUp, Calculator, CheckCircle, AlertCircle, X, LoaderCircle, Minimize, Maximize, Download, Layers, FileDown, Check } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { useFileUpload } from "@/context/FileUploadContext"
import { cn } from "@/lib/utils"
import { EnhancedTable } from "@/components/ui/enhanced-table"
import { showToast } from "@/utils/toast-utils"
import { formatMmWithInches } from "@/utils/casingCalculations"
import { motion } from "framer-motion"

interface DrillCollarCalculatorProps {}

export default function DrillCollarCalculator({}: DrillCollarCalculatorProps) {
  // Use the file upload context for file state and results
  const { 
    casingResults,
    setCasingResults,
    drillCollarResults: contextDrillCollarResults,
    setDrillCollarResults: setContextDrillCollarResults,
    drillCollarCalculations,
    setDrillCollarCalculations
  } = useFileUpload();
  
  // Local state for UI management
  const [localDrillCollarResults, setLocalDrillCollarResults] = useState<any[]>([]);
  const [calculations, setCalculations] = useState<any[]>([]);
  const [drillCollarData, setDrillCollarData] = useState<any>(null);
  const [bValueDebugInfo, setBValueDebugInfo] = useState<{
    instance: number;
    gamma: number;
    bValue: number;
    section: string;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCalculated, setIsCalculated] = useState(false);
  
  // Load stored results on mount
  useEffect(() => {
    if (contextDrillCollarResults && contextDrillCollarResults.length > 0) {
      setLocalDrillCollarResults(contextDrillCollarResults);
      
      if (drillCollarCalculations && drillCollarCalculations.length > 0) {
        setCalculations(drillCollarCalculations);
      }
    }
  }, [contextDrillCollarResults, drillCollarCalculations]);
  
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
        setLocalDrillCollarResults(parsedResults);
        setContextDrillCollarResults(parsedResults);
        
        // Show toast notification to inform user that data was loaded
        showToast('info', "Loaded saved drill collar results", {
          description: "Previous calculation results have been restored."
        });
      }
      
      if (savedCalculations && (!drillCollarCalculations || drillCollarCalculations.length === 0)) {
        const parsedCalculations = JSON.parse(savedCalculations);
        setCalculations(parsedCalculations);
        setDrillCollarCalculations(parsedCalculations);
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
      
      // Update state with the results
      setLocalDrillCollarResults(data.drillCollarResults || []);
      setDrillCollarData(data.drillCollarData || {});
      
      // Use extended calculations if available, otherwise use regular calculations
      setCalculations(data.extendedCalculations || data.calculations || []);
      
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
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 bg-primary rounded-full"></div>
                <h3 className="text-lg font-medium">Metal Grade Results</h3>
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
                    {calculations.map((calc, index) => (
                      <tr key={index} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">{formatSection(calc.section)}</td>
                        <td className="px-4 py-3 font-medium text-primary">{calc.drillPipeMetalGrade}</td>
                        <td className="px-4 py-3">{calc.Lmax} m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
} 