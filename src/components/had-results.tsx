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
                        <TableHead>Row</TableHead>
                        <TableHead>HAD</TableHead>
                        <TableHead>External Pressure (MPa)</TableHead>
                        <TableHead>Internal Diameter (mm)</TableHead>
                        <TableHead>Metal Type</TableHead>
                        <TableHead>Tensile Strength (MPa)</TableHead>
                        <TableHead>Unit Weight (kg/m)</TableHead>
                        <TableHead>Wall Thickness (mm)</TableHead>
                        <TableHead>Lvalue (m)</TableHead>
                        <TableHead>y value</TableHead>
                        <TableHead>z value</TableHead>
                        <TableHead>Condition Check</TableHead>
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
      
      {showDebug && (
        <div className="mt-8 p-4 border border-gray-300 rounded-md bg-slate-100">
          <h3 className="text-lg font-semibold mb-4">Debug Information</h3>
          
          <div className="mb-4">
            <h4 className="text-md font-medium mb-2">Calculation Formulas:</h4>
            <div className="bg-white p-3 rounded-md border border-gray-200 space-y-2">
              <p><strong>y₁ formula:</strong> y₁ = (H - L₁) / HAD₂</p>
              <p><strong>z₁ formula:</strong> z₁ = (L₁ × UnitWeight₁ × 1.488) / (TensileStrength₂ × 1000)</p>
              <p><strong>y₂ formula:</strong> y₂ = (H - L₁ - L₂) / HAD₃</p>
              <p><strong>z₂ formula:</strong> z₂ = (L₁ × UnitWeight₁ × 1.488 + L₂ × UnitWeight₂ × 1.488) / (TensileStrength₃ × 1000)</p>
              <p><strong>y₃ formula:</strong> y₃ = (H - L₁ - L₂ - L₃) / HAD₄</p>
              <p><strong>z₃ formula:</strong> z₃ = (L₁ × UnitWeight₁ × 1.488 + L₂ × UnitWeight₂ × 1.488 + L₃ × UnitWeight₃ × 1.488) / (TensileStrength₄ × 1000)</p>
              <p><strong>Objective for L₁:</strong> y₁² + y₁×z₁ + z₁² = 1 (using y₁ and z₁ values from row 1)</p>
              <p><strong>Objective for L₂:</strong> y₂² + y₂×z₂ + z₂² = 1 (using y₂ and z₂ values from row 2)</p>
              <p><strong>Objective for L₃:</strong> y₃² + y₃×z₃ + z₃² = 1 (using y₃ and z₃ values from row 3)</p>
              <p className="text-xs text-gray-500 mt-2">Values are calculated iteratively to find L₁, L₂, and L₃ that make the objective equation as close to 1 as possible.</p>
              <p className="text-xs text-gray-500">Condition is considered valid when the objective value is within ±0.001 of 1 (0.999 to 1.001).</p>
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="text-md font-medium mb-2">Verification Calculations:</h4>
            <div className="bg-white p-3 rounded-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">Row</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">y</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">z</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">y²</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">y×z</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">z²</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">y² + y×z + z²</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">Valid?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(processedData).flatMap(([section, atHeadObj]) => 
                    Object.entries(atHeadObj).flatMap(([atHead, data]) => 
                      data.map((item, index) => {
                        // For row with L1
                        if (item.y1 !== undefined && item.z1 !== undefined) {
                          const y = item.y1;
                          const z = item.z1;
                          const ySquared = Math.pow(y, 2);
                          const yz = y * z;
                          const zSquared = Math.pow(z, 2);
                          const result = ySquared + yz + zSquared;
                          const isValid = Math.abs(result - 1) < 0.001;
                          
                          return (
                            <tr key={`${section}-${atHead}-${index}-L1`} className="bg-gray-50">
                              <td className="px-2 py-1 text-xs">{section} - {atHead} - Row {index+1} (L1)</td>
                              <td className="px-2 py-1 text-xs">{y.toFixed(4)}</td>
                              <td className="px-2 py-1 text-xs">{z.toFixed(4)}</td>
                              <td className="px-2 py-1 text-xs">{ySquared.toFixed(4)}</td>
                              <td className="px-2 py-1 text-xs">{yz.toFixed(4)}</td>
                              <td className="px-2 py-1 text-xs">{zSquared.toFixed(4)}</td>
                              <td className="px-2 py-1 text-xs font-semibold">{result}</td>
                              <td className={`px-2 py-1 text-xs ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                                {isValid ? 'Valid' : 'Invalid'}
                              </td>
                            </tr>
                          );
                        }
                        return null;
                      }).filter(Boolean)
                    )
                  )}

                  {Object.entries(processedData).flatMap(([section, atHeadObj]) => 
                    Object.entries(atHeadObj).flatMap(([atHead, data]) => 
                      data.map((item, index) => {
                        // For row with L2
                        if (item.y2 !== undefined && item.z2 !== undefined) {
                          const y = item.y2;
                          const z = item.z2;
                          const ySquared = Math.pow(y, 2);
                          const yz = y * z;
                          const zSquared = Math.pow(z, 2);
                          const result = ySquared + yz + zSquared;
                          const isValid = Math.abs(result - 1) < 0.001;
                          
                          return (
                            <tr key={`${section}-${atHead}-${index}-L2`} className="bg-white">
                              <td className="px-2 py-1 text-xs">{section} - {atHead} - Row {index+1} (L2)</td>
                              <td className="px-2 py-1 text-xs">{y.toFixed(4)}</td>
                              <td className="px-2 py-1 text-xs">{z.toFixed(4)}</td>
                              <td className="px-2 py-1 text-xs">{ySquared.toFixed(4)}</td>
                              <td className="px-2 py-1 text-xs">{yz.toFixed(4)}</td>
                              <td className="px-2 py-1 text-xs">{zSquared.toFixed(4)}</td>
                              <td className="px-2 py-1 text-xs font-semibold">{result}</td>
                              <td className={`px-2 py-1 text-xs ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                                {isValid ? 'Valid' : 'Invalid'}
                              </td>
                            </tr>
                          );
                        }
                        return null;
                      }).filter(Boolean)
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <pre className="text-xs overflow-auto max-h-96 p-4 bg-slate-800 text-white rounded" style={{color: 'white !important'}}>
            {JSON.stringify(processedData, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}

export default HADResults; 