import { NextRequest, NextResponse } from 'next/server';

// Define type for pump data
interface PumpData {
  type: string;
  speed: number;
  pressures: {
    "3.5": number | null;
    "4": number | null;
    "4.5": number | null;
  };
  flows: {
    "3.5": number | null;
    "4": number | null;
    "4.5": number | null;
  };
}

// Define type for processed pump data
interface PumpResult {
  type: string;
  diameter: number;
  pressure: number;
  flow: number;
  speed: number | null;
  price: number;
  isRecommended: boolean;
  instance: number;
  ppmax: number;
  isAlternative: boolean;
}

// Define the hardcoded pump data based on the provided table
const PUMP_DATA: PumpData[] = [
  // AC-300
  { 
    type: "AC-300", 
    speed: 1, 
    pressures: { "3.5": null, "4": 30, "4.5": null }, 
    flows: { "3.5": null, "4": 100, "4.5": null } 
  },
  { 
    type: "AC-300", 
    speed: 2, 
    pressures: { "3.5": null, "4": 22, "4.5": null }, 
    flows: { "3.5": null, "4": 250, "4.5": null } 
  },
  { 
    type: "AC-300", 
    speed: 3, 
    pressures: { "3.5": null, "4": 10, "4.5": null }, 
    flows: { "3.5": null, "4": 450, "4.5": null } 
  },
  { 
    type: "AC-300", 
    speed: 4, 
    pressures: { "3.5": null, "4": 6, "4.5": null }, 
    flows: { "3.5": null, "4": 635, "4.5": null } 
  },
  
  // AC-400.B
  { 
    type: "AC-400.B", 
    speed: 1, 
    pressures: { "3.5": 40, "4": 32, "4.5": 24 }, 
    flows: { "3.5": 243, "4": 300, "4.5": 397 } 
  },
  { 
    type: "AC-400.B", 
    speed: 2, 
    pressures: { "3.5": 21.5, "4": 17.5, "4.5": 13 }, 
    flows: { "3.5": 444, "4": 549, "4.5": 724 } 
  },
  { 
    type: "AC-400.B", 
    speed: 3, 
    pressures: { "3.5": 13, "4": 10.8, "4.5": 8.2 }, 
    flows: { "3.5": 717, "4": 885, "4.5": 1171 } 
  },
  
  // AC-500
  { 
    type: "AC-500", 
    speed: 1, 
    pressures: { "3.5": 50, "4": 35.5, "4.5": 27 }, 
    flows: { "3.5": 250, "4": 308, "4.5": 409 } 
  },
  { 
    type: "AC-500", 
    speed: 2, 
    pressures: { "3.5": 24, "4": 19.5, "4.5": 14.8 }, 
    flows: { "3.5": 459, "4": 569, "4.5": 750 } 
  },
  { 
    type: "AC-500", 
    speed: 3, 
    pressures: { "3.5": 15.5, "4": 12.5, "4.5": 9.5 }, 
    flows: { "3.5": 717, "4": 885, "4.5": 1171 } 
  },
  
  // ACF-700
  { 
    type: "ACF-700", 
    speed: 1, 
    pressures: { "3.5": null, "4": 70, "4.5": 55 }, 
    flows: { "3.5": null, "4": 158, "4.5": 208 } 
  },
  { 
    type: "ACF-700", 
    speed: 2, 
    pressures: { "3.5": null, "4": 52, "4.5": 40 }, 
    flows: { "3.5": null, "4": 217, "4.5": 287 } 
  },
  { 
    type: "ACF-700", 
    speed: 3, 
    pressures: { "3.5": null, "4": 40, "4.5": 30 }, 
    flows: { "3.5": null, "4": 284, "4.5": 275 } 
  },
  { 
    type: "ACF-700", 
    speed: 4, 
    pressures: { "3.5": null, "4": 30, "4.5": 24 }, 
    flows: { "3.5": null, "4": 391, "4.5": 518 } 
  },
  { 
    type: "ACF-700", 
    speed: 5, 
    pressures: { "3.5": null, "4": 27, "4.5": 20 }, 
    flows: { "3.5": null, "4": 416, "4.5": 550 } 
  },
  { 
    type: "ACF-700", 
    speed: 6, 
    pressures: { "3.5": null, "4": 21, "4.5": 15 }, 
    flows: { "3.5": null, "4": 544, "4.5": 720 } 
  },
  { 
    type: "ACF-700", 
    speed: 7, 
    pressures: { "3.5": null, "4": 15, "4.5": 11 }, 
    flows: { "3.5": null, "4": 749, "4.5": 990 } 
  },
  { 
    type: "ACF-700", 
    speed: 8, 
    pressures: { "3.5": null, "4": 12, "4.5": 9 }, 
    flows: { "3.5": null, "4": 981, "4.5": 1297 } 
  },
  
  // T-10
  { 
    type: "T-10", 
    speed: 1, 
    pressures: { "3.5": null, "4": null, "4.5": 63 }, 
    flows: { "3.5": null, "4": null, "4.5": 175 } 
  },
  { 
    type: "T-10", 
    speed: 2, 
    pressures: { "3.5": null, "4": null, "4.5": 53 }, 
    flows: { "3.5": null, "4": null, "4.5": 225 } 
  },
  { 
    type: "T-10", 
    speed: 3, 
    pressures: { "3.5": null, "4": null, "4.5": 39.2 }, 
    flows: { "3.5": null, "4": null, "4.5": 303 } 
  },
  { 
    type: "T-10", 
    speed: 4, 
    pressures: { "3.5": null, "4": null, "4.5": 28 }, 
    flows: { "3.5": null, "4": null, "4.5": 428 } 
  },
  { 
    type: "T-10", 
    speed: 5, 
    pressures: { "3.5": null, "4": null, "4.5": 20.3 }, 
    flows: { "3.5": null, "4": null, "4.5": 588 } 
  },
  { 
    type: "T-10", 
    speed: 6, 
    pressures: { "3.5": null, "4": null, "4.5": 15.4 }, 
    flows: { "3.5": null, "4": null, "4.5": 781 } 
  },
  { 
    type: "T-10", 
    speed: 7, 
    pressures: { "3.5": null, "4": null, "4.5": 11 }, 
    flows: { "3.5": null, "4": null, "4.5": 1125 } 
  },
  { 
    type: "T-10", 
    speed: 8, 
    pressures: { "3.5": null, "4": null, "4.5": 7.7 }, 
    flows: { "3.5": null, "4": null, "4.5": 1520 } 
  },
];

/**
 * Process the request to find pumps that match the given Ppmax values
 * and filter by the selected pump diameters.
 */
export async function POST(req: NextRequest) {
  try {
    console.log("API request received: Processing pump selection");
    
    // Parse the form data
    const formData = await req.formData();
    const ppmaxData = formData.get('ppmax') as string;
    const diametersData = formData.get('diameters') as string;
    
    // Parse the ppmax values (multiple instances)
    let ppmaxValues: number[] = [];
    try {
      ppmaxValues = JSON.parse(ppmaxData);
      console.log("Successfully parsed ppmaxValues:", ppmaxValues);
      if (!Array.isArray(ppmaxValues)) {
        ppmaxValues = [parseFloat(ppmaxData)]; // Fallback to single value
      }
    } catch (error) {
      // If parsing fails, try to use it as a single value
      const singleValue = parseFloat(ppmaxData);
      if (!isNaN(singleValue)) {
        ppmaxValues = [singleValue];
      } else {
        return NextResponse.json({ error: 'Invalid Ppmax values' }, { status: 400 });
      }
    }
    
    // Parse the diameters for each instance
    let instanceDiameters: number[] = [];
    try {
      instanceDiameters = JSON.parse(diametersData);
      console.log("Successfully parsed instanceDiameters:", instanceDiameters);
      if (!Array.isArray(instanceDiameters)) {
        // If we got a single diameter, use it for all instances
        const singleDiameter = parseFloat(diametersData);
        instanceDiameters = ppmaxValues.map(() => singleDiameter);
      }
    } catch (error) {
      // If parsing fails, try to use a single value for all instances
      const singleDiameter = parseFloat(diametersData);
      if (!isNaN(singleDiameter)) {
        instanceDiameters = ppmaxValues.map(() => singleDiameter);
      } else {
        // Default to 4 inch for all instances if nothing valid is provided
        instanceDiameters = ppmaxValues.map(() => 4);
      }
    }
    
    // Ensure we have a diameter for each ppmax value
    if (instanceDiameters.length < ppmaxValues.length) {
      // Use the last diameter for any additional instances
      const lastDiameter = instanceDiameters[instanceDiameters.length - 1] || 4;
      while (instanceDiameters.length < ppmaxValues.length) {
        instanceDiameters.push(lastDiameter);
      }
    }
    
    console.log("Request parameters:", { 
      ppmaxValues,
      instanceDiameters
    });

    if (ppmaxValues.length === 0 || ppmaxValues.some(isNaN)) {
      return NextResponse.json({ error: 'Missing or invalid Ppmax values' }, { status: 400 });
    }

    // Validate all instance diameters
    if (instanceDiameters.some(d => isNaN(d) || ![3.5, 4, 4.5].includes(d))) {
      return NextResponse.json({ 
        error: 'Invalid pump diameter(s). Each diameter must be 3.5, 4, or 4.5.' 
      }, { status: 400 });
    }
    
    // Process each Ppmax value and find matching pumps
    const results: PumpResult[] = [];
    
    ppmaxValues.forEach((ppmax, index) => {
      const instanceNumber = index + 1;
      const selectedDiameter = instanceDiameters[index];
      console.log(`Processing instance ${instanceNumber} with Ppmax = ${ppmax}, Diameter = ${selectedDiameter}`);
      
      // Convert diameter to a string key for accessing the data
      const diameterKey = selectedDiameter.toString() as keyof PumpData["pressures"];
      
      // Extract pump data for the selected diameter
      const pumpsForDiameter = PUMP_DATA
        .filter(pump => pump.pressures[diameterKey] !== null)
        .map(pump => ({
          type: pump.type,
          speed: pump.speed,
          pressure: pump.pressures[diameterKey] as number,
          flow: pump.flows[diameterKey] as number
        }));
      
      console.log(`Found ${pumpsForDiameter.length} pumps for ${diameterKey}" diameter`);
      
      // Find pumps that match or exceed the Ppmax value
      let matchingPumps = pumpsForDiameter.filter(pump => pump.pressure >= ppmax);
      
      console.log(`Found ${matchingPumps.length} matching pumps for instance ${instanceNumber}`);
      
      // If no exact matches, find the closest higher pressure options
      let useAlternatives = false;
      if (matchingPumps.length === 0) {
        useAlternatives = true;
        
        // Find all pumps with pressure values
        const pumpsWithPressure = pumpsForDiameter.filter(p => 
          p.pressure !== null && !isNaN(p.pressure)
        );
        
        if (pumpsWithPressure.length > 0) {
          // Find the minimum pressure that is still higher than the required ppmax
          const options = pumpsWithPressure.filter(p => p.pressure > ppmax);
          
          if (options.length > 0) {
            const minViablePressure = Math.min(...options.map(p => p.pressure));
            
            console.log(`Closest higher pressure value: ${minViablePressure}`);
            
            if (!isNaN(minViablePressure) && isFinite(minViablePressure)) {
              // Get pumps with this pressure value
              matchingPumps = pumpsWithPressure.filter(p => 
                Math.abs(p.pressure - minViablePressure) < 0.001
              );
              
              console.log(`Found ${matchingPumps.length} alternative pumps with pressure ${minViablePressure}`);
            }
          }
        }
      }
      
      // Sort by pressure (ascending)
      const sortedPumps = [...matchingPumps].sort((a, b) => a.pressure - b.pressure);
      
      // Format results for this instance
      sortedPumps.forEach((pump, pumpIndex) => {
        results.push({
          type: pump.type,
          diameter: selectedDiameter,
          pressure: pump.pressure,
          flow: pump.flow,
          speed: pump.speed,
          price: pumpIndex + 1,  // Placeholder price based on index
          isRecommended: pumpIndex === 0, // Mark the lowest pressure pump as recommended
          instance: instanceNumber,
          ppmax: ppmax,
          isAlternative: useAlternatives
        });
      });
    });
    
    console.log(`Total results: ${results.length} pumps`);
    
    if (results.length === 0) {
      return NextResponse.json({ 
        results: [],
        message: 'No matching pumps found for any of the Ppmax values.' 
      });
    }
    
    return NextResponse.json({ 
      results,
      message: `Found ${results.length} pump${results.length > 1 ? 's' : ''} that match your criteria.` 
    });
    
  } catch (error) {
    console.error("Error in pump selection API:", error);
    return NextResponse.json({ 
      error: 'An error occurred while processing the pump selection.' 
    }, { status: 500 });
  }
} 