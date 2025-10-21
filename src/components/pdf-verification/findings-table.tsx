"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Finding {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "PASS" | "FAIL";
  details: string;
  evidence?: Record<string, any>;
}

interface FindingsTableProps {
  findings: Finding[];
}

const severityConfig = {
  CRITICAL: {
    color: "text-red-700",
    bgColor: "bg-red-100",
    borderColor: "border-red-300",
    icon: XCircle,
  },
  HIGH: {
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-300",
    icon: AlertTriangle,
  },
  MEDIUM: {
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300",
    icon: AlertCircle,
  },
  LOW: {
    color: "text-green-700",
    bgColor: "bg-green-100",
    borderColor: "border-green-300",
    icon: CheckCircle2,
  },
};

function FindingRow({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[finding.severity];
  const Icon = config.icon;
  const hasEvidence = finding.evidence && Object.keys(finding.evidence).length > 0;

  return (
    <>
      <TableRow
        className={`cursor-pointer hover:bg-gray-50 ${
          finding.status === "FAIL" ? "bg-red-50/30" : ""
        }`}
        onClick={() => hasEvidence && setExpanded(!expanded)}
      >
        <TableCell className="w-8">
          {hasEvidence ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )
          ) : (
            <div className="w-4" />
          )}
        </TableCell>
        <TableCell className="w-8">
          {finding.status === "PASS" ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
        </TableCell>
        <TableCell className="font-medium">
          {finding.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
        </TableCell>
        <TableCell>
          <Badge
            variant={finding.status === "FAIL" ? "destructive" : "default"}
            className={`${config.bgColor} ${config.color} border ${config.borderColor}`}
          >
            <Icon className="h-3 w-3 mr-1" />
            {finding.severity}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={finding.status === "PASS" ? "outline" : "destructive"}>
            {finding.status}
          </Badge>
        </TableCell>
        <TableCell className="text-sm text-gray-700 max-w-md">
          {finding.details}
        </TableCell>
      </TableRow>
      {expanded && hasEvidence && (
        <TableRow className="bg-gray-50">
          <TableCell colSpan={6} className="py-4">
            <div className="ml-8 space-y-2">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Evidence Details
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                {Object.entries(finding.evidence).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-sm">
                    <span className="font-medium text-gray-700 min-w-[120px]">
                      {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}:
                    </span>
                    <span className="text-gray-900 font-mono text-xs bg-gray-50 px-2 py-0.5 rounded">
                      {typeof value === "object"
                        ? JSON.stringify(value, null, 2)
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function FindingsTable({ findings }: FindingsTableProps) {
  const failedFindings = findings.filter((f) => f.status === "FAIL");
  const passedFindings = findings.filter((f) => f.status === "PASS");

  return (
    <div className="space-y-6">
      {/* Failed Findings */}
      {failedFindings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-red-700 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Failed Checks ({failedFindings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Check Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedFindings
                  .sort((a, b) => {
                    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                    return severityOrder[a.severity] - severityOrder[b.severity];
                  })
                  .map((finding, index) => (
                    <FindingRow key={index} finding={finding} />
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Passed Findings */}
      {passedFindings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Passed Checks ({passedFindings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Check Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passedFindings.map((finding, index) => (
                  <FindingRow key={index} finding={finding} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {findings.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No findings available
          </CardContent>
        </Card>
      )}
    </div>
  );
}
