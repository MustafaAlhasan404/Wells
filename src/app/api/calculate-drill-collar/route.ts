import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log('Drill collar data parsed:', jsonData.length, 'rows');

    // Process the data to calculate drill collar results
    // This is where you'd implement the Python logic
    
    // Example calculation - replace with actual logic from Python app
    const calculations = [
      { id: 1, metalGrade: 'E 75', lmax: 4281.83 },
      { id: 2, metalGrade: 'E 75', lmax: 4092.66 },
      { id: 3, metalGrade: 'X 95', lmax: 5603.78 }
    ];

    const results = [
      { section: 'Production', atHead: 177.8, nearestBitSize: 215.90, drillCollars: '139.70 mm' },
      { section: 'Intermediate', atHead: 194.5, nearestBitSize: 314.33, drillCollars: '76.20 mm' },
      { section: 'Surface', atHead: 269.9, nearestBitSize: 476.25, drillCollars: '73.00 mm' }
    ];

    // Add actual calculation logic here based on Python implementation

    return NextResponse.json({ calculations, results });
  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    );
  }
} 