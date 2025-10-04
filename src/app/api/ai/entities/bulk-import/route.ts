import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const res = await fetch(`${BACKEND_URL}/ai/entities/bulk-import`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json(
        { error: error || "Failed to import entities" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      { error: "Failed to import entities" },
      { status: 500 }
    );
  }
}