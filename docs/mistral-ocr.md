# Mistral OCR Endpoint

The API exposes `POST /ai/mistral/ocr` to run the Vertex-hosted `mistral-ocr-2505` model against uploaded statements.

## Request

- `file` (required): PDF upload (`multipart/form-data`).
- `pages` (optional): comma-separated page indexes accepted by the Mistral API.

Example curl:

```bash
curl -X POST "http://localhost:8000/ai/mistral/ocr" \
  -H "Accept: application/json" \
  -F "file=@./apps/statements/AXIS.pdf"
```

## Response fields

- `pages[]`: markdown per page plus layout metadata.
- `usage`: processed page count, byte size, and base64 payload length.
- `cost`: rough estimate based on sample pricing (informational only).
- `aggregated_markdown`: joined markdown across pages for quick previews.

Authentication relies on Application Default Credentials with the Vertex scope. Ensure the runtime can issue `gcloud auth application-default login` or attach a service account.
