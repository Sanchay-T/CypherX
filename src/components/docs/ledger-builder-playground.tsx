"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle, Circle, Download, Loader2, Pencil, TimerReset, Upload, Wand2, XCircle } from "lucide-react"

import { SAMPLE_DRAG_TYPE } from "@/components/docs/sample-statement-card"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { masterKeywords, type MasterKeyword } from "@/data/master-keywords"

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "")
const DEFAULT_SAMPLE_URL = "/samples/axis.pdf"
const DEFAULT_SAMPLE_FILENAME = "axis.pdf"

type ReportTemplateKey = "standard" | "lending" | "custom"

interface TemplateConfig {
  label: string
  description: string
  defaultPrompt: string
}

const TEMPLATE_DEFINITIONS: Record<ReportTemplateKey, TemplateConfig> = {
  standard: {
    label: "Standard Report",
    description: "General financial analysis and insights",
    defaultPrompt: "Provide a comprehensive financial analysis including transaction patterns, cash flow analysis, and key financial metrics.",
  },
  lending: {
    label: "Lending Report",
    description: "Credit assessment and risk analysis",
    defaultPrompt: "Analyze creditworthiness, identify lending risks, flag cashflow anomalies, overdue EMIs, and AML risk indicators. Provide recommendations for lending decisions.",
  },
  custom: {
    label: "Custom Report",
    description: "Define your own report requirements",
    defaultPrompt: "",
  },
}

interface JobRecord {
  job_id: string
  status: string
  result?: StatementResult
  payload?: {
    file_name?: string
  }
  error?: string
}

interface StatementResult {
  file_name: string
  excel?: { path: string | null; download_token: string }
  report?: { plan: Record<string, unknown>; pdf_path: string; template?: string | null }
  ocr?: Record<string, unknown>
  preview?: {
    totals: { credits: number; debits: number }
    transactions: Array<Record<string, unknown>>
    legacy?: Record<string, unknown>
  }
  stages: Array<{ name: string; duration_ms: number; finished_at: string }>
  started_at: string
  completed_at: string
  report_template?: string | null
}

type StageState = "pending" | "running" | "completed" | "skipped" | "failed"

interface StageDefinition {
  key: string
  label: string
  runningNote?: string
  completeNote?: string
  skipNote?: string
}

interface StageStatusProps {
  name: string
  position: number
  state: StageState
  durationMs?: number
  note?: string
}

const amountSanitizer = /[^0-9.-]/g

function parseAmount(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === "string") {
    const normalized = value.replace(amountSanitizer, "")
    const parsed = Number(normalized)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function normaliseKeyword(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s:-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function StageStatus({ name, position, state, durationMs, note }: StageStatusProps) {
  const renderIcon = () => {
    switch (state) {
      case "completed":
        return <CheckCircle className="size-4 text-emerald-500" />
      case "running":
        return <Loader2 className="size-4 animate-spin text-primary" />
      case "failed":
        return <XCircle className="size-4 text-destructive" />
      case "skipped":
        return <Circle className="size-4 text-muted-foreground" />
      default:
        return <Circle className="size-4 text-muted-foreground" />
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
      {renderIcon()}
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{position + 1}. {name}</span>
          {durationMs !== undefined ? (
            <span className="text-xs text-muted-foreground">{durationMs} ms</span>
          ) : null}
        </div>
        {note ? <span className="text-xs text-muted-foreground">{note}</span> : null}
      </div>
    </div>
  )
}

export function LedgerBuilderPlayground(): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [job, setJob] = useState<JobRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [reportTemplate, setReportTemplate] = useState<ReportTemplateKey>("standard")
  const [reportPrompt, setReportPrompt] = useState<string>(TEMPLATE_DEFINITIONS.standard.defaultPrompt)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentFileName, setCurrentFileName] = useState<string | null>(null)
  const currencyFormatter = useMemo(() => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }), [])
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Array<Record<string, unknown>>>([])
  const [masters, setMasters] = useState<MasterKeyword[]>(() => masterKeywords.map((entry) => ({ ...entry })))
  const [modifiedTransactionIndexes, setModifiedTransactionIndexes] = useState<Set<number>>(new Set())
  const [modifiedMasterIds, setModifiedMasterIds] = useState<Set<string>>(new Set())
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)
  const [ledgerDraft, setLedgerDraft] = useState<string>("")
  const [ledgerError, setLedgerError] = useState<string | null>(null)
  const [isLedgerDialogOpen, setIsLedgerDialogOpen] = useState(false)
  const [isDecisionDialogOpen, setIsDecisionDialogOpen] = useState(false)
  const resetEditingState = useCallback(() => {
    setEditingRowIndex(null)
    setLedgerDraft("")
    setLedgerError(null)
  }, [])

  useEffect(() => {
    if (job?.result?.preview?.transactions) {
      setTransactions(job.result.preview.transactions.map((row) => ({ ...row })))
      setModifiedTransactionIndexes(new Set())
    } else {
      setTransactions([])
      setModifiedTransactionIndexes(new Set())
    }
  }, [job?.result?.preview?.transactions])

  useEffect(() => {
    if (!isLedgerDialogOpen && !isDecisionDialogOpen) {
      resetEditingState()
    }
  }, [isDecisionDialogOpen, isLedgerDialogOpen, resetEditingState])

  const transactionColumns = useMemo(() => {
    const sampleRow = transactions[0] ?? job?.result?.preview?.transactions?.[0]
    return sampleRow ? Object.keys(sampleRow) : []
  }, [job?.result?.preview?.transactions, transactions])

  const ledgerColumnKey = useMemo(() => {
    const normaliseColumnName = (value: string) =>
      value
        .toLowerCase()
        .trim()
        .replace(/[_\s-]+/g, "")

    const priorityOrder = ["ledger", "ledgername", "ledgercategory", "category", "ledgercode"]

    for (const column of transactionColumns) {
      const normalized = normaliseColumnName(column)
      if (priorityOrder.includes(normalized)) {
        return column
      }
    }

    const fuzzyMatch = transactionColumns.find((column) => {
      const normalized = normaliseColumnName(column)
      return normalized.includes("ledger") || normalized.includes("category")
    })

    return fuzzyMatch ?? null
  }, [transactionColumns])

  const readRowValue = useCallback((row: Record<string, unknown>, key: string) => {
    if (row[key] !== undefined) {
      return row[key]
    }
    const lowerKey = key.toLowerCase()
    return row[lowerKey]
  }, [])

  const formatCellValue = useCallback((value: unknown) => {
    if (value === null || value === undefined || value === "") {
      return "-"
    }
    if (typeof value === "number") {
      return Number.isFinite(value) ? value.toLocaleString("en-IN") : String(value)
    }
    return String(value)
  }, [])

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, row) => {
        acc.debits += parseAmount(readRowValue(row, "Debit"))
        acc.credits += parseAmount(readRowValue(row, "Credit"))
        return acc
      },
      { debits: 0, credits: 0 },
    )
  }, [readRowValue, transactions])

  const analysisData = useMemo(() => {
    if (!ledgerColumnKey || transactions.length === 0) {
      return [] as Array<{ ledger: string; count: number; debits: number; credits: number; net: number }>
    }
    const map = new Map<string, { count: number; debits: number; credits: number }>()
    transactions.forEach((row) => {
      const ledgerRaw = readRowValue(row, ledgerColumnKey)
      const ledgerValue =
        typeof ledgerRaw === "string" && ledgerRaw.trim().length > 0 ? ledgerRaw : "Unassigned"
      const bucket = map.get(ledgerValue) ?? { count: 0, debits: 0, credits: 0 }
      bucket.count += 1
      bucket.debits += parseAmount(readRowValue(row, "Debit"))
      bucket.credits += parseAmount(readRowValue(row, "Credit"))
      map.set(ledgerValue, bucket)
    })
    return Array.from(map.entries())
      .map(([ledger, stats]) => ({ ledger, ...stats, net: stats.credits - stats.debits }))
      .sort((a, b) => b.debits + b.credits - (a.debits + a.credits))
  }, [ledgerColumnKey, readRowValue, transactions])

  const startEditing = useCallback(
    (rowIndex: number) => {
      if (!ledgerColumnKey) return
      const row = transactions[rowIndex]
      if (!row) return
      const currentLedger = readRowValue(row, ledgerColumnKey)
      const displayValue =
        typeof currentLedger === "string"
          ? currentLedger
          : currentLedger !== undefined && currentLedger !== null
            ? String(currentLedger)
            : ""
      setEditingRowIndex(rowIndex)
      setLedgerDraft(displayValue)
      setLedgerError(null)
      setIsLedgerDialogOpen(true)
    },
    [ledgerColumnKey, readRowValue, transactions],
  )

  const handleLedgerSubmit = useCallback(() => {
    if (!ledgerDraft.trim()) {
      setLedgerError("Ledger value is required.")
      return
    }
    setIsDecisionDialogOpen(true)
    setIsLedgerDialogOpen(false)
  }, [ledgerDraft])

  const handleDecisionBack = useCallback(() => {
    setIsLedgerDialogOpen(true)
    setIsDecisionDialogOpen(false)
  }, [])

  const addNewMasterEntry = useCallback(
    (
      description: string,
      ledgerValue: string,
      debitAmount: number,
      creditAmount: number,
      source: "manual" | "fallback",
    ) => {
      const keywordBase = normaliseKeyword(description) || `custom-${Math.random().toString(36).slice(2, 8)}`
      const id = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const transactionType: MasterKeyword["transactionType"] =
        creditAmount > 0 && debitAmount > 0
          ? "Both"
          : creditAmount > 0
            ? "Credit"
            : debitAmount > 0
              ? "Debit"
              : "Both"
      const entry: MasterKeyword = {
        id,
        keyword: keywordBase,
        transactionType,
        ledger: ledgerValue,
        particulars: ledgerValue,
        preferences:
          source === "fallback"
            ? "Generated automatically from ledger edit"
            : "Added from playground",
      }
      setMasters((prev) => [entry, ...prev])
      setModifiedMasterIds((prev) => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
      return entry
    },
    [],
  )

  const finalizeLedgerUpdate = useCallback(
    (mode: "update" | "add") => {
      if (editingRowIndex === null || !ledgerColumnKey) {
        setIsDecisionDialogOpen(false)
        return
      }
      const trimmedLedger = ledgerDraft.trim()
      const row = transactions[editingRowIndex]
      if (!row) {
        setIsDecisionDialogOpen(false)
        return
      }

      const rawDescription =
        (readRowValue(row, "Description") ??
          readRowValue(row, "Particulars") ??
          readRowValue(row, "Narration") ??
          readRowValue(row, "description") ??
          "") as string | undefined
      const description = rawDescription && rawDescription.trim().length > 0 ? rawDescription.trim() : "selected transaction"
      const truncatedDescription =
        description !== "selected transaction" && description.length > 80
          ? `${description.slice(0, 77)}…`
          : description
      const debitAmount = parseAmount(readRowValue(row, "Debit"))
      const creditAmount = parseAmount(readRowValue(row, "Credit"))

      setTransactions((prev) =>
        prev.map((entry, index) => (index === editingRowIndex ? { ...entry, [ledgerColumnKey]: trimmedLedger } : entry)),
      )
      setModifiedTransactionIndexes((prev) => {
        const next = new Set(prev)
        next.add(editingRowIndex)
        return next
      })

      let masterMessage = ""
      if (mode === "update") {
        const normalized = normaliseKeyword(description)
        const matchIndex = masters.findIndex((entry) => normalized.includes(entry.keyword))
        if (matchIndex !== -1) {
          const current = masters[matchIndex]
          const updated: MasterKeyword = { ...current, ledger: trimmedLedger }
          setMasters((prev) => prev.map((entry, index) => (index === matchIndex ? updated : entry)))
          setModifiedMasterIds((prev) => {
            const next = new Set(prev)
            next.add(updated.id)
            return next
          })
          masterMessage = `Updated master keyword “${updated.keyword}”.`
        } else {
          const created = addNewMasterEntry(description, trimmedLedger, debitAmount, creditAmount, "fallback")
          masterMessage = `No existing master matched. Created “${created.keyword}”.`
        }
      } else {
        const created = addNewMasterEntry(description, trimmedLedger, debitAmount, creditAmount, "manual")
        masterMessage = `Added new master keyword “${created.keyword}”.`
      }

      toast({
        title: "Ledger classification saved",
        description: `Assigned “${trimmedLedger}” to ${truncatedDescription === "selected transaction" ? "the selected transaction" : `“${truncatedDescription}”`}. ${masterMessage}`,
      })

      setIsDecisionDialogOpen(false)
    },
    [addNewMasterEntry, editingRowIndex, ledgerColumnKey, ledgerDraft, masters, readRowValue, toast, transactions],
  )

  const modifiedTransactionCount = modifiedTransactionIndexes.size
  const modifiedMasterCount = modifiedMasterIds.size
  const netTotal = totals.credits - totals.debits
  const editingRow = editingRowIndex !== null ? transactions[editingRowIndex] ?? null : null
  const editingDescription = editingRow
    ? formatCellValue(readRowValue(editingRow, "Description") ?? readRowValue(editingRow, "Particulars"))
    : ""

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null)
      setIsSubmitting(true)
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("report_prompt", reportPrompt)
        formData.append("report_template", reportTemplate)
        const response = await fetch(`${API_BASE_URL}/ai/statements/normalize`, {
          method: "POST",
          body: formData,
        })
        const payload = (await response.json()) as JobRecord
        if (process.env.NODE_ENV !== "production") {
          console.debug("normalize_statement response", payload)
        }
        if (!response.ok) {
          throw new Error(payload?.detail ?? "Failed to start normalization job")
        }
        setJob(payload)
        const queuedName = payload.payload?.file_name ?? file.name
        setCurrentFileName(queuedName)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error"
        setError(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [reportPrompt, reportTemplate],
  )

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const file = files[0]
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please upload a PDF bank statement.")
        return
      }
      await handleUpload(file)
    },
    [handleUpload],
  )

  const handleSample = useCallback(async () => {
    try {
      const response = await fetch(DEFAULT_SAMPLE_URL)
      if (!response.ok) {
        throw new Error("Unable to load sample PDF.")
      }
      const blob = await response.blob()
      const sampleFile = new File([blob], DEFAULT_SAMPLE_FILENAME, { type: "application/pdf" })
      setCurrentFileName(DEFAULT_SAMPLE_FILENAME)
      await handleUpload(sampleFile)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error"
      setError(message)
    }
  }, [handleUpload])

  const pollJob = useCallback(
    async (jobId: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/ai/statements/${jobId}`)
        const payload = (await response.json()) as JobRecord
        if (process.env.NODE_ENV !== "production") {
          console.debug("job poll", payload)
        }
        if (!response.ok) {
          throw new Error(payload?.detail ?? "Job polling failed")
        }
        setJob(payload)
        if (payload.result?.file_name) {
          setCurrentFileName(payload.result.file_name)
        }
        if (payload.status === "completed" || payload.status === "failed") {
          return true
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error while polling"
        setError(message)
        return true
      }
      return false
    },
    [],
  )

  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return
    const interval = setInterval(async () => {
      const done = await pollJob(job.job_id)
      if (done) {
        clearInterval(interval)
      }
    }, 1500)
    return () => clearInterval(interval)
  }, [job, pollJob])

  const handleBrowse = () => inputRef.current?.click()

  const statusLabel = useMemo(() => {
    if (!job) return "Awaiting upload"
    if (job.status === "completed") return "Ready"
    if (job.status === "failed") return "Failed"
    return "Processing"
  }, [job])

  const handleDownloadExcel = () => {
    if (!job?.result || !job.result.excel) return
    const { job_id } = job
    const { download_token, path } = job.result.excel
    if (!download_token || !path) {
      setError("Excel export is not ready yet.")
      return
    }
    window.open(`${API_BASE_URL}/ai/statements/${job_id}/excel?token=${download_token}`, "_blank")
  }

  const handleDownloadReport = () => {
    if (!job?.result?.report) {
      setError("AI report is not available for this run.")
      return
    }
    window.open(`${API_BASE_URL}/ai/statements/${job.job_id}/report`, "_blank")
  }

  const stageDefinitions = useMemo<StageDefinition[]>(
    () => [
      {
        key: "OCR & parsing",
        label: "OCR & parsing",
        runningNote: "Running Mistral OCR preview...",
        completeNote: "OCR complete",
      },
      {
        key: "Ledger normalisation",
        label: "Ledger normalisation",
        runningNote: "Building Excel ledger via legacy adapter...",
        completeNote: "Ledger normalised",
      },
      {
        key: "AI custom report",
        label: "AI custom report",
        runningNote: "Generating GPT-driven PDF report...",
        skipNote: "Connect OPENAI_API_KEY to enable AI report generation.",
      },
    ],
    [],
  )

  const stageMap = useMemo(() => {
    const entries = job?.result?.stages?.map((stage) => [stage.name, stage]) ?? []
    return new Map(entries)
  }, [job?.result?.stages])

  const firstIncompleteIndex = stageDefinitions.findIndex((definition) => !stageMap.has(definition.key))

  const stageDisplay = useMemo(() => stageDefinitions.map((definition, index) => {
    const completedStage = stageMap.get(definition.key)
    let state: StageState = "pending"

    if (completedStage) {
      state = "completed"
    } else if (job?.status === "failed") {
      state = "failed"
    } else if (job?.status === "completed" && definition.key === "AI custom report" && !job.result?.report) {
      state = "skipped"
    } else if (job && (job.status === "running" || job.status === "queued")) {
      if (index === (firstIncompleteIndex === -1 ? stageDefinitions.length - 1 : firstIncompleteIndex)) {
        state = "running"
      }
    }

    return {
      name: definition.label,
      position: index,
      state,
      durationMs: completedStage?.duration_ms,
      note:
        state === "running"
          ? definition.runningNote
          : state === "skipped"
            ? definition.skipNote
            : state === "completed"
              ? definition.completeNote
              : undefined,
    }
  }), [firstIncompleteIndex, job, stageDefinitions, stageMap])

  const completedStages = useMemo(
    () => stageDisplay.filter((stage) => stage.state === "completed" || stage.state === "skipped").length,
    [stageDisplay],
  )
  const progressPercent = Math.round((completedStages / stageDefinitions.length) * 100)
  const totalDurationMs = job?.result?.total_duration_ms ?? null

  return (
    <div className="space-y-8">
      <Card className="border-border/70">
        <CardHeader className="space-y-3">
          <Badge variant="secondary" className="w-fit bg-secondary/40 text-secondary-foreground">
            Full pipeline demo
          </Badge>
          <CardTitle className="text-2xl font-semibold text-foreground">Statement → Excel → AI report</CardTitle>
          <CardDescription className="max-w-3xl text-sm text-muted-foreground">
            Kick off the legacy ledger builder, track status in real time, and generate a custom investor-ready PDF report powered by GPT function calling.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_minmax(280px,360px)]">
            <div
              onDragOver={(event) => {
                event.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                setIsDragging(false)
              }}
              onDrop={async (event) => {
                event.preventDefault()
                setIsDragging(false)
                const files = event.dataTransfer.files
                if (files && files.length > 0) {
                  await handleFiles(files)
                  return
                }
                if (event.dataTransfer.types.includes(SAMPLE_DRAG_TYPE)) {
                  await handleSample()
                }
              }}
              className={cn(
                "flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-8 text-center transition",
                isDragging ? "border-primary bg-primary/5" : "border-border/60 bg-muted/10",
              )}
            >
              <Upload className="size-10 text-muted-foreground" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-foreground">Drop a statement PDF or use our sample</p>
                <p className="text-sm text-muted-foreground">
                  We trigger OCR, normalization, Excel export, and optional AI report in one click.
                </p>
                <p className="text-xs text-muted-foreground/80">
                  {currentFileName ? (
                    <span>
                      Active file: <span className="font-medium text-foreground">{currentFileName}</span>
                    </span>
                  ) : (
                    <span>No file queued yet.</span>
                  )}
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Button onClick={handleBrowse} variant="outline" disabled={isSubmitting}>
                  Browse files
                </Button>
                <Button onClick={handleSample} variant="ghost" className="gap-2" disabled={isSubmitting}>
                  <Wand2 className="size-4" /> Spark sample run
                </Button>
              </div>
              {isSubmitting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Launching pipeline…
                </div>
              )}
              {isDragging && (
                <div className="rounded-full border border-primary/50 bg-primary/10 px-4 py-1 text-xs font-medium text-primary">
                  Release to process
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) => handleFiles(event.target.files)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="report_template">
                  Report template
                </label>
                <Select
                  value={reportTemplate}
                  onValueChange={(value) => {
                    const templateKey = value as ReportTemplateKey
                    setReportTemplate(templateKey)
                    setReportPrompt(TEMPLATE_DEFINITIONS[templateKey].defaultPrompt)
                  }}
                >
                  <SelectTrigger id="report_template" className="w-full">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATE_DEFINITIONS).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="flex flex-col items-start gap-0.5">
                        <span className="text-sm font-medium">{config.label}</span>
                        <span className="text-xs text-muted-foreground">{config.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="text-sm font-medium text-foreground" htmlFor="report_prompt">
                Custom report instructions
              </label>
              <textarea
                id="report_prompt"
                value={reportPrompt}
                onChange={(event) => setReportPrompt(event.target.value)}
                className="min-h-[180px] w-full rounded-lg border border-border/60 bg-background p-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Example: flag cashflow anomalies, overdue EMIs, and AML risk indicators"
              />
              <p className="text-xs text-muted-foreground">
                We forward this prompt to GPT during the report generation stage. Leave blank to use the default investor brief.
              </p>
            </div>
          </div>



          <Card className="border-border/70">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Job status</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">{statusLabel}</CardDescription>
              </div>
              {job?.status === "running" && <TimerReset className="size-4 animate-spin text-muted-foreground" />}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {progressPercent}% complete{currentFileName ? ` · ${currentFileName}` : ""}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stageDisplay.map((stage) => (
                  <StageStatus
                    key={stage.name}
                    name={stage.name}
                    position={stage.position}
                    state={stage.state}
                    durationMs={stage.durationMs}
                    note={stage.note}
                  />
                ))}
              </div>

              {job?.result ? (
                <div className="flex flex-wrap gap-3">
                  {stageDefinitions.map((definition) => {
                    const stageInfo = stageMap.get(definition.key)
                    const durationMs = stageInfo?.duration_ms ?? null
                    const state = stageDisplay.find((stage) => stage.name === definition.label)?.state ?? "pending"
                    const label = durationMs !== null ? `${(durationMs / 1000).toFixed(2)} s` : state === "running" ? "Processing" : "—"

                    return (
                      <div
                        key={definition.key}
                        className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2 text-xs text-muted-foreground"
                      >
                        <div className="font-medium text-foreground">{definition.label}</div>
                        <div>{label}</div>
                      </div>
                    )
                  })}
                  {totalDurationMs !== null ? (
                    <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-xs text-primary">
                      <div className="font-semibold text-primary-foreground/90">Total pipeline</div>
                      <div className="text-sm font-semibold text-primary">
                        {(totalDurationMs / 1000).toFixed(2)} s
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {job?.status === "completed" && job.result ? (
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleDownloadExcel} className="gap-2" variant="outline">
                    <Download className="size-4" />
                    Excel export
                  </Button>
                  {job.result.report ? (
                    <Button onClick={handleDownloadReport} className="gap-2" variant="outline">
                      <Download className="size-4" /> AI PDF report
                    </Button>
                  ) : (
                    <Button disabled variant="outline">
                      <Download className="size-4" /> AI report unavailable
                    </Button>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {job && job.status !== "completed" && job.status !== "failed" ? (
            <Alert>
              <AlertTitle>Pipeline running</AlertTitle>
              <AlertDescription className="flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                {stageDisplay.find((stage) => stage.state === "running")?.note ?? "Processing statement..."}
              </AlertDescription>
            </Alert>
          ) : null}

          {job?.status === "completed" ? (
            <Alert variant="default">
              <AlertTitle>Pipeline complete</AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground">
                Excel export and preview are ready. {job.result?.report ? "Custom AI report generated using GPT." : "Set OPENAI_API_KEY to unlock AI report generation."}
              </AlertDescription>
            </Alert>
          ) : null}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Pipeline error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {job?.status === "completed" && job.result ? (
            <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Transaction preview (first 10 rows)</CardTitle>
                  <CardDescription>Data sourced from the generated Excel workbook.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 overflow-x-auto">
                  {ledgerColumnKey ? (
                    <p className="text-xs text-muted-foreground">
                      Click a ledger cell or use the edit button to adjust the classification and sync masters.
                    </p>
                  ) : null}
                  <ScrollArea className="max-h-[340px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {transactionColumns.map((key) => (
                            <TableHead key={key} className="text-xs uppercase tracking-wide text-muted-foreground">
                              {key}
                            </TableHead>
                          ))}
                          {ledgerColumnKey ? (
                            <TableHead className="text-right text-xs uppercase tracking-wide text-muted-foreground">Actions</TableHead>
                          ) : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((row, idx) => (
                          <TableRow key={`${idx}-${String(readRowValue(row, "Value Date") ?? idx)}`}>
                            {transactionColumns.map((key) => {
                              const value = readRowValue(row, key)
                              const isLedgerCell = ledgerColumnKey === key
                              const isModified = isLedgerCell && modifiedTransactionIndexes.has(idx)
                              return (
                                <TableCell
                                  key={key}
                                  className={cn(
                                    "whitespace-nowrap text-xs text-foreground",
                                    isLedgerCell &&
                                      "group/ledger cursor-pointer font-medium focus-visible:outline focus-visible:outline-primary/40",
                                    isLedgerCell && !isModified && "hover:bg-primary/5",
                                    isModified && "bg-primary/10",
                                  )}
                                  role={isLedgerCell ? "button" : undefined}
                                  tabIndex={isLedgerCell ? 0 : undefined}
                                  title={isLedgerCell ? "Edit ledger classification" : undefined}
                                  onClick={isLedgerCell ? () => startEditing(idx) : undefined}
                                  onKeyDown={
                                    isLedgerCell
                                      ? (event) => {
                                          if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault()
                                            startEditing(idx)
                                          }
                                        }
                                      : undefined
                                  }
                                >
                                  <div className={cn("flex items-center gap-2", isLedgerCell && "justify-between")}>
                                    <span className={cn(isLedgerCell ? "max-w-[220px] truncate" : undefined)}>
                                      {formatCellValue(value)}
                                    </span>
                                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide">
                                      {isModified ? (
                                        <Badge
                                          variant="secondary"
                                          className="px-1.5 py-0 text-[10px] uppercase tracking-wide"
                                        >
                                          Edited
                                        </Badge>
                                      ) : null}
                                      {isLedgerCell ? (
                                        <Pencil className="size-3 text-muted-foreground/60 transition-opacity group-hover/ledger:opacity-100" />
                                      ) : null}
                                    </div>
                                  </div>
                                </TableCell>
                              )
                            })}
                            {ledgerColumnKey ? (
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 text-xs"
                                  onClick={() => startEditing(idx)}
                                >
                                  <Pencil className="size-3.5" /> Edit ledger
                                </Button>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        ))}
                        {transactions.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={transactionColumns.length + (ledgerColumnKey ? 1 : 0)}
                              className="py-8 text-center text-xs text-muted-foreground"
                            >
                              No transactions available yet.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  {!ledgerColumnKey ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
                      <p className="font-medium">Ledger column not detected</p>
                      <p className="mt-1 leading-relaxed">
                        The preview did not expose a column named “Ledger” or “Category”. Please confirm the statement export
                        includes one of those headers, or update the parser to provide a ledger/category field so edits can be
                        saved back to masters.
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-border/70">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Statement analysis</CardTitle>
                    <CardDescription>Ledger insights update as you adjust classifications.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Transactions analysed</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{transactions.length}</p>
                        <p className="text-xs text-muted-foreground/80">
                          {modifiedTransactionCount} ledger {modifiedTransactionCount === 1 ? "edit" : "edits"} · {modifiedMasterCount} master
                          {modifiedMasterCount === 1 ? " update" : " updates"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Net position</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{currencyFormatter.format(netTotal)}</p>
                        <p className="text-xs text-muted-foreground/80">
                          Credits {currencyFormatter.format(totals.credits)} · Debits {currencyFormatter.format(totals.debits)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Top ledgers</p>
                      {analysisData.length > 0 ? (
                        <div className="space-y-2">
                          {analysisData.slice(0, 4).map((item) => (
                            <div
                              key={item.ledger}
                              className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-medium text-foreground">{item.ledger}</p>
                                <p className="text-xs text-muted-foreground/80">
                                  {item.count} {item.count === 1 ? "transaction" : "transactions"}
                                </p>
                              </div>
                              <div className="text-right text-xs">
                                <p>Cr: {currencyFormatter.format(item.credits)}</p>
                                <p>Dr: {currencyFormatter.format(item.debits)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Ledger analysis will appear once transactions are available.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">AI report plan</CardTitle>
                    <CardDescription>Plan generated via GPT tool call before rendering the PDF.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    {job.result.report ? (
                      <ScrollArea className="max-h-[320px] rounded-md border border-border/60 bg-muted/20 p-3">
                        <pre className="whitespace-pre-wrap text-xs">
                          {JSON.stringify(job.result.report.plan, null, 2)}
                        </pre>
                      </ScrollArea>
                    ) : (
                      <p>AI report generation is disabled because no OpenAI API key was detected.</p>
                    )}
                    <div className="rounded-lg bg-muted/20 p-3 text-xs">
                      <p className="font-semibold text-foreground">Totals</p>
                      <p>Credits: {currencyFormatter.format(totals.credits)}</p>
                      <p>Debits: {currencyFormatter.format(totals.debits)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Master keyword panel</CardTitle>
                    <CardDescription>Review the ledger mapping rules powering categorisation.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground/80">
                      <span>Active entries</span>
                      <span className="font-medium text-foreground">{masters.length}</span>
                    </div>
                    <ScrollArea className="max-h-[280px] pr-2">
                      <div className="space-y-3">
                        {masters.map((entry) => (
                          <div
                            key={entry.id}
                            className={cn(
                              "flex flex-col gap-1 rounded-lg border border-border/60 bg-background/80 p-3 text-xs",
                              modifiedMasterIds.has(entry.id) && "border-primary/60 shadow-[0_0_0_1px_rgba(var(--primary),0.25)]",
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-foreground">{entry.ledger}</p>
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                {entry.transactionType}
                              </Badge>
                            </div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Keyword</p>
                            <p className="text-xs text-muted-foreground">{entry.keyword}</p>
                            <p className="text-xs text-muted-foreground/80">Particulars: {entry.particulars}</p>
                            {entry.preferences ? (
                              <p className="text-[10px] text-muted-foreground/70">{entry.preferences}</p>
                            ) : null}
                            {modifiedMasterIds.has(entry.id) ? (
                              <Badge variant="secondary" className="w-fit text-[10px] uppercase tracking-wide">
                                Updated
                              </Badge>
                            ) : null}
                          </div>
                        ))}
                        {masters.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Master keyword records will appear after the first classification.</p>
                        ) : null}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Dialog open={isLedgerDialogOpen} onOpenChange={setIsLedgerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit ledger classification</DialogTitle>
            <DialogDescription>
              Choose the ledger name that should apply to this transaction before saving it to masters.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ledger_value">Ledger</Label>
              <Input
                id="ledger_value"
                value={ledgerDraft}
                onChange={(event) => {
                  setLedgerDraft(event.target.value)
                  if (ledgerError) {
                    setLedgerError(null)
                  }
                }}
                placeholder="e.g. Creditor"
              />
              {ledgerError ? <p className="text-xs text-destructive">{ledgerError}</p> : null}
            </div>
            {editingRow ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Transaction context</p>
                <p className="mt-1 text-sm text-foreground">{editingDescription || "Unnamed transaction"}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Debit</p>
                    <p className="text-sm text-foreground">
                      {currencyFormatter.format(parseAmount(readRowValue(editingRow, "Debit")))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Credit</p>
                    <p className="text-sm text-foreground">
                      {currencyFormatter.format(parseAmount(readRowValue(editingRow, "Credit")))}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsLedgerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLedgerSubmit}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDecisionDialogOpen} onOpenChange={setIsDecisionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>How should this ledger change apply?</AlertDialogTitle>
            <AlertDialogDescription>
              {ledgerDraft ? (
                <>
                  Apply <span className="font-medium text-foreground">“{ledgerDraft.trim()}”</span> to{" "}
                  {editingDescription ? `“${editingDescription}”` : "the selected transaction"}. Decide whether to update an
                  existing master keyword or create a new entry.
                </>
              ) : (
                "Decide whether to update an existing master keyword or create a new entry."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <Button variant="outline" onClick={handleDecisionBack}>
              Back to edit
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" onClick={() => finalizeLedgerUpdate("update")}>
                Update master
              </Button>
              <Button onClick={() => finalizeLedgerUpdate("add")}>
                Add new entry
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
