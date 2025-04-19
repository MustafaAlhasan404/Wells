"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { NavBar } from "@/components/nav-bar"
import { Save, CheckCircle, AlertCircle, Copy } from "lucide-react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"

interface DataInputProps {}

export default function DataInput({}: DataInputProps) {
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
          setFormData(data);
          
          // Initialize the displayed dα value if it exists
          if (data['dα']) {
            setDisplayedDalphaValue((parseFloat(data['dα']) * 100000).toFixed(2));
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
    } else {
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

  const renderBasicParameters = () => {
    const fields = ["WOB", "C", "qc", "qp", "Lhw", "P", "γ", "H"]
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {fields.map(field => (
          <div key={field} className="space-y-4 bg-muted/30 p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
            <div className="flex justify-between items-center">
              <Label className="text-base font-medium text-primary">{field}</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor={`toggle-${field}`} className="text-xs text-muted-foreground">
                  Single value
                </Label>
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
                <Label htmlFor={`${field}_single`} className="text-sm text-muted-foreground flex items-center gap-1">
                  <Copy className="h-3 w-3" />
                  Applied to all instances
                </Label>
                <Input
                  id={`${field}_single`}
                  placeholder={`Enter ${field} (all instances)`}
                  value={formData[`${field}_1`] || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSingleInputChange(field, e.target.value)}
                  className="focus:ring-1 focus:ring-primary"
                />
              </div>
            ) : (
              // Multiple inputs mode
              [1, 2, 3].map(instance => (
                <div key={`${field}_${instance}`} className="space-y-2">
                  <Label htmlFor={`${field}_${instance}`} className="text-sm text-muted-foreground">
                    Instance {instance}
                  </Label>
                  <Input
                    id={`${field}_${instance}`}
                    placeholder={`Enter ${field} (${instance})`}
                    value={formData[`${field}_${instance}`] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(`${field}_${instance}`, e.target.value)}
                    className="focus:ring-1 focus:ring-primary"
                  />
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderWellSpecifications = () => {
    const fields = ["Dep", "Dhw", "qhw", "dα", "n"]
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {fields.map(field => (
          <div key={field} className="space-y-2 bg-muted/30 p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
            <Label htmlFor={field} className="text-base font-medium text-primary">
              {field}
              {field === 'dα' && displayFormattedDalpha && (
                <span className="text-xs ml-2 text-muted-foreground">(×10⁻⁵)</span>
              )}
            </Label>
            {field === 'dα' && displayFormattedDalpha ? (
              <Input
                id={field}
                placeholder="Enter value (e.g., 18.8)"
                value={displayedDalphaValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(field, e.target.value)}
                className="focus:ring-1 focus:ring-primary"
                inputMode="decimal"
              />
            ) : (
              <Input
                id={field}
                placeholder={`Enter ${field}`}
                value={formData[field] || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(field, e.target.value)}
                className="focus:ring-1 focus:ring-primary"
              />
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

  const renderConstants = () => {
    const fields = ["K1", "K2", "K3"]
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        {fields.map(field => (
          <div key={field} className="space-y-2 bg-muted/30 p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
            <Label htmlFor={field} className="text-base font-medium text-primary">{field}</Label>
            <Input
              id={field}
              placeholder={`Enter ${field}`}
              value={formData[field] || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(field, e.target.value)}
              className="focus:ring-1 focus:ring-primary"
            />
          </div>
        ))}
      </div>
    )
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <NavBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Spinner size="lg" className="mx-auto" />
            <p className="text-muted-foreground">Loading data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <NavBar />
      <div className="px-4 sm:px-6 md:px-8 lg:px-10 max-w-7xl mx-auto w-full py-6 md:py-10 space-y-6 md:space-y-8 flex-1 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">Data Input</h1>
          <Button onClick={saveData} disabled={isLoading} className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary">
            {isLoading ? (
              <>
                <Spinner size="sm" className="mr-2" />
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
        
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-6 md:space-y-10 pb-10">
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-muted/50 border-b border-border/50 flex items-center">
                <CardTitle className="text-lg sm:text-xl text-primary/90">Basic Parameters</CardTitle>
                <CardDescription>
                  Enter the basic parameters for your well analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 md:pt-6">
                {renderBasicParameters()}
              </CardContent>
            </Card>
            
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-muted/50 border-b border-border/50 flex items-center">
                <CardTitle className="text-lg sm:text-xl text-primary/90">Well Specifications</CardTitle>
                <CardDescription>
                  Enter the specifications for your well
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 md:pt-6">
                {renderWellSpecifications()}
              </CardContent>
            </Card>
            
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-muted/50 border-b border-border/50 flex items-center">
                <CardTitle className="text-lg sm:text-xl text-primary/90">Constants</CardTitle>
                <CardDescription>
                  Enter the constant values for calculations
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 md:pt-6">
                {renderConstants()}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
} 