import type { MistralOcrResponse } from "@/types/ocr"

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "")

export async function runMistralOcr(file: File, pages?: string): Promise<MistralOcrResponse> {
  const formData = new FormData()
  formData.append("file", file)
  if (pages) {
    formData.append("pages", pages)
  }

  const response = await fetch(`${API_BASE_URL}/ai/mistral/ocr`, {
    method: "POST",
    body: formData,
  })

  const contentType = response.headers.get("content-type") ?? ""
  const isJson = contentType.includes("application/json")
  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message = extractErrorMessage(payload)
    throw new Error(message ?? `OCR request failed (${response.status})`)
  }

  return payload as MistralOcrResponse
}

function extractErrorMessage(data: unknown): string | null {
  if (!data) return null
  if (typeof data === "string") {
    return data.trim() || null
  }
  if (typeof data === "object") {
    const record = data as Record<string, unknown>
    if (typeof record.detail === "string") {
      return record.detail
    }
    if (Array.isArray(record.detail)) {
      const first = record.detail[0]
      if (typeof first === "string") return first
      if (first && typeof first === "object" && typeof (first as Record<string, unknown>).msg === "string") {
        return (first as Record<string, unknown>).msg as string
      }
    }
    if (typeof record.message === "string") {
      return record.message
    }
  }
  return null
}
