'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { HADResults } from '@/utils/casingCalculations';

// Define types for calculation results
interface DrillCollarResult {
  section: string;
  atHead: number;
  nearestBitSize: number;
  drillCollars: string;
  bitSize: number;
  drillCollar: number;
  numberOfColumns: number;
  L0c?: number;
}

interface CalculationInstance {
  id: number;
  metalGrade: string;
  lmax: number;
}

// Define types for pump results
export interface PumpResult {
  type: string;
  diameter: number;
  pressure: number;
  flow: number;
  price: number;
  isRecommended: boolean;
  instance: number;
  ppmax: number;
  // Time factor fields
  tfc: number | null;
  tfd: number | null;
  tc: number | null;
  tad: number;
  isTimeAllowed: boolean | null;
  // New fields
  isAlternative?: boolean;
  speed?: number | null;
}

interface FileUploadContextType {
  // File state
  drillCollarFile: File | null;
  drillCollarFileName: string;
  casingFile: File | null;
  casingFileName: string;
  pumpFile: File | null;
  pumpFileName: string;
  setDrillCollarFile: (file: File | null) => void;
  setDrillCollarFileName: (name: string) => void;
  setCasingFile: (file: File | null) => void;
  setCasingFileName: (name: string) => void;
  setPumpFile: (file: File | null) => void;
  setPumpFileName: (name: string) => void;
  
  // Equation page results
  drillCollarResults: DrillCollarResult[];
  drillCollarCalculations: CalculationInstance[];
  setDrillCollarResults: (results: DrillCollarResult[]) => void;
  setDrillCollarCalculations: (calculations: CalculationInstance[]) => void;
  
  // Casing calculator results
  casingResults: any[];
  hadData: HADResults | null;
  setCasingResults: (results: any[]) => void;
  setHadData: (data: HADResults | null) => void;
  
  // Pump selection results
  pumpResults: PumpResult[];
  setPumpResults: (results: PumpResult[]) => void;
}

const FileUploadContext = createContext<FileUploadContextType | undefined>(undefined);

export function FileUploadProvider({ children }: { children: ReactNode }) {
  // File state
  const [drillCollarFile, setDrillCollarFile] = useState<File | null>(null);
  const [drillCollarFileName, setDrillCollarFileName] = useState<string>('');
  const [casingFile, setCasingFile] = useState<File | null>(null);
  const [casingFileName, setCasingFileName] = useState<string>('');
  const [pumpFile, setPumpFile] = useState<File | null>(null);
  const [pumpFileName, setPumpFileName] = useState<string>('');
  
  // Equation page results
  const [drillCollarResults, setDrillCollarResults] = useState<DrillCollarResult[]>([]);
  const [drillCollarCalculations, setDrillCollarCalculations] = useState<CalculationInstance[]>([]);
  
  // Casing calculator results
  const [casingResults, setCasingResults] = useState<any[]>([]);
  const [hadData, setHadData] = useState<HADResults | null>(null);
  
  // Pump selection results
  const [pumpResults, setPumpResultsInternal] = useState<PumpResult[]>([]);
  
  // Custom setter with logging for pump results
  const setPumpResults = (results: PumpResult[]) => {
    setPumpResultsInternal(results);
  };

  return (
    <FileUploadContext.Provider
      value={{
        // File state
        drillCollarFile,
        drillCollarFileName,
        casingFile,
        casingFileName,
        pumpFile,
        pumpFileName,
        setDrillCollarFile,
        setDrillCollarFileName,
        setCasingFile,
        setCasingFileName,
        setPumpFile,
        setPumpFileName,
        
        // Equation page results
        drillCollarResults,
        drillCollarCalculations,
        setDrillCollarResults,
        setDrillCollarCalculations,
        
        // Casing calculator results
        casingResults,
        hadData,
        setCasingResults,
        setHadData,
        
        // Pump selection results
        pumpResults,
        setPumpResults
      }}
    >
      {children}
    </FileUploadContext.Provider>
  );
}

export function useFileUpload() {
  const context = useContext(FileUploadContext);
  if (context === undefined) {
    throw new Error('useFileUpload must be used within a FileUploadProvider');
  }
  return context;
} 