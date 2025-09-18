"""Batch processing endpoints.

This module will define HTTP routes for creating statement processing batches,
tracking their status, and retrieving metadata that the frontend can poll. It will
remain thin, delegating orchestration to ``app.domain.services.batch_service``.
"""

# from fastapi import APIRouter  # reserved for future use

# router = APIRouter(prefix="/batches", tags=["batches"])
