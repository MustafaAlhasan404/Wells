"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { NavBar } from "@/components/nav-bar"
import { Save, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"

interface DataInputProps {}

export default function DataInput({}: DataInputProps) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
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
            <Label className="text-base font-medium text-primary">{field}</Label>
            {[1, 2, 3].map(instance => (
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
            ))}
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
              <CardHeader className="bg-muted/50 border-b border-border/50">
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
              <CardHeader className="bg-muted/50 border-b border-border/50">
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
              <CardHeader className="bg-muted/50 border-b border-border/50">
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