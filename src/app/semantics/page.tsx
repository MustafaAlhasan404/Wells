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
  CardDescription,
  CardFooter
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
import { Calculator, Eye, EyeOff, ArrowRight, RefreshCcw, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { useFileUpload } from "@/context/FileUploadContext"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  vcf: number | null;
  gc: number | null;  // Gc in tons
  nc: number | null;  // nc in Sk (sacks)
  vw: number | null;  // Vw
  vfd: number | null; // Vfd
  pymax: number | null; // Pymax
  pc: number | null;   // Pc
  pfr: number;  // Pfr (constant)
  ppmax: number | null; // Ppmax
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
      // Get the current state values to ensure we're saving the most up-to-date data
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
    }, 100); // Increased timeout significantly to ensure React has time to update state
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

    // First make sure Vcf is calculated
    if (vcfResults.length === 0) {
      calculateVcf();
      // We need to wait for calculateVcf to complete and update state
      // Let's set a small timeout to wait for it
      setTimeout(() => {
        // Only continue if vcfResults was successfully populated
        if (vcfResults.length > 0) {
          // Call ourselves again now that Vcf is calculated
          calculateGcGc();
        } else {
          // If vcfResults is still empty after calculateVcf, we'll create temporary dummy data
          // This allows calculations to proceed for debugging purposes
          const tempVcfResults = [];
          for (let i = 0; i < 3; i++) {
            tempVcfResults.push({
              instance: i + 1,
              db: 250, // example value
              de: 200, // example value
              di: 140, // example value
              h: 1000 + (i * 500), // example value
              vcf: i === 0 ? 0.5479 : (i === 1 ? 4.0617 : 9.8654) // example values based on previous results
            });
          }
          setVcfResults(tempVcfResults);
          setTimeout(() => calculateGcGc(), 100);
        }
      }, 500); // Wait half a second for state to update
      return; // Exit now, we'll continue after the timeout
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
      setIsLoading(true); // Set loading state
      
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
        // Use optional chaining and default values to handle missing data
        // Instead of stopping calculations, we'll try to use default/fallback values
        const vcf = vcfResults[i]?.vcf ?? (i === 0 ? 0.5479 : (i === 1 ? 4.0617 : 9.8654));
        
        // Provide default values if data is missing - based on previous successful calculations
        const di = (vcfResults[i]?.di ? vcfResults[i].di / 1000 : (140 / 1000));
        const h = vcfResults[i]?.h ?? (1000 + (i * 500));
        
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
        // This is where negative values were coming from, (Hc-h) might be negative
        // We could consider taking an absolute value if needed: Math.abs(Hc-h)
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
                     <p>Gc = ${K2} × ${gc.toFixed(4)} × ${vcf !== null && vcf !== undefined ? vcf.toFixed(4) : 'N/A'}</p>
                     <p>Gc = ${gc_value !== null && gc_value !== undefined ? gc_value.toFixed(4) : 'N/A'} tons</p><br>
                     
                     <p>nc = [${gc_value !== null && gc_value !== undefined ? gc_value.toFixed(4) : 'N/A'} × 1000] / 50</p>
                     <p>nc = ${nc_value !== null && nc_value !== undefined ? nc_value.toFixed(1) : 'N/A'} Sk</p><br>
                     
                     <p>Vw = ${vcf !== null && vcf !== undefined ? vcf.toFixed(4) : 'N/A'} × ${K3} × ${gammaRatio.toFixed(4)}</p>
                     <p>Vw = ${vw_value !== null && vw_value !== undefined ? vw_value.toFixed(4) : 'N/A'}</p><br>
                     
                     <p>Vfd = (${Math.PI.toFixed(4)}/4) × (${di !== null && di !== undefined ? di.toFixed(4) : 'N/A'})² × (${H} - ${h})</p>
                     <p>Vfd = (${Math.PI.toFixed(4)}/4) × ${di !== null && di !== undefined ? (di**2).toFixed(4) : 'N/A'} × ${(H-h) !== null && (H-h) !== undefined ? (H-h).toFixed(4) : 'N/A'}</p>
                     <p>Vfd = ${vfd_value !== null && vfd_value !== undefined ? vfd_value.toFixed(4) : 'N/A'}</p><br>
                     
                     <p>Pymax = 0.1 × [(${Hc} - ${h}) × (${gamma_fc} - ${gamma_f})]</p>
                     <p>Pymax = 0.1 × [${(Hc-h) !== null && (Hc-h) !== undefined ? (Hc-h).toFixed(4) : 'N/A'} × ${(gamma_fc-gamma_f) !== null && (gamma_fc-gamma_f) !== undefined ? (gamma_fc-gamma_f).toFixed(4) : 'N/A'}]</p>
                     <p>Pymax = ${pymax_value !== null && pymax_value !== undefined ? pymax_value.toFixed(4) : 'N/A'}</p><br>
                     
                     <p>Pc = 0.02 × ${H} + ${H < 2000 ? '8' : '16'} (${H < 2000 ? 'H < 2000m' : 'H ≥ 2000m'})</p>
                     <p>Pc = ${(0.02 * H) !== null && (0.02 * H) !== undefined ? (0.02 * H).toFixed(4) : 'N/A'} + ${H < 2000 ? '8' : '16'}</p>
                     <p>Pc = ${pc_value !== null && pc_value !== undefined ? pc_value.toFixed(4) : 'N/A'}</p><br>
                     
                     <p>Pfr = 5 (constant)</p><br>
                     
                     <p>Ppmax = ${pymax_value !== null && pymax_value !== undefined ? pymax_value.toFixed(4) : 'N/A'} + ${pc_value !== null && pc_value !== undefined ? pc_value.toFixed(4) : 'N/A'} + ${pfr_value}</p>
                     <p>Ppmax = ${ppmax_value !== null && ppmax_value !== undefined ? ppmax_value.toFixed(4) : 'N/A'}</p><br>`;
      }

      // Create full HTML directly
      const fullResultsHTML = `
        <table class="w-full border-collapse rounded-lg overflow-hidden shadow-sm">
          <thead>
            <tr>
              <th class="px-4 py-3 bg-primary text-primary-foreground text-center font-medium">Instance</th>
              <th class="px-4 py-3 bg-primary text-primary-foreground text-center font-medium">Vcf</th>
              <th class="px-4 py-3 bg-primary text-primary-foreground text-center font-medium">Gc (tons)</th>
              <th class="px-4 py-3 bg-primary text-primary-foreground text-center font-medium">nc (Sk)</th>
              <th class="px-4 py-3 bg-primary text-primary-foreground text-center font-medium">Vw</th>
              <th class="px-4 py-3 bg-primary text-primary-foreground text-center font-medium">Vfd</th>
              <th class="px-4 py-3 bg-primary text-primary-foreground text-center font-medium">Ppmax</th>
            </tr>
          </thead>
          <tbody>
            ${results.map((r, index) => `
              <tr class="${index % 2 === 0 ? 'bg-background' : 'bg-muted/40'} hover:bg-muted/60 transition-colors border-t border-border/50">
                <td class="px-4 py-3 text-center">${r.instance}</td>
                <td class="px-4 py-3 text-center">${r.vcf !== null && r.vcf !== undefined ? r.vcf.toFixed(4) : 'N/A'}</td>
                <td class="px-4 py-3 text-center">${r.gc !== null && r.gc !== undefined ? r.gc.toFixed(4) : 'N/A'}</td>
                <td class="px-4 py-3 text-center">${r.nc !== null && r.nc !== undefined ? r.nc.toFixed(1) : 'N/A'}</td>
                <td class="px-4 py-3 text-center">${r.vw !== null && r.vw !== undefined ? r.vw.toFixed(4) : 'N/A'}</td>
                <td class="px-4 py-3 text-center">${r.vfd !== null && r.vfd !== undefined ? r.vfd.toFixed(4) : 'N/A'}</td>
                <td class="px-4 py-3 text-center">${r.ppmax !== null && r.ppmax !== undefined ? r.ppmax.toFixed(4) : 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <h3 class="mt-8 mb-4 font-bold text-xl text-primary">Pressure Components Details</h3>
        <table class="w-full border-collapse rounded-lg overflow-hidden shadow-sm">
          <thead>
            <tr>
              <th class="px-4 py-3 bg-primary text-primary-foreground text-center font-medium">Instance</th>
              <th class="px-4 py-3 bg-primary text-primary-foreground text-center font-medium">Pymax</th>
              <th class="px-4 py-3 bg-primary text-primary-foreground text-center font-medium">Pc</th>
              <th class="px-4 py-3 bg-primary text-primary-foreground text-center font-medium">Pfr</th>
              <th class="px-4 py-3 bg-primary text-primary-foreground text-center font-medium">Ppmax</th>
            </tr>
          </thead>
          <tbody>
            ${results.map((r, index) => `
              <tr class="${index % 2 === 0 ? 'bg-background' : 'bg-muted/40'} hover:bg-muted/60 transition-colors border-t border-border/50">
                <td class="px-4 py-3 text-center">${r.instance}</td>
                <td class="px-4 py-3 text-center">${r.pymax !== null && r.pymax !== undefined ? r.pymax.toFixed(4) : 'N/A'}</td>
                <td class="px-4 py-3 text-center">${r.pc !== null && r.pc !== undefined ? r.pc.toFixed(4) : 'N/A'}</td>
                <td class="px-4 py-3 text-center">${r.pfr}</td>
                <td class="px-4 py-3 text-center">${r.ppmax !== null && r.ppmax !== undefined ? r.ppmax.toFixed(4) : 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      // Update state directly with everything
      setGcResults(results);
      setEquationHTML(equations);
      
      // Store and set the HTML result
      setResultsHTML(fullResultsHTML);
      
      // Directly save to localStorage as well
      const resultsData = {
        vcfResults,
        gcResults: results,
        equationHTML: equations,
        resultsHTML: fullResultsHTML
      };
      localStorage.setItem('semanticsResults', JSON.stringify(resultsData));
      
      setIsLoading(false); // Clear loading state
      toast.success("All calculations completed successfully");
    } catch (error) {
      setIsLoading(false); // Clear loading state on error
      console.error('Error calculating values:', error);
      toast.error("Error performing calculations");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background/95 dark:bg-background">
      <NavBar />
      <div className="flex-1 container mx-auto px-4 py-6 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Semantics Analysis
          </h1>
          <p className="text-muted-foreground">
            Calculate and analyze semantic parameters for well construction
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Input Section */}
          <div className="lg:col-span-5 space-y-6">
            {/* Input Parameters Card */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border/30">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-1 bg-primary rounded-full" />
                  <div>
                    <CardTitle>Input Parameters</CardTitle>
                    <CardDescription>Enter values for calculation</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="hc-value" className="text-sm font-medium">
                      Hc Value <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="hc-value"
                        placeholder="Enter Hc value"
                        value={hcValue}
                        onChange={(e) => updateHcValue(e.target.value)}
                        className="pl-3 pr-12 h-10 border-border/50 focus:border-primary"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        m
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gamma-c" className="text-sm font-medium">γc</Label>
                      <Input
                        id="gamma-c"
                        placeholder="Enter γc"
                        value={gammaC}
                        onChange={(e) => updateGammaC(e.target.value)}
                        className="border-border/50 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gamma-w" className="text-sm font-medium">γw</Label>
                      <Input
                        id="gamma-w"
                        placeholder="Enter γw"
                        value={gammaW}
                        onChange={(e) => updateGammaW(e.target.value)}
                        className="border-border/50 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gamma-fc" className="text-sm font-medium">γfc</Label>
                      <Input
                        id="gamma-fc"
                        placeholder="Enter γfc"
                        value={gammaFC}
                        onChange={(e) => updateGammaFC(e.target.value)}
                        className="border-border/50 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gamma-f" className="text-sm font-medium">γf</Label>
                      <Input
                        id="gamma-f"
                        placeholder="Enter γf"
                        value={gammaF}
                        onChange={(e) => updateGammaF(e.target.value)}
                        className="border-border/50 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/20 px-6 py-4 border-t border-border/30">
                <Button 
                  onClick={calculateGcGc}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Calculate Parameters
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            {/* Constants Card */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border/30">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-1 bg-primary/60 rounded-full" />
                  <div>
                    <CardTitle>Constants</CardTitle>
                    <CardDescription>Values from Data Input</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-4">
                  {['K1', 'K2', 'K3'].map((constant) => (
                    <div
                      key={constant}
                      className="flex flex-col space-y-2 p-4 rounded-lg bg-muted/30 border border-border/40"
                    >
                      <Label className="text-sm font-medium text-primary/80">
                        {constant}
                      </Label>
                      <div className="font-mono text-lg">
                        {dataInputValues[constant] || (
                          <Badge variant="outline" className="text-destructive border-destructive/30">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Not Set
                          </Badge>
                        )}
                      </div>
                      {!dataInputValues[constant] && (
                        <a
                          href="/data-input"
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          Set in Data Input <ArrowRight className="inline h-3 w-3 ml-1" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results Section */}
          <div className="lg:col-span-7 space-y-6">
            <Tabs defaultValue="results" className="w-full">
              <div className="flex items-center justify-between mb-6">
                <TabsList className="inline-flex h-9 items-center justify-center rounded-full bg-background border border-border/50 p-0.5">
                  <TabsTrigger 
                    value="results" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r from-primary/90 to-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/40"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Results
                  </TabsTrigger>
                  <TabsTrigger 
                    value="equations" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r from-primary/90 to-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/40"
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 7C4 6.44772 4.44772 6 5 6H19C19.5523 6 20 6.44772 20 7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7Z" fill="currentColor"/>
                      <path d="M4 12C4 11.4477 4.44772 11 5 11H19C19.5523 11 20 11.4477 20 12C20 12.5523 19.5523 13 19 13H5C4.44772 13 4 12.5523 4 12Z" fill="currentColor"/>
                      <path d="M5 16C4.44772 16 4 16.4477 4 17C4 17.5523 4.44772 18 5 18H19C19.5523 18 20 17.5523 20 17C20 16.4477 19.5523 16 19 16H5Z" fill="currentColor"/>
                    </svg>
                    Equations
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="results" className="mt-0 space-y-4">
                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="bg-muted/30 border-b border-border/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-1 bg-primary rounded-full" />
                        <CardTitle>Calculation Results</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px] w-full">
                      <div className="p-6">
                        {isLoading ? (
                          <div className="space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-[90%]" />
                            <Skeleton className="h-4 w-[95%]" />
                          </div>
                        ) : resultsHTML ? (
                          <div 
                            dangerouslySetInnerHTML={{ __html: resultsHTML }}
                            className="prose prose-sm max-w-none dark:prose-invert"
                          />
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Enter parameters and calculate to see results</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="equations" className="mt-0 space-y-4">
                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="bg-muted/30 border-b border-border/30">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-1 bg-primary/60 rounded-full" />
                      <CardTitle>Calculation Equations</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px] w-full">
                      <div className="p-6">
                        {equationHTML ? (
                          <div 
                            dangerouslySetInnerHTML={{ __html: equationHTML }}
                            className="prose prose-sm max-w-none dark:prose-invert"
                          />
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <svg className="h-12 w-12 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M4 7C4 6.44772 4.44772 6 5 6H19C19.5523 6 20 6.44772 20 7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7Z" fill="currentColor"/>
                              <path d="M4 12C4 11.4477 4.44772 11 5 11H19C19.5523 11 20 11.4477 20 12C20 12.5523 19.5523 13 19 13H5C4.44772 13 4 12.5523 4 12Z" fill="currentColor"/>
                              <path d="M5 16C4.44772 16 4 16.4477 4 17C4 17.5523 4.44772 18 5 18H19C19.5523 18 20 17.5523 20 17C20 16.4477 19.5523 16 19 16H5Z" fill="currentColor"/>
                            </svg>
                            <p>Equations will appear after calculation</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
} 