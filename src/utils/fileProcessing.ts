/**
 * Utility functions for processing Excel and Word files
 * Ported from casing.py to maintain exact functionality
 */
import * as XLSX from 'xlsx';
import { AdditionalInfo } from './casingCalculations';

/**
 * Find the at_body value for a given at_head value
 * @param fileBuffer Binary data of the Excel file
 * @param atHeadValue The at_head value to match
 * @returns The corresponding at_body value, or null if not found
 */
export async function findAtBodyValue(
  fileBuffer: ArrayBuffer, 
  atHeadValue: number
): Promise<string | null> {
  try {
    console.log(`Finding at_body value for at_head: ${atHeadValue}`);
    const workbook = XLSX.read(new Uint8Array(fileBuffer), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // First try direct cell exploration to match Python's behavior
    try {
      console.log("Attempting direct cell exploration for at_head/at_body columns");
      
      // These are common column positions in standard templates
      const potentialAtHeadColumns = ["A", "B", "C", "D"];
      const potentialAtBodyColumns = ["B", "C", "D", "E", "F"];
      
      let atHeadColLetter = "";
      let atBodyColLetter = "";
      
      // Check first 15 rows for headers
      for (let row = 1; row <= 15; row++) {
        // Look for at_head column
        for (const col of potentialAtHeadColumns) {
          const cellRef = `${col}${row}`;
          const cell = sheet[cellRef];
          
          if (cell && cell.v) {
            const cellValue = typeof cell.v === 'string' ? cell.v.toLowerCase() : String(cell.v).toLowerCase();
            console.log(`Checking cell ${cellRef} for at_head: "${cellValue}"`);
            
            if (cellValue.includes('at head') || cellValue.includes('od') || 
                cellValue.includes('outside diameter') || cellValue.includes('outer diameter')) {
              atHeadColLetter = col;
              console.log(`Found at_head column at ${cellRef}: "${cellValue}"`);
              break;
            }
          }
        }
        
        // Look for at_body column
        for (const col of potentialAtBodyColumns) {
          const cellRef = `${col}${row}`;
          const cell = sheet[cellRef];
          
          if (cell && cell.v) {
            const cellValue = typeof cell.v === 'string' ? cell.v.toLowerCase() : String(cell.v).toLowerCase();
            console.log(`Checking cell ${cellRef} for at_body: "${cellValue}"`);
            
            if (cellValue.includes('at body') || cellValue.includes('weight') || 
                cellValue.includes('nominal') || cellValue.includes('lb/ft')) {
              atBodyColLetter = col;
              console.log(`Found at_body column at ${cellRef}: "${cellValue}"`);
              break;
            }
          }
        }
        
        if (atHeadColLetter && atBodyColLetter) {
          // Found both columns, now search for matching at_head value
          console.log(`Found columns via direct cell access - at_head: ${atHeadColLetter}, at_body: ${atBodyColLetter}`);
          
          // Start from the row after header and look for matching at_head value
          for (let dataRow = row + 1; dataRow <= 1000; dataRow++) {
            const atHeadCell = sheet[`${atHeadColLetter}${dataRow}`];
            
            if (!atHeadCell) {
              // Likely reached end of data
              if (dataRow > row + 20) break;
              continue;
            }
            
            let rowAtHead: number | null = null;
            
            // Extract at_head value
            if (atHeadCell.v !== undefined && atHeadCell.v !== null) {
              if (typeof atHeadCell.v === 'number') {
                rowAtHead = atHeadCell.v;
              } else {
                // Try to extract numeric value from string
                const numStr = String(atHeadCell.v).replace(/[^\d.]/g, '');
                if (numStr) {
                  rowAtHead = parseFloat(numStr);
                }
              }
            }
            
            // Check if this row matches our target at_head value with a more generous tolerance
            if (rowAtHead !== null && !isNaN(rowAtHead) && Math.abs(rowAtHead - atHeadValue) < 0.1) {
              console.log(`Found matching at_head value ${rowAtHead} at row ${dataRow}`);
              
              // Get corresponding at_body value
              const atBodyCell = sheet[`${atBodyColLetter}${dataRow}`];
              
              if (atBodyCell && atBodyCell.v !== undefined && atBodyCell.v !== null) {
                let atBodyValue = String(atBodyCell.v);
                
                // Clean up the at_body value if needed
                if (atBodyValue.includes(' ')) {
                  atBodyValue = atBodyValue.split(' ').pop() || atBodyValue;
                }
                
                console.log(`Found at_body value: "${atBodyValue}" for at_head: ${rowAtHead}`);
                return atBodyValue;
              }
            }
          }
        }
      }
    } catch (directCellError) {
      console.error("Error in direct cell exploration for at_head/at_body:", directCellError);
    }
    
    // Fall back to the original method with enhanced flexibility
    console.log("Falling back to enhanced column detection method for at_head/at_body");
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    // Log the first few rows to help with debugging
    console.log("First 5 rows of data:");
    for (let i = 0; i < Math.min(5, data.length); i++) {
      console.log(`Row ${i}:`, data[i]);
    }
    
    let atHeadCol = -1;
    let atBodyCol = -1;
    
    // Expanded variations for column names
    const atHeadVariations = [
      'at head', 'athead', 'at_head', 'at-head', 'at.head',
      'od', 'o.d.', 'o d', 'outside diameter', 'outer diameter', 
      'outside dia', 'outer dia', 'od (mm)', 'outside diameter (mm)',
      // Add case variations
      'At Head', 'At head', 'AT HEAD', 'OD', 'O.D.', 'Outside Diameter',
      // Add exact matches from Python
      'At head', 'at head'
    ];
    
    const atBodyVariations = [
      'at body', 'atbody', 'at_body', 'at-body', 'at.body',
      'nominal weight', 'weight', 'weight (lb/ft)', 'weight (lbs/ft)',
      'nominal', 'body weight', 'unit weight', 'lb/ft', 'lbs/ft',
      // Add case variations
      'At Body', 'At body', 'AT BODY', 'Weight', 'WEIGHT', 'Nominal Weight',
      // Add exact matches from Python
      'At body', 'at body'
    ];
    
    console.log("Searching for at_head and at_body columns with expanded variations");
    
    // First try exact matches
    for (let rowIdx = 0; rowIdx < Math.min(15, data.length); rowIdx++) {
      const row = data[rowIdx];
      if (!row) continue;
      
      console.log(`Examining row ${rowIdx} for at_head/at_body headers:`, row);
      
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        if (row[colIdx] === undefined || row[colIdx] === null) continue;
        
        const cellValue = typeof row[colIdx] === 'string' 
          ? row[colIdx].trim() 
          : String(row[colIdx]).trim();
        
        // Check for exact matches
        if (atHeadCol === -1 && atHeadVariations.includes(cellValue.toLowerCase())) {
          atHeadCol = colIdx;
          console.log(`Found exact match for at_head column at index ${colIdx}: "${cellValue}"`);
        }
        
        if (atBodyCol === -1 && atBodyVariations.includes(cellValue.toLowerCase())) {
          atBodyCol = colIdx;
          console.log(`Found exact match for at_body column at index ${colIdx}: "${cellValue}"`);
        }
      }
      
      if (atHeadCol !== -1 && atBodyCol !== -1) break;
    }
    
    // If exact matches didn't work, try partial matching
    if (atHeadCol === -1 || atBodyCol === -1) {
      for (let rowIdx = 0; rowIdx < Math.min(15, data.length); rowIdx++) {
        const row = data[rowIdx];
        if (!row) continue;
        
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
          if (row[colIdx] === undefined || row[colIdx] === null) continue;
          
          const cellValue = typeof row[colIdx] === 'string' 
            ? row[colIdx].trim().toLowerCase() 
            : String(row[colIdx]).trim().toLowerCase();
          
          // Check for partial matches
          if (atHeadCol === -1) {
            if (atHeadVariations.some(v => cellValue.includes(v))) {
              atHeadCol = colIdx;
              console.log(`Found partial match for at_head column at index ${colIdx}: "${cellValue}"`);
            }
          }
          
          if (atBodyCol === -1) {
            if (atBodyVariations.some(v => cellValue.includes(v))) {
              atBodyCol = colIdx;
              console.log(`Found partial match for at_body column at index ${colIdx}: "${cellValue}"`);
            }
          }
        }
        
        if (atHeadCol !== -1 && atBodyCol !== -1) break;
      }
    }
    
    // Last resort: try to infer columns by position
    if (atHeadCol === -1 || atBodyCol === -1) {
      console.log("Trying to infer at_head/at_body columns by position");
      
      // In many templates, at_head is column 0 or 1, and at_body is column 1 or 2
      if (data.length > 0 && data[0].length >= 3) {
        if (atHeadCol === -1) {
          atHeadCol = 0;  // First column is often at_head/OD
          console.log("Inferring at_head column as the first column (index 0)");
        }
        
        if (atBodyCol === -1) {
          atBodyCol = 1;  // Second column is often at_body/weight
          console.log("Inferring at_body column as the second column (index 1)");
        }
      }
    }
    
    if (atHeadCol === -1 || atBodyCol === -1) {
      console.error("Could not find required columns for at_head/at_body:", { 
        atHeadFound: atHeadCol !== -1, 
        atBodyFound: atBodyCol !== -1,
        atHeadVariations,
        atBodyVariations
      });
      return null;
    }
    
    console.log(`Found columns - at_head at index ${atHeadCol}, at_body at index ${atBodyCol}`);
    
    // Search for matching at_head value with increased tolerance
    const TOLERANCE = 0.5;  // Increased tolerance to match more flexibly
    
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row || row.length <= Math.max(atHeadCol, atBodyCol)) continue;
      
      try {
        let rowAtHead: number | null = null;
        
        // Extract at_head value with more flexible parsing
        if (row[atHeadCol] !== undefined && row[atHeadCol] !== null) {
          if (typeof row[atHeadCol] === 'number') {
            rowAtHead = row[atHeadCol];
          } else {
            // Try to extract numeric value from string
            const atHeadStr = String(row[atHeadCol]).trim().replace(/[^\d.]/g, '');
            if (atHeadStr) {
              rowAtHead = parseFloat(atHeadStr);
            }
          }
        }
        
        if (rowAtHead !== null && !isNaN(rowAtHead)) {
          console.log(`Checking row ${rowIdx} with at_head value: ${rowAtHead} (target: ${atHeadValue})`);
          
          // Check with increased tolerance
          if (Math.abs(rowAtHead - atHeadValue) < TOLERANCE) {
            console.log(`Found matching at_head value ${rowAtHead} with tolerance ${TOLERANCE}`);
            
            // Get at_body value
            let atBodyValue: string;
            
            if (row[atBodyCol] !== undefined && row[atBodyCol] !== null) {
              atBodyValue = String(row[atBodyCol]);
              
              // Clean up the at_body value if needed
              if (atBodyValue.includes(' ')) {
                atBodyValue = atBodyValue.split(' ').pop() || atBodyValue;
              }
              
              console.log(`Found at_body value: "${atBodyValue}" for at_head: ${rowAtHead}`);
              return atBodyValue;
            }
          }
        }
      } catch (e) {
        console.error(`Error parsing row ${rowIdx}:`, e);
        continue;
      }
    }
    
    // If we still haven't found a match, try a more aggressive approach
    console.log("No exact match found, trying more aggressive matching");
    
    // Try to find the closest match instead of an exact match
    let closestRow = -1;
    let minDiff = Number.MAX_VALUE;
    
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row || row.length <= Math.max(atHeadCol, atBodyCol)) continue;
      
      try {
        let rowAtHead: number | null = null;
        
        // Extract at_head value
        if (row[atHeadCol] !== undefined && row[atHeadCol] !== null) {
          if (typeof row[atHeadCol] === 'number') {
            rowAtHead = row[atHeadCol];
          } else {
            const atHeadStr = String(row[atHeadCol]).trim().replace(/[^\d.]/g, '');
            if (atHeadStr) {
              rowAtHead = parseFloat(atHeadStr);
            }
          }
        }
        
        if (rowAtHead !== null && !isNaN(rowAtHead)) {
          const diff = Math.abs(rowAtHead - atHeadValue);
          
          if (diff < minDiff) {
            minDiff = diff;
            closestRow = rowIdx;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // If we found a closest match, use it
    if (closestRow !== -1 && minDiff < 10) {  // Allow up to 10mm difference as last resort
      const row = data[closestRow];
      const rowAtHead = typeof row[atHeadCol] === 'number' 
        ? row[atHeadCol] 
        : parseFloat(String(row[atHeadCol]).replace(/[^\d.]/g, ''));
      
      console.log(`Using closest match: at_head ${rowAtHead} with difference ${minDiff}`);
      
      let atBodyValue = String(row[atBodyCol] || '');
      if (atBodyValue.includes(' ')) {
        atBodyValue = atBodyValue.split(' ').pop() || atBodyValue;
      }
      
      console.log(`Found closest at_body value: "${atBodyValue}" for at_head: ${rowAtHead}`);
      return atBodyValue;
    }
    
    console.log(`No matching or close at_body value found for at_head value: ${atHeadValue}`);
    return null;
  } catch (error) {
    console.error('Error finding at_body value:', error);
    return null;
  }
}

/**
 * Extract at_head value from Excel file for a given DCSG amount
 * @param fileBuffer Binary data of the Excel file
 * @param dcsgAmount The DCSG amount to match
 * @returns The corresponding at_head value, or null if not found
 */
export async function extractValuesFromXlsx(
  fileBuffer: ArrayBuffer, 
  dcsgAmount: string
): Promise<number | null> {
  try {
    const workbook = XLSX.read(new Uint8Array(fileBuffer), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    let atHeadCol = -1;
    let atBodyCol = -1;
    
    // Find 'At head' and 'At body' columns
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row) continue;
      
      const rowText = row.map(cell => typeof cell === 'string' ? cell.trim() : String(cell).trim());
      
      if (rowText.includes('At head')) {
        atHeadCol = rowText.indexOf('At head');
      }
      if (rowText.includes('At body')) {
        atBodyCol = rowText.indexOf('At body');
      }
      
      if (atHeadCol !== -1 && atBodyCol !== -1) {
        // Search for matching at_body value in subsequent rows
        for (let dataRowIdx = rowIdx + 1; dataRowIdx < data.length; dataRowIdx++) {
          const dataRow = data[dataRowIdx];
          if (!dataRow || dataRow.length <= Math.max(atHeadCol, atBodyCol)) continue;
          
          if (String(dataRow[atBodyCol]).trim() === dcsgAmount) {
            try {
              const atHeadValue = parseFloat(dataRow[atHeadCol]);
              return atHeadValue;
            } catch (e) {
              continue;
            }
          }
        }
        break;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting values from XLSX:', error);
    return null;
  }
}

/**
 * Find the nearest bit size and internal diameter
 * @param fileBuffer Binary data of the Excel file
 * @param bitSize The bit size to match
 * @returns A tuple of [nearestBitSize, internalDiameter] or null if not found
 */
export async function findNearestBitSizeAndInternalDiameter(
  fileBuffer: ArrayBuffer, 
  bitSize: number
): Promise<[number | null, number | null]> {
  try {
    console.log(`Processing file for bit size ${bitSize}`);
    const workbook = XLSX.read(new Uint8Array(fileBuffer), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // First try direct cell exploration to match Python's behavior
    // This method directly accesses cells by reference rather than using sheet_to_json
    // which more closely matches the Python openpyxl access pattern
    try {
      console.log("Attempting direct cell exploration for column detection");
      
      // These are common column positions in standard templates
      const potentialBitSizeColumns = ["C", "D", "E", "F"];
      const potentialIdColumns = ["G", "H", "I", "J"];
      
      let bitSizeColLetter = "";
      let idColLetter = "";
      
      // Check first 10 rows for headers
      for (let row = 1; row <= 10; row++) {
        // Look for bit size column
        for (const col of potentialBitSizeColumns) {
          const cellRef = `${col}${row}`;
          const cell = sheet[cellRef];
          
          if (cell && cell.v) {
            const cellValue = typeof cell.v === 'string' ? cell.v.toLowerCase() : String(cell.v).toLowerCase();
            console.log(`Checking cell ${cellRef}: "${cellValue}"`);
            
            if (cellValue.includes('bit') || cellValue.includes('hole') || cellValue.includes('size') || cellValue.includes('diameter')) {
              bitSizeColLetter = col;
              console.log(`Found bit size column at ${cellRef}: "${cellValue}"`);
              break;
            }
          }
        }
        
        // Look for ID column
        for (const col of potentialIdColumns) {
          const cellRef = `${col}${row}`;
          const cell = sheet[cellRef];
          
          if (cell && cell.v) {
            const cellValue = typeof cell.v === 'string' ? cell.v.toLowerCase() : String(cell.v).toLowerCase();
            console.log(`Checking cell ${cellRef}: "${cellValue}"`);
            
            if (cellValue.includes('id') || cellValue.includes('internal') || cellValue.includes('inside') || cellValue.includes('diameter')) {
              idColLetter = col;
              console.log(`Found ID column at ${cellRef}: "${cellValue}"`);
              break;
            }
          }
        }
        
        if (bitSizeColLetter && idColLetter) {
          // Found both columns, extract data
          console.log(`Found columns via direct cell access - Bit Size: ${bitSizeColLetter}, ID: ${idColLetter}`);
          
          // Collect values
          const bitSizes: number[] = [];
          const internalDiameters: number[] = [];
          
          // Start from the row after header and look for values
          for (let dataRow = row + 1; dataRow <= 1000; dataRow++) {
            const bitSizeCell = sheet[`${bitSizeColLetter}${dataRow}`];
            const idCell = sheet[`${idColLetter}${dataRow}`];
            
            if (!bitSizeCell && !idCell) {
              // Likely reached end of data
              if (dataRow > row + 10) break;
              continue;
            }
            
            let bitSizeValue: number | null = null;
            let idValue: number | null = null;
            
            // Extract bit size
            if (bitSizeCell && bitSizeCell.v !== undefined && bitSizeCell.v !== null) {
              if (typeof bitSizeCell.v === 'number') {
                bitSizeValue = bitSizeCell.v;
              } else {
                // Try to extract numeric value from string
                const numStr = String(bitSizeCell.v).replace(/[^\d.]/g, '');
                if (numStr) {
                  bitSizeValue = parseFloat(numStr);
                }
              }
            }
            
            // Extract ID
            if (idCell && idCell.v !== undefined && idCell.v !== null) {
              if (typeof idCell.v === 'number') {
                idValue = idCell.v;
              } else {
                // Try to extract numeric value from string
                const numStr = String(idCell.v).replace(/[^\d.]/g, '');
                if (numStr) {
                  idValue = parseFloat(numStr);
                }
              }
            }
            
            if (bitSizeValue !== null && !isNaN(bitSizeValue) &&
                idValue !== null && !isNaN(idValue)) {
              bitSizes.push(bitSizeValue);
              internalDiameters.push(idValue);
              console.log(`Found pair at row ${dataRow}: Bit Size = ${bitSizeValue}, ID = ${idValue}`);
            }
          }
          
          if (bitSizes.length > 0) {
            // Find nearest bit size
            let nearestIndex = 0;
            let minDiff = Math.abs(bitSizes[0] - bitSize);
            
            for (let i = 1; i < bitSizes.length; i++) {
              const diff = Math.abs(bitSizes[i] - bitSize);
              if (diff < minDiff) {
                minDiff = diff;
                nearestIndex = i;
              }
            }
            
            console.log(`Direct cell method found nearest match: ${bitSizes[nearestIndex]} with ID: ${internalDiameters[nearestIndex]}`);
            return [bitSizes[nearestIndex], internalDiameters[nearestIndex]];
          }
        }
      }
    } catch (directCellError) {
      console.error("Error in direct cell exploration:", directCellError);
      // Continue to the original method if direct cell method fails
    }
    
    // Fall back to the original method if direct cell exploration didn't work
    console.log("Falling back to original column detection method");
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    let bitSizeCol = -1;
    let internalDiameterCol = -1;
    
    // Define various possible column names - expanded with more variations
    const bitSizeVariations = [
      'bit size', 'bit_size', 'bitsize', 'hole size', 'hole_size', 'holesize', 
      'bit diameter', 'bit_diameter', 'hole diameter', 'hole_diameter', 'diameter',
      'bit', 'hole', 'size', 'h size', 'h. size', 'b. size', 'b size',
      // Try exact matches from Python version
      'Bit Size', 'Hole Size', 'bit size', 'hole size',
      // Add uppercase variations
      'BIT SIZE', 'HOLE SIZE', 'DIAMETER',
      // Add variations without spaces
      'bitsize', 'holesize',
      // Add variations with different separators
      'bit-size', 'hole-size', 'bit.size', 'hole.size'
    ];
    
    const internalDiameterVariations = [
      'internal diameter', 'internal_diameter', 'internaldiameter', 
      'inner diameter', 'inner_diameter', 'innerdiameter',
      'int diameter', 'int_diameter', 'intdiameter', 
      'int dia', 'int_dia', 'intdia', 'id', 'i.d.', 'i d', 'i. d.',
      // Try exact matches from Python version
      'Internal Diameter', 'ID', 'internal diameter', 'id',
      // Add uppercase variations
      'INTERNAL DIAMETER', 'ID', 'INNER DIAMETER',
      // Add variations without spaces
      'internaldiameter', 'innerdiameter',
      // Add variations with different separators
      'internal-diameter', 'inner-diameter', 'internal.diameter', 'inner.diameter'
    ];
    
    console.log("Searching for bit size and internal diameter columns");
    
    // Enhanced exact match first - check for exact matches before using includes
    for (let rowIdx = 0; rowIdx < Math.min(10, data.length); rowIdx++) {
      const row = data[rowIdx];
      if (!row) continue;
      
      console.log(`Examining row ${rowIdx} for headers:`, row);
      
      // Try exact matches first
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        let cellValue = '';
        
        if (row[colIdx] !== null && row[colIdx] !== undefined) {
          cellValue = typeof row[colIdx] === 'string' 
            ? row[colIdx].trim().toLowerCase() 
            : String(row[colIdx]).trim().toLowerCase();
        } else {
          continue;
        }
        
        // Check for exact matches first
        if (bitSizeCol === -1) {
          if (bitSizeVariations.includes(cellValue)) {
            bitSizeCol = colIdx;
            console.log(`Found exact match for bit size column at index ${colIdx} with value: "${cellValue}"`);
          }
        }
        
        if (internalDiameterCol === -1) {
          if (internalDiameterVariations.includes(cellValue)) {
            internalDiameterCol = colIdx;
            console.log(`Found exact match for internal diameter column at index ${colIdx} with value: "${cellValue}"`);
          }
        }
      }
      
      if (bitSizeCol !== -1 && internalDiameterCol !== -1) {
        break;
      }
    }
    
    // Fall back to partial matching if exact matches didn't work
    if (bitSizeCol === -1 || internalDiameterCol === -1) {
      for (let rowIdx = 0; rowIdx < Math.min(10, data.length); rowIdx++) {
        const row = data[rowIdx];
        if (!row) continue;
        
        // Convert row data to lowercase strings for easier comparison
        const rowText = row.map(cell => 
          typeof cell === 'string' ? cell.trim().toLowerCase() : 
          cell ? String(cell).trim().toLowerCase() : ''
        );
        
        // Check each cell in the row for matching column names
        for (let colIdx = 0; colIdx < rowText.length; colIdx++) {
          const cellValue = rowText[colIdx];
          
          if (bitSizeCol === -1) {
            // First check if it contains "bit" or "hole"
            if (cellValue.includes('bit') || cellValue.includes('hole')) {
              bitSizeCol = colIdx;
              console.log(`Found bit size column at index ${colIdx} with value: "${cellValue}"`);
            }
            // Then check for other variations
            else if (bitSizeVariations.some(variation => cellValue.includes(variation))) {
              bitSizeCol = colIdx;
              console.log(`Found bit size variation at index ${colIdx} with value: "${cellValue}"`);
            }
          }
          
          if (internalDiameterCol === -1) {
            // First check if it contains "id" as a stand-alone term
            if (cellValue === 'id' || cellValue.includes(' id ') || cellValue.includes('i.d') || 
                cellValue.startsWith('id ') || cellValue.endsWith(' id')) {
              internalDiameterCol = colIdx;
              console.log(`Found ID column at index ${colIdx} with value: "${cellValue}"`);
            }
            // Then check for internal diameter
            else if (cellValue.includes('internal') && cellValue.includes('diameter')) {
              internalDiameterCol = colIdx;
              console.log(`Found internal diameter column at index ${colIdx} with value: "${cellValue}"`);
            }
            // Finally check other variations
            else if (internalDiameterVariations.some(variation => cellValue.includes(variation))) {
              internalDiameterCol = colIdx;
              console.log(`Found ID variation at index ${colIdx} with value: "${cellValue}"`);
            }
          }
        }
        
        if (bitSizeCol !== -1 && internalDiameterCol !== -1) {
          break;
        }
      }
    }
    
    // Special handling for formatted Excel files - check column positions
    if (bitSizeCol === -1 || internalDiameterCol === -1) {
      console.log("Trying to determine columns by common positions");
      
      if (data.length > 5) {
        // In many templates, bit size might be in column 3-5 and ID in column 6-8
        const potentialRows = data.slice(0, 5);
        
        for (const row of potentialRows) {
          if (row && row.length >= 8) {
            // Check for potential bit size column
            if (bitSizeCol === -1) {
              for (let i = 2; i <= 5; i++) {
                if (i < row.length && row[i] !== null && row[i] !== undefined) {
                  const cellValue = typeof row[i] === 'string' ? row[i].toLowerCase() : String(row[i]).toLowerCase();
                  
                  if (cellValue.includes('size') || cellValue.includes('diameter') || 
                      cellValue.includes('hole') || cellValue.includes('bit')) {
                    bitSizeCol = i;
                    console.log(`Found likely bit size column at position ${i} with value: "${cellValue}"`);
                    break;
                  }
                }
              }
            }
            
            // Check for potential internal diameter column
            if (internalDiameterCol === -1) {
              for (let i = 5; i <= 8; i++) {
                if (i < row.length && row[i] !== null && row[i] !== undefined) {
                  const cellValue = typeof row[i] === 'string' ? row[i].toLowerCase() : String(row[i]).toLowerCase();
                  
                  if (cellValue.includes('id') || cellValue.includes('internal') || 
                      cellValue.includes('inner') || cellValue.includes('inside')) {
                    internalDiameterCol = i;
                    console.log(`Found likely internal diameter column at position ${i} with value: "${cellValue}"`);
                    break;
                  }
                }
              }
            }
            
            if (bitSizeCol !== -1 && internalDiameterCol !== -1) {
              break;
            }
          }
        }
      }
    }
    
    // Last resort: if we have more than 6 columns, try to use columns 3 and 6 
    // These are common positions in standard templates
    if ((bitSizeCol === -1 || internalDiameterCol === -1) && data.length > 0) {
      const firstDataRow = data.find(row => row && row.length > 6);
      if (firstDataRow) {
        if (bitSizeCol === -1) {
          bitSizeCol = 3; // Common position for bit size
          console.log(`Last resort: Using column 3 for bit size`);
        }
        
        if (internalDiameterCol === -1) {
          internalDiameterCol = 6; // Common position for internal diameter
          console.log(`Last resort: Using column 6 for internal diameter`);
        }
      }
    }
    
    if (bitSizeCol === -1 || internalDiameterCol === -1) {
      console.error("Required columns not found after all attempts:", {
        bitSizeFound: bitSizeCol !== -1,
        internalDiameterFound: internalDiameterCol !== -1,
        bitSizeVariations,
        internalDiameterVariations
      });
      return [null, null];
    }
    
    console.log(`Found columns - Bit Size at index ${bitSizeCol}, Internal Diameter at index ${internalDiameterCol}`);
    
    // Extract values from the columns with enhanced numeric parsing
    let bitSizes: number[] = [];
    let internalDiameters: number[] = [];
    
    for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row || row.length <= Math.max(bitSizeCol, internalDiameterCol)) continue;
      
      let rowBitSize: number | null = null;
      let rowInternalDiameter: number | null = null;
      
      // Extract bit size
      if (row[bitSizeCol] !== undefined && row[bitSizeCol] !== null) {
        let value = row[bitSizeCol];
        
        // Handle various data formats
        if (typeof value === 'number') {
          rowBitSize = value;
        } else if (typeof value === 'string') {
          // Remove any non-numeric characters except decimal point
          const numStr = value.replace(/[^\d.]/g, '');
          if (numStr) {
            rowBitSize = parseFloat(numStr);
          }
        }
      }
      
      // Extract internal diameter
      if (row[internalDiameterCol] !== undefined && row[internalDiameterCol] !== null) {
        let value = row[internalDiameterCol];
        
        // Handle various data formats
        if (typeof value === 'number') {
          rowInternalDiameter = value;
        } else if (typeof value === 'string') {
          // Remove any non-numeric characters except decimal point
          const numStr = value.replace(/[^\d.]/g, '');
          if (numStr) {
            rowInternalDiameter = parseFloat(numStr);
          }
        }
      }
      
      if (rowBitSize !== null && !isNaN(rowBitSize) && 
          rowInternalDiameter !== null && !isNaN(rowInternalDiameter)) {
        bitSizes.push(rowBitSize);
        internalDiameters.push(rowInternalDiameter);
      }
    }
    
    console.log(`Extracted ${bitSizes.length} valid bit size/internal diameter pairs`);
    
    if (bitSizes.length === 0) {
      console.error("No valid bit size/internal diameter pairs found in the file");
      return [null, null];
    }
    
    // Find the nearest bit size
    let nearestIndex = 0;
    let minDiff = Math.abs(bitSizes[0] - bitSize);
    
    for (let i = 1; i < bitSizes.length; i++) {
      const diff = Math.abs(bitSizes[i] - bitSize);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIndex = i;
      }
    }
    
    console.log(`Found nearest bit size match: ${bitSizes[nearestIndex]} with internal diameter: ${internalDiameters[nearestIndex]}`);
    
    return [bitSizes[nearestIndex], internalDiameters[nearestIndex]];
  } catch (error) {
    console.error('Error finding nearest bit size and internal diameter:', error);
    return [null, null];
  }
}

/**
 * Find reference from Excel file for internal diameter
 * @param fileBuffer Binary data of the Excel file
 * @param internalDiameterValue The internal diameter value to match
 * @returns Tuple of [reference string, at_head value], or [string, null] if not found
 */
export async function findReferenceFromXlsx(
  fileBuffer: ArrayBuffer, 
  internalDiameterValue: number
): Promise<[string, number | null]> {
  try {
    const workbook = XLSX.read(new Uint8Array(fileBuffer), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    let atHeadCol = -1;
    let internalDiameterCol = -1;
    
    // Find column indexes
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row) continue;
      
      const rowText = row.map(cell => typeof cell === 'string' ? cell.trim().toLowerCase() : String(cell).trim().toLowerCase());
      
      if (rowText.includes('at head')) {
        atHeadCol = rowText.indexOf('at head');
      }
      if (rowText.includes('internal diameter')) {
        internalDiameterCol = rowText.indexOf('internal diameter');
      }
      
      if (atHeadCol !== -1 && internalDiameterCol !== -1) {
        break;
      }
    }
    
    if (atHeadCol === -1 || internalDiameterCol === -1) {
      return [`Internal Diameter: ${internalDiameterValue}, At head: Columns not found`, null];
    }
    
    // Search for matching internal diameter
    for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row || row.length <= Math.max(atHeadCol, internalDiameterCol)) continue;
      
      try {
        const rowInternalDiameter = parseFloat(row[internalDiameterCol]);
        
        if (Math.abs(rowInternalDiameter - internalDiameterValue) < 0.01) {
          const atHeadValue = parseFloat(row[atHeadCol]);
          const result = `Internal Diameter: ${rowInternalDiameter}, At head (Dcsg): ${atHeadValue}`;
          return [result, atHeadValue];
        }
      } catch (e) {
        continue;
      }
    }
    
    return [`Internal Diameter: ${internalDiameterValue}, At head: Not found`, null];
  } catch (error) {
    console.error('Error finding reference:', error);
    return [`Internal Diameter: ${internalDiameterValue}, At head: Error`, null];
  }
}

/**
 * Extract additional information from Excel file
 * @param fileBuffer Binary data of the Excel file
 * @param atHeadValue The at_head value to match
 * @param metalType The metal type to match
 * @returns Array of additional info objects, or empty array if none found
 */
export async function extractAdditionalInfo(
  fileBuffer: ArrayBuffer, 
  atHeadValue: number, 
  metalType: string
): Promise<AdditionalInfo[]> {
  try {
    const workbook = XLSX.read(new Uint8Array(fileBuffer), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    let atHeadCol = -1;
    let externalPressureCol = -1;
    let metalTypeCol = -1;
    let tensileStrengthCol = -1;
    let unitWeightCol = -1;
    let internalDiameterCol = -1;
    
    // Find column indexes
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row) continue;
      
      const rowText = row.map(cell => typeof cell === 'string' ? cell.trim().toLowerCase() : String(cell).trim().toLowerCase());
      
      if (rowText.includes('at head')) {
        atHeadCol = rowText.indexOf('at head');
      }
      if (rowText.includes('external pressure mpa')) {
        externalPressureCol = rowText.indexOf('external pressure mpa');
      }
      if (rowText.includes('metal type')) {
        metalTypeCol = rowText.indexOf('metal type');
      }
      if (rowText.includes('tensile strength at body tonf')) {
        tensileStrengthCol = rowText.indexOf('tensile strength at body tonf');
      }
      if (rowText.includes('unit weight length lbs/ft')) {
        unitWeightCol = rowText.indexOf('unit weight length lbs/ft');
      }
      if (rowText.includes('internal diameter')) {
        internalDiameterCol = rowText.indexOf('internal diameter');
      }
      
      if (atHeadCol !== -1 && externalPressureCol !== -1 && metalTypeCol !== -1 && tensileStrengthCol !== -1 && unitWeightCol !== -1 && internalDiameterCol !== -1) {
        break;
      }
    }
    
    if (atHeadCol === -1 || externalPressureCol === -1 || metalTypeCol === -1 || tensileStrengthCol === -1 || unitWeightCol === -1 || internalDiameterCol === -1) {
      return [];
    }
    
    // Find matching rows
    const matchingRows: AdditionalInfo[] = [];
    
    for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row) continue;
      
      try {
        const rowAtHead = parseFloat(row[atHeadCol]);
        const rowMetalType = String(row[metalTypeCol]).trim();
        
        if (Math.abs(rowAtHead - atHeadValue) < 0.01 && rowMetalType === metalType) {
          const externalPressure = parseFloat(row[externalPressureCol]);
          const tensileStrength = parseFloat(row[tensileStrengthCol]);
          const unitWeight = parseFloat(row[unitWeightCol]);
          const internalDiameter = parseFloat(row[internalDiameterCol]);
          
          matchingRows.push({
            atHead: rowAtHead,
            externalPressure,
            metalType: rowMetalType,
            tensileStrength,
            unitWeight,
            internalDiameter
          });
        }
      } catch (e) {
        continue;
      }
    }
    
    return matchingRows;
  } catch (error) {
    console.error('Error extracting additional info:', error);
    return [];
  }
} 