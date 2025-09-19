# Claude Sonnet 4 Integration

The FastAPI backend exposes `POST /ai/claude/sonnet-4` for invoking Anthropic's Claude Sonnet 4 via Vertex AI.

## Configuration

Set the following environment variables before starting the API server:

- `CLAUDE_VERTEX_PROJECT_ID`: Google Cloud project hosting the Vertex AI connection.
- `CLAUDE_VERTEX_LOCATION`: Vertex location (`global`, `us-east5`, `europe-west1`, etc.). Defaults to `global`.
- `CLAUDE_VERTEX_MODEL`: Optional. Defaults to `claude-sonnet-4@20250514`.

The backend authenticates with Google Cloud using Application Default Credentials. Ensure the runtime has access to a service account with the `Vertex AI User` role or run `gcloud auth application-default login` locally.

## Request schema

```json
{
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "Explain amortized analysis." }
      ]
    }
  ],
  "max_tokens": 512,
  "temperature": 0.2,
  "system": "You are a precise financial analyst."
}
```

## Example `curl`

```bash
curl -X POST http://localhost:8000/ai/claude/sonnet-4 \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": [{"type": "text", "text": "Summarize April ledger anomalies."}]}
    ],
    "max_tokens": 400,
    "temperature": 0.3
  }'
```

The response mirrors the Claude Messages API format, including `content` blocks and usage metadata.
