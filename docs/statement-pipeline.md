# Statement Pipeline Endpoints

The `/ai/statements` routes wrap the existing `legacy_bridge.adapter.run_legacy` pipeline (our original PDF→Excel flow), the Mistral OCR preview, and the new GPT-powered PDF report generation.

## POST `/ai/statements/normalize`

- **file** (required): PDF statement upload (multipart/form-data).
- **report_prompt** (optional): custom instructions passed to the GPT report builder.

Returns a job payload:

```json
{
  "job_id": "8db1f824b7c54e7fb9b6f6fe0f83f5cb",
  "status": "queued",
  "created_at": "2025-09-20T10:15:17.421Z",
  "updated_at": "2025-09-20T10:15:17.421Z",
  "payload": { "file_name": "axis.pdf" }
}
```

## GET `/ai/statements/{job_id}`

Returns job status, stage timings, OCR preview metadata, totals, and download tokens. Stage entries are appended as each phase (OCR, ledger normalisation, optional AI report) completes, enabling the playground UI to reflect progress in real time.

## GET `/ai/statements/{job_id}/excel?token=...`

Streams the generated Excel workbook. Tokens are rotated per job for demo security.

## GET `/ai/statements/{job_id}/report`

Streams the AI-generated PDF when an OpenAI API key is configured.

### Environment

- `OPENAI_API_KEY` or `OPEN_API_KEY` – enables the GPT tool-call step.
- `OPENAI_MODEL` – override model (defaults to `gpt-4o-mini`).
- The pipeline reuses the Mistral OCR configuration described in `docs/mistral-ocr.md`.

### Storage

Temporary files live under `.cypherx/jobs/<job_id>/`. Delete them after demos using `StatementPipelineService.cleanup` if needed.
