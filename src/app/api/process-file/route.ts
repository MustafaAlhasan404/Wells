import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { 
  findAtBodyValue, 
  extractValuesFromXlsx, 
  findNearestBitSizeAndInternalDiameter,
  findReferenceFromXlsx,
  extractAdditionalInfo
} from '@/utils/fileProcessing';
import { formatMmWithInches, calculateHAD, HADData } from '@/utils/casingCalculations';
import { calculateLValues } from '@/utils/hadCalculations';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Debug function to log Excel file structure
 */
function debugExcelStructure(fileBuffer: ArrayBuffer) {
  try {
    const workbook = XLSX.read(new Uint8Array(fileBuffer), { type: 'array' });
    console.log("Excel workbook sheets:", workbook.SheetNames);
    
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    console.log("Excel structure - First 5 rows:");
    for (let i = 0; i < Math.min(5, data.length); i++) {
      console.log(`Row ${i}:`, data[i]);
    }
    
    // Try to identify potential column headers
    const headerRows = [];
    for (let i = 0; i < Math.min(10, data.length); i++) {
      if (data[i] && data[i].length > 0) {
        const rowAsString = data[i].map(cell => 
          typeof cell === 'string' ? cell.toLowerCase() : 
          cell !== null && cell !== undefined ? String(cell).toLowerCase() : ''
        ).join(' ');
        
        if (rowAsString.includes('bit') || rowAsString.includes('hole') || 
            rowAsString.includes('diameter') || rowAsString.includes('id') ||
            rowAsString.includes('head') || rowAsString.includes('body')) {
          headerRows.push({ rowIndex: i, content: data[i] });
        }
      }
    }
    console.log("Potential header rows:", headerRows);
    
  } catch (error) {
    console.error("Error in debugExcelStructure:", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("API request received: Processing file");
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
    const initialDcsgAmount = formData.get('initialDcsgAmount') as string;
    const iterations = parseInt(formData.get('iterations') as string);
    
    console.log("Request parameters:", { 
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      initialDcsgAmount,
      iterations
    });
    
    if (!file) {
      console.error("Missing file in request");
      return NextResponse.json({ error: 'No file provided. Please upload an Excel file.' }, { status: 400 });
    }

    if (!initialDcsgAmount) {
      console.error("Missing initialDcsgAmount in request");
      return NextResponse.json({ error: 'Missing initial casing outer diameter value' }, { status: 400 });
    }

    if (isNaN(iterations)) {
      console.error("Invalid iterations value in request");
      return NextResponse.json({ error: 'Invalid number of sections. Please provide a valid number.' }, { status: 400 });
    }

    // Extract section inputs
    const sectionInputs = [];
    for (let i = 0; i < iterations; i++) {
      const multiplier = formData.get(`multiplier_${i}`) as string;
      const metalType = formData.get(`metalType_${i}`) as string;
      const depth = formData.get(`depth_${i}`) as string;
      
      if (!multiplier || !metalType || !depth) {
        console.error(`Missing section input for section ${i+1}`, { multiplier, metalType, depth });
        return NextResponse.json({ 
          error: `Missing required input for section ${i+1}. Please provide multiplier, metal type, and depth.` 
        }, { status: 400 });
      }
      
      sectionInputs.push({ multiplier, metalType, depth });
    }

    // Read the file to buffer
    const arrayBuffer = await file.arrayBuffer();
    console.log("File read to buffer, size:", arrayBuffer.byteLength);
    
    // Debug Excel structure
    debugExcelStructure(arrayBuffer);
    
    // Initialize calculation variables
    let dcsgAmount = initialDcsgAmount;
    let atHeadValue: number | null = null;
    const calculatedValues: Array<[number | null, number | null, number | null]> = [];
    let nextDcsg: number | null = null;
    const resultData: any[] = [];
    const hadData: any = {
      "Production Section": {},
      "Intermediate Section": {},
      "Surface Section": {}
    };

    // Determine section names
    let sectionNames: string[] = [];
    if (iterations === 3) {
      sectionNames = ["Production", "Intermediate", "Surface"];
    } else {
      sectionNames = ["Production"];
      for (let i = 0; i < iterations - 2; i++) {
        sectionNames.push(`Intermediate ${i+1}`);
      }
      sectionNames.push("Surface");
    }

    console.log("Starting iteration through sections:", sectionNames);

    // Start iteration through sections
    for (let i = 0; i < iterations; i++) {
      try {
        console.log(`Processing section ${i+1}: ${sectionNames[i]}`);
        const multiplier = parseFloat(sectionInputs[i].multiplier);
        const metalType = sectionInputs[i].metalType;
        const depth = parseFloat(sectionInputs[i].depth);
        
        console.log(`Section ${i+1} inputs:`, { multiplier, metalType, depth });

        // First iteration - extract at_head_value
        if (i === 0) {
          console.log(`Extracting at_head_value for dcsgAmount: ${dcsgAmount}`);
          atHeadValue = await extractValuesFromXlsx(arrayBuffer, dcsgAmount);
          
          if (atHeadValue !== null) {
            console.log(`Got at_head_value: ${atHeadValue}`);
            dcsgAmount = atHeadValue.toString();
          } else {
            console.error(`First iteration - At head value not found for dcsgAmount: ${dcsgAmount}`);
            return NextResponse.json({ 
              error: `Outer diameter (${dcsgAmount}) not found in the Excel file. Please check if this value exists in your data.` 
            }, { status: 400 });
          }
        }

        // Process if at_head_value is valid
        if (atHeadValue !== null) {
          const dbValue = atHeadValue * multiplier;
          console.log(`Calculated db value: ${dbValue} = ${atHeadValue} * ${multiplier}`);
          
          console.log(`Finding nearest bit size and internal diameter for db value: ${dbValue}`);
          const [nearestBitSize, internalDiameter] = await findNearestBitSizeAndInternalDiameter(arrayBuffer, dbValue);
          console.log(`Found values - bit size: ${nearestBitSize}, internal diameter: ${internalDiameter}`);

          if (nearestBitSize !== null && internalDiameter !== null) {
            const sectionName = `${sectionNames[i]} Section`;
            
            // Find at_body_value
            console.log(`Finding at_body_value for dcsgAmount: ${dcsgAmount}`);
            const atBodyValue = await findAtBodyValue(arrayBuffer, parseFloat(dcsgAmount));
            console.log(`Got at_body_value: ${atBodyValue}`);
            
            if (!atBodyValue) {
              console.error(`No at_body_value found for dcsgAmount: ${dcsgAmount}`);
              return NextResponse.json({ 
                error: `No weight/nominal weight found for outer diameter: ${dcsgAmount}. Please check your Excel file.` 
              }, { status: 400 });
            }
            
            // Format values for display
            const formattedBitSize = nearestBitSize !== null ? `${nearestBitSize.toFixed(1)} mm (${formatMmWithInches(nearestBitSize)})` : "-";
            const formattedDcsg = dcsgAmount ? `${dcsgAmount} mm (${formatMmWithInches(parseFloat(dcsgAmount))})` : "-";
            const formattedAtBody = atBodyValue ? `${atBodyValue} mm (${formatMmWithInches(parseFloat(atBodyValue))})` : "-";
            const formattedInternalDiameter = internalDiameter !== null ? `${internalDiameter.toFixed(2)}` : "-";
            
            // Add to result data
            resultData.push({
              section: sectionNames[i],
              nearestBitSize: formattedBitSize,
              dcsg: formattedDcsg,
              atBody: formattedAtBody,
              internalDiameter: formattedInternalDiameter
            });

            // Find reference for next iteration
            console.log(`Finding reference for next iteration with internal diameter: ${internalDiameter}`);
            const [referenceResult, newAtHeadValue] = await findReferenceFromXlsx(arrayBuffer, internalDiameter);
            console.log(`Found next at_head_value: ${newAtHeadValue}`);
            
            nextDcsg = newAtHeadValue;
            
            calculatedValues.push([atHeadValue, dbValue, nearestBitSize]);
            
            // Extract additional info for HAD calculation
            console.log(`Extracting additional info for HAD calculation - at_head: ${atHeadValue}, metal type: ${metalType}`);
            const matchingRows = await extractAdditionalInfo(arrayBuffer, atHeadValue, metalType);
            console.log(`Found ${matchingRows.length} matching rows for HAD calculation`);
            
            // Calculate HAD
            if (matchingRows.length > 0) {
              // Convert matching rows to HAD data format
              const hadDataList: HADData[] = matchingRows.map(row => ({
                had: calculateHAD(row.externalPressure, row.metalType),
                externalPressure: row.externalPressure,
                metalType: row.metalType,
                tensileStrength: row.tensileStrength,
                unitWeight: row.unitWeight
              }));
              
              // Sort by HAD in descending order
              hadDataList.sort((a, b) => b.had - a.had);
              
              // Add to HAD data
              const roundedAtHead = Math.round(atHeadValue * 100) / 100;
              
              // For Surface Section, add depth to each row and cap HAD at inputted depth
              if (sectionName === "Surface Section") {
                // Add depth to each row
                hadDataList.forEach(row => {
                  row.depth = depth;
                  // Cap HAD at depth for Surface Section
                  if (row.had > depth) {
                    row.had = depth;
                  }
                });
              }
              
              hadData[sectionName][roundedAtHead] = hadDataList;
              
              // Check if HAD is sufficient for depth
              const hadSufficient = hadDataList.some(data => data.had >= depth);
              
              if (!hadSufficient) {
                console.error(`No suitable HAD value found for depth: ${depth} in ${sectionName}`);
                return NextResponse.json({ 
                  error: `No suitable HAD value found for depth: ${depth} in ${sectionName}. Consider using a different metal type or casing size.` 
                }, { status: 400 });
              }
              
              // Calculate L values if we have enough data
              if (hadDataList.length >= 1) {
                console.log(`Calculating L values for depth: ${depth} with ${hadDataList.length} rows`);
                const lValues = calculateLValues(hadDataList, depth);
                console.log(`Calculated L values:`, lValues);
                
                // Assign L values to HAD data
                if (hadDataList.length === 1) {
                  hadDataList[0].lValue = lValues.l1;
                } else if (hadDataList.length === 2) {
                  // For 2 rows case, Python assigns l1 to first row and l2 to second row
                  hadDataList[0].lValue = lValues.l1;
                  hadDataList[1].lValue = lValues.l2;
                } else {
                  // For 3+ rows case, Python assigns L values to the last 3 rows (lowest HAD values)
                  const lastIndex = hadDataList.length - 1;
                  
                  // Assign L values to the last 3 rows in order (L1 to third-last, L2 to second-last, L3 to last)
                  if ('l1' in lValues) hadDataList[lastIndex - 2].lValue = lValues.l1;
                  if ('l2' in lValues) hadDataList[lastIndex - 1].lValue = lValues.l2;
                  if ('l3' in lValues) hadDataList[lastIndex].lValue = lValues.l3;
                  
                  // If we have more than 3 rows and l4 value
                  if (hadDataList.length > 3 && 'l4' in lValues) {
                    hadDataList[lastIndex - 3].lValue = lValues.l4;
                  }
                }
              } else {
                console.error(`No matching rows found for at_head: ${atHeadValue}, metal_type: ${metalType}`);
                return NextResponse.json({ 
                  error: `No matching data found for outer diameter: ${atHeadValue} with metal type: ${metalType}. Please check your Excel file data.` 
                }, { status: 400 });
              }
            }
            
            // Prepare for next iteration if not the last
            if (i < iterations - 1) {
              if (newAtHeadValue !== null) {
                atHeadValue = newAtHeadValue;
                dcsgAmount = newAtHeadValue.toString();
                console.log(`Preparing for next iteration with new at_head_value: ${atHeadValue}`);
              } else {
                console.error(`Failed to find new at_head_value for next iteration`);
                return NextResponse.json({ 
                  error: `Could not find a suitable outer diameter for the next section after ${sectionNames[i]}. Please check your Excel file data.` 
                }, { status: 400 });
              }
            }
          } else {
            console.error(`Bit Size or Internal Diameter not found for db value: ${dbValue}`);
            return NextResponse.json({ 
              error: `Bit Size and Internal Diameter columns not found or empty in the Excel file. Please ensure your file contains these columns.` 
            }, { status: 400 });
          }
        } else {
          console.error(`No valid at_head_value found for dcsgAmount: ${dcsgAmount}`);
          return NextResponse.json({ 
            error: `No matching outer diameter value found for ${dcsgAmount}. Please check your Excel file data.` 
          }, { status: 400 });
        }
      } catch (error) {
        console.error(`Error in section ${i+1} (${sectionNames[i]}):`, error);
        return NextResponse.json({ 
          error: `Error in ${sectionNames[i]} section: ${error instanceof Error ? error.message : String(error)}. Please check your inputs and Excel file data.` 
        }, { status: 500 });
      }
    }

    console.log("All sections processed successfully");
    return NextResponse.json({ results: resultData, hadData });
  } catch (error) {
    console.error('Processing error:', error);
    
    let errorMessage = 'An unexpected error occurred while processing your request';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific error cases
      if (errorMessage.includes('XLSX') || errorMessage.includes('workbook')) {
        errorMessage = 'Error parsing Excel file. Please check that the file is a valid Excel (.xlsx) file.';
      } else if (errorMessage.includes('column') || errorMessage.includes('Column')) {
        errorMessage = 'Required columns not found in Excel file. Please ensure the file has the necessary data structure.';
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'This endpoint requires a POST request with file data' });
} 