export interface MistralOcrDimensions {
  width: number | null
  height: number | null
  dpi: number | null
}

export interface MistralOcrPage {
  index: number
  markdown: string
  dimensions?: MistralOcrDimensions | null
  images?: unknown[] | null
}

export interface MistralOcrUsage {
  pages_processed: number
  doc_size_bytes: number
  doc_size_mb: number
  base64_size: number
}

export interface MistralOcrCost {
  page_cost: number
  size_cost: number
  estimated_total_cost: number
  currency: string
}

export interface MistralOcrResponse {
  model?: string | null
  pages: MistralOcrPage[]
  usage: MistralOcrUsage
  cost?: MistralOcrCost | null
  aggregated_markdown: string
  document_annotation?: Record<string, unknown> | null
}
