# Wave 1 Audit — Cross-Cutting: Logging, Rate Limiting, Error Boundaries, Security

**Date:** 2026-03-07  
**Scope:** Current app (`app/`, `features/`, `lib/`, `components/`, `proxy.ts`, `instrumentation*.ts`) — excludes `oldapp/`  
**Method:** Static analysis via grep, file reads, cross-referencing prior Wave 0/1 audits

---

## Executive Summary

| Area | CRITICAL | HIGH | MEDIUM | LOW | ✅ POSITIVE |
|------|----------|------|--------|-----|-------------|
| Logging | 0 | 1 | 3 | 2 | 3 |
| Rate Limiting | 1 | 2 | 2 | 1 | 3 |
| Error Boundaries | 0 | 0 | 1 | 1 | 4 |
| Security | 0 | 1 | 2 | 2 | 4 |
| **TOTAL** | **1** | **4** | **8** | **6** | **14** |

---

## §1. Logging

### §1.1 Console Usage Inventory (Production Paths Only)

Excluding `oldapp/`, test files, commented-out code, and `ai-elements/` (read-only):

| # | File:Line | Level | Tag/Context | Production Path? | Notes |
|---|-----------|-------|-------------|------------------|-------|
| L1 | `instrumentation-client.ts:11` | `error` | `[client-error]` | ✅ Yes | Global window.onerror handler |
| L2 | `instrumentation-client.ts:20` | `error` | `[client-unhandled-rejection]` | ✅ Yes | Global unhandledrejection handler |
| L3 | `instrumentation.ts:42` | `warn` | `[instrumentation]` | ✅ Yes (startup) | OTel init failure |
| L4 | `instrumentation.ts:51` | `warn` | `[startup]` | ✅ Yes (startup) | Missing env vars |
| L5 | `instrumentation.ts:70` | `error` | `[request-error]` | ✅ Yes | Next.js `onRequestError` hook — structured payload |
| L6 | `app/(chat)/error.tsx:21` | `error` | Chat error | ✅ Yes | Error boundary logging |
| L7 | `app/(auth)/error.tsx:21` | `error` | Auth error | ✅ Yes | Error boundary logging |
| L8 | `app/global-error.tsx:86` | `error` | Global error | ✅ Yes | Root error boundary |
| L9 | `features/artifacts/components/artifact-error-boundary.tsx:37` | `error` | `[ArtifactErrorBoundary]` | ✅ Yes | Class component error boundary |
| L10 | `app/(chat)/chat/[id]/page.tsx:61` | `error` | `[VoteResolver]` | ✅ Yes | Vote fetch failure in page |
| L11 | `proxy.ts:229` | `error` | `[proxy]` | ✅ Yes | Guest token lifecycle failure |
| L12 | `app/api/health/route.ts:27` | `error` | `[health]` | ✅ Yes | Health check dependency failures |
| L13 | `features/auth/actions/login.ts:101` | `error` | `[login]` | ✅ Yes | D012 reconciliation failure |
| L14 | `features/auth/lib/action-utils.ts:68` | `info` | `[login/register]` | ✅ Yes | Guest migration success |
| L15 | `features/auth/lib/action-utils.ts:75` | `error` | `[login/register]` | ✅ Yes | Guest migration failure |
| L16 | `features/chat/lib/chat-route.ts:336` | `error` | `[onFinish]` | ✅ Yes | Chat persistence failure — structured JSON |
| L17 | `lib/db/migrate.ts:22,28` | `info` | `[migrate]` | ✅ Yes (startup) | Migration start/complete |
| L18 | `lib/db/migrate.ts:35` | `error` | `[migrate]` | ✅ Yes (startup) | Migration failure |

### §1.2 Findings

#### F-01: No Structured Logger Exists
```
SEVERITY: HIGH | FILE: lib/utils/ (missing logger.ts) | 
FINDING: No structured logging module exists. All 18 production log sites use raw 
  console.log/error/warn/info. The old plan called for `lib/utils/logger.ts` (see 
  plan-archives/oldplan-before-redesign/phases/p00-scaffold.md:351) but it was never 
  created. The oldapp had `oldapp/lib/log.ts`. No third-party logger (pino, winston) 
  is installed. The `@vercel/otel` integration exists but only for OpenTelemetry 
  tracing (not structured logging).
RECOMMENDATION: Create `lib/utils/logger.ts` with structured JSON output in production,
  human-readable in development. Minimal interface: { info, warn, error, debug }. 
  All current console.* calls should migrate to use it. This enables:
  - Consistent format for log aggregators (Vercel, Datadog, etc.)
  - Log level filtering per environment
  - Correlation IDs (request-scoped)
  - Future swap to pino/winston without changing call sites
```

#### F-02: Critical Auth Mutations Lack Logging on Success
```
SEVERITY: MEDIUM | FILE: features/auth/actions/login.ts, register.ts, logout.ts |
FINDING: Auth actions log failures (login.ts:101, action-utils.ts:75) but NOT 
  successes. Successful logins, registrations, and logouts produce zero server-side 
  log output. This is a security audit blind spot — failed and successful auth 
  events should both be logged for incident investigation.
RECOMMENDATION: Add info-level log on successful auth events:
  - login.ts: after successful signInWithPassword + before redirect
  - register.ts: after successful signUp
  - logout.ts: after successful signOut
  Format: `[auth] login success { userId, email, ip }` (sanitized)
```

#### F-03: Rate Limit Bypass Not Logged
```
SEVERITY: MEDIUM | FILE: lib/cache/rate-limit.ts:18-20 |
FINDING: When Redis is unavailable, `checkRateLimit` silently returns `true` (allow).
  This is correct graceful degradation, but the bypass is NOT logged anywhere.
  An attacker who takes Redis offline gets unlimited requests with zero log evidence.
RECOMMENDATION: Add a rate-limited warning log when Redis returns null:
  `[rate-limit] Redis unavailable — bypassing rate limit for key: ${key}`
  Use a simple in-memory throttle to avoid log flooding (e.g., once per 60s per key prefix).
```

#### F-04: Chat Persistence Failure Log Includes userId but Not IP
```
SEVERITY: LOW | FILE: features/chat/lib/chat-route.ts:336 |
FINDING: The `logChatPersistenceFailure` function logs chatId, userId, isNewChat, 
  messageCount, and error — but NOT the request IP or user agent. This makes 
  correlation with proxy/access logs harder.
RECOMMENDATION: Low priority. Context enrichment would be handled automatically
  by a structured logger with request-scoped context.
```

#### F-05: Error Boundaries Log digest OR message, Never Both
```
SEVERITY: LOW | FILE: app/(chat)/error.tsx:21, app/(auth)/error.tsx:21, app/global-error.tsx:86 |
FINDING: All three error boundaries log `error.digest ?? error.message`. The digest 
  is a hash, the message is the human text. In production, Next.js replaces the 
  message with a generic one and provides the digest. Logging ONLY digest without 
  the original message loses context.
RECOMMENDATION: Log both: `console.error("Chat error:", { digest: error.digest, message: error.message })`
  This is automatically handled if migrated to a structured logger (F-01).
```

#### F-06: Delete/Rename Mutations — No Server-Side Logging
```
SEVERITY: MEDIUM | FILE: features/chat/actions/delete-chat.ts, delete-all-chats.ts, 
  features/sidebar/actions/rename-chat.ts, features/visibility/actions/update-visibility.ts |
FINDING: Destructive operations (delete chat, delete all chats, rename chat, 
  change visibility) produce NO server-side log output on success or failure. 
  If a user reports "my chats disappeared," there is zero server evidence of 
  what happened, when, or by whom.
RECOMMENDATION: Add info-level logging on mutation success:
  `[chat] delete { chatId, userId }`, `[chat] delete-all { userId, count }`, etc.
  Error branches already return ActionResult errors but don't log them server-side.
```

### §1.3 Positive Findings

| # | Finding |
|---|---------|
| L+ 1 | `instrumentation.ts:onRequestError` is comprehensive — logs method, path, routerKind, routePath, routeType, digest, message for ALL server errors |
| L+ 2 | `instrumentation-client.ts` catches both `error` and `unhandledrejection` events globally |
| L+ 3 | All console calls use meaningful prefix tags (`[health]`, `[proxy]`, `[login]`, `[onFinish]`, etc.) — consistent convention ready for logger migration |

---

## §2. Rate Limiting

### §2.1 Rate Limit Coverage Matrix

| Endpoint / Action | Type | Rate Limit? | Config | Key By |
|-------------------|------|-------------|--------|--------|
| `POST /api/chat` | Route Handler | ✅ Yes | 20 req / 60s | userId |
| `POST /api/files/upload` | Route Handler | ✅ Yes | 10 req / 3600s | userId |
| `login()` | Server Action | ✅ Yes | 5 req / 60s | IP |
| `register()` | Server Action | ✅ Yes | 3 req / 60s | IP |
| `voteOnMessage()` | Server Action | ✅ Yes | 20 req / 60s | userId |
| `GET /api/artifact` | Route Handler | ❌ **NO** | — | — |
| `POST /api/artifact` | Route Handler | ❌ **NO** | — | — |
| `GET /api/history` | Route Handler | ❌ **NO** | — | — |
| `GET /api/suggestions` | Route Handler | ❌ **NO** | — | — |
| `GET /api/health` | Route Handler | ❌ **NO** (exempt) | — | — |
| `deleteChat()` | Server Action | ❌ **NO** | — | — |
| `deleteAllChats()` | Server Action | ❌ **NO** | — | — |
| `deleteTrailingMessages()` | Server Action | ❌ **NO** | — | — |
| `renameChat()` | Server Action | ❌ **NO** | — | — |
| `updateChatVisibility()` | Server Action | ❌ **NO** | — | — |
| `logout()` | Server Action | ❌ **NO** | — | — |

### §2.2 Findings

#### F-07: Missing Rate Limits on Artifact Endpoints (GET + POST)
```
SEVERITY: CRITICAL | FILE: app/api/artifact/route.ts |
FINDING: Neither GET nor POST on /api/artifact has rate limiting. 
  POST triggers database writes (save/restore artifact versions).
  GET fetches potentially large artifact content from the database.
  Both require auth but are otherwise unbounded.
  
  Impact: An authenticated user (or compromised session) can:
  - POST: Flood the DB with artifact versions (storage exhaustion)
  - GET: Hammer the DB with content-heavy queries (DoS on database)
  
  The old app had rate limiting on artifact operations (oldapp/artifacts/actions.ts:33).
  This is a regression.
RECOMMENDATION: Add rate limiting to both:
  - POST: 20 req/60s per userId (same as chat)
  - GET: 30 req/60s per userId (higher since UI fetches versions on open)
  Add rateLimitKeys.rateLimitArtifact to keys.ts.
```

#### F-08: Missing Rate Limits on History and Suggestions GET
```
SEVERITY: HIGH | FILE: app/api/history/route.ts, app/api/suggestions/route.ts |
FINDING: History and suggestions endpoints have no rate limiting. Both hit the 
  database on every request. History returns paginated chat lists; suggestions 
  returns artifact suggestions with full content.
  
  Impact: Automated scraping or polling abuse can stress the database.
  While these are GET-only (no writes), they're O(n) queries on user data.
RECOMMENDATION:
  - History GET: 30 req/60s per userId
  - Suggestions GET: 30 req/60s per userId
  Add rateLimitKeys.rateLimitHistory and rateLimitKeys.rateLimitSuggestions to keys.ts.
```

#### F-09: INCR + EXPIRE Non-Atomic Race Condition
```
SEVERITY: HIGH | FILE: lib/cache/rate-limit.ts:17-24, lib/cache/client.ts:57-68 |
FINDING: The rate limiting implementation uses two sequential Redis commands:
  1. INCR key → returns count
  2. If count === 1, EXPIRE key windowSeconds
  
  Race condition: If the process crashes or the connection drops between INCR and 
  EXPIRE, the key persists forever with no TTL. Subsequent requests increment 
  against a counter that never resets — effectively a permanent rate limit.
  
  Additionally, @upstash/ratelimit v2.0.8 is already in package.json (line 58) 
  but completely unused. It uses atomic Lua scripts internally.
RECOMMENDATION: Replace the hand-rolled INCR+EXPIRE with @upstash/ratelimit SDK.
  Migration is 2 files changed, 0 call sites changed (see /post-work/w1-audit-lib-infra.md 
  Appendix A+B for full guide). The SDK provides:
  - Atomic Lua scripts (no race condition)
  - Sliding window algorithm (no burst at window boundaries)
  - Built-in caching and timeout handling
  - Retry-After calculation in the response
```

#### F-10: Rate Limit 429 Responses Missing Retry-After Header
```
SEVERITY: MEDIUM | FILE: lib/errors/app-error.ts:33-37 |
FINDING: All 429 responses are plain `{ code, message }` with no Retry-After header.
  RFC 6585 §4 recommends including Retry-After. The old app included it 
  (oldapp/proxy.ts:147). Well-behaved HTTP clients respect this header.
RECOMMENDATION: Extend AppError.rateLimited() to accept an optional `retryAfter` 
  seconds parameter. When using @upstash/ratelimit, the retryAfter value is 
  returned automatically in the rate limit response.
```

#### F-11: Server Action Mutations Lack Rate Limiting
```
SEVERITY: MEDIUM | FILE: features/chat/actions/delete-chat.ts, delete-all-chats.ts, 
  delete-trailing-messages.ts, features/sidebar/actions/rename-chat.ts, 
  features/visibility/actions/update-visibility.ts |
FINDING: Five destructive Server Action mutations have no rate limiting:
  - deleteChat (DB delete + FK cascade)
  - deleteAllChats (bulk DB delete)
  - deleteTrailingMessages (partial message deletion)
  - renameChat (DB update)
  - updateChatVisibility (DB update)
  
  All require auth and verify ownership, but a compromised or malicious 
  authenticated user could rapid-fire delete operations.
RECOMMENDATION: Low-medium priority. These are behind Server Action CSRF protection 
  and require ownership. Consider a general "mutation" rate limit (e.g., 30/60s 
  per userId) applied via a shared wrapper, rather than per-action limits.
```

#### F-12: Health Endpoint Has No Rate Limit
```
SEVERITY: LOW | FILE: app/api/health/route.ts |
FINDING: /api/health has no rate limiting and is explicitly rate-limit-exempt in 
  proxy.ts:38. It runs SELECT 1 on Postgres and PING on Redis every request.
  Publicly accessible (no auth required).
RECOMMENDATION: Health endpoints are typically rate-limit-exempt for monitoring 
  systems. However, consider a basic IP-based limit (e.g., 60/60s) to prevent 
  abuse as a database availability oracle. Low priority.
```

### §2.3 Positive Findings

| # | Finding |
|---|---------|
| R+ 1 | All rate-limited endpoints gracefully degrade when Redis is unavailable (returns `true`/allow) |
| R+ 2 | Rate limit keys are cleanly namespaced and centralized in `lib/cache/keys.ts` |
| R+ 3 | Auth rate limits are correctly keyed by IP (not userId) — prevents lockout attacks against users |

---

## §3. Error Boundaries

### §3.1 Error Boundary Inventory

| Boundary | Scope | Type | Recovery Options |
|----------|-------|------|-----------------|
| `app/global-error.tsx` | Root (replaces root layout on crash) | React Error Boundary | "Go Home" link + "Try Again" button |
| `app/(auth)/error.tsx` | Auth route group (`/login`, `/register`) | React Error Boundary | "Try Again" button + "Go Home" link |
| `app/(chat)/error.tsx` | Chat route group (`/`, `/chat/*`) | React Error Boundary | "Go Home" link + "Try Again" button |
| `features/artifacts/components/artifact-error-boundary.tsx` | Artifact editor content only | Class Component Error Boundary | "Try Again" button |
| `app/not-found.tsx` | 404 (not an error boundary) | Server Component | "Go Home" link |

### §3.2 Loading State Coverage

| Route Segment | `loading.tsx`? | Notes |
|---------------|----------------|-------|
| `app/(auth)/` | ✅ Yes | Auth pages |
| `app/(chat)/` | ✅ Yes | Chat layout |
| `app/(chat)/chat/[id]/` | ✅ Yes | Individual chat page |

### §3.3 Findings

#### F-13: No Page-Level Error Boundary at chat/[id]
```
SEVERITY: MEDIUM | FILE: app/(chat)/chat/[id]/ (missing error.tsx) |
FINDING: No error.tsx exists at the `chat/[id]` route segment. If ExistingChatPage 
  throws (e.g., fetching a deleted chat, DB error), the error bubbles up to 
  `(chat)/error.tsx`, which replaces the ENTIRE SidebarInset — including the sidebar 
  navigation. The user loses their sidebar to navigate elsewhere.
  
  A page-level error boundary at `chat/[id]/error.tsx` could:
  - Preserve the sidebar for navigation
  - Show chat-specific recovery (e.g., "This chat couldn't be loaded")
  - Offer "Go back to home" within the existing layout
RECOMMENDATION: Add `app/(chat)/chat/[id]/error.tsx` with chat-specific error recovery
  that renders within the sidebar layout. (Previously identified as F-11 in 
  w1-audit-app-routes.md / P12)
```

#### F-14: Swallowed Promise Rejections — Intentional but Undocumented
```
SEVERITY: LOW | FILE: app/api/chat/route.ts:117, features/chat/hooks/use-chat-session.ts:182 |
FINDING: Several fire-and-forget patterns exist:
  - `void generateTitle(messageText).catch(() => {})` — title generation silently swallowed
  - `void sdkSendMessage(...)` — message sending fire-and-forget in hook
  
  These are INTENTIONAL (title is optional metadata, sdkSendMessage error surfaces 
  through the useChat error callback). However, they lack inline documentation 
  explaining WHY the rejection is safe to swallow.
RECOMMENDATION: Add brief comments at each swallowed catch explaining the rationale.
  No code change needed — this is documentation hygiene.
```

### §3.4 Positive Findings

| # | Finding |
|---|---------|
| E+ 1 | Every route group has an error boundary — 100% coverage at the group level |
| E+ 2 | `global-error.tsx` correctly renders its own `<html>`/`<body>` with inline CSSProperties (no dependency on root layout or Tailwind) |
| E+ 3 | `ArtifactErrorBoundary` is scoped to editor content only — panel chrome remains functional |
| E+ 4 | `instrumentation-client.ts` catches both `window.onerror` and `unhandledrejection` — client errors that escape React boundaries |

---

## §4. Security

### §4.1 CSRF Protection

| Endpoint | Method | CSRF? | Mechanism |
|----------|--------|-------|-----------|
| `POST /api/chat` | Route Handler | ✅ Yes | `validateOrigin(request)` |
| `POST /api/artifact` | Route Handler | ✅ Yes | `validateOrigin(request)` |
| `POST /api/files/upload` | Route Handler | ✅ Yes | `validateOrigin(request)` |
| `GET /api/artifact` | Route Handler | ❌ N/A | GET — idempotent, no CSRF needed |
| `GET /api/history` | Route Handler | ❌ N/A | GET — idempotent |
| `GET /api/suggestions` | Route Handler | ❌ N/A | GET — idempotent |
| `GET /api/health` | Route Handler | ❌ N/A | GET — public, no auth |
| All Server Actions | Server Action | ✅ Yes | Built-in Next.js CSRF (automatic) |

**Result:** ✅ All POST route handlers have explicit CSRF. All Server Actions have built-in CSRF. GETs correctly skip CSRF.

### §4.2 Input Validation

| Endpoint / Action | Validates Input? | Schema |
|-------------------|------------------|--------|
| `POST /api/chat` | ✅ `chatRequestSchema.safeParse(body)` | Zod via `features/chat/schemas/chat.schema.ts` |
| `POST /api/artifact` | ✅ `artifactPostBodySchema.safeParse(body)` | Zod |
| `POST /api/files/upload` | ✅ MIME type + file size checks | Manual (not Zod, but adequate) |
| `GET /api/artifact` | ✅ `getArtifactSchema.safeParse(...)` | Zod |
| `GET /api/history` | ✅ `historyQuerySchema.safeParse(...)` | Zod |
| `GET /api/suggestions` | ✅ `querySchema.safeParse(...)` | Zod |
| `login()` | ✅ `loginSchema.safeParse(...)` | Zod |
| `register()` | ✅ `registerSchema.safeParse(...)` | Zod |
| `logout()` | ✅ N/A (no input) | — |
| `deleteChat()` | ✅ `deleteChatSchema.safeParse(input)` | Zod |
| `deleteAllChats()` | ✅ N/A (no input) | — |
| `deleteTrailingMessages()` | ✅ `deleteMessagesSchema.safeParse(input)` | Zod |
| `renameChat()` | ✅ `renameChatSchema.safeParse(input)` | Zod |
| `updateChatVisibility()` | ✅ `updateVisibilitySchema.safeParse(input)` | Zod |
| `voteOnMessage()` | ✅ `voteSchema.safeParse(input)` | Zod |

**Result:** ✅ 100% input validation coverage. All use Zod schemas except file upload (manual validation — acceptable).

### §4.3 IDOR Protection

| Resource | Ownership Check? | Method |
|----------|------------------|--------|
| Chat (view) | ✅ | `chat.userId !== session.user.id` |
| Chat (delete) | ✅ | `getChatById` + ownership check |
| Chat (rename) | ✅ | `getChatById` + ownership check |
| Chat (visibility) | ✅ | `getChatById` + ownership check |
| Chat messages (delete trailing) | ✅ | Chat ownership via `getChatById` |
| Artifact (GET) | ✅ | `latest.userId !== session.user.id` |
| Artifact (POST save) | ✅ | `existing.userId !== userId` if exists |
| Suggestions (GET) | ✅ | `artifact.userId !== session.user.id` |
| Vote | ✅ | Chat ownership + message-in-chat verification |
| History (GET) | ✅ | `getChatsByUserId(session.user.id)` — scoped by design |

**Result:** ✅ Complete IDOR protection. All resource access verifies ownership.

### §4.4 Findings

#### F-15: No Security Headers Configured
```
SEVERITY: HIGH | FILE: next.config.ts, vercel.json |
FINDING: Zero security headers are configured anywhere:
  - No Content-Security-Policy (CSP) — XSS protection
  - No X-Frame-Options — clickjacking protection
  - No X-Content-Type-Options — MIME sniffing protection
  - No Strict-Transport-Security (HSTS) — downgrade attack protection
  - No Referrer-Policy — information leakage
  - No Permissions-Policy — feature restriction
  
  Neither `next.config.ts` (no `headers()` function), `vercel.json` (only
  `{ "framework": "nextjs" }`), nor `proxy.ts` sets any security headers.
  
  The old app also lacked these, so this is not a regression — but it's a 
  significant gap for a production app handling user auth and data.
RECOMMENDATION: Add security headers via `next.config.ts` headers() config:
  ```typescript
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
        // HSTS handled by Vercel automatically for custom domains
        // CSP requires careful configuration due to inline scripts/styles
      ],
    }]
  }
  ```
  CSP should be added incrementally — start with report-only mode.
  (Previously identified as F-27 in w1-audit-app-routes.md / P4)
```

#### F-16: Sidebar Cookie Lacks httpOnly and secure Flags
```
SEVERITY: MEDIUM | FILE: components/ui/sidebar-provider.tsx:93 |
FINDING: The sidebar state cookie is set via `document.cookie` with only 
  `path=/; max-age=...; samesite=lax`. It is missing:
  - `httpOnly` — not applicable (client-side read required for SSR preload)
  - `secure` — missing in production
  
  Since this is a UI preference cookie (not auth-sensitive), the risk is LOW.
  However, the missing `secure` flag means it's sent over plain HTTP in dev.
RECOMMENDATION: Add `secure` flag in production:
  `document.cookie = \`...; samesite=lax${isProduction ? '; secure' : ''}\``
  The `httpOnly` omission is INTENTIONAL — the cookie must be readable by 
  client-side JavaScript to avoid a layout flash.
```

#### F-17: CSRF Origin Check Rebuilds Allowed Origins on Every POST
```
SEVERITY: MEDIUM | FILE: lib/utils/validate-origin.ts:5-23 |
FINDING: `getAllowedOrigins()` creates a new Set, parses a new URL, and reads 
  environment variables on every POST request. These values never change at runtime.
RECOMMENDATION: Pre-compute `allowedOrigins` at module level (lazy singleton).
  See prior finding in w1-audit-lib-infra.md and flows/csrf-protection.md.
  This is a performance issue, not a security bug.
```

#### F-18: File Upload — Path Traversal Protection Present
```
SEVERITY: LOW ✅ | FILE: app/api/files/upload/route.ts:33-44 |
FINDING: The `sanitizeFilename()` function correctly:
  - Removes path separators (/, \, :) and null bytes
  - Replaces non-alphanumeric characters with underscore
  - Limits total length to 100 characters
  - Validates MIME type prefix ("image/")
  - Enforces max file size (5 MB)
  This is well-implemented. No action needed.
```

#### F-19: Guest Token Cookie Security Flags Correct
```
SEVERITY: LOW ✅ | FILE: proxy.ts:116-122 |
FINDING: Guest token cookie is set with:
  - httpOnly: true ✅
  - secure: production only ✅ (process.env.NODE_ENV === "production")
  - sameSite: "lax" ✅
  - maxAge: 7 days ✅
  - path: "/" ✅
  This matches security best practices. No action needed.
```

### §4.5 Positive Findings

| # | Finding |
|---|---------|
| S+ 1 | 100% CSRF coverage — all POST route handlers use `validateOrigin()`, all Server Actions have built-in CSRF |
| S+ 2 | 100% Zod input validation on every endpoint and action |
| S+ 3 | 100% IDOR protection — every resource access verifies ownership |
| S+ 4 | Guest cookie security flags are correctly configured (httpOnly, secure in prod, sameSite=lax) |

---

## §5. Cross-Reference with Prior Audits

| Finding Here | Prior Audit Reference | Status |
|---|---|---|
| F-07 (artifact rate limit) | w1-audit-app-routes.md F-13 (CRITICAL) | Confirmed — still unresolved |
| F-08 (history/suggestions rate limit) | w1-audit-app-routes.md F-14, F-15 | Confirmed — still unresolved |
| F-09 (INCR+EXPIRE atomicity) | w1-audit-lib-infra.md Appendix A+B | Confirmed — migration guide ready |
| F-10 (Retry-After) | w1-audit-app-routes.md F-17 | Confirmed — still unresolved |
| F-13 (chat/[id] error boundary) | w1-audit-app-routes.md F-11 / P12 | Confirmed — still unresolved |
| F-15 (security headers) | w1-audit-app-routes.md F-27 / P4 | Confirmed — still unresolved |

---

## §6. Prioritized Action Items

| Priority | Finding | Action | Effort | Impact |
|----------|---------|--------|--------|--------|
| **P1** | F-07 | Add rate limiting to `/api/artifact` GET + POST | Small | Blocks storage/DB exhaustion |
| **P2** | F-15 | Add security headers to `next.config.ts` | Small | Industry-standard protection |
| **P3** | F-09 | Replace INCR+EXPIRE with `@upstash/ratelimit` SDK | Small | Eliminates race condition, adds sliding window |
| **P4** | F-08 | Add rate limiting to history + suggestions GET | Small | Prevents DB query abuse |
| **P5** | F-01 | Create structured logger (`lib/utils/logger.ts`) | Medium | Foundation for all other logging fixes |
| **P6** | F-02 | Add auth success logging | Small | Security audit trail |
| **P7** | F-10 | Add Retry-After header to 429 responses | Small | RFC compliance |
| **P8** | F-06 | Add mutation success/failure logging | Small | Operational visibility |
| **P9** | F-13 | Add `chat/[id]/error.tsx` error boundary | Small | Preserves sidebar on error |
| **P10** | F-03 | Log rate limit Redis bypass | Small | Security monitoring |
| **P11** | F-11 | Add rate limiting to Server Action mutations | Medium | Defense in depth |
| **P12** | F-17 | Pre-compute CSRF allowed origins | Small | Performance optimization |
| **P13** | F-16 | Add `secure` flag to sidebar cookie in production | Trivial | Minor hardening |

---

## §7. Confidence Assessment

| Area | Confidence | Reasoning |
|------|------------|-----------|
| Logging inventory | **HIGH** | Full grep of all console.* in non-oldapp `.ts`/`.tsx` files |
| Rate limit coverage | **HIGH** | Every route handler and server action read end-to-end; cross-referenced with keys.ts |
| Error boundaries | **HIGH** | File search for all error.tsx + manual read of each |
| CSRF coverage | **HIGH** | Every POST handler and Server Action verified for validateOrigin or "use server" |
| Input validation | **HIGH** | Every handler/action read for Zod schema usage |
| IDOR protection | **HIGH** | Every resource-access path traced for ownership check |
| Security headers | **HIGH** | next.config.ts, vercel.json, proxy.ts all read — zero header configuration found |
| Cookie security | **HIGH** | All cookie-setting code in proxy.ts and sidebar-provider.tsx read |
