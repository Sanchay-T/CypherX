# CypherX

End-to-end financial statement processing combining a FastAPI backend and a Next.js 14 frontend.

## Project Layout

```
apps/          FastAPI code (APIs, domain, infra, legacy bridge)
src/           Next.js app directory
scripts/       Operational scripts
public/        Frontend static assets & sample PDFs
docs/          Architecture notes and runbooks
tests/         Pytest suites (unit + API smoke checks)
```

## Getting Started

1. **Install dependencies**
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   npm install
   ```
2. **Configure environment**
   ```bash
   cp .env.example .env
   # fill in Supabase, OpenAI, GOOGLE_APPLICATION_CREDENTIALS
   ```
   Place your Google service-account JSON at `.secrets/google-vertex.json` (ignored by git).
3. **Run the stack**
   ```bash
   scripts/start_stack.sh
   ```
   This launches `uvicorn apps.main:app` on `:8000` and `next dev` on `:3000`.
4. **Run smoke tests**
   ```bash
   source .venv/bin/activate
   set -a; source .env; set +a
   pytest tests/apps tests/api/test_statements_endpoints.py
   ```
   The API tests exercise the Mistral OCR endpoint, the full statement pipeline, and the legacy-only extraction using the real sample `public/samples/axis.pdf`.

## Key Endpoints

- `POST /ai/mistral/ocr` – Vertex AI Mistral OCR (PDF → markdown, cost/usage metrics)
- `POST /ai/statements/normalize` – Full async pipeline (OCR → ledger → AI report)
- `POST /ai/statements/legacy-normalize` – Legacy extraction only, returns Excel immediately
- `GET /ai/statements/{job_id}` – Poll job status & artifacts

Legacy helper scripts live under `scripts/` and the original analyzer remains in `old_endpoints/`.

## Housekeeping

- Ephemeral outputs live in `.cypherx/legacy_exports/`
- `.next/`, `.pytest_cache/`, `.artifacts/`, `.claude/` are ignored via `.gitignore`
- Run `pytest` before pushing to ensure end-to-end parity

