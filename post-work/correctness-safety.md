# Correctness & Safety Fixes

All correctness bugs, type safety violations, and security issues resolved during the optimization campaign.

---

## Safety (Race Conditions & Atomicity)

| Fix | Wave | Details |
|-----|------|---------|
| Non-atomic `INCR` + `EXPIRE` | W2a | Hand-rolled Redis rate limiting used two separate commands — a crash between them could leave keys without TTL (permanent rate limit). Replaced with `@upstash/ratelimit` SDK (`slidingWindow`) which executes atomically. |
| Redis env silent failure | W3 | Missing `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` silently returned `undefined` client. Now throws in production, logs a one-time warning in development, and degrades gracefully. |

## Correctness (Data Integrity)

| Fix | Wave | Details |
|-----|------|---------|
| FK cascade Suggestion → Artifact | W2a | Deleting an artifact left orphaned suggestion rows. Added `.onDelete("cascade")` to the foreign key — suggestions cascade-delete with their parent artifact. |
| `transferGuestChats` non-atomic | W2a | Guest-to-user transfer updated chats, artifacts, and suggestions in three separate queries. A failure mid-way left partially transferred data. Wrapped all three in a Drizzle transaction. |
| `deleteMessagesByIdAfter` race | W2a | Deleting trailing messages (edit-and-resend) ran outside a transaction — concurrent sends could interleave. Wrapped in transaction. |
| `isGuest` flash bug | W2a | `isGuest` was derived as `!session && !isLoading`, which flashed `true` during session hydration. Removed the `\|\| isLoading` branch — `isGuest` now derived solely from session state. |
| Cookie / JWT TTL mismatch | W3 | Guest cookie `maxAge` was hardcoded to 7 days while `GUEST_TOKEN_TTL_SECONDS` controlled the JWT expiry (30 days). Cookie now uses `GUEST_TOKEN_TTL_SECONDS` so both expire together. |
| Stray unicode in code | W2b-fix | Invisible unicode character in `suggestions-extension.tsx` caused a hidden parse issue. Removed. |
| Wrong export name | W2b-fix | `PureArtifactPanel` was exported but consumers imported `ArtifactPanelGate`. Renamed export to match. |

## TypeScript Safety

| Fix | Wave | Details |
|-----|------|---------|
| AI SDK v2/v3 type mismatch | W3 | `provider.ts` used `LanguageModelV2` imports but the registry expected `LanguageModelV3`. Fixed import source and `EmbeddingModelV3` generic parameter. Resolved 2 typecheck errors. |
| Unsafe model ID casts | W3 | Model IDs cast with `as ModelId` without validation. Added `assertValidModelId()` with regex validation — throws on invalid format. |
| Unsafe `as Parameters<>` casts | W2b | 4 occurrences of `as Parameters<typeof streamData.write>` in the streaming pipeline. Replaced with a typed `writeStreamData` helper function. |
| DB role/parts unvalidated casts | W2b | Message `role` and `parts` from the database cast directly to AI SDK types without validation. Added runtime type guards that verify shape before use. |

## Security

| Fix | Wave | Details |
|-----|------|---------|
| `passwordHash` leaking from `getUserById` | W3 | `getUserById` returned the full `User` row including `passwordHash`. Excluded from the `SELECT` clause; return type changed to `Omit<User, 'passwordHash'>`. |
| Missing rate limits (3 endpoints) | W2a | Artifact `GET`/`POST`, history `GET`, and suggestions `GET` had no rate limiting. Added rate limit checks with appropriate windows. |
| No security headers | W2a | No `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, or `X-DNS-Prefetch-Control` headers. Added all 5 via `next.config.ts` `headers()`. |
