"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Loader2, X, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UploadVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (jobId: string) => void;
}

export function UploadVerificationDialog({
  open,
  onOpenChange,
  onSuccess,
}: UploadVerificationDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
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
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

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
        description: "Please select a PDF file to verify",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ai/pdf/verify", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload PDF for verification");
      }

      const data = await response.json();

      toast({
        title: "Upload successful",
        description:
          "Your PDF is being verified. Results will be available shortly.",
      });

      // Reset form
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onSuccess(data.job_id);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <DialogTitle>Verify PDF Document</DialogTitle>
          </div>
          <DialogDescription>
            Upload a PDF document to verify its authenticity and detect any
            potential tampering or manipulation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Drop Zone */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : file
                  ? "border-green-500 bg-green-50"
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div className="space-y-2">
                <FileText className="h-12 w-12 text-green-600 mx-auto" />
                <div className="flex items-center justify-center gap-2">
                  <p className="text-sm font-medium text-gray-700">
                    {file.name}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Drop your PDF here or click to browse
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supports PDF files only
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Information Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>What we check:</strong> Document metadata, creation/modification dates,
              software used, and authenticity indicators
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Verify Document
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
