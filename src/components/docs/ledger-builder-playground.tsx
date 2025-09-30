"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle, Circle, Download, Loader2, TimerReset, Upload, Wand2, XCircle } from "lucide-react"

import { SAMPLE_DRAG_TYPE } from "@/components/docs/sample-statement-card"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const TEMPLATE_DEFINITIONS = {
  standard: {
    label: "Standard overview",
    description: "Focus on cash flow health, risk flags, and customer insights.",
    defaultPrompt: "Focus on cash flow health, risk flags, and customer insights.",
  },
  lending_india: {
    label: "Lending – India (RBI)",
    description: "Surface GNPA, SMA ladder, PSL compliance, collateral coverage, and supervisory actions.",
    defaultPrompt:
      "You are preparing an India lending portfolio brief. Prioritise GNPA/NNPA, SMA 0/1/2 pipeline, PSL progress, collateral coverage, liquidity gaps, and compliance breaches. Provide explicit Action or Monitor call-outs for each section.",
  },
} as const

type ReportTemplateKey = keyof typeof TEMPLATE_DEFINITIONS

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "")
const DEFAULT_SAMPLE_URL = "/samples/axis.pdf"
const DEFAULT_SAMPLE_FILENAME = "axis.pdf"

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
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Transaction preview (first 10 rows)</CardTitle>
                  <CardDescription>Data sourced from the generated Excel workbook.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <ScrollArea className="max-h-[340px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {job.result.preview?.transactions[0]
                            ? Object.keys(job.result.preview.transactions[0]).map((key) => (
                                <TableHead key={key} className="text-xs uppercase tracking-wide text-muted-foreground">
                                  {key}
                                </TableHead>
                              ))
                            : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {job.result.preview?.transactions.map((row, idx) => (
                          <TableRow key={idx}>
                            {Object.values(row).map((value, cellIdx) => (
                              <TableCell key={cellIdx} className="whitespace-nowrap text-xs text-foreground">
                                {String(value)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
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
                  {job.result.preview ? (
                    <div className="rounded-lg bg-muted/20 p-3 text-xs">
                      <p className="font-semibold text-foreground">Totals</p>
                      <p>Credits: {currencyFormatter.format(job.result.preview.totals.credits ?? 0)}</p>
                      <p>Debits: {currencyFormatter.format(job.result.preview.totals.debits ?? 0)}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
