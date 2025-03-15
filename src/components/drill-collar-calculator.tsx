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

interface DrillCollarCalculatorProps {}

export default function DrillCollarCalculator({}: DrillCollarCalculatorProps) {
  // Use the file upload context for file state and results
  const { 
    casingResults,
    setCasingResults,
  } = useFileUpload();
  
  const [drillCollarFile, setDrillCollarFile] = useState<File | null>(null);
  const [drillCollarFileName, setDrillCollarFileName] = useState<string>("");
  const [drillCollarResults, setDrillCollarResults] = useState<any[]>([]);
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
    if (drillCollarResults.length === 0) return; // Only allow toggling when there are results
    
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
      
      setDrillCollarResults(data.drillCollarResults || []);
      setCalculations(data.calculations || []);
      setDrillCollarData(data.drillCollarData || null);
      
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
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
          {drillCollarResults.length > 0 && (
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
          )}
        </div>
      </div>
      
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className={cn(
          "space-y-6 md:space-y-10 pb-10",
          "transition-all duration-500 ease-in-out",
          isTransitioning && "opacity-90",
          inputsMinimized && drillCollarResults.length > 0 && "flex flex-col md:flex-row gap-6"
        )}>
          {/* Input section */}
          <div className={cn(
            "space-y-6 relative", 
            "transition-all duration-500 ease-in-out",
            inputsAnimationClass,
            inputsMinimized && drillCollarResults.length > 0 && "md:w-1/3"
          )}>
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-muted/50 border-b border-border/50">
                <CardTitle className="text-lg sm:text-xl text-primary/90">File Selection</CardTitle>
                <CardDescription>
                  Upload a drill collar table Excel file
                </CardDescription>
              </CardHeader>
              <CardContent className={cn(
                "pt-4 md:pt-6",
                inputsMinimized && "hidden md:block"
              )}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="drill-collar-file" className="text-base font-medium text-primary">Drill Collar Table</Label>
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
                        }}
                        disabled={!drillCollarFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {drillCollarFileName && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{drillCollarFileName}</span>
                      </div>
                    )}
                  </div>
                  
                  {error && (
                    <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                      {error}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Results section */}
          {drillCollarResults.length > 0 && (
            <div className={cn(
              "transition-all duration-500 ease-in-out",
              resultsAnimationClass,
              inputsMinimized ? "md:w-2/3" : "w-full"
            )}>
              <Card className="border-primary/20 shadow-md">
                <CardHeader className="bg-muted/50 border-b border-border/50">
                  <CardTitle className="text-lg sm:text-xl text-primary/90">Drill Collar Results</CardTitle>
                  <CardDescription>Section by section details</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 md:pt-6">
                  <div className="overflow-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-primary text-primary-foreground">
                          <th className="py-3 px-4 text-center border border-border/50">Section</th>
                          <th className="py-3 px-4 text-center border border-border/50">At Head (Dcsg)</th>
                          <th className="py-3 px-4 text-center border border-border/50">Nearest Bit Size</th>
                          <th className="py-3 px-4 text-center border border-border/50">Drill Collars</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drillCollarResults.map((result, index) => (
                          <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                            <td className="py-3 px-4 text-center border border-border/50">{result.section} Section</td>
                            <td className="py-3 px-4 text-center border border-border/50">{result.atHead.toFixed(1)} mm</td>
                            <td className="py-3 px-4 text-center border border-border/50">{result.bitSize.toFixed(2)} mm</td>
                            <td className="py-3 px-4 text-center border border-border/50">{result.drillCollar.toFixed(2)} mm</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              
              {calculations.length > 0 && (
                <Card className="border-primary/20 shadow-md mt-6">
                  <CardHeader className="bg-muted/50 border-b border-border/50">
                    <CardTitle className="text-lg sm:text-xl text-primary/90">Calculation Results</CardTitle>
                    <CardDescription>Metal grade and maximum length calculations</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 md:pt-6">
                    <div className="overflow-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-primary text-primary-foreground">
                            <th className="py-3 px-4 text-center border border-border/50">Instance</th>
                            <th className="py-3 px-4 text-center border border-border/50">Drill Pipe Metal Grade</th>
                            <th className="py-3 px-4 text-center border border-border/50">Lmax</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculations.map((calc, index) => (
                            <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                              <td className="py-3 px-4 text-center border border-border/50">{calc.instance}</td>
                              <td className="py-3 px-4 text-center border border-border/50">{calc.drillPipeMetalGrade || "N/A"}</td>
                              <td className="py-3 px-4 text-center border border-border/50">{calc.Lmax}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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