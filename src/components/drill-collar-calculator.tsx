"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Save, FileUp, Calculator, CheckCircle, AlertCircle, X, LoaderCircle, Minimize, Maximize } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { useFileUpload } from "@/context/FileUploadContext"
import { cn } from "@/lib/utils"
import { EnhancedTable } from "@/components/ui/enhanced-table"
import { showToast } from "@/utils/toast-utils"
import { formatMmWithInches } from "@/utils/casingCalculations"

interface DrillCollarCalculatorProps {}

export default function DrillCollarCalculator({}: DrillCollarCalculatorProps) {
  // Use the file upload context for file state and results
  const { 
    casingResults,
    setCasingResults,
    drillCollarFile,
    setDrillCollarFile,
    drillCollarFileName,
    setDrillCollarFileName,
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
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  // State for input minimization
  const [inputsMinimized, setInputsMinimized] = useState(false);
  // Animation state
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Animation classes
  const [inputsAnimationClass, setInputsAnimationClass] = useState("");
  const [resultsAnimationClass, setResultsAnimationClass] = useState("");
  
  // Load stored results on mount
  useEffect(() => {
    if (contextDrillCollarResults && contextDrillCollarResults.length > 0) {
      setLocalDrillCollarResults(contextDrillCollarResults);
      
      if (drillCollarCalculations && drillCollarCalculations.length > 0) {
        setCalculations(drillCollarCalculations);
      }
      
      // Auto minimize inputs if we have results
      setInputsMinimized(true);
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
  
  // Attempt to restore file from localStorage on component mount
  // Note: We can't store the actual File object, only its metadata
  useEffect(() => {
    // Don't attempt to restore if we already have a file from context
    if (!drillCollarFile) {
      try {
        const fileMetadata = localStorage.getItem('drillCollarFileMetadata');
        if (fileMetadata) {
          const { name } = JSON.parse(fileMetadata);
          setDrillCollarFileName(name);
        }
      } catch (error) {
        console.error('Failed to restore file metadata from localStorage:', error);
      }
    }
  }, [drillCollarFile]);
  
  // Store file metadata in localStorage whenever it changes
  useEffect(() => {
    if (drillCollarFile) {
      try {
        const metadata = { 
          name: drillCollarFileName,
          lastModified: drillCollarFile.lastModified,
          type: drillCollarFile.type,
          size: drillCollarFile.size
        };
        localStorage.setItem('drillCollarFileMetadata', JSON.stringify(metadata));
      } catch (error) {
        console.error('Failed to save file metadata to localStorage:', error);
      }
    } else if (!drillCollarFile && !drillCollarFileName) {
      // Clear metadata if file is cleared
      localStorage.removeItem('drillCollarFileMetadata');
    }
  }, [drillCollarFile, drillCollarFileName]);
  
  // Load saved results from localStorage on mount
  useEffect(() => {
    try {
      const savedResults = localStorage.getItem('drillCollarResults');
      const savedCalculations = localStorage.getItem('drillCollarCalculations');
      
      if (savedResults && (!contextDrillCollarResults || contextDrillCollarResults.length === 0)) {
        const parsedResults = JSON.parse(savedResults);
        setLocalDrillCollarResults(parsedResults);
        setContextDrillCollarResults(parsedResults);
        
        // Auto minimize inputs if we have results
        setInputsMinimized(true);
        
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
  
  // Function to clear all saved data
  const clearSavedData = () => {
    // Clear local state
    setLocalDrillCollarResults([]);
    setCalculations([]);
    setDrillCollarData(null);
    
    // Clear context
    setContextDrillCollarResults([]);
    setDrillCollarCalculations([]);
    
    // Clear file data
    setDrillCollarFile(null);
    setDrillCollarFileName("");
    
    // Clear localStorage
    localStorage.removeItem('drillCollarResults');
    localStorage.removeItem('drillCollarCalculations');
    localStorage.removeItem('drillCollarFileMetadata');
    
    // Reset UI state
    setInputsMinimized(false);
    
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
      showToast('error', "No casing results found", {
        icon: <AlertCircle className="h-4 w-4 text-destructive" />,
        description: "Please calculate casing values first."
      });
      return null;
    }
    
    // Get the original initial DCSG amount from storage
    const initialDcsg = getInitialDcsg();
    
    if (!initialDcsg) {
      showToast('error', "Initial DCSG value not found", {
        icon: <AlertCircle className="h-4 w-4 text-destructive" />,
        description: "Please recalculate casing values first."
      });
      return null;
    }
    
    // Extract at head values and nearest bit sizes
    const atHeadValues: number[] = [];
    const nearestBitSizes: number[] = [];
    
    casingResults.forEach(result => {
      // Extract at head value from dcsg
      const dcsgMatch = result.dcsg?.match(/^([\d.]+)/);
      if (dcsgMatch) {
        atHeadValues.push(parseFloat(dcsgMatch[1]));
      }
      
      // Extract nearest bit size
      const bitSizeMatch = result.nearestBitSize?.match(/^([\d.]+)/);
      if (bitSizeMatch) {
        nearestBitSizes.push(parseFloat(bitSizeMatch[1]));
      }
    });
    
    return {
      initialDcsg,
      atHeadValues,
      nearestBitSizes
    };
  };
  
  // Add a function to load the file from the public directory
  const loadDrillCollarFile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/tables/Formation%20design.xlsx');
      if (!response.ok) throw new Error('Failed to fetch the drill collar file.');
      const blob = await response.blob();
      // Create a File object if possible
      let file: File;
      try {
        file = new File([blob], 'Formation design.xlsx', { type: blob.type });
      } catch {
        setError('File API is not supported in this browser.');
        showToast('error', 'Load failed', { description: 'File API is not supported in this browser.' });
        setIsLoading(false);
        return;
      }
      setDrillCollarFile(file);
      setDrillCollarFileName('Formation design.xlsx');
      showToast('success', 'File loaded', { description: 'Drill collar file loaded from public directory.' });
    } catch (err: any) {
      setError(err.message || 'Failed to load drill collar file.');
      showToast('error', 'Load failed', { description: err.message || 'Failed to load drill collar file.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle minimized state with animation
  const toggleMinimized = () => {
    if (localDrillCollarResults.length === 0) return; // Only allow toggling when there are results
    
    setIsTransitioning(true);
    const newState = !inputsMinimized;
    setInputsMinimized(newState);
    
    // Add animation classes based on the state change
    if (newState) {
      // Minimizing - inputs slide to left, results slide from right
      setInputsAnimationClass("animate-in fade-in slide-in-from-left duration-500");
      setResultsAnimationClass("animate-in fade-in slide-in-from-right duration-500");
    } else {
      // Maximizing - inputs slide from left, results slide to right
      setInputsAnimationClass("animate-in fade-in slide-in-from-left duration-500");
      setResultsAnimationClass("animate-in fade-in slide-in-from-right-reverse duration-500");
    }
    
    // Reset transition flag after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
      setInputsAnimationClass("");
      setResultsAnimationClass("");
    }, 600);
  };
  
  const calculateDrillCollar = async () => {
    if (!drillCollarFile) {
      showToast('error', "Please select a file", {
        icon: <AlertCircle className="h-4 w-4 text-destructive" />,
        description: "Please upload a drill collar table Excel file."
      });
      return;
    }
    
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
      apiFormData.append('file', drillCollarFile);
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
      
      // Update both local state and context
      const drillCollarResultsData = data.drillCollarResults || [];
      const calculationsData = data.calculations || [];
      
      setLocalDrillCollarResults(drillCollarResultsData);
      setCalculations(calculationsData);
      setDrillCollarData(data.drillCollarData || null);
      
      // Save debug info with b values
      if (data.debugInfo && data.debugInfo.bValues) {
        setBValueDebugInfo(data.debugInfo.bValues);
      }
      
      // Update context for persistence across tab changes
      setContextDrillCollarResults(drillCollarResultsData);
      setDrillCollarCalculations(calculationsData);
      
      // Set animation classes for when results appear
      setIsTransitioning(true);
      setInputsMinimized(true);
      setInputsAnimationClass("animate-in fade-in slide-in-from-left duration-500");
      setResultsAnimationClass("animate-in fade-in slide-in-from-right duration-500");
      
      showToast('success', "Calculations completed", {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        description: "Drill collar calculations have been successfully processed."
      });
      
      // Reset transition flag after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
        setInputsAnimationClass("");
        setResultsAnimationClass("");
      }, 600);
      
    } catch (err: any) {
      console.error("Error in submission:", err);
      setError(err.message || "Failed to calculate drill collar values");
      
      showToast('error', "Error in calculations", {
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
        description: err.message || "Failed to calculate drill collar values"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">Drill Collar Calculator</h1>
        <div className="flex gap-2">
          <Button onClick={calculateDrillCollar} disabled={isLoading || !drillCollarFile} variant="default" className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary">
            {isLoading ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4" />
                Calculate
              </>
            )}
          </Button>
          {localDrillCollarResults.length > 0 && (
            <>
              <Button 
                onClick={toggleMinimized} 
                variant="outline" 
                className="gap-2"
                title={inputsMinimized ? "Maximize inputs" : "Minimize inputs"}
              >
                {inputsMinimized ? (
                  <>
                    <Maximize className="h-4 w-4" />
                    Maximize
                  </>
                ) : (
                  <>
                    <Minimize className="h-4 w-4" />
                    Minimize
                  </>
                )}
              </Button>
              <Button 
                onClick={clearSavedData} 
                variant="outline" 
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Clear all saved data"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className={cn(
          "space-y-4 md:space-y-6 pb-6",
          "transition-all duration-500 ease-in-out",
          isTransitioning && "opacity-90",
          inputsMinimized && localDrillCollarResults.length > 0 && "flex flex-col md:flex-row gap-4"
        )}>
          {/* Input section */}
          <div className={cn(
            "space-y-4 relative", 
            "transition-all duration-500 ease-in-out",
            inputsAnimationClass,
            inputsMinimized && localDrillCollarResults.length > 0 && "md:w-1/3"
          )}>
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-muted/50 border-b border-border/50 py-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg text-primary/90">File Selection</CardTitle>
                    <CardDescription className="text-sm">
                      Load the drill collar table Excel file from the public directory
                      {drillCollarFile && <span className="ml-1 text-green-500">(loaded)</span>}
                    </CardDescription>
                  </div>
                  {drillCollarFile && (
                    <div className="flex items-center gap-2 text-sm text-green-500">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className={cn(
                "pt-3 pb-3",
                inputsMinimized && "hidden md:block"
              )}>
                <div className="space-y-2">
                  <Button
                    variant="default"
                    onClick={loadDrillCollarFile}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                    ) : (
                      <>Load</>
                    )}
                  </Button>
                  {drillCollarFileName && (
                    <div className="text-sm text-muted-foreground truncate">
                      {drillCollarFileName}
                    </div>
                  )}
                  {error && (
                    <div className="p-2 mt-2 rounded-md bg-destructive/10 text-destructive text-sm">
                      {error}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Results section */}
          {(localDrillCollarResults.length > 0) && (
            <div className={cn(
              "transition-all duration-500 ease-in-out",
              resultsAnimationClass,
              inputsMinimized ? "md:w-2/3" : "w-full"
            )}>
              <Card className="border-primary/20 shadow-md">
                <CardHeader className="bg-muted/50 border-b border-border/50 py-3">
                  <CardTitle className="text-lg text-primary/90">Drill Collar Results</CardTitle>
                  <CardDescription className="text-sm">
                    Section by section details
                    <span className="ml-1 text-green-500">(saved)</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-3 pb-3">
                  <div className="overflow-auto">
                    <EnhancedTable
                      headers={["Section", "Drill Collars", "Number of Columns"]}
                      rows={localDrillCollarResults.map(result => [
                        `${result.section} Section`,
                        formatMmWithInches(result.drillCollar.toFixed(2)),
                        result.numberOfColumns || "N/A"
                      ])}
                      rounded={true}
                      highlightOnHover={true}
                      alternateRows={true}
                    />
                  </div>
                  
                  {/* Debug Toggle Button */}
                  <div className="mt-6 flex justify-end">
                    <Button 
                      onClick={() => setShowDebugInfo(!showDebugInfo)} 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                    >
                      {showDebugInfo ? "Hide Debug Info" : "Show Debug Info"}
                    </Button>
                  </div>
                  
                  {/* Debug Calculation Information - only shown when toggled */}
                  {showDebugInfo && (
                    <div className="mt-3 border border-border/40 rounded-md p-4 bg-muted/10">
                      <h3 className="text-base font-semibold mb-3 text-primary">Debug Calculation Information</h3>
                      <p className="text-sm mb-3">This shows how the Number of Columns is calculated (L0c / 9):</p>
                      
                      <div className="space-y-4">
                        {localDrillCollarResults.map((result, index) => {
                          const instanceNum = index + 1;
                          const formData = getCasingData();
                          const correspondingCalc = calculations.find(c => 
                            (c.instance === instanceNum && result.section === (
                              instanceNum === 1 ? "Production" : 
                              instanceNum === 2 ? "Intermediate" : "Surface"))
                          );
                          
                          // Find b value from debug info
                          const debugBValue = bValueDebugInfo && bValueDebugInfo.length > 0 
                            ? bValueDebugInfo.find(info => 
                                info && info.section === result.section
                              )
                            : null;
                          
                          return (
                            <div key={index} className="border border-border/30 rounded-md p-3 bg-background/50">
                              <h4 className="font-medium mb-2 text-sm">{result.section} Section Calculation:</h4>
                              
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="bg-muted/20 p-2 rounded border border-border/20">
                                  <span className="font-semibold">Input Values:</span>
                                  {formData && (
                                    <div className="mt-1 space-y-1">
                                      <div>WOB_{instanceNum}: {formData[`WOB_${instanceNum}`] || "Not found"}</div>
                                      <div>C_{instanceNum}: {formData[`C_${instanceNum}`] || "Not found"}</div>
                                      <div>qc_{instanceNum}: {formData[`qc_${instanceNum}`] || "Not found"}</div>
                                      <div>γ_{instanceNum}: {formData[`γ_${instanceNum}`] || "Not found"}</div>
                                      <div>
                                        b_{instanceNum}: {debugBValue && typeof debugBValue.bValue === 'number' 
                                          ? debugBValue.bValue.toFixed(4) 
                                          : "Not found"} {debugBValue && debugBValue.gamma && (
                                            <span className="text-green-500">
                                              (derived from Excel based on γ={debugBValue.gamma})
                                            </span>
                                          )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="bg-muted/20 p-2 rounded border border-border/20">
                                  <span className="font-semibold">Calculation:</span>
                                  <div className="mt-1 space-y-1">
                                    <div>Drill Collar: {formatMmWithInches(result.drillCollar.toFixed(2))}</div>
                                    
                                    {(typeof result.numberOfColumns === 'undefined' || result.numberOfColumns === null) && (
                                      <div className="text-amber-500">
                                        No L0c data available for this section. This could happen if:
                                        <ul className="list-disc list-inside mt-1">
                                          <li>Missing corresponding calculation instance</li>
                                          <li>Required input values were not found</li>
                                          <li>Instance/section mapping mismatch</li>
                                        </ul>
                                      </div>
                                    )}
                                    
                                    {typeof result.numberOfColumns !== 'undefined' && result.numberOfColumns !== null && (
                                      <>
                                        <div className="mt-1">L0c: WOB / (C * qc * b) ≈ {(result.numberOfColumns * 9).toFixed(2)}</div>
                                        <div>Number of Columns: L0c / 9 = {result.numberOfColumns}</div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-3 text-xs">
                                <span className="font-semibold">Matching Calculation Instance:</span> {
                                  correspondingCalc 
                                    ? `Instance ${correspondingCalc.instance}`
                                    : "No matching calculation found"
                                }
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {calculations.length > 0 && (
                <Card className="border-primary/20 shadow-md mt-4">
                  <CardHeader className="bg-muted/50 border-b border-border/50 py-3">
                    <CardTitle className="text-lg text-primary/90">Calculation Results</CardTitle>
                    <CardDescription className="text-sm">
                      Metal grade and maximum length calculations
                      <span className="ml-1 text-green-500">(saved)</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-3 pb-3">
                    <div className="overflow-auto">
                      <EnhancedTable
                        headers={["Instance", "Drill Pipe Metal Grade", "Lmax"]}
                        rows={calculations.map(calc => [
                          calc.instance,
                          calc.drillPipeMetalGrade || "N/A",
                          calc.Lmax
                        ])}
                        rounded={true}
                        highlightOnHover={true}
                        alternateRows={true}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 