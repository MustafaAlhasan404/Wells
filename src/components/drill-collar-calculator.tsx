"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Save, FileUp, Calculator, CheckCircle, AlertCircle, X, LoaderCircle, Minimize, Maximize } from "lucide-react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { useFileUpload } from "@/context/FileUploadContext"
import { cn } from "@/lib/utils"
import { EnhancedTable } from "@/components/ui/enhanced-table"

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        toast.info("Loaded saved drill collar results", {
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
    toast.success("Data cleared", {
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
      toast.error("No casing results found", {
        icon: <AlertCircle className="h-4 w-4 text-destructive" />,
        description: "Please calculate casing values first."
      });
      return null;
    }
    
    // Get the original initial DCSG amount from storage
    const initialDcsg = getInitialDcsg();
    
    if (!initialDcsg) {
      toast.error("Initial DCSG value not found", {
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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setDrillCollarFile(selectedFile);
      setDrillCollarFileName(selectedFile.name);
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
      toast.error("Please select a file", {
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
      toast.error("No form data found", {
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
      
      // Update context for persistence across tab changes
      setContextDrillCollarResults(drillCollarResultsData);
      setDrillCollarCalculations(calculationsData);
      
      // Set animation classes for when results appear
      setIsTransitioning(true);
      setInputsMinimized(true);
      setInputsAnimationClass("animate-in fade-in slide-in-from-left duration-500");
      setResultsAnimationClass("animate-in fade-in slide-in-from-right duration-500");
      
      toast.success("Calculations completed", {
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
      
      toast.error("Error in calculations", {
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
                      Upload a drill collar table Excel file
                      {drillCollarFile && <span className="ml-1 text-green-500">(saved)</span>}
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
                  <div className="flex items-center gap-2">
                    <Input
                      id="drill-collar-file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="flex-1 focus:ring-1 focus:ring-primary"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        setDrillCollarFile(null);
                        setDrillCollarFileName("");
                        // Also clear from localStorage
                        localStorage.removeItem('drillCollarFileMetadata');
                        toast.info("File removed", { 
                          description: "The drill collar file has been removed." 
                        });
                      }}
                      disabled={!drillCollarFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
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
                      headers={["Section", "At Head (Dcsg)", "Nearest Bit Size", "Drill Collars"]}
                      rows={localDrillCollarResults.map(result => [
                        `${result.section} Section`,
                        `${result.atHead.toFixed(1)} mm`,
                        `${result.bitSize.toFixed(2)} mm`,
                        `${result.drillCollar.toFixed(2)} mm`
                      ])}
                      rounded={true}
                      highlightOnHover={true}
                      alternateRows={true}
                    />
                  </div>
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