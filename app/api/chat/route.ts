import { NextResponse } from 'next/server';

// Add this export configuration to mark the route as dynamic
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    try {
      const response = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) {
        console.error(`Flask server returned status: ${response.status}`);
        return NextResponse.json(
          { error: `Backend server error: ${response.status}` }, 
          { status: response.status }
        );
      }
      
      const data = await response.json();
      
      return NextResponse.json(data);
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to backend server', details: fetchError }, 
        { status: 500 }
      );
    }
  } catch (parseError) {
    console.error("JSON parse error:", parseError);
    return NextResponse.json(
      { error: 'Failed to process request', details: parseError}, 
      { status: 400 }
    );
  }
}