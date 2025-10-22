#!/bin/bash
# Flower monitoring UI startup script for Celery

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
FLOWER_PORT=${FLOWER_PORT:-5555}
FLOWER_ADDRESS=${FLOWER_ADDRESS:-0.0.0.0}

echo "Starting Flower monitoring UI..."
echo "Port: $FLOWER_PORT"
echo "Address: $FLOWER_ADDRESS"
echo "Access UI at: http://localhost:$FLOWER_PORT"

# Start Flower
celery -A apps.celery_app flower \
    --port=$FLOWER_PORT \
    --address=$FLOWER_ADDRESS \
    --broker=$CELERY_BROKER_URL
