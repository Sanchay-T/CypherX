"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  AlertTriangle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UploadVerificationDialog } from "@/components/pdf-verification/upload-verification-dialog";

interface VerificationJob {
  job_id: string;
  file_name: string;
  status: "queued" | "running" | "completed" | "failed";
  risk_score?: number;
  overall_verdict?: "verified" | "suspicious" | "fraudulent";
  created_at: string;
  updated_at?: string;
}

export default function PdfVerificationPage() {
  const [jobs, setJobs] = useState<VerificationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  useEffect(() => {
    fetchJobs();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/ai/pdf/verify");
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Failed to fetch verification jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (jobId: string) => {
    setUploadDialogOpen(false);
    fetchJobs(); // Refresh the job list
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="size-4 text-green-600" />;
      case "failed":
        return <XCircle className="size-4 text-red-600" />;
      case "running":
        return <Loader2 className="size-4 animate-spin text-blue-600" />;
      default:
        return <Clock className="size-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      completed: "default",
      running: "secondary",
      failed: "destructive",
      queued: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  const getVerdictBadge = (verdict?: string, riskScore?: number) => {
    if (!verdict) return null;

    const verdictConfig: Record<
      string,
      { variant: "default" | "secondary" | "destructive"; icon: any }
    > = {
      verified: { variant: "default", icon: CheckCircle2 },
      suspicious: { variant: "secondary", icon: AlertTriangle },
      fraudulent: { variant: "destructive", icon: XCircle },
    };

    const config = verdictConfig[verdict] || verdictConfig.suspicious;
    const Icon = config.icon;

    return (
      <div className="flex items-center gap-2">
        <Badge variant={config.variant} className="capitalize gap-1">
          <Icon className="size-3" />
          {verdict}
        </Badge>
        {riskScore !== undefined && (
          <span className="text-xs text-muted-foreground font-mono">
            {riskScore}/100
          </span>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-8">
      <DashboardHeader
        title="PDF Document Verification"
        description="Verify PDF authenticity and detect potential tampering or manipulation."
        actions={
          <Button
            onClick={() => setUploadDialogOpen(true)}
            className="gap-2"
          >
            <Upload className="size-4" />
            Verify PDF
          </Button>
        }
      />

      <UploadVerificationDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={handleUploadSuccess}
      />

      {loading ? (
        <Card className="border-border/70">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : jobs.length === 0 ? (
        <Card className="border-border/70">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="mb-4 size-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-foreground">
              No documents verified yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload a PDF document to verify its authenticity and detect
              potential tampering.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Verification History
            </CardTitle>
            <CardDescription>
              Click on any completed verification to view detailed findings and
              download the report.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Verdict</TableHead>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Verified At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.job_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        {getStatusBadge(job.status)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {job.file_name || "Processing..."}
                    </TableCell>
                    <TableCell>
                      {job.status === "completed"
                        ? getVerdictBadge(job.overall_verdict, job.risk_score)
                        : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {job.job_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {job.updated_at
                        ? new Date(job.updated_at).toLocaleString()
                        : new Date(job.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {job.status === "completed" ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/pdf-verification/${job.job_id}`}>
                            View Results
                          </Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled>
                          {job.status === "running"
                            ? "Verifying..."
                            : "Unavailable"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
