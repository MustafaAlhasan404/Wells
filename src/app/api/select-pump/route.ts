import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Process the Excel file to find pumps that match or exceed the given Ppmax values
 * and filter by the selected pump diameter.
 */
export async function POST(req: NextRequest) {
  try {
    console.log("API request received: Processing pump selection");
    
    // Parse the form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const ppmaxData = formData.get('ppmax') as string;
    const diameter = parseFloat(formData.get('diameter') as string);
    
    // Parse the ppmax values (multiple instances)
    let ppmaxValues: number[] = [];
    try {
      ppmaxValues = JSON.parse(ppmaxData);
      if (!Array.isArray(ppmaxValues)) {
        ppmaxValues = [parseFloat(ppmaxData)]; // Fallback to single value
      }
    } catch {
      // If parsing fails, try to use it as a single value
      const singleValue = parseFloat(ppmaxData);
      if (!isNaN(singleValue)) {
        ppmaxValues = [singleValue];
      }
    }
    
    console.log("Request parameters:", { 
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      ppmaxValues,
      diameter
    });
    
    if (!file) {
      console.error("Missing file in request");
      return NextResponse.json({ error: 'No file provided. Please upload an Excel file.' }, { status: 400 });
    }

    if (ppmaxValues.length === 0 || ppmaxValues.some(isNaN)) {
      console.error("Missing or invalid Ppmax values in request");
      return NextResponse.json({ error: 'Missing or invalid Ppmax values' }, { status: 400 });
    }

    if (isNaN(diameter) || ![3.5, 4, 4.5].includes(diameter)) {
      console.error("Invalid diameter value in request");
      return NextResponse.json({ error: 'Invalid pump diameter. Please select 3.5, 4, or 4.5.' }, { status: 400 });
    }

    // Read the file to buffer
    const arrayBuffer = await file.arrayBuffer();
    console.log("File read to buffer, size:", arrayBuffer.byteLength);
    
    // Process the Excel file
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];
    
    console.log("Excel data loaded, rows:", data.length);
    
    // Find columns for pressure, type, diameter, etc.
    // Note: These column names are assumptions based on the image mentioned by the user
    // The actual column names might be different
    const columnMap: Record<string, string> = {};
    
    // Try to identify relevant columns in the data
    if (data.length > 0) {
      const firstRow = data[0];
      for (const key in firstRow) {
        const lowerKey = key.toLowerCase();
        
        if (lowerKey.includes('type') || lowerKey.includes('model')) {
          columnMap.type = key;
        } else if (lowerKey.includes('diameter') || lowerKey.includes('size')) {
          columnMap.diameter = key;
        } else if (lowerKey.includes('pressure') || lowerKey.includes('p mpa') || lowerKey.includes('mpa')) {
          columnMap.pressure = key;
        } else if (lowerKey.includes('flow') || lowerKey.includes('rate')) {
          columnMap.flow = key;
        } else if (lowerKey.includes('price') || lowerKey.includes('cost') || lowerKey.includes('value')) {
          columnMap.price = key;
        }
      }
    }
    
    console.log("Identified columns:", columnMap);
    
    // Process each Ppmax value separately
    const allResults: any[] = [];
    
    // For each Ppmax value (instance)
    ppmaxValues.forEach((ppmax, instanceIndex) => {
      // Filter data to find pumps that meet the criteria for this Ppmax
      const matchingPumps = data.filter(pump => {
        // Check if diameter column exists and matches
        if (columnMap.diameter && Math.abs(parseFloat(pump[columnMap.diameter]) - diameter) < 0.1) {
          // Check if pressure column exists and pressure >= ppmax
          if (columnMap.pressure && parseFloat(pump[columnMap.pressure]) >= ppmax) {
            return true;
          }
        }
        return false;
      });
      
      console.log(`Instance ${instanceIndex + 1} (Ppmax=${ppmax}) - Found matching pumps:`, matchingPumps.length);
      
      if (matchingPumps.length > 0) {
        // Sort by price (ascending) to find the cheapest option
        const sortedPumps = [...matchingPumps].sort((a, b) => {
          if (!columnMap.price) return 0;
          return parseFloat(a[columnMap.price]) - parseFloat(b[columnMap.price]);
        });
        
        // Format results for this instance
        const instanceResults = sortedPumps.map((pump, index) => {
          return {
            type: columnMap.type ? pump[columnMap.type] : 'Unknown',
            diameter: columnMap.diameter ? parseFloat(pump[columnMap.diameter]) : diameter,
            pressure: columnMap.pressure ? parseFloat(pump[columnMap.pressure]) : 0,
            flow: columnMap.flow ? parseFloat(pump[columnMap.flow]) : 0,
            price: columnMap.price ? parseFloat(pump[columnMap.price]) : 0,
            isRecommended: index === 0, // Mark the cheapest pump as recommended
            instance: instanceIndex + 1, // Which instance this pump is for (1-based)
            ppmax: ppmax // Store the Ppmax value
          };
        });
        
        // Add results for this instance to overall results
        allResults.push(...instanceResults);
      }
    });
    
    console.log("Total results across all instances:", allResults.length);
    
    if (allResults.length === 0) {
      return NextResponse.json({ 
        results: [], 
        message: 'No matching pumps found for any of the Ppmax values.' 
      });
    }
    
    return NextResponse.json({ 
      results: allResults,
      message: `Found ${allResults.length} pump${allResults.length > 1 ? 's' : ''} that match your criteria across all instances.` 
    });
  } catch (error) {
    console.error("Error in pump selection API:", error);
    return NextResponse.json({ 
      error: 'An error occurred while processing the pump selection.' 
    }, { status: 500 });
  }
} 