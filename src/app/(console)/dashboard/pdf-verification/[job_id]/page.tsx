"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Download,
  Loader2,
  ArrowLeft,
  FileText,
  Calendar,
  Hash,
} from "lucide-react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RiskScoreCard } from "@/components/pdf-verification/risk-score-card";
import { FindingsTable } from "@/components/pdf-verification/findings-table";
import { useToast } from "@/hooks/use-toast";

interface VerificationJob {
  job_id: string;
  file_name: string;
  status: "queued" | "running" | "completed" | "failed";
  risk_score?: number;
  overall_verdict?: "verified" | "suspicious" | "fraudulent";
  findings?: any[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  error?: string;
}

export default function VerificationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [job, setJob] = useState<VerificationJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const jobId = params.job_id as string;

  useEffect(() => {
    if (!jobId) return;

    fetchJobDetails();

    // Poll for updates every 5 seconds if not completed
    const interval = setInterval(() => {
      if (job?.status !== "completed" && job?.status !== "failed") {
        fetchJobDetails();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [jobId, job?.status]);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`/api/ai/pdf/verify/${jobId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch job details");
      }
      const data = await response.json();
      setJob(data);
    } catch (error) {
      console.error("Failed to fetch job details:", error);
      toast({
        title: "Error",
        description: "Failed to load verification details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!jobId) return;

    setDownloading(true);
    try {
      const response = await fetch(`/api/ai/pdf/verify/${jobId}/report`);
      if (!response.ok) {
        throw new Error("Failed to download report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `verification_report_${jobId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download started",
        description: "Your verification report is being downloaded.",
      });
    } catch (error) {
      console.error("Failed to download report:", error);
      toast({
        title: "Download failed",
        description: "Failed to download verification report",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <section className="space-y-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!job) {
    return (
      <section className="space-y-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-4 size-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-foreground">
              Verification job not found
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/dashboard/pdf-verification")}
            >
              <ArrowLeft className="mr-2 size-4" />
              Back to Verification List
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  const isProcessing = job.status === "running" || job.status === "queued";
  const isFailed = job.status === "failed";

  return (
    <section className="space-y-8">
      <DashboardHeader
        title="Verification Results"
        description={`Detailed verification findings for: ${job.file_name}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/pdf-verification")}
            >
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
            {job.status === "completed" && (
              <Button onClick={handleDownloadReport} disabled={downloading}>
                {downloading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 size-4" />
                    Download Report
                  </>
                )}
              </Button>
            )}
          </div>
        }
      />

      {/* Processing State */}
      {isProcessing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-3 py-6">
            <Loader2 className="size-6 animate-spin text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">
                Verification in progress...
              </p>
              <p className="text-sm text-blue-700">
                This usually takes a few seconds. Results will appear
                automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed State */}
      {isFailed && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="font-medium text-red-900">
                  Verification failed
                </p>
                <p className="text-sm text-red-700 mt-1">
                  {job.error || "An error occurred during verification"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed State */}
      {job.status === "completed" && (
        <>
          {/* Risk Score Card */}
          <RiskScoreCard
            riskScore={job.risk_score || 0}
            verdict={job.overall_verdict || "suspicious"}
            fileName={job.file_name}
          />

          {/* Job Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Job Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-600">Job ID</p>
                  <p className="font-mono text-xs">{job.job_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-600">Verified At</p>
                  <p className="text-xs">
                    {new Date(job.updated_at || job.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-600">File Name</p>
                  <p className="text-xs truncate">{job.file_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Findings */}
          {job.findings && job.findings.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Verification Findings
              </h2>
              <FindingsTable findings={job.findings} />
            </div>
          )}

          {/* PDF Metadata */}
          {job.metadata && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Document Metadata
                </CardTitle>
                <CardDescription>
                  Technical details extracted from the PDF document
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(job.metadata).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-600">
                        {key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                      <span className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                        {typeof value === "boolean"
                          ? value
                            ? "Yes"
                            : "No"
                          : String(value) || "N/A"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </section>
  );
}
