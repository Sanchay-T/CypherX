"""Statement-specific endpoints.

Future routes here will surface per-statement details, remediation actions, and
file re-processing triggers. Keeping them isolated simplifies ACL checks and rate
limit overrides for heavy operations.
"""

# router = APIRouter(prefix="/statements", tags=["statements"])
