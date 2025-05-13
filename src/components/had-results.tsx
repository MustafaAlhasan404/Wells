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
import { HADData, calculateLValues, calculateWallThickness } from "@/utils/casingCalculations"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"

interface HADResultsProps {
  hadData: {
    [section: string]: {
      [atHead: string]: HADData[];
    };
  };
  casingResults?: any[]; // Add casingResults prop
}

const HADResults: React.FC<HADResultsProps> = ({ hadData, casingResults = [] }) => {
  const [processedData, setProcessedData] = useState<{
    [section: string]: {
      [atHead: string]: HADData[];
    };
  }>(hadData);
  const showDebug = false;
  
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
  }, [hadData, JSON.stringify(hadData)]); // Added JSON.stringify to detect deep changes
  
  if (!processedData) return null;
  
  // Get section names with data
  const sectionNames = Object.keys(processedData).filter(key => Object.keys(processedData[key]).length > 0);
  
  if (sectionNames.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">No HAD data available.</div>
    );
  }

  // Sort sections in order: Surface -> Intermediate -> Production
  const sortedSectionNames = [...sectionNames].sort((a, b) => {
    // Helper function to get section priority (Surface first, Production last)
    const getSectionPriority = (section: string): number => {
      if (section.toLowerCase().includes("surface")) return 0;
      if (section.toLowerCase().includes("lower intermediate")) return 1;
      if (section.toLowerCase().includes("middle intermediate")) return 2;
      if (section.toLowerCase().includes("upper intermediate")) return 3;
      if (section.toLowerCase().includes("intermediate")) return 4;
      if (section.toLowerCase().includes("production")) return 5;
      return 6; // Any other section
    };
    
    return getSectionPriority(a) - getSectionPriority(b);
  });

  // Helper function to get external diameter from casing results for a section
  const getExternalDiameter = (sectionName: string, atHead?: string): number => {
    if (!casingResults || casingResults.length === 0) return 0;
    
    // Extract section identifier (Production, Surface, Intermediate X)
    const sectionIdentifier = sectionName.replace(' Section', '').trim();
    
    // Find matching casing result
    const matchingResult = casingResults.find(result => 
      result.section.toLowerCase().includes(sectionIdentifier.toLowerCase())
    );
    
    if (matchingResult && matchingResult.dcsg) {
      // Extract numeric value from DCSG string (e.g., "244.5 mm (9 5/8")")
      const match = matchingResult.dcsg.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : 0;
    }
    
    return 0;
  };

  return (
    <>
      <Tabs defaultValue={sortedSectionNames[0]} className="w-full">
        <TabsList className="w-full mb-4 flex flex-wrap justify-start">
          {sortedSectionNames.map(section => (
            <TabsTrigger key={section} value={section}>
              {section}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {sortedSectionNames.map(section => (
          <TabsContent key={section} value={section} className="py-2">
            <div className="space-y-4">
              {Object.entries(processedData[section]).map(([atHead, data]) => (
                <div key={atHead} className="space-y-2">
                  <h4 className="font-medium text-primary/90">At Head: {atHead}</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>HAD</TableHead>
                        <TableHead>External Pressure (MPa)</TableHead>
                        <TableHead>Internal Diameter (mm)</TableHead>
                        <TableHead>Metal Type</TableHead>
                        <TableHead>Tensile Strength (MPa)</TableHead>
                        <TableHead>Unit Weight (kg/m)</TableHead>
                        <TableHead>Wall Thickness (mm)</TableHead>
                        <TableHead>Lvalue (m)</TableHead>
                        {showDebug && <TableHead>y value</TableHead>}
                        {showDebug && <TableHead>z value</TableHead>}
                        {showDebug && <TableHead>Condition Check</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.slice().reverse().map((item, index, arr) => {
                        // Always use wall thickness from data without fallback calculation
                        let wallThickness = "-";
                        
                        if (item.wallThickness !== undefined) {
                          wallThickness = item.wallThickness.toFixed(2) + " mm";
                        } 
                        // If wallThickness is not available but we have internalDiameter and can calculate from atHead
                        else if (item.internalDiameter && parseFloat(atHead)) {
                          // Calculate: Wall thickness = (OD - ID) / 2
                          const calculated = (parseFloat(atHead) - item.internalDiameter) / 2;
                          if (!isNaN(calculated) && calculated > 0) {
                            wallThickness = calculated.toFixed(2) + " mm";
                          }
                        }
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>{arr.length - index}</TableCell>
                            <TableCell>{item.had.toFixed(2)}</TableCell>
                            <TableCell>{item.externalPressure.toFixed(2)}</TableCell>
                            <TableCell>{item.internalDiameter !== undefined ? item.internalDiameter.toFixed(2) : '-'}</TableCell>
                            <TableCell>{item.metalType}</TableCell>
                            <TableCell>{item.tensileStrength.toFixed(2)}</TableCell>
                            <TableCell>{item.unitWeight.toFixed(2)}</TableCell>
                            <TableCell>
                              {wallThickness}
                              {showDebug && item.wallThickness !== undefined &&
                                <div className="text-xs text-gray-500 mt-1">
                                  Wall thickness from Excel: {item.wallThickness.toFixed(2)} mm
                                </div>
                              }
                            </TableCell>
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
                            
                            {showDebug && (
                              <TableCell>
                                {item.L1 !== undefined ? 
                                  (item.y1 !== undefined ? item.y1.toFixed(2) : '-') : 
                                item.L2 !== undefined ? 
                                  (item.y2 !== undefined ? item.y2.toFixed(2) : '-') : 
                                item.L3 !== undefined ? 
                                  (item.y3 !== undefined ? item.y3.toFixed(2) : '-') : 
                                item.L4 !== undefined ? 
                                  (item.y4 !== undefined ? item.y4.toFixed(2) : '-') : 
                                '-'}
                                {showDebug && 
                                  <div className="text-xs text-gray-500 mt-1">
                                    {item.L1 !== undefined && item.y1 !== undefined ? 
                                      `y₁ = (H-L₁)/HAD₂` : 
                                    item.L2 !== undefined && item.y2 !== undefined ? 
                                      `y₂ = (H-L₁-L₂)/HAD₃` : 
                                    item.L3 !== undefined && item.y3 !== undefined ? 
                                      `y₃ = (H-L₁-L₂-L₃)/HAD₄` : 
                                    ''}
                                  </div>
                                }
                              </TableCell>
                            )}
                            
                            {showDebug && (
                              <TableCell>
                                {item.L1 !== undefined ? 
                                  (item.z1 !== undefined ? item.z1.toFixed(2) : '-') : 
                                item.L2 !== undefined ? 
                                  (item.z2 !== undefined ? item.z2.toFixed(2) : '-') : 
                                item.L3 !== undefined ? 
                                  (item.z3 !== undefined ? item.z3.toFixed(2) : '-') : 
                                item.L4 !== undefined ? 
                                  (item.z4 !== undefined ? item.z4.toFixed(2) : '-') : 
                                '-'}
                                {showDebug && 
                                  <div className="text-xs text-gray-500 mt-1">
                                    {item.L1 !== undefined && item.z1 !== undefined ? 
                                      `z₁ = (L₁×UW₁×1.488)/(TS₂×1000)` : 
                                    item.L2 !== undefined && item.z2 !== undefined ? 
                                      `z₂ = (L₁×UW₁×1.488 + L₂×UW₂×1.488)/(TS₃×1000)` : 
                                    item.L3 !== undefined && item.z3 !== undefined ? 
                                      `z₃ = (L₁×UW₁×1.488 + L₂×UW₂×1.488 + L₃×UW₃×1.488)/(TS₄×1000)` : 
                                    ''}
                                  </div>
                                }
                              </TableCell>
                            )}
                            
                            {showDebug && (
                              <TableCell>
                                {(item.L1 !== undefined || item.L2 !== undefined) && item.conditionCheck !== undefined ? (
                                  <div className="flex items-center gap-2">
                                    {/* Calculate the objective value from displayed y and z values */}
                                    {item.L1 !== undefined && item.y1 !== undefined && item.z1 !== undefined ? (
                                      <>
                                        <span>{Math.pow(item.y1, 2) + item.y1 * item.z1 + Math.pow(item.z1, 2)}</span>
                                        {Math.abs(Math.pow(item.y1, 2) + item.y1 * item.z1 + Math.pow(item.z1, 2) - 1) < 0.001 ? (
                                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            Valid
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                            Invalid
                                          </Badge>
                                        )}
                                      </>
                                    ) : item.L2 !== undefined && item.y2 !== undefined && item.z2 !== undefined ? (
                                      <>
                                        <span>{Math.pow(item.y2, 2) + item.y2 * item.z2 + Math.pow(item.z2, 2)}</span>
                                        {Math.abs(Math.pow(item.y2, 2) + item.y2 * item.z2 + Math.pow(item.z2, 2) - 1) < 0.001 ? (
                                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            Valid
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                            Invalid
                                          </Badge>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <span>{item.conditionCheck}</span>
                                        {item.conditionMet ? (
                                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            Valid
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                            Invalid
                                          </Badge>
                                        )}
                                      </>
                                    )}
                                    {showDebug && item.L1 !== undefined && 
                                      <div className="text-xs text-gray-500 mt-1">
                                        y₁² + y₁×z₁ + z₁² = 1
                                        {item.y1 !== undefined && item.z1 !== undefined && (
                                          <div>
                                            = {item.y1*item.y1} + {item.y1*item.z1} + {item.z1*item.z1}
                                            = {Math.pow(item.y1, 2) + item.y1*item.z1 + Math.pow(item.z1, 2)}
                                          </div>
                                        )}
                                      </div>
                                    }
                                    {showDebug && item.L2 !== undefined && 
                                      <div className="text-xs text-gray-500 mt-1">
                                        y₂² + y₂×z₂ + z₂² = 1
                                        {item.y2 !== undefined && item.z2 !== undefined && (
                                          <div>
                                            = {item.y2*item.y2} + {item.y2*item.z2} + {item.z2*item.z2}
                                            = {Math.pow(item.y2, 2) + item.y2*item.z2 + Math.pow(item.z2, 2)}
                                          </div>
                                        )}
                                      </div>
                                    }
                                  </div>
                                ) : '-'}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

export default HADResults; 