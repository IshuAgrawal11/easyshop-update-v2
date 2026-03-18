import { NextResponse } from "next/server";

export async function GET() {
  // Return a simple 200 OK response with a timestamp.
  // We intentionally do NOT connect to the database here.
  return NextResponse.json(
    { 
      status: "healthy", 
      message: "Easyshop API is running smoothly",
      timestamp: new Date().toISOString() 
    },
    { status: 200 }
  );
}