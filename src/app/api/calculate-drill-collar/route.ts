import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { 
  readDrillCollarData, 
  calculateDrillCollar, 
  calculateDrillCollarData 
} from '@/utils/drillCollarCalculations';

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
      
      // Return the results
      return NextResponse.json({
        drillCollarResults,
        calculations,
        drillCollarData: {
          production: drillCollarProduction,
          intermediate: drillCollarIntermediate,
          surface: drillCollarSurface
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