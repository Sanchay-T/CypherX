import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET() {
  try {
    const url = `${BACKEND_URL}/ai/statements/`;
    console.log("API Route: Fetching from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",  // Disable caching
    });

    console.log("API Route: Response status:", response.status);

    if (!response.ok) {
      console.error("API Route: Failed to fetch, status:", response.status);
      return NextResponse.json(
        { error: "Failed to fetch statements" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("API Route: Received jobs count:", data.jobs?.length || 0);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching statements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}