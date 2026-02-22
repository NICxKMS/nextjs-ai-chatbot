# Edge Cases, Boundary States, And Ambiguities

## Edge-Case Catalog

## A) Loading/Empty/Error UI States
- Global app shell fallback: centered spinner while suspense-bound shell resolves.
- Chat route loading states:
  - `/` chat loading.
  - `/chat/[id]` conversation loading.
- Route-level error boundary for chat pages with retry and home navigation.
- Global error boundary fallback for uncaught render errors.
- Message-level generation error UI:
  - error card in message list footer.
  - retry action triggers regenerate.
- Empty-history states:
  - unauthenticated prompt to login.
  - authenticated but no chats -> encouragement message.
- Empty stream-resume responses are valid and intentionally returned in multiple conditions.

## B) Session And Auth Boundaries
- Guest cookie may exist but be invalid/expired:
  - treated as absent and reissued by proxy where applicable.
- If Supabase cookie exists, guest creation path is skipped.
- Auth exchange verifies token before cookie set (invalid token never persisted).
- Logout clears both auth and guest cookies (clean-slate semantics).

## C) Ownership And Privacy Boundaries
- Private chat/document/suggestion access requires ownership.
- Suggestions route uses "return empty array" when document not accessible to avoid existence disclosure.
- Vote route validates message belongs to chat to prevent cross-chat vote targeting.
- Chat page with non-owned private chat redirects with notice instead of rendering restricted content.

## D) Input Validation Boundaries
- Chat message text part max length 2000; title/system/settings have explicit bounds.
- Document content max 1MB and title max 500 chars.
- Upload file max 5MB and MIME restrictions with explicit error mapping.
- Pagination guards:
  - limit must be positive and capped.
  - invalid cursor format rejected.
  - conflicting history cursors rejected.

## E) Guest-Specific Boundaries
- Guest operations depend on Redis availability; if unavailable, key flows reject.
- Guest persistence is cache-only and can disappear with cache eviction/expiry.
- Guest capabilities restricted:
  - no vote persistence.
  - no suggestion persistence/retrieval.
  - lower daily quota.

## F) Streaming And Resume Boundaries
- Resume endpoint only restores most recent assistant message within recency threshold.
- If latest message role is not assistant, resume returns empty stream.
- Stream errors are surfaced both via logs and user-facing fallback text.
- Data stream parser handles both JSON string and pre-parsed append-message payloads.

## G) Cache/DB Consistency Boundaries
- Authenticated writes are DB-first then cache update (best effort).
- Cache read failures for authenticated users degrade to DB fallback.
- For guest mode, cache failure typically means functional failure (no DB fallback).
- Message/document deletion uses transactions on DB paths to avoid orphaned linked rows.

## H) Artifact-Specific Boundaries
- Supported server artifact kinds are `text`, `code`, `sheet`; unsupported kind throws explicit error.
- Artifact visibility can auto-open based on streamed content length thresholds.
- Code execution environment depends on loading Pyodide script at runtime; failures are captured as console outputs.
- Suggestion streams may exist transiently even if persistence later fails.

## I) Health And Operational Boundaries
- Health endpoint can return `degraded` while still HTTP 200.
- Missing critical env vars in health check marks environment unhealthy.
- Rate limiter design may fail open for most routes but fail closed for auth edge limiter.

## Ambiguities For Gap Analysis

### A1) Public Chat Access Semantics (Uncertain)
- Observation:
  - Route implementation often still requires authenticated route guard.
  - Tests include a fixed/skipped scenario expecting non-owner access to public chat stream.
- Ambiguity:
  - Is public visibility intended for authenticated-only non-owners, fully anonymous access, or currently non-functional/public-in-name-only?
- Downstream need:
  - explicit product decision for public read/stream contract and auth requirements.

### A2) Test vs Runtime Schema Drift Risk
- Observation:
  - Some tests use payload fields that may not match current strict schemas (e.g., chat id generation assumptions, legacy model ids).
- Ambiguity:
  - Are tests stale, or are compatibility shims expected but missing?
- Downstream need:
  - canonical payload examples and a single canonical contract policy (strict-break baseline).

### A3) Model Capability Policy Drift
- Observation:
  - UI and backend both enforce model/tooling constraints with separate logic branches.
- Ambiguity:
  - single source of truth for "attachments allowed/tools allowed/reasoning toggle" is not fully centralized.
- Downstream need:
  - define authoritative policy layer to prevent UI/backend mismatch.

### A4) Guest Durability Expectations
- Observation:
  - guest sessions are intentionally temporary but UX still presents robust chat workflow.
- Ambiguity:
  - expected user-facing messaging when guest cache data expires is only partially explicit.
- Downstream need:
  - clarify durability guarantees and explicit UX copy requirements.

## Behavioral Conclusions
- The system intentionally tolerates partial failures, but guest mode is a hard dependency on cache health.
- Several "public/contract/policy" areas need explicit, locked product decisions to avoid migration-time behavioral regression.
