"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { NavBar } from "@/components/nav-bar"
import { FileDown, Calculator, CheckCircle, AlertCircle, X, LoaderCircle, Edit2 } from "lucide-react"
import { SectionInput } from "@/utils/casingCalculations"
import CasingResults from "@/components/casing-results"
import HADResults from "@/components/had-results"
import { useFileUpload } from "@/context/FileUploadContext"
import { cn } from "@/lib/utils"
import { showToast } from "@/utils/toast-utils"
import { motion } from "framer-motion"
import { HelpTooltip } from "@/components/ui/help-tooltip"

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
  const [error, setError] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(!casingResults || casingResults.length === 0);

  // Update sectionInputs when iterations change
  useEffect(() => {
    const newCount = parseInt(iterations);
    const currentCount = sectionInputs.length;
    
    if (newCount !== currentCount) {
      let newSectionInputs = [...sectionInputs];
      
      if (newCount > currentCount) {
        // Add new sections
        for (let i = 0; i < newCount - currentCount; i++) {
          newSectionInputs.push({ multiplier: "", metalType: "K-55", depth: "" });
        }
      } else {
        // Remove sections
        newSectionInputs = newSectionInputs.slice(0, newCount);
      }
      
      setSectionInputs(newSectionInputs);
    }
  }, [iterations]);

  const handleSectionInputChange = (index: number, field: keyof SectionInput, value: string) => {
    const updatedInputs = [...sectionInputs];
    updatedInputs[index][field] = value;
    setSectionInputs(updatedInputs);
  };

  // Function to download the template Excel file
  const downloadTemplateFile = () => {
    window.open('/tables/FinalCasingTable.xlsx', '_blank');
  };

  const calculate = async () => {
    // Auto-save the inputs when calculating
    const data = {
      initialDcsgAmount,
      iterations,
      sectionInputs
    };
    
    // Save to localStorage
    localStorage.setItem('casingCalculatorData', JSON.stringify(data));
    
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('useDefaultFile', 'true');
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
      
      const responseData = await response.json();
      
      setCasingResults(responseData.results || []);
      setHadData(responseData.hadData || null);
      setShowInput(false);
      
      showToast('success', "Calculations completed", {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        description: "All calculations have been successfully processed."
      });
    } catch (err: any) {
      console.error("Error in submission:", err);
      setError(err.message || "Failed to calculate casing parameters");
      
      showToast('error', "Error in calculations", {
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
        description: err.message || "Failed to calculate casing parameters"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearSavedData = () => {
    // Clear results
    setCasingResults([]);
    setHadData(null);
    // Clear file data
    setCasingFile(null);
    setCasingFileName("");
    // Show input form
    setShowInput(true);
    // Show toast notification
    showToast('success', "Data cleared", {
      description: "All casing calculation results have been reset."
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
          // Always update section inputs based on the saved iterations count
          const iterationsCount = parseInt(data.iterations || "3");
          let updatedInputs = [...data.sectionInputs];
          
          // Ensure we have exactly the right number of inputs
          if (updatedInputs.length < iterationsCount) {
            // Add more sections if needed
            for (let i = updatedInputs.length; i < iterationsCount; i++) {
              updatedInputs.push({ multiplier: "", metalType: "K-55", depth: "" });
            }
          } else if (updatedInputs.length > iterationsCount) {
            // Remove extra sections if needed
            updatedInputs = updatedInputs.slice(0, iterationsCount);
          }
          
          setSectionInputs(updatedInputs);
        }
      } catch (error) {
        console.error('Failed to load saved data:', error);
      }
    }
  };

  // Load saved data on component mount
  useEffect(() => {
    loadSavedData();
    
    // Add a LocalStorage persistence indicator if results are restored
    if (casingResults && casingResults.length > 0) {
      setShowInput(false);
      // Only show the toast if it's the first time loading results
      const hasShownToast = localStorage.getItem('casingResultsToastShown');
      if (!hasShownToast) {
        showToast('info', "Loaded saved casing results", {
          description: "Previous calculation results have been restored."
        });
        localStorage.setItem('casingResultsToastShown', 'true');
        
        // Clear the flag after a while so it shows again if user refreshes
        setTimeout(() => {
          localStorage.removeItem('casingResultsToastShown');
        }, 60000); // 1 minute
      }
    }
  }, [casingResults]);

  // Load the casing file from public directory when needed
  useEffect(() => {
    const loadPublicCasingFile = async () => {
      try {
        const response = await fetch('/tables/FinalCasingTable.xlsx');
        if (!response.ok) throw new Error('Failed to fetch the casing file.');
        const blob = await response.blob();
        const file = new File([blob], 'FinalCasingTable.xlsx', { type: blob.type });
        setCasingFile(file);
        setCasingFileName('FinalCasingTable.xlsx');
      } catch (err: any) {
        console.error("Error loading casing file:", err);
        setError(err.message || 'Failed to load casing file.');
      }
    };
    
    if (!casingFile) {
      loadPublicCasingFile();
    }
  }, []);

  const renderInputForm = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="initialDcsgAmount" className="text-base font-medium text-primary">
              Initial DCSG Amount
            </Label>
            <HelpTooltip text="The outer diameter for casing at body" />
          </div>
          <Input
            id="initialDcsgAmount"
            placeholder="Enter initial DCSG amount"
            value={initialDcsgAmount}
            onChange={(e) => setInitialDcsgAmount(e.target.value)}
            className="focus:ring-1 focus:ring-primary"
          />
        </div>
      
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="iterations" className="text-base font-medium text-primary">
              Number of Sections
            </Label>
            <HelpTooltip text="The sections drilled in the well" />
          </div>
          <Select value={iterations} onValueChange={setIterations}>
            <SelectTrigger className="w-full focus:ring-1 focus:ring-primary">
              <SelectValue placeholder="Select number of sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="5">5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-medium text-primary">Section Parameters</h3>
        {sectionInputs.map((section, index) => {
          // Generate section names
          let sectionName;
          if (sectionInputs.length === 2) {
            sectionName = ["Production", "Surface"][index];
          } else if (sectionInputs.length === 3) {
            sectionName = ["Production", "Intermediate", "Surface"][index];
          } else if (sectionInputs.length === 4) {
            if (index === 0) {
              sectionName = "Production";
            } else if (index === sectionInputs.length - 1) {
              sectionName = "Surface";
            } else {
              sectionName = `Intermediate ${index}`;
            }
          } else {
            // For 5 or more sections
            if (index === 0) {
              sectionName = "Production";
            } else if (index === sectionInputs.length - 1) {
              sectionName = "Surface";
            } else {
              sectionName = `Intermediate ${index}`;
            }
          }
          
          return (
            <div key={index} className="border border-border/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 text-primary/90">{sectionName}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`multiplier_${index}`} className="text-base font-medium text-primary">
                      Multiplier
                    </Label>
                    <HelpTooltip text="Factor depends on geological factors and rocks hardness" />
                  </div>
                  <Input
                    id={`multiplier_${index}`}
                    placeholder="Enter multiplier"
                    value={section.multiplier}
                    onChange={(e) => handleSectionInputChange(index, 'multiplier', e.target.value)}
                    className="focus:ring-1 focus:ring-primary"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`metalType_${index}`} className="text-base font-medium text-primary">
                      Metal Type
                    </Label>
                    <HelpTooltip text="API metal casing grades" />
                  </div>
                  <Select 
                    value={section.metalType} 
                    onValueChange={(value) => handleSectionInputChange(index, 'metalType', value)}
                  >
                    <SelectTrigger 
                      id={`metalType_${index}`}
                      className="w-full focus:ring-1 focus:ring-primary"
                    >
                      <SelectValue placeholder="Select metal type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="K-55">K-55</SelectItem>
                      <SelectItem value="L-80">L-80</SelectItem>
                      <SelectItem value="N-80">N-80</SelectItem>
                      <SelectItem value="C-90">C-90</SelectItem>
                      <SelectItem value="T-95">T-95</SelectItem>
                      <SelectItem value="P-110">P-110</SelectItem>
                      <SelectItem value="Q-125">Q-125</SelectItem>
                      <SelectItem value="V-150">V-150</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`depth_${index}`} className="text-base font-medium text-primary">
                      Depth
                    </Label>
                    <HelpTooltip text="The total depth of each section" />
                  </div>
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
    </motion.div>
  );

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
                  Casing Design
                </h1>
                <p className="mt-2 text-muted-foreground max-w-xl">
                  Calculate casing program and design the casing string for well integrity and structural stability
                </p>
              </div>
              {/* Visual indicator of process step */}
              <div className="hidden md:flex items-center space-x-2 bg-background/80 backdrop-blur-sm p-2 rounded-lg border border-border/40 shadow-sm">
                <div className="flex space-x-1.5">
                  <div className="h-2 w-6 rounded-full bg-primary"></div>
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                </div>
                <span className="text-xs font-medium text-primary">Phase 1</span>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="px-4 sm:px-6 md:px-8 lg:px-10 max-w-7xl mx-auto w-full py-6 md:py-10 space-y-6 md:space-y-8">
          <ScrollArea className="h-full w-full">
            {showInput ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-1 bg-primary rounded-full"></div>
                    <h3 className="text-lg font-medium">Casing Calculator</h3>
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
                      onClick={calculate} 
                      disabled={isLoading || !initialDcsgAmount} 
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
                
                {error && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
                
                {renderInputForm()}
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-1 bg-primary rounded-full"></div>
                    <h3 className="text-lg font-medium">Casing Results</h3>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setShowInput(true)} 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1.5"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Edit Inputs</span>
                    </Button>

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
                      onClick={calculate} 
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
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <Card className="border-primary/10 shadow-md">
                    <CardContent className="pt-6">
                      <CasingResults results={casingResults} hadData={hadData} />
                    </CardContent>
                  </Card>

                  {hadData && (
                    <Card className="border-primary/10 shadow-md mt-6">
                      <CardHeader className="bg-muted/40 border-b border-border/40">
                        <CardTitle className="text-lg sm:text-xl text-primary/90">Hydraulics Analysis</CardTitle>
                        <CardDescription>
                          Detailed hydraulics data
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <HADResults hadData={hadData} />
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
} 