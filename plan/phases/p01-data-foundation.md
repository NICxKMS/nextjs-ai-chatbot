# Phase P01 — Data Foundation

> **Updated per redesign audit (2026-03-01)**

> Data layer phase. Creates the database migration infrastructure, cache layer,
> all data access functions, AI provider foundation, and test fixtures.
>
> **Entry state**: P00 complete — project scaffolded, types/errors/utils defined, Drizzle schema ready.
> **Exit state**: All data functions importable and type-correct, cache wired, AI providers registered.
> **Est. duration**: ~2 days
> **Tasks**: 14
> **Files created**: ~22

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P01-T01 | Create DB migration infra | IMPLEMENTATION | M | 2 |
| P01-T02 | Create cache client + keys | IMPLEMENTATION | M | 2 |
| P01-T03 | Create revalidation utilities | IMPLEMENTATION | M | 1 |
| P01-T04 | Create cache-through helper | IMPLEMENTATION | S | 1 |
| P01-T05 | Create user data access | IMPLEMENTATION | S | 1 |
| P01-T06 | Create chat data access | IMPLEMENTATION | L | 1 |
| P01-T07 | Create message data access | IMPLEMENTATION | M | 1 |
| P01-T08 | Create artifact data access | IMPLEMENTATION | L | 1 |
| P01-T09 | Create vote data access | IMPLEMENTATION | S | 1 |
| P01-T10 | Create suggestion data access | IMPLEMENTATION | S | 1 |
| P01-T11 | Create AI provider registry | IMPLEMENTATION | M | 1 |
| P01-T12 | Create AI provider wrapper | IMPLEMENTATION | M | 1 |
| P01-T13 | Create test fixtures | IMPLEMENTATION | M | 4 |
| P01-T14 | Verification gate G01 | VERIFICATION | S | 0 |

---

## Seam Coverage

| Seam | Description | Task |
|------|-------------|------|
| SEAM-023 | Data context assembly | P01-T05 |
| SEAM-024 | Chat data + cache invalidation | P01-T06 (partial) |
| SEAM-025 | Artifact data + versioning | P01-T08 (partial) |
| SEAM-026 | Message persistence + ordering | P01-T07 (partial) |

---

## Tasks

---

### TASK: [ID: P01-T01]
Title: Create DB migration infrastructure
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (schema migration process)
Architecture ref: scaffold/base-config.md (db:generate, db:migrate, db:push scripts)

Action: Create lib/db/migrate.ts — Migration runner using drizzle-kit/migrate that reads from lib/db/migrations/ directory. Create drizzle.config.ts at project root with schema path, migrations directory, and database URL from env. Verify pnpm db:generate creates migration SQL from schema.ts and pnpm db:push applies schema directly (for dev). The migrations/ directory stores generated SQL files. Note: lib/db/client.ts and lib/db/schema.ts already created in P00-T04.

Output files:
- lib/db/migrate.ts
- drizzle.config.ts

Inputs: lib/db/schema.ts (P00-T04), lib/db/client.ts (P00-T04)
Outputs: Migration infrastructure for database setup; consumed by deployment pipeline

AI layer handling: NEW

Dependencies: P00-T04, P00-T18
Dependents: P01-T14

Success criteria:
- drizzle.config.ts points to lib/db/schema.ts and lib/db/migrations/
- pnpm db:generate runs without error (creates SQL migration)
- lib/db/migrate.ts can run migrations programmatically
- **No barrel index.ts** — import db directly from lib/db/client
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T02]
Title: Create cache client and key definitions
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (Redis/KV caching strategy, key patterns)
Architecture ref: architecture/patterns.md (cache-aside pattern); architecture/decisions.md (ADR-007: Redis + use cache)

Action: Create lib/cache/client.ts — Initialize @vercel/kv client using CACHE_KV_REST_API_URL and CACHE_KV_REST_API_TOKEN env vars. Export get<T>(key), set(key, value, ttl?), del(key), mget<T>(keys[]), pipeline operations. Wrap all operations in try/catch returning null on failure (cache-aside: cache miss is not an error). Create lib/cache/keys.ts — Export typed key builder functions: chatMeta(chatId, userId), chatMessages(chatId, userId), userChats(userId), **artifact**(artifactId, userId), tags. Each returns a formatted string key. **Use `artifact-*` cache key prefix (NOT `document-*`)**.

Output files:
- lib/cache/client.ts
- lib/cache/keys.ts

Inputs: data-flows.md (cache key patterns), @vercel/kv package
Outputs: Cache client consumed by P01-T03 (revalidation), P01-T04 (withCache), and data functions (P01-T05 through P01-T09)

AI layer handling: NEW

Dependencies: P00-T18
Dependents: P01-T03, P01-T04, P01-T05, P01-T06, P01-T07, P01-T08, P01-T09

Success criteria:
- Cache client gracefully handles missing env vars (returns null, no throw)
- Key builders produce predictable string patterns (artifact-*, NOT document-*)
- **No quota cache keys** (credit/quota removed per redesign)
- All operations are async and return typed results
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T03]
Title: Create revalidation utilities
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (cache invalidation after mutations)
Architecture ref: redesign/architecture.md (revalidateTag/updateTag after every mutation)

Action: Create lib/cache/revalidate.ts — Export revalidateEntity(type, id) that calls revalidateTag() for Next.js cache tags. Export updateTag(type, id, data) for optimistic tag updates. Types: 'chat' | 'artifact' | 'messages' | 'votes'. Export convenience functions: invalidateChat(chatId), refreshChat(chatId), etc. **Uses revalidateTag/updateTag pattern per redesign (NOT manual cache key invalidation alone)**.

Output files:
- lib/cache/revalidate.ts

Inputs: lib/cache/client.ts (P01-T02), lib/cache/keys.ts (P01-T02)
Outputs: Revalidation utilities consumed by all Server Actions and route handlers performing mutations

AI layer handling: NEW

Dependencies: P01-T02
Dependents: P01-T05, P01-T06, P01-T07, P01-T08, P01-T09

Success criteria:
- revalidateEntity calls revalidateTag for the correct entity type
- updateTag provides optimistic cache updates
- **Entity types include 'artifact' (NOT 'document')**
- Exports both `invalidate*` (SA) and `refresh*` (RH) functions per redesign
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T04]
Title: Create cache-through helper
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (cache-aside pattern implementation)
Architecture ref: architecture/patterns.md (cache-aside with withCache helper)

Action: Create lib/cache/with-cache.ts — Generic withCache<T>(key, fetcher, ttl?) function that checks cache first, on miss calls fetcher(), stores result with TTL, returns result. Handles cache errors gracefully (falls back to fetcher). Export invalidate(key) for cache busting after mutations.

Output files:
- lib/cache/with-cache.ts

Inputs: lib/cache/client.ts (P01-T02), lib/cache/keys.ts (P01-T02)
Outputs: Cache-through helper consumed by data access functions (P01-T05 through P01-T09)

AI layer handling: NEW

Dependencies: P01-T02
Dependents: P01-T05, P01-T06, P01-T07, P01-T08, P01-T09

Success criteria:
- withCache returns cached value on hit, fetcher value on miss
- Cache errors do not propagate (fallback to fetcher)
- invalidate(key) busts the cache entry
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P01-T05]
Title: Create user data access functions
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (user CRUD operations); auth-system.md (user lookup for login/register)
Architecture ref: ADR-002 (function-based data access); DEV-005 (plain functions, no class)

Action: Create lib/data/user.ts — Export functions: getUserByEmail(email): User | null, getUserById(id): User | null, createUser(data: NewUser): User, updateUserLastLogin(id): void. All functions take db instance import from lib/db. Use Drizzle select/insert/update queries. getUserByEmail is used by login flow, createUser by register flow. Include proper error handling wrapping database errors in AppError.databaseError().

Output files:
- lib/data/user.ts

Inputs: lib/db/ (P01-T01), lib/types/models.types.ts (User, NewUser from P00-T05), lib/errors/ (P00-T08)
Outputs: User data functions consumed by auth actions (P02-T03, P02-T04)

AI layer handling: NEW

Dependencies: P00-T04, P00-T08
Dependents: P02-T03, P02-T04

Success criteria:
- All 4 functions exported with correct return types
- getUserByEmail returns null (not throws) when user not found
- createUser wraps DB errors in AppError.databaseError()
- No direct SQL — uses Drizzle query builder
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T06]
Title: Create chat data access functions
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (chat CRUD, visibility, history pagination); features.md (chat history, rename, delete)
Architecture ref: ADR-002 (function-based data access); SEAM-024 (chat data + cache invalidation)

Action: Create lib/data/chat.ts — Export functions: getChatById(chatId, userId): Chat | null (with cache via withCache), getChatsByUserId(userId, params?: PaginationParams): PaginatedResult<Chat> (with cache), createChat(data: {id, userId, title, visibility?}): Chat, updateChatTitle(chatId, userId, title): void (+ invalidate cache), updateChatVisibility(chatId, userId, visibility): void (+ invalidate cache), deleteChat(chatId, userId): void (+ invalidate chat + messages caches). All functions enforce userId ownership check. Use cache keys from lib/cache/keys.ts. Invalidate relevant cache entries on mutations.

Output files:
- lib/data/chat.ts

Inputs: lib/db/ (P00-T04), lib/cache/ (P01-T03, P01-T04), lib/types/ (P00-T05), lib/errors/ (P00-T08)
Outputs: Chat data functions consumed by chat actions (P03-T09, P03-T10), sidebar (P05), API routes

AI layer handling: NEW

Dependencies: P00-T04, P01-T03, P01-T04
Dependents: P03-T09, P03-T10, P05 (sidebar)

Success criteria:
- getChatById uses withCache with chatMeta key
- All mutation functions invalidate relevant cache entries
- Ownership check: functions verify userId matches chat.userId
- PaginatedResult returned for list queries with cursor/limit
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P01-T07]
Title: Create message data access functions
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (message persistence, ordering by createdAt); features.md (message display, edit, delete trailing)
Architecture ref: ADR-002 (function-based data access); SEAM-026 (message persistence + ordering)

Action: Create lib/data/message.ts — Export functions: getMessagesByChatId(chatId, userId): Message[] (ordered by createdAt asc, with cache), getMessageById(messageId): Message | null, saveMessages(messages: NewMessage[]): Message[] (batch insert, invalidate messages cache), deleteMessagesByIdAfter(chatId, messageId): void (delete message and all after it by createdAt, invalidate cache), deleteMessagesByChatId(chatId): void (bulk delete for chat deletion, invalidate cache). Messages use the Message_v2 table (parts jsonb, attachments jsonb). Ensure ordering is always by createdAt ASC.

Output files:
- lib/data/message.ts

Inputs: lib/db/ (P00-T04), lib/cache/ (P01-T03, P01-T04), lib/types/ (P00-T05)
Outputs: Message data functions consumed by chat streaming (P03-T09), message actions (P03-T10)

AI layer handling: NEW

Dependencies: P00-T04, P01-T03, P01-T04
Dependents: P03-T09, P03-T10

Success criteria:
- getMessagesByChatId returns messages ordered by createdAt ASC
- saveMessages does batch insert and invalidates chatMessages cache
- deleteMessagesByIdAfter deletes correct range (>= target message createdAt)
- Cache invalidation on all mutations
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P01-T08]
Title: Create artifact data access functions
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (artifact versioning via composite PK); features.md (artifact CRUD)
Architecture ref: redesign/architecture.md (artifact naming); SEAM-025 (artifact data + versioning)

Action: Create **lib/data/artifact.ts** (NOT lib/data/document.ts) — Export functions: getArtifactById(artifactId, userId): Artifact | null (latest version — highest createdAt for given id), getArtifactVersions(artifactId, userId): Artifact[] (all versions ordered by createdAt DESC), createArtifact(data: {id, title, content, kind: ArtifactKind, userId, chatId}): Artifact (insert new version), updateArtifactContent(artifactId, userId, content): Artifact (creates new version row with new createdAt), deleteArtifactById(artifactId, userId): void (delete all versions). Artifacts use composite PK (id + createdAt) for versioning. Use cache with **artifact-* cache tags** via revalidateEntity('artifact', id).

Output files:
- lib/data/artifact.ts

Inputs: lib/db/ (P00-T04), lib/cache/ (P01-T03, P01-T04), lib/types/artifact.types.ts (P00-T06)
Outputs: Artifact data functions consumed by artifact actions (P04), artifact tools (P03)

AI layer handling: NEW

Dependencies: P00-T04, P01-T03, P01-T04
Dependents: P04 (artifacts phase)

Success criteria:
- **File is lib/data/artifact.ts** (NOT document.ts)
- getArtifactById returns latest version (MAX createdAt for id)
- createArtifact inserts new row (not update — versioning via new rows)
- Uses **ArtifactKind** type (NOT DocumentKind)
- Cache tags use **artifact-*** pattern (NOT document-*)
- Composite PK (id + createdAt) maintained correctly
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P01-T09]
Title: Create vote data access functions
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (vote upsert); features.md (message voting)
Architecture ref: ADR-002 (function-based data access)

Action: Create lib/data/vote.ts — Export functions: getVotesByChatId(chatId, userId): Vote[] (all votes for a chat by user), upsertVote(data: {chatId, messageId, userId, isUpvoted}): Vote (insert on conflict update — uses composite PK), deleteVotesByChatId(chatId, userId): void (cleanup when chat deleted). Votes use composite PK (chatId + messageId + userId). No cache needed for votes (low-frequency access).

Output files:
- lib/data/vote.ts

Inputs: lib/db/ (P01-T01), lib/types/ (P00-T05)
Outputs: Vote data functions consumed by voting actions (P06)

AI layer handling: NEW

Dependencies: P00-T04
Dependents: P06 (voting phase)

Success criteria:
- upsertVote uses ON CONFLICT DO UPDATE on composite PK
- getVotesByChatId filters by both chatId and userId
- All functions properly typed with Vote model
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P01-T10]
Title: Create suggestion data access functions
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (suggestion persistence); features.md (inline suggestions)
Architecture ref: ADR-002 (function-based data access)

Action: Create lib/data/suggestion.ts — Export functions: getSuggestionsByArtifactId(artifactId, userId): Suggestion[] (all suggestions for an artifact), saveSuggestions(suggestions: NewSuggestion[]): Suggestion[] (batch insert), deleteSuggestionsByArtifactId(artifactId): void (cleanup when artifact deleted). Suggestions are linked to an artifact (via artifactId) and a specific version.

Output files:
- lib/data/suggestion.ts

Inputs: lib/db/ (P00-T04), lib/types/ (P00-T05)
Outputs: Suggestion data functions consumed by suggestion actions (P06)

AI layer handling: NEW

Dependencies: P00-T04
Dependents: P06 (enhancements phase)

Success criteria:
- getSuggestionsByArtifactId filters by **artifactId** (NOT documentId)
- saveSuggestions does batch insert
- All functions properly typed with Suggestion model
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P01-T11]
Title: Create AI provider registry
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: ai-sdk-usage.md (6 AI providers, model selection)
Architecture ref: redesign/ai-integration.md (provider registry)

Action: Create 2 files. (1) lib/ai/registry.ts — Registry mapping ProviderId to AI SDK provider instances. Import @ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google, @ai-sdk/mistral, @ai-sdk/groq, @ai-sdk/xai. Export getProvider(providerId: ProviderId) that returns the correct provider instance. Export getModel(modelId: string) that parses "provider:model" format and returns the LanguageModel. (2) lib/ai/models.ts — Export MODEL_LIST: ModelMetadata[] with all supported models, capabilities, and default selections. Export getModelMetadata(modelId) and DEFAULT_CHAT_MODEL.

Output files:
- lib/ai/registry.ts
- lib/ai/models.ts

Inputs: lib/types/model.types.ts (P00-T05), AI SDK packages
Outputs: AI provider registry consumed by chat route (P03), model selector (P06)

AI layer handling: NEW

Dependencies: P00-T05, P00-T18
Dependents: P01-T12, P03-T01, P06-T05

Success criteria:
- getProvider returns correct AI SDK provider for each ProviderId
- getModel parses "openai:gpt-4o" format and returns LanguageModel
- MODEL_LIST contains all supported models with metadata
- No hardcoded model strings outside this module
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T12]
Title: Create AI provider wrapper
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: ai-sdk-usage.md (streaming, tool calling, message conversion)
Architecture ref: redesign/ai-integration.md (customModel wrapper)

Action: Create lib/ai/provider.ts — Export customModel(modelId: string) wrapper that uses getModel() from P01-T11 and applies standard middleware: usage tracking, error wrapping (AI errors → AppError.aiError), request/response logging in development. The wrapper preserves the LanguageModel interface so it's a drop-in replacement for direct model calls. This is the only place AI SDK models are instantiated for chat.

Output files:
- lib/ai/provider.ts

Inputs: lib/ai/registry.ts (P01-T11), lib/errors/ (P00-T08)
Outputs: customModel wrapper consumed by chat route (P03-T01)

AI layer handling: NEW

Dependencies: P01-T11
Dependents: P03-T01

Success criteria:
- customModel("openai:gpt-4o") returns a valid LanguageModel
- Errors wrapped in AppError.aiError
- Development logging works
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T13]
Title: Create test fixtures
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: N/A (test infrastructure)
Architecture ref: redesign/architecture.md (testing); redesign/directory-structure.md (tests/)

Action: Create 4 test fixture files. (1) tests/fixtures/chat.ts — Factory createMockChat(overrides?) returning Chat entity with defaults. createMockMessage(overrides?) for messages. (2) tests/fixtures/artifact.ts — createMockArtifact(overrides?) factory returning Artifact entity (NOT Document). (3) tests/fixtures/user.ts — createMockUser(overrides?), createMockSession(overrides?): AppSession. (4) tests/fixtures/vote.ts — createMockVote(overrides?) factory returning Vote entity. All factories return properly typed objects matching the real schema types.

Output files:
- tests/fixtures/chat.ts
- tests/fixtures/artifact.ts
- tests/fixtures/user.ts
- tests/fixtures/vote.ts

Inputs: lib/db/schema.ts (P00-T04), lib/types/ (P00-T05, P00-T06)
Outputs: Test fixtures consumed by all unit tests in subsequent phases

AI layer handling: NEW

Dependencies: P00-T04, P00-T05, P00-T06, P00-T16
Dependents: P02-T09, P03-T27

Success criteria:
- createMockChat() returns typed Chat entity
- createMockArtifact() returns typed **Artifact** entity (NOT Document)
- createMockSession() returns valid AppSession with test userId
- All factories properly TypeScript typed
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T14]
Title: Verification gate G01
Phase: 1 — Data Foundation
Type: VERIFICATION

Behavior ref: N/A
Architecture ref: AGENTS.md (post-implementation validation); strategy/phase-order.md (gate G01)

Action: Run complete validation: (1) pnpm typecheck passes, (2) pnpm lint passes, (3) pnpm format passes. Verify: import { db } from "@/lib/db/client" resolves, import { withCache } from "@/lib/cache/with-cache" resolves, import { revalidateEntity } from "@/lib/cache/revalidate" resolves, import { getChatById } from "@/lib/data/chat" resolves with correct return type, import { getArtifactById } from "@/lib/data/artifact" resolves (NOT document), import { getSuggestionsByArtifactId } from "@/lib/data/suggestion" resolves, import { getProvider, getModel } from "@/lib/ai/registry" resolves, import { customModel } from "@/lib/ai/provider" resolves. Verify **no lib/data/document.ts exists**. Verify **no credit/quota data functions exist**.

Output files: none (validation only)

Inputs: all P01-T01 through P01-T13 outputs
Outputs: Gate G01 passed — P02 can begin

AI layer handling: N/A

Dependencies: P01-T01 through P01-T13
Dependents: P02-T01 (start of next phase)

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