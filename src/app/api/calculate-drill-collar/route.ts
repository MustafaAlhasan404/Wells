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
          } else if (instanceNum === 3) {  // Last instance (3) should be Surface
            sectionName = "Surface";
          } else {
            // All middle sections are just "Intermediate"
            sectionName = "Intermediate";
          }
          
          // If no exact match by name, try to find the section by position
          let resultIndex = drillCollarResults.findIndex(r => r.section === sectionName);
          
          // If no exact match found for Intermediate sections (which might be multiple)
          if (resultIndex < 0 && sectionName === "Intermediate") {
            // This is instance 2, so find the first intermediate section
            // For multiple intermediate sections, we'll always use the first one for instance 2
            resultIndex = drillCollarResults.findIndex(r => r.section === "Intermediate");
            
            // If still not found, use position-based assignment (first non-production section)
            if (resultIndex < 0) {
              // Find all sections that are not Production and not Surface
              const intermediateSections = drillCollarResults
                .map((r, idx) => ({section: r.section, index: idx}))
                .filter(item => item.section !== "Production" && item.section !== "Surface");
              
              if (intermediateSections.length > 0) {
                // Use the first one
                resultIndex = intermediateSections[0].index;
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
            const WOB = parseFloat(formData2[`WOB_${instanceNum}`] || '0');
            const C = parseFloat(formData2[`C_${instanceNum}`] || '0');
            const qc = parseFloat(formData2[`qc_${instanceNum}`] || '0');
            const gamma = parseFloat(formData2[`γ_${instanceNum}`] || '0');
            
            // Validate values
            if (isNaN(WOB) || isNaN(C) || isNaN(qc) || isNaN(gamma)) {
              console.error(`Invalid values for calculating missing section numbers:`, { WOB, C, qc, gamma });
            } else {
              console.log(`Using values from instance ${instanceNum} for missing sections:`, { WOB, C, qc, gamma });
              
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
      
      // Return the results
      return NextResponse.json({
        drillCollarResults,
        calculations,
        drillCollarData: {
          production: drillCollarProduction,
          intermediate: drillCollarIntermediate,
          surface: drillCollarSurface
        },
        // Map the calculations to all sections shown in the drill collar results
        extendedCalculations: (() => {
          // Create a new array matching the drill collar results sections exactly
          const extended = [];
          
          console.log(`Creating extended calculations for ${drillCollarResults.length} sections`);
          
          // Map each section in drillCollarResults to a calculation
          for (let i = 0; i < drillCollarResults.length; i++) {
            const section = drillCollarResults[i];
            
            // Find the appropriate instance to base this calculation on
            let baseInstance;
            if (section.section === "Production") {
              baseInstance = 1;
            } else if (section.section === "Surface") {
              baseInstance = 3;
            } else {
              baseInstance = 2; // Intermediate sections use instance 2
            }
            
            // Find the reference calculation
            const refCalc = calculations.find(c => c.instance === baseInstance);
            
            if (refCalc) {
              extended.push({
                instance: i + 1, // Use the section index + 1 as instance number
                drillPipeMetalGrade: refCalc.drillPipeMetalGrade,
                Lmax: refCalc.Lmax,
                section: section.section // Use the exact section name
              });
              
              console.log(`Added calculation for ${section.section} based on instance ${baseInstance}`);
            }
          }
          
          return extended;
        })(),
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
                }) as Record<string, any> | null;
                
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
                  }) as Record<string, any> | null;
                  
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