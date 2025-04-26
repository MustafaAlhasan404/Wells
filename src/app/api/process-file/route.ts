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
            
            // Add to result data with internal diameter
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
              // First sort the matching rows by external pressure (which should correlate with HAD)
              matchingRows.sort((a, b) => a.externalPressure - b.externalPressure);
              
              // Convert matching rows to HAD data format, but stop once we find a sufficient HAD
              const hadDataList: HADData[] = [];
              let hadSufficient = false;
              
              for (const row of matchingRows) {
                const hadValue = calculateHAD(row.externalPressure, row.metalType);
                const hadData: HADData = {
                  had: hadValue,
                  externalPressure: row.externalPressure,
                  metalType: row.metalType,
                  tensileStrength: row.tensileStrength,
                  unitWeight: row.unitWeight,
                  internalDiameter: row.internalDiameter
                };
                
                // For Surface Section, cap HAD at inputted depth
                if (sectionName === "Surface Section") {
                  hadData.depth = depth;
                  if (hadData.had > depth) {
                    hadData.had = depth;
                  }
                }
                
                hadDataList.push(hadData);
                
                // Check if this HAD is sufficient
                if (hadValue >= depth) {
                  hadSufficient = true;
                  // Set the HAD value equal to the depth
                  hadData.had = depth;
                  hadData.depth = depth;
                  break; // Stop once we find a sufficient HAD
                }
              }
              
              // Sort by HAD in ascending order
              hadDataList.sort((a, b) => a.had - b.had);
              
              // Add to HAD data
              const roundedAtHead = Math.round(atHeadValue * 100) / 100;
              hadData[sectionName][roundedAtHead] = hadDataList;
              
              // Check if HAD is sufficient for depth
              if (!hadSufficient) {
                console.error(`No suitable HAD value found for depth: ${depth} in ${sectionName}`);
                return NextResponse.json({ 
                  error: `No suitable HAD value found for depth: ${depth} in ${sectionName}. Consider using a different metal type or casing size.` 
                }, { status: 400 });
              }
            } else {
              console.error(`No matching rows found for at_head: ${atHeadValue}, metal_type: ${metalType}`);
              return NextResponse.json({ 
                error: `No matching data found for outer diameter: ${atHeadValue} with metal type: ${metalType}. Please check your Excel file data.` 
              }, { status: 400 });
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
    
    // Fix internal diameter display in results - shift internal diameters between sections
    if (resultData.length > 0) {
      // Store the internal diameters
      const internalDiameters = resultData.map(r => r.internalDiameter);
      
      // Set Production (index 0) to "--"
      if (resultData[0]) {
        resultData[0].internalDiameter = "--";
      }
      
      // Shift internal diameters for other sections
      for (let i = 1; i < resultData.length; i++) {
        resultData[i].internalDiameter = internalDiameters[i-1];
      }
    }
    
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