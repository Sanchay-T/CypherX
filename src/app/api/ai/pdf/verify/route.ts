import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Forward the form data directly to the backend
    const response = await fetch(`${BACKEND_URL}/ai/pdf/verify/`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", errorText);
      return NextResponse.json(
        { error: "Failed to upload PDF for verification" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error uploading PDF for verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const url = `${BACKEND_URL}/ai/pdf/verify/`;
    console.log("API Route: Fetching verification jobs from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Disable caching for real-time updates
    });

    console.log("API Route: Response status:", response.status);

    if (!response.ok) {
      console.error("API Route: Failed to fetch, status:", response.status);
      return NextResponse.json(
        { error: "Failed to fetch verification jobs" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("API Route: Received jobs count:", data.jobs?.length || 0);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching verification jobs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
