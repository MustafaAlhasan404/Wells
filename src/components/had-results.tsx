"use client"

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HADData } from "@/utils/casingCalculations"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface HADResultsProps {
  hadData: any;
}

const HADResults: React.FC<HADResultsProps> = ({ hadData }) => {
  if (!hadData) return null;

  // Debug the HAD data structure
  console.log("HAD Data received:", hadData);
  
  // Get section names with data
  const sectionNames = Object.keys(hadData).filter(key => Object.keys(hadData[key]).length > 0);
  
  if (sectionNames.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">No HAD data available.</div>
    );
  }

  return (
    <Tabs defaultValue={sectionNames[0]} className="w-full">
      <TabsList className="w-full mb-4 flex flex-wrap justify-start">
        {sectionNames.map(section => (
          <TabsTrigger key={section} value={section}>
            {section}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {sectionNames.map(section => (
        <TabsContent key={section} value={section} className="py-2">
          <HADSectionData section={section} sectionData={hadData[section]} />
        </TabsContent>
      ))}
    </Tabs>
  );
};

interface HADSectionDataProps {
  section: string;
  sectionData: Record<string, HADData[]>;
}

const HADSectionData: React.FC<HADSectionDataProps> = ({ section, sectionData }) => {
  // Get all at-head values
  const atHeadValues = Object.keys(sectionData).map(Number).sort((a, b) => a - b);
  
  if (atHeadValues.length === 0) {
    return <div>No data available for {section}</div>;
  }
  
  return (
    <div className="space-y-6">
      {atHeadValues.map(atHead => (
        <Card key={atHead} className="border-primary/5 bg-card/50">
          <CardHeader className="py-3 bg-muted/30">
            <CardTitle className="text-md font-medium">
              OD: {atHead} mm
            </CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Showing rows with calculated L values only
              {section === "Surface Section" && (
                <span> • HAD values limited to inputted depth • For duplicate HAD values, showing row with highest L value</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="py-3 px-3 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Row</TableHead>
                  <TableHead className="text-center">HAD</TableHead>
                  <TableHead className="text-center">External Pressure (MPa)</TableHead>
                  <TableHead className="text-center">Metal Type</TableHead>
                  <TableHead className="text-center">Tensile Strength (tonf)</TableHead>
                  <TableHead className="text-center">Unit Weight (lb/ft)</TableHead>
                  <TableHead className="text-center">L Value (m)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <HADRowData rowsData={sectionData[atHead.toString()]} section={section} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

interface HADRowDataProps {
  rowsData: HADData[];
  section: string;
}

const HADRowData: React.FC<HADRowDataProps> = ({ rowsData, section }) => {
  if (!rowsData || rowsData.length === 0) {
    return <TableRow><TableCell colSpan={7}>No data available</TableCell></TableRow>;
  }
  
  // Sort by HAD in descending order to match Python implementation
  const sortedData = [...rowsData].sort((a, b) => b.had - a.had);
  
  // Filter to only show rows with L values assigned
  const rowsWithLValues = sortedData.filter(item => item.lValue !== undefined);
  
  if (rowsWithLValues.length === 0) {
    return <TableRow><TableCell colSpan={7}>No L values calculated</TableCell></TableRow>;
  }
  
  // For Surface Section, filter to show only HAD values <= depth
  let filteredRows = rowsWithLValues;
  if (section === "Surface Section" && rowsWithLValues.length > 0 && rowsWithLValues[0].depth) {
    const depth = rowsWithLValues[0].depth;
    filteredRows = rowsWithLValues.filter(item => item.had <= depth);
    console.log(`Filtering Surface Section rows: ${rowsWithLValues.length} → ${filteredRows.length} (depth: ${depth})`);
    
    // Special handling for Surface Section: 
    // When multiple rows have the same HAD value, keep only the row with the highest L value
    if (section === "Surface Section") {
      // Group rows by HAD value
      const rowsByHAD: Record<string, HADData[]> = {};
      filteredRows.forEach(row => {
        const hadKey = row.had.toFixed(2);
        if (!rowsByHAD[hadKey]) {
          rowsByHAD[hadKey] = [];
        }
        rowsByHAD[hadKey].push(row);
      });
      
      // For each group with multiple rows, keep only the row with the highest L value
      const dedupedRows: HADData[] = [];
      Object.values(rowsByHAD).forEach(rows => {
        if (rows.length > 1) {
          console.log(`Found ${rows.length} rows with HAD ${rows[0].had.toFixed(2)}`);
          // Sort by L value in descending order and keep the first one
          rows.sort((a, b) => ((b.lValue || 0) - (a.lValue || 0)));
          dedupedRows.push(rows[0]);
        } else {
          dedupedRows.push(rows[0]);
        }
      });
      
      filteredRows = dedupedRows;
      console.log(`After deduplication: ${filteredRows.length} rows`);
    }
  }
  
  return (
    <>
      {filteredRows.map((item, index) => (
        <TableRow key={index}>
          <TableCell className="text-center">{index + 1}</TableCell>
          <TableCell className="text-center">{item.had.toFixed(2)}</TableCell>
          <TableCell className="text-center">{item.externalPressure.toFixed(1)}</TableCell>
          <TableCell className="text-center">{item.metalType}</TableCell>
          <TableCell className="text-center">{item.tensileStrength.toFixed(1)}</TableCell>
          <TableCell className="text-center">{item.unitWeight.toFixed(1)}</TableCell>
          <TableCell className="text-center">
            {item.lValue !== undefined 
              ? Number.isInteger(item.lValue) 
                ? item.lValue.toFixed(0) 
                : item.lValue.toFixed(2)
              : '-'
            }
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};

export default HADResults; 