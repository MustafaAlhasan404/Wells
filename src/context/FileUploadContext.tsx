'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define types for calculation results
interface DrillCollarResult {
  section: string;
  atHead: number;
  nearestBitSize: number;
  drillCollars: string;
}

interface CalculationInstance {
  id: number;
  metalGrade: string;
  lmax: number;
}

interface FileUploadContextType {
  // File state
  drillCollarFile: File | null;
  drillCollarFileName: string;
  casingFile: File | null;
  casingFileName: string;
  setDrillCollarFile: (file: File | null) => void;
  setDrillCollarFileName: (name: string) => void;
  setCasingFile: (file: File | null) => void;
  setCasingFileName: (name: string) => void;
  
  // Equation page results
  drillCollarResults: DrillCollarResult[];
  drillCollarCalculations: CalculationInstance[];
  setDrillCollarResults: (results: DrillCollarResult[]) => void;
  setDrillCollarCalculations: (calculations: CalculationInstance[]) => void;
  
  // Casing calculator results
  casingResults: any[];
  hadData: any;
  setCasingResults: (results: any[]) => void;
  setHadData: (data: any) => void;
}

const FileUploadContext = createContext<FileUploadContextType | undefined>(undefined);

export function FileUploadProvider({ children }: { children: ReactNode }) {
  // File state
  const [drillCollarFile, setDrillCollarFile] = useState<File | null>(null);
  const [drillCollarFileName, setDrillCollarFileName] = useState<string>('');
  const [casingFile, setCasingFile] = useState<File | null>(null);
  const [casingFileName, setCasingFileName] = useState<string>('');
  
  // Equation page results
  const [drillCollarResults, setDrillCollarResults] = useState<DrillCollarResult[]>([]);
  const [drillCollarCalculations, setDrillCollarCalculations] = useState<CalculationInstance[]>([]);
  
  // Casing calculator results
  const [casingResults, setCasingResults] = useState<any[]>([]);
  const [hadData, setHadData] = useState<any>(null);

  return (
    <FileUploadContext.Provider
      value={{
        // File state
        drillCollarFile,
        drillCollarFileName,
        casingFile,
        casingFileName,
        setDrillCollarFile,
        setDrillCollarFileName,
        setCasingFile,
        setCasingFileName,
        
        // Equation page results
        drillCollarResults,
        drillCollarCalculations,
        setDrillCollarResults,
        setDrillCollarCalculations,
        
        // Casing calculator results
        casingResults,
        hadData,
        setCasingResults,
        setHadData
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