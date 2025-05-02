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
                console.log(`Migrated WOB value from ${data[key]} to ${migratedData[key]}`);
              }
            }
          }
          
          setFormData(migratedData);
          
          // Initialize the displayed dα value if it exists
          if (migratedData['dα']) {
            setDisplayedDalphaValue((parseFloat(migratedData['dα']) * 100000).toFixed(2));
          }
        }
        
        // Try to load the single input preferences
        const savedInputPrefs = localStorage.getItem('wellsAnalyzerInputPrefs');
        if (savedInputPrefs) {
          setSingleInputFields(JSON.parse(savedInputPrefs));
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        toast.error("Failed to load data", {
          icon: <AlertCircle className="h-4 w-4 text-destructive" />,
          description: "There was an error loading your data. Please try again."
        })
      } finally {
        setInitialLoading(false)
      }
    }

    loadSavedData()
  }, [])

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
        setFormData(prev => ({
          ...prev,
          [`${field}_2`]: firstInstanceValue,
          [`${field}_3`]: firstInstanceValue
        }));
      }
    }
  }
  
  // Handle single input change (propagate to all instances)
  const handleSingleInputChange = (field: string, value: string) => {
    // No special handling needed for WOB here since we're already storing as tons
    setFormData(prev => ({
      ...prev,
      [`${field}_1`]: value,
      [`${field}_2`]: value,
      [`${field}_3`]: value
    }));
  }

  const saveData = async () => {
    setIsLoading(true)
    try {
      // Save to localStorage instead of API
      localStorage.setItem('wellsAnalyzerData', JSON.stringify(formData));
      
      toast.success("Data saved successfully", {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        description: "Your well data has been saved to your browser."
      });
    } catch (error) {
      console.error('Failed to save data:', error)
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
                <div className="flex items-center gap-1.5 mr-4">
                  <Label htmlFor={`toggle-${field}`} className="text-xs text-muted-foreground whitespace-nowrap">
                    Single value
                  </Label>
                  <HelpTooltip text="Click when there is the same value for all sections" />
                </div>
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
              // Multiple inputs mode
              <div className="space-y-3">
                {[1, 2, 3].map(instance => (
                  <div key={`${field}_${instance}`} className="space-y-1.5">
                    <Label htmlFor={`${field}_${instance}`} className="text-xs text-muted-foreground">
                      Instance {instance}
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
    const fields = ["WOB", "C", "P", "γ", "Hc"]
    
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
                {field === "Hc" && (
                  <HelpTooltip text="Height Above Cementation (HAC)" />
                )}
              </div>
              <div className="flex items-center">
                <div className="flex items-center gap-1.5 mr-4">
                  <Label htmlFor={`toggle-${field}`} className="text-xs text-muted-foreground whitespace-nowrap">
                    Single value
                  </Label>
                  <HelpTooltip text="Click when there is the same value for all sections" />
                </div>
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
                />
              </div>
            ) : (
              // Multiple inputs mode
              <div className="space-y-3">
                {[1, 2, 3].map(instance => (
                  <div key={`${field}_${instance}`} className="space-y-1.5">
                    <Label htmlFor={`${field}_${instance}`} className="text-xs text-muted-foreground">
                      Instance {instance}
                    </Label>
                    <Input
                      id={`${field}_${instance}`}
                      placeholder={field === "WOB" ? "Enter WOB in tons" : `Enter ${field} (${instance})`}
                      value={formData[`${field}_${instance}`] || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(`${field}_${instance}`, e.target.value)}
                      className={`focus:ring-1 focus:ring-primary bg-background/80 border-border ${field === "WOB" ? "font-medium" : ""}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderConstants = () => {
    const fields = ["K1", "K2", "K3"]
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        {fields.map(field => (
          <div key={field} className="space-y-2 bg-background/70 p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-2">
              <Label htmlFor={field} className="text-base font-medium text-primary">{field}</Label>
              {field === "K1" && (
                <HelpTooltip text="Factor that consider the friction of the drill pipes with wellbore, ranges (1.1-1.2)" />
              )}
              {field === "K2" && (
                <HelpTooltip text="Factor that consider sticking of the drill pipes ranges (1.1-1.25)" />
              )}
              {field === "K3" && (
                <HelpTooltip text="Factor that consider the acceleration of the drill pipes when raising ranges (1.02-1.04)" />
              )}
            </div>
            <Input
              id={field}
              placeholder={`Enter ${field}`}
              value={formData[field] || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(field, e.target.value)}
              className="focus:ring-1 focus:ring-primary bg-background/80 border-border"
            />
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
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 bg-primary rounded-full"></div>
                <h3 className="text-lg font-medium">Constants</h3>
              </div>
              <div className="text-sm text-muted-foreground">
                Enter the constant values for calculations
              </div>
              <div className="mt-4">
                {renderConstants()}
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
        </div>
      </ScrollArea>
    </div>
  )
} 