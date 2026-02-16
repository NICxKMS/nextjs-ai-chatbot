# nextjs-ai-chatbot v6 — Post-Migration Defect Resolution Plan

**Memory Strategy:** Dynamic-MD
**Last Modification:** Plan creation by the Setup Agent.
**Project Overview:** Fix ~199 verified defects discovered during OLD→NEW codebase comparison across 11 comparison phases. Issues span AI core (non-functional chat streaming), security vulnerabilities (unsigned sessions, CSRF, open redirect), data layer regressions, component gaps, API route deficiencies, and middleware gaps. Excludes ~45 improvements and ~25 false positives. All fixes follow v6 architecture from `.ouroboros/specs/refactor-migration/`.

**Issue Source:** `issues/` directory (11 phase files). Master index: `issues/root.md`.

**Source Code Reference:** Agents MUST reference `archive/oldapp/` for original implementations:
- `archive/oldapp/lib/ai/` — AI modules (chat-completion, prompts, title-generation, tools, model-discovery)
- `archive/oldapp/lib/` — Infrastructure (errors, data, cache, middleware)
- `archive/oldapp/components/` — Component functionality to restore
- `archive/oldapp/artifacts/` — Artifact handler patterns

**Architecture Specs:** `.ouroboros/specs/refactor-migration/`:
- `architecture-v6-final.md` — Canonical architecture (29 sections)
- `functional-structure-v6.md` — File-by-file specs (~274 files)
- `directory-structure-v6.md` — Target directory structure

---

## Global Quality Standards

**Mandatory Pre-Implementation Protocol (EVERY TASK):**
Before writing any code, the Implementation Agent MUST complete these steps in order:
1. **Check New App First**: Search the NEW codebase for the functionality described in the issue. It may already exist under a different name, different file path, or different architectural pattern. If an equivalent or improved implementation already exists, document it and mark the issue as "Already Implemented" — do NOT overwrite working code with old patterns.
2. **Read Reference Code**: Read the OLD implementation files listed in the task's Guidance field (`archive/oldapp/` paths) to understand the original logic, props, state, and edge cases. Also search the OLD codebase for related files, imports, and callers to get full context
3. **Compare Architectures**: Determine whether the OLD implementation should be ported as-is, adapted to v6 patterns, or skipped because the new approach is already better. Document the decision with rationale.
4. **Search Related Code**: Search BOTH the NEW and OLD codebases for related files, imports, consumers, and dependencies to understand the full integration surface and how the code was originally used vs how it's currently wired
5. **Understand Architecture**: Read the relevant v6 architecture section from `.ouroboros/specs/refactor-migration/architecture-v6-final.md` to ensure the fix follows v6 patterns (Repository/Service, feature modules, slim routes, layer imports)
6. **Document Findings**: Note key decisions, architecture differences, and any deviations before implementing

**Code Reuse & Consistency Mandate:**
- Use existing functions, variables, types, and utilities before creating new ones. Search the codebase first.
- Follow existing coding patterns — match naming conventions, file structure, export style, error handling, and formatting of surrounding code.
- Extend, don't duplicate — if similar logic exists, refactor it to be reusable rather than writing a parallel implementation.
- Import from barrel exports (`index.ts`) where they exist. Do not bypass them with direct file imports.
- Match existing error handling patterns — use `AppError` subclasses, guard functions, and the established try/catch → typed error flow.

**Failure to complete these steps results in rejected work.**

**Validation Requirements:**
- `pnpm typecheck` — zero errors before task completion
- `pnpm format` then `pnpm lint` — zero errors before task completion

- All public APIs MUST have TSDoc comments (@param, @returns, @throws)

---

## Phase 1: AI Core & Chat Streaming
*Goal: Restore chat functionality — AI execution, streaming, prompts, tools, model wiring*
*Tasks: 13 | Resolves: P5-BRK-001–004, P5-FNC-018–023, P5-FNC-025–027, P5-FNC-029, P6-BRK-001–005, P10-FNC-002*
*Priority: CRITICAL — chat is completely non-functional without this phase*

### Task 1.1 – Create AI Configuration Constants - Agent_AICore
**Objective:** Centralize AI-specific constants currently missing or scattered as magic numbers.
**Output:** `lib/ai/constants.ts`
**Guidance:** Reference `archive/oldapp/lib/ai/constants.ts:1-65`. Resolves P5-FNC-018.

1. Create `lib/ai/constants.ts` with: `DEFAULT_MODEL_ID`, `DEFAULT_TEMPERATURE` (0.7), `DEFAULT_MAX_OUTPUT_TOKENS` (4096), `DEFAULT_TOP_P`, `MAX_CONTEXT_TOKENS`, `SYSTEM_PROMPT_RESERVE_TOKENS` (2000), `TITLE_GENERATION_MAX_TOKENS` (80)
2. Add timing constants: `MODEL_CACHE_TTL_MS` (3600000), `MODEL_DISCOVERY_TIMEOUT_MS` (5000), `STREAM_CHUNK_SIZE` (1024), `STREAM_TIMEOUT_MS` (30000)
3. Add rate constants: `DEFAULT_MESSAGES_PER_MINUTE` (20), `DEFAULT_TOKENS_PER_MINUTE` (100000)
4. Add `SUPPORTED_PROVIDERS` array and `MODEL_CATEGORIES` object
5. Replace inline magic numbers in `features/settings/types.ts:273,275` with imports from this module

### Task 1.2 – Create AI Model Catalog Types & ProviderId - Agent_AICore
**Objective:** Create comprehensive model metadata types replacing lossy boolean-flag approach.
**Output:** `lib/ai/types.ts` (new file), updates to `lib/ai/registry.ts`
**Guidance:** Reference `archive/oldapp/lib/ai/model-catalog-types.ts:1-59` and `archive/oldapp/lib/ai/provider-info.ts:1-16`. Resolves P10-FNC-002, P5-FNC-021, P5-FNC-022.

1. Create `lib/ai/types.ts` with: `ModelCapability` union (including `"image-generation"`, `"video-generation"`), `ModelModality` (`"text" | "vision" | "audio"`), `ReasoningType` (6 provider-specific values: `openai-thinking`, `anthropic-thinking`, `gemini-thinking`, `deepseek-thinking`, `internal-thinking`, `none`)
2. Add `ModelMetadata` interface with `reasoningType`, `thinkingBudget`, `source`, `isCurated`
3. Add `ProviderId` type union (`"openai" | "google" | "openrouter" | "vercel-gateway" | "cloudflare-workers" | "cloudflare-ai-gateway" | "xai"`)
4. Add `PROVIDER_DISPLAY_NAMES` record mapping ProviderId to human names
5. Add `ProviderCatalog` and `ModelCatalogResponse` types for dynamic discovery
6. Update `lib/ai/registry.ts` to use new types instead of flat `ModelCapabilities` boolean interface

### Task 1.3 – Create System Prompts Module - Agent_AICore
**Objective:** Recreate all system prompts for AI chat interactions.
**Output:** `lib/ai/prompts.ts`
**Guidance:** Reference `archive/oldapp/lib/ai/prompts.ts:1-215`. Resolves P5-BRK-002 (5 of 8 exports missing). **Depends on: Task 1.1 Output.**

1. Create `lib/ai/prompts.ts` with `regularPrompt` — base assistant behavior guidelines
2. Add `artifactsPrompt` — instructions for using Artifacts UI
3. Add `RequestHints` type (`{ latitude, longitude, city, country }`) and `getRequestPromptFromHints(requestHints)` function
4. Add `systemPrompt({ selectedChatModel, requestHints, selectedModel, userSystemPrompt })` — main system prompt builder combining regularPrompt + requestPrompt + optional userSystemPrompt + conditional artifactsPrompt
5. Centralize artifact handler prompts: move inline `codePrompt`, `sheetPrompt`, `updateDocumentPrompt` from `features/artifact/handlers/*.handler.ts` INTO this module — prevents cross-handler prompt drift (P6-FNC-048, P6-FNC-049, P6-FNC-050)
6. Update handlers to import prompts from `lib/ai/prompts.ts` instead of defining inline

### Task 1.4 – Create Chat Completion Executor - Agent_AICore
**Objective:** Recreate core chat execution function with AI SDK streaming.
**Output:** `lib/ai/chat-completion.ts`
**Guidance:** Reference `archive/oldapp/lib/ai/chat-completion.ts:1-290`. Resolves P5-BRK-001. **Depends on: Task 1.1, 1.2, 1.3 Output.**

1. Create `executeChatCompletion(params: ChatCompletionParams)` function using AI SDK `streamText`
2. Implement `getEnabledTools(model)` — tool enablement based on model capabilities
3. Implement `buildProviderOptions(selectedModel)` — provider-specific reasoning options (thinking budgets, etc.)
4. Add `AbortSignal.timeout(55_000)` for request timeout
5. Integrate `smoothStream` for better streaming UX
6. Add `onFinish` callback with usage data for tracking
7. Export `ChatCompletionParams` type

### Task 1.5 – Create Title Generation Module - Agent_AICore
**Objective:** Recreate AI-powered chat title generation.
**Output:** `lib/ai/title-generation.ts`
**Guidance:** Reference `archive/oldapp/lib/ai/title-generation.ts:1-67`. Resolves P5-BRK-003. **Depends on: Task 1.1 Output.**

- Create `generateTitleFromUserMessage({ message })` — async AI-based title generation using `generateText`, with error fallback to text extraction, max 80 chars
- Create `generatePlaceholderTitle(message)` — sync placeholder extracting first 80 chars from message text parts

### Task 1.6 – Wire Tools into Chat Pipeline & Fix Capabilities - Agent_AICore
**Objective:** Connect existing tools at `features/chat/lib/tools/` to the chat streaming pipeline and restore reduced capabilities.
**Output:** Updates to `features/chat/lib/tools/index.ts`, `create-document.tool.ts`, `update-document.tool.ts`, `suggestions.tool.ts`
**Guidance:** Reference `archive/oldapp/lib/ai/tools/`. Resolves P5-BRK-004. **Depends on: Task 1.4 Output.**

1. Fix `create-document.tool.ts` — restore handler delegation: call `documentHandler.onCreateDocument({ id, title, dataStream, session, chatId })` to trigger AI content generation
2. Fix `update-document.tool.ts` — restore handler delegation: call `documentHandler.onUpdateDocument({ document, description, dataStream, session })`
3. Fix `suggestions.tool.ts` — save ALL generated suggestions (not just the first): use `saveSuggestions({ suggestions: suggestions.map(...) })` for batch insert
4. Wire `createChatTools()` factory into `chat-completion.ts` so tools are available during chat streaming
5. Import and use `getArtifactHandler()`/`artifactHandlersByKind` from `features/artifact/handlers/`

### Task 1.7 – Add Reasoning Model Middleware Support - Agent_AICore
**Objective:** Enable chain-of-thought extraction for reasoning models (o1, Claude thinking, Gemini thinking).
**Output:** Updates to `lib/ai/providers.ts`
**Guidance:** Reference `archive/oldapp/lib/ai/providers.ts:17-86`. Resolves P5-FNC-023. **Depends on: Task 1.2 Output.**

1. Create `getReasoningTagName(reasoningType: ReasoningType)` — maps reasoning types to extraction tag names
2. Add `extractReasoningMiddleware` import and `wrapLanguageModel` function that wraps models for chain-of-thought extraction
3. Update `getModel(id)` in `lib/ai/providers.ts` to detect reasoning models via `ReasoningType` and wrap with middleware automatically
4. Add test environment handling with mock models

### Task 1.8 – Fix Artifact Handler Placeholder Model Strings - Agent_AICore
**Objective:** Replace `"artifact-model"` string placeholders with actual model instances.
**Output:** Updates to `features/artifact/handlers/code.handler.ts`, `text.handler.ts`, `sheet.handler.ts`
**Guidance:** Resolves P6-BRK-003, P6-BRK-004, P6-BRK-005. **Depends on: Task 1.2 Output.**

1. Import `getModel` from `lib/ai/registry.ts` in each handler
2. Replace `model: "artifact-model"` with `model: getModel("artifact-model")` in `code.handler.ts` (L79, L118)
3. Replace in `text.handler.ts` (both `onCreateDocument` and `onUpdateDocument`)
4. Replace in `sheet.handler.ts` (both locations)
5. Ensure `"artifact-model"` is registered in the model registry or map to an appropriate model

### Task 1.9 – Implement Chat POST AI Execution & Streaming - Agent_AICore
**Objective:** Make the chat POST route actually invoke AI and stream responses.
**Output:** Updates to `app/api/chat/route.ts`, `features/chat/actions/stream-chat.action.ts`
**Guidance:** Reference `archive/oldapp/app/(chat)/api/chat/route.ts:59-410`. Resolves P6-BRK-001, P6-BRK-002. **Depends on: Task 1.4, 1.6 Output.**

1. Update `stream-chat.action.ts` to call `executeChatCompletion()` with: model, messages, tools, system prompt, provider options
2. Create `UIMessageStream` via `createUIMessageStream` with `execute` callback wrapping `executeChatCompletion`
3. Add background title generation via `generateTitleFromUserMessage` for new chats
4. Add `onFinish` handler to save assistant response and usage data to DB
5. Update `app/api/chat/route.ts` to return SSE stream: `stream.pipeThrough(new JsonToSseTransformStream())` instead of static JSON
6. Add `data-chatTitle` stream event for real-time title updates
7. Wire AI SDK `usage` data (prompt tokens, completion tokens, total tokens) into `onFinish` handler and store as `AppUsage` — enables cost tracking via tokenlens integration (P5-FNC-067)

### Task 1.10 – Create User Model Entitlements - Agent_AICore
**Objective:** Implement per-user-type rate limiting and model access control.
**Output:** `lib/ai/entitlements.ts`
**Guidance:** Reference `archive/oldapp/lib/ai/entitlements.ts:1-31`. Resolves P5-FNC-019.

- Create `Entitlements` type with `maxMessagesPerDay` and `availableChatModelIds`
- Create `entitlementsByUserType` config: guest (20 messages/day), regular (100 messages/day)
- Export `getEntitlements(userType)` function

### Task 1.11 – Add Cloudflare Providers - Agent_AICore
**Objective:** Restore Cloudflare AI Gateway and Workers AI provider support.
**Output:** Updates to `lib/ai/providers.ts`
**Guidance:** Reference `archive/oldapp/lib/ai/model-registry.ts:85-160`. Resolves P5-FNC-025, P5-FNC-026.

1. Add `cloudflare-workers` provider using `createWorkersAI` from `workers-ai-provider` with `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_KEY` env vars
2. Add `cloudflare-ai-gateway` provider using `createAiGateway` from `ai-gateway-provider`
3. Add fallback model configuration (primary + fallback)
4. Add supported Gemini models list for gateway
5. Install `workers-ai-provider` and `ai-gateway-provider` packages if not present

### Task 1.12 – Expand Curated Model List - Agent_AICore
**Objective:** Restore model catalog from 9 models to ~35+ models.
**Output:** Updates to `lib/ai/registry.ts`
**Guidance:** Reference `archive/oldapp/lib/ai/curated-models.ts:1-582`. Resolves P5-FNC-029. **Depends on: Task 1.2, 1.11 Output.**

1. Add free models via OpenRouter (Gemma 3, DeepSeek free reasoning)
2. Add latest Claude variants (Claude 3.7 Sonnet)
3. Add title-specific model configuration
4. Add image/video generation models
5. Use new `ModelMetadata` types from Task 1.2 for rich metadata

### Task 1.13 – Create Dynamic Model Discovery - Agent_AICore
**Objective:** Enable runtime model discovery from provider APIs.
**Output:** `lib/ai/model-discovery.ts`
**Guidance:** Reference `archive/oldapp/lib/ai/model-discovery.ts:1-407`. Resolves P5-FNC-020, P5-FNC-027. **Depends on: Task 1.2, 1.11 Output.**

1. Create `discoverProviders(options)` with parallel discovery via `Promise.allSettled`
2. Implement provider-specific discovery: `discoverOpenAI`, `discoverGoogleGemini`, `discoverOpenRouter`, `discoverCloudflareWorkers`
3. Add 1-hour cache for model lists using `MODEL_CACHE_TTL_MS`
4. Create `refreshModelCatalog()`, `forceRefreshModelCatalog()`, `getModelCatalog()`, `listProviderCatalogs()`
5. Handle per-provider errors gracefully (one failure doesn't block others)

---

## Phase 2: Security Hardening
*Goal: Fix all exploitable security vulnerabilities*
*Tasks: 10 | Resolves: P1-BUG-001, P5-FNC-017, P5-FNC-062, P6-FNC-015/023-025/029/032/036/043, P8-BUG-001–003, P8-FNC-003/005, P9-BUG-001, P9-FNC-009*
*Priority: HIGH — multiple exploitable vulnerabilities. Independent of Phase 1, can run in parallel.*

### Task 2.1 – Fix Guest Session JWT Signing - Agent_Security
**Objective:** Replace unsigned guest cookies with JWT-signed tokens.
**Output:** Updates to `lib/auth/session.ts`
**Guidance:** Reference `archive/oldapp/lib/auth/session.ts:227-260`. Resolves P8-BUG-001, P5-FNC-046.

1. Add `GUEST_JWT_SECRET` environment variable requirement
2. Import `jose` library (`SignJWT`, `jwtVerify`)
3. Update `createGuestSession()` to sign guest ID with JWT: `new SignJWT({sub: guestId, type: "guest"}).setProtectedHeader({alg: "HS256"}).setExpirationTime(expiresAtSeconds).sign(secret)`
4. Update `getGuestSession()` to verify JWT via `jwtVerify(token, secret)` instead of simple string prefix check
5. Implement token rotation: 1-hour JWT TTL vs 7-day cookie TTL
6. Add `GUEST_JWT_SECRET` to `.env.example`

### Task 2.2 – Fix CSRF Protection in Guest Route - Agent_Security
**Objective:** Add origin validation to prevent cross-origin session creation.
**Output:** Updates to `app/api/auth/guest/route.ts`
**Guidance:** Reference `archive/oldapp/app/api/auth/guest/route.ts:21-28`. Resolves P8-BUG-002, P6-FNC-023.

1. Update POST handler signature to accept `request: Request` parameter
2. Add `validateOrigin(request)` check at start of POST handler
3. Return 403 with `"forbidden:auth:csrf"` error code on failure
4. Import `validateOrigin` from `@/lib/api/context`

### Task 2.3 – Fix Open Redirect Vulnerability - Agent_Security
**Objective:** Add redirect URL validation to prevent CWE-601 open redirect.
**Output:** Updates to `app/api/auth/guest/route.ts`
**Guidance:** Reference `archive/oldapp/app/api/auth/guest/route.ts:113-162`. Resolves P8-BUG-003, P6-FNC-025.

1. Create `getSafeRedirectUrl(redirectUrl, origin)` helper function
2. Block dangerous schemes: `javascript:`, `data:`, `vbscript:`, `file:`
3. Block protocol-relative URLs (`//example.com`)
4. Validate absolute URLs match request origin
5. Allow only relative paths starting with `/`
6. Add path traversal detection regex
7. Apply validation in GET handler before `NextResponse.redirect`

### Task 2.4 – Fix Auth Rate Limiting Middleware Bypass - Agent_Security
**Objective:** Fix middleware early return that bypasses rate limiting for all `/api/auth/` routes.
**Output:** Updates to `middleware.ts`
**Guidance:** Resolves P9-BUG-001, P8-FNC-003. CRITICAL — auth endpoints currently have ZERO rate limiting.

1. Modify `isAuthCallbackRoute(pathname)` to ONLY skip NextAuth callback routes (`/api/auth/callback`, `/api/auth/[...nextauth]`), NOT all `/api/auth/` routes
2. Ensure `/api/auth/guest` and `/api/auth/logout` proceed past the early return to reach rate limiting at L80-88
3. Verify `getLimiterForRoute()` correctly routes these paths to `authLimiter`
4. Test that `authLimiter.failClosed = true` behavior is reachable end-to-end

### Task 2.5 – Add Rate Limiting to Guest Route - Agent_Security
**Objective:** Add IP-based rate limiting to prevent guest session flooding.
**Output:** Updates to `app/api/auth/guest/route.ts`
**Guidance:** Reference `archive/oldapp/app/api/auth/guest/route.ts:30-45`. Resolves P8-FNC-005, P6-FNC-024. **Depends on: Task 2.4 Output.**

1. Import `getClientIP` from `@/lib/rate-limit`
2. Add IP-based rate limiting in POST handler (20 requests/60 seconds)
3. Return 429 with `Retry-After` header on rate limit exceeded
4. Add logging for rate limit events

### Task 2.6 – Fix Upload Rate Limit Window - Agent_Security
**Objective:** Restore hourly upload rate limit (currently 120x too permissive).
**Output:** Updates to `lib/constants.ts`, `lib/rate-limit/limits.ts`
**Guidance:** Resolves P9-FNC-009, P5-FNC-062.

1. Change `RATE_LIMITS.upload` from `{ requests: 20, window: 60 }` (20/min) to `{ requests: 10, window: 3600 }` (10/hour)
2. Verify `uploadLimiter` in `lib/rate-limit/limits.ts` uses updated values
3. Update `middleware.ts` route matching for upload endpoint

### Task 2.7 – Fix Vote User Filter - Agent_Security
**Objective:** Add userId filter to vote fetching to prevent exposing all votes.
**Output:** Updates to vote API route/action
**Guidance:** Reference `archive/oldapp/` vote fetching pattern. Resolves P1-BUG-001.

1. Add `userId` parameter to vote query to filter votes for authenticated user only
2. Ensure guest users cannot access vote data for other users
3. Return empty array for unauthenticated requests

### Task 2.8 – Add Ownership Verification to Votes & Suggestions - Agent_Security
**Objective:** Verify chat/document ownership before allowing votes and suggestion operations.
**Output:** Updates to `app/api/votes/route.ts`, `app/api/suggestions/route.ts`
**Guidance:** Resolves P6-FNC-043, P6-FNC-036.

1. Add chat ownership check in vote endpoint: verify user owns the chat before allowing vote
2. Add document ownership check in suggestions endpoint: verify user owns the parent document
3. Add artifact ownership pre-check before fetching suggestions — defense-in-depth layer beyond WHERE-clause filtering (P6-FNC-036)
4. Use `requireChatAccess()` or `requireOwnership()` from guards
5. Return 403 for unauthorized access attempts

### Task 2.9 – Add Rate Limiting to Artifact/File/History Routes - Agent_Security
**Objective:** Add missing per-route rate limiting to unprotected API routes.
**Output:** Updates to `middleware.ts` route matching
**Guidance:** Resolves P6-FNC-015, P6-FNC-026, P6-FNC-029, P6-FNC-032.

1. Add `/api/artifacts` to `getLimiterForRoute()` with `apiLimiter`
2. Add `/api/files/upload` routing to `uploadLimiter` (verify already exists at L179)
3. Add `/api/history` routing to `apiLimiter`
4. Add `/api/suggestions` and `/api/votes` routing to `apiLimiter`
5. Add `/api/auth/logout` to rate limiter routing with `authLimiter` (P6-FNC-026)
6. Verify all routes are reachable (not bypassed by early returns)

### Task 2.10 – Create File Attachment Validation Utilities - Agent_Security
**Objective:** Create missing file validation module for upload security.
**Output:** `lib/files/validation.ts` or update existing `lib/files/`
**Guidance:** Reference `archive/oldapp/lib/files.ts:27-109`. Resolves P5-FNC-017.

1. Create `validateAttachment({ file, maxSize, allowedTypes })` with MIME type and size validation
2. Create `ALLOWED_ATTACHMENT_TYPES` constant with permitted MIME types
3. Create `MAX_ATTACHMENT_SIZE` constant (default 10MB)
4. Add `isValidMimeType(mimeType)` and `getFileExtension(mimeType)` helpers
5. Add magic byte validation for uploaded files (not just extension check)
6. Integrate with file upload route

---

## Phase 3: Error & Data Infrastructure
*Goal: Fix error utilities, data layer regressions, cache gaps, and missing utility functions*
*Tasks: 15 | Resolves: P5-BUG-001, P5-BRK-005, P5-FNC-001–006, P5-FNC-011/012, P5-FNC-030/031, P5-FNC-037/038, P5-FNC-041–044, P5-FNC-048/049/053/055, P10-BRK-001, P10-FNC-001, P10-FNC-003*
*Priority: HIGH — foundational fixes. Independent of Phase 1, can run in parallel.*

### Task 3.1 – Create Shared Fetcher & Error Handler Functions - Agent_DataLayer
**Objective:** Recreate SWR data fetcher and fetch wrapper with error handling.
**Output:** `lib/utils/fetcher.ts` (new file)
**Guidance:** Reference `archive/oldapp/lib/utils.ts:17-104`. Resolves P5-FNC-001, P5-FNC-002.

1. Create `fetcher<T>(url: string): Promise<T>` — SWR-compatible fetcher with: JSON error code parsing, `AppError` wrapping, offline detection via `navigator.onLine`, redirect for `not_found:chat` errors
2. Create `fetchWithErrorHandlers(url: string, options?: RequestInit): Promise<Response>` — fetch wrapper with same error handling pattern
3. Export both from `lib/utils/index.ts`

### Task 3.2 – Create Missing Utility Functions - Agent_DataLayer
**Objective:** Recreate missing utility functions used across the codebase.
**Output:** Updates to `lib/utils/` files
**Guidance:** Reference `archive/oldapp/lib/utils.ts:113-178`. Resolves P5-FNC-003, P5-FNC-004, P5-FNC-005, P5-FNC-006.

1. Create `generateUUID()` in `lib/utils/uuid.ts` — native `crypto.randomUUID()` with `crypto.getRandomValues()` fallback and error throw if crypto unavailable
2. Create `getMostRecentUserMessage(messages)` in `lib/utils/message.ts` — filter by `role === "user"`, return `.at(-1)`
3. Create `getTrailingMessageId({ messages })` in `lib/utils/message.ts` — return `messages.at(-1)?.id ?? null`
4. Add `sanitizeText(text)` to `lib/utils/string.ts` — remove `<has_function_call>` tokens
5. Export all from `lib/utils/index.ts`

### Task 3.3 – Fix Error Utility Functions - Agent_DataLayer
**Objective:** Add missing database error mapping and helpers.
**Output:** Updates to `lib/errors.ts` or `lib/errors/`
**Guidance:** Reference `archive/oldapp/lib/db/errors.ts`. Resolves P5-FNC-011, P5-FNC-012, P5-FNC-013.

1. Create `toDatabaseError(error, operation)` — wraps raw Postgres errors into typed `DatabaseError` with operation context
2. Create `mapPostgresCodeToError(code)` — maps Postgres error codes (23505, 23503, 42P01, etc.) to specific `AppError` subclasses
3. Add `DatabaseError` class extending `AppError` with `postgresCode` property
4. Add guest-specific error messages in `getMessageByErrorCode()` — guest users see contextual messages guiding sign-in instead of generic errors (P5-FNC-013)

### Task 3.4 – Fix Missing Auth Guard Functions - Agent_DataLayer
**Objective:** Add missing rate limiting and resource guards.
**Output:** Updates to `lib/auth/guards.ts`
**Guidance:** Resolves P5-FNC-030, P5-FNC-031, P5-FNC-033, P5-FNC-035, P5-FNC-036, P8-FNC-004.

1. Add `requireRateLimit(identifier, config)` — throws on rate limit exceeded
2. Add `requireResource<T>(resource, resourceType): T` — throws `NotFoundError` if null/undefined (P5-FNC-033, P8-FNC-004)
3. Update `requireAuth()` return type to include full session: `Promise<{ session: AppSession; userId: string }>` (resolves P8-FNC-009)
4. Add `parseTimestamp(value: string): Date` — validate timestamp string, return Date or throw 400 (P5-FNC-035)
5. Add `requireQueryParam(url: URL, name: string): string` — extract required query param or throw 400 (P5-FNC-036)

### Task 3.5 – Fix saveWithContext Batch Operation - Agent_DataLayer
**Objective:** Restore optimized batch save for messages with context update.
**Output:** Updates to `lib/data/repositories/message.repository.ts` or `lib/data/services/chat.service.ts`
**Guidance:** Reference `archive/oldapp/lib/data/chat.ts:345-400`. Resolves P5-FNC-037.

1. Create `saveWithContext({ chatId, messages, contextData })` that atomically saves messages AND updates chat context in a single transaction
2. Use Drizzle transaction for atomic batch insert + update
3. Invalidate both message and chat caches after success
4. Log operation for debugging

### Task 3.6 – Fix deleteAfterTimestamp for Message Regeneration - Agent_DataLayer
**Objective:** Restore timestamp-based message deletion for chat regeneration.
**Output:** Updates to message repository/service
**Guidance:** Reference `archive/oldapp/lib/data/chat.ts:418-434`. Resolves P5-FNC-038.

1. Create `deleteAfterTimestamp(chatId, timestamp)` in message repository — delete all messages in chatId where createdAt > timestamp
2. Add corresponding cache invalidation
3. Wire into chat service for regeneration flow

### Task 3.7 – Implement Circuit Breaker for Redis - Agent_DataLayer
**Objective:** Add circuit breaker to prevent cascading failures during Redis outages.
**Output:** Updates to `lib/cache/client.ts` or new `lib/cache/circuit-breaker.ts`
**Guidance:** Reference `archive/oldapp/lib/cache/operations.ts:36-89`. Resolves P5-BUG-001.

1. Implement circuit breaker with `CIRCUIT_BREAKER_THRESHOLD = 5` consecutive failures
2. Add `CIRCUIT_BREAKER_RESET_MS = 30000` (30-second cooldown)
3. Create `isCircuitOpen()`, `recordCacheFailure()`, `recordCacheSuccess()` functions
4. When circuit open, cache operations return `null` immediately (fast-fail)
5. Auto-reset circuit after cooldown period

### Task 3.8 – Implement Guest-Aware Data Strategy - Agent_DataLayer
**Objective:** Restore cache-only data operations for guest users.
**Output:** Updates to `lib/data/repositories/chat.repository.ts` and other repositories
**Guidance:** Reference `archive/oldapp/lib/data/chat.ts:85-326`. Resolves P5-BRK-005.

1. Add `isGuest` checks to `ChatRepository.doFindById()` — return `null` on cache miss for guests (no DB fallback)
2. Add `isGuest` checks to `ChatRepository.doFindWithMessages()` — same pattern
3. Apply to `MessageRepository` and `ArtifactRepository` as well
4. Ensure `RepositoryContext.isGuest` is populated from session

### Task 3.9 – Create Cache Entity Types - Agent_DataLayer
**Objective:** Add type safety for all cached data structures.
**Output:** `lib/cache/types.ts` (new file)
**Guidance:** Reference `archive/oldapp/lib/cache/types.ts:1-98`. Resolves P10-BRK-001.

1. Create `CachedChatMeta` type (id, userId, title, visibility, createdAt, updatedAt, lastContext, version)
2. Create `CachedChat` type (extends CachedChatMeta + messages)
3. Create `CachedMessage` type (id, chatId, role, parts, attachments, createdAt)
4. Create `UserChatListItem` type for ZSET (chatId, title, updatedAt)
5. Create `CachedDocument` type with versions array
6. Export from `lib/cache/index.ts`

### Task 3.10 – Create Message Parts Type System - Agent_DataLayer
**Objective:** Create comprehensive message parts type system for structured message content.
**Output:** `lib/types/message-parts.ts` (new file)
**Guidance:** Reference `archive/oldapp/lib/types/message-parts.ts:1-415`. Resolves P10-FNC-001.

1. Create 12+ part types: `TextPart`, `ImagePart`, `FilePart`, `CodePart`, `ToolCallPart`, `ToolResultPart`, `ReasoningPart`, `ErrorPart`, `SystemPart`, `AudioPart`, `VideoPart`, `EmbedPart`
2. Create `MessagePart` discriminated union type
3. Add part extraction helpers: `getTextContent(parts)`, `getImageParts(parts)`, `hasToolCalls(parts)`
4. Create Zod schemas for runtime validation of message parts (resolves P10-FNC-003)
5. Export from `lib/types/index.ts`

### Task 3.11 – Add Missing ZSET Cache Operations - Agent_DataLayer
**Objective:** Restore sorted set operations for chat list management.
**Output:** Updates to `lib/cache/` modules
**Guidance:** Reference `archive/oldapp/lib/cache/operations.ts`. Resolves P5-FNC-041, P5-FNC-042.

1. Add `addToChatList(userId, chatMeta)` using Redis ZADD with timestamp score
2. Add `removeFromChatList(userId, chatId)` using Redis ZREM
3. Add `getChatList(userId, offset, limit)` using Redis ZREVRANGE
4. Integrate with chat repository for list cache management

### Task 3.12 – Create Batch Operations & Transaction Wrapper - Agent_DataLayer
**Objective:** Create batch operation and transaction utilities for efficient bulk data operations.
**Output:** `lib/data/batch.ts`, `lib/data/transaction.ts` (new files)
**Guidance:** Reference OLD batch patterns. Resolves P5-FNC-048, P5-FNC-050.

1. Create `batchInsert<T>(table, items, chunkSize?)` — chunked bulk insert with error handling
2. Create `batchUpdate<T>(table, items, keyFn)` — chunked bulk update
3. Create `batchDelete(table, ids, chunkSize?)` — chunked bulk delete
4. Add progress callback support for large batches
5. Create `withTransaction<T>(fn: (tx) => Promise<T>)` — generic Drizzle transaction wrapper with automatic rollback on error (P5-FNC-050)

### Task 3.13 – Create Cursor-Based Pagination - Agent_DataLayer
**Objective:** Implement cursor-based pagination for chat history and messages.
**Output:** `lib/data/pagination.ts` (new file)
**Guidance:** Reference `archive/oldapp/lib/data/chat.ts` pagination pattern. Resolves P5-FNC-049.

1. Create `CursorPaginationParams` type with `cursor`, `limit`, `direction` fields
2. Create `CursorPaginatedResult<T>` type with `items`, `nextCursor`, `hasMore` fields
3. Create `applyCursorPagination(query, params)` Drizzle query modifier
4. Create `buildCursorResponse(items, limit)` response builder
5. Export from `lib/data/index.ts`

### Task 3.14a – Fix Schema Column Types & Data Casting - Agent_DataLayer
**Objective:** Fix database schema column type issues and cache type casting.
**Output:** Updates to `lib/db/schema.ts`, `lib/cache/`
**Guidance:** Resolves P5-FNC-053, P5-FNC-043, P5-FNC-044.

1. Fix `lastContext` column type in schema — ensure it supports JSON storage for chat context (P5-FNC-053)
2. Add type-safe cache data casting using cache entity types from Task 3.9 (P5-FNC-043)
3. Document auth provider architecture differences (NextAuth vs Supabase patterns) in code comments (P5-FNC-044)

### Task 3.14b – Fix Auth Route Operational Issues - Agent_DataLayer
**Objective:** Add operational improvements to auth-related routes.
**Output:** Updates to `app/api/auth/guest/route.ts`, `lib/errors/`
**Guidance:** Resolves P8-FNC-006, P8-FNC-007.

- Add structured logging to guest route: import logger, add log points for session create/reuse (P8-FNC-006)
- Add `maxDuration` export to guest route: `export const maxDuration = 10` (P8-FNC-007)

---

## Phase 4: Chat UI & Sidebar Components
*Goal: Fix chat component core functionality, virtualization, data streaming, and sidebar*
*Tasks: 13 | Resolves: P3-BRK-001–005, P3-BUG-001–011, P3-BRK-012, P3-BRK-016, P3-FNC-001–010, P3-UI-001–005*
*Priority: HIGH — depends on Phase 1 (AI core). Run after Phase 1 completes.*

### Task 4.1 – Fix Chat Component Core Functionality - Agent_ChatUI
**Objective:** Restore missing Chat component features (fetchWithErrorHandlers, data stream, settings).
**Output:** Updates to `features/chat/components/chat.tsx`
**Guidance:** Reference `archive/oldapp/components/chat.tsx`. Resolves P3-BRK-001, P3-BUG-001. **Depends on: Task 3.1 Output by Agent_DataLayer (fetcher), Task 1.9 Output by Agent_AICore (streaming).**

1. Import and use `fetchWithErrorHandlers` from `lib/utils/fetcher.ts` as `fetch` option in `DefaultChatTransport`
2. Integrate settings from `SettingsProvider` for model selection, temperature, etc.
3. Add `onStreamPart` handlers for all data stream events
4. Add proper error handling with user-facing error messages
5. Restore `isNewSession` optimization to skip initial data fetch for new chats (P3-BUG-009)

### Task 4.2 – Add Messages Virtualization - Agent_ChatUI
**Objective:** Add Virtuoso virtualization to Messages component for performance.
**Output:** Updates to `features/chat/components/messages.tsx` or equivalent
**Guidance:** Reference `archive/oldapp/components/messages.tsx`. Resolves P3-BRK-002. **Depends on: Task 4.1 Output.**

1. Install `react-virtuoso` if not present
2. Replace flat message list with `<Virtuoso>` component
3. Configure `followOutput: "smooth"` for auto-scroll during streaming
4. Add `initialTopMostItemIndex` for scroll restoration
5. Implement custom scroll container with proper bottom-anchoring

### Task 4.3 – Fix Data Stream Handlers - Agent_ChatUI
**Objective:** Restore missing data stream event handling in chat.
**Output:** Updates to `features/chat/components/data-stream-handler.tsx`
**Guidance:** Reference `archive/oldapp/components/data-stream-handler.tsx`. Resolves P3-BUG-002, P3-BUG-003.

1. Add `useDataStream` hook integration for stream state access
2. Add handlers for all stream event types: `data-chatTitle`, `data-usage`, `data-error`, `data-tool-call`, `data-tool-result`
3. Add auto-scroll setting check — respect user preference to disable auto-scroll (P3-BUG-004)
4. Wire stream events to appropriate state updates (title, artifact, usage)

### Task 4.4 – Add Tool Component Implementations - Agent_ChatUI
**Objective:** Restore tool result UI components (weather, document preview).
**Output:** Updates to message component or tool rendering
**Guidance:** Reference `archive/oldapp/components/message.tsx` tool rendering. Resolves P3-BUG-005.

1. Create/update tool result renderers: weather display, document creation confirmation, suggestion display
2. Wire `toolInvocations` rendering in message component
3. Add loading states for in-progress tool calls
4. Add error display for failed tool calls

### Task 4.5 – Fix SWR Cache & Logout Flow - Agent_ChatUI
**Objective:** Restore SWR cache clearing on logout, fix signOut call, and cache key management.
**Output:** Updates to `components/sidebar-user-nav.tsx` or logout flow
**Guidance:** Resolves P3-BUG-007, P3-BUG-008.

1. Fix Supabase `signOut` call — replace with NextAuth `signOut()` (P3-BUG-008)
2. Add `mutate(() => true, undefined, { revalidate: false })` from SWR to clear all cached data on logout
3. Ensure chat history, vote, and suggestion caches are cleared
4. Add cache clearing before redirect to login page

### Task 4.6 – Add Chat Deduplication - Agent_ChatUI
**Objective:** Prevent duplicate chats from appearing in sidebar after optimistic creation.
**Output:** Updates to sidebar/history component
**Guidance:** Resolves P3-BUG-011.

- Add deduplication logic by chat ID before rendering chat list
- Handle race conditions between optimistic insert and server response

### Task 4.7 – Fix Sidebar Virtualization - Agent_ChatUI
**Objective:** Add GroupedVirtuoso virtualization to sidebar chat history.
**Output:** Updates to `components/app-sidebar.tsx` or `features/sidebar/`
**Guidance:** Reference `archive/oldapp/components/sidebar-history.tsx`. Resolves P3-BRK-003.

1. Replace flat list with `<GroupedVirtuoso>` for date-grouped chat history
2. Add proper group headers (Today, Yesterday, Previous 7 Days, etc.)
3. Configure virtualization for smooth scrolling with large histories

### Task 4.8 – Add Optimistic Chats Integration - Agent_ChatUI
**Objective:** Integrate optimistic updates for chat creation in sidebar.
**Output:** Updates to sidebar components
**Guidance:** Reference `archive/oldapp/components/sidebar-history.tsx`. Resolves P3-BRK-004.

1. Merge optimistic chats with server-fetched chats
2. Show new chat in sidebar immediately before server confirmation
3. Replace optimistic entry with server response on confirmation
4. Handle optimistic deletion with rollback on failure

### Task 4.9 – Add Chat Title Update Listener - Agent_ChatUI
**Objective:** Listen for title update events to reflect AI-generated titles in sidebar.
**Output:** Updates to sidebar components
**Guidance:** Reference `archive/oldapp/components/sidebar-history-item.tsx`. Resolves P3-BRK-005.

1. Create `chat-title-updated` custom event
2. Add event listener in sidebar history items
3. Dispatch event from chat streaming when title is generated (from Task 1.9)
4. Update SWR cache with new title on event

### Task 4.10 – Fix Infinite Scroll in Sidebar - Agent_ChatUI
**Objective:** Replace "Load More" button with automatic infinite scroll.
**Output:** Updates to sidebar history component
**Guidance:** Reference `archive/oldapp/components/sidebar-history.tsx`. Resolves P3-BUG-010.

- Implement `IntersectionObserver` or Virtuoso `endReached` callback
- Trigger next page fetch when user scrolls near bottom
- Show loading indicator during fetch
- Handle error states gracefully

### Task 4.11 – Restore Animations & UI Polish - Agent_ChatUI
**Objective:** Restore Framer Motion animations and fix UI styling issues removed during migration.
**Output:** Updates to various chat/sidebar components
**Guidance:** Resolves P3-BRK-012, P3-UI-001–005, P1-UI-001–003.

1. Add `AnimatePresence` wrapper for message list enter/exit animations (P3-BRK-012)
2. Restore message fade-in and sidebar open/close transitions (P3-UI-002, P3-UI-003)
3. Restore artifact panel slide-in animation (P3-UI-004)
4. Fix CodeMirror selection class names — update to match new CodeMirror version (P1-UI-001)
5. Fix Geist font import if `@next/font` path changed (P1-UI-002)
6. Restore chat page gradient animation (P1-UI-003, P3-UI-005)

### Task 4.12a – Fix Chat Component Bugs - Agent_ChatUI
**Objective:** Fix specific chat component defects.
**Output:** Updates to chat components (dropdown, references)
**Guidance:** Resolves P3-BUG-006, P3-BUG-012–015, P3-BRK-016.

1. Fix ChevronUp icon in dropdown trigger — replace with correct icon import (P3-BUG-006)
2. Fix broken component reference for P3-BRK-016: verify import resolves correctly
3. Fix message rendering edge cases (P3-BUG-012–015)
4. Ensure error boundaries handle component failures gracefully

Note: P3-BRK-017–024 (artifact component references) are handled by Task 5.9b to avoid cross-agent overlap.

### Task 4.12b – Fix Message Functional Discrepancies - Agent_ChatUI
**Objective:** Fix 10 functional discrepancies in message rendering vs OLD implementation.
**Output:** Updates to `features/chat/components/message.tsx` and related files
**Guidance:** Resolves P3-FNC-001–010.

1. Compare each P3-FNC issue against `archive/oldapp/components/message.tsx` for expected behavior
2. Fix message part rendering differences (text, code blocks, images)
3. Fix action handler behavioral differences (copy, edit, delete)
4. Fix edge case handling (empty messages, long messages, special characters)
5. Verify visual parity with old implementation

---

## Phase 5: Artifact System
*Goal: Fix artifact components, handlers, types, and API*
*Tasks: 10 | Resolves: P3-BRK-006–011, P3-BRK-013–024, P6-BRK-006, P6-BUG-001, P6-FNC-014, P7-FNC-002–004*
*Priority: HIGH — depends on Phase 1 for model wiring*

### Task 5.1 – Create ArtifactMessages Component - Agent_ArtifactUI
**Objective:** Create missing component for displaying messages within artifact context.
**Output:** `components/ai/chat/artifact-messages.tsx` or similar
**Guidance:** Reference `archive/oldapp/components/artifact-messages.tsx`. Resolves P3-BRK-006. **Depends on: Task 1.8 Output by Agent_AICore.**

1. Create `ArtifactMessages` component rendering messages specific to artifact context
2. Support filtered message view showing only artifact-related messages
3. Integrate with artifact panel layout

### Task 5.2 – Create Artifact Class & Registration System - Agent_ArtifactUI
**Objective:** Implement artifact type registration and class definition system.
**Output:** Updates to `features/artifact/types.ts` or new registration module
**Guidance:** Reference `archive/oldapp/artifacts/` registration pattern. Resolves P3-BRK-007, P3-BRK-010.

1. Create `ArtifactDefinition` interface with `kind`, `title`, `description`, `component`, `handler`, `model`
2. Create `artifactKinds` map registering all artifact types (text, code, image, sheet)
3. Create `registerArtifact(definition)` and `getArtifactDefinition(kind)` functions
4. Create `getArtifactIcon(kind)` helper for UI display
5. Export artifact type constants

### Task 5.3 – Add MultimodalInput to Artifact Panel - Agent_ArtifactUI
**Objective:** Add input component to artifact panel for inline chat.
**Output:** Updates to `features/artifact/components/` or artifact panel
**Guidance:** Reference `archive/oldapp/components/artifact.tsx`. Resolves P3-BRK-008.

1. Import `MultimodalInput` from `features/input/`
2. Add input area below artifact content in panel
3. Wire input to artifact-specific chat context
4. Support file attachments within artifact context

### Task 5.4 – Add Toolbar to Artifact Panel - Agent_ArtifactUI
**Objective:** Create toolbar component for artifact actions.
**Output:** `features/artifact/components/toolbar.tsx`
**Guidance:** Reference `archive/oldapp/components/toolbar.tsx`. Resolves P3-BRK-009.

1. Create Toolbar with actions: Undo, Redo, Copy, Download, Version History
2. Add keyboard shortcuts for common actions
3. Integrate with artifact state for undo/redo support
4. Add separator between action groups

### Task 5.5 – Fix Artifact Actions Implementation - Agent_ArtifactUI
**Objective:** Complete missing artifact action implementations.
**Output:** Updates to artifact action-related components
**Guidance:** Reference `archive/oldapp/components/artifact-actions.tsx`. Resolves P3-BRK-015.

1. Implement copy-to-clipboard action
2. Implement download action (text as .md, code as appropriate extension, sheet as .csv)
3. Implement version comparison modal
4. Wire actions to toolbar buttons

### Task 5.6 – Fix Artifact GET Endpoint - Agent_ArtifactUI
**Objective:** Fix GET to return version array instead of single artifact.
**Output:** Updates to `app/api/artifacts/route.ts`
**Guidance:** Resolves P6-BRK-006.

1. Update GET handler to call `artifactService.getVersionHistory(artifactId)` instead of `findById`
2. Return array of artifact versions sorted by creation date
3. Include version metadata (timestamp, title)
4. Add timestamp-based DELETE endpoint for artifact version rollback (P6-FNC-014)

### Task 5.7 – Fix rejectSuggestion Implementation - Agent_ArtifactUI
**Objective:** Complete the no-op rejectSuggestion function.
**Output:** Updates to `features/artifact/actions/suggestions.ts`
**Guidance:** Resolves P6-BUG-001.

1. Add `deleteSuggestion(id, ctx)` to `ArtifactService` wrapping `suggestionRepository.doDelete()`
2. Call the service method in `rejectSuggestion()` action after verification
3. Remove TODO comment

### Task 5.8 – Fix Data Stream Artifact Handlers - Agent_ArtifactUI
**Objective:** Fix artifact auto-visibility, suggestion accumulation, and status update.
**Output:** Updates to `features/chat/components/data-stream-handler.tsx`
**Guidance:** Resolves P7-FNC-002, P7-FNC-003, P7-FNC-004.

1. Add auto-visibility logic to text delta handler: set `isVisible: true` when content length between 400-450 chars during streaming (P7-FNC-002)
2. Fix suggestion accumulation: use callback form `setMetadata((prev) => ({ suggestions: [...(prev?.suggestions ?? []), streamPart.data] }))` instead of `setMetadata(streamPart.data)` (P7-FNC-003)
3. Add `status: "streaming"` to text delta handler (P7-FNC-004)

### Task 5.9a – Fix Artifact Panel Hook Integrations - Agent_ArtifactUI
**Objective:** Integrate missing hooks and components in artifact panel.
**Output:** Updates to `features/artifact/components/artifact-panel.tsx`
**Guidance:** Resolves P3-BRK-013, P3-BRK-014, P3-BRK-011.

1. Add `useWindowSize` hook to conditionally render panel based on viewport (P3-BRK-013)
2. Add `useSidebar` hook to adjust panel width when sidebar is open/closed (P3-BRK-014)
3. Integrate `VersionFooter` component at bottom of artifact panel (P3-BRK-011)

### Task 5.9b – Fix Broken Artifact Component References - Agent_ArtifactUI
**Objective:** Fix broken imports and component references in artifact system.
**Output:** Updates to various artifact component files
**Guidance:** Resolves P3-BRK-017–024.

1. Audit all artifact component imports against actual file paths
2. Fix broken references identified in P3-BRK-017 through P3-BRK-024
3. Verify all artifact components render without import errors
4. Run `pnpm typecheck` to confirm zero unresolved references

---

## Phase 6: Page Components, Hooks & State
*Goal: Fix providers, hooks, loading states, auth forms, and page-level issues*
*Tasks: 13 | Resolves: P1-BRK-001–003, P1-BUG-002/003, P1-FNC-001–011, P1-FNC-013–019, P4-BUG-001–003, P4-BRK-001, P4-FNC-001, P7-FNC-001*
*Priority: MEDIUM — depends on Phase 4 for component availability*

### Task 6.1 – Create OptimisticChatsProvider - Agent_Pages
**Objective:** Create missing context provider for optimistic chat list updates.
**Output:** New provider component
**Guidance:** Reference `archive/oldapp/hooks/use-optimistic-chats.tsx` for state/logic. Resolves P1-BRK-002, P4-BRK-001.

1. Create `use-optimistic-chats` hook with `addOptimisticChat`, `removeOptimisticChat`, `optimisticChats` state
2. Create `OptimisticChatsProvider` wrapping sidebar layout
3. Merge optimistic chats with server data in sidebar history
4. Handle race conditions between local and server state
5. Add to `app/(chat)/layout.tsx` provider hierarchy

### Task 6.2 – Create SettingsProvider - Agent_Pages
**Objective:** Create missing settings context provider.
**Output:** `features/settings/components/settings-provider.tsx`
**Guidance:** Reference OLD settings pattern. Resolves P1-BRK-003.

1. Create `SettingsProvider` with `useSettings()` hook
2. Store settings in localStorage with server sync
3. Provide model selection, temperature, system prompt access
4. Add to `app/(chat)/layout.tsx` provider hierarchy

### Task 6.3 – Fix Chat Visibility Hook - Agent_Pages
**Objective:** Restore server persistence and error handling in use-chat-visibility.
**Output:** Updates to `hooks/use-chat-visibility.ts`
**Guidance:** Reference `archive/oldapp/hooks/use-chat-visibility.ts:62-94`. Resolves P4-BUG-001, P4-BUG-002.

1. Create `updateChatVisibility` server action in `features/chat/actions/`
2. Call server action in `setVisibilityType` handler with optimistic update
3. Add error handling with rollback to previous value on failure
4. Add toast notification for success/failure feedback

### Task 6.4 – Fix Register Form - Agent_Pages
**Objective:** Add missing confirmPassword field to registration form.
**Output:** Updates to `components/auth-form.tsx` or registration component
**Guidance:** Resolves P1-BRK-001, P1-FNC-019.

1. Add `confirmPassword` field to register form
2. Add client-side validation: passwords must match
3. Add Zod schema validation for password confirmation
4. Display validation error message below field
5. Add `SubmitButton` component with ARIA `<output aria-live="polite">` for screen-reader feedback and type-switching to prevent double-submit (P1-FNC-019)

### Task 6.5 – Create Loading & Error Pages - Agent_Pages
**Objective:** Add missing loading.tsx and error.tsx for chat routes.
**Output:** `app/(chat)/loading.tsx`, `app/(chat)/chat/[id]/loading.tsx`, `app/(chat)/chat/[id]/error.tsx`
**Guidance:** Resolves P1-FNC-008, P1-FNC-009, P1-FNC-010.

1. Create `app/(chat)/loading.tsx` with chat skeleton UI
2. Create `app/(chat)/chat/[id]/loading.tsx` with message skeleton UI
3. Create `app/(chat)/chat/[id]/error.tsx` with error boundary and retry button
4. Add "Go Home" navigation link in error boundaries (P1-FNC-011)

### Task 6.6 – Add Analytics Components - Agent_Pages
**Objective:** Add missing analytics integration for production monitoring.
**Output:** Updates to `app/layout.tsx`
**Guidance:** Resolves P1-FNC-001.

1. Add `@vercel/analytics` Analytics component to root layout
2. Add `@vercel/speed-insights` SpeedInsights component
3. Conditional rendering: only in production builds

### Task 6.7 – Fix Auth Redirects & Email Confirmation - Agent_Pages
**Objective:** Fix post-login and post-registration redirect paths and email flow.
**Output:** Updates to auth pages and actions
**Guidance:** Resolves P1-FNC-003, P1-FNC-004, P1-FNC-005.

1. Fix post-login redirect: ensure redirect to intended page or `/` (P1-FNC-004)
2. Fix post-registration redirect: ensure redirect to `/login` with success message (P1-FNC-005)
3. Add email confirmation flow if applicable (P1-FNC-003) — document if intentionally removed

### Task 6.8 – Add Resource Hints & Pyodide Script - Agent_Pages
**Objective:** Add missing performance optimizations and code execution support.
**Output:** Updates to `app/layout.tsx` or head component
**Guidance:** Resolves P1-FNC-002, P1-FNC-006.

1. Add `<link rel="preconnect">` for AI API endpoints, CDNs (P1-FNC-002)
2. Add `<link rel="dns-prefetch">` for external resources
3. Add Pyodide script loading for Python code execution in code artifacts (P1-FNC-006)

### Task 6.9 – Add Notice Toast Handler - Agent_Pages
**Objective:** Restore notice/toast handling from URL parameters.
**Output:** Updates to layout or page components
**Guidance:** Resolves P1-FNC-007.

1. Create toast handler that reads URL `notice` parameter
2. Display toast notification on page load when parameter present
3. Clear parameter from URL after display
4. Support multiple notice types (success, error, info)

### Task 6.10a – Fix Page Metadata & SEO - Agent_Pages
**Objective:** Fix metadata, viewport, and SEO issues in page components.
**Output:** Updates to `app/layout.tsx`, page components
**Guidance:** Resolves P1-FNC-013, P1-FNC-015, P1-FNC-017, P1-FNC-018.

1. Add proper `metadata` export in page components for SEO (P1-FNC-015)
2. Fix viewport meta for mobile responsive behavior (P1-FNC-017)
3. Add route prefetching for common navigation paths (P1-FNC-018)
4. Add cookie consent banner if needed per compliance (P1-FNC-013)

### Task 6.10b – Fix Hydration Bugs - Agent_Pages
**Objective:** Fix React hydration mismatches in page components.
**Output:** Updates to components with hydration issues
**Guidance:** Resolves P1-BUG-002, P1-BUG-003.

- Identify components causing hydration mismatch (check browser console for "Hydration failed" errors)
- Fix server/client rendering differences (typically: Date formatting, window references, random values)
- Use `useEffect` or `suppressHydrationWarning` only as last resort

### Task 6.11 – Fix Hooks Discrepancies - Agent_Pages
**Objective:** Fix remaining hook-related issues.
**Output:** Updates to `hooks/` directory
**Guidance:** Resolves P4-BUG-003, P4-FNC-001.

1. Fix scroll-to-bottom hook edge cases (P4-BUG-003)
2. Fix any missing hook functionality (P4-FNC-001)
3. Ensure all hooks have proper cleanup in useEffect returns

### Task 6.12 – Add Auth State Change Listener - Agent_Pages
**Objective:** Implement multi-tab auth session synchronization.
**Output:** New listener in auth provider or layout component
**Guidance:** Reference `archive/oldapp/components/auth-provider.tsx`. Resolves P7-FNC-001.

1. Add auth state change listener that detects login/logout in other tabs
2. Use `BroadcastChannel` or `storage` event for cross-tab communication
3. On state change: refresh session, update UI, clear stale caches
4. Handle edge case where user logs out in one tab while streaming in another

---

## Phase 7: API Routes & Server Actions
*Goal: Fix missing endpoints, server actions, and route-level issues*
*Tasks: 14 | Resolves: P6-FNC-001–011, P6-FNC-014–018, P6-FNC-021, P6-FNC-029–035, P6-FNC-037, P6-FNC-039–047 + 1 enhancement*
*Priority: MEDIUM — depends on Phase 1 (AI core), Phase 3 (data layer)*

### Task 7.1 – Add Missing DELETE Endpoint for Chat - Agent_APIRoutes
**Objective:** Create chat deletion API endpoint.
**Output:** `app/api/chat/route.ts` or separate delete route
**Guidance:** Reference OLD chat DELETE pattern. Resolves P6-FNC-001. **Depends on: Task 3.5 Output by Agent_DataLayer.**

1. Add DELETE handler to chat route accepting chatId
2. Verify ownership before deletion
3. Cascade delete: messages, votes, suggestions, artifacts
4. Return appropriate success/error response

### Task 7.2 – Add Settings Support in Chat Schema - Agent_APIRoutes
**Objective:** Accept and apply user settings (model, temperature) in chat requests.
**Output:** Updates to chat route schema and action
**Guidance:** Resolves P6-FNC-002.

1. Add `selectedModel`, `temperature`, `maxTokens` to chat POST schema
2. Pass settings to `executeChatCompletion()` call
3. Validate model ID against available models
4. Apply temperature and token limits

### Task 7.3 – Add File Part Validation - Agent_APIRoutes
**Objective:** Validate file attachment parts in chat messages.
**Output:** Updates to chat message schema
**Guidance:** Resolves P6-FNC-003. **Depends on: Task 2.10 Output by Agent_Security.**

1. Add file part validation in message schema using Zod
2. Validate MIME types against allowed list
3. Validate file sizes
4. Reject messages with invalid attachments

### Task 7.4 – Add Cursor-Based Pagination to History - Agent_APIRoutes
**Objective:** Replace offset-based with cursor-based pagination in history API.
**Output:** Updates to `app/api/history/route.ts`
**Guidance:** Resolves P6-FNC-008. **Depends on: Task 3.13 Output by Agent_DataLayer.**

1. Accept `cursor` and `limit` query parameters
2. Use `applyCursorPagination` from data layer
3. Return `nextCursor` and `hasMore` in response
4. Maintain backward compatibility with offset pagination

### Task 7.5 – Add Stream Reconnection Logic - Agent_APIRoutes
**Objective:** Support SSE stream reconnection for dropped connections.
**Output:** `app/api/chat/[id]/reconnect/route.ts`
**Guidance:** Resolves P6-FNC-011, P6-FNC-012. **Depends on: Task 1.9 Output by Agent_AICore.**

1. Create reconnection endpoint accepting `lastEventId`
2. Resume stream from last event position
3. Handle expired sessions gracefully
4. Add exponential backoff guidance in response headers
5. Add stream-specific rate limiting via `requireRateLimitForRoute("standard", ..., "stream")` to prevent reconnect abuse (P6-FNC-012)

### Task 7.6 – Create Missing Server Actions - Agent_APIRoutes
**Objective:** Create deleteTrailingMessages and updateChatVisibility actions.
**Output:** New action files in `features/chat/actions/`
**Guidance:** Resolves P6-FNC-045, P6-FNC-046.

1. Create `deleteTrailingMessages(chatId, messageId)` — delete all messages after a given message for regeneration
2. Create `updateChatVisibility(chatId, visibility)` — update chat visibility with ownership check
3. Add auth guards and input validation
4. Invalidate relevant caches

### Task 7.7a – Add Chat Route Input Validation & Quota - Agent_APIRoutes
**Objective:** Add model validation and message quota enforcement to chat route.
**Output:** Updates to `features/chat/actions/stream-chat.action.ts`
**Guidance:** Resolves P6-FNC-004, P6-FNC-005. **Depends on: Task 1.10 Output by Agent_AICore.**

1. Add model ID validation against `getAvailableModels()` — reject invalid/unauthorized models (P6-FNC-004)
2. Add daily message quota enforcement using `entitlementsByUserType` — count messages today, reject if over limit (P6-FNC-005)
3. Return actionable error messages: "Model not available" / "Daily message limit reached"

### Task 7.7b – Add Chat Route Infrastructure Enhancements - Agent_APIRoutes
**Objective:** Add timeout, ordering, and request enrichment to chat route.
**Output:** Updates to `app/api/chat/route.ts`, `features/chat/actions/stream-chat.action.ts`
**Guidance:** Resolves P6-FNC-006, P6-FNC-007, P6-FNC-009, P6-FNC-010.

1. Add `export const maxDuration = 60` to route for Vercel streaming timeout (P6-FNC-006)
2. Fix message ordering — ensure consistent chronological order (P6-FNC-007)
3. Extract geo hints from request headers (`x-forwarded-for`, Vercel geo headers) for location-aware system prompts (P6-FNC-009/010)

### Task 7.8 – Add Artifact Route Validation & Versioning - Agent_APIRoutes
**Objective:** Add input validation and versioning support to artifact API.
**Output:** Updates to `app/api/artifacts/route.ts`
**Guidance:** Resolves P6-FNC-016–018, P6-FNC-020.

1. Add Zod schema validation for artifact ID format — return 400 for invalid IDs (P6-FNC-016)
2. Accept `version` parameter in POST/PUT for explicit version targeting (P6-FNC-017)
3. Validate `Content-Type` header matches expected artifact kind (P6-FNC-018)
4. Set `Cache-Control: private, max-age=60` on artifact GET responses (P6-FNC-020)

### Task 7.9 – Fix Vote Route Methods & Validation - Agent_APIRoutes
**Objective:** Fix HTTP methods, validation, and response format in vote API.
**Output:** Updates to `app/api/votes/route.ts`
**Guidance:** Resolves P6-FNC-040–042, P6-FNC-044, P6-FNC-047. Note: Ownership verification handled by Task 2.8.

1. Fix HTTP method: use PATCH for vote updates instead of POST (P6-FNC-040/041)
2. Add Zod validation for vote payload (chatId, messageId, isUpvoted) (P6-FNC-042)
3. Fix response format to match client expectations (P6-FNC-044)
4. Add structured error logging for vote failures (P6-FNC-047)

### Task 7.10 – Fix Suggestion Route Query & Response - Agent_APIRoutes
**Objective:** Fix suggestion query logic and response format.
**Output:** Updates to `app/api/suggestions/route.ts`
**Guidance:** Resolves P6-FNC-030–035. Note: Rate limiting in Task 2.9, ownership in Task 2.8.

1. Fix suggestion query to return ALL suggestions for document, not just first (P6-FNC-030)
2. Add `documentVersion` filter parameter (P6-FNC-031)
3. Fix response shape: return `{ suggestions: [...] }` with metadata (P6-FNC-032–035)

### Task 7.11 – Integrate File Validation in Upload Route - Agent_APIRoutes
**Objective:** Wire file validation utilities into upload endpoint.
**Output:** Updates to `app/api/files/upload/route.ts`
**Guidance:** Resolves P6-FNC-037, P6-FNC-039. **Depends on: Task 2.10 Output by Agent_Security.**

1. Import `validateAttachment` from `lib/files/validation.ts`
2. Call validation before Vercel Blob upload — reject invalid MIME types with 415 (P6-FNC-037)
3. Enforce `MAX_ATTACHMENT_SIZE` — reject oversized files with 413 (P6-FNC-039)

### Task 7.12 – Add Artifact Route Body Validation - Agent_APIRoutes
**Objective:** Add Zod schema validation to artifact route request bodies.
**Output:** Updates to `app/api/artifacts/route.ts`
**Guidance:** Resolves P6-FNC-021.

1. Import `ArtifactUUIDSchema` from `features/artifact/schemas/artifact.schema.ts`
2. Validate `id` parameter as UUID format at route level — return 400 for invalid IDs
3. Add `documentPostSchema` for POST body: content max 1MB, title 1–500 chars
4. Return structured 400 errors with field-level messages for validation failures

### Task 7.13 – Add History Route Search & Caching (Enhancement) - Agent_APIRoutes
**Objective:** Add search, filtering, and cache headers to history listing.
**Output:** Updates to `app/api/history/route.ts`
**Guidance:** Enhancement — no issue ID. Low priority, implement after all defects are resolved.

1. Add `q` query parameter for title search with `ILIKE`
2. Add `from`/`to` date range query parameters for date-based filtering
3. Set `Cache-Control: private, max-age=30, stale-while-revalidate=60` response header
4. Ensure consistent `ORDER BY updatedAt DESC` sorting

---

## Phase 8: Middleware, Types & Configuration
*Goal: Fix middleware gaps, add missing types, and configuration issues*
*Tasks: 9 | Resolves: P2-UI-001, P5-FNC-010, P9-FNC-001–010, P10-FNC-003, P11-FNC-001/002*
*Priority: MEDIUM — mostly independent, can run in parallel with Phases 4-7*

### Task 8.1 – Create Request Deduplication System - Agent_Middleware
**Objective:** Migrate the missing request deduplication system.
**Output:** `lib/middleware/deduplication.ts` (new file)
**Guidance:** Reference `archive/oldapp/lib/middleware/deduplication.ts:1-386`. Resolves P9-FNC-001, P9-FNC-005, P9-FNC-006, P9-FNC-007, P5-FNC-055.

1. Create `RequestDeduplicator` class with Redis-backed distributed deduplication
2. Implement `inFlightRequests` Map for same-process dedup (P9-FNC-005)
3. Implement `storeResponse()` for response caching (P9-FNC-006)
4. Create `generateRequestFingerprint(method, url, body?, userId?)` utility (P9-FNC-007)
5. Create `deduplicateRequest()` convenience function
6. Create `withDeduplication()` middleware wrapper
7. Add pre-configured presets: short (5s), standard (30s), long (60s), idempotent (300s)
8. Export from `lib/middleware/index.ts`

### Task 8.2 – Add Rate Limiting Algorithm Options - Agent_Middleware
**Objective:** Add token bucket algorithm for chat endpoints alongside sliding window.
**Output:** Updates to `lib/rate-limit/rate-limiter.ts`
**Guidance:** Reference `archive/oldapp/lib/middleware/rate-limit.ts:72-120`. Resolves P9-FNC-002, P5-FNC-058.

1. Add `TokenBucketLimiter` using `Ratelimit.tokenBucket()` from `@upstash/ratelimit`
2. Update `createRateLimiter` to accept `algorithm: "sliding_window" | "token_bucket"` option
3. Use token bucket for chat limiter (allows burst handling)
4. Keep sliding window for auth and API limiters
5. Update `chatLimiter` in `lib/rate-limit/limits.ts` to use token bucket

### Task 8.3 – Add OpenTelemetry Integration to Rate Limiting - Agent_Middleware
**Objective:** Add tracing span attributes to rate limit operations.
**Output:** Updates to `lib/rate-limit/rate-limiter.ts`
**Guidance:** Reference `archive/oldapp/lib/middleware/rate-limit.ts` OTel pattern. Resolves P9-FNC-003.

1. Import `trace` from `@opentelemetry/api`
2. Add span attributes in `performLimitCheck()`: `rate_limit.strategy`, `rate_limit.limit`, `rate_limit.allowed`, `rate_limit.remaining`, `rate_limit.namespace`
3. Add span for deduplication operations
4. Integrate OTel spans into logger module — ensure structured logging emits span attributes alongside console output (P5-FNC-064)

### Task 8.4 – Add Granular Rate Limit Presets - Agent_Middleware
**Objective:** Restore missing rate limit configuration presets.
**Output:** Updates to `lib/constants.ts`, `lib/rate-limit/limits.ts`
**Guidance:** Reference `archive/oldapp/lib/middleware/rate-limit-config.ts`. Resolves P9-FNC-004, P9-FNC-010, P5-FNC-061.

1. Add `RATE_LIMITS.strict` (10/60s), `RATE_LIMITS.standard` (100/60s), `RATE_LIMITS.generous` (1000/60s)
2. Add `RATE_LIMITS.authGuest` (20/60s) for guest-specific rate limiting
3. Create corresponding limiter instances in `lib/rate-limit/limits.ts`
4. Update `middleware.ts` to use guest-specific limiter for `/api/auth/guest`

### Task 8.5 – Complete Middleware Composition System - Agent_Middleware
**Objective:** Complete the placeholder apiMiddleware and publicMiddleware functions.
**Output:** Updates to `lib/middleware/compose.ts`
**Guidance:** Resolves P9-IMP-002 (verified incomplete).

1. Complete `apiMiddleware()` — integrate `withAuthMiddleware` + `withRateLimitMiddleware`
2. Complete `publicMiddleware()` — integrate `withRateLimitMiddleware` only
3. Wire at least one API route to use these composed middlewares as validation

### Task 8.6 – Fix ChatSDKError Migration - Agent_Middleware
**Objective:** Ensure error handling is consistent between old and new patterns.
**Output:** Updates as needed across error handling
**Guidance:** Resolves P5-FNC-010.

1. Create `ChatSDKError` compatibility adapter if OLD error codes are still referenced by client
2. Or update all client-side error handling to use `AppError` codes
3. Document error code mapping between old and new systems
4. Ensure error responses include actionable information

### Task 8.7 – Fix Separator Accessibility - Agent_Middleware
**Objective:** Restore accessibility attributes to custom Separator component.
**Output:** Updates to `components/ui/separator.tsx`
**Guidance:** Resolves P2-UI-001.

1. Add `aria-orientation` attribute based on `orientation` prop
2. Add `data-orientation` attribute for styling
3. Consider restoring Radix UI Separator primitive if server-component usage isn't required

### Task 8.8 – Fix Configuration Issues - Agent_Middleware
**Objective:** Add missing configuration files.
**Output:** `instrumentation-client.ts`, updates to `playwright.config.ts`
**Guidance:** Resolves P11-FNC-001, P11-FNC-002.

1. Create `instrumentation-client.ts` at project root (even if empty export, Next.js expects it)
2. Fix test script to include `PLAYWRIGHT` environment variable (P11-FNC-002)

### Task 8.9 – Fix getClientIP Export & Auth Consistency - Agent_Middleware
**Objective:** Fix middleware export paths and auth guard consistency.
**Output:** Updates to `lib/middleware/index.ts`, `lib/auth/guards.ts`
**Guidance:** Resolves P9-FNC-008, P8-FNC-008, P8-FNC-009.

1. Re-export `getClientIP` from `lib/middleware/index.ts` for convenience (P9-FNC-008)
2. Consider structured error codes in guards for better diagnostics (P8-FNC-008)
3. Update `requireAuth()` return type to include `session` alongside `userId` (P8-FNC-009)

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **Total Phases** | 8 |
| **Total Tasks** | 98 |
| **Single-step Tasks** | 14 |
| **Multi-step Tasks** | 83 |
| **Cross-Agent Dependencies** | 18 |
| **Issues Resolved** | ~215 |

| Agent | Domain | Task Count |
|-------|--------|------------|
| Agent_AICore | AI modules, streaming, providers, tools | 13 |
| Agent_Security | Auth hardening, rate limiting, CSRF, access | 10 |
| Agent_DataLayer | Error system, repositories, cache, utilities | 15 |
| Agent_ChatUI | Chat components, messages, sidebar | 13 |
| Agent_ArtifactUI | Artifact components, handlers, types | 10 |
| Agent_Pages | Pages, hooks, providers, state context | 13 |
| Agent_APIRoutes | API routes, server actions | 14 |
| Agent_Middleware | Middleware, rate limiting, types, config | 9 |

### Phase Dependency Graph

```
Phase 1 (AI Core) ──┬──→ Phase 4 (Chat UI) ──→ Phase 6 (Pages/Hooks)
                     ├──→ Phase 5 (Artifacts)
                     └──→ Phase 7 (API Routes)
Phase 2 (Security) ─────→ Phase 7 (API Routes)
Phase 3 (Data Layer) ───→ Phase 7 (API Routes)
Phase 8 (Middleware) ────→ (independent, parallel)
```

### Parallelization Matrix

| Phase | Can Run In Parallel With |
|-------|--------------------------|
| Phase 1 | Phase 2, Phase 3, Phase 8 |
| Phase 2 | Phase 1, Phase 3, Phase 8 |
| Phase 3 | Phase 1, Phase 2, Phase 8 |
| Phase 4 | Phase 5, Phase 8 (after Phase 1) |
| Phase 5 | Phase 4, Phase 8 (after Phase 1) |
| Phase 6 | Phase 7, Phase 8 (after Phase 4) |
| Phase 7 | Phase 6, Phase 8 (after Phases 1+3) |
| Phase 8 | All phases |

---

## Quality Gates (Per Task)

1. **Type Check**: `pnpm typecheck` — zero errors
2. **Format**: `pnpm format` — run after changes
3. **Lint**: `pnpm lint` — zero errors
4. **Functional**: Referenced issue's "Suggested Fix" criteria met
5. **References**: `archive/oldapp/` consulted for original pattern

---

## Issue Coverage Verification

All 274 tracked issues mapped:
- **~199 defects** → Assigned to tasks in Phases 1-8
- **~45 improvements** → Excluded (deferred to future cycle)
- **~25 false positives** → Excluded
- **~5 resolved** → Excluded

Each task's `Resolves` field traces back to specific issue IDs in `issues/`.


