"use client";

import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AIInsightsPanelProps {
  aiInsights: string[];
  riskAssessment: {
    risk_level: string;
    warnings: string[];
    red_flags: string[];
  };
  recommendations: {
    credit_card_limit: number;
    loan_eligibility: number;
    investment_capacity: number;
  };
}

export function AIInsightsPanel({
  aiInsights,
  riskAssessment,
  recommendations,
}: AIInsightsPanelProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* AI Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <CardTitle>AI Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiInsights && aiInsights.length > 0 ? (
            aiInsights.map((insight, index) => (
              <div key={index} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">{insight}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No insights available</p>
          )}

          {/* Risk Warnings */}
          {riskAssessment.warnings && riskAssessment.warnings.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">Warnings</span>
              </div>
              {riskAssessment.warnings.map((warning, index) => (
                <div key={index} className="text-sm text-amber-700 ml-6 mb-1">
                  • {warning}
                </div>
              ))}
            </div>
          )}

          {/* Red Flags */}
          {riskAssessment.red_flags && riskAssessment.red_flags.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">Red Flags</span>
              </div>
              {riskAssessment.red_flags.map((flag, index) => (
                <div key={index} className="text-sm text-red-700 ml-6 mb-1">
                  • {flag}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <CardTitle>Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Credit Card Limit</span>
              <Badge variant="outline">
                ₹{recommendations.credit_card_limit.toLocaleString('en-IN')}
              </Badge>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-2/5" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Loan Eligibility</span>
              <Badge variant="outline" className="bg-green-50">
                ₹{recommendations.loan_eligibility.toLocaleString('en-IN')}
              </Badge>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 w-4/5" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Investment Capacity</span>
              <Badge variant="outline" className="bg-purple-50">
                ₹{recommendations.investment_capacity.toLocaleString('en-IN')}
              </Badge>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 w-3/5" />
            </div>
          </div>

          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-900">
              <strong>Note:</strong> These recommendations are based on your financial history
              and current income/expense patterns. Actual approval depends on additional factors.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
