"use client";

import Link from "next/link";
import { useCallback } from "react";
import { ArrowRight, ClipboardCopy } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

type EndpointActionsProps = {
  path: string;
};

export function EndpointActions({ path }: EndpointActionsProps) {
  const { toast } = useToast();

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(path);
      toast({ title: "Copied", description: `${path} copied to clipboard.` });
    } catch {
      toast({ title: "Copy failed", description: "Unable to access clipboard.", variant: "destructive" });
    }
  }, [path, toast]);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="gap-2" onClick={copyToClipboard}>
        <ClipboardCopy className="size-4" />
        Copy path
      </Button>
      <Button variant="ghost" size="sm" asChild className="gap-1">
        <Link href={`/dashboard/explorer?endpoint=${encodeURIComponent(path)}`}>
          Open in explorer
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
