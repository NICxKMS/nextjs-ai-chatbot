# TODO Master List

Complete inventory of optimization work: completed, deferred, and blocked items.

---

## Completed

### Wave 2a — Infrastructure & Safety

- [DONE] [W2a] Rate limiting on all API endpoints (`@upstash/ratelimit` SDK)
- [DONE] [W2a] Atomic rate limit primitive (sliding window, single Redis call)
- [DONE] [W2a] FK cascade Suggestion → Artifact (`.onDelete("cascade")`)
- [DONE] [W2a] Atomic guest transfer (transaction wrapping chats + artifacts + suggestions)
- [DONE] [W2a] Single JWT verification for guests (`x-guest-user-id` header forwarding)
- [DONE] [W2a] Security headers (5 headers via `next.config.ts`)
- [DONE] [W2a] Structured logger (`lib/utils/logger.ts`)
- [DONE] [W2a] Skip-nav link, ARIA regions, `aria-live` on messages
- [DONE] [W2a] `robots.ts` and `sitemap.ts` created
- [DONE] [W2a] `metadataBase` set in root layout metadata
- [DONE] [W2a] Chat error boundary (`error.tsx`)
- [DONE] [W2a] Module-level caching (env reads, Redis client, allowed origins)
- [DONE] [W2a] `isGuest` flash bug fix
- [DONE] [W2a] `deleteMessagesByIdAfter` transaction wrapper
- [DONE] [W2a] Lightweight ownership queries (`getChatOwnerId`, `getArtifactOwnerId`)
- [DONE] [W2a] Dead code removal (`getChatWithMessages`, `_resetSecretCache`, `x-device-type`, dead rate limit keys)

### Wave 2b — Performance & Streaming

- [DONE] [W2b] StreamBridge elimination (direct `onData` callback)
- [DONE] [W2b] Store emission batching (`batchUpdate` in artifact store)
- [DONE] [W2b] Speculative page fetch parallelization (messages ∥ access control)
- [DONE] [W2b] API pipeline parallelization (messages in `Promise.all`)
- [DONE] [W2b] Editor memo fixes (code-editor ref, text-editor areEqual, sheet-editor)
- [DONE] [W2b] Model metadata in `ChatRouteContext`
- [DONE] [W2b] Cached provider instances (module-level `Map`)
- [DONE] [W2b] `ChatHeader` wrapped in `React.memo`
- [DONE] [W2b] `ArtifactPanelGate` visibility check (lazy chunk load)
- [DONE] [W2b] `writeStreamData` typed helper (replaces 4 unsafe casts)
- [DONE] [W2b] Runtime type guards for DB role/parts
- [DONE] [W2b] Sidebar: `groupChatsByDate` uses `updatedAt`, SWR mutate after delete, rename guard
- [DONE] [W2b] Dead code removal (`refreshVotes`, `getUserByEmail`)

### Wave 3 — Hardening & Cleanup

- [DONE] [W3] AI provider typecheck fixes (`LanguageModelV3` import, `EmbeddingModelV3` generic)
- [DONE] [W3] Model ID validation (`assertValidModelId()` with regex)
- [DONE] [W3] Title prompt extraction (`TITLE_SYSTEM_PROMPT` constant)
- [DONE] [W3] `passwordHash` exclusion from `getUserById`
- [DONE] [W3] `ChatSummary` sidebar optimization (5-column SELECT)
- [DONE] [W3] Dead function removal (`deleteMessagesByChatId`, `getMessagesByChatId`, `deleteVotesByChatId`, `deleteSuggestionsByArtifactVersion`)
- [DONE] [W3] Vote action parallelization (`Promise.all`)
- [DONE] [W3] Unused index removal (`chat_user_created_idx`, `message_chat_created_role_idx`)
- [DONE] [W3] `MotionProvider` moved to root layout (global `prefers-reduced-motion`)
- [DONE] [W3] `.env.example` completion (3 build flags added)
- [DONE] [W3] Redis env guard (production throw, dev warning)
- [DONE] [W3] Weather component wired into tool result rendering
- [DONE] [W3] `updateUserLastLogin` wired as fire-and-forget in login action
- [DONE] [W3] `models.types.ts` → `entity.types.ts` rename (26 imports updated)
- [DONE] [W3] Cookie / JWT TTL alignment (`maxAge` uses `GUEST_TOKEN_TTL_SECONDS`)
- [DONE] [W3] `ArtifactKind` re-export chain simplified

---

## Deferred / Blocked

| Priority | Item | Location | Reason |
|----------|------|----------|--------|
| BLOCKED | Artifact diff mode | `artifact-panel.tsx:175` | Requires diff library selection + UI design |
| BLOCKED | User-level model preferences | `models.ts:57` | Requires user preferences feature (not built) |
| LOW | `framer-motion` in `optimizePackageImports` | `next.config.ts` | Dead config entry — `framer-motion` already removed as dependency. Harmless; no runtime effect. |
| LOW | Registry side-effect import ordering | `lib/ai/registry.ts` | Documented with JSDoc. Not fragile in practice — module evaluation order is deterministic. |
| LOW | Drizzle migration for schema changes | `lib/db/schema.ts` | FK cascade addition and index drops require `drizzle-kit generate` to produce migration SQL. Schema code is correct; migration just needs to be run. |
| MEDIUM | `Greeting.tsx` server component candidate | `features/chat/components/greeting.tsx` | Low traffic component. Waiting for consumer restructuring before converting. |
