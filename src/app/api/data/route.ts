import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const dataFilePath = path.join(process.cwd(), 'saved_data.json')

// Helper function to read data
const readData = () => {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf8')
      return JSON.parse(data)
    }
    return {}
  } catch (error) {
    console.error('Error reading data file:', error)
    return {}
  }
}

// Helper function to write data
const writeData = (data: any) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data))
    return true
  } catch (error) {
    console.error('Error writing data file:', error)
    return false
  }
}

// GET handler
export async function GET() {
  const data = readData()
  return NextResponse.json(data)
}

// POST handler
export async function POST(request: Request) {
  try {
    const data = await request.json()
    const success = writeData(data)
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Data saved successfully' })
    } else {
      return NextResponse.json(
        { success: false, message: 'Failed to save data' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in POST handler:', error)
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
} 