"""Inbound webhook handlers (e.g., Stripe, customer callbacks).

Webhook processing will remain HTTP-thin, verifying signatures and deferring heavy
lifting to idempotent background handlers.
"""

# router = APIRouter(prefix="/webhooks", tags=["webhooks"])
