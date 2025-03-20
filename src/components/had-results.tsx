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
import { HADData, calculateLValues } from "@/utils/casingCalculations"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"

interface HADResultsProps {
  hadData: {
    [section: string]: {
      [atHead: string]: HADData[];
    };
  };
}

const HADResults: React.FC<HADResultsProps> = ({ hadData }) => {
  const [processedData, setProcessedData] = useState<{
    [section: string]: {
      [atHead: string]: HADData[];
    };
  }>(hadData);
  const [showDebug, setShowDebug] = useState(false);
  
  // Process the data to include L values when the component mounts or hadData changes
  useEffect(() => {
    if (!hadData) return;
    
    // Create a copy of the data
    const processed = { ...hadData };
    
    // Collect all HAD data from all sections to use when sections have limited data
    let allHADData: HADData[] = [];
    Object.keys(hadData).forEach(section => {
      Object.keys(hadData[section]).forEach(atHead => {
        allHADData = [...allHADData, ...hadData[section][atHead]];
      });
    });
    
    // Process each section and at-head combination
    Object.keys(processed).forEach(section => {
      Object.keys(processed[section]).forEach(atHead => {
        // Calculate L values for the data array, passing all HAD data as second parameter
        processed[section][atHead] = calculateLValues(processed[section][atHead], allHADData);
      });
    });
    
    setProcessedData(processed);
    
    // Force UI refresh after calculation
    console.log('HAD data processed:', new Date().toISOString());
  }, [hadData, JSON.stringify(hadData)]); // Added JSON.stringify to detect deep changes
  
  if (!processedData) return null;
  
  // Get section names with data
  const sectionNames = Object.keys(processedData).filter(key => Object.keys(processedData[key]).length > 0);
  
  if (sectionNames.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">No HAD data available.</div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button 
          onClick={() => setShowDebug(!showDebug)} 
          className={`px-3 py-1 text-xs rounded-md ${showDebug ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}
        >
          {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
        </button>
      </div>
      
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
            <div className="space-y-4">
              {Object.entries(processedData[section]).map(([atHead, data]) => (
                <div key={atHead} className="space-y-2">
                  <h4 className="font-medium text-primary/90">At Head: {atHead}</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>HAD</TableHead>
                        <TableHead>External Pressure (MPa)</TableHead>
                        <TableHead>Metal Type</TableHead>
                        <TableHead>Tensile Strength (MPa)</TableHead>
                        <TableHead>Unit Weight (kg/m)</TableHead>
                        <TableHead>Lvalue (m)</TableHead>
                        <TableHead>y value</TableHead>
                        <TableHead>z value</TableHead>
                        <TableHead>Condition Check</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.had.toFixed(2)}</TableCell>
                          <TableCell>{item.externalPressure.toFixed(2)}</TableCell>
                          <TableCell>{item.metalType}</TableCell>
                          <TableCell>{item.tensileStrength.toFixed(2)}</TableCell>
                          <TableCell>{item.unitWeight.toFixed(2)}</TableCell>
                          <TableCell>
                            {item.L1 !== undefined ? item.L1.toFixed(2) :
                             item.L2 !== undefined ? item.L2.toFixed(2) :
                             item.L3 !== undefined ? item.L3.toFixed(2) :
                             item.L4 !== undefined ? item.L4.toFixed(2) : '-'}
                            {showDebug && 
                              <div className="text-xs text-gray-500 mt-1">
                                {item.L1 !== undefined ? 'L1' : 
                                 item.L2 !== undefined ? 'L2' : 
                                 item.L3 !== undefined ? 'L3' : 
                                 item.L4 !== undefined ? 'L4' : '-'}
                              </div>
                            }
                          </TableCell>
                          <TableCell>
                            {item.L1 !== undefined ? 
                              (item.y1 !== undefined ? item.y1.toFixed(2) : '-') : 
                             item.L2 !== undefined ? 
                              (item.y2 !== undefined ? item.y2.toFixed(2) : '-') : 
                             '-'}
                            {showDebug && 
                              <div className="text-xs text-gray-500 mt-1">
                                Row: {index}
                              </div>
                            }
                          </TableCell>
                          <TableCell>
                            {item.L1 !== undefined ? 
                              (item.z1 !== undefined ? item.z1.toFixed(2) : '-') : 
                             item.L2 !== undefined ? 
                              (item.z2 !== undefined ? item.z2.toFixed(2) : '-') : 
                             '-'}
                          </TableCell>
                          <TableCell>
                            {(item.L1 !== undefined || item.L2 !== undefined) && item.conditionCheck !== undefined ? (
                              <div className="flex items-center gap-2">
                                <span>{item.conditionCheck.toFixed(2)}</span>
                                {item.conditionMet ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    Valid
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    Invalid
                                  </Badge>
                                )}
                              </div>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      
      {showDebug && (
        <div className="mt-8 p-4 border border-gray-300 rounded-md bg-slate-100">
          <h3 className="text-lg font-semibold mb-4">Debug Information</h3>
          <pre className="text-xs overflow-auto max-h-96 p-4 bg-slate-800 text-white rounded" style={{color: 'white !important'}}>
            {JSON.stringify(processedData, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}

export default HADResults; 