"use client"

import { useState, useRef, ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { toast } from "sonner"
import { NavBar } from "@/components/nav-bar"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { LoaderCircle } from "lucide-react"
import { useFileUpload } from "@/context/FileUploadContext"

export default function EquationsPage() {
  // Use context for file management and results
  const { 
    drillCollarFile, 
    drillCollarFileName, 
    drillCollarResults,
    drillCollarCalculations,
    setDrillCollarFile, 
    setDrillCollarFileName,
    setDrillCollarResults,
    setDrillCollarCalculations
  } = useFileUpload();
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setDrillCollarFile(selectedFile);
      setDrillCollarFileName(selectedFile.name);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const calculateDrillCollar = async () => {
    if (!drillCollarFile) {
      toast.error('Please upload a drill collar table first');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', drillCollarFile);

      const response = await fetch('/api/calculate-drill-collar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process file');
      }

      const data = await response.json();
      setDrillCollarCalculations(data.calculations);
      setDrillCollarResults(data.results);
      toast.success('Drill collar calculation completed');
    } catch (error) {
      console.error('Error calculating drill collar:', error);
      toast.error('Failed to calculate drill collar data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <NavBar />
      <div className="px-4 sm:px-6 md:px-8 lg:px-10 max-w-7xl mx-auto w-full py-6 md:py-10 space-y-6 md:space-y-8 flex-1 overflow-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">Drilling Equations</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Upload Drill Collar Table</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Button onClick={handleUploadClick} variant="outline">
                  Choose File
                </Button>
                <span className="text-sm text-gray-500">
                  {drillCollarFileName || 'No file selected'}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={calculateDrillCollar} 
                disabled={!drillCollarFile || isLoading}
                className="w-full md:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
              >
                {isLoading ? (
                  <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  'Calculate Drill Collar'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Results Section */}
        {(drillCollarCalculations.length > 0 || drillCollarResults.length > 0) && (
          <div className="space-y-6">
            {drillCollarCalculations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Calculations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {drillCollarCalculations.map((instance) => (
                      <div key={instance.id} className="p-4 border rounded-md">
                        <p><strong>Instance {instance.id}</strong></p>
                        <p>Drill pipe Metal grade: {instance.metalGrade}</p>
                        <p>Lmax: {instance.lmax.toFixed(2)} m</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {drillCollarResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Section</TableHead>
                        <TableHead>At head (Dcsg)</TableHead>
                        <TableHead>Nearest Bit Size</TableHead>
                        <TableHead>Drill Collars</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drillCollarResults.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>{result.section}</TableCell>
                          <TableCell>{result.atHead.toFixed(2)} mm</TableCell>
                          <TableCell>{result.nearestBitSize.toFixed(2)} mm</TableCell>
                          <TableCell>{result.drillCollars}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 