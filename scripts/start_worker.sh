#!/bin/bash
# Celery worker startup script for CypherX

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
CONCURRENCY=${CELERY_CONCURRENCY:-4}
LOG_LEVEL=${CELERY_LOG_LEVEL:-info}
QUEUES=${CELERY_QUEUES:-default,high_priority,low_priority}

echo "Starting Celery worker..."
echo "Concurrency: $CONCURRENCY"
echo "Log Level: $LOG_LEVEL"
echo "Queues: $QUEUES"

# Start Celery worker
celery -A apps.celery_app worker \
    --loglevel=$LOG_LEVEL \
    --concurrency=$CONCURRENCY \
    --max-tasks-per-child=1000 \
    --time-limit=1800 \
    --soft-time-limit=1500 \
    -Q $QUEUES \
    --without-gossip \
    --without-mingle \
    --without-heartbeat
