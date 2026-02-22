# Feature Inventory: Platform, Security, And Operations

## Feature Inventory: Platform, Security, And Operations

### 1) Route Guard Framework
- Centralized guard functions implement reusable policy checks:
  - `requireAuth*`
  - `requireRateLimit*`
  - `requireCustomRateLimit*`
  - `requireResource*`
  - `verifyOwnership*`
  - `requireNonGuest*`
- Guards exist in two styles:
  - Throwing API for server actions/internal logic.
  - Response-returning API for route handlers.
- This normalizes error shape and status behavior across endpoints.

### 2) Multi-Layer Rate Limiting
- Edge layer in proxy (`lib/middleware/edge-rate-limit.ts`):
  - API routes get IP-based limits before Node runtime handlers.
  - Auth endpoints use stricter fail-closed behavior if Redis unavailable.
- Node layer (`lib/middleware/rate-limit.ts`):
  - Strategy-specific limits: token bucket, sliding window, fixed window.
  - Presets: `strict`, `standard`, `generous`, `chat`, `upload`.
- Dedicated auth/guest exchange custom limiter flows exist by IP.
- Health route excluded from edge limiter path.

### 3) Cache-First Data Platform
- Redis-backed cache is first read source for chat/document paths where available.
- Guest paths are cache-only by design and avoid DB fallback.
- Authenticated paths are DB source-of-truth with cache warming / cache update after DB success.
- Chat cache structure includes:
  - Metadata key.
  - Message ZSET.
  - User chat index ZSET.
- Document cache includes versioned entries by document ID.

### 4) Consistency And Durability Strategy
- Write path for authenticated users is predominantly DB-first:
  - Persist in DB.
  - Update cache asynchronously (best effort).
- Read path is cache-first with DB fallback.
- Deletion and some complex writes use transactions for consistency.
- Cache failures generally degrade gracefully rather than failing user requests (except guest-only dependencies).

### 5) Quota And Entitlement Management
- Per-user daily message quota tracked in Redis (`quota:{user}:{date}`).
- Entitlements by user type:
  - Guest max messages/day: 20.
  - Regular max messages/day: 100.
- Request-level chat rate limit and day-level quota limit are separate controls.

### 6) Security Controls
- CSRF checks on auth mutation routes using Origin/Referer allow-list validation.
- Open redirect hardening on guest auth GET redirect handling.
- File upload security:
  - MIME/type checks.
  - size checks.
  - path traversal safe filename sanitization.
- Ownership/IDOR protections applied at guard and data query filter levels (`userId` filtering).
- Guest JWT rotation strategy:
  - Short-lived JWT with longer cookie lifetime.
  - Rotation threshold-based renewal preserving guest identity.

### 7) Observability And Diagnostics
- OpenTelemetry registration (`instrumentation.ts`) with service naming.
- Global process handlers for unhandled rejection and uncaught exception log capture.
- Structured internal logging for:
  - Chat lifecycle events.
  - cache failures.
  - stream errors.
  - rate limit events.
  - health check failures.
- Health endpoint provides component-level checks and degraded/unhealthy distinction.

### 8) Frontend Performance Architecture
- Heavy components use dynamic import and suspense fallbacks (sidebar, artifact editors).
- Virtualized message/history lists via Virtuoso to manage large datasets.
- Adaptive client stream throttle based on network info.
- Local state contexts split to reduce unnecessary re-renders (data stream state vs dispatch).
- Debounced local storage writes for prompt input/settings to reduce churn.
- `app/head.tsx` defines explicit network-hint policy (`preconnect`/`dns-prefetch`) for Pyodide CDN, Vercel analytics/insights, provider APIs, and weather API.

### 9) Error Contract Standardization
- Custom `ChatSDKError` drives:
  - code taxonomy (`type:surface[:reason]`).
  - consistent HTTP status mapping.
  - context-aware user-facing messages (including guest-specific variants).
- Non-production responses may include error cause; production sanitizes cause.
- Critical failures (offline/server) are explicitly logged in error class response path.

### 10) Environment And Dependency Features
- Required infra dependencies:
  - PostgreSQL (`DATABASE_URL`) for regular-user durability.
  - Upstash Redis (`CACHE_KV_REST_*`) for cache and guest persistence.
  - Supabase JWT secrets/public keys for auth integration.
- Optional but impactful:
  - AI provider keys determine model availability.
  - Blob storage token required for upload feature.
  - Server observability uses OpenTelemetry registration and process-level error handlers.
  - Client instrumentation is intentionally minimal (Vercel Analytics/Speed Insights); Sentry client SDK is not active in the oldapp snapshot.
- Next.js config enables cache components, react compiler, transition/perf options.

## Behavioral Conclusions
- The platform is designed for graceful degradation under partial dependency failure (especially cache) while preserving core authenticated durability.
- Security posture is defense-in-depth: edge controls, route guards, data-layer ownership filters, and cookie/session hardening all overlap.
- Operational behavior is highly environment-dependent; capability matrix at runtime can differ by configured providers and secrets.
