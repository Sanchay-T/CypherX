import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: { job_id: string } }
) {
  try {
    const jobId = params.job_id;
    const response = await fetch(
      `${BACKEND_URL}/ai/pdf/verify/${jobId}/report`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", errorText);
      return NextResponse.json(
        { error: "Failed to download verification report" },
        { status: response.status }
      );
    }

    // Stream the PDF file back to the client
    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="verification_report_${jobId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error downloading verification report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
