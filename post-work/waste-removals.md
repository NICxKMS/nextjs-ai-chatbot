# Waste Removals

All unnecessary computation, allocation, data transfer, and dead code eliminated during the optimization campaign.

---

## Redundant Computation

| Waste | Wave | Details |
|-------|------|---------|
| Triple JWT verification (guest) | W2a | Guest requests triggered 3× HMAC-SHA256 verification per request. Replaced with single verification in middleware; `x-guest-user-id` header forwarded to downstream handlers. |
| Per-request env reads + Set allocation | W2a | `process.env` reads, Redis client instantiation, and `allowedOrigins` Set constructed on every request. Moved to module-level caches — allocated once at cold start. |
| Model instances recreated per request | W2b | AI provider instances (OpenAI, Anthropic, etc.) created fresh on every chat API call. Cached in a module-level `Map` — instantiated once per provider per process. |
| Non-atomic rate limiting | W2a | Hand-rolled `INCR` + `EXPIRE` Redis calls (2 round-trips, race-prone). Replaced with `@upstash/ratelimit` SDK (`slidingWindow`) — single atomic call. |

## Over-Fetching

| Waste | Wave | Details |
|-------|------|---------|
| Full entity fetch for ownership checks | W2a | `getChatById` fetched all columns just to check `userId`. Added `getChatOwnerId` and `getArtifactOwnerId` — `SELECT userId` only. |
| Full row fetch for sidebar | W3 | `getChatsByUserId` fetched all chat columns. Added `ChatSummary` type selecting only 5 columns (`id`, `title`, `createdAt`, `updatedAt`, `visibility`). |
| `passwordHash` leak in `getUserById` | W3 | Full `User` row returned including `passwordHash`. Excluded from `SELECT`; return type changed to `Omit<User, 'passwordHash'>`. |

## Wasted Renders / UI Work

| Waste | Wave | Details |
|-------|------|---------|
| CodeEditor rebuilding state on save | W2b | `onSaveContent` callback in effect dependencies caused editor state teardown/rebuild on every save. Stored in `useRef` — effect no longer re-runs. |
| Artifact panel eager chunk load | W2b | Artifact panel JS chunk loaded on every chat page regardless of whether an artifact existed. `ArtifactPanelGate` added — checks visibility before rendering the panel. |
| Store emission flooding | W2b | Multiple `setState`/`emitChange` calls per frame. `batchUpdate` accumulates changes, single emission per `requestAnimationFrame`. |

## Dead Code Removed

| Item | Wave | Details |
|------|------|---------|
| `getChatWithMessages` | W2a | Unused data function — chat page fetches chat and messages separately. |
| `getUserByEmail` | W2b | Unused — login uses `getUserByUsername`. |
| `refreshVotes` | W2b | Unused — voting uses SWR revalidation. |
| `_resetSecretCache` | W2a | Test-only helper that was never called. |
| `deleteMessagesByChatId` | W3 | Unused — cascade handles deletion. |
| `getMessagesByChatId` (standalone) | W3 | Unused — messages fetched through page-level query. |
| `deleteVotesByChatId` | W3 | Unused — cascade handles deletion. |
| `deleteSuggestionsByArtifactVersion` | W3 | Unused — cascade handles deletion via FK. |
| Dead rate limit key builders | W2a | 2 reserved key builders (`user:*:global`, `user:*:search`) never used. |
| `x-device-type` header | W2a | Parsed in middleware, never consumed downstream. |
| 2 unused DB indexes | W3 | `chat_user_created_idx` and `message_chat_created_role_idx` — query planner never selected them. |
