"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface UploadStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (jobId: string) => void;
}

const FINANCIAL_YEARS = [
  "2020-2021",
  "2021-2022",
  "2022-2023",
  "2023-2024",
  "2024-2025",
  "2025-2026",
];

export function UploadStatementDialog({ open, onOpenChange, onSuccess }: UploadStatementDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState("");
  const [password, setPassword] = useState("");
  const [financialYear, setFinancialYear] = useState("");
  const [reportPrompt, setReportPrompt] = useState("");
  const [reportTemplate, setReportTemplate] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file",
          variant: "destructive",
        });
        return;
      }
      setFile(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (bankName) {
        formData.append("bank_name", bankName);
      }
      if (password) {
        formData.append("password", password);
      }
      if (financialYear) {
        formData.append("financial_year", financialYear);
      }
      if (reportPrompt) {
        formData.append("report_prompt", reportPrompt);
      }
      if (reportTemplate) {
        formData.append("report_template", reportTemplate);
      }

      const response = await fetch("/api/ai/statements/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload statement");
      }

      const data = await response.json();

      toast({
        title: "Upload successful",
        description: "Your statement is being processed. This may take a few moments.",
      });

      // Reset form
      setFile(null);
      setBankName("");
      setPassword("");
      setFinancialYear("");
      setReportPrompt("");
      setReportTemplate("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onSuccess(data.job_id);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload statement",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setBankName("");
      setPassword("");
      setFinancialYear("");
      setReportPrompt("");
      setReportTemplate("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Bank Statement</DialogTitle>
          <DialogDescription>
            Upload a bank statement PDF for AI-powered analysis and Excel extraction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload Area */}
          <div className="space-y-2">
            <Label htmlFor="file">Statement PDF *</Label>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-muted/20 p-8 transition-colors hover:border-border hover:bg-muted/40"
            >
              <input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                disabled={uploading}
              />

              {file ? (
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="size-8 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    disabled={uploading}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto mb-2 size-10 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    Drop your PDF here or click to browse
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Only PDF files are supported
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bank Statement Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name (Optional)</Label>
              <Input
                id="bankName"
                placeholder="E.g., HDFC, ICICI, Axis..."
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                disabled={uploading}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">PDF Password (Optional)</Label>
              <Input
                id="password"
                type="password"
                placeholder="If PDF is password-protected"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={uploading}
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="financialYear">Financial Year (Optional)</Label>
            <Select value={financialYear} onValueChange={setFinancialYear} disabled={uploading}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select financial year..." />
              </SelectTrigger>
              <SelectContent>
                {FINANCIAL_YEARS.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Indian FY (Apr 1 - Mar 31). E.g., 2022-2023 means Apr 1, 2022 to Mar 31, 2023
            </p>
          </div>

          {/* Optional AI Report Fields */}
          <div className="space-y-2">
            <Label htmlFor="reportPrompt">Custom Report Instructions (Optional)</Label>
            <Textarea
              id="reportPrompt"
              placeholder="E.g., Focus on cash flow health, risk flags, and customer insights..."
              value={reportPrompt}
              onChange={(e) => setReportPrompt(e.target.value)}
              rows={3}
              disabled={uploading}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Provide specific instructions for AI report generation
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportTemplate">Report Template (Optional)</Label>
            <Input
              id="reportTemplate"
              placeholder="standard, lending_india, etc."
              value={reportTemplate}
              onChange={(e) => setReportTemplate(e.target.value)}
              disabled={uploading}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Choose a report template: <code className="text-xs">standard</code> or{" "}
              <code className="text-xs">lending_india</code>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading} className="gap-2">
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="size-4" />
                Upload & Analyze
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}