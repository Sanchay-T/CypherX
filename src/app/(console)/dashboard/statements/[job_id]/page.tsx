"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import Link from "next/link";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExcelTable } from "@/components/statements/excel-table";

interface JobResult {
  job_id: string;
  status: string;
  result?: {
    file_name?: string;
    sheets_data?: Record<string, any[]>;
    excel?: {
      path?: string;
      download_token?: string;
    };
    completed_at?: string;
  };
}

export default function StatementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.job_id as string;

  const [job, setJob] = useState<JobResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      // First get job status
      const statusResponse = await fetch(`/api/ai/statements/${jobId}`);
      if (!statusResponse.ok) {
        throw new Error("Failed to fetch job details");
      }
      const jobData = await statusResponse.json();

      // If completed and has Excel, fetch the Excel data
      if (jobData.status === "completed" && jobData.result?.excel?.download_token) {
        const token = jobData.result.excel.download_token;
        const excelResponse = await fetch(`/api/ai/statements/${jobId}/excel-data?token=${token}`);
        if (excelResponse.ok) {
          const excelData = await excelResponse.json();
          jobData.result.sheets_data = excelData.sheets;
        }
      }

      setJob(jobData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (job?.result?.excel?.download_token) {
      window.open(`/api/ai/statements/${jobId}/excel?token=${job.result.excel.download_token}`, "_blank");
    }
  };

  if (loading) {
    return (
      <section className="space-y-8">
        <DashboardHeader title="Loading..." description="Fetching statement data..." />
        <Card className="border-border/70">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </section>
    );
  }

  if (error || !job) {
    return (
      <section className="space-y-8">
        <DashboardHeader title="Error" description="Failed to load statement data" />
        <Card className="border-border/70">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-destructive">{error || "Job not found"}</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/dashboard/statements">
                <ArrowLeft className="mr-2 size-4" />
                Back to Statements
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  const sheetsData = job.result?.sheets_data || {};
  const sheetNames = Object.keys(sheetsData);

  return (
    <section className="space-y-8">
      <DashboardHeader
        title={job.result?.file_name || "Statement Details"}
        description={`Job ID: ${jobId} • Completed: ${
          job.result?.completed_at ? new Date(job.result.completed_at).toLocaleString() : "N/A"
        }`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/statements">
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Link>
            </Button>
            <Button size="sm" onClick={handleDownloadExcel} className="gap-2">
              <Download className="size-4" />
              Download Excel
            </Button>
          </div>
        }
      />

      {sheetNames.length === 0 ? (
        <Card className="border-border/70">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileSpreadsheet className="mb-4 size-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-foreground">No sheet data available</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This statement may still be processing or encountered an error.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Statement Data</CardTitle>
            <CardDescription>
              View analyzed data in Excel-like format. Switch between sheets using the tabs below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={sheetNames[0]} className="w-full">
              <TabsList className="mb-4 w-full justify-start overflow-x-auto">
                {sheetNames.map((sheetName) => (
                  <TabsTrigger key={sheetName} value={sheetName} className="gap-2">
                    <FileSpreadsheet className="size-3" />
                    {sheetName}
                  </TabsTrigger>
                ))}
              </TabsList>
              {sheetNames.map((sheetName) => (
                <TabsContent key={sheetName} value={sheetName} className="mt-0">
                  <ExcelTable data={sheetsData[sheetName]} sheetName={sheetName} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </section>
  );
}