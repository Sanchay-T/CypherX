"use client"

import type { DragEvent } from "react"

import { FileText } from "lucide-react"

import { cn } from "@/lib/utils"

export const SAMPLE_DRAG_TYPE = "application/x-cypherx-sample-url"

export type SampleStatementMeta = {
  id: string
  label: string
  description: string
  url: string
  institution: string
}

export const SAMPLE_STATEMENTS: SampleStatementMeta[] = [
  {
    id: "axis-classic",
    label: "Axis Bank · Retail",
    description: "Clean single-page monthly summary.",
    url: "/samples/axis.pdf",
    institution: "Axis Bank",
  },
  {
    id: "sbi-corporate",
    label: "SBI · Corporate",
    description: "High-volume statement with mixed formats.",
    url: "/samples/81-100-3.pdf",
    institution: "State Bank of India",
  },
  {
    id: "hdfc-mar",
    label: "HDFC · Premier",
    description: "Quarterly extract with annex tables.",
    url: "/samples/hdfc-2025.pdf",
    institution: "HDFC Bank",
  },
  {
    id: "icici-mar",
    label: "ICICI · SME",
    description: "Unlocked SME statement with multi-section layout.",
    url: "/samples/icici-2025.pdf",
    institution: "ICICI Bank",
  },
  {
    id: "axis-legacy",
    label: "Axis Bank · Legacy",
    description: "Legacy layout showcasing dense transaction tables.",
    url: "/samples/080310110012576.pdf",
    institution: "Axis Bank",
  },
]

interface SampleStatementCardProps {
  sample: SampleStatementMeta
  onClick: (sample: SampleStatementMeta) => void
  onDragStart: (sample: SampleStatementMeta, event: DragEvent<HTMLDivElement>) => void
  active?: boolean
}

export function SampleStatementCard({ sample, onClick, onDragStart, active }: SampleStatementCardProps): JSX.Element {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-xl border bg-muted/10 p-4 transition sm:grid-cols-[auto_1fr] sm:items-center",
        active ? "border-primary/50 ring-1 ring-primary/40" : "border-border/60",
      )}
    >
      <div
        role="button"
        tabIndex={0}
        draggable
        onDragStart={(event) => onDragStart(sample, event)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onClick(sample)
          }
        }}
        onClick={() => onClick(sample)}
        className={cn(
          "flex h-20 w-20 cursor-grab select-none flex-col items-center justify-center gap-2 rounded-lg border bg-background text-primary shadow-sm transition hover:border-primary hover:bg-primary/5 active:cursor-grabbing",
          active ? "border-primary" : "border-border/60",
        )}
      >
        <FileText className="size-8" />
        <span className="text-[10px] font-medium uppercase tracking-wide">{sample.institution}</span>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">{sample.label}</p>
        <p>{sample.description}</p>
      </div>
    </div>
  )
}
