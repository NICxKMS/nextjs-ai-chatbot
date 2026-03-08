# Health Check

```
FLOW: Health Check
ENTRY: GET /api/health — no auth, no CSRF, no rate limiting
STEPS:

  ── Route Classification ──

  0. proxy.ts: `/api/health` is in PUBLIC_ROUTES set AND is in
     RATE_LIMIT_EXEMPT_PREFIXES → handled as public route.
     Actually, checking the matcher config: `["/", "/chat/:path*", "/login", "/register", "/api/chat"]`
     — `/api/health` is NOT in the matcher, so proxy.ts never runs for this route.
     The request goes directly to the route handler.

  ── Dependency Checks (Parallel) ──

  1. `Promise.all([checkDatabase(), checkCache()])` — both run concurrently

  2. `checkDatabase()` (app/api/health/route.ts):
     a. `Date.now()` → start timer
     b. `db.execute(sql\`SELECT 1\`)` → Drizzle ORM → Supabase PostgreSQL
        - Uses the shared `db` client from `lib/db/client.ts`
        - Minimal query — just validates connectivity
     c. `Date.now()` → end timer → compute latency
     d. If latency > 1000ms → status: "degraded", error: "High database latency"
     e. If latency ≤ 1000ms → status: "healthy", latency value
     f. If any error → `logDependencyFailure("database", error)` → status: "unhealthy"

  3. `checkCache()` (app/api/health/route.ts):
     a. `Date.now()` → start timer
     b. `ping()` (lib/cache/client.ts):
        - `withRedisClient(client => client.ping())` → Upstash Redis HTTP API
        - Returns "PONG" on success, null if Redis not configured or unavailable
     c. `Date.now()` → end timer → compute latency
     d. If result === null → status: "degraded", error: "Cache not configured or unavailable"
     e. If latency > 1000ms → status: "degraded", error: "High cache latency"
     f. If latency ≤ 1000ms → status: "healthy", latency value
     g. If any error → `logDependencyFailure("cache", error)` → status: "unhealthy"

  ── Status Derivation ──

  4. `deriveOverallStatus(checks)`:
     - Collect all check statuses
     - If ANY is "unhealthy" → overall: "unhealthy"
     - Else if ANY is "degraded" → overall: "degraded"
     - Else → overall: "healthy"

  ── Response ──

  5. Construct response body:
     ```json
     {
       "status": "healthy | degraded | unhealthy",
       "timestamp": "2026-03-07T...",
       "checks": {
         "database": { "status": "healthy", "latency": 42 },
         "cache": { "status": "healthy", "latency": 15 }
       }
     }
     ```

  6. HTTP status code:
     - "unhealthy" → 503 Service Unavailable
     - "healthy" or "degraded" → 200 OK

  7. Headers: `Cache-Control: public, max-age=60, s-maxage=60`
     - Cached for 60 seconds at CDN and browser level

BOTTLENECKS:
  - Database check makes a real SQL query (`SELECT 1`) to the PostgreSQL database.
    This validates the full connection path (DNS → TCP → TLS → auth → query).
  - Redis check makes an HTTP request to Upstash (PING command via HTTP API).
  - Both run in parallel, so total latency = max(db_latency, cache_latency).

WASTE:
  - The `SELECT 1` query exercises the DB connection but doesn't validate
    schema integrity or data access. A more thorough check might query a
    known table (e.g., `SELECT count(*) FROM user LIMIT 1`), but that would
    add overhead.
  - The 1000ms latency threshold is hardcoded. In production, acceptable
    latency may vary by deployment region. This could be configurable.
  - Cache check returns "degraded" (not "unhealthy") when Redis is not configured.
    Since Redis is optional in this architecture (rate limiting gracefully degrades),
    this is correct behavior — but it means the health check will always report
    "degraded" in environments without Redis.

SIMPLIFICATION OPPORTUNITIES:
  - The health check is clean and well-structured. Minor improvements:
    - Make LATENCY_THRESHOLD_MS configurable via env var
    - Add a lightweight schema version check to the DB query
    - Consider adding a memory/CPU usage check for process health
  - The `logDependencyFailure` function logs to console — in production,
    this should be structured logging for observability

EXIT: JSON response with overall status + per-dependency check results.
      HTTP 200 (healthy/degraded) or HTTP 503 (unhealthy).
```

## Health Status Matrix

| Scenario | DB Status | Cache Status | Overall | HTTP |
|----------|-----------|-------------|---------|------|
| Both fast | healthy | healthy | healthy | 200 |
| DB slow | degraded | healthy | degraded | 200 |
| Redis not configured | healthy | degraded | degraded | 200 |
| Redis slow | healthy | degraded | degraded | 200 |
| DB down | unhealthy | healthy | unhealthy | 503 |
| Redis down | healthy | unhealthy | unhealthy | 503 |
| Both down | unhealthy | unhealthy | unhealthy | 503 |

## Key Files
| File | Purpose |
|------|---------|
| `app/api/health/route.ts` | Complete health check route handler |
| `lib/cache/client.ts` | `ping()` — Redis connectivity check |
| `lib/db/client.ts` | `db` — Drizzle ORM database client |
