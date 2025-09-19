# Gemini Integration

The backend exposes the following Vertex Gemini endpoints:

- `POST /ai/gemini/generate` – wraps `:generateContent` for models like `gemini-1.5-pro-002`.
- `POST /ai/gemini/embeddings` – wraps `:predict` for `gemini-embedding-001`.

## Configuration

Environment variables (all optional, fallback to `CLAUDE_VERTEX_PROJECT_ID` when unset):

- `GEMINI_PROJECT_ID` – Google Cloud project to bill.
- `GEMINI_LOCATION` – Vertex location (default `us-east5`). Use `global` when required.
- `GEMINI_MODEL` – Generative model id (default `gemini-1.5-pro-002`).
- `GEMINI_EMBEDDING_MODEL` – Embedding model id (default `gemini-embedding-001`).

Ensure Application Default Credentials exist (`gcloud auth application-default login` locally or attach a service account with Vertex AI permissions).

## Generate request example

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "fileData": {
            "mimeType": "image/png",
            "fileUri": "gs://generativeai-downloads/images/scones.jpg"
          }
        },
        {
          "text": "Describe this picture."
        }
      ]
    }
  ]
}
```

## Embedding request example

```json
{
  "instances": [
    { "content": "Dinner in New York City" }
  ]
}
```

Responses mirror Vertex AI schemas, including `predictions[].values` for embeddings.
