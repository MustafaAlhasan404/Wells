'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';

type WellType = 'exploration' | 'production';

interface WellTypeContextType {
  wellType: WellType;
  setWellType: (type: WellType) => void;
  isFirstVisit: boolean;
  setIsFirstVisit: (value: boolean) => void;
}

const WellTypeContext = createContext<WellTypeContextType | undefined>(undefined);

export function WellTypeProvider({ children }: { children: ReactNode }) {
  // Default to production well type
  const [wellType, setWellType] = useState<WellType>('production');
  // Control whether to show the welcome screen
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(true);

  return (
    <WellTypeContext.Provider
      value={{
        wellType,
        setWellType,
        isFirstVisit,
        setIsFirstVisit
      }}
    >
      {children}
    </WellTypeContext.Provider>
  );
}

export function useWellType() {
  const context = useContext(WellTypeContext);
  if (context === undefined) {
    throw new Error('useWellType must be used within a WellTypeProvider');
  }
  return context;
} 