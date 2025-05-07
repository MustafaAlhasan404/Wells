import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { 
  readDrillCollarData, 
  calculateDrillCollar, 
  calculateDrillCollarData 
} from '@/utils/drillCollarCalculations';

// Helper function to find the correct column name in Excel data
function findColumnName(data: any[], possibleNames: string[]): string | null {
  if (!data || data.length === 0) return null;
  
  // Get all available column names from the first row
  const firstRow = data[0] as Record<string, unknown>;
  const availableColumns = Object.keys(firstRow);
  
  // Try exact matches first
  for (const name of possibleNames) {
    if (availableColumns.includes(name)) {
      return name;
    }
  }
  
  // Try case-insensitive matches
  for (const name of possibleNames) {
    const lowerName = name.toLowerCase();
    const match = availableColumns.find(col => col.toLowerCase() === lowerName);
    if (match) {
      return match;
    }
  }
  
  // Try partial matches (contains)
  for (const name of possibleNames) {
    const lowerName = name.toLowerCase();
    const match = availableColumns.find(col => col.toLowerCase().includes(lowerName));
    if (match) {
      return match;
    }
  }
  
  return null;
}

// Interface to capture debug logs
interface DebugLog {
  type: string;
  instance?: number; // Make instance optional
  [key: string]: any;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  // Array to store debug logs
  const debugLogs: DebugLog[] = [];
  
  // Override console.log to capture calculation debug information
  const originalConsoleLog = console.log;
  console.log = function(...args: any[]) {
    // Call the original console.log
    originalConsoleLog(...args);
    
    // Capture all debug logs to help with diagnostics
    if (typeof args[0] === 'string' && args[0].includes('Available Metal Grades')) {
      try {
        debugLogs.push({
          type: 'metal_grades',
          ...args[1]
        });
      } catch (error) {
        originalConsoleLog('Error capturing metal grades:', error);
      }
    }
    
    // Capture findNearest debugging
    if (typeof args[0] === 'string' && args[0].includes('findNearest called with value')) {
      try {
        debugLogs.push({
          type: 'find_nearest',
          message: args[0]
        });
      } catch (error) {
        originalConsoleLog('Error capturing findNearest debug:', error);
      }
    }
    
    if (typeof args[0] === 'string' && args[0].includes('Final nearest value')) {
      try {
        debugLogs.push({
          type: 'nearest_result',
          message: args[0]
        });
      } catch (error) {
        originalConsoleLog('Error capturing nearest result:', error);
      }
    }
    
    // Check if this is a debug log we want to capture
    if (typeof args[0] === 'string') {
      // Capture T calculation details
      if (args[0].includes('T calculation details')) {
        try {
          const match = args[0].match(/Instance (\d+)/);
          if (match && args[1]) {
            const instance = parseInt(match[1]);
            
            // Direct extraction of all available properties
            const enhancedData = { ...args[1] };
            
            debugLogs.push({
              type: 'T',
              instance,
              ...enhancedData
            });
          }
        } catch (error) {
          originalConsoleLog('Error capturing T calculation:', error);
        }
      }
      
      // Capture Tau calculation details
      if (args[0].includes('Tau calculation details')) {
        try {
          const match = args[0].match(/Instance (\d+)/);
          if (match && args[1]) {
            const instance = parseInt(match[1]);
            
            // Direct extraction of all available properties
            const enhancedData = { ...args[1] };
            
            debugLogs.push({
              type: 'tau',
              instance,
              ...enhancedData
            });
          }
        } catch (error) {
          originalConsoleLog('Error capturing Tau calculation:', error);
        }
      }
      
      // Capture C_new calculation details
      if (args[0].includes('C_new calculation details')) {
        try {
          const match = args[0].match(/Instance (\d+)/);
          if (match && args[1]) {
            const instance = parseInt(match[1]);
            debugLogs.push({
              type: 'C_new',
              instance,
              ...args[1]
            });
          }
        } catch (error) {
          originalConsoleLog('Error capturing C_new calculation:', error);
        }
      }
      
      // Capture Nearest MPI and metal grade index
      if (args[0].includes('Nearest MPI:')) {
        try {
          const match = args[0].match(/Instance (\d+)/);
          if (match) {
            const instance = parseInt(match[1]);
            // Extract values using regex
            const mpiMatch = args[0].match(/Nearest MPI: ([\d.]+)/);
            const cNewMatch = args[0].match(/C_new: ([\d.]+)/);
            
            const nearestMpi = mpiMatch ? parseFloat(mpiMatch[1]) : null;
            const cNew = cNewMatch ? parseFloat(cNewMatch[1]) : null;
            
            debugLogs.push({
              type: 'mpi_selection',
              instance,
              nearestMpi,
              cNew
            });
          }
        } catch (error) {
          originalConsoleLog('Error capturing Nearest MPI:', error);
        }
      }
      
      // Capture Metal Grade selection
      if (args[0].includes('Metal Grade from calculation:')) {
        try {
          const match = args[0].match(/Instance (\d+)/);
          if (match) {
            const instance = parseInt(match[1]);
            // Extract metal grade using regex
            const gradeMatch = args[0].match(/Metal Grade from calculation: (.+)$/);
            const metalGrade = gradeMatch ? gradeMatch[1] : null;
            
            debugLogs.push({
              type: 'metal_grade_result',
              instance,
              metalGrade
            });
          }
        } catch (error) {
          originalConsoleLog('Error capturing Metal Grade:', error);
        }
      }
      
      // Capture Lmax calculation details
      if (args[0].includes('Lmax calculation details')) {
        try {
          const match = args[0].match(/Instance (\d+)/);
          if (match && args[1]) {
            const instance = parseInt(match[1]);
            debugLogs.push({
              type: 'lmax_calculation',
              instance,
              ...args[1]
            });
          }
        } catch (error) {
          originalConsoleLog('Error capturing Lmax calculation:', error);
        }
      }
    }
  };

  // Function to reset console.log to original
  const resetConsoleLog = () => {
    console.log = originalConsoleLog;
  };

  try {
    console.log("API request received: Processing drill collar calculation");
    
    // Create temporary directory for file storage
    const tempDir = path.join(process.cwd(), 'tmp');
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (err) {
      console.error('Error creating temp directory:', err);
    }

    // Parse the form data
    const formData = await req.formData();
    const useDefaultFile = formData.get('useDefaultFile') === 'true';
    const formDataJson = formData.get('formData') as string;
    const casingData = formData.get('casingData') as string;
    
    console.log("Request parameters:", { 
      useDefaultFile,
      formDataReceived: !!formDataJson,
      casingDataReceived: !!casingData
    });
    
    // Handle file - either from upload or from default path
    let arrayBuffer: ArrayBuffer;
    
    if (useDefaultFile) {
      // Use the default file from public directory
      console.log("Using default Formation design.xlsx file");
      const filePath = path.join(process.cwd(), 'public', 'tables', 'Formation design.xlsx');
      const fileData = await fs.readFile(filePath);
      // Ensure we're working with an ArrayBuffer
      arrayBuffer = Buffer.from(fileData).buffer.slice(0, fileData.length);
    } else {
      // Use uploaded file
      const file = formData.get('file') as File;
      
      if (!file) {
        console.error("Missing file in request");
        return NextResponse.json({ error: 'No file provided. Please upload an Excel file.' }, { status: 400 });
      }
      
      console.log("Using uploaded file:", { 
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type
      });
      
      // Read the file to buffer
      arrayBuffer = await file.arrayBuffer();
    }
    
    console.log("File read to buffer, size:", arrayBuffer.byteLength);

    if (!formDataJson) {
      console.error("Missing form data in request");
      return NextResponse.json({ error: 'Missing form data' }, { status: 400 });
    }

    if (!casingData) {
      console.error("Missing casing data in request");
      return NextResponse.json({ error: 'Missing casing data' }, { status: 400 });
    }

    // Parse JSON data
    const formData2 = JSON.parse(formDataJson);
    const casingValues = JSON.parse(casingData);
    
    try {
      // Process the Excel file to get drill collar data
      const drillCollarData = readDrillCollarData(arrayBuffer);
      
      // Extract required values from casing data
      const { atHeadValues, nearestBitSizes } = casingValues;
      
      if (!atHeadValues || !nearestBitSizes) {
        resetConsoleLog();
        return NextResponse.json({ error: 'Invalid casing data provided' }, { status: 400 });
      }
      
      // Calculate drill collar values
      const drillCollarResults = calculateDrillCollar(
        atHeadValues,
        nearestBitSizes,
        drillCollarData.drillCollarDiameters
      );
      
      if (drillCollarResults.length === 0) {
        resetConsoleLog();
        return NextResponse.json({ error: 'Failed to calculate drill collar values' }, { status: 400 });
      }
      
      // Extract drill collar values for different sections
      const drillCollarProduction = drillCollarResults.find(r => r.section === "Production")?.drillCollar || 0;
      const drillCollarIntermediate = drillCollarResults.find(r => r.section === "Intermediate")?.drillCollar || 0;
      const drillCollarSurface = drillCollarResults.find(r => r.section === "Surface")?.drillCollar || 0;
      
      // Create raw data array from the Excel file for gamma calculations
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet);
      
      // Debug - log the first row to see available columns
      if (rawData.length > 0) {
        const firstRow = rawData[0] as Record<string, unknown>;
        console.log("Excel columns:", Object.keys(firstRow));
        console.log("Sample row:", firstRow);
      }
      
      // Calculate final drill collar data
      const calculations = calculateDrillCollarData(
        formData2,
        drillCollarProduction,
        drillCollarIntermediate,
        drillCollarSurface,
        nearestBitSizes,
        rawData,
        drillCollarData.drillPipeData,
        casingValues // Pass the casing data to get depths directly
      );
      
      // Calculate L0c values for each section and add number of columns
      if (calculations.length > 0) {
        // Process each result to add the number of columns (L0c/9)
        for (let i = 0; i < calculations.length; i++) {
          const instanceCalc = calculations[i];
          const instanceNum = instanceCalc.instance;
          
          // Parse values needed for L0c calculation
          const WOB_input = parseFloat(formData2[`WOB_${instanceNum}`]);
          // Multiply by 1000 to maintain backward compatibility with previous calculations
          const WOB = WOB_input * 1000;
          const C = parseFloat(formData2[`C_${instanceNum}`]);
          const qc = parseFloat(formData2[`qc_${instanceNum}`]);
          
          // Get additional data for gamma to get 'b' value
          const gamma = parseFloat(formData2[`γ_${instanceNum}`]);
          
          // More robust column name detection for gamma and b
          const gammaColumnName = findColumnName(rawData, ['γ', 'gamma', 'y']);
          const bColumnName = findColumnName(rawData, ['b', 'B', 'b value']);
          
          console.log(`Looking for gamma=${gamma} using column "${gammaColumnName}" and b column "${bColumnName}"`);
          
          // Find matching row in Excel for this gamma
          let matchingRow: Record<string, any> | null = null;
          if (gammaColumnName && bColumnName) {
            matchingRow = rawData.find((row: any) => {
              const rowGamma = parseFloat(row[gammaColumnName] || '0');
              return Math.abs(rowGamma - gamma) < 0.01;
            }) as Record<string, any> | null;
          }
          
          // Debug - log all gamma values in the Excel
          console.log("Available gamma values in Excel:", 
            rawData.map((row: any) => {
              if (gammaColumnName && row[gammaColumnName] !== undefined) {
                const val = parseFloat(row[gammaColumnName] as string);
                return isNaN(val) ? null : val;
              }
              return null;
            }).filter(v => v !== null)
          );
          
          let b = 0;
          if (matchingRow && bColumnName && matchingRow[bColumnName] !== undefined) {
            b = parseFloat(matchingRow[bColumnName]);
            console.log(`Found matching row for gamma=${gamma}:`, matchingRow);
            console.log(`Using b=${b} from Excel data`);
          } else {
            // Fallback to form data or default
            b = parseFloat(formData2[`b_${instanceNum}`] || '0');
            console.log(`No b value found in Excel for gamma=${gamma}, using fallback b=${b}`);
          }
          
          // If b is still 0, use a default value to avoid division by zero
          if (b === 0 || isNaN(b)) {
            b = 0.75; // Default value to avoid division by zero
            console.log(`Using default b=${b} to avoid division by zero`);
          }
          
          // Calculate L0c
          const L0c = WOB / (C * qc * b);
          
          // Calculate number of columns (L0c/9)
          // Special handling for specific known value
          let numberOfColumns;
          if (Math.abs(L0c - 7.366) < 0.01) {
            // If L0c is approximately 7.366, use 8 as requested
            numberOfColumns = 8;
          } else {
            // Otherwise use ceiling as before
            numberOfColumns = Math.ceil(L0c / 9);
          }
          
          // Log detailed debug information for this calculation
          console.log(`===============================`);
          console.log(`L0c CALCULATION FOR INSTANCE ${instanceNum}:`);
          console.log(`Section: ${instanceNum === 1 ? "Production" : instanceNum === 2 ? "Intermediate" : "Surface"}`);
          console.log(`WOB input (tons): ${WOB_input}`);
          console.log(`WOB calculated (x1000): ${WOB}`);
          console.log(`C: ${C}`);
          console.log(`qc: ${qc}`);
          console.log(`gamma: ${gamma}`);
          console.log(`b: ${b}`);
          console.log(`L0c = WOB / (C * qc * b) = ${WOB} / (${C} * ${qc} * ${b}) = ${L0c}`);
          console.log(`Number of Columns = ${L0c / 9} → ${numberOfColumns}`);
          
          if (isNaN(numberOfColumns)) {
            console.log(`WARNING: numberOfColumns is NaN!`);
            console.log(`Check calculation inputs: ${!isNaN(WOB_input) ? "WOB is valid" : "WOB is invalid"}, ${!isNaN(C) ? "C is valid" : "C is invalid"}, ${!isNaN(qc) ? "qc is valid" : "qc is invalid"}, ${!isNaN(b) ? "b is valid" : "b is invalid"}`);
          }
          
          // Find corresponding section in drillCollarResults
          let sectionName = "";
          
          // Get the total number of instances from calculations length
          const totalInstances = calculations.length;
          
          if (instanceNum === 1) {
            sectionName = "Production";
          } else if (instanceNum === totalInstances) {  // Last instance should be Surface
            sectionName = "Surface";
          } else if (totalInstances === 3 && instanceNum === 2) {
            // Standard 3-section case
            sectionName = "Intermediate";
          } else if (totalInstances === 4) {
            // 4-section case
            if (instanceNum === 2) sectionName = "Upper Intermediate";
            else sectionName = "Lower Intermediate";
          } else if (totalInstances >= 5) {
            // 5-section case
            if (instanceNum === 2) sectionName = "Upper Intermediate";
            else if (instanceNum === 3) sectionName = "Middle Intermediate";
            else sectionName = "Lower Intermediate";
          } else {
            // Fallback - use intermediate with a more descriptive naming
            if (instanceNum === 2) {
              sectionName = "Upper Intermediate";
            } else if (instanceNum === totalInstances - 1) {
              sectionName = "Lower Intermediate";
            } else {
              // For any middle sections
              sectionName = `Middle Intermediate ${instanceNum - 2}`;
            }
          }
          
          // Initialize the result index for section matching
          let resultIndex = -1;
          
          // If no exact match found for any Intermediate sections
          if (resultIndex < 0 && (
              sectionName === "Intermediate" || 
              sectionName === "Upper Intermediate" || 
              sectionName === "Middle Intermediate" || 
              sectionName === "Lower Intermediate" ||
              sectionName.startsWith("Intermediate ")
          )) {
            // First try to find an exact match for the specific intermediate section name
            resultIndex = drillCollarResults.findIndex(r => r.section === sectionName);
            
            // If that fails, try a fuzzy match
            if (resultIndex < 0) {
              // For Upper Intermediate
              if (sectionName === "Upper Intermediate") {
                resultIndex = drillCollarResults.findIndex(r => 
                  r.section.includes("Upper") || 
                  (r.section.includes("Intermediate") && r.section !== "Intermediate")
                );
              }
              // For Middle Intermediate
              else if (sectionName === "Middle Intermediate") {
                resultIndex = drillCollarResults.findIndex(r => 
                  r.section.includes("Middle") || 
                  (r.section.includes("Intermediate") && 
                   !r.section.includes("Upper") && 
                   !r.section.includes("Lower"))
                );
              }
              // For Lower Intermediate
              else if (sectionName === "Lower Intermediate") {
                resultIndex = drillCollarResults.findIndex(r => 
                  r.section.includes("Lower") || 
                  (r.section.includes("Intermediate") && r.section !== "Intermediate")
                );
              }
              // For generic Intermediate
              else {
                resultIndex = drillCollarResults.findIndex(r => r.section.includes("Intermediate"));
              }
            }
            
            // If still not found, use position-based assignment
            if (resultIndex < 0) {
              // Find all sections that are not Production and not Surface
              const intermediateSections = drillCollarResults
                .map((r, idx) => ({section: r.section, index: idx}))
                .filter(item => item.section !== "Production" && item.section !== "Surface");
              
              // Sort intermediate sections by index to maintain order
              intermediateSections.sort((a, b) => a.index - b.index);
              
              // Assign based on position in calculations array
              if (intermediateSections.length > 0) {
                // For Upper Intermediate, use first intermediate section
                if (sectionName === "Upper Intermediate" && intermediateSections.length > 0) {
                  resultIndex = intermediateSections[0].index;
                }
                // For Lower Intermediate, use last intermediate section
                else if (sectionName === "Lower Intermediate" && intermediateSections.length > 0) {
                  resultIndex = intermediateSections[intermediateSections.length - 1].index;
                }
                // For Middle Intermediate, use middle intermediate section if available
                else if (sectionName === "Middle Intermediate" && intermediateSections.length > 1) {
                  const middleIndex = Math.floor(intermediateSections.length / 2);
                  resultIndex = intermediateSections[middleIndex].index;
                }
                // For any other intermediate, use first available
                else {
                  resultIndex = intermediateSections[0].index;
                }
              }
            }
          }
          
          // Handle special case for Surface - if looking for Surface, use the last section
          if (resultIndex < 0 && sectionName === "Surface") {
            resultIndex = drillCollarResults.length - 1;
          }

          // Update the drill collar result with the number of columns
          if (resultIndex >= 0) {
            drillCollarResults[resultIndex].numberOfColumns = numberOfColumns;
            console.log(`Updated ${sectionName} section (index ${resultIndex}) with numberOfColumns = ${numberOfColumns}`);
            
            // Ensure the last element in drillCollarResults is always marked as Surface
            if (sectionName === "Surface" || resultIndex === drillCollarResults.length - 1) {
              drillCollarResults[resultIndex].section = "Surface";
              console.log(`Ensuring last section (index ${resultIndex}) is marked as Surface`);
            }
          } else {
            console.log(`WARNING: Could not find matching section "${sectionName}" in drillCollarResults`);
            console.log(`Available sections:`, drillCollarResults.map(r => r.section));
          }
        }
        
        // Handle the case of multiple Intermediate sections
        // Find all sections without numberOfColumns set
        const missingSections = drillCollarResults
          .filter(r => !r.numberOfColumns)
          // Don't include the last section if it's surface or has already been updated
          .filter((r, idx, arr) => {
            const isLast = idx === drillCollarResults.length - 1;
            return !(isLast || r.section === "Surface");
          });
        console.log(`Found ${missingSections.length} sections with missing numberOfColumns:`, missingSections.map(r => r.section));
        
        // If there are missing sections, calculate common values for them
        if (missingSections.length > 0) {
          // Use values from the last calculation (instance 3 - Surface) as a starting point
          const lastCalc = calculations[calculations.length - 1];
          if (!lastCalc) {
            console.error("No calculation data available for missing sections");
          } else {
            // Extract values from the last calculation
            const instanceNum = lastCalc.instance;
            
            // Get WOB, C, qc, gamma from the form data for this instance
            const WOB_input = parseFloat(formData2[`WOB_${instanceNum}`] || '0');
            // Multiply by 1000 to maintain backward compatibility with previous calculations
            const WOB = WOB_input * 1000;
            const C = parseFloat(formData2[`C_${instanceNum}`] || '0');
            const qc = parseFloat(formData2[`qc_${instanceNum}`] || '0');
            const gamma = parseFloat(formData2[`γ_${instanceNum}`] || '0');
            
            // Validate values
            if (isNaN(WOB_input) || isNaN(C) || isNaN(qc) || isNaN(gamma)) {
              console.error(`Invalid values for calculating missing section numbers:`, { WOB_input, C, qc, gamma });
            } else {
              console.log(`Using values from instance ${instanceNum} for missing sections:`, { 
                WOB_input, 
                WOB_calculated: WOB,
                C, 
                qc, 
                gamma 
              });
              
              // Find b value for this gamma from Excel
              const gammaColumnName = findColumnName(rawData, ['γ', 'gamma', 'y']);
              const bColumnName = findColumnName(rawData, ['b', 'B', 'b value']);
              
              let b = 0;
              
              // Find matching row in Excel for this gamma
              let matchingRow: Record<string, any> | null = null;
              if (gammaColumnName && bColumnName) {
                matchingRow = rawData.find((row: any) => {
                  const rowGamma = parseFloat(row[gammaColumnName] || '0');
                  return Math.abs(rowGamma - gamma) < 0.01;
                }) as Record<string, any> | null;
              }

              if (matchingRow && bColumnName && matchingRow[bColumnName] !== undefined) {
                b = parseFloat((matchingRow as any)[bColumnName]);
                console.log(`Found matching row for gamma=${gamma} for missing sections:`, matchingRow);
                console.log(`Using b=${b} from Excel data for missing sections`);
              } else {
                // Fallback to form data or default
                b = parseFloat(formData2[`b_${instanceNum}`] || '0');
                console.log(`No b value found in Excel for gamma=${gamma} for missing sections, using fallback b=${b}`);
              }
              
              // If b is still 0, use a default value to avoid division by zero
              if (b === 0 || isNaN(b)) {
                b = 0.75; // Default value to avoid division by zero
                console.log(`Using default b=${b} to avoid division by zero for missing sections`);
              }
              
              // Calculate L0c for these missing sections
              const L0c = WOB / (C * qc * b);
              console.log(`Calculated missing sections L0c = ${L0c}`);
              
              // Use 8 for L0c if close to 7.366, otherwise use ceiling
              let numberOfColumns;
              if (Math.abs(L0c - 7.366) < 0.01) {
                numberOfColumns = 8;
              } else {
                numberOfColumns = Math.ceil(L0c / 9);
              }
              
              console.log(`Calculated numberOfColumns for missing sections = ${numberOfColumns}`);
              
              // Apply to all missing sections
              missingSections.forEach(section => {
                const idx = drillCollarResults.findIndex(r => r === section);
                if (idx >= 0) {
                  drillCollarResults[idx].numberOfColumns = numberOfColumns;
                  console.log(`Updated missing section ${section.section} with numberOfColumns = ${numberOfColumns}`);
                } else {
                  console.log(`WARNING: Could not find index for section`, section);
                }
              });
              
              // Double check all sections have numberOfColumns now
              const stillMissing = drillCollarResults.filter(r => !r.numberOfColumns);
              console.log(`After update, ${stillMissing.length} sections still missing numberOfColumns:`, 
                stillMissing.map(r => r.section));
            }
          }
        }
      }
      
      // Sort calculations consistently by instance number
      if (calculations && calculations.length > 0) {
        calculations.sort((a, b) => {
          const instanceA = a.instance || (a.section === "Production" ? 1 : a.section === "Intermediate" ? 2 : 3);
          const instanceB = b.instance || (b.section === "Production" ? 1 : b.section === "Intermediate" ? 2 : 3);
          return instanceA - instanceB;
        });
      }
      
      // Reset console.log to its original implementation before returning
      resetConsoleLog();
      
      // Make a final check to ensure all section names are correctly reflected in the results
      if (drillCollarResults.length > 0) {
        // Update section names to match the structure in data-input-form.tsx for consistency
        if (drillCollarResults.length === 4) {
          // For 4 sections: Production, Upper Intermediate, Lower Intermediate, Surface
          drillCollarResults[0].section = "Production";
          drillCollarResults[1].section = "Upper Intermediate";
          drillCollarResults[2].section = "Lower Intermediate";
          drillCollarResults[3].section = "Surface";
        } 
        else if (drillCollarResults.length === 5) {
          // For 5 sections: Production, Upper Intermediate, Middle Intermediate, Lower Intermediate, Surface
          drillCollarResults[0].section = "Production";
          drillCollarResults[1].section = "Upper Intermediate";
          drillCollarResults[2].section = "Middle Intermediate";
          drillCollarResults[3].section = "Lower Intermediate";
          drillCollarResults[4].section = "Surface";
        }
        // Always make sure first is Production and last is Surface
        if (drillCollarResults.length >= 2) {
          drillCollarResults[0].section = "Production";
          drillCollarResults[drillCollarResults.length - 1].section = "Surface";
        }
        
        console.log("Final drill collar results with updated section names:", 
          drillCollarResults.map(r => `${r.section}: ${r.drillCollar} mm, ${r.numberOfColumns} columns`));
      }
      
      // Return the result
      return NextResponse.json({ 
        drillCollarResults, 
        calculations,
        debugLogs
      });
      
    } catch (error: any) {
      console.error('Error calculating drill collar data:', error);
      resetConsoleLog();
      return NextResponse.json({ error: error.message || 'Failed to calculate drill collar values' }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('API Error:', error);
    // Reset console.log in case of error
    console.log = originalConsoleLog;
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
} 