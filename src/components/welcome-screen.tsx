'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MountainIcon, Cog, Beaker } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useWellType } from '@/context/WellTypeContext';

export function WelcomeScreen() {
  const router = useRouter();
  const { setWellType, setIsFirstVisit } = useWellType();
  const [selectedType, setSelectedType] = useState<'exploration' | 'production' | null>(null);
  
  const handleSelection = (type: 'exploration' | 'production') => {
    setSelectedType(type);
  };
  
  const handleContinue = () => {
    if (selectedType) {
      setWellType(selectedType);
      setIsFirstVisit(false);
      router.push('/casing-calculator');
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="flex items-center mb-8">
        <MountainIcon className="h-12 w-12 text-primary mr-4" />
        <h1 className="text-4xl font-bold">Deep Drill</h1>
      </div>
      
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold mb-2">Welcome to Deep Drill</h2>
        <p className="text-lg text-muted-foreground">Choose the type of well you want to design</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        <Card 
          className={`cursor-pointer transition-all ${selectedType === 'exploration' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
          onClick={() => handleSelection('exploration')}
        >
          <CardHeader className="text-center">
            <Beaker className="h-12 w-12 mx-auto mb-2 text-primary" />
            <CardTitle>Exploration Well</CardTitle>
            <CardDescription>For exploration and investigation purposes</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="font-medium mr-2">•</span>
                <span>Fixed γ value of 1.08 in formation design</span>
              </li>
              <li className="flex items-start">
                <span className="font-medium mr-2">•</span>
                <span>Simplified design process</span>
              </li>
              <li className="flex items-start">
                <span className="font-medium mr-2">•</span>
                <span>Optimized for exploration purposes</span>
              </li>
            </ul>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all ${selectedType === 'production' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
          onClick={() => handleSelection('production')}
        >
          <CardHeader className="text-center">
            <Cog className="h-12 w-12 mx-auto mb-2 text-primary" />
            <CardTitle>Production Well</CardTitle>
            <CardDescription>For production and extraction operations</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="font-medium mr-2">•</span>
                <span>Custom γ value in formation design</span>
              </li>
              <li className="flex items-start">
                <span className="font-medium mr-2">•</span>
                <span>Advanced configuration options</span>
              </li>
              <li className="flex items-start">
                <span className="font-medium mr-2">•</span>
                <span>Optimized for production purposes</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
      
      <Button 
        className="mt-8 px-8"
        size="lg"
        onClick={handleContinue}
        disabled={!selectedType}
      >
        Continue
      </Button>
    </div>
  );
} 