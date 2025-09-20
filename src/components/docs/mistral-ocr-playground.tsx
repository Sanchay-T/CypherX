"use client"

import type { DragEvent } from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import { Loader2, Sparkles, Timer, Upload } from "lucide-react"

import { runMistralOcr } from "@/lib/ocr-client"
import { cn } from "@/lib/utils"
import type { MistralOcrPage, MistralOcrResponse } from "@/types/ocr"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  SAMPLE_DRAG_TYPE,
  SAMPLE_STATEMENTS,
  type SampleStatementMeta,
  SampleStatementCard,
} from "@/components/docs/sample-statement-card"

function formatCurrency(value: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 6,
  }).format(value)
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(2)} ${units[exponent]}`
}

interface UploadState {
  fileName: string | null
  status: "idle" | "uploading" | "success" | "error"
}

export function MistralOcrPlayground(): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>({ fileName: null, status: "idle" })
  const [result, setResult] = useState<MistralOcrResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [selectedSampleId, setSelectedSampleId] = useState<string>(SAMPLE_STATEMENTS[0]?.id ?? "")

  const selectedSample = useMemo(
    () => SAMPLE_STATEMENTS.find((sample) => sample.id === selectedSampleId) ?? SAMPLE_STATEMENTS[0],
    [selectedSampleId],
  )

  const analyzeFile = useCallback(async (file: File) => {
    setError(null)
    setUploadState({ fileName: file.name, status: "uploading" })
    setLatencyMs(null)
    try {
      const started = performance.now()
      const response = await runMistralOcr(file)
      setResult(response)
      setUploadState({ fileName: file.name, status: "success" })
      setLatencyMs(performance.now() - started)
    } catch (err) {
      setResult(null)
      setUploadState({ fileName: file.name, status: "error" })
      const message = err instanceof Error ? err.message : "Unexpected error"
      setError(message)
    }
  }, [])

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const file = files[0]
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please upload a PDF bank statement.")
        return
      }
      await analyzeFile(file)
    },
    [analyzeFile],
  )

  const handleSample = useCallback(
    async (sample: SampleStatementMeta) => {
      setError(null)
      setUploadState({ fileName: sample.url.split("/").pop() ?? sample.id, status: "uploading" })
      setSelectedSampleId(sample.id)
      setLatencyMs(null)
      try {
        const response = await fetch(sample.url)
        if (!response.ok) {
          throw new Error("Unable to load sample PDF.")
        }
        const blob = await response.blob()
        const sampleFile = new File([blob], sample.url.split("/").pop() ?? `${sample.id}.pdf`, {
          type: "application/pdf",
        })
        await analyzeFile(sampleFile)
      } catch (err) {
        setUploadState({ fileName: sample.url.split("/").pop() ?? sample.id, status: "error" })
        const message = err instanceof Error ? err.message : "Unexpected error"
        setError(message)
      }
    },
    [analyzeFile],
  )

  const onDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragging(false)
      const dataTransfer = event.dataTransfer
      const files = dataTransfer?.files
      if (files && files.length > 0) {
        await handleFiles(files)
        return
      }

      if (dataTransfer) {
        const sampleUrl = dataTransfer.getData(SAMPLE_DRAG_TYPE)
        if (sampleUrl) {
          const sample = SAMPLE_STATEMENTS.find((item) => item.url === sampleUrl)
          if (sample) {
            await handleSample(sample)
          }
          return
        }
      }
    },
    [handleFiles, handleSample],
  )

  const handleBrowse = () => {
    inputRef.current?.click()
  }

  const handleSampleCardDrag = useCallback((sample: SampleStatementMeta, event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData(SAMPLE_DRAG_TYPE, sample.url)
    event.dataTransfer.effectAllowed = "copy"
  }, [])

  const renderPageTabs = (pages: MistralOcrPage[]) => {
    if (!pages.length) return null
    const defaultValue = `page-${pages[0].index}`

    return (
      <Tabs defaultValue={defaultValue} className="w-full">
        <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-muted/40 p-1">
          {pages.map((page) => (
            <TabsTrigger key={page.index} value={`page-${page.index}`} className="rounded-md">
              Page {page.index + 1}
            </TabsTrigger>
          ))}
        </TabsList>
        {pages.map((page) => (
          <TabsContent key={page.index} value={`page-${page.index}`} className="mt-4 space-y-4">
            <Card className="border-border/70">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Page details</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Dimensions: {page.dimensions?.width ?? "?"}×{page.dimensions?.height ?? "?"} @ {page.dimensions?.dpi ?? "?"} DPI
                  </p>
                </div>
                <Badge variant="secondary">Index {page.index}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="markdown" className="w-full">
                  <TabsList className="bg-muted/40">
                    <TabsTrigger value="markdown" className="rounded-md">Markdown</TabsTrigger>
                    <TabsTrigger value="tables" className="rounded-md">Table preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="markdown" className="mt-3">
                    <ScrollArea className="h-72 rounded-md border border-border/60 bg-muted/20 p-3">
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed">{page.markdown}</pre>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="tables" className="mt-3">
                    <TablePreview markdown={page.markdown} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    )
  }

  const manualLatencySeconds = latencyMs ? (latencyMs / 1000).toFixed(2) : null

  return (
    <div className="space-y-8">
      <Card className="border-border/70">
        <CardHeader className="space-y-3">
          <Badge variant="secondary" className="w-fit bg-secondary/40 text-secondary-foreground">
            Interactive playground
          </Badge>
          <CardTitle className="text-2xl font-semibold text-foreground">
            Mistral OCR statement preview
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Drag and drop a PDF bank statement to run the Vertex-hosted Mistral OCR model. We return markdown per page, usage metrics, and a rough cost estimate so stakeholders can validate output quality without touching API keys.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              setIsDragging(false)
            }}
            onDrop={onDrop}
            className={cn(
              "flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-8 text-center transition",
              isDragging ? "border-primary bg-primary/5" : "border-border/60 bg-muted/10",
            )}
          >
            <Upload className="size-10 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">Drop your statement PDF here</p>
              <p className="text-sm text-muted-foreground">
                Supports multi-page statements up to 15 MB. We keep files in-memory only for parsing.
              </p>
              {isDragging ? (
                <div className="rounded-full border border-primary/50 bg-primary/10 px-4 py-1 text-xs font-medium text-primary">
                  Release to process
                </div>
              ) : null}
            </div>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Button onClick={handleBrowse} variant="outline">
                Browse files
              </Button>
              <Button
                onClick={() => selectedSample && handleSample(selectedSample)}
                variant="ghost"
                className="gap-2"
              >
                <Sparkles className="size-4" /> Use sample statement
              </Button>
            </div>
            {uploadState.status === "uploading" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Launching pipeline…
              </div>
            )}
            {uploadState.status === "success" && uploadState.fileName && (
              <p className="text-xs text-muted-foreground">
                Completed: {uploadState.fileName}
              </p>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-foreground">Sample statements</div>
              <Select value={selectedSampleId} onValueChange={setSelectedSampleId}>
                <SelectTrigger className="w-full sm:w-[260px]">
                  <SelectValue placeholder="Select sample" />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLE_STATEMENTS.map((sample) => (
                    <SelectItem key={sample.id} value={sample.id}>
                      {sample.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {SAMPLE_STATEMENTS.map((sample) => (
                <SampleStatementCard
                  key={sample.id}
                  sample={sample}
                  onClick={handleSample}
                  onDragStart={handleSampleCardDrag}
                  active={sample.id === selectedSampleId}
                />
              ))}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>OCR request failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="border-border/70">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Usage summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Model</span>
                      <span className="font-medium text-foreground">{result.model ?? "mistral-ocr"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Pages processed</span>
                      <span className="font-medium text-foreground">{result.usage.pages_processed}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Document size</span>
                      <span className="font-medium text-foreground">
                        {formatBytes(result.usage.doc_size_bytes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Base64 payload</span>
                      <span className="font-medium text-foreground">{result.usage.base64_size.toLocaleString()} chars</span>
                    </div>
                    {manualLatencySeconds ? (
                      <div className="flex items-center justify-between text-primary">
                        <span className="flex items-center gap-2">
                          <Timer className="size-4" /> Elapsed time
                        </span>
                        <span className="font-semibold text-primary">{manualLatencySeconds} s</span>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="border-border/70">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Cost estimate</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {result.cost ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span>Page-based</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(result.cost.page_cost)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Size-based</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(result.cost.size_cost)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Total (greater of both)</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(result.cost.estimated_total_cost)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p>No cost metrics returned.</p>
                    )}
                    <p className="text-xs text-muted-foreground/80">
                      Estimates are indicative and based on public pricing. Confirm billing in Vertex AI for production workloads.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/70 md:col-span-2 lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Aggregate markdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-40 rounded-md border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
                      <pre className="whitespace-pre-wrap leading-relaxed">
                        {result.aggregated_markdown || "No content extracted."}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {renderPageTabs(result.pages)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface TablePreviewProps {
  markdown: string
}

function TablePreview({ markdown }: TablePreviewProps): JSX.Element {
  const tables = useMemo(() => extractTables(markdown), [markdown])

  if (tables.length === 0) {
    return (
      <div className="rounded-md border border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
        No markdown tables were detected on this page.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tables.map((table, idx) => (
        <div key={idx} className="overflow-x-auto">
          <table className="w-full min-w-[480px] border border-border/40 text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                {table.headers.map((cell, cellIdx) => (
                  <th key={cellIdx} className="border border-border/50 px-3 py-2 font-semibold text-foreground">
                    {cell || "—"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.length === 0 ? (
                <tr>
                  <td colSpan={table.headers.length} className="border border-border/50 px-3 py-3 text-muted-foreground">
                    No data rows detected.
                  </td>
                </tr>
              ) : (
                table.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="border border-border/50 px-3 py-2 text-foreground">
                        {cell || "—"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

interface ParsedTable {
  headers: string[]
  rows: string[][]
}

function extractTables(markdown: string): ParsedTable[] {
  const lines = markdown.split(/\r?\n/)
  const tables: string[][][] = []
  let current: string[][] | null = null

  const pushCurrent = () => {
    if (!current) return
    if (current.length >= 2) {
      tables.push(current)
    }
    current = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.startsWith("|") && line.endsWith("|") && line.includes("|")) {
      const sanitizedLine = line.replace(/<br\s*\/?\>/gi, " ")
      const cells = sanitizedLine
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim())
      if (!current) {
        current = []
      }
      current.push(cells)
      continue
    }

    pushCurrent()
  }

  pushCurrent()

  return tables
    .map((table) => normalizeTable(table))
    .filter((table): table is ParsedTable => table !== null)
}

function normalizeTable(table: string[][]): ParsedTable | null {
  if (table.length < 2) return null

  const maxColumns = Math.max(...table.map((row) => row.length))
  const normalized = table.map((row) => {
    if (row.length === maxColumns) {
      return row
    }
    return [...row, ...Array(maxColumns - row.length).fill("")]
  })

  const headers = normalized[0].map((cell) => cell.trim())
  let dataStart = 1

  if (normalized[1].every((cell) => /^:?-{2,}:?$/.test(cell))) {
    dataStart = 2
  }

  const rows = normalized.slice(dataStart).map((row) => row.map((cell) => cell.trim()))

  const keepColumn = headers.map((header, idx) => {
    const columnEmpty = rows.every((row) => !row[idx] || row[idx] === "-")
    return !(header === "" && columnEmpty)
  })

  const filteredHeaders = headers.filter((_, idx) => keepColumn[idx])
  const filteredRows = rows.map((row) => row.filter((_, idx) => keepColumn[idx]))

  if (!filteredHeaders.length) return null

  return {
    headers: filteredHeaders,
    rows: filteredRows,
  }
}
