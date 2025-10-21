"use client";

import { TrendingUp, TrendingDown, DollarSign, PieChart, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FinancialMetricsCardsProps {
  overallScore: number;
  verdict: string;
  creditLimit: number;
  incomeAnalysis: {
    monthly_average: number;
    stability_score: number;
  };
  expenseAnalysis: {
    monthly_average: number;
  };
  riskAssessment: {
    risk_level: string;
    fraud_score: number;
  };
}

export function FinancialMetricsCards({
  overallScore,
  verdict,
  creditLimit,
  incomeAnalysis,
  expenseAnalysis,
  riskAssessment,
}: FinancialMetricsCardsProps) {
  const savingsRate = incomeAnalysis.monthly_average > 0
    ? ((incomeAnalysis.monthly_average - expenseAnalysis.monthly_average) / incomeAnalysis.monthly_average) * 100
    : 0;

  const verdictConfig: Record<string, { color: string; label: string; variant: "default" | "secondary" | "destructive" }> = {
    approved: { color: "text-green-700", label: "APPROVED", variant: "default" },
    review: { color: "text-amber-700", label: "NEEDS REVIEW", variant: "secondary" },
    rejected: { color: "text-red-700", label: "REJECTED", variant: "destructive" },
  };

  const config = verdictConfig[verdict] || verdictConfig.review;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Overall Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Financial Score
          </CardTitle>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overallScore}/100</div>
          <Badge variant={config.variant} className="mt-2">
            {config.label}
          </Badge>
          <p className="text-xs text-muted-foreground mt-2">
            Based on income, expenses & risk
          </p>
        </CardContent>
      </Card>

      {/* Monthly Income */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Monthly Income
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ₹{incomeAnalysis.monthly_average.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Stability: {incomeAnalysis.stability_score}/100
          </p>
          <div className="mt-2 h-1 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500"
              style={{ width: `${incomeAnalysis.stability_score}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Monthly Expenses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Monthly Expenses
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ₹{expenseAnalysis.monthly_average.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Savings: {savingsRate.toFixed(0)}% of income
          </p>
          <div className="mt-2 h-1 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${Math.min(100, savingsRate)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Credit Limit */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Credit Recommendation
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ₹{creditLimit.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Risk Level: {riskAssessment.risk_level}
          </p>
          {riskAssessment.risk_level === "HIGH" && (
            <div className="flex items-center gap-1 mt-2 text-red-600">
              <AlertCircle className="h-3 w-3" />
              <span className="text-xs">Manual review required</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
