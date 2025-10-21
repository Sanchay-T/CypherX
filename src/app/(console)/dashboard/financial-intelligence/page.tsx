"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  DollarSign,
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
import { UploadStatementDialog } from "@/components/financial/upload-statement-dialog";
import { FinancialMetricsCards } from "@/components/financial/financial-metrics-cards";
import { ExpenseBreakdownChart } from "@/components/financial/expense-breakdown-chart";
import { AIInsightsPanel } from "@/components/financial/ai-insights-panel";
import { useToast } from "@/hooks/use-toast";

interface FinancialJob {
  job_id: string;
  file_name: string;
  status: "queued" | "running" | "completed" | "failed";
  overall_score?: number;
  verdict?: "approved" | "review" | "rejected";
  credit_limit?: number;
  confidence?: number;
  income_analysis?: any;
  expense_analysis?: any;
  risk_assessment?: any;
  ai_insights?: string[];
  recommendations?: any;
  created_at: string;
  updated_at?: string;
}

export default function FinancialIntelligencePage() {
  const [jobs, setJobs] = useState<FinancialJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<FinancialJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/ai/financial");
      const data = await response.json();
      setJobs(data.jobs || []);

      // Auto-select first completed job if none selected
      if (!selectedJob && data.jobs?.length > 0) {
        const completed = data.jobs.find((j: FinancialJob) => j.status === "completed");
        if (completed) {
          setSelectedJob(completed);
        }
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (jobId: string) => {
    setUploadDialogOpen(false);
    fetchJobs();
  };

  const handleJobSelect = async (jobId: string) => {
    try {
      const response = await fetch(`/api/ai/financial/${jobId}`);
      const job = await response.json();
      setSelectedJob(job);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load job details",
        variant: "destructive",
      });
    }
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

  const getVerdictBadge = (verdict?: string) => {
    if (!verdict) return null;

    const verdictConfig: Record<
      string,
      { variant: "default" | "secondary" | "destructive" }
    > = {
      approved: { variant: "default" },
      review: { variant: "secondary" },
      rejected: { variant: "destructive" },
    };

    const config = verdictConfig[verdict] || verdictConfig.review;

    return (
      <Badge variant={config.variant} className="capitalize">
        {verdict === "review" ? "Needs Review" : verdict}
      </Badge>
    );
  };

  return (
    <section className="space-y-8">
      <DashboardHeader
        title="Financial Intelligence"
        description="AI-powered bank statement analysis with instant credit assessment"
        actions={
          <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
            <Upload className="size-4" />
            Analyze Statement
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
            <DollarSign className="mb-4 size-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-foreground">
              No analyses yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Upload a processed bank statement to get instant financial intelligence,
              credit assessment, and AI-powered insights.
            </p>
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="mt-4"
            >
              <Upload className="mr-2 size-4" />
              Analyze Your First Statement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Results Section */}
          {selectedJob && selectedJob.status === "completed" && (
            <div className="space-y-6">
              {/* Metrics Cards */}
              <FinancialMetricsCards
                overallScore={selectedJob.overall_score || 0}
                verdict={selectedJob.verdict || "review"}
                creditLimit={selectedJob.credit_limit || 0}
                incomeAnalysis={selectedJob.income_analysis || {}}
                expenseAnalysis={selectedJob.expense_analysis || {}}
                riskAssessment={selectedJob.risk_assessment || {}}
              />

              {/* Charts and Insights */}
              <div className="grid gap-6 md:grid-cols-2">
                <ExpenseBreakdownChart
                  categories={selectedJob.expense_analysis?.categories || {}}
                />

                <Card>
                  <CardHeader>
                    <CardTitle>Income & Expense Summary</CardTitle>
                    <CardDescription>Monthly averages</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Income</span>
                        <span className="text-lg font-bold text-green-600">
                          ₹{(selectedJob.income_analysis?.monthly_average || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Expenses</span>
                        <span className="text-lg font-bold text-red-600">
                          ₹{(selectedJob.expense_analysis?.monthly_average || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="pt-4 border-t flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Net Savings</span>
                        <span className="text-lg font-bold text-blue-600">
                          ₹{((selectedJob.income_analysis?.monthly_average || 0) - (selectedJob.expense_analysis?.monthly_average || 0)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Insights */}
              <AIInsightsPanel
                aiInsights={selectedJob.ai_insights || []}
                riskAssessment={selectedJob.risk_assessment || {}}
                recommendations={selectedJob.recommendations || {}}
              />
            </div>
          )}

          {/* History Table */}
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Analysis History
              </CardTitle>
              <CardDescription>
                Click on any completed analysis to view details
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Verdict</TableHead>
                    <TableHead>Credit Limit</TableHead>
                    <TableHead>Analyzed At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow
                      key={job.job_id}
                      className={selectedJob?.job_id === job.job_id ? "bg-muted/50" : ""}
                    >
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
                        {job.overall_score !== undefined ? (
                          <span className="font-semibold">{job.overall_score}/100</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {job.status === "completed" ? getVerdictBadge(job.verdict) : "-"}
                      </TableCell>
                      <TableCell>
                        {job.credit_limit !== undefined && job.credit_limit !== null ? (
                          <span className="font-medium">
                            ₹{job.credit_limit.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(job.updated_at || job.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {job.status === "completed" ? (
                          <Button
                            size="sm"
                            variant={selectedJob?.job_id === job.job_id ? "default" : "outline"}
                            onClick={() => handleJobSelect(job.job_id)}
                          >
                            View Details
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
        </>
      )}
    </section>
  );
}
