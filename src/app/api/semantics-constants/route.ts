import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Constants file path
const dataDir = path.join(process.cwd(), 'data');
const constantsFile = path.join(dataDir, 'semantics-constants.json');

// Default constants
const defaultConstants = {
  K1: 0.25,
  K2: 0.15
};

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize file if it doesn't exist
if (!fs.existsSync(constantsFile)) {
  fs.writeFileSync(constantsFile, JSON.stringify(defaultConstants, null, 2));
}

// GET handler - Get constants
export async function GET() {
  try {
    // Read constants from file
    const constantsData = fs.readFileSync(constantsFile, 'utf-8');
    const constants = JSON.parse(constantsData);
    
    return NextResponse.json(constants);
  } catch (error) {
    console.error('Error loading constants:', error);
    
    // If there's an error, return default constants
    return NextResponse.json(defaultConstants);
  }
}

// POST handler - Update constants
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate input
    const K1 = parseFloat(data.K1);
    const K2 = parseFloat(data.K2);
    
    if (isNaN(K1) || isNaN(K2)) {
      return NextResponse.json(
        { error: 'Invalid input: K1 and K2 must be valid numbers' },
        { status: 400 }
      );
    }
    
    // Update constants
    const constants = { K1, K2 };
    
    // Save to file
    fs.writeFileSync(constantsFile, JSON.stringify(constants, null, 2));
    
    return NextResponse.json(constants);
  } catch (error) {
    console.error('Error updating constants:', error);
    
    return NextResponse.json(
      { error: 'Failed to update constants' },
      { status: 500 }
    );
  }
} 