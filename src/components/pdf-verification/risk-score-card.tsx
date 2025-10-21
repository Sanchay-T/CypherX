"use client";

import { Shield, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RiskScoreCardProps {
  riskScore: number;
  verdict: "verified" | "suspicious" | "fraudulent";
  fileName: string;
}

const verdictConfig = {
  verified: {
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    label: "VERIFIED",
    icon: CheckCircle,
    badgeVariant: "default" as const,
    description: "No tampering detected. Document appears authentic.",
  },
  suspicious: {
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    label: "SUSPICIOUS",
    icon: AlertTriangle,
    badgeVariant: "destructive" as const,
    description: "Minor inconsistencies found. Manual review recommended.",
  },
  fraudulent: {
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "FRAUDULENT",
    icon: XCircle,
    badgeVariant: "destructive" as const,
    description: "Clear signs of manipulation detected. Document authenticity compromised.",
  },
};

export function RiskScoreCard({ riskScore, verdict, fileName }: RiskScoreCardProps) {
  const config = verdictConfig[verdict] || verdictConfig.suspicious;
  const Icon = config.icon;

  // Calculate color gradient for risk score bar
  const getScoreColor = (score: number) => {
    if (score <= 30) return "bg-green-500";
    if (score <= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <Card className={`${config.borderColor} border-2`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Verification Result
          </CardTitle>
          <Badge
            variant={config.badgeVariant}
            className="text-sm font-bold px-3 py-1"
          >
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Verdict Section */}
        <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4`}>
          <div className="flex items-start gap-3">
            <Icon className={`h-6 w-6 ${config.color} flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <h3 className={`${config.color} font-semibold text-base mb-1`}>
                {config.label}
              </h3>
              <p className="text-sm text-gray-700">{config.description}</p>
            </div>
          </div>
        </div>

        {/* Risk Score Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Risk Score
            </span>
            <span className="text-2xl font-bold text-gray-900">
              {riskScore}/100
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getScoreColor(riskScore)} transition-all duration-500 ease-out`}
                style={{ width: `${riskScore}%` }}
              />
            </div>
            {/* Scale markers */}
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>0</span>
              <span>30</span>
              <span>60</span>
              <span>100</span>
            </div>
          </div>

          {/* Risk level indicators */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-gray-600">0-30: Safe</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-500 rounded-full" />
              <span className="text-gray-600">31-60: Caution</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-gray-600">61+: Critical</span>
            </div>
          </div>
        </div>

        {/* File Info */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Shield className="h-4 w-4" />
            <span className="font-medium">File:</span>
            <span className="truncate">{fileName}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
