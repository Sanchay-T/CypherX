"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, Clock, CheckCircle2, XCircle, Loader2, Upload } from "lucide-react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UploadStatementDialog } from "@/components/statements/upload-statement-dialog";

interface StatementJob {
  job_id: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: {
    file_name?: string;
    completed_at?: string;
    sheets_data?: Record<string, any[]>;
  };
  created_at: string;
}

export default function StatementsPage() {
  const [jobs, setJobs] = useState<StatementJob[]>([]);
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
      const response = await fetch("/api/ai/statements");
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
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
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      running: "secondary",
      failed: "destructive",
      pending: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  return (
    <section className="space-y-8">
      <DashboardHeader
        title="Analyzed Statements"
        description="View and explore bank statement analysis results with interactive Excel-like tables."
        actions={
          <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
            <Upload className="size-4" />
            Upload Statement
          </Button>
        }
      />

      <UploadStatementDialog
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
            <FileSpreadsheet className="mb-4 size-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-foreground">No statements analyzed yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload a bank statement PDF to get started with AI-powered analysis.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Statement Analysis History</CardTitle>
            <CardDescription>Click on any completed statement to view detailed Excel-like data.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Completed At</TableHead>
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
                      {job.result?.file_name || "Processing..."}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {job.job_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {job.result?.completed_at
                        ? new Date(job.result.completed_at).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {job.status === "completed" && job.result?.excel?.path ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/statements/${job.job_id}`}>View Data</Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled>
                          {job.status === "running" ? "Processing..." : "Unavailable"}
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