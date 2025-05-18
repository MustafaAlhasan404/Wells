"use client"

import { useState, useEffect, Suspense, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NavBar } from "@/components/nav-bar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, FileUp, Calculator, Layers, Settings, CheckCircle, AlertCircle, Drill } from "lucide-react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { useFileUpload } from "@/context/FileUploadContext"
import DrillCollarCalculator from "@/components/drill-collar-calculator"
import { motion } from "framer-motion"

// Import the data input form directly with a relative path instead of alias
import DataInputForm from "../../components/data-input-form"

// Client component that safely uses useSearchParams
function FormationContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam === 'drill-collar' ? 'drill-collar' : 'data-input')
  const [isLoading, setIsLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  
  // From FileUploadContext to determine if data is available
  const { 
    drillCollarResults,
    casingResults,
    setDrillCollarResults,
    drillCollarCalculations,
    setDrillCollarCalculations
  } = useFileUpload();

  // Load cached results from localStorage on mount
  const loadCachedResults = useCallback(() => {
    try {
      const savedResults = localStorage.getItem('drillCollarResults');
      const savedCalculations = localStorage.getItem('drillCollarCalculations');
      
      if (savedResults && (!drillCollarResults || drillCollarResults.length === 0)) {
        const parsedResults = JSON.parse(savedResults);
        
        // Validate section names to ensure they're preserved correctly
        const validatedResults = parsedResults.map((result: any, index: number) => {
          // Make sure section names are correctly assigned
          let section = result.section;
          if (!section || section === "Unknown") {
            // Assign section based on index if missing or unknown
            if (index === 0) section = "Production";
            else if (index === parsedResults.length - 1) section = "Surface";
            else section = "Intermediate";
          }
          return {...result, section};
        });
        
        setDrillCollarResults(validatedResults);
        
        // Show success toast
        toast.info("Loaded saved drill collar results", {
          description: "Previous calculation results have been restored."
        });
      }
      
      if (savedCalculations && (!drillCollarCalculations || drillCollarCalculations.length === 0)) {
        const parsedCalculations = JSON.parse(savedCalculations);
        
        // Validate section names in calculations too
        const validatedCalculations = parsedCalculations.map((calc: any, index: number) => {
          // Make sure each calculation has a valid section
          if (!calc.section || calc.section === "Unknown") {
            // Use the instance to determine section if available
            if (calc.instance === 1) calc.section = "Production";
            else if (calc.instance === 3) calc.section = "Surface";
            else calc.section = "Intermediate";
          }
          return calc;
        });
        
        setDrillCollarCalculations(validatedCalculations);
      }
    } catch (error) {
      console.error('Failed to load saved drill collar results:', error);
    }
  }, [drillCollarResults, drillCollarCalculations, setDrillCollarResults, setDrillCollarCalculations]);

  // Check if data is present on mount to set appropriate loading state
  useEffect(() => {
    // Simulate loading to give context time to initialize
    const timer = setTimeout(() => {
      loadCachedResults(); // Load cached results as soon as component initializes
      setInitialLoading(false);
    }, 500)
    
    return () => clearTimeout(timer)
  }, [loadCachedResults])
  
  // Update active tab when URL parameter changes
  useEffect(() => {
    if (tabParam === 'drill-collar') {
      setActiveTab('drill-collar')
    } else if (tabParam === 'data-input') {
      setActiveTab('data-input')
    }
  }, [tabParam])

  // Persist results to localStorage when they change
  useEffect(() => {
    if (drillCollarResults && drillCollarResults.length > 0) {
      localStorage.setItem('drillCollarResults', JSON.stringify(drillCollarResults));
    }
    
    if (drillCollarCalculations && drillCollarCalculations.length > 0) {
      localStorage.setItem('drillCollarCalculations', JSON.stringify(drillCollarCalculations));
    }
  }, [drillCollarResults, drillCollarCalculations]);

  // Handler for when tab changes
  const handleTabChange = (value: string) => {
    // When switching to the drill-collar tab, ensure results are loaded from cache if needed
    if (value === 'drill-collar') {
      loadCachedResults();
      // Verify section names on tab switch to ensure consistency
      if (drillCollarResults && drillCollarResults.length > 0) {
        const validatedResults = drillCollarResults.map((result: any, index: number) => {
          // Make sure section names are correctly assigned
          let section = result.section;
          if (!section || section === "Unknown") {
            // Assign section based on index if missing or unknown
            if (index === 0) section = "Production";
            else if (index === drillCollarResults.length - 1) section = "Surface";
            else section = "Intermediate";
          }
          return {...result, section};
        });
        
        if (JSON.stringify(validatedResults) !== JSON.stringify(drillCollarResults)) {
          setDrillCollarResults(validatedResults);
        }
      }
    }
    setActiveTab(value);
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <NavBar />
        <div className="flex-1 flex items-center justify-center">
          <motion.div 
            className="text-center space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Spinner size="lg" className="mx-auto" />
            <p className="text-muted-foreground">Loading formation design data...</p>
          </motion.div>
        </div>
      </div>
    )
  }

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
                  Drill String Design
                </h1>
                <p className="mt-2 text-muted-foreground max-w-xl">
                  Design and analyze drilling parameters for optimal drill string and collar specifications
                </p>
              </div>
              {/* Visual indicator of process step */}
              <div className="hidden md:flex items-center space-x-2 bg-background/80 backdrop-blur-sm p-2 rounded-lg border border-border/40 shadow-sm">
                <div className="flex space-x-1.5">
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  <div className="h-2 w-6 rounded-full bg-primary"></div>
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                </div>
                <span className="text-xs font-medium text-primary">Phase 2</span>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="px-4 sm:px-6 md:px-8 lg:px-10 max-w-7xl mx-auto w-full py-6 md:py-10 space-y-6 md:space-y-8">
          <Tabs 
            defaultValue="data-input" 
            value={activeTab} 
            onValueChange={handleTabChange} 
            className="w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <TabsList className="grid grid-cols-2 w-full max-w-md bg-zinc-900 rounded-full overflow-hidden p-0 h-12">
                <TabsTrigger 
                  value="data-input" 
                  className="flex items-center justify-center gap-2 h-full rounded-full
                    data-[state=inactive]:bg-transparent
                    data-[state=inactive]:text-zinc-400
                    data-[state=inactive]:hover:text-zinc-300
                    data-[state=active]:bg-zinc-800
                    data-[state=active]:text-white"
                >
                  <Settings className="h-4 w-4" />
                  <span>Drill Pipes Design</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="drill-collar" 
                  className="flex items-center justify-center gap-2 h-full rounded-full
                    data-[state=inactive]:bg-transparent
                    data-[state=inactive]:text-zinc-400
                    data-[state=inactive]:hover:text-zinc-300
                    data-[state=active]:bg-zinc-800
                    data-[state=active]:text-white"
                >
                  <Layers className="h-4 w-4" />
                  <span>Drill Collar Design</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: activeTab === 'data-input' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <TabsContent value="data-input" className="mt-0 w-full">
                <Card className="border-primary/10 shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
                  <CardHeader className="bg-muted/40 border-b border-border/40 flex items-center">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Settings className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg sm:text-xl text-primary/90">Drill Pipes Design</CardTitle>
                      </div>
                      <CardDescription className="mt-1.5">
                        Enter essential parameters for your drill string design
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <DataInputForm />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="drill-collar" className="mt-0 w-full">
                <Card className="border-primary/10 shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
                  <CardHeader className="bg-muted/40 border-b border-border/40 flex items-center">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Layers className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg sm:text-xl text-primary/90">Drill Collar Design</CardTitle>
                      </div>
                      <CardDescription className="mt-1.5">
                        Calculate and analyze drill collar specifications based on well parameters
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <DrillCollarCalculator />
                  </CardContent>
                </Card>
              </TabsContent>
            </motion.div>
          </Tabs>
          
          {/* Help section at bottom */}
          <div className="bg-muted/30 border border-border/30 rounded-xl p-4 mt-6">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-medium">Drill String Design Process</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  First enter your well parameters in the Parameter section, then proceed to the Drill Collar Design tab to calculate specifications based on your inputs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading fallback for Suspense
function FormationLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavBar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner size="lg" className="mx-auto" />
          <p className="text-muted-foreground">Loading formation design data...</p>
        </div>
      </div>
    </div>
  )
}

// Main page component with Suspense
export default function FormationDesignPage() {
  return (
    <Suspense fallback={<FormationLoading />}>
      <FormationContent />
    </Suspense>
  )
} 