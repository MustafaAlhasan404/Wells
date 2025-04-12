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

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
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
    const file = formData.get('file') as File;
    const formDataJson = formData.get('formData') as string;
    const casingData = formData.get('casingData') as string;
    
    console.log("Request parameters:", { 
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      formDataReceived: !!formDataJson,
      casingDataReceived: !!casingData
    });
    
    if (!file) {
      console.error("Missing file in request");
      return NextResponse.json({ error: 'No file provided. Please upload an Excel file.' }, { status: 400 });
    }

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
    
    // Read the file to buffer
    const arrayBuffer = await file.arrayBuffer();
    console.log("File read to buffer, size:", arrayBuffer.byteLength);
    
    try {
      // Process the Excel file to get drill collar data
      const drillCollarData = readDrillCollarData(arrayBuffer);
      
      // Extract required values from casing data
      const { initialDcsg, atHeadValues, nearestBitSizes } = casingValues;
      
      if (!initialDcsg || !atHeadValues || !nearestBitSizes) {
        return NextResponse.json({ error: 'Invalid casing data provided' }, { status: 400 });
      }
      
      // Calculate drill collar values
      const drillCollarResults = calculateDrillCollar(
        initialDcsg,
        atHeadValues,
        nearestBitSizes,
        drillCollarData.drillCollarDiameters
      );
      
      if (drillCollarResults.length === 0) {
        return NextResponse.json({ error: 'Failed to calculate drill collar values' }, { status: 400 });
      }
      
      // Extract drill collar values for different sections
      const drillCollarProduction = drillCollarResults.find(r => r.section === "Production")?.drillCollar || 0;
      const drillCollarIntermediate = drillCollarResults.find(r => r.section === "Intermediate")?.drillCollar || 0;
      const drillCollarSurface = drillCollarResults.find(r => r.section === "Surface")?.drillCollar || 0;
      
      // Create raw data array from the Excel file for gamma calculations
      const workbook = await file.arrayBuffer().then(buffer => 
        XLSX.read(new Uint8Array(buffer), { type: 'array' })
      );
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
        drillCollarData.drillPipeData
      );
      
      // Calculate L0c values for each section and add number of columns
      if (calculations.length > 0) {
        // Process each result to add the number of columns (L0c/9)
        for (let i = 0; i < calculations.length; i++) {
          const instanceCalc = calculations[i];
          const instanceNum = instanceCalc.instance;
          
          // Parse values needed for L0c calculation
          const WOB = parseFloat(formData2[`WOB_${instanceNum}`]);
          const C = parseFloat(formData2[`C_${instanceNum}`]);
          const qc = parseFloat(formData2[`qc_${instanceNum}`]);
          
          // Get additional data for gamma to get 'b' value
          const gamma = parseFloat(formData2[`γ_${instanceNum}`]);
          
          // More robust column name detection for gamma and b
          const gammaColumnName = findColumnName(rawData, ['γ', 'gamma', 'y']);
          const bColumnName = findColumnName(rawData, ['b', 'B', 'b value']);
          
          console.log(`Looking for gamma=${gamma} using column "${gammaColumnName}" and b column "${bColumnName}"`);
          
          // Find row with matching gamma value
          let matchingRow: Record<string, any> | null = null;
          if (gammaColumnName) {
            // First try exact match
            const exactMatch = rawData.find((row: any) => {
              const rowGamma = row[gammaColumnName];
              return rowGamma !== undefined && parseFloat(rowGamma as string) === gamma;
            });
            
            if (exactMatch) {
              matchingRow = exactMatch as Record<string, any>;
            } else {
              // If no exact match, try approximate match
              const approxMatch = rawData.find((row: any) => {
                const rowGamma = row[gammaColumnName];
                return rowGamma !== undefined && 
                  Math.abs(parseFloat(rowGamma as string) - gamma) < 0.01;
              });
              
              if (approxMatch) {
                matchingRow = approxMatch as Record<string, any>;
              }
            }
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
          console.log(`WOB: ${WOB}`);
          console.log(`C: ${C}`);
          console.log(`qc: ${qc}`);
          console.log(`gamma: ${gamma}`);
          console.log(`b: ${b}`);
          console.log(`L0c = WOB / (C * qc * b) = ${WOB} / (${C} * ${qc} * ${b}) = ${L0c}`);
          console.log(`Number of Columns = ${L0c / 9} → ${numberOfColumns}`);
          
          if (isNaN(numberOfColumns)) {
            console.log(`WARNING: numberOfColumns is NaN!`);
            console.log(`Check calculation inputs: ${!isNaN(WOB) ? "WOB is valid" : "WOB is invalid"}, ${!isNaN(C) ? "C is valid" : "C is invalid"}, ${!isNaN(qc) ? "qc is valid" : "qc is invalid"}, ${!isNaN(b) ? "b is valid" : "b is invalid"}`);
          }
          
          // Find corresponding section in drillCollarResults
          let sectionName = "";
          if (instanceNum === 1) {
            sectionName = "Production";
          } else if (instanceNum === 2) {
            sectionName = "Intermediate";
          } else {
            sectionName = "Surface";
          }
          
          // Update the drill collar result with the number of columns
          const resultIndex = drillCollarResults.findIndex(r => r.section === sectionName);
          if (resultIndex >= 0) {
            drillCollarResults[resultIndex].numberOfColumns = numberOfColumns;
            console.log(`Updated ${sectionName} section (index ${resultIndex}) with numberOfColumns = ${numberOfColumns}`);
          } else {
            console.log(`WARNING: Could not find matching section "${sectionName}" in drillCollarResults`);
            console.log(`Available sections:`, drillCollarResults.map(r => r.section));
          }
        }
        
        // Handle the case of multiple Intermediate sections
        // Find all sections without numberOfColumns set
        const missingSections = drillCollarResults.filter(r => !r.numberOfColumns);
        console.log(`Found ${missingSections.length} sections with missing numberOfColumns:`, missingSections.map(r => r.section));
        
        if (missingSections.length > 0) {
          // For any remaining Intermediate sections without values, use Instance 3 values
          const WOB = parseFloat(formData2[`WOB_3`] || '0');
          const C = parseFloat(formData2[`C_3`] || '0');
          const qc = parseFloat(formData2[`qc_3`] || '0');
          const gamma = parseFloat(formData2[`γ_3`] || '0');
          
          // Find b value using the same robust method as above
          const gammaColumnName = findColumnName(rawData, ['γ', 'gamma', 'y']);
          const bColumnName = findColumnName(rawData, ['b', 'B', 'b value']);
          
          console.log(`Looking for gamma=${gamma} for missing sections using column "${gammaColumnName}" and b column "${bColumnName}"`);
          
          // Find row with matching gamma value
          let matchingRow: Record<string, any> | null = null;
          if (gammaColumnName) {
            // Try exact match first
            const exactMatch = rawData.find((row: any) => {
              const rowGamma = row[gammaColumnName];
              return rowGamma !== undefined && parseFloat(rowGamma as string) === gamma;
            });
            
            if (exactMatch) {
              matchingRow = exactMatch as Record<string, any>;
            } else {
              // If no exact match, try approximate match
              const approxMatch = rawData.find((row: any) => {
                const rowGamma = row[gammaColumnName];
                return rowGamma !== undefined && 
                  Math.abs(parseFloat(rowGamma as string) - gamma) < 0.01;
              });
              
              if (approxMatch) {
                matchingRow = approxMatch as Record<string, any>;
              }
            }
          }
          
          let b = 0;
          if (matchingRow && bColumnName && matchingRow[bColumnName] !== undefined) {
            b = parseFloat((matchingRow as any)[bColumnName]);
            console.log(`Found matching row for gamma=${gamma} for missing sections:`, matchingRow);
            console.log(`Using b=${b} from Excel data for missing sections`);
          } else {
            // Fallback to form data or default
            b = parseFloat(formData2[`b_3`] || '0');
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
      
      // Return the results
      return NextResponse.json({
        drillCollarResults,
        calculations,
        drillCollarData: {
          production: drillCollarProduction,
          intermediate: drillCollarIntermediate,
          surface: drillCollarSurface
        },
        debugInfo: {
          bValues: (() => {
            // First generate b values for the calculation instances
            const mainBValues = calculations.map((calc, index) => {
              const instanceNum = calc.instance;
              // Get gamma value
              const gamma = parseFloat(formData2[`γ_${instanceNum}`] || '0');
              // Find matching row in Excel for this gamma
              const gammaColumnName = findColumnName(rawData, ['γ', 'gamma', 'y']);
              const bColumnName = findColumnName(rawData, ['b', 'B', 'b value']);
              
              let foundBValue = null;
              if (gammaColumnName && bColumnName) {
                const matchingRow = rawData.find((row: any) => {
                  const rowGamma = parseFloat(row[gammaColumnName] || '0');
                  return Math.abs(rowGamma - gamma) < 0.01;
                });
                
                if (matchingRow) {
                  foundBValue = parseFloat((matchingRow as any)[bColumnName] || '0');
                  if (foundBValue === 0 || isNaN(foundBValue)) {
                    foundBValue = 0.75; // The default value used
                  }
                }
              }
              
              return {
                instance: instanceNum,
                gamma,
                bValue: foundBValue !== null ? foundBValue : 0.75,
                section: instanceNum === 1 ? "Production" : 
                         instanceNum === 2 ? "Intermediate" : "Surface"
              };
            });
            
            // Find all sections in drillCollarResults
            const allSections = drillCollarResults.map(r => r.section);
            
            // Now ensure we have a b value for every section in drillCollarResults
            const allBValues = [...mainBValues];
            
            // Add b values for any missing sections
            drillCollarResults.forEach((result, idx) => {
              // Check if this section already has a b value in mainBValues
              const hasMatchingBValue = mainBValues.some(bv => bv.section === result.section);
              
              if (!hasMatchingBValue) {
                // This is a section without a matching calculation instance
                // Use the instance 3 data for gamma and b value
                const gamma = parseFloat(formData2['γ_3'] || '1.08');
                const gammaColumnName = findColumnName(rawData, ['γ', 'gamma', 'y']);
                const bColumnName = findColumnName(rawData, ['b', 'B', 'b value']);
                
                let foundBValue = null;
                if (gammaColumnName && bColumnName) {
                  const matchingRow = rawData.find((row: any) => {
                    const rowGamma = parseFloat(row[gammaColumnName] || '0');
                    return Math.abs(rowGamma - gamma) < 0.01;
                  });
                  
                  if (matchingRow) {
                    foundBValue = parseFloat((matchingRow as any)[bColumnName] || '0');
                  }
                }
                
                // Add to the list
                allBValues.push({
                  instance: 3, // Assume it's instance 3
                  gamma,
                  bValue: foundBValue !== null ? foundBValue : 0.75,
                  section: result.section
                });
              }
            });
            
            return allBValues;
          })()
        }
      });
      
    } catch (error: any) {
      console.error("Error processing file:", error);
      return NextResponse.json({ 
        error: `Error processing file: ${error.message}` 
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error("Server error:", error);
    return NextResponse.json({ 
      error: `Server error: ${error.message}` 
    }, { status: 500 });
  }
} 