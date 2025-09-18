"""Reporting endpoints.

The eventual implementation will expose signed download URLs, summary resources, and
webhook registration flows for completed Excel outputs. Separating reporting concerns
keeps file serving and access control decoupled from ingestion logic.
"""

# router = APIRouter(prefix="/reports", tags=["reports"])
