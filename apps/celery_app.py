"""Celery application instance and configuration."""

from celery import Celery
from kombu import Queue

from apps.core.config import settings

# Create Celery app instance
celery_app = Celery(
    "cypherx",
    broker=settings.celery_broker,
    backend=settings.celery_backend,
    include=[
        "apps.tasks.statements",
        "apps.tasks.pdf_verification",
        "apps.tasks.financial_intelligence",
    ]
)

# Celery configuration
celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # Timezone
    timezone="UTC",
    enable_utc=True,

    # Task execution
    task_track_started=True,
    task_time_limit=1800,  # 30 minutes hard limit
    task_soft_time_limit=1500,  # 25 minutes soft limit

    # Worker configuration
    worker_prefetch_multiplier=1,  # One task per worker at a time
    worker_max_tasks_per_child=1000,  # Recycle workers after 1000 tasks
    broker_connection_retry_on_startup=True,

    # Task acknowledgment
    task_acks_late=True,  # Acknowledge after completion (for reliability)
    task_reject_on_worker_lost=True,

    # Queues
    task_default_queue="default",
    task_queues=(
        Queue("default", routing_key="task.#"),
        Queue("high_priority", routing_key="priority.high"),
        Queue("low_priority", routing_key="priority.low"),
    ),

    # Task routing
    task_routes={
        "apps.tasks.statements.process_statement_task": {
            "queue": "default",
            "routing_key": "task.statement"
        },
        "apps.tasks.pdf_verification.process_pdf_verification_task": {
            "queue": "default",
            "routing_key": "task.pdf_verification"
        },
        "apps.tasks.financial_intelligence.process_financial_intelligence_task": {
            "queue": "high_priority",
            "routing_key": "priority.high"
        },
    },

    # Rate limiting (optional global limit)
    task_annotations={
        "*": {
            "rate_limit": "100/m",  # 100 tasks per minute max
        }
    },

    # Retry configuration
    task_autoretry_for=(Exception,),
    task_retry_kwargs={
        "max_retries": 3,
        "countdown": 60,  # Wait 1 minute before retry
    },
    task_retry_backoff=True,
    task_retry_backoff_max=600,  # Max 10 minutes between retries
    task_retry_jitter=True,  # Add random jitter to avoid thundering herd

    # Result backend
    result_expires=3600,  # Results expire after 1 hour
    result_persistent=True,

    # Testing mode (if enabled in settings)
    task_always_eager=settings.celery_task_always_eager,
    task_eager_propagates=settings.celery_task_always_eager,
)

# Optional: Beat schedule for periodic tasks (if needed in future)
celery_app.conf.beat_schedule = {
    # Example periodic task:
    # 'cleanup-old-jobs': {
    #     'task': 'apps.tasks.maintenance.cleanup_old_jobs',
    #     'schedule': crontab(hour=2, minute=0),  # Run at 2 AM daily
    # },
}
