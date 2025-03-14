"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { NavBar } from "@/components/nav-bar"
import { Save, FileUp, Calculator, CheckCircle, AlertCircle, X, LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import { SectionInput } from "@/utils/casingCalculations"
import CasingResults from "@/components/casing-results"
import HADResults from "@/components/had-results"
import { useFileUpload } from "@/context/FileUploadContext"

interface CasingCalculatorProps {}

export default function CasingCalculator({}: CasingCalculatorProps) {
  // Use the file upload context for file state and results
  const { 
    casingFile, 
    casingFileName,
    casingResults,
    hadData,
    setCasingFile, 
    setCasingFileName,
    setCasingResults,
    setHadData
  } = useFileUpload();
  
  const [initialDcsgAmount, setInitialDcsgAmount] = useState<string>("");
  const [iterations, setIterations] = useState<string>("3");
  const [sectionInputs, setSectionInputs] = useState<SectionInput[]>([
    { multiplier: "", metalType: "K-55", depth: "" },
    { multiplier: "", metalType: "P-110", depth: "" },
    { multiplier: "", metalType: "K-55", depth: "" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Update section inputs when iterations change
  useEffect(() => {
    const numIterations = parseInt(iterations);
    
    // Generate section names
    let sectionNames: string[] = [];
    if (numIterations === 3) {
      sectionNames = ["Production", "Intermediate", "Surface"];
    } else {
      sectionNames = ["Production"];
      for (let i = 0; i < numIterations - 2; i++) {
        sectionNames.push(`Intermediate ${i+1}`);
      }
      sectionNames.push("Surface");
    }
    
    // Default metal types
    const defaultMetalTypes = ["N-80", "P-110", "K-55"];
    
    // Create new sections array
    const newSections = Array(numIterations).fill(null).map((_, i) => {
      const existingSection = sectionInputs[i];
      return {
        multiplier: existingSection?.multiplier || "",
        metalType: existingSection?.metalType || defaultMetalTypes[Math.min(i, defaultMetalTypes.length - 1)],
        depth: existingSection?.depth || ""
      };
    });
    
    setSectionInputs(newSections);
  }, [iterations]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setCasingFile(selectedFile);
      setCasingFileName(selectedFile.name);
    }
  };

  const handleSectionInputChange = (index: number, field: keyof SectionInput, value: string) => {
    const updatedInputs = [...sectionInputs];
    updatedInputs[index][field] = value;
    setSectionInputs(updatedInputs);
  };

  const calculate = async () => {
    if (!casingFile) {
      toast.error("Please select a file", {
        icon: <AlertCircle className="h-4 w-4 text-destructive" />,
      });
      return;
    }

    if (!initialDcsgAmount) {
      toast.error("Please enter initial DCSG amount", {
        icon: <AlertCircle className="h-4 w-4 text-destructive" />,
      });
      return;
    }

    // Validate section inputs
    for (let i = 0; i < sectionInputs.length; i++) {
      const section = sectionInputs[i];
      if (!section.multiplier || !section.metalType || !section.depth) {
        toast.error(`Please fill in all fields for section ${i+1}`, {
          icon: <AlertCircle className="h-4 w-4 text-destructive" />,
        });
        return;
      }
      
      if (isNaN(parseFloat(section.multiplier)) || isNaN(parseFloat(section.depth))) {
        toast.error(`Invalid number format in section ${i+1}`, {
          icon: <AlertCircle className="h-4 w-4 text-destructive" />,
        });
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', casingFile);
      formData.append('initialDcsgAmount', initialDcsgAmount);
      formData.append('iterations', iterations);
      
      // Add section inputs
      sectionInputs.forEach((section, index) => {
        formData.append(`multiplier_${index}`, section.multiplier);
        formData.append(`metalType_${index}`, section.metalType);
        formData.append(`depth_${index}`, section.depth);
      });
      
      const response = await fetch('/api/process-file', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error response:", errorData);
        
        // Handle specific error cases
        if (errorData.error?.includes("Bit Size and Internal Diameter columns not found")) {
          throw new Error("The Excel file doesn't have the expected columns. Please ensure it contains 'Bit Size/Hole Size' and 'Internal Diameter/ID' columns.");
        } else if (errorData.error?.includes("at_body value not found")) {
          throw new Error("Could not find matching weight value for the specified outer diameter. Please check your input value.");
        } else {
          throw new Error(errorData.error || "Failed to process file");
        }
      }
      
      const data = await response.json();
      
      setCasingResults(data.results || []);
      setHadData(data.hadData || null);
      
      toast.success("Calculations completed", {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        description: "All calculations have been successfully processed."
      });
    } catch (err: any) {
      console.error("Error in submission:", err);
      setError(err.message || "Failed to calculate casing parameters");
      
      toast.error("Error in calculations", {
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
        description: err.message || "Failed to calculate casing parameters"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = () => {
    const data = {
      initialDcsgAmount,
      iterations,
      sectionInputs
    };
    
    // Save to localStorage
    localStorage.setItem('casingCalculatorData', JSON.stringify(data));
    
    toast.success("Data saved", {
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      description: "Your inputs have been saved."
    });
  };

  const loadSavedData = () => {
    const savedData = localStorage.getItem('casingCalculatorData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setInitialDcsgAmount(data.initialDcsgAmount || "");
        setIterations(data.iterations || "3");
        
        if (data.sectionInputs && Array.isArray(data.sectionInputs)) {
          // Ensure we have the right number of inputs
          if (data.sectionInputs.length === parseInt(data.iterations)) {
            setSectionInputs(data.sectionInputs);
          }
        }
      } catch (error) {
        console.error('Failed to load saved data:', error);
      }
    }
  };

  // Load saved data on component mount
  useEffect(() => {
    loadSavedData();
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <NavBar />
      <div className="px-4 sm:px-6 md:px-8 lg:px-10 max-w-7xl mx-auto w-full py-6 md:py-10 space-y-6 md:space-y-8 flex-1 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">Casing Calculator</h1>
          <div className="flex gap-2">
            <Button onClick={saveData} className="gap-2">
              <Save className="h-4 w-4" />
              Save Inputs
            </Button>
            <Button onClick={calculate} disabled={isLoading} variant="default" className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary">
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
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-6 md:space-y-10 pb-10">
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-muted/50 border-b border-border/50 flex items-center">
                <CardTitle className="text-lg sm:text-xl text-primary/90">File Selection</CardTitle>
                <CardDescription>
                  Select Excel file with casing data
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center gap-4">
                  <input 
                    type="file" 
                    accept=".xlsx,.xls" 
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    variant="outline"
                    className="gap-2"
                  >
                    <FileUp className="h-4 w-4" />
                    Select File
                  </Button>
                  {casingFile && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{casingFileName}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setCasingFile(null)}
                        className="h-6 px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-md text-red-600 dark:text-red-300 text-sm mt-2">
                    <div className="flex items-start">
                      <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />
                      <div>
                        <p className="font-medium">Error:</p>
                        <p>{error}</p>
                        <p className="mt-1 text-xs">
                          {error.includes("columns not found") && "Please ensure your Excel file has the correct column headers. The system looks for columns named like 'Bit Size', 'Hole Size', 'Internal Diameter', or 'ID'."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-muted/50 border-b border-border/50 flex items-center">
                <CardTitle className="text-lg sm:text-xl text-primary/90">Calculation Parameters</CardTitle>
                <CardDescription>
                  Enter basic calculation parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 md:pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="dcsg" className="text-base font-medium text-primary">
                      Initial DCSG amount
                    </Label>
                    <Input
                      id="dcsg"
                      placeholder="Enter initial DCSG amount"
                      value={initialDcsgAmount}
                      onChange={(e) => setInitialDcsgAmount(e.target.value)}
                      className="focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="iterations" className="text-base font-medium text-primary">
                      Number of iterations
                    </Label>
                    <Select 
                      value={iterations} 
                      onValueChange={(value: string) => setIterations(value)}
                    >
                      <SelectTrigger id="iterations" className="focus:ring-1 focus:ring-primary">
                        <SelectValue placeholder="Select iterations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-muted/50 border-b border-border/50 flex items-center">
                <CardTitle className="text-lg sm:text-xl text-primary/90">Section Parameters</CardTitle>
                <CardDescription>
                  Enter parameters for each section
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 md:pt-6">
                <div className="space-y-8">
                  {sectionInputs.map((section, index) => {
                    // Generate section names
                    let sectionName;
                    if (sectionInputs.length === 3) {
                      sectionName = ["Production", "Intermediate", "Surface"][index];
                    } else {
                      if (index === 0) {
                        sectionName = "Production";
                      } else if (index === sectionInputs.length - 1) {
                        sectionName = "Surface";
                      } else {
                        sectionName = `Intermediate ${index}`;
                      }
                    }
                    
                    return (
                      <div key={index} className="space-y-4">
                        <h3 className="text-lg font-semibold">{sectionName} Section:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor={`multiplier_${index}`} className="text-base font-medium text-primary">
                              Multiplier
                            </Label>
                            <Input
                              id={`multiplier_${index}`}
                              placeholder="Enter multiplier"
                              value={section.multiplier}
                              onChange={(e) => handleSectionInputChange(index, 'multiplier', e.target.value)}
                              className="focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`metalType_${index}`} className="text-base font-medium text-primary">
                              Metal Type
                            </Label>
                            <Select 
                              value={section.metalType} 
                              onValueChange={(value: string) => handleSectionInputChange(index, 'metalType', value)}
                            >
                              <SelectTrigger id={`metalType_${index}`} className="focus:ring-1 focus:ring-primary">
                                <SelectValue placeholder="Select metal type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="K-55">K-55</SelectItem>
                                <SelectItem value="L-80">L-80</SelectItem>
                                <SelectItem value="N-80">N-80</SelectItem>
                                <SelectItem value="P-110">P-110</SelectItem>
                                <SelectItem value="Q-125">Q-125</SelectItem>
                                <SelectItem value="T-95">T-95</SelectItem>
                                <SelectItem value="C-90">C-90</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`depth_${index}`} className="text-base font-medium text-primary">
                              Depth
                            </Label>
                            <Input
                              id={`depth_${index}`}
                              placeholder="Enter depth"
                              value={section.depth}
                              onChange={(e) => handleSectionInputChange(index, 'depth', e.target.value)}
                              className="focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            
            {/* Results */}
            {casingResults.length > 0 && (
              <Card className="border-primary/20 shadow-md">
                <CardHeader className="bg-muted/50 border-b border-border/50 flex items-center">
                  <CardTitle className="text-lg sm:text-xl text-primary/90">Calculation Results</CardTitle>
                  <CardDescription>
                    Section by section details
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 md:pt-6">
                  <CasingResults results={casingResults} />
                </CardContent>
              </Card>
            )}
            
            {/* HAD Results */}
            {hadData && (
              <Card className="border-primary/20 shadow-md">
                <CardHeader className="bg-muted/50 border-b border-border/50 flex items-center">
                  <CardTitle className="text-lg sm:text-xl text-primary/90">HAD Results</CardTitle>
                  <CardDescription>
                    Hydraulic Analysis and Design results
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 md:pt-6">
                  <HADResults hadData={hadData} />
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
} 