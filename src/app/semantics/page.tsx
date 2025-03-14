"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { NavBar } from "@/components/nav-bar"
import { Calculator } from "lucide-react"
import { toast } from "sonner"
import { useFileUpload } from "@/context/FileUploadContext"

interface VcfResult {
  instance: number;
  db: number;  // Db (mm)
  de: number;  // de (mm)
  di: number;  // di (mm)
  h: number;   // h
  vcf: number; // Vcf
}

interface GcResult {
  instance: number;
  vcf: number;
  gc: number;  // Gc
}

interface DataInputValues {
  K1?: string;
  K2?: string;
  [key: string]: string | undefined;
}

export default function SemanticsPage() {
  // Input parameters
  const [hcValue, setHcValue] = useState<string>("");
  const [gammaC, setGammaC] = useState<string>("");
  const [gammaW, setGammaW] = useState<string>("");
  const [gammaFC, setGammaFC] = useState<string>("");
  
  // Data Input values
  const [dataInputValues, setDataInputValues] = useState<DataInputValues>({});
  
  // Results
  const [vcfResults, setVcfResults] = useState<VcfResult[]>([]);
  const [gcResults, setGcResults] = useState<GcResult[]>([]);
  
  // Equation and results displays
  const [equationHTML, setEquationHTML] = useState<string>("");
  const [resultsHTML, setResultsHTML] = useState<string>("");
  
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Access results from other pages
  const { 
    drillCollarResults,
    casingResults
  } = useFileUpload();

  // Load data input values on component mount
  useEffect(() => {
    const loadDataInputValues = async () => {
      try {
        // Load from localStorage instead of API
        const savedData = localStorage.getItem('wellsAnalyzerData');
        if (savedData) {
          const data = JSON.parse(savedData);
          setDataInputValues(data);
        }
      } catch (error) {
        console.error('Error loading data input values:', error);
        toast.error("Failed to load K1 and K2 values from Data Input");
      }
    };
    
    loadDataInputValues();
  }, []);

  const calculateVcf = () => {
    if (!hcValue) {
      toast.error("Please enter a value for Hc");
      return;
    }

    // Check if we have the necessary drill collar results
    if (!drillCollarResults || drillCollarResults.length < 3) {
      toast.error("Drill collar data not available. Please calculate drill collars first.");
      return;
    }

    // Check if K1 value is available
    if (!dataInputValues.K1) {
      toast.error("K1 value not found. Please set it in the Data Input page.");
      return;
    }

    try {
      const Hc = parseFloat(hcValue);
      
      // Use K1 from data input values
      const K1 = parseFloat(dataInputValues.K1);
      
      // Create results array
      const results: VcfResult[] = [];
      
      // Generate HTML for equations
      let equations = `<h3>Vcf Equation Applied:</h3>
                        <p>[K1×Db²-de]×Hc + di²×h</p>
                        <p>Where K1 = ${K1} and Hc = ${Hc}</p><br>`;
      
      // Calculate Vcf for each instance
      for (let i = 0; i < drillCollarResults.length; i++) {
        const result = drillCollarResults[i];
        
        // Get values for the current instance
        const Db = result.nearestBitSize / 1000; // Convert to m
        
        // Get external diameter (de) - use drill collar
        const de = parseFloat(result.drillCollars) / 1000; // Convert to m
        
        // Estimate internal diameter (di) as 70% of external diameter
        const di = de * 0.7;
        
        // Get h value (depth) from data input
        const hKey = `H_${i + 1}`;
        const h = dataInputValues[hKey] ? parseFloat(dataInputValues[hKey]) : 1000 + (i * 500); // Default if not available
        
        // Calculate Vcf: [K1Db^2-de].Hc+di^2.h
        const vcf = (K1 * (Db**2) - de) * Hc + (di**2) * h;
        
        // Add to results
        results.push({
          instance: i + 1,
          db: Db * 1000, // Back to mm for display
          de: de * 1000, // Back to mm for display
          di: di * 1000, // Back to mm for display
          h,
          vcf
        });
        
        // Add equation steps for this instance
        equations += `<h4>Instance ${i+1}:</h4>
                     <p>[${K1} × (${Db.toFixed(4)})² - ${de.toFixed(4)}] × ${Hc} + (${di.toFixed(4)})² × ${h}</p>
                     <p>[${(K1 * (Db**2)).toFixed(4)} - ${de.toFixed(4)}] × ${Hc} + ${(di**2).toFixed(4)} × ${h}</p>
                     <p>${(K1 * (Db**2) - de).toFixed(4)} × ${Hc} + ${(di**2 * h).toFixed(4)}</p>
                     <p>Vcf = ${vcf.toFixed(4)}</p><br>`;
      }
      
      setVcfResults(results);
      setEquationHTML(equations);
      
      // Set results HTML
      const resultsTable = `
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Instance</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Db (mm)</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">de (mm)</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">di (mm)</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">h</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Vcf</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => `
              <tr class="bg-transparent border-b border-gray-200 dark:border-gray-700">
                <td class="px-4 py-2 text-center">${r.instance}</td>
                <td class="px-4 py-2 text-center">${r.db.toFixed(2)}</td>
                <td class="px-4 py-2 text-center">${r.de.toFixed(2)}</td>
                <td class="px-4 py-2 text-center">${r.di.toFixed(2)}</td>
                <td class="px-4 py-2 text-center">${r.h.toFixed(2)}</td>
                <td class="px-4 py-2 text-center">${r.vcf.toFixed(4)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      setResultsHTML(resultsTable);
      
      toast.success("Vcf calculation completed");
    } catch (error) {
      console.error('Error calculating Vcf:', error);
      toast.error("Error calculating Vcf");
    }
  };

  const calculateGcGc = () => {
    if (!gammaC || !gammaW || !gammaFC) {
      toast.error("Please enter all γ values");
      return;
    }
    
    if (vcfResults.length === 0) {
      toast.error("Please calculate Vcf values first");
      return;
    }

    // Check if K2 value is available
    if (!dataInputValues.K2) {
      toast.error("K2 value not found. Please set it in the Data Input page.");
      return;
    }
    
    try {
      const gamma_c = parseFloat(gammaC);
      const gamma_w = parseFloat(gammaW);
      const gamma_fc = parseFloat(gammaFC);
      
      // Use K2 from data input values
      const K2 = parseFloat(dataInputValues.K2);
      
      // Calculate m
      const m = (gamma_w * (gamma_c - gamma_fc)) / (gamma_c * (gamma_fc - gamma_w));
      
      // Calculate gc
      const gc = (gamma_c * gamma_w) / (m * gamma_c + gamma_w);
      
      // Create results array
      const results: GcResult[] = [];
      
      // Generate HTML for equations
      let equations = `<h3>gc and Gc Calculations:</h3>
                       <p>m = [γw(γc-γfc)]/γc(γfc-γw)</p>
                       <p>m = [${gamma_w}(${gamma_c}-${gamma_fc})]/${gamma_c}(${gamma_fc}-${gamma_w})</p>
                       <p>m = ${m.toFixed(4)}</p><br>
                       
                       <p>gc = [γc×γw]/m.γc+γw</p>
                       <p>gc = [${gamma_c}×${gamma_w}]/${m}.${gamma_c}+${gamma_w}</p>
                       <p>gc = ${gc.toFixed(4)}</p><br>
                       
                       <p>Gc = K2×gc×Vcf</p>
                       <p>Where K2 = ${K2}</p><br>`;
      
      // Calculate Gc for each instance
      for (let i = 0; i < vcfResults.length; i++) {
        const vcf = vcfResults[i].vcf;
        
        // Calculate Gc
        const gc_value = K2 * gc * vcf;
        
        // Add to results
        results.push({
          instance: i + 1,
          vcf,
          gc: gc_value
        });
        
        // Add equation steps for this instance
        equations += `<h4>Instance ${i+1}:</h4>
                     <p>Gc = ${K2} × ${gc.toFixed(4)} × ${vcf.toFixed(4)}</p>
                     <p>Gc = ${gc_value.toFixed(4)}</p><br>`;
      }
      
      setGcResults(results);
      setEquationHTML(equations);
      
      // Set results HTML
      const resultsTable = `
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Instance</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Vcf</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Gc</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => `
              <tr class="bg-transparent border-b border-gray-200 dark:border-gray-700">
                <td class="px-4 py-2 text-center">${r.instance}</td>
                <td class="px-4 py-2 text-center">${r.vcf.toFixed(4)}</td>
                <td class="px-4 py-2 text-center">${r.gc.toFixed(4)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      setResultsHTML(resultsTable);
      
      toast.success("gc and Gc calculation completed");
    } catch (error) {
      console.error('Error calculating gc and Gc:', error);
      toast.error("Error calculating gc and Gc");
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <NavBar />
      <div className="px-4 sm:px-6 md:px-8 lg:px-10 max-w-7xl mx-auto w-full py-6 md:py-10 space-y-6 md:space-y-8 flex-1 overflow-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">Semantics Analysis</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="bg-muted/50 border-b border-border/50 flex items-center">
              <CardTitle className="text-lg sm:text-xl text-primary/90">Input Parameters</CardTitle>
              <CardDescription>Enter the required parameters for calculations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="hc-value" className="text-base">Hc (Required):</Label>
                  <Input
                    id="hc-value"
                    placeholder="Enter Hc value"
                    value={hcValue}
                    onChange={(e) => setHcValue(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gamma-c" className="text-base">γc:</Label>
                  <Input
                    id="gamma-c"
                    placeholder="Enter γc value"
                    value={gammaC}
                    onChange={(e) => setGammaC(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gamma-w" className="text-base">γw:</Label>
                  <Input
                    id="gamma-w"
                    placeholder="Enter γw value"
                    value={gammaW}
                    onChange={(e) => setGammaW(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gamma-fc" className="text-base">γfc:</Label>
                  <Input
                    id="gamma-fc"
                    placeholder="Enter γfc value"
                    value={gammaFC}
                    onChange={(e) => setGammaFC(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex gap-4 mt-6">
                <Button 
                  onClick={calculateVcf}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  Calculate Vcf
                </Button>
                
                <Button 
                  onClick={calculateGcGc}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  Calculate gc and Gc
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="bg-muted/50 border-b border-border/50 flex items-center">
              <CardTitle className="text-lg sm:text-xl text-primary/90">Constants from Data Input</CardTitle>
              <CardDescription>K1 and K2 values retrieved from Data Input page</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-border/50">
                  <Label className="text-base font-medium text-primary">K1 Value:</Label>
                  <p className="text-lg font-mono">{dataInputValues.K1 || 'Not set'}</p>
                  {!dataInputValues.K1 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Please set the K1 value in the <a href="/data-input" className="text-primary hover:underline">Data Input</a> page.
                    </p>
                  )}
                </div>
                
                <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-border/50">
                  <Label className="text-base font-medium text-primary">K2 Value:</Label>
                  <p className="text-lg font-mono">{dataInputValues.K2 || 'Not set'}</p>
                  {!dataInputValues.K2 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Please set the K2 value in the <a href="/data-input" className="text-primary hover:underline">Data Input</a> page.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="h-full">
            <CardHeader className="bg-muted/50 border-b border-border/50 flex items-center">
              <CardTitle className="text-lg sm:text-xl text-primary/90">Equations</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px] overflow-auto">
              {equationHTML ? (
                <div dangerouslySetInnerHTML={{ __html: equationHTML }} />
              ) : (
                <p className="text-muted-foreground">The equations will be calculated and displayed here</p>
              )}
            </CardContent>
          </Card>
          
          <Card className="h-full">
            <CardHeader className="bg-muted/50 border-b border-border/50 flex items-center">
              <CardTitle className="text-lg sm:text-xl text-primary/90">Results</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px] overflow-auto">
              {resultsHTML ? (
                <div dangerouslySetInnerHTML={{ __html: resultsHTML }} />
              ) : (
                <p className="text-muted-foreground">Results will appear here</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 