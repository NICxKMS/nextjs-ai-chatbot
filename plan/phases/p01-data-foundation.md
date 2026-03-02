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
| SEAM-023 | Data context assembly | P1-T05 |
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

Action: Create lib/cache/client.ts — Initialize @vercel/kv client using CACHE_KV_REST_API_URL and CACHE_KV_REST_API_TOKEN env vars. Export get<T>(key), set(key, value, ttl?), del(key), mget<T>(keys[]), pipeline operations. Wrap all operations in try/catch returning null on failure (cache-aside: cache miss is not an error). Create lib/cache/keys.ts — Export typed key builder functions: chatMeta(chatId, userId), chatMessages(chatId, userId), userChats(userId), **artifact**(artifactId, userId), tags. Each returns a formatted string key. **Use `artifact-*` cache key prefix (NOT `document-*`)**.

Output files:
- lib/cache/client.ts
- lib/cache/keys.ts

Inputs: data-flows.md (cache key patterns), @vercel/kv package
Outputs: Cache client consumed by P1-T03 (revalidation), P1-T04 (withCache), and data functions (P1-T05 through P1-T09)

AI layer handling: NEW

Dependencies: P0-T18
Dependents: P1-T03, P1-T04

Success criteria:
- Cache client gracefully handles missing env vars (returns null, no throw)
- Key builders produce predictable string patterns (artifact-*, NOT document-*)
- **No quota cache keys** (credit/quota removed per redesign)
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
Outputs: Cache utility consumed by data access functions (P1-T05 through P1-T09)

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

Action: Create lib/data/chat.ts — Export functions: getChatById(chatId, userId): Chat | null (with cache via withCache), getChatsByUserId(userId, params?: PaginationParams): { chats: Chat[]; hasMore: boolean; nextCursor?: string } (with cache), getChatWithMessages(chatId, userId): { chat: Chat; messages: Message[] } | null (single query co-fetch of chat + messages, with cache tagged chat:{id}), createChat(data: {id, userId, title, visibility?}): Chat, updateChatTitle(chatId, userId, title): void (+ invalidate cache), updateChatVisibility(chatId, userId, visibility): void (+ invalidate cache), deleteChat(chatId, userId): void (+ invalidate chat + messages caches), deleteAllChats(userId): void (delete all chats + messages for user, invalidate all relevant caches). All functions enforce userId ownership check. Use cache keys from lib/cache/keys.ts. Invalidate relevant cache entries on mutations.

Output files:
- lib/data/chat.ts

Inputs: lib/db/ (P0-T04), lib/cache/ (P1-T03, P1-T04), lib/types/ (P0-T05), lib/errors/ (P0-T08)
Outputs: Chat data functions consumed by chat actions (P3-T09, P3-T10), chat server actions (P3-T22), chat page, sidebar (P5), API routes

AI layer handling: NEW

Dependencies: P0-T04, P0-T05, P0-T08, P1-T03, P1-T04
Dependents: P3-T09, P3-T10, P3-T22, P5 (sidebar)

Success criteria:
- getChatById uses `'use cache'` + `cacheTag('chat:{id}')` (via withCache helper or direct directive) <!-- audit: HC-2 -->
- getChatWithMessages co-fetches chat + messages in a single query, cached with `cacheTag('chat:{id}')`
- deleteAllChats removes all chats + messages for a user and invalidates all relevant caches
- All mutation functions invalidate relevant cache entries
- Ownership check: functions verify userId matches chat.userId
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

Action: Create lib/data/message.ts — Export functions: getMessagesByChatId(chatId, userId): Message[] (ordered by createdAt asc, with cache), getMessageById(messageId): Message | null, saveMessages(messages: NewMessage[]): Message[] (batch insert, invalidate messages cache), deleteMessagesByIdAfter(chatId, messageId): void (delete message and all after it by createdAt, invalidate cache), deleteMessagesByChatId(chatId): void (bulk delete for chat deletion, invalidate cache). Messages use the Message_v2 table (parts jsonb, attachments jsonb). Ensure ordering is always by createdAt ASC.

Output files:
- lib/data/message.ts

Inputs: lib/db/ (P0-T04), lib/cache/ (P1-T03, P1-T04), lib/types/ (P0-T05)
Outputs: Message data functions consumed by chat streaming (P3-T09), message actions (P3-T10)

AI layer handling: NEW

Dependencies: P0-T04, P0-T05, P1-T03, P1-T04
Dependents: P3-T09, P3-T10

Success criteria:
- getMessagesByChatId returns messages ordered by createdAt ASC
- saveMessages does batch insert and invalidates chatMessages cache
- deleteMessagesByIdAfter deletes correct range (>= target message createdAt)
- Cache invalidation on all mutations
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P1-T08]
Title: Create artifact data access functions
Phase: 1 — Data Foundation
Type: IMPL

Behavior ref: data-flows.md (artifact versioning via composite PK); features.md (artifact CRUD)
Architecture ref: ../../plan-archives/redesign/architecture.md (artifact naming); SEAM-025 (artifact data + versioning)

Action: Create **lib/data/artifact.ts** (NOT lib/data/document.ts) — Export functions: getArtifactById(artifactId, userId): Artifact | null (latest version — highest createdAt for given id), getArtifactVersions(artifactId, userId): Artifact[] (all versions ordered by createdAt DESC), saveArtifactVersion(data: {id, title, content, kind: ArtifactKind, userId, chatId}): Artifact (insert new version row), deleteArtifactVersion(artifactId, userId, createdAt): void (delete a specific version or versions after restore timestamp, per caller mode). Artifacts use composite PK (id + createdAt) for versioning. Use cache with **artifact-* cache tags** via explicit helpers (`invalidateArtifact*`/`refreshArtifact*`) from `lib/cache/revalidate.ts`.

Output files:
- lib/data/artifact.ts

Inputs: lib/db/ (P0-T04), lib/cache/ (P1-T03, P1-T04), lib/types/artifact.types.ts (P0-T06)
Outputs: Artifact data functions consumed by artifact actions (P4), artifact tools (P3)

AI layer handling: NEW

Dependencies: P0-T04, P0-T05, P0-T06, P1-T03, P1-T04
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

Complexity: L

---

### TASK: [ID: P1-T09]
Title: Create vote data access functions
Phase: 1 — Data Foundation
Type: IMPL

Behavior ref: data-flows.md (vote upsert); features.md (message voting)
Architecture ref: ADR-002 (function-based data access)

Action: Create lib/data/vote.ts — Export functions: getVotesByChatId(chatId, userId): Vote[] (all votes for a chat by user), upsertVote(data: {chatId, messageId, userId, isUpvoted}): Vote (insert on conflict update — uses composite PK), deleteVotesByChatId(chatId, userId): void (cleanup when chat deleted). Votes use composite PK (chatId + messageId + userId). No cache needed for votes (low-frequency access).

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

Action: Create lib/data/suggestion.ts — Export functions: getSuggestionsByArtifactId(artifactId, userId): Suggestion[] (all suggestions for an artifact), saveSuggestions(suggestions: NewSuggestion[]): Suggestion[] (batch insert), deleteSuggestionsByArtifactId(artifactId): void (cleanup when artifact deleted). Suggestions are linked to an artifact (via artifactId) and a specific version.

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

Action: Create 4 test fixture files. (1) tests/fixtures/chat.ts — Factory createMockChat(overrides?) returning Chat entity with defaults. createMockMessage(overrides?) for messages. (2) tests/fixtures/artifact.ts — createMockArtifact(overrides?) factory returning Artifact entity (NOT Document). (3) tests/fixtures/user.ts — createMockUser(overrides?), createMockSession(overrides?): AppSession. (4) tests/fixtures/vote.ts — createMockVote(overrides?) factory returning Vote entity. All factories return properly typed objects matching the real schema types.

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