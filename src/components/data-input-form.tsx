"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, CheckCircle, AlertCircle, Copy } from "lucide-react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { motion } from "framer-motion"
import { HelpTooltip } from "@/components/ui/help-tooltip"
import { useWellType } from "@/context/WellTypeContext"

export default function DataInputForm() {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  // Track which fields are using single input mode
  const [singleInputFields, setSingleInputFields] = useState<Record<string, boolean>>({})
  // Add state to track if we're displaying the transformed dα value
  const [displayFormattedDalpha, setDisplayFormattedDalpha] = useState(true)
  // Track the displayed dα value separately
  const [displayedDalphaValue, setDisplayedDalphaValue] = useState('')
  // Get the well type from context
  const { wellType } = useWellType()
  // Add state to track the number of sections from casing calculator
  const [numSections, setNumSections] = useState<number>(3) // Default to 3 if not found in localStorage

  // Load saved data on component mount
  useEffect(() => {
    const loadSavedData = async () => {
      setInitialLoading(true)
      try {
        // Get data from localStorage instead of API
        const savedData = localStorage.getItem('wellsAnalyzerData');
        if (savedData) {
          const data = JSON.parse(savedData);
          
          // Migrate existing WOB values from old format (12000) to new format (12)
          const migratedData = { ...data };
          for (const key in migratedData) {
            if (key.startsWith('WOB_') && migratedData[key]) {
              const value = parseFloat(migratedData[key]);
              if (!isNaN(value) && value >= 1000) {
                // If the value is 1000 or greater, it's likely in the old format
                // Convert by dividing by 1000
                migratedData[key] = (value / 1000).toString();
              }
            }
          }
          
          // Handle H values from instances array if it exists
          if (migratedData.instances && Array.isArray(migratedData.instances)) {
            migratedData.instances.forEach((instance: any, index: number) => {
              if (instance && instance.H !== undefined) {
                // Map H values from instances to H_i fields
                migratedData[`H_${index + 1}`] = instance.H.toString();
              }
            });
          }
          
          // For exploration wells, set γ values to 1.08
          if (wellType === 'exploration') {
            // Load the number of sections from casing calculator data first
            const casingData = localStorage.getItem('casingCalculatorData');
            let sectionsCount = 3; // Default if not found
            
            if (casingData) {
              const parsedCasingData = JSON.parse(casingData);
              if (parsedCasingData.iterations) {
                sectionsCount = parseInt(parsedCasingData.iterations);
              }
            }
            
            // Set γ for all instances to 1.08 based on section count
            for (let i = 1; i <= sectionsCount; i++) {
              migratedData[`γ_${i}`] = '1.08';
            }
          }
          
          setFormData(migratedData);
          
          // Initialize the displayed dα value if it exists
          if (migratedData['dα']) {
            setDisplayedDalphaValue((parseFloat(migratedData['dα']) * 100000).toFixed(2));
          }
        }
        
        // Load the number of sections from casing calculator data
        const casingData = localStorage.getItem('casingCalculatorData');
        if (casingData) {
          const data = JSON.parse(casingData);
          if (data.iterations) {
            setNumSections(parseInt(data.iterations));
          }
        }
        
        // Try to load the single input preferences
        const savedInputPrefs = localStorage.getItem('wellsAnalyzerInputPrefs');
        if (savedInputPrefs) {
          setSingleInputFields(JSON.parse(savedInputPrefs));
        }
      } catch (error) {
        toast.error("Failed to load data", {
          icon: <AlertCircle className="h-4 w-4 text-destructive" />,
          description: "There was an error loading your data. Please try again."
        })
      } finally {
        setInitialLoading(false)
      }
    }

    loadSavedData()
  }, [wellType])

  const handleInputChange = (field: string, value: string) => {
    // Special handling for dα
    if (field === 'dα' && displayFormattedDalpha) {
      // Store the displayed value
      setDisplayedDalphaValue(value);
      
      // Try to convert to number
      let numValue = 0;
      try {
        numValue = value ? parseFloat(value) : 0;
      } catch (e) {
        // Invalid number, just keep the displayed value
      }
      
      // Store the actual value (divided by 100000)
      setFormData(prev => ({
        ...prev,
        [field]: (numValue / 100000).toString()
      }));
    } 
    // Handle WOB values - store as tons in the form (user enters 12 for 12 tons)
    else if (field.startsWith('WOB_')) {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    // Special handling for H values - sync with casing depths
    else if (field.startsWith('H_')) {
      // Update form data with the H value
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
      
      // Also update the corresponding casing depth
      // Extract instance number (e.g., "H_1" => "1")
      const instanceNum = field.split('_')[1];
      if (instanceNum) {
        try {
          // Get casing calculator data if it exists
          const casingData = localStorage.getItem('casingCalculatorData');
          if (casingData) {
            const data = JSON.parse(casingData);
            
            // Update depth for corresponding section
            // Usually instance 1 = Production, 2 = Intermediate, 3 = Surface
            if (instanceNum === '1') {
              data.depth1 = value;
            } else if (instanceNum === '2') {
              data.depth2 = value;
            } else if (instanceNum === '3') {
              data.depth3 = value;
            }
            
            // Save updated casing data back to localStorage
            localStorage.setItem('casingCalculatorData', JSON.stringify(data));
            
            console.log(`Synchronized H_${instanceNum} value (${value}) with casing depth`);
          }
        } catch (error) {
          console.error('Failed to sync H value with casing data:', error);
        }
      }
    }
    else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  }
  
  // Handle single input toggle
  const toggleSingleInput = (field: string) => {
    setSingleInputFields(prev => {
      const newState = {
        ...prev,
        [field]: !prev[field]
      };
      
      // Save preferences to localStorage
      localStorage.setItem('wellsAnalyzerInputPrefs', JSON.stringify(newState));
      
      return newState;
    });
    
    // If toggling to single input mode, copy the first instance value to all instances
    if (!singleInputFields[field]) {
      const firstInstanceValue = formData[`${field}_1`] || '';
      if (firstInstanceValue) {
        const updatedData: Record<string, string> = {};
        
        // Dynamically create entries for all sections
        for (let i = 2; i <= numSections; i++) {
          updatedData[`${field}_${i}`] = firstInstanceValue;
        }
        
        setFormData(prev => ({
          ...prev,
          ...updatedData
        }));
      }
    }
  }
  
  // Handle single input change (propagate to all instances)
  const handleSingleInputChange = (field: string, value: string) => {
    // No special handling needed for WOB here since we're already storing as tons
    const updatedData: Record<string, string> = {};
    
    // Dynamically create entries for all sections
    for (let i = 1; i <= numSections; i++) {
      updatedData[`${field}_${i}`] = value;
    }
    
    setFormData(prev => ({
      ...prev,
      ...updatedData
    }));
  }

  const saveData = async () => {
    setIsLoading(true)
    try {
      // For exploration wells, ensure γ is always 1.08
      if (wellType === 'exploration') {
        const updatedData: Record<string, string> = {};
        
        // Dynamically create entries for all sections
        for (let i = 1; i <= numSections; i++) {
          updatedData[`γ_${i}`] = '1.08';
        }
        
        setFormData(prev => ({
          ...prev,
          ...updatedData
        }));
      }
      
      // Create an instances array structure for the new format
      const processedData: Record<string, any> = { ...formData };
      
      // Initialize instances array with H values
      const instances: Record<string, any>[] = [];
      for (let i = 1; i <= numSections; i++) {
        const instanceData: Record<string, any> = {};
        
        // Get H value from H_i if it exists
        if (formData[`H_${i}`]) {
          instanceData.H = parseFloat(formData[`H_${i}`]);
        }
        
        instances.push(instanceData);
      }
      
      // Add instances array to processed data
      processedData.instances = instances;
      
      // Save to localStorage instead of API
      localStorage.setItem('wellsAnalyzerData', JSON.stringify(processedData));
      
      // After saving, sync H values with casing depths in casingCalculatorData
      try {
        const casingData = localStorage.getItem('casingCalculatorData');
        if (casingData) {
          const data = JSON.parse(casingData);
          let updated = false;
          
          // Production (index 1)
          if (formData['H_1']) {
            data.depth1 = formData['H_1'];
            updated = true;
          }
          
          // Intermediate sections
          if (formData['H_2']) {
            data.depth2 = formData['H_2'];
            updated = true;
          }
          
          if (formData['H_3']) {
            data.depth3 = formData['H_3'];
            updated = true;
          }
          
          // Support for additional intermediate sections (4 and 5)
          if (formData['H_4']) {
            data.depth4 = formData['H_4'];
            updated = true;
          }
          
          if (formData['H_5']) {
            data.depth5 = formData['H_5'];
            updated = true;
          }
          
          if (updated) {
            localStorage.setItem('casingCalculatorData', JSON.stringify(data));
            console.log('Synchronized H values with casing depths on save');
          }
        }
      } catch (error) {
        console.error('Failed to sync H values with casing data on save:', error);
      }
      
      toast.success("Data saved successfully", {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        description: "Your well data has been saved to your browser."
      });
    } catch (error) {
      toast.error("Failed to save data", {
        icon: <AlertCircle className="h-4 w-4 text-destructive" />,
        description: "There was an error saving your data. Please try again."
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderDrillingPipesCharacteristics = () => {
    const fields = ["qp", "qc", "Lhw", "Dep", "Dhw", "qhw", "n", "dα"]
    
    const fieldLabels: Record<string, string> = {
      "qp": "qp (Weight)",
      "qc": "qc (Weight)",
      "Lhw": "Lhw (Length)",
      "Dep": "Dep (Depth)",
      "Dhw": "Dhw (Diameter)",
      "qhw": "qhw (Weight)",
      "n": "n (Circles)",
      "dα": "dα (Factor)"
    }
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {fields.map(field => (
          <div key={field} className="space-y-3 bg-background/70 p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium text-primary">
                  {fieldLabels[field] || field}
                  {field === 'dα' && displayFormattedDalpha && (
                    <span className="text-xs ml-2 text-muted-foreground">(×10⁻⁵)</span>
                  )}
                </Label>
                {field === "qp" && (
                  <HelpTooltip text="Weight per meter for drill pipes" />
                )}
                {field === "qc" && (
                  <HelpTooltip text="Weight per meter for drill collars" />
                )}
                {field === "Lhw" && (
                  <HelpTooltip text="Length of the heavy weight drill pipes" />
                )}
                {field === "Dep" && (
                  <HelpTooltip text="The total depth of each section" />
                )}
                {field === "Dhw" && (
                  <HelpTooltip text="The external diameter of the heavy drill pipes" />
                )}
                {field === "qhw" && (
                  <HelpTooltip text="The weight per meter for heavy drill pipes" />
                )}
                {field === "n" && (
                  <HelpTooltip text="Number of circles for the drill pipes" />
                )}
                {field === "dα" && (
                  <HelpTooltip text="Factor that consider geometry of the well" />
                )}
              </div>
              <div className="flex items-center">
                <Switch 
                  id={`toggle-${field}`} 
                  checked={!!singleInputFields[field]} 
                  onCheckedChange={() => toggleSingleInput(field)}
                />
              </div>
            </div>
            
            {field === 'dα' && displayFormattedDalpha ? (
              <Input
                id={field}
                placeholder="Enter value (e.g., 18.8)"
                value={displayedDalphaValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(field, e.target.value)}
                className="focus:ring-1 focus:ring-primary bg-background/80 border-border"
                inputMode="decimal"
              />
            ) : singleInputFields[field] ? (
              // Single input mode
              <div className="space-y-2">
                <Label htmlFor={`${field}_single`} className="text-xs text-muted-foreground flex items-center gap-1">
                  <Copy className="h-3 w-3" />
                  Applied to all instances
                </Label>
                <Input
                  id={`${field}_single`}
                  placeholder={`Enter ${field} (all instances)`}
                  value={formData[`${field}_1`] || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSingleInputChange(field, e.target.value)}
                  className="focus:ring-1 focus:ring-primary bg-background/80 border-border"
                />
              </div>
            ) : (
              // Multiple inputs mode - Dynamic based on numSections
              <div className="space-y-3">
                {Array.from({ length: numSections }, (_, i) => i + 1).map(instance => (
                  <div key={`${field}_${instance}`} className="space-y-1.5">
                    <Label htmlFor={`${field}_${instance}`} className="text-xs text-muted-foreground">
                      {instance === 1 ? "Production" : 
                       instance === numSections ? "Surface" : 
                       numSections === 3 && instance === 2 ? "Intermediate" : 
                       numSections === 4 ? (instance === 2 ? "Upper Intermediate" : "Lower Intermediate") :
                       numSections === 5 ? (instance === 2 ? "Upper Intermediate" : 
                                          instance === 3 ? "Middle Intermediate" : "Lower Intermediate") :
                       `Intermediate ${instance - 1}`}
                    </Label>
                    <Input
                      id={`${field}_${instance}`}
                      placeholder={`Enter ${field} (${instance})`}
                      value={formData[`${field}_${instance}`] || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(`${field}_${instance}`, e.target.value)}
                      className="focus:ring-1 focus:ring-primary bg-background/80 border-border"
                    />
                  </div>
                ))}
              </div>
            )}
            
            {field === 'dα' && (
              <div className="flex items-center gap-2 mt-1">
                <Switch
                  id="toggle-dalpha-format"
                  checked={displayFormattedDalpha}
                  onCheckedChange={() => setDisplayFormattedDalpha(!displayFormattedDalpha)}
                  className="scale-75 origin-left"
                />
                <Label htmlFor="toggle-dalpha-format" className="text-xs text-muted-foreground cursor-pointer">
                  {displayFormattedDalpha ? "Using simplified format" : "Using raw value"}
                </Label>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderDrillingParameters = () => {
    // Filter out γ if we're in exploration mode
    const fields = wellType === 'exploration' 
      ? ["WOB", "C", "P", "H", "Hc"] 
      : ["WOB", "C", "P", "γ", "H", "Hc"];
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {fields.map(field => (
          <div key={field} className="space-y-3 bg-background/70 p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium text-primary">
                  {field}
                </Label>
                {field === "WOB" && (
                  <HelpTooltip text="Weight on Bit at each section (tons)" />
                )}
                {field === "C" && (
                  <HelpTooltip text="Percentage of drilling collars weight that are applied at the drilling Bit" />
                )}
                {field === "P" && (
                  <HelpTooltip text="Pressure loss within drilling pipes formation" />
                )}
                {field === "γ" && (
                  <HelpTooltip text="Specific weight" />
                )}
                {field === "H" && (
                  <HelpTooltip text="Total depth (m)" />
                )}
                {field === "Hc" && (
                  <HelpTooltip text="Height Above Cementation (HAC)" />
                )}
              </div>
              <div className="flex items-center">
                <Switch 
                  id={`toggle-${field}`} 
                  checked={!!singleInputFields[field]} 
                  onCheckedChange={() => toggleSingleInput(field)}
                />
              </div>
            </div>
            
            {singleInputFields[field] ? (
              // Single input mode
              <div className="space-y-2">
                <Label htmlFor={`${field}_single`} className="text-xs text-muted-foreground flex items-center gap-1">
                  <Copy className="h-3 w-3" />
                  Applied to all instances
                </Label>
                <Input
                  id={`${field}_single`}
                  placeholder={field === "WOB" ? "Enter WOB in tons" : `Enter ${field} (all instances)`}
                  value={formData[`${field}_1`] || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSingleInputChange(field, e.target.value)}
                  className="focus:ring-1 focus:ring-primary bg-background/80 border-border"
                  disabled={wellType === 'exploration' && field === 'γ'}
                />
              </div>
            ) : (
              // Multiple inputs mode
              <div className="space-y-3">
                {Array.from({ length: numSections }, (_, i) => i + 1).map(instance => (
                  <div key={`${field}_${instance}`} className="space-y-1.5">
                    <Label htmlFor={`${field}_${instance}`} className="text-xs text-muted-foreground">
                      {instance === 1 ? "Production" : 
                       instance === numSections ? "Surface" : 
                       numSections === 3 && instance === 2 ? "Intermediate" : 
                       numSections === 4 ? (instance === 2 ? "Upper Intermediate" : "Lower Intermediate") :
                       numSections === 5 ? (instance === 2 ? "Upper Intermediate" : 
                                          instance === 3 ? "Middle Intermediate" : "Lower Intermediate") :
                       `Intermediate ${instance - 1}`}
                    </Label>
                    <Input
                      id={`${field}_${instance}`}
                      placeholder={field === "WOB" ? "Enter WOB in tons" : `Enter ${field} (${instance})`}
                      value={wellType === 'exploration' && field === 'γ' ? '1.08' : (formData[`${field}_${instance}`] || '')}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(`${field}_${instance}`, e.target.value)}
                      className={`focus:ring-1 focus:ring-primary bg-background/80 border-border ${field === "WOB" ? "font-medium" : ""}`}
                      disabled={wellType === 'exploration' && field === 'γ'}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {/* Add the fixed gamma field for exploration well type */}
        {wellType === 'exploration' && (
          <div className="space-y-3 bg-background/70 p-4 rounded-lg border border-border/50">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium text-primary">
                  γ (Fixed)
                </Label>
                <HelpTooltip text="Specific weight (fixed at 1.08 for exploration wells)" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Fixed value for exploration wells
              </Label>
              <Input
                value="1.08"
                disabled
                className="focus:ring-1 bg-muted border-border opacity-80"
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderConstants = () => {
    const fields = ["K1", "K2", "K3"];
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {fields.map(field => (
          <div key={field} className="space-y-3 bg-background/70 p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium text-primary">
                  {field}
                </Label>
                {field === "K1" && (
                  <HelpTooltip text="Correction factor for metal grade selection (Default: 1)" />
                )}
                {field === "K2" && (
                  <HelpTooltip text="Correction factor for metal grade selection (Default: 1)" />
                )}
                {field === "K3" && (
                  <HelpTooltip text="Correction factor for metal grade selection (Default: 1)" />
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={field} className="text-xs text-muted-foreground">
                Correction Factor
              </Label>
              <Input
                id={field}
                placeholder={`Enter ${field} (default: 1)`}
                value={formData[field] || '1'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(field, e.target.value)}
                className="focus:ring-1 focus:ring-primary bg-background/80 border-border"
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Spinner size="md" className="mx-auto" />
          <p className="text-muted-foreground">Loading data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-end mb-4">
        <Button 
          onClick={saveData} 
          disabled={isLoading} 
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          size="sm"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" />
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
      
      <ScrollArea className="h-[calc(100vh-370px)]">
        <div className="space-y-8 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 bg-primary rounded-full"></div>
                <h3 className="text-lg font-medium">Drilling Pipes Characteristics</h3>
              </div>
              <div className="text-sm text-muted-foreground">
                Enter the characteristics of your drilling pipes
              </div>
              <div className="mt-4">
                {renderDrillingPipesCharacteristics()}
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 bg-primary rounded-full"></div>
                <h3 className="text-lg font-medium">Drilling Parameters</h3>
              </div>
              <div className="text-sm text-muted-foreground">
                Enter the drilling parameters for your well analysis
              </div>
              <div className="mt-4">
                {renderDrillingParameters()}
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 bg-primary rounded-full"></div>
                <h3 className="text-lg font-medium">Constants</h3>
              </div>
              <div className="text-sm text-muted-foreground">
                Enter correction factors for metal grade calculation
              </div>
              <div className="mt-4">
                {renderConstants()}
              </div>
            </div>
          </motion.div>
        </div>
      </ScrollArea>
    </div>
  )
} 