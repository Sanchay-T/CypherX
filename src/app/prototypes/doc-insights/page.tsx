"use client";

import { useState } from "react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

const DOC_TYPES: { key: "invoice" | "cheque" | "pan" | "aadhaar"; label: string }[] = [
  { key: "invoice", label: "Invoice" },
  { key: "cheque", label: "Cheque" },
  { key: "pan", label: "PAN Card" },
  { key: "aadhaar", label: "Aadhaar" },
];

type ExtractionEnvelope = {
  request_id: string;
  document_type: string;
  structured_result: Record<string, unknown>;
  insights: { title: string; detail?: string | null; severity: string }[];
  ocr_preview_markdown?: string | null;
  ocr_usage?: Record<string, unknown> | null;
  ocr_cost?: Record<string, unknown> | null;
};

const severityTone: Record<string, string> = {
  info: "text-sky-700 bg-sky-100",
  warning: "text-amber-700 bg-amber-100",
  critical: "text-red-700 bg-red-100",
};

function endpointFor(type: "invoice" | "cheque" | "pan" | "aadhaar"): string {
  if (type === "invoice") {
    return "/prototypes/doc-insights/invoice";
  }
  if (type === "cheque") {
    return "/prototypes/doc-insights/cheque";
  }
  return `/prototypes/doc-insights/kyc/${type}`;
}

export default function DocInsightsPlayground() {
  const [selectedType, setSelectedType] = useState<"invoice" | "cheque" | "pan" | "aadhaar">("invoice");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionEnvelope | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(null);
    setError(null);

    if (!file) {
      setError("Select a document before running the pipeline.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}${endpointFor(selectedType)}`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? `Request failed (${response.status})`);
      }
      const json = (await response.json()) as ExtractionEnvelope;
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 py-10">
      <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Document Insights Prototype</h1>
        <p className="mt-2 text-sm text-slate-600">
          Upload an invoice, cheque, PAN, or Aadhaar document to preview the combined Mistral OCR + GPT-4o
          extraction pipeline. Perfect for management demos and rapid experiments.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Document Type
            <select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value as typeof selectedType)}
              className="mt-2 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              {DOC_TYPES.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-sm font-medium text-slate-700">
            Upload File
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
              }}
              className="mt-2 cursor-pointer rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3">
          {loading && <span className="text-sm text-slate-500">Processing…</span>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition enabled:hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? "Running" : "Run Extraction"}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {result && (
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Insights</h2>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">Request ID: {result.request_id}</p>
            <div className="mt-4 flex flex-col gap-3">
              {result.insights.length === 0 && (
                <p className="text-sm text-slate-600">No insights generated for this document.</p>
              )}
              {result.insights.map((insight) => (
                <div
                  key={insight.title}
                  className={`rounded-md px-3 py-2 text-sm ${severityTone[insight.severity] ?? severityTone.info}`}
                >
                  <p className="font-medium">{insight.title}</p>
                  {insight.detail && <p className="mt-1 text-xs text-slate-700">{insight.detail}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Structured Output</h2>
            <pre className="mt-3 max-h-80 overflow-auto rounded bg-slate-900 px-3 py-3 text-xs text-slate-100">
              {JSON.stringify(result.structured_result, null, 2)}
            </pre>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">OCR Preview</h2>
            <p className="mt-1 text-xs text-slate-500">
              First page markdown excerpt from Mistral OCR. Ideal for reviewers to sanity-check the capture.
            </p>
            <pre className="mt-3 max-h-72 overflow-auto rounded bg-slate-50 px-3 py-3 text-xs text-slate-800">
              {result.ocr_preview_markdown ?? "No markdown available"}
            </pre>
          </div>
        </section>
      )}
    </div>
  );
}
