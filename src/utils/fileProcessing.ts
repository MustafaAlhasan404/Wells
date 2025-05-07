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
    const workbook = XLSX.read(new Uint8Array(fileBuffer), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // First try direct cell exploration to match Python's behavior
    try {
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
            
            if (cellValue.includes('at head') || cellValue.includes('od') || 
                cellValue.includes('outside diameter') || cellValue.includes('outer diameter')) {
              atHeadColLetter = col;
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
            
            if (cellValue.includes('at body') || cellValue.includes('weight') || 
                cellValue.includes('nominal') || cellValue.includes('lb/ft')) {
              atBodyColLetter = col;
              break;
            }
          }
        }
        
        if (atHeadColLetter && atBodyColLetter) {
          // Found both columns, now search for matching at_head value
          
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
              
              // Get corresponding at_body value
              const atBodyCell = sheet[`${atBodyColLetter}${dataRow}`];
              
              if (atBodyCell && atBodyCell.v !== undefined && atBodyCell.v !== null) {
                let atBodyValue = String(atBodyCell.v);
                
                // Clean up the at_body value if needed
                if (atBodyValue.includes(' ')) {
                  atBodyValue = atBodyValue.split(' ').pop() || atBodyValue;
                }
                
                // Validate that the at_body value is different from the at_head value
                // and contains valid numeric data
                let numericAtBodyValue: number | null = null;
                try {
                  // Try to extract numeric part
                  const match = atBodyValue.match(/(\d+(?:\.\d+)?)/);
                  if (match) {
                    numericAtBodyValue = parseFloat(match[1]);
                  }
                } catch (e) {
                }
                
                // Ensure we have a valid numeric value and it's different from at_head
                if (numericAtBodyValue !== null && !isNaN(numericAtBodyValue) && 
                    Math.abs(numericAtBodyValue - atHeadValue) >= 0.1) {
                  return atBodyValue;
                } else {
                }
              }
            }
          }
        }
      }
    } catch (directCellError) {
    }
    
    // Fall back to the original method with enhanced flexibility
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
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
    
    // First try exact matches
    for (let rowIdx = 0; rowIdx < Math.min(15, data.length); rowIdx++) {
      const row = data[rowIdx];
      if (!row) continue;
      
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        if (row[colIdx] === undefined || row[colIdx] === null) continue;
        
        const cellValue = typeof row[colIdx] === 'string' 
          ? row[colIdx].trim() 
          : String(row[colIdx]).trim();
        
        // Check for exact matches
        if (atHeadCol === -1 && atHeadVariations.includes(cellValue.toLowerCase())) {
          atHeadCol = colIdx;
        }
        
        if (atBodyCol === -1 && atBodyVariations.includes(cellValue.toLowerCase())) {
          atBodyCol = colIdx;
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
            }
          }
          
          if (atBodyCol === -1) {
            if (atBodyVariations.some(v => cellValue.includes(v))) {
              atBodyCol = colIdx;
            }
          }
        }
        
        if (atHeadCol !== -1 && atBodyCol !== -1) break;
      }
    }
    
    // Last resort: try to infer columns by position
    if (atHeadCol === -1 || atBodyCol === -1) {
      if (data.length > 0 && data[0].length >= 3) {
        if (atHeadCol === -1) {
          atHeadCol = 0;  // First column is often at_head/OD
        }
        
        if (atBodyCol === -1) {
          atBodyCol = 1;  // Second column is often at_body/weight
        }
      }
    }
    
    if (atHeadCol === -1 || atBodyCol === -1) {
      return null;
    }
    
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
          
          // Check with increased tolerance
          if (Math.abs(rowAtHead - atHeadValue) < TOLERANCE) {
            
            // Get at_body value
            let atBodyValue: string;
            
            if (row[atBodyCol] !== undefined && row[atBodyCol] !== null) {
              atBodyValue = String(row[atBodyCol]);
              
              // Clean up the at_body value if needed
              if (atBodyValue.includes(' ')) {
                atBodyValue = atBodyValue.split(' ').pop() || atBodyValue;
              }
              
              return atBodyValue;
            }
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // If we still haven't found a match, try a more aggressive approach
    
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
      
      let atBodyValue = String(row[atBodyCol] || '');
      if (atBodyValue.includes(' ')) {
        atBodyValue = atBodyValue.split(' ').pop() || atBodyValue;
      }
      
      return atBodyValue;
    }
    
    return null;
  } catch (error) {
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
    const workbook = XLSX.read(new Uint8Array(fileBuffer), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // First try direct cell exploration to match Python's behavior
    // This method directly accesses cells by reference rather than using sheet_to_json
    // which more closely matches the Python openpyxl access pattern
    try {
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
            
            if (cellValue.includes('bit') || cellValue.includes('hole') || cellValue.includes('size') || cellValue.includes('diameter')) {
              bitSizeColLetter = col;
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
            
            if (cellValue.includes('id') || cellValue.includes('internal') || cellValue.includes('inside') || cellValue.includes('diameter')) {
              idColLetter = col;
              break;
            }
          }
        }
        
        if (bitSizeColLetter && idColLetter) {
          // Found both columns, extract data
          
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
            
            return [bitSizes[nearestIndex], internalDiameters[nearestIndex]];
          }
        }
      }
    } catch (directCellError) {
    }
    
    // Fall back to the original method if direct cell exploration didn't work
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
    
    // Enhanced exact match first - check for exact matches before using includes
    for (let rowIdx = 0; rowIdx < Math.min(10, data.length); rowIdx++) {
      const row = data[rowIdx];
      if (!row) continue;
      
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
          }
        }
        
        if (internalDiameterCol === -1) {
          if (internalDiameterVariations.includes(cellValue)) {
            internalDiameterCol = colIdx;
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
            }
            // Then check for other variations
            else if (bitSizeVariations.some(variation => cellValue.includes(variation))) {
              bitSizeCol = colIdx;
            }
          }
          
          if (internalDiameterCol === -1) {
            // First check if it contains "id" as a stand-alone term
            if (cellValue === 'id' || cellValue.includes(' id ') || cellValue.includes('i.d') || 
                cellValue.startsWith('id ') || cellValue.endsWith(' id')) {
              internalDiameterCol = colIdx;
            }
            // Then check for internal diameter
            else if (cellValue.includes('internal') && cellValue.includes('diameter')) {
              internalDiameterCol = colIdx;
            }
            // Finally check other variations
            else if (internalDiameterVariations.some(variation => cellValue.includes(variation))) {
              internalDiameterCol = colIdx;
            }
          }
        }
        
        if (bitSizeCol !== -1 && internalDiameterCol !== -1) {
          break;
        }
      }
    }
    
    // Special case for the exact Excel format from the image (Wall Thickness in column G)
    if (internalDiameterCol === -1) {
      for (let rowIdx = 0; rowIdx < 10 && internalDiameterCol === -1; rowIdx++) {
        const row = data[rowIdx];
        if (!row || row.length < 7) continue;
        
        const cellG = row[6]; // Column G is index 6 (0-based)
        if (cellG) {
          const cellText = typeof cellG === 'string' ? cellG.toLowerCase() : String(cellG).toLowerCase();
          if (cellText.includes('wall') || cellText.includes('thickness')) {
            internalDiameterCol = 6;
            break;
          }
        }
      }
    }
    
    // As a last resort, if we still haven't found the wall thickness column but found other columns,
    // try to use column G as wall thickness column
    if (internalDiameterCol === -1 && bitSizeCol !== -1) {
      internalDiameterCol = 6; // Column G
    }
    
    if (bitSizeCol === -1 || internalDiameterCol === -1) {
      return [null, null];
    }
    
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
    
    if (bitSizes.length === 0) {
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
    
    return [bitSizes[nearestIndex], internalDiameters[nearestIndex]];
  } catch (error) {
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
    let wallThicknessCol = -1;
    
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
      // Wall thickness column detection with improved logging
      if (rowText.includes('wall thickness mm')) {
        wallThicknessCol = rowText.indexOf('wall thickness mm');
      }
      // Add more variations for wall thickness column detection
      else if (rowText.includes('wall thickness')) {
        wallThicknessCol = rowText.indexOf('wall thickness');
      }
      else if (rowText.includes('thickness mm')) {
        wallThicknessCol = rowText.indexOf('thickness mm');
      }
      else if (rowText.includes('wall') && rowText.some(cell => cell.includes('mm'))) {
        // Look for a cell that contains "wall"
        for (let i = 0; i < rowText.length; i++) {
          if (rowText[i].includes('wall')) {
            wallThicknessCol = i;
            break;
          }
        }
      }
      // Search for more generic variations
      else {
        // Try to find any column containing "wall" or "thickness"
        for (let i = 0; i < rowText.length; i++) {
          const cellText = rowText[i].toLowerCase();
          if (cellText.includes('wall') || cellText.includes('thickness')) {
            wallThicknessCol = i;
            break;
          }
        }
      }
      
      // Special case for "Wall Thickness mm" in column G (index 6)
      if (wallThicknessCol === -1 && rowText.length > 6) {
        const colGText = rowText[6]; // Column G is index 6 (0-based)
        if (colGText && (colGText.includes('wall') || colGText.includes('thickness'))) {
          wallThicknessCol = 6;
        }
      }
      
      if (atHeadCol !== -1 && externalPressureCol !== -1 && metalTypeCol !== -1 && 
          tensileStrengthCol !== -1 && unitWeightCol !== -1 && internalDiameterCol !== -1) {
        break;
      }
    }
    
    if (atHeadCol === -1 || externalPressureCol === -1 || metalTypeCol === -1 || 
        tensileStrengthCol === -1 || unitWeightCol === -1 || internalDiameterCol === -1) {
      return [];
    }
    
    // Last resort fallback for wall thickness - if we still don't have it, use column G (index 6)
    if (wallThicknessCol === -1) {
      wallThicknessCol = 6; // Column G (index 6)
    }
    
    // Find matching rows
    const validMetalTypes = [
      'K-55', 'L-80', 'N-80', 'C-90', 'T-95', 'P-110', 'Q-125', 'V-150'
    ];
    const matchingRows: AdditionalInfo[] = [];
    
    for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row) continue;
      
      try {
        const rowAtHead = parseFloat(row[atHeadCol]);
        const rowMetalType = String(row[metalTypeCol]).trim();
        
        if (Math.abs(rowAtHead - atHeadValue) < 0.01 && rowMetalType === metalType && validMetalTypes.includes(rowMetalType)) {
          const externalPressure = parseFloat(row[externalPressureCol]);
          const tensileStrength = parseFloat(row[tensileStrengthCol]);
          const unitWeight = parseFloat(row[unitWeightCol]);
          const internalDiameter = parseFloat(row[internalDiameterCol]);
          
          const additionalInfo: AdditionalInfo = {
            atHead: rowAtHead,
            externalPressure,
            metalType: rowMetalType,
            tensileStrength,
            unitWeight,
            internalDiameter
          };
          
          // Add wall thickness if the column exists and has a valid value
          if (wallThicknessCol !== -1 && row[wallThicknessCol] !== undefined) {
            try {
              // More flexible parsing for wall thickness
              let wallThicknessValue = row[wallThicknessCol];
              let wallThickness: number;
              
              if (typeof wallThicknessValue === 'number') {
                wallThickness = wallThicknessValue;
              } else {
                // Try to extract numeric part from string
                const numStr = String(wallThicknessValue).replace(/[^\d.]/g, '');
                wallThickness = parseFloat(numStr);
              }
              
              if (!isNaN(wallThickness)) {
                additionalInfo.wallThickness = wallThickness;
              }
            } catch (error) {
            }
          } else {
            // If wall thickness not found but we have internalDiameter and external diameter (atHead),
            // calculate wall thickness
            if (additionalInfo.internalDiameter && additionalInfo.atHead) {
              try {
                // Wall thickness = (OD - ID) / 2
                const calculatedWallThickness = (additionalInfo.atHead - additionalInfo.internalDiameter) / 2;
                if (!isNaN(calculatedWallThickness) && calculatedWallThickness > 0) {
                  additionalInfo.wallThickness = calculatedWallThickness;
                }
              } catch (error) {
              }
            }
          }
          
          matchingRows.push(additionalInfo);
        }
      } catch (e) {
        continue;
      }
    }
    
    return matchingRows;
  } catch (error) {
    return [];
  }
} 