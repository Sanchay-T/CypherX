# CypherX Production Features Implementation Guide

This guide explains how to run the newly implemented production-ready features.

## What's New

### 1. Celery + Redis Background Processing
- Replace in-memory job storage with persistent Celery tasks
- Reliable task retry logic with exponential backoff
- Horizontal worker scaling
- Task monitoring with Flower UI

### 2. Database Connection Pooling
- Fixed NullPool issue that was creating a new connection for every request
- Implemented QueuePool with configurable limits
- Connection pre-ping for reliability

### 3. Redis Caching Layer
- Async Redis client with connection pooling
- Caching decorators for easy use
- Cache invalidation utilities

### 4. Production API Features
- Global exception handlers for consistent error responses
- Request tracking middleware (request ID, timing)
- Security headers middleware
- Rate limiting with SlowAPI
- Enhanced health checks

### 5. Improved CORS & Security
- Configurable CORS (no more `allow_origins=["*"]`)
- Security headers (X-Frame-Options, CSP, HSTS, etc.)
- Response compression (GZip)

## Prerequisites

1. **Redis Server**
   ```bash
   # Install Redis (macOS)
   brew install redis
   brew services start redis

   # Install Redis (Ubuntu/Debian)
   sudo apt-get install redis-server
   sudo systemctl start redis

   # Verify Redis is running
   redis-cli ping
   # Should return: PONG
   ```

2. **Install New Dependencies**
   ```bash
   cd /home/user/CypherX
   pip install -r apps/requirements.txt
   ```

## Configuration

1. **Create .env file**
   ```bash
   cp .env.example .env
   ```

2. **Update .env with your values**
   - Set `REDIS_URL=redis://localhost:6379/0`
   - Configure database pooling settings
   - Set CORS allowed origins
   - All other existing config

## Running the Application

### Option 1: Development (All-in-One)

```bash
# Terminal 1: Start API server
uvicorn apps.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Start Celery worker
./scripts/start_worker.sh

# Terminal 3 (Optional): Start Flower monitoring UI
./scripts/start_flower.sh
# Access at: http://localhost:5555
```

### Option 2: Using Separate Commands

**Start API:**
```bash
uvicorn apps.main:app --reload --port 8000
```

**Start Celery Worker:**
```bash
celery -A apps.celery_app worker --loglevel=info --concurrency=4 -Q default,high_priority,low_priority
```

**Start Flower (Task Monitoring):**
```bash
celery -A apps.celery_app flower --port=5555
```

## Testing the New Features

### 1. Test Health Checks

```bash
# Liveness check
curl http://localhost:8000/health/live

# Readiness check (tests DB + Redis)
curl http://localhost:8000/health/ready
```

Expected response:
```json
{
  "status": "ready",
  "checks": {
    "database": true,
    "redis": true
  }
}
```

### 2. Test Statement Processing with Celery

```bash
# Upload a statement (this now uses Celery)
curl -X POST http://localhost:8000/ai/statements/normalize \
  -F "file=@public/samples/axis.pdf" \
  -F "bank_name=AXIS"

# Response includes job_id
# Job is now processed asynchronously by Celery worker
```

### 3. Monitor Tasks in Flower

Open http://localhost:5555 in your browser to see:
- Active tasks
- Task history
- Worker status
- Success/failure rates
- Task timing statistics

### 4. Test Rate Limiting

```bash
# Make multiple requests quickly
for i in {1..10}; do
  curl http://localhost:8000/health/live
done

# After exceeding limits, you'll get:
# HTTP 429: Too Many Requests
```

### 5. Test Request Tracking

```bash
# Make a request
curl -v http://localhost:8000/health/live

# Check response headers:
# X-Request-ID: <uuid>
# X-Process-Time: 0.003
```

### 6. Test Caching (Example)

Add caching to any service method:

```python
from apps.infra.cache.decorators import cache_result

@cache_result(ttl=300, key_prefix="user")
async def get_user_by_id(user_id: str):
    # Expensive operation
    return await db.query(...)
```

## Celery Worker Configuration

### Environment Variables

```bash
# Concurrency (number of worker processes)
CELERY_CONCURRENCY=4

# Log level
CELERY_LOG_LEVEL=info

# Queues to consume
CELERY_QUEUES=default,high_priority,low_priority
```

### Multiple Workers for Different Queues

```bash
# High priority worker (more concurrency)
celery -A apps.celery_app worker -Q high_priority --concurrency=8 --loglevel=info

# Default worker
celery -A apps.celery_app worker -Q default --concurrency=4 --loglevel=info

# Low priority worker (less concurrency)
celery -A apps.celery_app worker -Q low_priority --concurrency=2 --loglevel=info
```

## Monitoring & Debugging

### Check Redis Connection

```bash
redis-cli ping
redis-cli INFO
redis-cli KEYS "celery*"
```

### Check Celery Task Status

```python
from apps.celery_app import celery_app

# Get task result
result = celery_app.AsyncResult(task_id)
print(result.state)  # PENDING, STARTED, SUCCESS, FAILURE
print(result.result)  # Task return value
```

### View Logs

```bash
# API logs (stdout)
# Celery worker logs (stdout)
# Or check log files if configured
```

## Running Tests

### Run All Tests

```bash
pytest tests/
```

### Test Celery Tasks in Eager Mode

For testing, Celery tasks run synchronously if `CELERY_TASK_ALWAYS_EAGER=true` in .env:

```python
# In test environment
CELERY_TASK_ALWAYS_EAGER=true pytest tests/
```

## Production Deployment

### 1. Run Multiple Workers

```bash
# Scale workers based on load
./scripts/start_worker.sh &  # Worker 1
./scripts/start_worker.sh &  # Worker 2
./scripts/start_worker.sh &  # Worker 3
```

### 2. Use Process Manager

**Supervisor (recommended):**

```ini
# /etc/supervisor/conf.d/cypherx-worker.conf
[program:cypherx-worker]
command=/path/to/cypherx/scripts/start_worker.sh
directory=/path/to/cypherx
user=www-data
autostart=true
autorestart=true
stdout_logfile=/var/log/cypherx/worker.log
stderr_logfile=/var/log/cypherx/worker.error.log
```

**Systemd:**

```ini
# /etc/systemd/system/cypherx-worker.service
[Unit]
Description=CypherX Celery Worker
After=network.target redis.service

[Service]
Type=forking
User=www-data
WorkingDirectory=/path/to/cypherx
ExecStart=/path/to/cypherx/scripts/start_worker.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

### 3. Monitor with Flower (Production)

```bash
# Run Flower on a non-public port or with authentication
celery -A apps.celery_app flower \
  --port=5555 \
  --address=127.0.0.1 \
  --basic_auth=user:password
```

## Troubleshooting

### Redis Connection Failed

```bash
# Check if Redis is running
redis-cli ping

# Check Redis URL in .env
echo $REDIS_URL

# Test connection
python -c "import redis; r = redis.from_url('redis://localhost:6379/0'); print(r.ping())"
```

### Celery Worker Not Starting

```bash
# Check broker connection
celery -A apps.celery_app inspect ping

# Check active workers
celery -A apps.celery_app inspect active

# Purge all tasks (if stuck)
celery -A apps.celery_app purge
```

### Tasks Not Running

```bash
# Check if workers are registered
celery -A apps.celery_app inspect registered

# Check task routing
celery -A apps.celery_app inspect conf | grep task_routes

# Monitor task events
celery -A apps.celery_app events
```

### Database Connection Pool Exhausted

Increase pool size in .env:
```bash
DB_POOL_SIZE=40
DB_MAX_OVERFLOW=20
```

## Performance Tips

1. **Tune Worker Concurrency**
   - CPU-bound tasks: `concurrency = CPU cores`
   - I/O-bound tasks: `concurrency = 2-4x CPU cores`

2. **Use Task Priorities**
   - Route critical tasks to high_priority queue
   - Use low_priority for background maintenance

3. **Enable Connection Pooling**
   - Already enabled with QueuePool
   - Adjust pool size based on load

4. **Cache Expensive Operations**
   - Use `@cache_result` decorator
   - Set appropriate TTL values

5. **Monitor Resource Usage**
   - Watch Flower dashboard
   - Monitor Redis memory usage
   - Check database connections

## Next Steps

1. ✅ Celery + Redis setup - **DONE**
2. ✅ Database connection pooling - **DONE**
3. ✅ Rate limiting - **DONE**
4. ✅ Request tracking - **DONE**
5. ✅ Security headers - **DONE**
6. ✅ Health checks - **DONE**

**Future Enhancements (See PRODUCTION_API_AUDIT_REPORT.md):**
- OpenTelemetry distributed tracing
- Prometheus metrics
- Sentry error tracking
- Docker containerization
- Kubernetes deployment

## Resources

- [Celery Documentation](https://docs.celeryproject.org/)
- [Redis Documentation](https://redis.io/docs/)
- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/)
- [SlowAPI Rate Limiting](https://slowapi.readthedocs.io/)

## Support

If you encounter issues:
1. Check logs in both API and worker processes
2. Verify Redis and database connections
3. Review Flower dashboard for task failures
4. Check environment variables in .env
