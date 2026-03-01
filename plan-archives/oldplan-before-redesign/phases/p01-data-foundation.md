# Phase P01 — Data Foundation

> Data layer phase. Creates the database client, cache infrastructure, all data access
> functions, auth configuration, API utilities, and rate limiting.
>
> **Entry state**: P00 complete — project scaffolded, types/errors/utils defined.
> **Exit state**: All data functions importable and type-correct, cache wired, auth config ready.
> **Est. duration**: ~2 days
> **Tasks**: 16
> **Files created**: ~25

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P01-T01 | Create DB client | IMPLEMENTATION | M | 2 |
| P01-T02 | Create DB migrations | IMPLEMENTATION | M | 2 |
| P01-T03 | Create cache client + keys | IMPLEMENTATION | M | 2 |
| P01-T04 | Create cache withCache + barrel | IMPLEMENTATION | M | 2 |
| P01-T05 | Create data context | IMPLEMENTATION | S | 1 |
| P01-T06 | Create user data access | IMPLEMENTATION | M | 1 |
| P01-T07 | Create chat data access | IMPLEMENTATION | L | 1 |
| P01-T08 | Create message data access | IMPLEMENTATION | L | 1 |
| P01-T09 | Create document data access | IMPLEMENTATION | L | 1 |
| P01-T10 | Create vote data access | IMPLEMENTATION | M | 1 |
| P01-T11 | Create auth config | IMPLEMENTATION | M | 2 |
| P01-T12 | Create API utilities | IMPLEMENTATION | M | 3 |
| P01-T13 | Create rate limiting | IMPLEMENTATION | M | 1 |
| P01-T14 | Create shared hooks | IMPLEMENTATION | S | 2 |
| P01-T15 | Create test mocks | IMPLEMENTATION | M | 3 |
| P01-T16 | Verification gate G01 | VERIFICATION | S | 0 |

---

## Seam Coverage

| Seam | Description | Task |
|------|-------------|------|
| SEAM-023 | Data context assembly | P01-T05 |
| SEAM-024 | Chat data + cache invalidation | P01-T07 (partial) |
| SEAM-025 | Document data + versioning | P01-T09 (partial) |
| SEAM-026 | Message persistence + ordering | P01-T08 (partial) |

---

## Tasks

---

### TASK: [ID: P01-T01]
Title: Create database client and connection
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (Drizzle client initialization, connection pooling)
Architecture ref: architecture/patterns.md (server-only database access); ADR-002 (function-based data access)

Action: Create lib/db/client.ts — Initialize Drizzle ORM client using postgres (from "postgres" package) with DATABASE_URL from env. Use drizzle() wrapper from drizzle-orm/postgres-js. Enable connection pooling. Export the db instance and the raw sql client. Create lib/db/index.ts as barrel re-exporting db client, schema tables, and schema types. Mark with "server-only" import guard to prevent client-side usage.

Output files:
- lib/db/client.ts
- lib/db/index.ts

Inputs: lib/db/schema.ts (P00-T07), DATABASE_URL env var
Outputs: db instance consumed by all data access functions (P01-T06 through P01-T10)

AI layer handling: NEW

Dependencies: P00-T07, P00-T17
Dependents: P01-T02, P01-T06, P01-T07, P01-T08, P01-T09, P01-T10

Success criteria:
- lib/db/client.ts exports db (Drizzle instance) and sql (raw client)
- lib/db/index.ts re-exports db, schema tables, and inferred types
- "server-only" import prevents client-side bundling
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T02]
Title: Create database migration infrastructure
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (schema migration process)
Architecture ref: scaffold/base-config.md (db:generate, db:migrate, db:push scripts)

Action: Create lib/db/migrate.ts — Migration runner using drizzle-kit/migrate that reads from lib/db/migrations/ directory. Create drizzle.config.ts at project root with schema path, migrations directory, and database URL from env. Verify pnpm db:generate creates migration SQL from schema.ts and pnpm db:push applies schema directly (for dev). The migrations/ directory stores generated SQL files.

Output files:
- lib/db/migrate.ts
- drizzle.config.ts

Inputs: lib/db/schema.ts (P00-T07), lib/db/client.ts (P01-T01)
Outputs: Migration infrastructure for database setup; consumed by deployment pipeline

AI layer handling: NEW

Dependencies: P01-T01
Dependents: P01-T16

Success criteria:
- drizzle.config.ts points to lib/db/schema.ts and lib/db/migrations/
- pnpm db:generate runs without error (creates SQL migration)
- lib/db/migrate.ts can run migrations programmatically
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T03]
Title: Create cache client and key definitions
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (Redis/KV caching strategy, key patterns)
Architecture ref: architecture/patterns.md (cache-aside pattern); architecture/decisions.md (ADR-007: Redis + use cache)

Action: Create lib/cache/client.ts — Initialize @vercel/kv client using CACHE_KV_REST_API_URL and CACHE_KV_REST_API_TOKEN env vars. Export get<T>(key), set(key, value, ttl?), del(key), mget<T>(keys[]), pipeline operations. Wrap all operations in try/catch returning null on failure (cache-aside: cache miss is not an error). Create lib/cache/keys.ts — Export typed key builder functions: chatMeta(chatId, userId), chatMessages(chatId, userId), userChats(userId), document(docId, userId), quota(userId, type). Each returns a formatted string key.

Output files:
- lib/cache/client.ts
- lib/cache/keys.ts

Inputs: data-flows.md (cache key patterns), @vercel/kv package
Outputs: Cache client consumed by withCache (P01-T04) and data functions (P01-T06 through P01-T10)

AI layer handling: NEW

Dependencies: P00-T17
Dependents: P01-T04, P01-T06, P01-T07, P01-T08, P01-T09, P01-T10, P01-T13

Success criteria:
- Cache client gracefully handles missing env vars (returns null, no throw)
- Key builders produce predictable string patterns matching data-flows.md
- All operations are async and return typed results
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T04]
Title: Create withCache utility and cache barrel
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (cache-aside pattern implementation)
Architecture ref: architecture/patterns.md (cache-aside with TTL); ADR-007 (Redis + use cache)

Action: Create lib/cache/with-cache.ts — Generic withCache<T>(key, fetcher, ttl?) function that: checks cache first, on miss calls fetcher(), stores result with TTL, returns result. Handles cache errors gracefully (falls back to fetcher). Also export invalidate(key) and invalidatePattern(pattern) for cache busting after mutations. Create lib/cache/index.ts barrel re-exporting client, keys, and withCache.

Output files:
- lib/cache/with-cache.ts
- lib/cache/index.ts

Inputs: lib/cache/client.ts (P01-T03), lib/cache/keys.ts (P01-T03)
Outputs: withCache consumed by all data access functions; invalidate consumed by mutation actions

AI layer handling: NEW

Dependencies: P01-T03
Dependents: P01-T06, P01-T07, P01-T08, P01-T09, P01-T10

Success criteria:
- withCache returns cached value on hit, fetcher value on miss
- Cache errors do not propagate (fallback to fetcher)
- invalidate(key) removes specific cache entry
- lib/cache/index.ts re-exports all cache utilities
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T05]
Title: Create data context type and factory
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (DataContext threading through data access)
Architecture ref: scaffold/shared-types.md (DataContext type); SEAM-023 (data context assembly)

Action: Create lib/data/context.ts — Export createDataContext(session: AppSession): DataContext function that creates the context object passed to all data access functions. DataContext includes userId, isGuest flag, and any entitlements. Also export a validateDataContext(ctx) that throws AppError.unauthorized() if userId is missing. This is the single point where session is converted to data-layer context.

Output files:
- lib/data/context.ts

Inputs: lib/types/index.ts (AppSession, DataContext from P00-T08), lib/errors/ (P00-T09)
Outputs: DataContext factory consumed by all server actions and API routes that call data functions

AI layer handling: NEW

Dependencies: P00-T08, P00-T09, P00-T17
Dependents: P01-T06, P01-T07, P01-T08, P01-T09, P01-T10, P02-T01

Success criteria:
- createDataContext produces DataContext with userId and isGuest
- validateDataContext throws AppError.unauthorized() when userId missing
- Types align with AppSession and DataContext from lib/types
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P01-T06]
Title: Create user data access functions
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (user CRUD operations); auth-system.md (user lookup for login/register)
Architecture ref: ADR-002 (function-based data access); DEV-005 (plain functions, no class)

Action: Create lib/data/user.ts — Export functions: getUserByEmail(email): User | null, getUserById(id): User | null, createUser(data: NewUser): User, updateUserLastLogin(id): void. All functions take db instance import from lib/db. Use Drizzle select/insert/update queries. getUserByEmail is used by login flow, createUser by register flow. Include proper error handling wrapping database errors in AppError.databaseError().

Output files:
- lib/data/user.ts

Inputs: lib/db/ (P01-T01), lib/types/models.types.ts (User, NewUser from P00-T08), lib/errors/ (P00-T09)
Outputs: User data functions consumed by auth actions (P02-T03, P02-T04)

AI layer handling: NEW

Dependencies: P01-T01, P01-T05
Dependents: P02-T03, P02-T04

Success criteria:
- All 4 functions exported with correct return types
- getUserByEmail returns null (not throws) when user not found
- createUser wraps DB errors in AppError.databaseError()
- No direct SQL — uses Drizzle query builder
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T07]
Title: Create chat data access functions
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (chat CRUD, visibility, history pagination); features.md (chat history, rename, delete)
Architecture ref: ADR-002 (function-based data access); SEAM-024 (chat data + cache invalidation)

Action: Create lib/data/chat.ts — Export functions: getChatById(chatId, userId): Chat | null (with cache via withCache), getChatsByUserId(userId, params?: PaginationParams): PaginatedResult<Chat> (with cache), createChat(data: {id, userId, title, visibility?}): Chat, updateChatTitle(chatId, userId, title): void (+ invalidate cache), updateChatVisibility(chatId, userId, visibility): void (+ invalidate cache), deleteChat(chatId, userId): void (+ invalidate chat + messages caches). All functions enforce userId ownership check. Use cache keys from lib/cache/keys.ts. Invalidate relevant cache entries on mutations.

Output files:
- lib/data/chat.ts

Inputs: lib/db/ (P01-T01), lib/cache/ (P01-T04), lib/data/context.ts (P01-T05), lib/types/ (P00-T08), lib/errors/ (P00-T09)
Outputs: Chat data functions consumed by chat actions (P03-T09, P03-T10), sidebar (P05), API routes

AI layer handling: NEW

Dependencies: P01-T01, P01-T04, P01-T05
Dependents: P03-T09, P03-T10, P05 (sidebar)

Success criteria:
- getChatById uses withCache with chatMeta key
- All mutation functions invalidate relevant cache entries
- Ownership check: functions verify userId matches chat.userId
- PaginatedResult returned for list queries with cursor/limit
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P01-T08]
Title: Create message data access functions
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (message persistence, ordering by createdAt); features.md (message display, edit, delete trailing)
Architecture ref: ADR-002 (function-based data access); SEAM-026 (message persistence + ordering)

Action: Create lib/data/message.ts — Export functions: getMessagesByChatId(chatId, userId): Message[] (ordered by createdAt asc, with cache), getMessageById(messageId): Message | null, saveMessages(messages: NewMessage[]): Message[] (batch insert, invalidate messages cache), deleteMessagesByIdAfter(chatId, messageId): void (delete message and all after it by createdAt, invalidate cache), deleteMessagesByChatId(chatId): void (bulk delete for chat deletion, invalidate cache). Messages use the Message_v2 table (parts jsonb, attachments jsonb). Ensure ordering is always by createdAt ASC.

Output files:
- lib/data/message.ts

Inputs: lib/db/ (P01-T01), lib/cache/ (P01-T04), lib/data/context.ts (P01-T05), lib/types/ (P00-T08)
Outputs: Message data functions consumed by chat streaming (P03-T09), message actions (P03-T10)

AI layer handling: NEW

Dependencies: P01-T01, P01-T04, P01-T05
Dependents: P03-T09, P03-T10

Success criteria:
- getMessagesByChatId returns messages ordered by createdAt ASC
- saveMessages does batch insert and invalidates chatMessages cache
- deleteMessagesByIdAfter deletes correct range (>= target message createdAt)
- Cache invalidation on all mutations
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P01-T09]
Title: Create document data access functions
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (document versioning via composite PK); features.md (artifact CRUD)
Architecture ref: ADR-002 (function-based data access); SEAM-025 (document data + versioning)

Action: Create lib/data/document.ts — Export functions: getDocumentById(docId, userId): Document | null (latest version — highest createdAt for given id), getDocumentVersions(docId, userId): Document[] (all versions ordered by createdAt DESC), createDocument(data: {id, title, content, kind, userId, chatId}): Document (insert new version), updateDocumentContent(docId, userId, content): Document (creates new version row with new createdAt), deleteDocumentById(docId, userId): void (delete all versions). Documents use composite PK (id + createdAt) for versioning. Use cache for reads.

Output files:
- lib/data/document.ts

Inputs: lib/db/ (P01-T01), lib/cache/ (P01-T04), lib/data/context.ts (P01-T05), lib/types/ (P00-T08)
Outputs: Document data functions consumed by artifact actions (P04), document tools (P03-T08 stub)

AI layer handling: NEW

Dependencies: P01-T01, P01-T04, P01-T05
Dependents: P04 (artifacts phase)

Success criteria:
- getDocumentById returns latest version (MAX createdAt for id)
- createDocument inserts new row (not update — versioning via new rows)
- Composite PK (id + createdAt) maintained correctly
- Cache invalidation on mutations
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P01-T10]
Title: Create vote data access functions
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: data-flows.md (vote upsert); features.md (message voting)
Architecture ref: ADR-002 (function-based data access)

Action: Create lib/data/vote.ts — Export functions: getVotesByChatId(chatId, userId): Vote[] (all votes for a chat by user), upsertVote(data: {chatId, messageId, userId, isUpvoted}): Vote (insert on conflict update — uses composite PK), deleteVotesByChatId(chatId, userId): void (cleanup when chat deleted). Votes use composite PK (chatId + messageId + userId). No cache needed for votes (low-frequency access).

Output files:
- lib/data/vote.ts

Inputs: lib/db/ (P01-T01), lib/types/ (P00-T08)
Outputs: Vote data functions consumed by voting actions (P06)

AI layer handling: NEW

Dependencies: P01-T01, P01-T05
Dependents: P06 (voting phase)

Success criteria:
- upsertVote uses ON CONFLICT DO UPDATE on composite PK
- getVotesByChatId filters by both chatId and userId
- All functions properly typed with Vote model
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T11]
Title: Create auth configuration
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: auth-system.md (dual auth: Supabase + guest JWT, session resolution)
Architecture ref: architecture/decisions.md (ADR-006: dual Supabase + guest JWT)

Action: Create lib/auth/config.ts — Initialize Supabase client (createClient from @supabase/supabase-js) using SUPABASE_URL and SUPABASE_ANON_KEY. Export supabase client instance. Export constants: GUEST_JWT_SECRET from env, SESSION_COOKIE_NAME = "session", GUEST_COOKIE_NAME = "guest-token". Export helper verifyGuestToken(token): {userId, isGuest} | null using jose for JWT verification. Export helper createGuestToken(userId): string for minting guest JWTs. Create lib/auth/index.ts barrel re-exporting config.

Output files:
- lib/auth/config.ts
- lib/auth/index.ts

Inputs: @supabase/supabase-js, jose packages; auth-system.md spec
Outputs: Auth config consumed by session resolution (P02-T01), token exchange (P02-T03), middleware (P02-T10)

AI layer handling: NEW

Dependencies: P00-T17
Dependents: P02-T01, P02-T03, P02-T08, P02-T10

Success criteria:
- Supabase client initializes without error
- verifyGuestToken returns parsed payload or null (never throws)
- createGuestToken mints valid JWT with userId and isGuest claims
- Cookie names exported as constants
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T12]
Title: Create API utility functions
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: api-contracts.md (auth guards, validation, error responses)
Architecture ref: architecture/patterns.md (API utilities); DEV-010 (no ApiResponse<T> envelope — use direct returns)

Action: Create 3 files. (1) lib/api/guards.ts — requireAuth(request): AppSession that extracts session from request cookies/headers and throws AppError.unauthorized() if missing. requireOwnership(resourceUserId, sessionUserId) throws AppError.forbidden(). (2) lib/api/validation.ts — validateBody<T>(request, schema: ZodSchema<T>): T that parses request body against Zod schema, throws AppError.validation() on failure with Zod error details. validateQuery<T>(url, schema): T for query params. (3) lib/api/response.ts — successResponse(data, status?): Response, errorResponse(error: AppError): Response wrapping AppError.toResponse(), streamResponse(stream: ReadableStream): Response with proper headers.

Output files:
- lib/api/guards.ts
- lib/api/validation.ts
- lib/api/response.ts

Inputs: lib/errors/ (P00-T09), lib/types/ (P00-T08), zod package
Outputs: API utilities consumed by all route handlers (P02-T08, P03-T20)

AI layer handling: NEW

Dependencies: P00-T08, P00-T09, P00-T17
Dependents: P02-T08, P03-T20

Success criteria:
- requireAuth extracts session from cookies and returns AppSession
- validateBody returns parsed data or throws AppError.validation() with details
- No ApiResponse<T> wrapper (DEV-010: direct Response returns)
- All utilities are composable (can chain in route handlers)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T13]
Title: Create rate limiting infrastructure
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: edge-cases.md (rate limiting per-user, per-IP); auth-system.md (edge rate limiting in middleware)
Architecture ref: architecture/patterns.md (rate limiting); data-flows.md (quota cache keys)

Action: Create lib/rate-limit/config.ts — Export rate limit configuration: limits per endpoint group (chat: 20/min, auth: 5/min, api: 60/min). Export checkRateLimit(identifier, group): {allowed: boolean, remaining: number, resetAt: Date} using cache client increment with TTL. Export createRateLimitHeaders(result): HeadersInit for X-RateLimit-* response headers. Uses lib/cache/client.ts for atomic increment operations. Update middleware.ts (P00-T14) to wire rate limiting into the middleware chain (uncomment placeholder).

Output files:
- lib/rate-limit/config.ts
- middleware.ts (update — uncomment rate limiting section)

Inputs: lib/cache/client.ts (P01-T03), middleware.ts (P00-T14)
Outputs: Rate limiting consumed by middleware for all requests

AI layer handling: NEW

Dependencies: P01-T03, P00-T14
Dependents: P02-T10

Success criteria:
- checkRateLimit returns {allowed, remaining, resetAt}
- Rate limit uses cache atomic increment with TTL
- Middleware applies rate limiting before route handling
- Rate limit headers added to responses
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T14]
Title: Create shared hooks
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: state-management.md (useMobile hook); features.md (responsive behavior)
Architecture ref: DEV-003 (eliminate blanket lib/hooks — only truly shared hooks here)

Action: Create lib/hooks/use-mobile.ts — "use client" hook that returns boolean isMobile based on window.matchMedia("(max-width: 768px)"). Uses useEffect + event listener for resize tracking. Copy implementation from oldapp/hooks/use-mobile.ts. Create lib/hooks/use-debounce.ts — Generic useDebounce<T>(value: T, delay: number): T hook. Both hooks are used by 3+ features. Only place hooks here if shared across 3+ feature modules (per DEV-003).

Output files:
- lib/hooks/use-mobile.ts
- lib/hooks/use-debounce.ts

Inputs: oldapp/hooks/use-mobile.ts (reference)
Outputs: Shared hooks consumed by sidebar, chat input, model selector, and other features

AI layer handling: COPY_CONTENT

Dependencies: P00-T17
Dependents: P03-T17, P05 (sidebar), P06 (models)

Success criteria:
- useMobile returns boolean, updates on resize
- useDebounce returns debounced value after delay
- Both have "use client" directive
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P01-T15]
Title: Create test mocks
Phase: 1 — Data Foundation
Type: IMPLEMENTATION

Behavior ref: N/A (test infrastructure)
Architecture ref: conventions.md (testing conventions)

Action: Create test mock factories. (1) tests/mocks/db.ts — Mock Drizzle db instance with jest.fn() for select/insert/update/delete. Factory createMockDb() returns typed mock. (2) tests/mocks/cache.ts — Mock cache client with jest.fn() for get/set/del. Factory createMockCache(). (3) tests/mocks/auth.ts — Mock session factory createMockSession(overrides?): AppSession that returns valid test session. createMockGuestSession() for guest auth. All factories return properly typed objects matching the real implementations.

Output files:
- tests/mocks/db.ts
- tests/mocks/cache.ts
- tests/mocks/auth.ts

Inputs: lib/db/ (P01-T01), lib/cache/ (P01-T03), lib/auth/ (P01-T11), lib/types/ (P00-T08)
Outputs: Test mocks consumed by all unit tests in subsequent phases

AI layer handling: NEW

Dependencies: P01-T01, P01-T03, P01-T11
Dependents: P02-T12, P03-T24

Success criteria:
- createMockDb() returns object matching Drizzle db interface
- createMockSession() returns valid AppSession with test userId
- All mocks are properly TypeScript typed
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P01-T16]
Title: Verification gate G01
Phase: 1 — Data Foundation
Type: VERIFICATION

Behavior ref: N/A
Architecture ref: AGENTS.md (post-implementation validation); strategy/phase-order.md (gate G01)

Action: Run complete validation: (1) pnpm typecheck passes, (2) pnpm lint passes, (3) pnpm format passes. Verify: import { db } from "@/lib/db" resolves, import { withCache } from "@/lib/cache" resolves, import { getChatById } from "@/lib/data/chat" resolves with correct return type, import { requireAuth } from "@/lib/api/guards" resolves, import { checkRateLimit } from "@/lib/rate-limit/config" resolves. Verify all data functions return correct types. Verify cache key builders produce expected string patterns.

Output files: none (validation only)

Inputs: all P01-T01 through P01-T15 outputs
Outputs: Gate G01 passed — P02 can begin

AI layer handling: N/A

Dependencies: P01-T01 through P01-T15
Dependents: P02-T01 (start of next phase)

Success criteria:
- pnpm typecheck exits 0
- pnpm lint exits 0
- pnpm format --check exits 0
- All data access functions importable from their modules
- All data functions have correct return types
- Cache and DB modules import without error

Complexity: S