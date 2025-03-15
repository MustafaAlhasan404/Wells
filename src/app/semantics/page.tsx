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
import { Calculator, Eye, EyeOff } from "lucide-react"
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
  gc: number;  // Gc in tons
  nc: number;  // nc in Sk (sacks)
  vw: number;  // Vw
  vfd: number; // Vfd
  pymax: number; // Pymax
  pc: number;   // Pc
  pfr: number;  // Pfr (constant)
  ppmax: number; // Ppmax
}

interface DataInputValues {
  K1?: string;
  K2?: string;
  K3?: string;
  [key: string]: string | undefined;
}

export default function SemanticsPage() {
  // Input parameters
  const [hcValue, setHcValue] = useState<string>("");
  const [gammaC, setGammaC] = useState<string>("");
  const [gammaW, setGammaW] = useState<string>("");
  const [gammaFC, setGammaFC] = useState<string>("");
  const [gammaF, setGammaF] = useState<string>("");
  
  // Data Input values
  const [dataInputValues, setDataInputValues] = useState<DataInputValues>({});
  
  // Results
  const [vcfResults, setVcfResults] = useState<VcfResult[]>([]);
  const [gcResults, setGcResults] = useState<GcResult[]>([]);
  
  // Equation and results displays
  const [equationHTML, setEquationHTML] = useState<string>("");
  const [resultsHTML, setResultsHTML] = useState<string>("");
  
  // UI States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [equationsMinimized, setEquationsMinimized] = useState<boolean>(true);
  
  // Access results from other pages
  const { 
    drillCollarResults,
    casingResults
  } = useFileUpload();

  // Toggle minimized state for equations card
  const toggleEquationsMinimized = () => {
    const newState = !equationsMinimized;
    setEquationsMinimized(newState);
  };

  // Save inputs to localStorage when they change
  const updateHcValue = (value: string) => {
    setHcValue(value);
    saveInputsToLocalStorage({ hcValue: value, gammaC, gammaW, gammaFC, gammaF });
  };

  const updateGammaC = (value: string) => {
    setGammaC(value);
    saveInputsToLocalStorage({ hcValue, gammaC: value, gammaW, gammaFC, gammaF });
  };

  const updateGammaW = (value: string) => {
    setGammaW(value);
    saveInputsToLocalStorage({ hcValue, gammaC, gammaW: value, gammaFC, gammaF });
  };

  const updateGammaFC = (value: string) => {
    setGammaFC(value);
    saveInputsToLocalStorage({ hcValue, gammaC, gammaW, gammaFC: value, gammaF });
  };

  const updateGammaF = (value: string) => {
    setGammaF(value);
    saveInputsToLocalStorage({ hcValue, gammaC, gammaW, gammaFC, gammaF: value });
  };

  // Save calculation results to localStorage
  const saveResultsToLocalStorage = () => {
    try {
      const resultsData = {
        vcfResults,
        gcResults,
        equationHTML,
        resultsHTML
      };
      localStorage.setItem('semanticsResults', JSON.stringify(resultsData));
    } catch (error) {
      console.error('Error saving semantics results to localStorage:', error);
    }
  };

  // Update setVcfResults to also save to localStorage
  const updateVcfResults = (results: VcfResult[]) => {
    setVcfResults(results);
    // We'll save the full results after updating all states
  };

  // Update setGcResults to also save to localStorage
  const updateGcResults = (results: GcResult[]) => {
    setGcResults(results);
    // We'll save the full results after updating all states
  };

  // Update setEquationHTML to also save to localStorage
  const updateEquationHTML = (html: string) => {
    setEquationHTML(html);
    // We'll save the full results after updating all states
  };

  // Update setResultsHTML to also save to localStorage
  const updateResultsHTML = (html: string) => {
    setResultsHTML(html);
    // After updating all states, save everything to localStorage
    setTimeout(() => {
      saveResultsToLocalStorage();
    }, 10); // Increased timeout to ensure state is updated
  };

  const saveInputsToLocalStorage = (inputs: {
    hcValue: string;
    gammaC: string;
    gammaW: string;
    gammaFC: string;
    gammaF: string;
  }) => {
    try {
      localStorage.setItem('semanticsInputs', JSON.stringify(inputs));
    } catch (error) {
      console.error('Error saving semantics inputs to localStorage:', error);
    }
  };

  // Load data input values and saved inputs on component mount
  useEffect(() => {
    const loadDataInputValues = async () => {
      try {
        // Load general data from localStorage
        const savedData = localStorage.getItem('wellsAnalyzerData');
        if (savedData) {
          const data = JSON.parse(savedData);
          setDataInputValues(data);
        }
      } catch (error) {
        console.error('Error loading data input values:', error);
        toast.error("Failed to load K1, K2, and K3 values from Data Input");
      }
    };
    
    const loadSavedInputs = () => {
      try {
        const savedInputs = localStorage.getItem('semanticsInputs');
        if (savedInputs) {
          const inputs = JSON.parse(savedInputs);
          setHcValue(inputs.hcValue || "");
          setGammaC(inputs.gammaC || "");
          setGammaW(inputs.gammaW || "");
          setGammaFC(inputs.gammaFC || "");
          setGammaF(inputs.gammaF || "");
        }
      } catch (error) {
        console.error('Error loading saved semantics inputs:', error);
      }
    };

    const loadSavedResults = () => {
      try {
        const savedResults = localStorage.getItem('semanticsResults');
        if (savedResults) {
          const results = JSON.parse(savedResults);
          setVcfResults(results.vcfResults || []);
          setGcResults(results.gcResults || []);
          setEquationHTML(results.equationHTML || "");
          setResultsHTML(results.resultsHTML || "");
        }
      } catch (error) {
        console.error('Error loading saved semantics results:', error);
      }
    };
    
    loadDataInputValues();
    loadSavedInputs();
    loadSavedResults();
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
      
      // Using the updated methods to persist results
      updateVcfResults(results);
      updateEquationHTML(equations);
      
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
      updateResultsHTML(resultsTable);
      
      toast.success("Vcf calculation completed");
    } catch (error) {
      console.error('Error calculating Vcf:', error);
      toast.error("Error calculating Vcf");
    }
  };

  const calculateGcGc = () => {
    if (!hcValue) {
      toast.error("Please enter a value for Hc");
      return;
    }

    // First calculate Vcf if needed
    if (vcfResults.length === 0) {
      // Run the Vcf calculation first
      calculateVcf();
      
      // If Vcf calculation fails, stop
      if (vcfResults.length === 0) {
        return;
      }
    }

    if (!gammaC || !gammaW || !gammaFC || !gammaF) {
      toast.error("Please enter all γ values");
      return;
    }

    // Check if K2 and K3 values are available
    if (!dataInputValues.K2) {
      toast.error("K2 value not found. Please set it in the Data Input page.");
      return;
    }

    if (!dataInputValues.K3) {
      toast.error("K3 value not found. Please set it in the Data Input page.");
      return;
    }
    
    try {
      const gamma_c = parseFloat(gammaC);
      const gamma_w = parseFloat(gammaW);
      const gamma_fc = parseFloat(gammaFC);
      const gamma_f = parseFloat(gammaF);
      const Hc = parseFloat(hcValue);
      
      // Use K2 and K3 from data input values
      const K2 = parseFloat(dataInputValues.K2);
      const K3 = parseFloat(dataInputValues.K3);
      
      // Calculate m
      const m = (gamma_w * (gamma_c - gamma_fc)) / (gamma_c * (gamma_fc - gamma_w));
      
      // Calculate gc
      const gc = (gamma_c * gamma_w) / (m * gamma_c + gamma_w);
      
      // Create results array
      const results: GcResult[] = [];
      
      // Calculate the gamma ratio for Vw formula
      const gammaRatio = (gamma_c - gamma_fc) / (gamma_c - gamma_w);
      
      // Generate HTML for equations
      let equations = `<h3>gc and Gc Calculations:</h3>
                       <p>m = [γw(γc-γfc)]/γc(γfc-γw)</p>
                       <p>m = [${gamma_w}(${gamma_c}-${gamma_fc})]/${gamma_c}(${gamma_fc}-${gamma_w})</p>
                       <p>m = ${m.toFixed(4)}</p><br>
                       
                       <p>gc = [γc×γw]/m.γc+γw</p>
                       <p>gc = [${gamma_c}×${gamma_w}]/${m}.${gamma_c}+${gamma_w}</p>
                       <p>gc = ${gc.toFixed(4)}</p><br>
                       
                       <p>Gc = K2×gc×Vcf (tons)</p>
                       <p>Where K2 = ${K2}</p><br>
                       
                       <p>nc = [Gc×1000]/50 (Sk)</p><br>
                       
                       <p>Vw = Vcf×K3×[(γc-γfc)/(γc-γw)]</p>
                       <p>Where K3 = ${K3}</p>
                       <p>Vw = Vcf×${K3}×[(${gamma_c}-${gamma_fc})/(${gamma_c}-${gamma_w})]</p>
                       <p>Vw = Vcf×${K3}×[${(gamma_c-gamma_fc).toFixed(4)}/${(gamma_c-gamma_w).toFixed(4)}]</p>
                       <p>Vw = Vcf×${K3}×${((gamma_c-gamma_fc)/(gamma_c-gamma_w)).toFixed(4)}</p><br>
                       
                       <h3>Additional Calculations:</h3>
                       <p>Vfd = (π/4)×di²×(H-h)</p>
                       <p>Where π = ${Math.PI.toFixed(4)}</p><br>
                       
                       <p>Ppmax = Pymax + Pc + Pfr</p>
                       <p>Where:</p>
                       <p>Pymax = 0.1×[(Hc-h)×(γfc-γf)]</p>
                       <p>Pc = 0.02×H + 8 or 16 (8 if H < 2000m, 16 if H ≥ 2000m)</p>
                       <p>Pfr = 5 (constant)</p><br>`;
      
      // Calculate values for each instance
      for (let i = 0; i < vcfResults.length; i++) {
        const vcf = vcfResults[i].vcf;
        const di = vcfResults[i].di / 1000; // Convert back to meters
        const h = vcfResults[i].h;
        
        // Get H (depth of section) from data inputs or estimated based on instance
        let H = 0;
        const HKey = `HD_${i + 1}`;
        if (dataInputValues[HKey]) {
          H = parseFloat(dataInputValues[HKey]);
        } else {
          // Estimate H based on instance
          H = 1500 + (i * 1000); // Default depth estimation
        }
        
        // Calculate Gc (in tons)
        const gc_value = K2 * gc * vcf;
        
        // Calculate nc = [Gc * 1000] / 50 (in Sk)
        const nc_value = (gc_value * 1000) / 50;
        
        // Calculate Vw = Vcf * K3 * [(gammac - gammafc) / (gammac - gammaw)]
        const vw_value = vcf * K3 * gammaRatio;
        
        // Calculate Vfd = (Pi/4) * di^2 * (H-h)
        const vfd_value = (Math.PI / 4) * (di**2) * (H - h);
        
        // Calculate Pymax = 0.1 * [(Hc-h) * (gammafc-gammaf)]
        const pymax_value = 0.1 * ((Hc - h) * (gamma_fc - gamma_f));
        
        // Calculate Pc = 0.02 * H + (8 or 16)
        const pc_value = 0.02 * H + (H < 2000 ? 8 : 16);
        
        // Pfr is a constant
        const pfr_value = 5;
        
        // Calculate Ppmax = Pymax + Pc + Pfr
        const ppmax_value = pymax_value + pc_value + pfr_value;
        
        // Add to results
        results.push({
          instance: i + 1,
          vcf,
          gc: gc_value,
          nc: nc_value,
          vw: vw_value,
          vfd: vfd_value,
          pymax: pymax_value,
          pc: pc_value,
          pfr: pfr_value,
          ppmax: ppmax_value
        });
        
        // Add equation steps for this instance
        equations += `<h4>Instance ${i+1}:</h4>
                     <p>Gc = ${K2} × ${gc.toFixed(4)} × ${vcf.toFixed(4)}</p>
                     <p>Gc = ${gc_value.toFixed(4)} tons</p><br>
                     
                     <p>nc = [${gc_value.toFixed(4)} × 1000] / 50</p>
                     <p>nc = ${nc_value.toFixed(1)} Sk</p><br>
                     
                     <p>Vw = ${vcf.toFixed(4)} × ${K3} × ${gammaRatio.toFixed(4)}</p>
                     <p>Vw = ${vw_value.toFixed(4)}</p><br>
                     
                     <p>Vfd = (${Math.PI.toFixed(4)}/4) × (${di.toFixed(4)})² × (${H} - ${h})</p>
                     <p>Vfd = (${Math.PI.toFixed(4)}/4) × ${(di**2).toFixed(4)} × ${(H-h).toFixed(4)}</p>
                     <p>Vfd = ${vfd_value.toFixed(4)}</p><br>
                     
                     <p>Pymax = 0.1 × [(${Hc} - ${h}) × (${gamma_fc} - ${gamma_f})]</p>
                     <p>Pymax = 0.1 × [${(Hc-h).toFixed(4)} × ${(gamma_fc-gamma_f).toFixed(4)}]</p>
                     <p>Pymax = ${pymax_value.toFixed(4)}</p><br>
                     
                     <p>Pc = 0.02 × ${H} + ${H < 2000 ? '8' : '16'} (${H < 2000 ? 'H < 2000m' : 'H ≥ 2000m'})</p>
                     <p>Pc = ${(0.02 * H).toFixed(4)} + ${H < 2000 ? '8' : '16'}</p>
                     <p>Pc = ${pc_value.toFixed(4)}</p><br>
                     
                     <p>Pfr = 5 (constant)</p><br>
                     
                     <p>Ppmax = ${pymax_value.toFixed(4)} + ${pc_value.toFixed(4)} + ${pfr_value}</p>
                     <p>Ppmax = ${ppmax_value.toFixed(4)}</p><br>`;
      }
      
      // Update results using the updated methods
      updateGcResults(results);
      updateEquationHTML(equations);
      
      // Build the full results HTML with both tables
      let fullResultsHTML = `
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Instance</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Vcf</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Gc (tons)</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">nc (Sk)</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Vw</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Vfd</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Ppmax</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => `
              <tr class="bg-transparent border-b border-gray-200 dark:border-gray-700">
                <td class="px-4 py-2 text-center">${r.instance}</td>
                <td class="px-4 py-2 text-center">${r.vcf.toFixed(4)}</td>
                <td class="px-4 py-2 text-center">${r.gc.toFixed(4)}</td>
                <td class="px-4 py-2 text-center">${r.nc.toFixed(1)}</td>
                <td class="px-4 py-2 text-center">${r.vw.toFixed(4)}</td>
                <td class="px-4 py-2 text-center">${r.vfd.toFixed(4)}</td>
                <td class="px-4 py-2 text-center">${r.ppmax.toFixed(4)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      
      // Add the pressure components table
      fullResultsHTML += `
        <h3 class="mt-6 mb-3 font-bold">Pressure Components Details</h3>
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Instance</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Pymax</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Pc</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Pfr</th>
              <th class="px-4 py-2 bg-primary text-primary-foreground text-center">Ppmax</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => `
              <tr class="bg-transparent border-b border-gray-200 dark:border-gray-700">
                <td class="px-4 py-2 text-center">${r.instance}</td>
                <td class="px-4 py-2 text-center">${r.pymax.toFixed(4)}</td>
                <td class="px-4 py-2 text-center">${r.pc.toFixed(4)}</td>
                <td class="px-4 py-2 text-center">${r.pfr}</td>
                <td class="px-4 py-2 text-center">${r.ppmax.toFixed(4)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      
      // Update results HTML with the full content
      updateResultsHTML(fullResultsHTML);
      
      toast.success("All calculations completed successfully");
    } catch (error) {
      console.error('Error calculating values:', error);
      toast.error("Error performing calculations");
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
                    onChange={(e) => updateHcValue(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gamma-c" className="text-base">γc:</Label>
                  <Input
                    id="gamma-c"
                    placeholder="Enter γc value"
                    value={gammaC}
                    onChange={(e) => updateGammaC(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gamma-w" className="text-base">γw:</Label>
                  <Input
                    id="gamma-w"
                    placeholder="Enter γw value"
                    value={gammaW}
                    onChange={(e) => updateGammaW(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gamma-fc" className="text-base">γfc:</Label>
                  <Input
                    id="gamma-fc"
                    placeholder="Enter γfc value"
                    value={gammaFC}
                    onChange={(e) => updateGammaFC(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gamma-f" className="text-base">γf:</Label>
                  <Input
                    id="gamma-f"
                    placeholder="Enter γf value"
                    value={gammaF}
                    onChange={(e) => updateGammaF(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex gap-4 mt-6">
                <Button 
                  onClick={calculateGcGc}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  Calculate All
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="bg-muted/50 border-b border-border/50 flex items-center">
              <CardTitle className="text-lg sm:text-xl text-primary/90">Constants from Data Input</CardTitle>
              <CardDescription>K1, K2, and K3 values retrieved from Data Input page</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                
                <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-border/50">
                  <Label className="text-base font-medium text-primary">K3 Value:</Label>
                  <p className="text-lg font-mono">{dataInputValues.K3 || 'Not set'}</p>
                  {!dataInputValues.K3 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Please set the K3 value in the <a href="/data-input" className="text-primary hover:underline">Data Input</a> page.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className={`${equationsMinimized ? "" : "grid grid-cols-1 md:grid-cols-2"} gap-6`}>
          {!equationsMinimized && (
            <Card className="h-full">
              <CardHeader className="bg-muted/50 border-b border-border/50 flex items-center justify-between">
                <CardTitle className="text-lg sm:text-xl text-primary/90">Equations</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleEquationsMinimized}
                  className="h-8 px-2 text-xs"
                  title="Hide equations"
                >
                  <EyeOff className="h-4 w-4 mr-1" />
                  Hide Equations
                </Button>
              </CardHeader>
              <CardContent className="h-[400px] overflow-auto">
                {equationHTML ? (
                  <div dangerouslySetInnerHTML={{ __html: equationHTML }} />
                ) : (
                  <p className="text-muted-foreground">The equations will be calculated and displayed here</p>
                )}
              </CardContent>
            </Card>
          )}
          
          <div className="w-full">
            {equationsMinimized && (
              <div className="mb-3 flex justify-end">
                <Button
                  variant="outline"
                  onClick={toggleEquationsMinimized}
                  className="h-8 px-3 text-xs flex items-center justify-center gap-1"
                  title="Show equations"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Show Equations
                </Button>
              </div>
            )}
            
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
    </div>
  );
} 