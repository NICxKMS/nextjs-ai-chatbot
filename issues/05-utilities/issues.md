# Phase 5: Utilities - Issues

**Phase Name:** Utilities
**Comparison Scope:** lib/ directory utilities
**Date Started:** 2026-02-15
**Date Completed:** 2026-02-15

## Issue Counts

| Category | Count |
|----------|-------|
| UI Inconsistencies | 0 |
| Bugs | 1 |
| Broken Code | 5 |
| Functional Discrepancies | 45 |
| Improvement Only | 9 |
| **Total (non-FP)** | **60** |
| False Positives | 15 |
| **Grand Total** | **75** |

| Severity | Count |
|----------|-------|
| Critical | 9 |
| High | 22 |
| Medium | 20 |
| Low | 6 |
| N/A (Resolved) | 3 |
| **Total (non-FP)** | **60** |

## Table of Contents
- [Issue Counts](#issue-counts)
- [UI Inconsistencies](#ui-inconsistencies)
- [Bugs](#bugs)
- [Broken Code](#broken-code)
- [Functional Discrepancies](#functional-discrepancies)
- [Improvement Only](#improvement-only)

## VERIFICATION SUMMARY

| Issue | Status | Timestamp |
|-------|--------|-----------|
| P5-BRK-001 | Verified (Defect) | 2026-02-16T12:00:00Z |
| P5-BRK-002 | Verified (Defect) | 2026-02-16T12:00:00Z |
| P5-BRK-003 | Verified (Defect) | 2026-02-16T12:00:00Z |
| P5-BRK-004 | Verified (Defect) | 2026-02-16T23:45:00Z |
| P5-BRK-005 | Verified | 2026-02-16T12:00:00Z |
| P5-BUG-001 | Verified (Defect) | 2026-02-16T12:00:00Z |
| P5-FNC-001 | Verified | 2026-02-16T12:00:00Z |
| P5-FNC-002 | Verified | 2026-02-16T12:00:00Z |
| P5-FNC-003 | Verified | 2026-02-16T12:00:00Z |
| P5-FNC-004 | Verified | 2026-02-16T12:00:00Z |
| P5-FNC-005 | Verified | 2026-02-16T12:00:00Z |
| P5-FNC-006 | Verified | 2026-02-16T12:00:00Z |
| P5-FNC-007 | False Positive (Re-verified) | 2026-02-16T12:00:00Z |
| P5-FNC-008 | False Positive (Re-verified) | 2026-02-16T18:30:00Z |
| P5-FNC-009 | False Positive (Re-verified) | 2026-02-16T18:30:00Z |
| P5-FNC-010 | Improvement | 2026-02-16T18:30:00Z |
| P5-FNC-011 | Verified | 2026-02-16T18:30:00Z |
| P5-FNC-012 | Verified | 2026-02-16T18:30:00Z |
| P5-FNC-013 | Verified | 2026-02-16T18:30:00Z |
| P5-FNC-014 | False Positive (Re-verified) | 2026-02-16T18:30:00Z |
| P5-FNC-015 | Improvement | 2026-02-16T18:30:00Z |
| P5-FNC-016 | False Positive (Re-verified) | 2026-02-16T14:30:00Z |
| P5-FNC-017 | Verified | 2026-02-16T14:30:00Z |
| P5-FNC-018 | Verified | 2026-02-16T14:30:00Z |
| P5-FNC-019 | Verified | 2026-02-16T14:30:00Z |
| P5-FNC-020 | Verified | 2026-02-16T14:30:00Z |
| P5-FNC-021 | Verified | 2026-02-16T14:30:00Z |
| P5-FNC-022 | Verified | 2026-02-16T14:30:00Z |
| P5-FNC-023 | Verified | 2026-02-16T14:30:00Z |
| P5-FNC-024 | Improvement | 2026-02-16T14:30:00Z |
| P5-FNC-025 | Verified (Defect) | 2026-02-16T14:30:00Z |
| P5-FNC-026 | Verified (Defect) | 2026-02-16T14:30:00Z |
| P5-FNC-027 | Verified (Defect) | 2026-02-16T14:30:00Z |
| P5-FNC-028 | Improvement | 2026-02-16T14:30:00Z |
| P5-FNC-029 | Verified | 2026-02-16T14:30:00Z |
| P5-FNC-030 | Verified | 2026-02-16T14:30:00Z |
| P5-FNC-031 | Verified | 2026-02-16T14:30:00Z |
| P5-FNC-032 | Improvement | 2026-02-16T17:30:00Z |
| P5-FNC-033 | Verified | 2026-02-16T17:30:00Z |
| P5-FNC-034 | Improvement | 2026-02-16T17:30:00Z |
| P5-FNC-035 | Verified | 2026-02-16T17:30:00Z |
| P5-FNC-036 | Verified | 2026-02-16T17:30:00Z |
| P5-FNC-037 | Verified (Defect) | 2026-02-16T17:30:00Z |
| P5-FNC-038 | Verified (Defect) | 2026-02-16T17:30:00Z |
| P5-FNC-039 | False Positive (Re-verified) | 2026-02-16T17:30:00Z |
| P5-FNC-040 | False Positive (Re-verified) | 2026-02-16T18:30:00Z |
| P5-FNC-041 | Verified | 2026-02-16T18:30:00Z |
| P5-FNC-042 | Verified | 2026-02-16T18:30:00Z |
| P5-FNC-043 | Verified | 2026-02-16T18:30:00Z |
| P5-FNC-044 | Verified | 2026-02-16T18:30:00Z |
| P5-FNC-045 | False Positive (Re-verified) | 2026-02-16T18:30:00Z |
| P5-FNC-046 | Verified | 2026-02-16T18:30:00Z |
| P5-FNC-047 | False Positive | 2026-02-16T18:30:00Z |
| P5-FNC-048 | Verified | 2026-02-16T21:00:00Z |
| P5-FNC-049 | Verified | 2026-02-16T21:00:00Z |
| P5-FNC-050 | Verified | 2026-02-16T21:00:00Z |
| P5-FNC-051 | False Positive | 2026-02-16T21:00:00Z |
| P5-FNC-052 | False Positive | 2026-02-16T21:00:00Z |
| P5-FNC-053 | Verified | 2026-02-16T21:00:00Z |
| P5-FNC-054 | False Positive | 2026-02-16T21:00:00Z |
| P5-FNC-055 | Verified | 2026-02-16T21:00:00Z |
| P5-FNC-056 | False Positive | 2026-02-16T22:30:00Z |
| P5-FNC-057 | Improvement | 2026-02-16T22:30:00Z |
| P5-FNC-058 | Verified | 2026-02-16T22:30:00Z |
| P5-FNC-059 | False Positive | 2026-02-16T22:30:00Z |
| P5-FNC-060 | Improvement | 2026-02-16T22:30:00Z |
| P5-FNC-061 | Verified | 2026-02-16T22:30:00Z |
| P5-FNC-062 | Verified | 2026-02-16T22:30:00Z |
| P5-FNC-063 | Verified (Already Resolved) | 2026-02-16T22:30:00Z |
| P5-FNC-064 | Verified | 2026-02-16T21:00:00Z |
| P5-FNC-065 | Improvement | 2026-02-16T21:00:00Z |
| P5-FNC-066 | Verified (Resolved) | 2026-02-16T21:00:00Z |
| P5-FNC-067 | Verified | 2026-02-16T21:00:00Z |
| P5-FNC-068 | Verified (Resolved) | 2026-02-16T21:00:00Z |
| P5-FNC-069 | False Positive | 2026-02-16T21:00:00Z |

---

## UI Inconsistencies

*No UI inconsistencies identified in this phase.*

---

## Bugs

### [P5-BUG-001] Missing Circuit Breaker for Redis Failures

| Field | Value |
|-------|-------|
| **Issue ID** | P5-BUG-001 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/cache/operations.ts:36-89` |
| **NEW Path** | N/A |

**Description:** OLD has circuit breaker implementation: `CIRCUIT_BREAKER_THRESHOLD = 5` consecutive failures, `CIRCUIT_BREAKER_RESET_MS = 30000` (30 seconds), `isCircuitOpen()` - Check if operations should be skipped, `recordCacheFailure()` - Track failures and open circuit, `recordCacheSuccess()` - Reset failure count. When circuit is open, cache operations return `null` immediately without attempting Redis calls. NEW doesn't have circuit breaker - Redis client has retry logic but no circuit breaker at operation level.

**Impact:** During Redis outages, every cache operation will attempt connection and timeout, causing slow failures instead of fast-fail.

**Suggested Fix:** Add circuit breaker to `lib/cache/client.ts` or `lib/cache/strategies.ts`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Defect) |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed by code inspection. OLD (`archive/oldapp/lib/cache/operations.ts:36-89`) has a full circuit breaker implementation: module-scoped `consecutiveFailures` counter, `CIRCUIT_BREAKER_THRESHOLD = 5`, `CIRCUIT_BREAKER_RESET_MS = 30_000`, `circuitOpenedAt` timestamp, `isCircuitOpen()` function that auto-resets after timeout, `recordCacheFailure()` that opens circuit after threshold, and `recordCacheSuccess()` that resets the counter. NEW `lib/cache/client.ts` has only retry logic via `@upstash/redis` config (`retry: { retries: 3, backoff: exponential }`). Searched ALL files in `lib/cache/` — no circuit breaker pattern exists anywhere in `client.ts`, `strategies.ts`, `tiered-cache.ts`, `memory-cache.ts`, `keys.ts`, `invalidation.ts`, or `quota.ts`. The retry logic in the Redis client is not equivalent — it retries individual operations but does not fast-fail after repeated failures, meaning during sustained Redis outages every cache operation will attempt and timeout. This is a real defect that degrades resilience.

---

## Broken Code

### [P5-BRK-001] Missing `chat-completion.ts` - Core Chat Execution

| Field | Value |
|-------|-------|
| **Issue ID** | P5-BRK-001 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/ai/chat-completion.ts:1-290` |
| **NEW Path** | N/A |

**Description:** The entire `chat-completion.ts` module is missing. This is the core chat execution function that: executes AI chat completion with streaming, configures tools based on model capabilities, builds provider-specific options for reasoning models, handles timeout with `AbortSignal.timeout(55_000)`, uses `smoothStream` for better streaming UX, integrates with `tokenlens` for usage tracking, calls `onUsageCalculated` callback with usage data. Key Functions Missing: `executeChatCompletion(params: ChatCompletionParams)` - Main chat execution, `getEnabledTools(model)` - Tool enablement based on model capabilities, `buildProviderOptions(selectedModel)` - Provider-specific reasoning options.

**Impact:** Chat functionality will not work. This is the core function that processes chat messages and streams AI responses.

**Suggested Fix:** Create `lib/ai/chat-completion.ts` with the full implementation, adapting to new provider/registry structure.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Defect) |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed. `lib/ai/chat-completion.ts` does not exist in the NEW codebase (file_search only returns the OLD archive path). The NEW chat route (`app/api/chat/route.ts`) delegates to `streamChatAction` in `features/chat/actions/stream-chat.action.ts`, which handles auth, rate limiting, message persistence, and returns a result — but it does **not** contain the actual AI streaming logic. There is no `streamText` call, no `executeChatCompletion` equivalent, no tool wiring to an AI model, no `smoothStream`, no `AbortSignal.timeout`, no provider options building, and no `onFinish`/usage callback. The `streamChatAction` only saves messages to DB and returns `{ success, chatId }` — it does not stream AI responses. The core AI completion orchestration from `chat-completion.ts` (tool enablement by model capabilities, reasoning model provider options, tokenlens integration, streaming merge) has no equivalent in the new codebase. This is a genuine critical defect — chat AI streaming cannot function without this module.

---

### [P5-BRK-002] Missing `prompts.ts` - System Prompts

| Field | Value |
|-------|-------|
| **Issue ID** | P5-BRK-002 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/ai/prompts.ts:1-215` |
| **NEW Path** | N/A |

**Description:** The entire `prompts.ts` module is missing. This contains all system prompts used for AI interactions. Missing Prompts: (1) `artifactsPrompt` - Instructions for using Artifacts UI, (2) `regularPrompt` - Base assistant behavior guidelines, (3) `codePrompt` - Python code generation instructions, (4) `sheetPrompt` - CSV spreadsheet generation instructions, (5) `updateDocumentPrompt(currentContent, type)` - Document update prompt builder, (6) `systemPrompt({ selectedChatModel, requestHints, selectedModel, userSystemPrompt })` - Main system prompt builder, (7) `getRequestPromptFromHints(requestHints)` - Location context from geo hints. Missing Types: `RequestHints` - Geographic request context (latitude, longitude, city, country).

**Impact:** AI will have no system instructions. Chat responses will be unguided and inconsistent.

**Suggested Fix:** Create `lib/ai/prompts.ts` with all prompt templates and `RequestHints` type.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Defect) |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** 5 of 8 exports from OLD `archive/oldapp/lib/ai/prompts.ts` are genuinely missing in the NEW codebase. Only the artifact-specific prompts were relocated: **Relocated (3/8):** `codePrompt` → `CODE_CREATE_SYSTEM_PROMPT` in `features/artifact/handlers/code.handler.ts:24-31`, `sheetPrompt` → equivalent prompt in `features/artifact/handlers/sheet.handler.ts:38`, `updateDocumentPrompt` → `getUpdateSystemPrompt()` in each handler (`text.handler.ts:24`, `code.handler.ts:38`, `sheet.handler.ts:38`). **Missing (5/8):** `regularPrompt` — base assistant behavior guidelines (zero matches outside archive), `artifactsPrompt` — instructions for Artifacts UI (zero matches outside archive), `systemPrompt()` — main builder that combines `regularPrompt` + `requestPrompt` + optional `userSystemPrompt` + conditional `artifactsPrompt` (zero matches outside archive), `RequestHints` type — `{ latitude, longitude, city, country }` from `@vercel/functions` Geo (zero matches outside archive), `getRequestPromptFromHints()` — formats geo hints into prompt text (zero matches outside archive). The missing `systemPrompt()` builder is consumed by OLD `chat-completion.ts:183`. Since `chat-completion.ts` is also missing (P5-BRK-001), the consumer is absent too — but when chat completion is rebuilt, these prompts must be recreated. Re-verified 2026-02-16: OVERTURNED from False Positive to Verified (Defect). Original FP determination was incorrect — 5 of 8 exports are genuinely missing, including the core chat system prompt infrastructure.

---

### [P5-BRK-003] Missing `title-generation.ts` - Chat Title Generation

| Field | Value |
|-------|-------|
| **Issue ID** | P5-BRK-003 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/ai/title-generation.ts:1-67` |
| **NEW Path** | N/A |

**Description:** The entire `title-generation.ts` module is missing. Missing Functions: (1) `generateTitleFromUserMessage({ message })` - Async title generation using AI (uses `generateText` with title model, falls back to message text extraction on error, returns max 80 character title), (2) `generatePlaceholderTitle(message)` - Sync placeholder title (extracts first 80 chars from message text, used while async generation happens).

**Impact:** New chats will not have titles. Chat history will show "New Chat" for all conversations.

**Suggested Fix:** Create `lib/ai/title-generation.ts` with both title generation functions.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Defect) |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed. `lib/ai/title-generation.ts` does not exist in the NEW codebase (file_search only returns archive path). Grep search for `generateTitleFromUserMessage` and `generatePlaceholderTitle` across all non-archive files returns zero matches. The OLD implementation (`archive/oldapp/lib/ai/title-generation.ts:1-67`) provides: (1) `generateTitleFromUserMessage({ message })` — async AI-based title generation using `generateText` with title model, with error fallback to text extraction, max 80 chars; (2) `generatePlaceholderTitle(message)` — sync placeholder extracting first 80 chars from message text parts. The OLD chat route uses both: placeholder on chat creation, async generation in background. The NEW `streamChatAction` accepts an optional `title` parameter but has no AI-based title generation. Without this module, new chats will require manual title-setting or will show generic titles. This is a genuine defect.

---

### [P5-BRK-004] Missing `tools/` Directory - AI Tool Definitions

| Field | Value |
|-------|-------|
| **Issue ID** | P5-BRK-004 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/ai/tools/` |
| **NEW Path** | N/A |

**Description:** The entire `tools/` directory is missing with 4 tool implementations: (1) **`create-document.ts`** (91 lines) - Creates new documents, code snippets, spreadsheets; uses `artifactKinds` and `documentHandlersByArtifactKind`; streams document creation progress via `dataStream`; returns document ID, title, kind. (2) **`get-weather.ts`** (78 lines) - Gets weather by coordinates or city name; uses Open-Meteo API (no API key needed); includes `geocodeCity()` helper for city lookup. (3) **`request-suggestions.ts`** (106 lines) - Generates document improvement suggestions; uses `streamObject` for streaming suggestions; saves suggestions to database for authenticated users; uses `artifact-model` for generation. (4) **`update-document.ts`** (73 lines) - Updates existing documents; looks up document via `documentData.get()`; delegates to document handlers by kind.

**Impact:** AI cannot use any tools. Document creation, weather lookup, and suggestions will not work.

**Suggested Fix:** Create `lib/ai/tools/` directory with all 4 tool implementations.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Defect) |
| **Verified At** | 2026-02-16T23:45:00Z |

**Findings (Re-verification):** All 4 tool files DO exist at `features/chat/lib/tools/` — the relocation claim was correct. However, **3 of 4 tools have reduced capabilities**, and the factory is not wired into the chat pipeline:

| Tool | OLD → NEW File | Present? | Functionally Equivalent? |
|------|---------------|----------|-------------------------|
| get-weather | `get-weather.ts` → `weather.tool.ts` | Yes | Yes — Improved (timeouts, retries, AbortController) |
| create-document | `create-document.ts` → `create-document.tool.ts` | Yes | No — Reduced (handler delegation removed) |
| update-document | `update-document.ts` → `update-document.tool.ts` | Yes | No — Reduced (handler delegation removed) |
| request-suggestions | `request-suggestions.ts` → `suggestions.tool.ts` | Yes | No — Reduced (only 1st suggestion persisted) |

**Critical regression 1 — create-document & update-document lost handler delegation:** OLD `create-document.ts:61-77` calls `documentHandler.onCreateDocument({ id, title, dataStream, session, chatId })` which triggers AI content generation and persistence via the handler. OLD `update-document.ts:46-62` calls `documentHandler.onUpdateDocument({ document, description, dataStream, session })`. NEW tools do NEITHER — they stream metadata events and return immediately. The artifact handlers at `features/artifact/handlers/` are **never imported or called** by any route, action, or tool in the NEW codebase — `getArtifactHandler()` and `artifactHandlersByKind` have zero consumers outside their own definitions.

**Critical regression 2 — suggestions tool saves only first suggestion:** OLD `request-suggestions.ts:88-98` calls `saveSuggestions({ suggestions: suggestions.map(...) })` — batch-inserts ALL generated suggestions. NEW `suggestions.tool.ts:171-183` calls `artifactService.addSuggestion(documentId, { firstSuggestion fields }, context)` — persists ONLY the first suggestion.

**Critical regression 3 — createChatTools() is unused:** The `createChatTools()` factory in `index.ts:122-150` is defined but NEVER imported by any file outside `features/chat/lib/tools/` — the tools are not wired into the chat streaming pipeline.

**Verdict:** OVERTURNED from False Positive. While all 4 tool files exist at the new path, 3 of 4 have reduced capabilities and the factory function is not connected to any consumer.

---

### [P5-BRK-005] Missing Guest User Cache-Only Data Strategy

| Field | Value |
|-------|-------|
| **Issue ID** | P5-BRK-005 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/data/chat.ts:85-326` |
| **NEW Path** | `lib/data/repositories/chat.repository.ts` |

**Description:** OLD data layer has sophisticated guest user handling: guest users use cache-only operations (no DB writes), authenticated users use DB-first with cache warming, `ctx.isGuest` flag determines data strategy, cache miss for guests returns `null` (no DB fallback). NEW repository pattern doesn't have guest-specific logic: all operations go through DB, no cache-first strategy for guests, `RepositoryContext` has `isGuest` but it's not used.

**Impact:** Guest users will have data persisted to database, losing the ephemeral guest experience. Performance impact from always hitting DB.

**Suggested Fix:** Implement guest-aware data strategy in repositories or create separate `GuestDataRepository` for cache-only operations.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed. OLD `chatData.get()` in `archive/oldapp/lib/data/chat.ts:85-169` checks `ctx.isGuest` and returns `null` on cache miss for guests (no DB fallback). OLD `chatData.getWithMessages()` at L187-326 follows the same pattern. NEW `RepositoryContext` in `lib/data/types.ts:59-64` defines `isGuest: boolean` but it is **never checked** in `ChatRepository` methods (`lib/data/repositories/chat.repository.ts`) — all queries go through `doFindById` → DB unconditionally. `ChatService` (`lib/data/services/chat.service.ts`) has zero references to `isGuest`, `guest`, or any cache-first logic. All guest user operations will hit the database instead of being cache-only. The issue accurately describes a real functional regression.

---

## Functional Discrepancies

### Core Utilities (utils.ts)

#### [P5-FNC-001] Missing `fetcher` Function - SWR Data Fetcher

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-001 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/utils.ts:17-64` |
| **NEW Path** | N/A |

**Description:** The OLD codebase contains a `fetcher` function used as an SWR data fetcher with comprehensive error handling: parses error responses and extracts error codes, handles network offline detection, throws `ChatSDKError` with proper error codes, redirects to home page for `not_found:chat` errors.

**Impact:** SWR data fetching throughout the application will fail. Any component using `useSWR` with this fetcher pattern will not have proper error handling.

**Suggested Fix:** Create `lib/utils/fetcher.ts` with the fetcher implementation or add to existing utils.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed missing as a shared utility. OLD exports `fetcher` from `archive/oldapp/lib/utils.ts:17-64` with `ChatSDKError` wrapping, error code parsing, offline detection, and `not_found:chat` redirect. NEW codebase has no shared `fetcher` export. `components/document/document-preview.tsx:31` defines a local `fetcher` with minimal error handling (`throw new Error("Failed to fetch")`) — no error code parsing, no offline detection, no redirects. SWR usages in `features/artifact/` use inline async functions instead of a shared fetcher. The OLD fetcher's comprehensive error handling (ChatSDKError, offline, redirect) is not replicated anywhere in the new codebase.

---

#### [P5-FNC-002] Missing `fetchWithErrorHandlers` Function

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-002 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/utils.ts:66-104` |
| **NEW Path** | N/A |

**Description:** The OLD codebase contains a `fetchWithErrorHandlers` function that wraps fetch with: automatic error response parsing, error code extraction from JSON responses, offline detection with `navigator.onLine`, throws `ChatSDKError` for consistent error handling.

**Impact:** API calls throughout the application that need error handling will not have consistent error management.

**Suggested Fix:** Implement `fetchWithErrorHandlers` in `lib/utils/` or equivalent location.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed missing. OLD `fetchWithErrorHandlers` in `archive/oldapp/lib/utils.ts:66-104` wraps `fetch()` with JSON error code extraction, `ChatSDKError` creation, `not_found:chat` redirect, and offline detection via `navigator.onLine`. OLD `chat.tsx:40` imports it and passes as `fetch: fetchWithErrorHandlers` to `DefaultChatTransport` (line 202). NEW `features/chat/components/chat.tsx:132-144` creates `DefaultChatTransport` without a custom `fetch`, using browser's native `window.fetch`. No equivalent function exists anywhere in the new codebase. This is also cross-referenced by P3-BUG-001 in `issues/03-shared-components/issues.md` which independently confirmed the same defect.

---

#### [P5-FNC-003] Missing `generateUUID` Function

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-003 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/utils.ts:113-137` |
| **NEW Path** | N/A |

**Description:** The OLD codebase contains a `generateUUID` function that: uses native `crypto.randomUUID()` when available (2-5x faster), falls back to `crypto.getRandomValues()` for cryptographic security, throws error if crypto API unavailable (instead of insecure fallback).

**Impact:** Any code that needs to generate UUIDs client-side or server-side will need this utility.

**Suggested Fix:** Add `generateUUID` function to `lib/utils/validation.ts` or create new `lib/utils/uuid.ts`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed missing as a shared utility. OLD `generateUUID` in `archive/oldapp/lib/utils.ts:113-137` provides: (1) `crypto.randomUUID()` fast path, (2) `crypto.getRandomValues()` secure fallback with proper RFC 4122 v4 bit manipulation, (3) error throw if crypto unavailable. NEW codebase uses `crypto.randomUUID()` directly at call sites: `features/chat/lib/tools/suggestions.tool.ts:107,147`, `features/chat/lib/tools/create-document.tool.ts:84`, `lib/data/services/chat.service.ts:246`, `lib/data/services/auth.service.ts:199,288`, `lib/data/services/artifact.service.ts:283,469`, `lib/auth/session.ts:290`. These inline calls lack the `getRandomValues` fallback and error handling. No centralized `generateUUID` utility exists in the new code.

---

#### [P5-FNC-004] Missing `getMostRecentUserMessage` Function

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-004 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/utils.ts:142-145` |
| **NEW Path** | N/A |

**Description:** Utility function to get the most recent user message from an array of messages. Used in chat processing logic.

**Impact:** Chat message processing may fail if this utility is used elsewhere in the application.

**Suggested Fix:** Add to `lib/utils/message.ts` or appropriate location.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed missing. OLD `getMostRecentUserMessage` in `archive/oldapp/lib/utils.ts:142-145` filters messages by `role === "user"` and returns the last one via `.at(-1)`. Grep found zero matches for `getMostRecentUserMessage` in the new codebase (app/, features/, lib/, components/). While `.at(-1)` is used inline in some places, those access the last message of the full array — NOT filtering to user messages first, which is a different operation. The function is genuinely missing as a reusable utility.

---

#### [P5-FNC-005] Missing `getTrailingMessageId` Function

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-005 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/utils.ts:162-174` |
| **NEW Path** | N/A |

**Description:** Function to get the ID of the last message in a message array. Returns null if no messages exist.

**Impact:** Message pagination and streaming logic may be affected.

**Suggested Fix:** Add to `lib/utils/message.ts` or appropriate location.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed missing. OLD `getTrailingMessageId` in `archive/oldapp/lib/utils.ts:162-174` takes `{ messages: ResponseMessage[] }` and returns `messages.at(-1)?.id ?? null`. Grep found zero matches in the new codebase outside archive/ and issue files. No equivalent named function or inline pattern with the same destructured-parameter signature exists.

---

#### [P5-FNC-006] Missing `sanitizeText` Function

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-006 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/utils.ts:176-178` |
| **NEW Path** | N/A |

**Description:** Simple text sanitization function that removes `<has_function_call>` tokens from text. Note: NEW has `sanitizeHtml` in `lib/utils/string.ts` which is different - it escapes HTML entities for XSS prevention.

**Impact:** Text processing that expects `<has_function_call>` removal may not work correctly.

**Suggested Fix:** Add `sanitizeText` function to `lib/utils/string.ts` alongside `sanitizeHtml`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed missing. OLD `sanitizeText` in `archive/oldapp/lib/utils.ts:176-178` does `text.replace("<has_function_call>", "")` — strips a specific AI model marker token. NEW codebase has `sanitizeHtml` in `lib/utils/string.ts:83-92` which performs full HTML entity encoding — a fundamentally different operation. `sanitizeHtml` would corrupt markdown content containing `<`, `>`, `=`, backticks, etc. This is also cross-referenced by P3-BRK-020 in `issues/03-shared-components/issues.md` which independently confirmed that using `sanitizeHtml` instead of `sanitizeText` breaks AI response rendering.

---

#### [P5-FNC-007] Missing `convertToUIMessages` Function

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-007 |
| **Severity** | Critical |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/lib/utils.ts:180-201` |
| **NEW Path** | `app/(chat)/chat/[id]/page.tsx:37-50` |

**Description:** Critical function that converts `MessageRow[]` from database to `ChatMessage[]` format for UI: maps database message format to AI SDK UIMessage format, converts parts with proper typing, adds metadata with createdAt timestamp, throws `ChatSDKError` if message is missing ID.

**Impact:** Chat display functionality will fail. Messages from database cannot be converted to UI format.

**Suggested Fix:** Implement in `lib/utils/message.ts` or `features/chat/utils/` with proper type imports.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | False Positive (Re-verified) |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** The function EXISTS in the new codebase. `app/(chat)/chat/[id]/page.tsx:37-50` defines `function convertToUIMessages(messages: Message[]): ChatMessage[]` as a local (non-exported) function. It maps `id`, `role` (cast to union), `parts` (cast to `ChatMessage["parts"]`), and `metadata.createdAt` — functionally equivalent to OLD. **Differences:** (1) OLD throws `ChatSDKError` if `message.id` is missing; NEW does not validate message IDs. (2) OLD uses `UIMessagePart<CustomUIDataTypes, ChatTools>[]` type cast; NEW uses `ChatMessage["parts"]`. (3) NEW is file-local, not exported as a shared utility. P1-BUG-002 separately tracks the missing ID validation, and the lack of a shared export is a code organization concern.

**Re-verification (2026-02-16):** Confirmed False Positive. OLD had 2 consumers: `chat/[id]/page.tsx` and `api/chat/route.ts:163`. In NEW, the first consumer uses the local copy; the second uses a different inline mapping to `StreamMessage`. Missing ID validation is tracked by P1-BUG-002.

---

#### [P5-FNC-008] Missing `getTextFromMessage` Function

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-008 |
| **Severity** | High |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/lib/utils.ts:203-208` |
| **NEW Path** | `features/chat/components/message-editor.tsx:55-68` |

**Description:** Extracts plain text content from a ChatMessage by filtering text parts and joining them.

**Impact:** Message text extraction for display or processing will not work.

**Suggested Fix:** Add to `lib/utils/message.ts` alongside other message utilities.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | False Positive (Re-verified) |
| **Verified At** | 2026-02-16T18:30:00Z |

**Findings:** The function EXISTS in the new codebase. `features/chat/components/message-editor.tsx:55-68` defines a local `function getTextFromMessage(message: ChatMessage): string` that filters parts by `type === "text"` with a proper TypeScript type guard, maps to `.text`, joins with `\n`, and trims. Functionally equivalent to OLD. The NEW version is improved: adds a type guard for type safety, handles missing `parts` with `return ""` fallback, uses `\n` join for multi-part text readability. OLD had exactly 1 consumer (`message-editor.tsx:15`), NEW has exactly 1 consumer — same component. No other consumers exist in either codebase.

---

#### [P5-FNC-009] Missing `getLocalStorage` Function

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-009 |
| **Severity** | Low |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/lib/utils.ts:106-111` |
| **NEW Path** | `hooks/use-local-storage.ts` |

**Description:** SSR-safe localStorage getter that returns empty array if window is undefined.

**Impact:** Minor - can be implemented inline where needed.

**Suggested Fix:** Add to `lib/utils/storage.ts` if needed, or implement inline.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | False Positive (Re-verified) |
| **Verified At** | 2026-02-16T18:30:00Z |

**Findings:** The NEW codebase has **replaced this pattern** with a more capable React hook: `hooks/use-local-storage.ts` exports `useLocalStorage(key, initialValue, options)` which provides SSR-safe initialization, JSON serialization/deserialization, reactive state updates via `useState`, a `removeValue` function, and cross-tab synchronization potential. Exhaustive grep of `archive/oldapp/` for `getLocalStorage` returned only the definition — zero imports, zero consumers. The function was dead code in OLD.

---

### Error Utilities (errors.ts)

#### [P5-FNC-011] Missing `toDatabaseError` Helper Function

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-011 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/errors.ts:167-180` |
| **NEW Path** | N/A |

**Description:** OLD has `toDatabaseError` function that: maps PostgreSQL error codes to `ChatSDKError` codes, handles constraint violations (unique, foreign key, not null, check), handles concurrency issues (deadlock, serialization failure), handles connection/availability errors, provides detailed error messages for database issues.

**Impact:** Database error handling will not have granular error codes. Users will see generic error messages instead of specific database error explanations.

**Suggested Fix:** Add `toDatabaseError` function to `lib/errors/` or `lib/db/` with PostgreSQL error code mapping.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T18:30:00Z |

**Findings:** Confirmed missing. OLD `toDatabaseError(operation, err?, cause?)` in `archive/oldapp/lib/errors.ts:167-180` converts Postgres errors to typed `ChatSDKError` instances. Used extensively in OLD data layer — 14+ call sites across `archive/oldapp/lib/data/chat.ts` and `archive/oldapp/lib/data/document.ts`. The NEW repositories catch database errors and wrap them in generic `throw new InternalServerError("Failed to X", { error })` — no Postgres error code inspection, no constraint violation differentiation, no operation context. A unique constraint violation (23505) and a connection failure (08006) both produce the same `InternalServerError` in the NEW system.

---

#### [P5-FNC-012] Missing `mapPostgresCodeToError` Function

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-012 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/errors.ts:110-143` |
| **NEW Path** | N/A |

**Description:** Maps PostgreSQL error codes to granular ChatSDKError codes: `23505` → `bad_request:database:unique_violation`, `23503` → `bad_request:database:foreign_key_violation`, `23502` → `bad_request:database:not_null_violation`, `40P01` → `bad_request:database:deadlock_detected`, `08006` → `offline:database:connection_failure`, and more.

**Impact:** Database errors will not have specific error codes for proper handling and user messaging.

**Suggested Fix:** Add PostgreSQL error code mapping to `lib/errors/` or create `lib/db/errors.ts`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T18:30:00Z |

**Findings:** Confirmed missing. OLD `mapPostgresCodeToError(code?)` in `archive/oldapp/lib/errors.ts:110-143` maps 12 PostgreSQL error codes to granular `ErrorCode` values. No equivalent mapping exists anywhere in the NEW codebase — grep for `23505|23503|23502|40P01|08006|postgres.*code` across `lib/` returns zero matches. This is tightly coupled to P5-FNC-011; the mapping is a prerequisite for granular database error handling.

---

#### [P5-FNC-013] Missing Guest-Specific Error Messages

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-013 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/errors.ts:186-210` |
| **NEW Path** | `lib/errors/messages.ts` |

**Description:** OLD has `ErrorUserType` type and guest-specific error messages in `getMessageByErrorCode`: guest users see contextual messages explaining guest limitations (e.g., "Chat not found. Guest chat history is temporary and may have expired. Sign in to save your chats permanently."). NEW error messages are generic and don't account for user type context.

**Impact:** Guest users will see generic error messages instead of contextual messages that guide them to sign in.

**Suggested Fix:** Add `userType` parameter to error message functions in `lib/errors/messages.ts` and implement guest-specific message variants.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T18:30:00Z |

**Findings:** Confirmed missing. OLD `getMessageByErrorCode(errorCode, userType?)` in `archive/oldapp/lib/errors.ts:186-210` has an `if (userType === "guest")` branch with 6 guest-specific error messages. The NEW `lib/errors/messages.ts` defines `getErrorMessage(error, locale?)` which takes an `AppError` and optional locale — no user type parameter, no guest-specific message variants, no `ErrorUserType` type. All guest-specific UX guidance (encouraging sign-in) is lost.

---

#### [P5-FNC-014] Missing `visibilityBySurface` Configuration

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-014 |
| **Severity** | Medium |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/lib/errors.ts:33-45` |
| **NEW Path** | N/A |

**Description:** OLD has `visibilityBySurface` configuration that controls error visibility: `"response"` (error details sent in response), `"log"` (generic message in response, details logged only), `"none"` (no error details exposed). This provides security control over which errors expose internal details.

**Impact:** All errors expose the same level of detail. No granular control over error visibility for security purposes.

**Suggested Fix:** Add visibility configuration to error handling system or implement in `toResponse()` method.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | False Positive (Re-verified) |
| **Verified At** | 2026-02-16T18:30:00Z |

**Findings:** While the `visibilityBySurface` configuration structure exists in OLD, **all 11 surfaces are set to `"response"`** — no surface uses `"log"` or `"none"`. The `"log"` code path in `toResponse()` is **dead code** since no surface is configured for it. The OLD `ChatSDKError.toResponse()` and the NEW `AppError.toResponse()` both expose full error details in practice, making them behaviorally identical. The mechanism was designed for future use but never activated.

---

### Constants (constants.ts)

#### [P5-FNC-016] Missing `MAX_MESSAGES_LIMIT` Constant (Renamed)

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-016 |
| **Severity** | Medium |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/lib/constants.ts:73` |
| **NEW Path** | `lib/constants.ts:168` |

**Description:** OLD: `MAX_MESSAGES_LIMIT = 1000` (flat constant). NEW: `MESSAGE_CONSTANTS.maxMessagesLimit = 1000` (nested in object). Code importing `MAX_MESSAGES_LIMIT` directly will fail.

**Impact:** Need to update imports to use `MESSAGE_CONSTANTS.maxMessagesLimit`.

**Suggested Fix:** Add export alias or update all imports.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | False Positive (Re-verified) |
| **Verified At** | 2026-02-16T14:30:00Z |

**Findings:** The constant value is preserved identically (1000) as `MESSAGE_CONSTANTS.maxMessagesLimit`. Grep confirms **zero** imports of `MAX_MESSAGES_LIMIT` in NEW codebase outside `archive/`. The rename is an intentional restructuring with no backward compatibility issue since no NEW code uses the old import. Non-enforcement of the limit in the data layer is a separate concern.

---

### File Utilities (files.ts)

#### [P5-FNC-017] Missing File Attachment Validation Utilities

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-017 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/files.ts:1-52` |
| **NEW Path** | N/A |

**Description:** The entire `files.ts` module is missing from the NEW codebase. It contains: `ATTACHMENT_MAX_FILE_SIZE` (5MB), `ATTACHMENT_ALLOWED_MIME_TYPES` (set of allowed MIME types including images, documents, archives, and Office formats), `ATTACHMENT_ALLOWED_TYPE_PREFIXES` (`image/`, `audio/`, `video/`), `getAllowedAttachmentMimeTypes()`, and `isAllowedAttachmentMimeType()`.

**Impact:** File upload functionality will have no centralized validation. No file size limits enforced from a single source. No MIME type restrictions for 10+ document types. Security risk: any file type could be uploaded.

**Suggested Fix:** Create `lib/files/validation.ts` or `lib/utils/file.ts` with all file validation utilities.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T14:30:00Z |

**Findings:** Confirmed. No centralized `lib/files.ts` or `lib/files/validation.ts` exists. File validation is scattered across two inline locations: (1) `app/api/files/upload/route.ts:16-27` defines `MAX_FILE_SIZE = 10MB` (doubled from OLD 5MB) and `ALLOWED_TYPES` with only 7 MIME types. (2) `features/input/types.ts:70-88` defines `DEFAULT_UPLOAD_CONFIG` with the same 7 types. **Missing from both:** 10 MIME types from OLD (csv, json, zip, octet-stream, Excel old/new, Word old/new, PowerPoint old/new), `ATTACHMENT_ALLOWED_TYPE_PREFIXES` for audio/video prefix matching, `isAllowedAttachmentMimeType()` with null/undefined security guard. Validation is duplicated between route and feature config with no single source of truth. Cross-referenced by P6-FNC issues.

---

### AI Utilities (lib/ai/)

#### [P5-FNC-018] Missing `constants.ts` - AI Configuration Constants

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-018 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/ai/constants.ts:1-65` |
| **NEW Path** | N/A |

**Description:** AI-specific constants are missing: `DEFAULT_MODEL_ID`, `DEFAULT_TEMPERATURE`, `DEFAULT_MAX_OUTPUT_TOKENS`, `DEFAULT_TOP_P`, `MAX_CONTEXT_TOKENS`, `SYSTEM_PROMPT_RESERVE_TOKENS`, `TITLE_GENERATION_MAX_TOKENS`, `MODEL_CACHE_TTL_MS`, `MODEL_DISCOVERY_TIMEOUT_MS`, `DEFAULT_MESSAGES_PER_MINUTE`, `DEFAULT_TOKENS_PER_MINUTE`, `STREAM_CHUNK_SIZE`, `STREAM_TIMEOUT_MS`, `SUPPORTED_PROVIDERS` array, `MODEL_CATEGORIES` object.

**Impact:** No centralized AI configuration. Magic numbers scattered or defaults not applied.

**Suggested Fix:** Create `lib/ai/constants.ts` with all AI-specific constants.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T14:30:00Z |

**Findings:** Confirmed. `lib/ai/constants.ts` does not exist — directory listing of `lib/ai/` shows only: `context-window.ts`, `index.ts`, `providers.ts`, `registry.ts`, `token-counter.ts`. Some OLD constant values have scattered inline equivalents: `temperature: 0.7` in `features/settings/types.ts:273`, `maxOutputTokens: 4096` in `features/settings/types.ts:275`. However, 9 constants from OLD have **no equivalent anywhere** in the NEW codebase: `SYSTEM_PROMPT_RESERVE_TOKENS` (2000), `TITLE_GENERATION_MAX_TOKENS` (80), `MODEL_CACHE_TTL_MS` (1 hour), `MODEL_DISCOVERY_TIMEOUT_MS` (5000), `DEFAULT_MESSAGES_PER_MINUTE` (20), `DEFAULT_TOKENS_PER_MINUTE` (100000), `STREAM_CHUNK_SIZE` (1024), `STREAM_TIMEOUT_MS` (30000), `MODEL_CATEGORIES` object. The model defaults being hardcoded inline rather than centralized violates DRY.

---

#### [P5-FNC-019] Missing `entitlements.ts` - User Model Entitlements

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-019 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/ai/entitlements.ts:1-31` |
| **NEW Path** | N/A |

**Description:** User entitlements for model access are missing: `Entitlements` type with `maxMessagesPerDay` and `availableChatModelIds`, `entitlementsByUserType` configuration (guest: 20 messages/day, regular: 100 messages/day).

**Impact:** No rate limiting based on user type. No model access control.

**Suggested Fix:** Create `lib/ai/entitlements.ts` or integrate into `features/auth/` or `lib/rate-limit/`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T14:30:00Z |

**Findings:** Confirmed. No `entitlements.ts` exists anywhere in the NEW codebase. The v6 spec prescribes `lib/auth/entitlements.ts` but this was never implemented. **Functional gaps:** (1) No per-day message limit per user type — OLD had `guest: 20/day`, `regular: 100/day`; NEW `RATE_LIMITS.chat` is `60/minute` for all users regardless of type. (2) No user-type-based model access control. (3) No `Entitlements` type for downstream consumption.

---

#### [P5-FNC-020] Missing `model-discovery.ts` - Dynamic Model Discovery

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-020 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/ai/model-discovery.ts:1-407` |
| **NEW Path** | N/A |

**Description:** Dynamic model discovery from provider APIs is missing. Missing Functions: `discoverProviders(options)`, `discoverOpenAI(options)`, `discoverGoogleGemini(options)`, `discoverOpenRouter(options)`, `discoverCloudflareWorkers(options)`, `forceRefresh()`. Missing Features: 1-hour cache for model lists, parallel provider discovery with `Promise.allSettled`, error handling per provider.

**Impact:** Model list is static. New models from providers won't appear without code changes.

**Suggested Fix:** Create `lib/ai/model-discovery.ts` or accept static model list as architectural decision.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T14:30:00Z |

**Findings:** Confirmed. `lib/ai/model-discovery.ts` does not exist. The NEW `lib/ai/registry.ts` uses a static `curatedModels` array (9 models hardcoded) with no runtime refresh capability. This is a genuine functional regression — new models from providers won't appear without code changes.

---

#### [P5-FNC-021] Missing `model-catalog-types.ts` - Model Metadata Types

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-021 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/ai/model-catalog-types.ts:1-59` |
| **NEW Path** | N/A |

**Description:** Detailed model metadata types are missing: `ModelCapability` (including `"image-generation"` and `"video-generation"`), `ModelModality` ("text" | "vision" | "audio"), `ReasoningType` (6 provider-specific values: openai-thinking, anthropic-thinking, gemini-thinking, deepseek-thinking, internal-thinking, none), `ModelMetadata` (reasoningType, thinkingBudget, source, isCurated), `ProviderCatalog`, `ModelCatalogResponse`.

**Impact:** No reasoning model support. No image/video generation capability tracking.

**Suggested Fix:** Create `lib/ai/types.ts` with all model metadata types.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T14:30:00Z |

**Findings:** Confirmed. NEW `lib/ai/registry.ts` defines `ModelCapabilities` (5 boolean flags) and `ModelDefinition` as replacements. **Critical missing types:** (1) `ReasoningType` union — OLD has 6 provider-specific values; NEW has only `reasoning: boolean` which cannot distinguish extraction mechanisms. (2) `ModelModality` — OLD has `"text" | "vision" | "audio"`; NEW has no `audio` type. (3) `thinkingBudget` — no equivalent. (4) `image-generation` and `video-generation` capabilities — absent. (5) `ProviderCatalog` and `ModelCatalogResponse` — needed for discovery. The boolean-flag approach is simpler but lossy — it cannot represent provider-specific reasoning mechanisms.

---

#### [P5-FNC-022] Missing `provider-info.ts` - Provider ID Types

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-022 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/ai/provider-info.ts:1-16` |
| **NEW Path** | N/A |

**Description:** Provider ID type and display names are missing: `ProviderId` type ("openai" | "google" | "openrouter" | "vercel-gateway" | "cloudflare-workers" | "cloudflare-ai-gateway"), `PROVIDER_DISPLAY_NAMES` record.

**Impact:** No centralized provider ID type. Display names not standardized.

**Suggested Fix:** Add `ProviderId` type and display names to `lib/ai/providers.ts`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T14:30:00Z |

**Findings:** Confirmed. NEW `lib/ai/providers.ts` has no `ProviderId` type union. `availableProviderIds` is typed as `string[]`, not a typed union. No `PROVIDER_DISPLAY_NAMES` record exists. The lack of a typed `ProviderId` union means provider string comparisons are untyped — typos won't be caught at compile time.

---

#### [P5-FNC-023] Missing Reasoning Model Support in providers.ts

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-023 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/ai/providers.ts:17-86` |
| **NEW Path** | `lib/ai/providers.ts` |

**Description:** NEW `providers.ts` is missing reasoning model support: (1) `getReasoningTagName(reasoningType)` — Maps reasoning types to tag names, (2) `extractReasoningMiddleware` and `wrapLanguageModel` — Wraps models for chain-of-thought extraction, (3) Test environment handling with mock models.

**Impact:** Reasoning models (o1, Claude extended thinking, Gemini thinking) won't have chain-of-thought extraction.

**Suggested Fix:** Add reasoning middleware support to `lib/ai/providers.ts`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T14:30:00Z |

**Findings:** Confirmed. Reasoning model middleware support is completely absent from the NEW codebase. Zero matches for `extractReasoningMiddleware` or `wrapLanguageModel` outside archive. The NEW `getModel(id)` **never** wraps the model with reasoning middleware. Reasoning models will return raw responses without chain-of-thought extraction — the thinking/reasoning tokens won't be separated from the response content.

---

#### [P5-FNC-025] Missing Cloudflare AI Gateway Support

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-025 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/ai/model-registry.ts:98-160` |
| **NEW Path** | `lib/ai/providers.ts` |

**Description:** NEW is missing Cloudflare AI Gateway provider support: `cloudflare-ai-gateway` provider, `createAiGateway` from `ai-gateway-provider`, fallback model configuration (primary + fallback), supported Gemini models list for gateway.

**Impact:** Applications using Cloudflare AI Gateway cannot be deployed.

**Suggested Fix:** Add Cloudflare AI Gateway support to `lib/ai/providers.ts`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Defect) |
| **Verified At** | 2026-02-16T14:30:00Z |

**Findings:** Confirmed. NEW `lib/ai/providers.ts` has 5 providers: `openai`, `google`, `xai`, `openrouter`, `vercel-gateway` — NO `cloudflare-ai-gateway`. Zero matches for `createAiGateway`, `cloudflare-ai-gateway`, `CLOUDFLARE_AI_GATEWAY_NAME`, or `ai-gateway-provider` anywhere in `lib/`.

---

#### [P5-FNC-026] Missing Cloudflare Workers AI Support

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-026 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/ai/model-registry.ts:85-96` |
| **NEW Path** | `lib/ai/providers.ts` |

**Description:** NEW is missing Cloudflare Workers AI provider: `cloudflare-workers` provider, `createWorkersAI` from `workers-ai-provider`, environment variables `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_KEY`, `CLOUDFLARE_WORKER_AI`.

**Impact:** Applications using Cloudflare Workers AI cannot be deployed.

**Suggested Fix:** Add Cloudflare Workers AI support to `lib/ai/providers.ts`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Defect) |
| **Verified At** | 2026-02-16T14:30:00Z |

**Findings:** Confirmed. Zero Cloudflare-related code in NEW — grep confirms no matches for `createWorkersAI`, `workers-ai-provider`, `cloudflare-workers`, `CLOUDFLARE_ACCOUNT_ID`, or `CLOUDFLARE_API_KEY` anywhere in `lib/`.

---

#### [P5-FNC-027] Missing `refreshModelCatalog` Function

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-027 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/ai/model-registry.ts:207-282` |
| **NEW Path** | `lib/ai/registry.ts` |

**Description:** NEW registry is missing dynamic catalog refresh: `refreshModelCatalog(options)`, `forceRefreshModelCatalog()`, `getModelCatalog()`, `listProviderCatalogs()`.

**Impact:** Model list cannot be refreshed at runtime. Requires restart to see new models.

**Suggested Fix:** Add catalog refresh functions if dynamic discovery is implemented.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Defect) |
| **Verified At** | 2026-02-16T14:30:00Z |

**Findings:** Confirmed. NEW `listModels()` simply calls `filterByAvailableProviders(curatedModels)` — a static filter of a hardcoded array. Zero matches for `refreshModelCatalog`, `forceRefreshModelCatalog`, `getModelCatalog`, or `listProviderCatalogs` outside archive. The model list is permanently static.

---

#### [P5-FNC-029] Reduced Curated Model List

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-029 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/ai/curated-models.ts:1-582` |
| **NEW Path** | `lib/ai/registry.ts:68-240` |

**Description:** NEW has significantly fewer curated models. OLD: ~35+ models across 12 categories (582 lines) including title-specific model, Gemma 3 family, image/video generation models, DeepSeek free reasoning, Claude 3.7 Sonnet, and many free models via OpenRouter. NEW: 9 models (240 lines) — OpenAI (GPT-4o, GPT-4o-mini, o1), Google (Gemini 2.0/2.5 Flash, 2.5 Pro), XAI (Grok 2), Vercel Gateway (GPT-4o), OpenRouter (Claude 3.5 Sonnet).

**Impact:** Fewer model choices for users. No free model options.

**Suggested Fix:** Expand curated model list in `lib/ai/registry.ts` or implement dynamic discovery.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T14:30:00Z |

**Findings:** Confirmed. The reduction eliminates ALL free models, ALL image/video generation models, ALL open-source models, and the latest Claude/GPT variants. Additionally the NEW `ModelDefinition` type uses a flat `ModelCapabilities` interface (boolean flags) vs OLD `ModelMetadata` which uses string arrays for `capabilities` and `modalities` — the OLD format is more extensible.

---

### API Utilities (lib/api/)

#### [P5-FNC-030] Missing `requireAuth` and `requireAuthForRoute` Functions

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-030 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/api/guards.ts:50-101` |
| **NEW Path** | `lib/auth/guards.ts` |

**Description:** OLD has centralized authentication guards: `requireAuth(surface)` returns `{ session, ctx }` or throws `ChatSDKError`, `requireAuthForRoute(surface)` returns `{ session, ctx }` or `Response` on error. NEW has `requireAuth(options)` returns `{ userId }` or redirects, `requireAuthAction()` returns `userId` or throws. Key Differences: (1) OLD returns `AppSession` and `DataContext`, NEW returns just `userId`. (2) OLD has `surface` parameter for error context. (3) NEW guards are in `lib/auth/` not `lib/api/`.

**Impact:** Code expecting `requireAuth` to return `session` and `ctx` will fail. Route handlers expecting `Response` returns need adaptation.

**Suggested Fix:** Create `lib/api/guards.ts` with route-specific guards or update all call sites.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T14:30:00Z |

**Findings:** Confirmed. NEW `requireAuth` returns only `{userId}`. No `requireAuthForRoute` variant — API route handlers catch errors manually. No `surface` parameter means error messages lack context. The functionality exists but with a significantly different and less ergonomic API.

---

#### [P5-FNC-031] Missing `requireRateLimit` and `requireRateLimitForRoute` Functions

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-031 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/api/guards.ts:118-204` |
| **NEW Path** | N/A |

**Description:** OLD has rate limiting guards integrated with API utilities: `requireRateLimit(limiterType, identifier, surface)`, `requireRateLimitForRoute(...)`, `requireCustomRateLimit(config, surface)`, `requireCustomRateLimitForRoute(...)`. NEW has rate limiting in `lib/rate-limit/` but no integration with API response builders.

**Impact:** API routes need to manually integrate rate limiting with response handling. No unified pattern for rate limit errors.

**Suggested Fix:** Create `lib/api/rate-limit.ts` with route-aware rate limit guards that return `Response` objects.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T14:30:00Z |

**Findings:** Confirmed. No `requireRateLimit` guard in NEW. Server actions need ~5 lines of boilerplate per call site vs OLD's single `await requireRateLimit("standard", userId, "chat")`. The middleware-level rate limiting partially mitigates this, but action-level rate limiting lacks the ergonomic unified pattern.

---

#### [P5-FNC-033] Missing `requireResource` and `requireResourceForRoute` Functions

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-033 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/api/guards.ts:277-304` |
| **NEW Path** | N/A |

**Description:** OLD has resource existence checks: `requireResource<T>(resource, surface)` returns `T` or throws `ChatSDKError`, `requireResourceForRoute<T>(...)` returns `T` or `Response`.

**Impact:** No standardized way to handle "not found" cases in API routes with proper error responses.

**Suggested Fix:** Add `requireResource` helper to `lib/api/validation.ts` or create `lib/api/guards.ts`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T17:30:00Z |

**Findings:** Confirmed missing. No `requireResource<T>` generic guard exists in the NEW codebase. NEW code handles resource-not-found checks inline. The `ForRoute` variant is architecturally unnecessary, but the base `requireResource<T>` convenience utility providing null-narrowing and consistent error codes would reduce boilerplate.

---

#### [P5-FNC-035] Missing `parseTimestamp` and `parseTimestampForRoute` Functions

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-035 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/api/validators.ts:87-120` |
| **NEW Path** | N/A |

**Description:** OLD has timestamp parsing with error handling: `parseTimestamp(value, paramName, surface)` returns `Date` or throws, `parseTimestampForRoute(...)` returns `Date` or `Response`.

**Impact:** No standardized timestamp validation with proper error responses.

**Suggested Fix:** Add timestamp parsing helpers to `lib/api/validation.ts`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T17:30:00Z |

**Findings:** Confirmed missing. NEW `lib/api/validation.ts` provides Zod-based schema validation but no dedicated timestamp parsing helper. A developer would need `z.coerce.date()` or `z.string().datetime()` in a Zod schema — valid but more verbose for a single timestamp parameter.

---

#### [P5-FNC-036] Missing `requireQueryParam` and `requireQueryParamForRoute` Functions

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-036 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/api/validators.ts:137-170` |
| **NEW Path** | N/A |

**Description:** OLD has required query param extraction: `requireQueryParam(searchParams, paramName, surface)` returns string or throws. NEW has `validateQuery` with Zod schema but no simple "required param" helper.

**Impact:** Need to define Zod schema for simple required param extraction.

**Suggested Fix:** Add `requireQueryParam` helper to `lib/api/validation.ts`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T17:30:00Z |

**Findings:** Confirmed missing. NEW API routes handle query params ad-hoc: `app/api/history/route.ts:25-27` manually does `searchParams.get("limit") || "20"` with `parseInt`, no validation. The Zod approach is more powerful for multi-param validation but adds verbosity for the common case.

---

### Data Layer (lib/data/)

#### [P5-FNC-037] Missing `saveWithContext` Optimized Batch Operation

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-037 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/data/chat.ts:1015-1180` |
| **NEW Path** | `lib/data/repositories/message.repository.ts:572-625` |

**Description:** The function EXISTS in NEW (`MessageRepository.saveWithContext`) but with **significant functional regressions** compared to OLD: (1) Missing guest-aware logic — NEW ignores `_context` parameter entirely. (2) Missing new chat creation — `isNewChat`, `title`, `visibility`, `createdAt` fields accepted but never read. (3) Missing `onConflictDoNothing` for idempotency. (4) Missing quota tracking. (5) Missing userId filter on context update for IDOR protection. (6) Missing fire-and-forget cache warming.

**Impact:** Performance degradation from multiple separate operations instead of batched update.

**Suggested Fix:** Implement batched `saveWithContext` in `MessageRepository` or `ChatService`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Defect) |
| **Verified At** | 2026-02-16T17:30:00Z |

**Findings:** 6 specific functional defects identified. The `_context` parameter has underscore prefix (never read in the implementation). The `isNewChat`, `title`, `visibility`, `createdAt` fields in `SaveWithContextParams` (L50-66) are accepted but **never used** in the implementation (L572-625). These are genuine functional defects, not just style differences.

---

#### [P5-FNC-038] Missing `deleteAfterTimestamp` for Message Regeneration

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-038 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/data/chat.ts:1190-1254` |
| **NEW Path** | `lib/data/repositories/message.repository.ts:641-685` |

**Description:** The method EXISTS in NEW but with **critical differences**: (1) Missing transaction wrapping. (2) Missing vote cleanup — orphaned vote records remain. (3) Missing guest-specific path. (4) Missing parallel cache + DB execution. (5) Return type improved: NEW returns count of deleted messages.

**Impact:** Message regeneration feature will leave stale votes. Vote orphaning is the most critical defect.

**Suggested Fix:** Add `deleteMessagesAfterTimestamp` method to `MessageRepository` with transaction-wrapped vote cleanup.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Defect) |
| **Verified At** | 2026-02-16T17:30:00Z |

**Findings:** Vote orphaning confirmed. OLD wraps in `db.transaction()` and deletes associated votes within the same transaction. NEW only deletes messages — orphaned vote records remain in the database for deleted messages.

---

#### [P5-FNC-039] Missing `ChatWithMessages` Return Type

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-039 |
| **Severity** | Medium |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/lib/data/chat.ts:187-326` |
| **NEW Path** | `lib/data/repositories/chat.repository.ts:66-72` |

**Description:** OLD `chatData.getWithMessages()` returns `ChatWithMessages { chat: Chat; messages: MessageRow[] }`. NEW uses `Message[]` type instead. Minor type mismatch.

**Impact:** Minor type mismatch when migrating code.

**Suggested Fix:** Verify type compatibility or add type alias.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | False Positive (Re-verified) |
| **Verified At** | 2026-02-16T17:30:00Z |

**Findings:** Both `MessageRow` and `Message` resolve to the **exact same Drizzle `InferSelectModel` type** derived from the same table definition. `MessageRow` is explicitly aliased in `lib/db/schema.ts:186` for backward compatibility. The interface shape is structurally equivalent. Behavioral differences in `getWithMessages` are tracked by P5-BRK-005 and P5-FNC-037.

---

#### [P5-FNC-040] Missing Document Versioning Support

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-040 |
| **Severity** | Medium |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/lib/data/document.ts:180-469` |
| **NEW Path** | `lib/data/repositories/artifact.repository.ts` |

**Description:** OLD `documentData` has versioning support including `getAll`, `deleteAfterTimestamp`, and versions stored as array in cache. NEW claimed to have different structure without rollback support.

**Impact:** Document version history and rollback features need adaptation.

**Suggested Fix:** Add `deleteVersionsAfterTimestamp` method to `ArtifactRepository`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | False Positive (Re-verified) |
| **Verified At** | 2026-02-16T18:30:00Z |

**Findings:** The claim is **incorrect**. NEW `ArtifactRepository` provides full versioning support: `findAllVersions` (equivalent to `getAll`), `findLatestVersion`, `saveVersion`, `deleteVersionsAfterTimestamp` (rollback by deleting versions after a timestamp INCLUDING suggestion cleanup), `ArtifactService.rollbackToTimestamp()` wraps the repository method. All core versioning operations exist and are functional. Minor atomicity concern from missing explicit transaction wrapping, but the workflow is fully covered.

---

### Cache Layer (lib/cache/)

#### [P5-FNC-041] Missing ZSET-Based Message Storage

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-041 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/cache/operations.ts:93-560` |
| **NEW Path** | N/A |

**Description:** OLD uses Redis Sorted Sets (ZSET) for message storage: O(log N) message append via ZADD, O(log N + M) range deletion via ZREMRANGEBYSCORE, natural time-based ordering. NEW uses simpler key-value approach without ZSET optimization.

**Impact:** Performance degradation for chats with many messages. Range operations less efficient.

**Suggested Fix:** Consider implementing ZSET-based message storage in cache strategies.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T18:30:00Z |

**Findings:** Confirmed. NEW `lib/cache/keys.ts` defines ZSET-ready keys (JSDoc mentions "Redis ZSET with timestamp scores") but the actual cache layer contains ONLY generic key-value operations — no `zadd`, `zrange`, `zremrangebyscore`, or `zcard` calls. Message append is O(N) instead of O(log N), range deletion requires full data read-modify-write.

---

#### [P5-FNC-042] Missing `warmChatCache` and `warmDocumentCache` Functions

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-042 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/cache/operations.ts:768-810` |
| **NEW Path** | `lib/cache/tiered-cache.ts` |

**Description:** OLD has entity-specific cache warming functions. NEW has `warmCache` and `createCacheWarmer` but generic approach without domain-object-to-cache conversion or automatic warming on cache miss.

**Impact:** Cache misses require repeated DB queries until data is cached.

**Suggested Fix:** Implement entity-specific cache warming in repositories.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T18:30:00Z |

**Findings:** Confirmed. OLD provides `warmChatCache(chatId, userId, chat, messages)` and `warmDocumentCache(documentId, userId, documents)` with domain-specific conversions. NEW generic utilities don't provide: (1) domain-object-to-cache conversion, (2) entity-specific key generation, (3) ZSET-aware data population. The repositories use `cacheThrough` for lazy population but don't support the multi-key ZSET structure.

---

#### [P5-FNC-043] Missing `CachedChat`, `CachedMessage`, `CachedDocument` Types

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-043 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/cache/types.ts:33-80` |
| **NEW Path** | N/A |

**Description:** OLD has detailed cache type definitions: `CachedChatMeta`, `CachedChat`, `CachedMessage`, `CachedDocument`, `DocumentVersion`, `UserChatListItem`. NEW has no cached entity type definitions; uses generic `TieredCache<T = unknown>`.

**Impact:** No type safety for cached data structures.

**Suggested Fix:** Add cache type definitions to `lib/cache/` or `lib/data/types.ts`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T18:30:00Z |

**Findings:** Confirmed. Zero matches for `CachedChat|CachedMessage|CachedDocument` in `lib/` outside archive. All cached data is untyped (`unknown`), losing type safety for cache operations.

---

### Auth Utilities (lib/auth/)

#### [P5-FNC-044] Different Authentication Provider (Supabase vs NextAuth)

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-044 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/auth/session.ts:1-269` |
| **NEW Path** | `lib/auth/session.ts`, `lib/auth/index.ts` |

**Description:** OLD uses Supabase Auth with JWT verification. NEW uses NextAuth v5 with Credentials provider. Complete authentication architecture change: OLD: Supabase JWT → `getSupabaseSessionFromToken()` → `AppSession`, NEW: NextAuth Credentials → `auth()` → `AppSession`. Key Differences: (1) Token handling — OLD manually verifies JWTs, NEW uses NextAuth session callbacks. (2) Session structure — both normalize to `AppSession` but through different paths. (3) Guest handling — OLD: JWT-signed guest tokens, NEW: plain cookie storage.

**Impact:** Complete auth system change. Code depending on Supabase-specific patterns needs adaptation.

**Suggested Fix:** Document architectural decision. Ensure feature parity for guest handling security.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T18:30:00Z |

**Findings:** Confirmed. This is an intentional architectural change. Both systems normalize to `AppSession` with `userId`, `email`, `isGuest`. The security model change for guest sessions (JWT-signed → plain cookies) is the most significant regression — tracked by P5-FNC-046.

---

#### [P5-FNC-045] Missing `getSupabaseSessionFromToken` Function

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-045 |
| **Severity** | Medium |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/lib/auth/session.ts:100-135` |
| **NEW Path** | N/A |

**Description:** Supabase-specific token verification function. Not applicable to NextAuth architecture.

**Impact:** Not applicable — NextAuth handles token lifecycle internally.

**Suggested Fix:** No fix needed.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | False Positive (Re-verified) |
| **Verified At** | 2026-02-16T18:30:00Z |

**Findings:** NextAuth handles the entire token lifecycle internally via its `jwt` and `session` callbacks. There is no scenario where NEW code needs to manually parse/verify a Supabase JWT. The function is architecturally irrelevant in the NextAuth paradigm.

---

#### [P5-FNC-046] Missing `createGuestSession` Function

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-046 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/auth/session.ts:212-250` |
| **NEW Path** | `lib/auth/session.ts:261-280` |

**Description:** Function EXISTS in NEW but with different security model. OLD: JWT-signed guest tokens (HS256, 1-hour expiry, automatic rotation). NEW: plain cookie-based approach (string in cookie, 7-day maxAge, no rotation, no signature).

**Impact:** Guest session security downgrade. Cookies can be forged without JWT signature verification.

**Suggested Fix:** Add HMAC signature to guest session cookies or use NextAuth guest provider.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T18:30:00Z |

**Findings:** Confirmed security model difference. OLD: JWT with HS256 signature using `JWT_SECRET`, 1-hour expiry, automatic rotation on access. NEW: plain string in cookie with `httpOnly`, `secure`, `sameSite: "lax"`, 7-day maxAge, no rotation, no cryptographic signature. The guest ID in NEW can be arbitrarily set by any client that can write cookies — no server-side verification of authenticity.

---

#### [P5-FNC-047] Missing Supabase Browser Client

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-047 |
| **Severity** | Low |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/lib/auth/client.ts:1-23` |
| **NEW Path** | N/A |

**Description:** OLD has `getSupabaseBrowserClient()` for client-side Supabase operations. Not needed since auth provider changed to NextAuth.

**Impact:** None — NextAuth handles client-side auth operations.

**Suggested Fix:** No fix needed.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | False Positive |
| **Verified At** | 2026-02-16T18:30:00Z |

**Findings:** `getSupabaseBrowserClient()` was used exclusively for `auth.signOut()` in the OLD logout action. NextAuth's `signOut()` from `next-auth/react` fully covers this use case. No other Supabase client-side operations exist.

---

### Database Layer (lib/db/)

#### [P5-FNC-048] Missing `batch.ts` - Batch Operations Module

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-048 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/db/batch.ts:1-371` |
| **NEW Path** | N/A |

**Description:** Entire batch operations module is missing: `batchInsert(table, records, options)` with auto-chunking (default 100), `batchUpdate(table, records, keyColumns, options)`, `batchDelete(table, conditions, options)`, `batchUpsert(table, records, conflictColumns, options)`, `MAX_BATCH_SIZE = 1000` safety limit, OpenTelemetry span integration for each batch, progress callbacks for large operations.

**Impact:** No efficient bulk operations. Large data operations will use individual queries.

**Suggested Fix:** Create `lib/db/batch.ts` with batched operations or add to repository base class.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T21:00:00Z |

**Findings:** Confirmed. Zero imports of `batchInsert`, `batchUpdate`, `batchDelete`, or `batchUpsert` in NEW. Repositories use individual `db.insert().values()` calls without chunking. For seed.ts or bulk migrations this may not matter, but for production operations like batch message insertion or cleanup, the lack of chunked operations risks exceeding PostgreSQL parameter limits (max ~65535 parameters per query).

---

#### [P5-FNC-049] Missing `pagination.ts` - Cursor-Based Pagination

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-049 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/db/pagination.ts:1-329` |
| **NEW Path** | N/A |

**Description:** Missing cursor-based pagination framework: `PaginationDirection` ("forward" | "backward"), `PaginationOptions` with cursor/limit/direction, `CursorPaginatedResult<T>` with `items`, `nextCursor`, `previousCursor`, `hasMore`, `CursorCodec` for encoding/decoding cursors, `buildCursorQuery()` for building cursor-based WHERE clauses, `paginate()` and `paginateWithCount()` functions, `createPaginationResponse()` for API responses.

**Impact:** No standardized pagination. API endpoints use inefficient offset-based approach.

**Suggested Fix:** Create `lib/db/pagination.ts` or `lib/data/pagination.ts`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T21:00:00Z |

**Findings:** Confirmed. NEW has type definitions only — `PaginationParams`, `PaginatedResult<T>` in `lib/data/types.ts` — but **no implementation** of `paginate()`, `buildCursorQuery()`, or cursor encoding/decoding. API routes use simple `offset`/`limit` queries. Chat history shows `offset + limit + 1` trick for `hasMore` detection, which is functional but O(N) for deep pagination.

---

#### [P5-FNC-050] Missing `transactions.ts` - Transaction Wrapper

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-050 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/db/transactions.ts:1-107` |
| **NEW Path** | `lib/db/client.ts:192-196` |

**Description:** Function EXISTS but stripped down: OLD `withTransaction(operationName, fn)` provides performance tracking (start/end timing), slow transaction warnings (>500ms threshold), OTel span creation, structured error logging, `withSequentialTransactions` for multi-step operations. NEW: single-line `return db.transaction(fn)` — no operation name, no monitoring.

**Impact:** No performance monitoring for database transactions. Slow queries will go undetected.

**Suggested Fix:** Add performance tracking to `withTransaction` in `lib/db/client.ts`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T21:00:00Z |

**Findings:** Confirmed. NEW `withTransaction` in `lib/db/client.ts:192-196` is literally `return db.transaction(fn)` — single line, no operation name parameter, no timing, no slow query detection, no OTel spans. Since logging architecture changed from OTel to console (P5-FNC-064), span creation is moot, but performance tracking and slow-query warnings are universally valuable.

---

#### [P5-FNC-051] Missing `queries.ts` - Direct Query Functions

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-051 |
| **Severity** | Medium |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/lib/db/queries.ts:1-215` |
| **NEW Path** | `lib/data/repositories/` |

**Description:** OLD has direct query functions (`getUser`, `createUser`, `getDocumentById`, etc.). NEW uses Repository + Service pattern.

**Impact:** Code using direct query imports needs migration to repository pattern.

**Suggested Fix:** Verify all query functions have repository equivalents.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | False Positive |
| **Verified At** | 2026-02-16T21:00:00Z |

**Findings:** This is a deliberate refactoring to the Repository + Service pattern. All 8 OLD query functions have verified Repository equivalents: `getUser` → `AuthService.findUserByEmail()`, `createUser` → `AuthService.createUser()`, `getDocumentById` → `ArtifactRepository.findById()`, `createDocument` → `ArtifactService.createArtifact()`, etc. No functions were lost in the migration — they were relocated to a more structured architecture.

---

#### [P5-FNC-052] Missing `helpers/` Directory - DB Helpers

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-052 |
| **Severity** | Low |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/lib/db/helpers/01-core-to-parts.ts:1-250` |
| **NEW Path** | N/A |

**Description:** OLD has `helpers/` directory with DB helper scripts.

**Impact:** None — helper was dead code.

**Suggested Fix:** No fix needed.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | False Positive |
| **Verified At** | 2026-02-16T21:00:00Z |

**Findings:** Entire file is commented out — every line prefixed with `//`. Was a one-time migration script for converting old message format to parts-based format. No functional loss from its absence.

---

#### [P5-FNC-053] Schema `lastContext` Type Change

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-053 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/db/schema.ts:53` |
| **NEW Path** | `lib/db/schema.ts:114` |

**Description:** OLD: `.$type<AppUsage | null>()` with strong typing. NEW: `.$type<unknown | null>()` with weak typing. JSDoc says "typed as AppUsage | null" but actual type is `unknown`.

**Impact:** Type casting required when accessing `lastContext`. Compile-time type safety lost.

**Suggested Fix:** Import `AppUsage` type from `features/chat/types.ts` and use `.$type<AppUsage | null>()`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T21:00:00Z |

**Findings:** Confirmed. JSDoc at `lib/db/schema.ts:114` says "typed as AppUsage | null" but actual column type is `.$type<unknown | null>()`. The `AppUsage` type exists at `features/chat/types.ts:179-188` but is **NOT imported** by the schema file, likely to avoid a circular dependency between `lib/db/` and `features/chat/`.

---

#### [P5-FNC-054] Missing `migrations/` Directory Structure

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-054 |
| **Severity** | Low |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/lib/db/migrations/` |
| **NEW Path** | `drizzle/migrations/` |

**Description:** Migrations directory moved from `lib/db/migrations/` to `drizzle/migrations/`.

**Impact:** None — standard Drizzle ORM convention.

**Suggested Fix:** No fix needed.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | False Positive |
| **Verified At** | 2026-02-16T21:00:00Z |

**Findings:** Standard Drizzle ORM convention change. Correctly configured in `drizzle.config.ts` (`out: "./drizzle/migrations"`) and referenced by `lib/db/migrate.ts`. All migration files are present. No files were lost.

---

### Middleware Layer (lib/middleware/)

#### [P5-FNC-055] Missing `deduplication.ts` - Request Deduplication

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-055 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/middleware/deduplication.ts:1-386` |
| **NEW Path** | N/A |

**Description:** Entire request deduplication module is missing: `RequestDeduplicator` class (Redis-backed, configurable TTL), `deduplicateRequest(req, options)`, `generateRequestFingerprint(req)`, `withDeduplication(handler, options)` wrapper, `DeduplicationPresets` (chat/upload/document), `DeduplicationStrategy` (abort/queue/cache), `MAX_DEDUP_QUEUE_SIZE`, `DEDUP_TTL_MS`.

**Impact:** No protection against double-submit. Race conditions in concurrent requests not prevented.

**Suggested Fix:** Create `lib/middleware/deduplication.ts` or implement request deduplication.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T21:00:00Z |

**Findings:** Confirmed. Zero meaningful matches for `dedup|deduplicat` in `lib/`. No request-level deduplication, no fingerprint generation, no queue or abort strategy. Client-side double-submit protection may exist in UI buttons, but server-side protection is absent.

---

#### [P5-FNC-056] Missing `edge-rate-limit.ts` - Edge-Compatible Rate Limiting

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-056 |
| **Severity** | Medium |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/lib/middleware/edge-rate-limit.ts:1-191` |
| **NEW Path** | `lib/rate-limit/rate-limiter.ts` |

**Description:** OLD has separate edge and Node.js rate limiting modules. NEW consolidates into single module.

**Impact:** None — consolidation is an improvement.

**Suggested Fix:** No fix needed.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | False Positive |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Edge functionality preserved. `middleware.ts` actively imports and uses `createRateLimiter`/`apiLimiter` from `lib/rate-limit/` in the Edge runtime context. `failClosed` behavior preserved — rate limit failures don't block requests. `getClientIP()` utility preserved in `lib/utils/request.ts`. The consolidation is architecturally cleaner.

---

#### [P5-FNC-058] Missing `rate-limit.ts` - Full Rate Limiting Module

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-058 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/middleware/rate-limit.ts:1-475` |
| **NEW Path** | `lib/rate-limit/rate-limiter.ts` |

**Description:** OLD implements 3 rate limiting algorithms: token bucket (for burst handling), sliding window (for smooth rate limiting), fixed window (for simple counters). NEW uses only sliding window via `@upstash/ratelimit`.

**Impact:** Token bucket loss means chat API can't handle burst patterns. Fixed window loss means upload rate limiting is less precise.

**Suggested Fix:** Add token bucket algorithm to `lib/rate-limit/` or document sliding-window-only as intentional.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Confirmed. NEW `lib/rate-limit/rate-limiter.ts` creates all limiters with `new Ratelimit({ limiter: Ratelimit.slidingWindow(tokens, window) })`. No token bucket or fixed window algorithms. Token bucket loss matters for chat burst tolerance (user sends 5 messages quickly, then pauses). Fixed window loss matters for uploads where precise per-hour limits are needed.

---

#### [P5-FNC-059] No Root Middleware in OLD Archive

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-059 |
| **Severity** | Low |
| **Status** | False Positive |
| **OLD Path** | N/A |
| **NEW Path** | `middleware.ts` |

**Description:** OLD archive has no root `middleware.ts`. NEW has comprehensive middleware with rate limiting, CSP headers, and auth. This is a NEW addition, not a migration gap.

**Impact:** None — this is a feature addition.

**Suggested Fix:** No fix needed.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | False Positive |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** OLD archive has no `middleware.ts` at root level. This is unambiguously a NEW feature addition. Rate limiting, CSP headers, and auth middleware are new capabilities not present in the OLD system at the middleware layer.

---

### Rate Limit Module (lib/rate-limit/)

#### [P5-FNC-061] Missing `strict` and `generous` Rate Limiters

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-061 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/middleware/rate-limit.ts:428-454` |
| **NEW Path** | `lib/rate-limit/limits.ts` |

**Description:** OLD has `strict` (10 requests per 60 seconds) and `generous` (1000 requests per 60 seconds) rate limit presets for general use. NEW has only `apiLimiter`, `chatLimiter`, `authLimiter`, `uploadLimiter` — no general-purpose presets.

**Impact:** Non-authentication destructive endpoints must use `apiLimiter` or create ad-hoc limiters.

**Suggested Fix:** Add `strict` and `generous` presets to `lib/rate-limit/limits.ts`.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Confirmed. NEW exports only 4 purpose-specific limiters. While `strict` and `generous` presets are trivially creatable via `createRateLimiter`, their absence reduces consistency for endpoints that don't fit existing presets.

---

#### [P5-FNC-062] Upload Rate Limit Window Changed

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-062 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/middleware/rate-limit-config.ts:88-94` |
| **NEW Path** | `lib/constants.ts:79-82` |

**Description:** OLD: `upload` rate limit is 10 requests per 1 hour. NEW: `upload` rate limit is 20 requests per 1 minute. This is a **120x increase** in allowed upload throughput.

**Impact:** Upload abuse surface significantly enlarged. OLD max: 50MB/hour (10 × 5MB). NEW theoretical max: 24GB/hour (20/min × 60 × 10MB × 2x size increase).

**Suggested Fix:** Review upload rate limit — revert to per-hour window or add file size rate limiting.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Confirmed. `RATE_LIMITS.upload` in `lib/constants.ts:79-82` is `{ maxRequests: 20, windowMs: 60_000 }` (20 per minute). OLD `RATE_LIMIT_PRESETS.UPLOAD` was `{ maxTokens: 10, refillRate: 10, refillInterval: 3600 }` (10 per hour). Combined with the doubled file size (5MB → 10MB), this is a 240x increase in maximum upload throughput. APM Memory does not document this as an intentional change.

---

### Remaining Utilities

#### [P5-FNC-063] request-context.ts - Functionally Equivalent

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-063 |
| **Severity** | N/A |
| **Status** | Resolved |
| **OLD Path** | `archive/oldapp/lib/request-context.ts` |
| **NEW Path** | `lib/api/context.ts` |

**Description:** Request context utility. No issues found — NEW is a superset of OLD with all functionality preserved and enhanced.

**Impact:** None.

**Suggested Fix:** None needed.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Already Resolved) |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Confirmed resolved. All OLD functions have structurally identical implementations in NEW plus additional enhancements (request ID generation, response builders, validation helpers).

---

#### [P5-FNC-064] Different Logging Architecture

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-064 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/log.ts:1-185` |
| **NEW Path** | `lib/log.ts:1-510` |

**Description:** OLD: OpenTelemetry-based logging (span events, `span.recordException()`, `span.setStatus()`). NEW: Console-based with structured formatting. Missing: OTel span integration, span exception recording, span status setting. Both share identical public API signatures (`logInfo`, `logWarn`, `logError`, `logPerf`).

**Impact:** Distributed tracing won't have log events correlated with OTel spans.

**Suggested Fix:** Add optional OTel span integration to logging functions or document console-only as intentional.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T21:00:00Z |

**Findings:** Confirmed. Both share identical public API signatures, making migration transparent to consumers. NEW provides broader functionality (structured JSON, log levels, performance tracking) but loses distributed tracing correlation. This is an intentional architectural change — NEW chose observability breadth over OTel depth.

---

#### [P5-FNC-066] types.ts - Functionally Equivalent

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-066 |
| **Severity** | N/A |
| **Status** | Resolved |
| **OLD Path** | `archive/oldapp/lib/types.ts` |
| **NEW Path** | `features/chat/types.ts` |

**Description:** Core types file. No issues found — NEW is a superset of OLD with all types preserved and additional types added.

**Impact:** None.

**Suggested Fix:** None needed.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Resolved) |
| **Verified At** | 2026-02-16T21:00:00Z |

**Findings:** Confirmed resolved. All critical types present with enhancements. Relocation from `lib/types.ts` to `features/chat/types.ts` follows feature-based architecture pattern.

---

#### [P5-FNC-067] Missing tokenlens Integration for Usage Tracking

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-067 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/usage.ts:1-5` |
| **NEW Path** | `features/chat/types.ts:179-188` |

**Description:** OLD: `AppUsage = LanguageModelUsage & UsageData & { modelId?: string }` — combined AI SDK usage with tokenlens cost data. NEW: simplified `AppUsage` interface without tokenlens integration (manually defined `promptTokens`, `completionTokens`, `totalTokens` without cost calculation).

**Impact:** No automatic cost calculation per message. tokenlens installed but not integrated into `AppUsage` or AI pipeline.

**Suggested Fix:** Import and extend `UsageData` from tokenlens in `AppUsage` type.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T21:00:00Z |

**Findings:** Confirmed. tokenlens IS installed (`package.json`) and partially used (`getUsage` in `components/ai-elements/context.tsx`) but **NOT integrated** into `AppUsage` type or the AI streaming pipeline. OLD wired tokenlens into `onFinish` callback for automatic cost tracking; NEW has no equivalent wiring.

---

#### [P5-FNC-068] artifacts/server.ts - Functionally Equivalent

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-068 |
| **Severity** | N/A |
| **Status** | Resolved |
| **OLD Path** | `archive/oldapp/lib/artifacts/server.ts` |
| **NEW Path** | `features/artifact/handlers/` |

**Description:** Artifact server-side handling. No issues found — NEW provides full functional equivalence with improved architecture (class-based pattern, separate handler files per artifact type).

**Impact:** None.

**Suggested Fix:** None needed.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Resolved) |
| **Verified At** | 2026-02-16T21:00:00Z |

**Findings:** Confirmed resolved. Class-based handler pattern with separate files per artifact type. All operations (create, update, read) are equivalent. Architecture is improved through separation of concerns.

---

#### [P5-FNC-069] Missing Response Utilities with Request ID Headers

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-069 |
| **Severity** | Low |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/lib/api-context.ts:69-132` |
| **NEW Path** | `lib/api/response.ts` |

**Description:** Claims "No standardized way to add request ID to responses" but NEW has comprehensive request ID support.

**Impact:** None — functionality is preserved.

**Suggested Fix:** No fix needed.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | False Positive |
| **Verified At** | 2026-02-16T21:00:00Z |

**Findings:** All 11 response builders in `lib/api/response.ts` accept `{ requestId?: string }`. The `withRequestId()` function wraps existing `Response` objects with the `X-Request-ID` header. Only `X-Response-Time` header is omitted from OLD, which is a minor observability gap, not a functional regression.

---

## Improvement Only

### [P5-FNC-010] Missing `ChatSDKError` Class - Different Error Architecture

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-010 |
| **Severity** | Critical |
| **Status** | Open |
| **Location** | `lib/errors.ts` |

**Description:** OLD uses `ChatSDKError` with `ErrorType`, `ErrorSurface`, hierarchical `ErrorCode`, `userType`, `toResponse()`. NEW uses `AppError` with `code`, `statusCode`, `details`, `timestamp` + subclasses (`ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `RateLimitError`, `InternalServerError`). Intentional architectural redesign with modern patterns, but some features not replicated (ErrorUserType, visibilityBySurface per P5-FNC-013/014).

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T18:30:00Z |

**Findings:** Intentional architectural redesign confirmed by APM Memory. NEW system is a modernized replacement: class hierarchy + status codes vs OLD flat class + enum-based error codes. NEW provides better HTTP alignment (status codes built-in), TypeScript narrowing (instanceof subclasses), and extensibility. Specific functional gaps (ErrorUserType, visibilityBySurface) are tracked by P5-FNC-013 and P5-FNC-014 respectively.

---

### [P5-FNC-015] Different Default Pagination Limit

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-015 |
| **Severity** | Low |
| **Status** | Open |
| **Location** | `lib/constants.ts:106` |

**Description:** OLD: `DEFAULT_PAGINATION_LIMIT = 10`. NEW: `PAGINATION.defaultPageSize = 20`. Value change from 10 to 20 items per page.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T18:30:00Z |

**Findings:** Intentional design change confirmed by APM Memory. Deliberate UX improvement to show more items per page. No backward compatibility concern since both codebases use their own constant.

---

### [P5-FNC-024] Missing `myProvider` Export Pattern

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-024 |
| **Severity** | Medium |
| **Status** | Open |
| **Location** | `lib/ai/providers.ts`, `lib/ai/registry.ts` |

**Description:** OLD exports `myProvider` with `languageModel(id)` method. NEW exports individual providers and `getModel(id)` from registry. Different API surface.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T14:30:00Z |

**Findings:** Deliberate replacement. No NEW code imports `myProvider`. The NEW `getModel(id)` API is cleaner and more explicit — it doesn't bundle all providers into a single object but routes through the registry. Zero migration concerns since no NEW consumer uses the old pattern.

---

### [P5-FNC-028] Missing `getLanguageModel` Function

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-028 |
| **Severity** | Medium |
| **Status** | Open |
| **Location** | `lib/ai/registry.ts:285-298` |

**Description:** OLD: `getLanguageModel(id)`. NEW: `getModel(id)`. Same functionality, different name. Both resolve a model ID to a LanguageModel instance from the provider registry.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T14:30:00Z |

**Findings:** Both perform identical operations: parse provider prefix from model ID string, look up provider, call `languageModel(modelId)`. Straightforward rename as part of architectural consolidation. Zero backward compatibility concern.

---

### [P5-FNC-032] Missing `verifyOwnership` and `verifyOwnershipForRoute` Functions

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-032 |
| **Severity** | Medium |
| **Status** | Open |
| **Location** | `lib/auth/guards.ts:178-316` |

**Description:** OLD: `verifyOwnership(resourceUserId, session, surface)` and `verifyOwnershipForRoute(...)`. NEW: `requireOwnership(resourceUserId, currentUserId)` + `requireChatAccess(chatId, userId)` + `requireChatModification(chatId, userId)`. The `ForRoute` variant is architecturally unnecessary in NEW since route handlers use try/catch at the boundary.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T17:30:00Z |

**Findings:** Function exists with better API design. NEW provides domain-specific guards (`requireChatAccess`, `requireChatModification`) that combine ownership check with resource loading — more secure and ergonomic than raw `verifyOwnership`. The `ForRoute` variant is unnecessary since NEW uses try/catch at route boundary.

---

### [P5-FNC-034] Missing `requireNonGuest` and `requireNonGuestForRoute` Functions

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-034 |
| **Severity** | Low |
| **Status** | Open |
| **Location** | `lib/auth/guards.ts:347-354` |

**Description:** NEW has `requireNonGuest()` + `requireAuthenticatedUser()` but with zero parameters, generic error message, and wrong error class (`Unauthorized` vs `Forbidden`).

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T17:30:00Z |

**Findings:** Guard exists with self-contained API. Loses OLD's contextual error messaging (`surface` parameter) and uses `Unauthorized` (401) instead of `Forbidden` (403) — semantically the user IS authenticated (as guest), just not authorized for the operation. Minor classification issue.

---

### [P5-FNC-057] Missing `rate-limit-config.ts` - Centralized Rate Limit Config

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-057 |
| **Severity** | Low |
| **Status** | Open |
| **Location** | `lib/constants.ts:65-87` |

**Description:** OLD: `rate-limit-config.ts` with 10 presets. NEW: `RATE_LIMITS` in `lib/constants.ts` with 4 presets. Reduction justified by architectural consolidation.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** OLD has 10 presets: STANDARD, FAST, GENEROUS, STRICT, SEARCH, AUTH_EXCHANGE, EDGE_STANDARD, EDGE_FAST, EDGE_GENEROUS, UPLOAD. NEW has 4: api, chat, auth, upload. Missing presets: EDGE_* are unnecessary (consolidated into single rate limiter), AUTH_EXCHANGE was Supabase-specific, SEARCH/FAST have no active consumers. Missing STRICT and GENEROUS are tracked by P5-FNC-061.

---

### [P5-FNC-060] Different Rate Limiter API

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-060 |
| **Severity** | Medium |
| **Status** | Open |
| **Location** | `lib/rate-limit/rate-limiter.ts` |

**Description:** OLD: `checkRateLimit({ strategy, maxTokens, refillRate, ... })` imperative function. NEW: `createRateLimiter(config)` returns instance with `consumeToken(key)` method. Class-based approach with better encapsulation.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Architecturally superior redesign. NEW uses `@upstash/ratelimit` SDK with proper encapsulation. Zero imports of old `checkRateLimit` API in NEW. The `strategy` loss (token bucket, fixed window) tracked by P5-FNC-058 is separate from the API design improvement.

---

### [P5-FNC-065] Missing MotionProvider Export

| Field | Value |
|-------|-------|
| **Issue ID** | P5-FNC-065 |
| **Severity** | Medium |
| **Status** | Open |
| **Location** | `lib/motion.ts` |

**Description:** OLD exports `MotionProvider` wrapping `LazyMotion` + `domAnimation` for bundle optimization. NEW has `lib/motion.ts` with re-exports of `motion` and `AnimatePresence` from `motion/react` but no `LazyMotion`/`MotionProvider` wrapper.

#### Verification
| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T21:00:00Z |

**Findings:** `lib/motion.ts` exists with superior re-exports (`motion`, `AnimatePresence`). `LazyMotion` is a performance optimization that defers loading of animation features until needed — not required for functionality. The NEW direct import approach trades deferred loading for simpler code. Bundle impact depends on tree-shaking effectiveness of `motion/react`.
