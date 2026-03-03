# Phase P1 — Data Foundation

> **Updated per redesign audit (2026-03-01)**

> Data layer phase. Creates the database migration infrastructure, cache layer,
> all data access functions, AI provider foundation, and test fixtures.
>
> **Entry state**: P0 complete — project scaffolded, types/errors/utils defined, Drizzle schema ready.
> **Exit state**: All data functions importable and type-correct, cache wired, AI providers registered.
> **Est. duration**: ~2 days
> **Tasks**: 14
> **Files created**: ~22

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P1-T01 | Create DB migration infra | IMPL | M | 2 |
| P1-T02 | Create cache client + keys | IMPL | M | 2 |
| P1-T03 | Create revalidation utilities | IMPL | M | 1 |
| P1-T04 | Create cache-through helper | IMPL | S | 1 |
| P1-T05 | Create user data access | IMPL | S | 1 |
| P1-T06 | Create chat data access | IMPL | L | 1 |
| P1-T07 | Create message data access | IMPL | M | 1 |
| P1-T08 | Create artifact data access | IMPL | L | 1 |
| P1-T09 | Create vote data access | IMPL | S | 1 |
| P1-T10 | Create suggestion data access | IMPL | S | 1 |
| P1-T11 | Create AI provider registry | IMPL | M | 1 |
| P1-T12 | Create AI provider wrapper | IMPL | M | 1 |
| P1-T13 | Create test fixtures | IMPL | M | 4 |
| P1-T14 | Verification gate G01 | VERIFY | S | 0 |

---

## Seam Coverage

| Seam | Description | Task |
|------|-------------|------|
| SEAM-017 | AI Provider Registry (model discovery + registration) | P1-T11, P1-T12 |
| SEAM-023 | Session → Data Access | P1-T05 | <!-- wave4-cleanup: was "Data context assembly" — updated per DEV-024, aligned with seam-inventory.md -->
| SEAM-024 | Chat data + cache invalidation | P1-T06 (partial) |
| SEAM-025 | Artifact data + versioning | P1-T08 (partial) |
| SEAM-026 | Message persistence + ordering | P1-T07 (partial) |

---

## Tasks

---

### TASK: [ID: P1-T01]
Title: Create DB migration infrastructure
Phase: 1 — Data Foundation
Type: IMPL

Behavior ref: data-flows.md (schema migration process)
Architecture ref: scaffold/base-config.md (db:generate, db:migrate, db:push scripts)

Action: Create lib/db/migrate.ts — Migration runner using drizzle-kit/migrate that reads from lib/db/migrations/ directory. Create drizzle.config.ts at project root with schema path, migrations directory, and database URL from env. Verify pnpm db:generate creates migration SQL from schema.ts and pnpm db:push applies schema directly (for dev). The migrations/ directory stores generated SQL files. Note: lib/db/client.ts and lib/db/schema.ts already created in P0-T04.

Output files:
- lib/db/migrate.ts
- drizzle.config.ts

Inputs: lib/db/schema.ts (P0-T04), lib/db/client.ts (P0-T04)
Outputs: Migration infrastructure for database setup; consumed by deployment pipeline

AI layer handling: NEW

Dependencies: P0-T04, P0-T18
Dependents: P1-T14

Success criteria:
- drizzle.config.ts points to lib/db/schema.ts and lib/db/migrations/
- pnpm db:generate runs without error (creates SQL migration)
- lib/db/migrate.ts can run migrations programmatically
- **No barrel index.ts** — import db directly from lib/db/client
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P1-T02]
Title: Create cache client and key definitions
Phase: 1 — Data Foundation
Type: IMPL

Behavior ref: data-flows.md (Redis/KV caching strategy, key patterns)
Architecture ref: architecture/patterns.md (cache-aside pattern); architecture/decisions.md (ADR-007: Redis + use cache)

Action: Create lib/cache/client.ts — Initialize Upstash Redis client (via `@upstash/redis`) using CACHE_KV_REST_API_URL and CACHE_KV_REST_API_TOKEN env vars. Export typed Redis operations for rate limiting and operational data only: `incr(key)`, `expire(key, seconds)`, `get<T>(key)`, `set(key, value, ttl?)`, `del(key)`. Wrap all operations in try/catch returning null on failure (graceful degradation). Create lib/cache/keys.ts — Export two categories of key builders: (1) **Cache tag name builders** for `cacheTag()`/`updateTag()`/`revalidateTag()` string consistency: `chat(chatId)`, `chats(userId)`, `votes(chatId)`, `artifact(artifactId)`, `models()`. These match `shared-types.md` §13 `cacheKeys`. (2) **Rate-limit Redis key builders**: `rateLimit(userId)`, `rateLimitDaily(userId)`. **No Redis cache keys for chat, message, artifact, or vote data reads** — all data caching uses `'use cache'` + `cacheTag` (see P1-T04). **Use `artifact-*` cache key prefix (NOT `document-*`)**. <!-- wave4: XDL-03/MISS-02 — scoped Redis keys to rate limiting + cache tag name builders only -->

Output files:
- lib/cache/client.ts
- lib/cache/keys.ts

Inputs: data-flows.md (cache key patterns), `@upstash/redis` package <!-- wave4: D-05 — @upstash/redis, not @vercel/kv -->
Outputs: Cache client consumed by P1-T03 (revalidation), P1-T04 (withCache), and rate-limiting middleware. Data functions (P1-T05 through P1-T09) do NOT use Redis for caching — they are pure DB operations cached via `'use cache'` at the page/feature layer.

AI layer handling: NEW

Dependencies: P0-T18
Dependents: P1-T03, P1-T04

Success criteria:
- Cache client gracefully handles missing env vars (returns null, no throw)
- Key builders produce predictable string patterns (artifact-*, NOT document-*)
- **No quota cache keys** (credit/quota removed per redesign)
- **No Redis cache keys for chat, message, artifact, or vote data reads** — only rate-limit keys and cache tag name builders <!-- wave4: XDL-03 -->
- Cache tag name builders match `shared-types.md` §13 `cacheKeys` pattern: `chat(chatId)`, `chats(userId)`, `votes(chatId)`, `artifact(artifactId)`, `models()`
- All operations are async and return typed results
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P1-T03]
Title: Create revalidation utilities
Phase: 1 — Data Foundation
Type: IMPL

Behavior ref: data-flows.md (cache invalidation after mutations)
Architecture ref: ../../plan-archives/redesign/architecture.md (revalidateTag/updateTag after every mutation)

Action: Create lib/cache/revalidate.ts — Export explicit helper wrappers (no overloaded generic primitives). Server Action helpers (`invalidateChat`, `invalidateChatList`, `invalidateVotes`, etc.) call `updateTag(tag)` for immediate consistency. Route Handler helpers (`refreshChat`, `refreshChatList`, `refreshArtifact`, etc.) call `revalidateTag(tag, 'max')` for stale-while-revalidate behavior. **Uses revalidateTag/updateTag split per redesign (NOT manual cache key invalidation alone)**.

Output files:
- lib/cache/revalidate.ts

Inputs: lib/cache/client.ts (P1-T02), lib/cache/keys.ts (P1-T02)
Outputs: Revalidation utilities consumed by all Server Actions and route handlers performing mutations

AI layer handling: NEW

Dependencies: P1-T02
Dependents: P1-T06, P1-T07, P1-T08

Success criteria:
- Exports explicit wrapper functions (no overloaded primitive wrappers): `invalidate*` for Server Actions, `refresh*` for Route Handlers
- `invalidateChat(chatId)` and `refreshChat(chatId)` take 1 param (chatId only); callers compose with `invalidateChatList`/`refreshChatList` when both tags needed <!-- wave4: RC-02 — 1-param signatures -->
- `invalidate*` wrappers call `updateTag(tag)`
- `refresh*` wrappers call `revalidateTag(tag, 'max')`
- **Entity types include 'artifact' (NOT 'document')**
- Exports both `invalidate*` (SA) and `refresh*` (RH) functions per redesign
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P1-T04]
Title: Create cache-through helper
Phase: 1 — Data Foundation
Type: IMPL

Behavior ref: data-flows.md (server cache strategy — `'use cache'` + `cacheTag`)
Architecture ref: architecture/patterns.md (framework caching via `'use cache'`); architecture/decisions.md (ADR-007: `use cache` for primary reads) <!-- audit: HC-2 -->

Action: Create lib/cache/with-cache.ts — Utility helper for `'use cache'` patterns. Provides a `withCache<T>(tag, fetcher, life?)` wrapper that applies `'use cache'` directive, `cacheTag(tag)`, and optional `cacheLife(life)` to a fetcher function. This is a convenience wrapper around Next.js cache directives — **NOT a Redis cache-through layer**. Redis is reserved for rate limiting and operational data only (see P1-T02). Export tag-based invalidation helpers that call `updateTag`/`revalidateTag`.

Output files:
- lib/cache/with-cache.ts

Inputs: Next.js `'use cache'` directive, `cacheTag`/`cacheLife` from `next/cache`
Outputs: Cache utility consumed by data access functions (P1-T05 through P1-T08; vote reads are cached via a `getCachedVotes(chatId, userId)` helper at the page/helper layer, not inside `lib/data/vote.ts`)

AI layer handling: NEW

Dependencies: P1-T02 (for cache key patterns only)
Dependents: P1-T06, P1-T07, P1-T08

Success criteria:
- withCache wraps fetcher with `'use cache'` + `cacheTag` + optional `cacheLife`
- **Not a Redis cache-through helper** — uses Next.js framework caching
- Tag-based invalidation via `updateTag`/`revalidateTag` from `next/cache`
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P1-T05]
Title: Create user data access functions
Phase: 1 — Data Foundation
Type: IMPL

Behavior ref: data-flows.md (user CRUD operations); auth-system.md (user lookup for login/register)
Architecture ref: ADR-002 (function-based data access); DEV-005 (plain functions, no class)

Action: Create lib/data/user.ts — Export functions: getUserByEmail(email): User | null, getUserById(id): User | null, createUser(data: NewUser): User, updateUserLastLogin(id): void. All functions take db instance import from lib/db. Use Drizzle select/insert/update queries. getUserByEmail is used by login flow, createUser by register flow. Include proper error handling wrapping database errors in AppError.databaseError().

Output files:
- lib/data/user.ts

Inputs: lib/db/ (P1-T01), lib/types/models.types.ts (User, NewUser from P0-T05), lib/errors/ (P0-T08)
Outputs: User data functions consumed by auth actions (P2-T03, P2-T04)

AI layer handling: NEW

Dependencies: P0-T04, P0-T05, P0-T08
Dependents: P2-T03, P2-T04

Success criteria:
- All 4 functions exported with correct return types
- getUserByEmail returns null (not throws) when user not found
- createUser wraps DB errors in AppError.databaseError()
- No direct SQL — uses Drizzle query builder
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P1-T06]
Title: Create chat data access functions
Phase: 1 — Data Foundation
Type: IMPL

Behavior ref: data-flows.md (chat CRUD, visibility, history pagination); features.md (chat history, rename, delete)
Architecture ref: ADR-002 (function-based data access); SEAM-024 (chat data + cache invalidation)

Action: Create lib/data/chat.ts — Export functions: getChatById(chatId): Chat | null (pure DB lookup), getChatsByUserId(userId, params?: PaginationParams): { chats: Chat[]; hasMore: boolean; nextCursor?: string } (pure DB query), getChatWithMessages(chatId): { chat: Chat; messages: Message[] } | null (single query co-fetch of chat + messages, pure DB), createChat(data: {id, userId, title, model?, visibility?}): Chat, updateChatTitle(chatId, title): void, updateChatVisibility(chatId, visibility): void, deleteChat(chatId): void, deleteAllChats(userId): void (delete all chats + messages for user). All functions are pure DB operations — no auth checks, no cache invalidation. Auth/ownership checks happen at the action/page level per `patterns.md` §1 Rules. Caching via `'use cache'` + `cacheTag` happens at the page/feature layer (e.g., `getCachedChat` in the chat page). Revalidation happens at the caller level (Server Actions call `invalidate*`, Route Handlers call `refresh*`). <!-- wave4: XDL-02 — bare-ID signatures, auth at caller level -->

> **Schema note (CONF-013):** The Chat table should include a flat `model` column (text, nullable) to persist the model used per chat, per redesign code sketches. Existing chat pages read `chat.model` for initial model selection. The old `lastContext` nested object is not carried forward. P0-T04 schema should define this column. See `plan-archives/redesign/cleanup-inventory.md` line 47 and `p03-chat-core.md` P3-T25 for downstream consumers. <!-- wave4-cleanup: CONF-013 note added to P1 per wave4/chat.md deferred item -->

Output files:
- lib/data/chat.ts

Inputs: lib/db/ (P0-T04), lib/types/ (P0-T05), lib/errors/ (P0-T08) <!-- audit: W4-DF-02 — removed lib/cache/ (P1-T03, P1-T04): pure DB task -->
Outputs: Chat data functions consumed by chat actions (P3-T09, P3-T10), chat server actions (P3-T22), chat page, sidebar (P5), API routes

AI layer handling: NEW

Dependencies: P0-T04, P0-T05, P0-T08 <!-- audit: W4-DF-02 — removed P1-T03, P1-T04: pure DB task, no cache/revalidation imports -->
Dependents: P3-T09, P3-T10, P3-T22, P5 (sidebar)

Success criteria:
- getChatById is a pure DB lookup — no `'use cache'`, no auth check; caching provided by page-level `getCachedChat` wrapper using `'use cache'` + `cacheTag('chat:{id}')` + `cacheLife('seconds')` <!-- wave4: XDL-02/XDL-05/RC-03 -->
- getChatWithMessages co-fetches chat + messages in a single query, bare-ID signature `getChatWithMessages(chatId)`
- deleteAllChats removes all chats + messages for a user
- All data functions are pure DB operations — no inline cache invalidation or auth checks
- Auth/ownership checks happen at the caller (page/action), not in data functions <!-- wave4: XDL-02 -->
- PaginatedResult returned for list queries with cursor/limit
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P1-T07]
Title: Create message data access functions
Phase: 1 — Data Foundation
Type: IMPL

Behavior ref: data-flows.md (message persistence, ordering by createdAt); features.md (message display, edit, delete trailing)
Architecture ref: ADR-002 (function-based data access); SEAM-026 (message persistence + ordering)

Action: Create lib/data/message.ts — Export functions: getMessagesByChatId(chatId): Message[] (ordered by createdAt asc, pure DB query), getMessageById(messageId): Message | null, saveMessages(messages: NewMessage[]): Message[] (batch insert), deleteMessagesByIdAfter(chatId, messageId): void (delete message and all after it by createdAt), deleteMessagesByChatId(chatId): void (bulk delete for chat deletion). All functions are pure DB operations — no auth, no cache. Messages use the Message_v2 table (parts jsonb, attachments jsonb). Ensure ordering is always by createdAt ASC. <!-- wave4: XDL-02 — bare-ID signatures, no userId -->

Output files:
- lib/data/message.ts

Inputs: lib/db/ (P0-T04), lib/types/ (P0-T05) <!-- audit: W4-DF-02 — removed lib/cache/ (P1-T03, P1-T04): pure DB task -->
Outputs: Message data functions consumed by chat streaming (P3-T09), message actions (P3-T10)

AI layer handling: NEW

Dependencies: P0-T04, P0-T05 <!-- audit: W4-DF-02 — removed P1-T03, P1-T04: pure DB task, no cache/revalidation imports -->
Dependents: P3-T09, P3-T10

Success criteria:
- getMessagesByChatId returns messages ordered by createdAt ASC, bare-ID signature `getMessagesByChatId(chatId)` <!-- wave4: XDL-02 -->
- saveMessages does batch insert
- deleteMessagesByIdAfter deletes correct range (>= target message createdAt)
- All data functions are pure DB operations — no inline cache invalidation
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P1-T08]
Title: Create artifact data access functions
Phase: 1 — Data Foundation
Type: IMPL

Behavior ref: data-flows.md (artifact versioning via composite PK); features.md (artifact CRUD)
Architecture ref: ../../plan-archives/redesign/architecture.md (artifact naming); SEAM-025 (artifact data + versioning)

Action: Create **lib/data/artifact.ts** (NOT lib/data/document.ts) — Export functions: getArtifactById(artifactId): Artifact | null (latest version — highest createdAt for given id), getArtifactVersions(artifactId): Artifact[] (all versions ordered by createdAt DESC), saveArtifactVersion(data: {id, title, content, kind: ArtifactKind, userId, chatId}): Artifact (insert new version row), deleteArtifactVersion(artifactId, createdAt): void (delete a specific version or versions after restore timestamp, per caller mode). All functions use bare-ID signatures — no userId parameter for reads. Auth/ownership checks happen at the caller (page/action). Artifacts use composite PK (id + createdAt) for versioning. Revalidation via `invalidateArtifact(artifactId)`/`refreshArtifact(artifactId)` at the caller level. <!-- wave4: XDL-02 — bare-ID signatures -->

Output files:
- lib/data/artifact.ts

Inputs: lib/db/ (P0-T04), lib/types/artifact.types.ts (P0-T06) <!-- audit: W4-DF-02 — removed lib/cache/ (P1-T03, P1-T04): pure DB task -->
Outputs: Artifact data functions consumed by artifact actions (P4), artifact tools (P3)

AI layer handling: NEW

Dependencies: P0-T04, P0-T05, P0-T06 <!-- audit: W4-DF-02 — removed P1-T03, P1-T04: pure DB task, no cache/revalidation imports -->
Dependents: P4 (artifacts phase)

Success criteria:
- **File is lib/data/artifact.ts** (NOT document.ts)
- getArtifactById returns latest version (MAX createdAt for id)
- saveArtifactVersion inserts new row (versioning via new rows)
- deleteArtifactVersion supports version-targeted deletion by timestamp
- Uses **ArtifactKind** type (NOT DocumentKind)
- Cache tags use **artifact-*** pattern (NOT document-*)
- Composite PK (id + createdAt) maintained correctly
- pnpm typecheck passes

> **Note (AMB-7):** saveArtifactVersion does not differentiate between guest and authenticated users. Both persist artifacts via the same code path. Guest user ID is a valid foreign key in the artifacts table.

Complexity: L

---

### TASK: [ID: P1-T09]
Title: Create vote data access functions
Phase: 1 — Data Foundation
Type: IMPL

Behavior ref: data-flows.md (vote upsert); features.md (message voting)
Architecture ref: ADR-002 (function-based data access)

Action: Create lib/data/vote.ts — Export functions: getVotesByChatId(chatId, userId): Vote[] (all votes for a chat by user), upsertVote(data: {chatId, messageId, userId, isUpvoted}): Vote (insert on conflict update — uses composite PK), deleteVotesByChatId(chatId, userId): void (cleanup when chat deleted). Votes use composite PK (chatId + messageId + userId). This module is DB-only and session-agnostic — it does not import `'use cache'`, `cacheTag`, `cacheLife`, or `getAppSession()`, and it receives only IDs. Chat-page vote caching is provided by a `getCachedVotes(chatId, userId)` helper at the page/feature layer that wraps these functions in `'use cache'` + `cacheTag('votes:{chatId}')` + `cacheLife(...)`; the `voteOnMessage` Server Action invalidates this cache by calling `invalidateVotes(chatId)` → `updateTag('votes:{chatId}')`.

Output files:
- lib/data/vote.ts

Inputs: lib/db/ (P1-T01), lib/types/ (P0-T05)
Outputs: Vote data functions consumed by voting actions (P6)

AI layer handling: NEW

Dependencies: P0-T04, P0-T05
Dependents: P6 (voting phase)

Success criteria:
- upsertVote uses ON CONFLICT DO UPDATE on composite PK
- getVotesByChatId filters by both chatId and userId
- All functions properly typed with Vote model
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P1-T10]
Title: Create suggestion data access functions
Phase: 1 — Data Foundation
Type: IMPL

Behavior ref: data-flows.md (suggestion persistence); features.md (inline suggestions)
Architecture ref: ADR-002 (function-based data access)

Action: Create lib/data/suggestion.ts — Export functions: getSuggestionsByArtifactId(artifactId): Suggestion[] (all suggestions for an artifact), saveSuggestions(suggestions: NewSuggestion[]): Suggestion[] (batch insert), deleteSuggestionsByArtifactId(artifactId): void (cleanup when artifact deleted). Suggestions are linked to an artifact (via artifactId) and a specific version. All functions use bare-ID signatures — no userId. Auth via parent artifact/chat ownership at the caller level. <!-- wave4: XDL-02/MISS-04 — bare-ID signatures -->

Output files:
- lib/data/suggestion.ts

Inputs: lib/db/ (P0-T04), lib/types/ (P0-T05)
Outputs: Suggestion data functions consumed by suggestion actions (P6)

AI layer handling: NEW

Dependencies: P0-T04, P0-T05
Dependents: P6 (enhancements phase)

Success criteria:
- getSuggestionsByArtifactId filters by **artifactId** (NOT documentId)
- saveSuggestions does batch insert
- All functions properly typed with Suggestion model
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P1-T11]
Title: Create AI provider registry
Phase: 1 — Data Foundation
Type: IMPL

Behavior ref: ai-sdk-usage.md (provider registry baseline + model resolution)
Architecture ref: ../../plan-archives/redesign/ai-integration.md (provider registry)

Action: Create `lib/ai/registry.ts` — Use `createProviderRegistry()` from AI SDK to build a registry of conditional providers: `google` (always), `openai` (if `OPENAI_API_KEY`), `openrouter` (if `OPENROUTER_API_KEY`, via `createOpenAI` with OpenRouter base URL). Export `registry` as the single entry point for model resolution (`registry.languageModel(modelId)`). **NO custom `getProvider()`/`getModel()` functions.** **NO `MODEL_LIST`** (model catalog is P3-T01 scope). <!-- audit: DF-AP1, DF-AP3, DF-AP4 -->

Output files:
- lib/ai/registry.ts

Inputs: AI SDK packages (`ai`, `@ai-sdk/openai`, `@ai-sdk/google`)
Outputs: `registry` consumed by `lib/ai/provider.ts` (P1-T12), model discovery (P3-T01)

AI layer handling: NEW

Dependencies: P0-T18
Dependents: P1-T12, P3-T01

Success criteria:
- `registry` exported via `createProviderRegistry()` from `ai` package
- Conditional provider inclusion based on env var presence
- OpenRouter configured via `createOpenAI({ baseURL: 'https://openrouter.ai/api/v1' })`
- **No `getProvider()` or `getModel()` custom functions** — use `registry.languageModel(modelId)` directly
- **No `MODEL_LIST`** — model catalog belongs in P3-T01
- File count: 1 (`lib/ai/registry.ts` only)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P1-T12]
Title: Create AI provider wrapper
Phase: 1 — Data Foundation
Type: IMPL

Behavior ref: ai-sdk-usage.md (streaming, tool calling, message conversion)
Architecture ref: ../../plan-archives/redesign/ai-integration.md (myProvider wrapper) <!-- audit: DF-AP7 -->

Action: Create `lib/ai/provider.ts` — Use `customProvider()` from AI SDK to export `myProvider`. The provider resolves models via `registry.languageModel(modelId)` (from P1-T11) and applies `extractReasoningMiddleware` with per-model-prefix reasoning tag patterns (e.g., `openai:o` → `{ tagName: 'thinking' }`, `google:gemini-2.5` → `{ tagName: 'thinking' }`, `openrouter:deepseek/deepseek-r1` → `{ tagName: 'think' }`). Uses `wrapLanguageModel()` to apply middleware. **NO usage tracking middleware. NO error wrapping middleware. NO logging middleware.** This is the single entry point for obtaining language models throughout the app. <!-- audit: DF-AP1, DF-AP2 -->

Output files:
- lib/ai/provider.ts

Inputs: lib/ai/registry.ts (P1-T11), `ai` package (`customProvider`, `wrapLanguageModel`, `extractReasoningMiddleware`)
Outputs: `myProvider` consumed by chat route (P3-T01)

AI layer handling: NEW

Dependencies: P1-T11
Dependents: P3-T01

Success criteria:
- `myProvider` exported via `customProvider()` from `ai` package
- `myProvider.languageModel(modelId)` returns a valid LanguageModel
- Reasoning middleware applied conditionally per model prefix via `extractReasoningMiddleware`
- **No usage tracking, no error wrapping, no logging middleware** (only reasoning extraction)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P1-T13]
Title: Create test fixtures
Phase: 1 — Data Foundation
Type: IMPL

Behavior ref: N/A (test infrastructure)
Architecture ref: ../../plan-archives/redesign/architecture.md (testing); ../../plan-archives/redesign/directory-structure.md (tests/)

Action: Create 4 test fixture files. (1) tests/fixtures/chat.ts — Factory createMockChat(overrides?) returning Chat entity with defaults. createMockMessage(overrides?) for messages. (2) tests/fixtures/artifact.ts — createMockArtifact(overrides?) factory returning Artifact entity (NOT Document). (3) tests/fixtures/user.ts — createMockUser(overrides?), createMockSession(overrides?): AppSession. (4) tests/fixtures/vote.ts — createMockVote(overrides?) factory returning Vote entity. All factories return properly typed objects matching the real schema types. Fixture APIs must support multi-user ownership scenarios (e.g., owner and non-owner sessions) via overrides. <!-- C2-W4: C2X-008 fix -->

Output files:
- tests/fixtures/chat.ts
- tests/fixtures/artifact.ts
- tests/fixtures/user.ts
- tests/fixtures/vote.ts

Inputs: lib/db/schema.ts (P0-T04), lib/types/ (P0-T05, P0-T06)
Outputs: Test fixtures consumed by all unit tests in subsequent phases

AI layer handling: NEW

Dependencies: P0-T04, P0-T05, P0-T06, P0-T16
Dependents: P2-T09, P3-T27

Success criteria:
- createMockChat() returns typed Chat entity
- createMockArtifact() returns typed **Artifact** entity (NOT Document)
- createMockSession() returns valid AppSession with test userId
- Fixtures support multi-user ownership tests (owner vs non-owner session/user pairs) <!-- C2-W4: C2X-008 fix -->
- All factories properly TypeScript typed
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P1-T14]
Title: Verification gate G01
Phase: 1 — Data Foundation
Type: VERIFY

Behavior ref: N/A
Architecture ref: AGENTS.md (post-implementation validation); strategy/phase-order.md (gate G01)

Action: Run complete validation: (1) pnpm typecheck passes, (2) pnpm lint passes, (3) pnpm format passes. Verify: import { db } from "@/lib/db/client" resolves, import { withCache } from "@/lib/cache/with-cache" resolves, import { invalidateChat, refreshChat } from "@/lib/cache/revalidate" resolves, import { getChatById } from "@/lib/data/chat" resolves with correct return type, import { getArtifactById } from "@/lib/data/artifact" resolves (NOT document), import { getSuggestionsByArtifactId } from "@/lib/data/suggestion" resolves, import { registry } from "@/lib/ai/registry" resolves (**no `getProvider`/`getModel`**), import { myProvider } from "@/lib/ai/provider" resolves (**no `customModel`**). Verify **no lib/data/document.ts exists**. Verify **no credit/quota data functions exist**. <!-- audit: DF-AP1, DF-AP3 -->

Output files: none (validation only)

Inputs: all P1-T01 through P1-T13 outputs
Outputs: Gate G01 passed — P2 can begin

AI layer handling: N/A

Dependencies: P1-T01 through P1-T13
Dependents: P2-T01 (start of next phase)

Success criteria:
- pnpm typecheck exits 0
- pnpm lint exits 0
- pnpm format --check exits 0
- All data access functions importable from their modules
- **lib/data/artifact.ts exists** (NOT document.ts)
- **No credit/quota data functions**
- AI provider registry and models importable
- Cache revalidation utilities importable

Complexity: S