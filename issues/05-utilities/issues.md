# Phase 5: Utilities Comparison

**Scope:** lib/ directory utilities
**Started:** 2026-02-15
**Completed:** 2026-02-15

## Table of Contents
- [UI Inconsistencies](#ui-inconsistencies)
- [Bugs](#bugs)
- [Broken Code](#broken-code)
- [Functional Discrepancies](#functional-discrepancies)
- [Improvement Only](#improvement-only)

---

## UI Inconsistencies

_No UI inconsistency issues found in this phase._

---

## Bugs

### [P5-BUG-001] Missing Circuit Breaker for Redis Failures

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/cache/operations.ts`
**NEW File:** N/A - Not found
**Line Ref:** L36-89

**Description:**
OLD has circuit breaker implementation:
- `CIRCUIT_BREAKER_THRESHOLD = 5` consecutive failures
- `CIRCUIT_BREAKER_RESET_MS = 30000` (30 seconds)
- `isCircuitOpen()` - Check if operations should be skipped
- `recordCacheFailure()` - Track failures and open circuit
- `recordCacheSuccess()` - Reset failure count

When circuit is open, cache operations return `null` immediately without attempting Redis calls.

NEW doesn't have circuit breaker - Redis client has retry logic but no circuit breaker at operation level.

**Impact:**
During Redis outages, every cache operation will attempt connection and timeout, causing slow failures instead of fast-fail.

**Suggested Fix:**
Add circuit breaker to `lib/cache/client.ts` or `lib/cache/strategies.ts`.

---

## Broken Code

### [P5-BRK-001] Missing `chat-completion.ts` - Core Chat Execution

**Severity:** Critical
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/chat-completion.ts`
**NEW File:** N/A - Not found
**Line Ref:** L1-290

**Description:**
The entire `chat-completion.ts` module is missing. This is the core chat execution function that:
- Executes AI chat completion with streaming
- Configures tools based on model capabilities
- Builds provider-specific options for reasoning models
- Handles timeout with `AbortSignal.timeout(55_000)`
- Uses `smoothStream` for better streaming UX
- Integrates with `tokenlens` for usage tracking
- Calls `onUsageCalculated` callback with usage data

**Key Functions Missing:**
- `executeChatCompletion(params: ChatCompletionParams)` - Main chat execution
- `getEnabledTools(model)` - Tool enablement based on model capabilities
- `buildProviderOptions(selectedModel)` - Provider-specific reasoning options

**Impact:**
Chat functionality will not work. This is the core function that processes chat messages and streams AI responses.

**Suggested Fix:**
Create `lib/ai/chat-completion.ts` with the full implementation, adapting to new provider/registry structure.

---

### [P5-BRK-002] Missing `prompts.ts` - System Prompts

**Severity:** Critical
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/prompts.ts`
**NEW File:** N/A - Not found
**Line Ref:** L1-215

**Description:**
The entire `prompts.ts` module is missing. This contains all system prompts used for AI interactions:

**Missing Prompts:**
1. `artifactsPrompt` - Instructions for using Artifacts UI
2. `regularPrompt` - Base assistant behavior guidelines
3. `codePrompt` - Python code generation instructions
4. `sheetPrompt` - CSV spreadsheet generation instructions
5. `updateDocumentPrompt(currentContent, type)` - Document update prompt builder
6. `systemPrompt({ selectedChatModel, requestHints, selectedModel, userSystemPrompt })` - Main system prompt builder
7. `getRequestPromptFromHints(requestHints)` - Location context from geo hints

**Missing Types:**
- `RequestHints` - Geographic request context (latitude, longitude, city, country)

**Impact:**
AI will have no system instructions. Chat responses will be unguided and inconsistent.

**Suggested Fix:**
Create `lib/ai/prompts.ts` with all prompt templates and `RequestHints` type.

---

### [P5-BRK-003] Missing `title-generation.ts` - Chat Title Generation

**Severity:** Critical
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/title-generation.ts`
**NEW File:** N/A - Not found
**Line Ref:** L1-67

**Description:**
The entire `title-generation.ts` module is missing. This contains:

**Missing Functions:**
1. `generateTitleFromUserMessage({ message })` - Async title generation using AI
   - Uses `generateText` with title model
   - Falls back to message text extraction on error
   - Returns max 80 character title
2. `generatePlaceholderTitle(message)` - Sync placeholder title
   - Extracts first 80 chars from message text
   - Used while async generation happens

**Impact:**
New chats will not have titles. Chat history will show "New Chat" for all conversations.

**Suggested Fix:**
Create `lib/ai/title-generation.ts` with both title generation functions.

---

### [P5-BRK-004] Missing `tools/` Directory - AI Tool Definitions

**Severity:** Critical
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/tools/`
**NEW File:** N/A - Not found
**Line Ref:** All files

**Description:**
The entire `tools/` directory is missing with 4 tool implementations:

**Missing Tools:**
1. **`create-document.ts`** (91 lines)
   - Creates new documents, code snippets, spreadsheets
   - Uses `artifactKinds` and `documentHandlersByArtifactKind`
   - Streams document creation progress via `dataStream`
   - Returns document ID, title, kind

2. **`get-weather.ts`** (78 lines)
   - Gets weather by coordinates or city name
   - Uses Open-Meteo API (no API key needed)
   - Includes `geocodeCity()` helper for city lookup

3. **`request-suggestions.ts`** (106 lines)
   - Generates document improvement suggestions
   - Uses `streamObject` for streaming suggestions
   - Saves suggestions to database for authenticated users
   - Uses `artifact-model` for generation

4. **`update-document.ts`** (73 lines)
   - Updates existing documents
   - Looks up document via `documentData.get()`
   - Delegates to document handlers by kind

**Impact:**
AI cannot use any tools. Document creation, weather lookup, and suggestions will not work.

**Suggested Fix:**
Create `lib/ai/tools/` directory with all 4 tool implementations.

---

### [P5-BRK-005] Missing Guest User Cache-Only Data Strategy

**Severity:** Critical
**Status:** Open
**OLD File:** `archive/oldapp/lib/data/chat.ts`
**NEW File:** `lib/data/repositories/chat.repository.ts`
**Line Ref:** L85-169, L187-326

**Description:**
OLD data layer has sophisticated guest user handling:
- Guest users: cache-only operations (no DB writes)
- Authenticated users: DB-first with cache warming
- `ctx.isGuest` flag determines data strategy
- Cache miss for guests returns `null` (no DB fallback)

NEW repository pattern doesn't have guest-specific logic:
- All operations go through DB
- No cache-first strategy for guests
- `RepositoryContext` has `isGuest` but it's not used

**Impact:**
Guest users will have data persisted to database, losing the ephemeral guest experience. Performance impact from always hitting DB.

**Suggested Fix:**
Implement guest-aware data strategy in repositories or create separate `GuestDataRepository` for cache-only operations.

---

## Functional Discrepancies

### Core Utilities (utils.ts)

#### [P5-FNC-001] Missing `fetcher` Function - SWR Data Fetcher

**Severity:** Critical
**Status:** Open
**OLD File:** `archive/oldapp/lib/utils.ts`
**NEW File:** N/A - Not found
**Line Ref:** L17-64

**Description:**
The OLD codebase contains a `fetcher` function used as an SWR data fetcher with comprehensive error handling:
- Parses error responses and extracts error codes
- Handles network offline detection
- Throws `ChatSDKError` with proper error codes
- Redirects to home page for `not_found:chat` errors

**Impact:**
SWR data fetching throughout the application will fail. Any component using `useSWR` with this fetcher pattern will not have proper error handling.

**Suggested Fix:**
Create `lib/utils/fetcher.ts` with the fetcher implementation or add to existing utils.

---

#### [P5-FNC-002] Missing `fetchWithErrorHandlers` Function

**Severity:** Critical
**Status:** Open
**OLD File:** `archive/oldapp/lib/utils.ts`
**NEW File:** N/A - Not found
**Line Ref:** L66-104

**Description:**
The OLD codebase contains a `fetchWithErrorHandlers` function that wraps fetch with:
- Automatic error response parsing
- Error code extraction from JSON responses
- Offline detection with `navigator.onLine`
- Throws `ChatSDKError` for consistent error handling

**Impact:**
API calls throughout the application that need error handling will not have consistent error management.

**Suggested Fix:**
Implement `fetchWithErrorHandlers` in `lib/utils/` or equivalent location.

---

#### [P5-FNC-003] Missing `generateUUID` Function

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/utils.ts`
**NEW File:** N/A - Not found
**Line Ref:** L113-137

**Description:**
The OLD codebase contains a `generateUUID` function that:
- Uses native `crypto.randomUUID()` when available (2-5x faster)
- Falls back to `crypto.getRandomValues()` for cryptographic security
- Throws error if crypto API unavailable (instead of insecure fallback)

**Impact:**
Any code that needs to generate UUIDs client-side or server-side will need this utility.

**Suggested Fix:**
Add `generateUUID` function to `lib/utils/validation.ts` or create new `lib/utils/uuid.ts`.

---

#### [P5-FNC-004] Missing `getMostRecentUserMessage` Function

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/utils.ts`
**NEW File:** N/A - Not found
**Line Ref:** L142-145

**Description:**
Utility function to get the most recent user message from an array of messages. Used in chat processing logic.

**Impact:**
Chat message processing may fail if this utility is used elsewhere in the application.

**Suggested Fix:**
Add to `lib/utils/message.ts` or appropriate location.

---

#### [P5-FNC-005] Missing `getTrailingMessageId` Function

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/utils.ts`
**NEW File:** N/A - Not found
**Line Ref:** L162-174

**Description:**
Function to get the ID of the last message in a message array. Returns null if no messages exist.

**Impact:**
Message pagination and streaming logic may be affected.

**Suggested Fix:**
Add to `lib/utils/message.ts` or appropriate location.

---

#### [P5-FNC-006] Missing `sanitizeText` Function

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/utils.ts`
**NEW File:** N/A - Not found
**Line Ref:** L176-178

**Description:**
Simple text sanitization function that removes `<has_function_call>` tokens from text.

**Note:** NEW has `sanitizeHtml` in `lib/utils/string.ts` which is different - it escapes HTML entities for XSS prevention.

**Impact:**
Text processing that expects `<has_function_call>` removal may not work correctly.

**Suggested Fix:**
Add `sanitizeText` function to `lib/utils/string.ts` alongside `sanitizeHtml`.

---

#### [P5-FNC-007] Missing `convertToUIMessages` Function

**Severity:** Critical
**Status:** Open
**OLD File:** `archive/oldapp/lib/utils.ts`
**NEW File:** N/A - Not found
**Line Ref:** L180-201

**Description:**
Critical function that converts `MessageRow[]` from database to `ChatMessage[]` format for UI:
- Maps database message format to AI SDK UIMessage format
- Converts parts with proper typing (`UIMessagePart<CustomUIDataTypes, ChatTools>`)
- Adds metadata with createdAt timestamp
- Throws `ChatSDKError` if message is missing ID

**Impact:**
Chat display functionality will fail. Messages from database cannot be converted to UI format.

**Suggested Fix:**
Implement in `lib/utils/message.ts` or `features/chat/utils/` with proper type imports.

---

#### [P5-FNC-008] Missing `getTextFromMessage` Function

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/utils.ts`
**NEW File:** N/A - Not found
**Line Ref:** L203-208

**Description:**
Extracts plain text content from a ChatMessage by filtering text parts and joining them.

**Impact:**
Message text extraction for display or processing will not work.

**Suggested Fix:**
Add to `lib/utils/message.ts` alongside other message utilities.

---

#### [P5-FNC-009] Missing `getLocalStorage` Function

**Severity:** Low
**Status:** Open
**OLD File:** `archive/oldapp/lib/utils.ts`
**NEW File:** N/A - Not found
**Line Ref:** L106-111

**Description:**
SSR-safe localStorage getter that returns empty array if window is undefined.

**Impact:**
Minor - can be implemented inline where needed.

**Suggested Fix:**
Add to `lib/utils/storage.ts` if needed, or implement inline.

---

### Error Utilities (errors.ts)

#### [P5-FNC-010] Missing `ChatSDKError` Class - Different Error Architecture

**Severity:** Critical
**Status:** Open
**OLD File:** `archive/oldapp/lib/errors.ts`
**NEW File:** `lib/errors.ts`
**Line Ref:** L47-106

**Description:**
OLD uses `ChatSDKError` class with:
- `type: ErrorType` (bad_request, unauthorized, forbidden, not_found, rate_limit, offline)
- `surface: Surface` (chat, auth, api, stream, database, history, vote, document, suggestions, activate_gateway, ui)
- `code: ErrorCode` (template literal format `${ErrorType}:${Surface}${optional_suffix}`)
- `userType?: ErrorUserType` (guest, regular, unknown)
- `toResponse()` method that uses `visibilityBySurface` for error visibility control

NEW uses `AppError` class with:
- `code: ErrorCode` (different format - e.g., `VALIDATION_ERROR`, `CHAT_NOT_FOUND`)
- `statusCode: number`
- `details: Record<string, unknown>`
- `timestamp: Date`
- Multiple subclasses: `ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `RateLimitError`, `InternalServerError`, `ServiceUnavailableError`

**Impact:**
All error handling throughout the application needs to be updated to use the new error class structure. Error codes are incompatible.

**Suggested Fix:**
Either:
1. Migrate all error handling to use new `AppError` system
2. Create adapter layer for backward compatibility
3. Keep `ChatSDKError` alongside `AppError` for gradual migration

---

#### [P5-FNC-011] Missing `toDatabaseError` Helper Function

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/errors.ts`
**NEW File:** N/A - Not found
**Line Ref:** L167-180

**Description:**
OLD has `toDatabaseError` function that:
- Maps PostgreSQL error codes to `ChatSDKError` codes
- Handles constraint violations (unique, foreign key, not null, check)
- Handles concurrency issues (deadlock, serialization failure)
- Handles connection/availability errors
- Provides detailed error messages for database issues

**Impact:**
Database error handling will not have granular error codes. Users will see generic error messages instead of specific database error explanations.

**Suggested Fix:**
Add `toDatabaseError` function to `lib/errors/` or `lib/db/` with PostgreSQL error code mapping.

---

#### [P5-FNC-012] Missing `mapPostgresCodeToError` Function

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/errors.ts`
**NEW File:** N/A - Not found
**Line Ref:** L110-143

**Description:**
Maps PostgreSQL error codes to granular ChatSDKError codes:
- `23505` -> `bad_request:database:unique_violation`
- `23503` -> `bad_request:database:foreign_key_violation`
- `23502` -> `bad_request:database:not_null_violation`
- `40P01` -> `bad_request:database:deadlock_detected`
- `08006` -> `offline:database:connection_failure`
- And more...

**Impact:**
Database errors will not have specific error codes for proper handling and user messaging.

**Suggested Fix:**
Add PostgreSQL error code mapping to `lib/errors/` or create `lib/db/errors.ts`.

---

#### [P5-FNC-013] Missing Guest-Specific Error Messages

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/errors.ts`
**NEW File:** `lib/errors/messages.ts`
**Line Ref:** L186-210

**Description:**
OLD has `ErrorUserType` type and guest-specific error messages in `getMessageByErrorCode`:
- Guest users see contextual messages explaining guest limitations
- Example: "Chat not found. Guest chat history is temporary and may have expired. Sign in to save your chats permanently."

NEW error messages are generic and don't account for user type context.

**Impact:**
Guest users will see generic error messages instead of contextual messages that guide them to sign in.

**Suggested Fix:**
Add `userType` parameter to error message functions in `lib/errors/messages.ts` and implement guest-specific message variants.

---

#### [P5-FNC-014] Missing `visibilityBySurface` Configuration

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/errors.ts`
**NEW File:** N/A - Not found
**Line Ref:** L33-45

**Description:**
OLD has `visibilityBySurface` configuration that controls error visibility:
- `"response"` - error details sent in response
- `"log"` - generic message in response, details logged only
- `"none"` - no error details exposed

This provides security control over which errors expose internal details.

**Impact:**
All errors expose the same level of detail. No granular control over error visibility for security purposes.

**Suggested Fix:**
Add visibility configuration to error handling system or implement in `toResponse()` method.

---

### Constants (constants.ts)

#### [P5-FNC-015] Different Default Pagination Limit

**Severity:** Low
**Status:** Open
**OLD File:** `archive/oldapp/lib/constants.ts`
**NEW File:** `lib/constants.ts`
**Line Ref:** L79 vs L106

**Description:**
OLD: `DEFAULT_PAGINATION_LIMIT = 10`
NEW: `PAGINATION.defaultPageSize = 20`

**Impact:**
API responses will return 20 items per page instead of 10. This could affect:
- Frontend pagination display
- API consumers expecting 10 items
- Performance if more data is transferred

**Suggested Fix:**
Verify this is intentional. If not, update `PAGINATION.defaultPageSize` to 10 for backward compatibility.

---

#### [P5-FNC-016] Missing `MAX_MESSAGES_LIMIT` Constant (Renamed)

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/constants.ts`
**NEW File:** `lib/constants.ts`
**Line Ref:** L73 vs L168

**Description:**
OLD: `MAX_MESSAGES_LIMIT = 1000` (flat constant)
NEW: `MESSAGE_CONSTANTS.maxMessagesLimit = 1000` (nested in object)

**Impact:**
Code importing `MAX_MESSAGES_LIMIT` directly will fail. Need to update imports to use `MESSAGE_CONSTANTS.maxMessagesLimit`.

**Suggested Fix:**
Add export alias: `export const MAX_MESSAGES_LIMIT = MESSAGE_CONSTANTS.maxMessagesLimit` for backward compatibility, or update all imports.

---

### File Utilities (files.ts)

#### [P5-FNC-017] Missing File Attachment Validation Utilities

**Severity:** Critical
**Status:** Open
**OLD File:** `archive/oldapp/lib/files.ts`
**NEW File:** N/A - Not found
**Line Ref:** L1-52

**Description:**
The entire `files.ts` module is missing from the NEW codebase. It contains:

1. **`ATTACHMENT_MAX_FILE_SIZE`** (5MB) - Maximum file size for attachments
2. **`ATTACHMENT_ALLOWED_MIME_TYPES`** - Set of allowed MIME types:
   - Images: jpeg, png, gif, webp
   - Documents: pdf, plain text, markdown, csv, json
   - Archives: zip
   - Office: excel, word, powerpoint (old and new formats)
3. **`ATTACHMENT_ALLOWED_TYPE_PREFIXES`** - Allowed type prefixes: `image/`, `audio/`, `video/`
4. **`getAllowedAttachmentMimeTypes()`** - Returns array of allowed MIME types
5. **`isAllowedAttachmentMimeType()`** - Validates if a MIME type is allowed

**Impact:**
- File upload functionality will have no validation
- No file size limits enforced
- No MIME type restrictions
- Security risk: any file type could be uploaded

**Suggested Fix:**
Create `lib/files/validation.ts` or `lib/utils/file.ts` with all file validation utilities.

---

### AI Utilities (lib/ai/)

#### [P5-FNC-018] Missing `constants.ts` - AI Configuration Constants

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/constants.ts`
**NEW File:** N/A - Not found
**Line Ref:** L1-65

**Description:**
AI-specific constants are missing:

**Missing Constants:**
- `DEFAULT_MODEL_ID = "openai:gpt-4o-mini"`
- `DEFAULT_TEMPERATURE = 0.7`
- `DEFAULT_MAX_OUTPUT_TOKENS = 4096`
- `DEFAULT_TOP_P = 0.95`
- `MAX_CONTEXT_TOKENS = 128_000`
- `SYSTEM_PROMPT_RESERVE_TOKENS = 2000`
- `TITLE_GENERATION_MAX_TOKENS = 80`
- `MODEL_CACHE_TTL_MS = 60 * 60 * 1000` (1 hour)
- `MODEL_DISCOVERY_TIMEOUT_MS = 5000`
- `DEFAULT_MESSAGES_PER_MINUTE = 20`
- `DEFAULT_TOKENS_PER_MINUTE = 100_000`
- `STREAM_CHUNK_SIZE = 1024`
- `STREAM_TIMEOUT_MS = 30_000`
- `SUPPORTED_PROVIDERS` array
- `MODEL_CATEGORIES` object

**Impact:**
No centralized AI configuration. Magic numbers scattered or defaults not applied.

**Suggested Fix:**
Create `lib/ai/constants.ts` with all AI-specific constants.

---

#### [P5-FNC-019] Missing `entitlements.ts` - User Model Entitlements

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/entitlements.ts`
**NEW File:** N/A - Not found
**Line Ref:** L1-31

**Description:**
User entitlements for model access are missing:

**Missing:**
- `Entitlements` type with `maxMessagesPerDay` and `availableChatModelIds`
- `entitlementsByUserType` configuration:
  - `guest`: 20 messages/day, all models
  - `regular`: 100 messages/day, all models

**Impact:**
No rate limiting based on user type. No model access control.

**Suggested Fix:**
Create `lib/ai/entitlements.ts` or integrate into `features/auth/` or `lib/rate-limit/`.

---

#### [P5-FNC-020] Missing `model-discovery.ts` - Dynamic Model Discovery

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/model-discovery.ts`
**NEW File:** N/A - Not found
**Line Ref:** L1-407

**Description:**
Dynamic model discovery from provider APIs is missing:

**Missing Functions:**
- `discoverProviders(options)` - Discovers models from all providers
- `discoverOpenAI(options)` - Fetches OpenAI model list
- `discoverGoogleGemini(options)` - Fetches Gemini model list
- `discoverOpenRouter(options)` - Fetches OpenRouter model list
- `discoverCloudflareWorkers(options)` - Fetches Cloudflare models
- `forceRefresh()` - Clears provider cache

**Missing Types:**
- `DiscoveryResult` - Results with catalogs and errors
- `DiscoveryOptions` - Options with signal and forceRefresh

**Missing Features:**
- 1-hour cache for model lists
- Parallel provider discovery with `Promise.allSettled`
- Error handling per provider

**Impact:**
Model list is static. New models from providers won't appear without code changes.

**Suggested Fix:**
Create `lib/ai/model-discovery.ts` or accept static model list as architectural decision.

---

#### [P5-FNC-021] Missing `model-catalog-types.ts` - Model Metadata Types

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/model-catalog-types.ts`
**NEW File:** N/A - Not found
**Line Ref:** L1-59

**Description:**
Detailed model metadata types are missing:

**Missing Types:**
- `ModelCapability` - Extended capabilities including:
  - `"image-generation"` and `"video-generation"`
- `ModelModality` - "text" | "vision" | "audio"
- `ReasoningType` - Chain-of-thought types:
  - `"openai-thinking"`
  - `"anthropic-thinking"`
  - `"gemini-thinking"`
  - `"deepseek-thinking"`
  - `"internal-thinking"`
  - `"none"`
- `ModelMetadata` - Extended metadata with:
  - `reasoningType?: ReasoningType`
  - `thinkingBudget?: number`
  - `source: "curated" | "discovered"`
  - `isCurated: boolean`
- `ProviderCatalog` - Provider with models array
- `ModelCatalogResponse` - Full catalog response

**Impact:**
No reasoning model support. No image/video generation capability tracking.

**Suggested Fix:**
Create `lib/ai/types.ts` with all model metadata types.

---

#### [P5-FNC-022] Missing `provider-info.ts` - Provider ID Types

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/provider-info.ts`
**NEW File:** N/A - Not found
**Line Ref:** L1-16

**Description:**
Provider ID type and display names are missing:

**Missing:**
- `ProviderId` type: "openai" | "google" | "openrouter" | "vercel-gateway" | "cloudflare-workers" | "cloudflare-ai-gateway"
- `PROVIDER_DISPLAY_NAMES` record

**Note:** NEW has similar but not identical provider handling in `providers.ts`.

**Impact:**
No centralized provider ID type. Display names not standardized.

**Suggested Fix:**
Add `ProviderId` type and display names to `lib/ai/providers.ts`.

---

#### [P5-FNC-023] Missing Reasoning Model Support in providers.ts

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/providers.ts`
**NEW File:** `lib/ai/providers.ts`
**Line Ref:** L17-37, L77-86

**Description:**
NEW `providers.ts` is missing reasoning model support:

**Missing in NEW:**
1. `getReasoningTagName(reasoningType)` - Maps reasoning types to tag names:
   - `"openai-thinking"` -> `"think"`
   - `"anthropic-thinking"` -> `"thinking"`
   - `"gemini-thinking"` -> `"think"`
   - `"deepseek-thinking"` -> `"think"`
   - `"internal-thinking"` -> `"think"`

2. `extractReasoningMiddleware` and `wrapLanguageModel` - Wraps models for chain-of-thought extraction

3. Test environment handling with mock models

**Impact:**
Reasoning models (o1, Claude extended thinking, Gemini thinking) won't have chain-of-thought extraction.

**Suggested Fix:**
Add reasoning middleware support to `lib/ai/providers.ts`.

---

#### [P5-FNC-024] Missing `myProvider` Export Pattern

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/providers.ts`
**NEW File:** `lib/ai/providers.ts`
**Line Ref:** L39-90

**Description:**
OLD exports `myProvider` object with `languageModel(id)` method that:
- Resolves "artifact-model" to default artifact model
- Wraps reasoning models with middleware
- Returns `LanguageModelV2` instances

NEW exports individual providers (`openai`, `google`, etc.) and `getModel(id)` function separately.

**Impact:**
Code expecting `myProvider.languageModel(id)` pattern will fail.

**Suggested Fix:**
Add `myProvider` export for backward compatibility, or update all usage sites.

---

#### [P5-FNC-025] Missing Cloudflare AI Gateway Support

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/model-registry.ts`
**NEW File:** `lib/ai/providers.ts`
**Line Ref:** L98-160

**Description:**
NEW is missing Cloudflare AI Gateway provider support:

**Missing:**
- `cloudflare-ai-gateway` provider
- `createAiGateway` from `ai-gateway-provider`
- Fallback model configuration (primary + fallback)
- Supported Gemini models list for gateway

**Impact:**
Applications using Cloudflare AI Gateway cannot be deployed.

**Suggested Fix:**
Add Cloudflare AI Gateway support to `lib/ai/providers.ts`.

---

#### [P5-FNC-026] Missing Cloudflare Workers AI Support

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/model-registry.ts`
**NEW File:** `lib/ai/providers.ts`
**Line Ref:** L85-96

**Description:**
NEW is missing Cloudflare Workers AI provider:

**Missing:**
- `cloudflare-workers` provider
- `createWorkersAI` from `workers-ai-provider`
- Environment variables: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_KEY`, `CLOUDFLARE_WORKER_AI`

**Impact:**
Applications using Cloudflare Workers AI cannot be deployed.

**Suggested Fix:**
Add Cloudflare Workers AI support to `lib/ai/providers.ts`.

---

#### [P5-FNC-027] Missing `refreshModelCatalog` Function

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/model-registry.ts`
**NEW File:** `lib/ai/registry.ts`
**Line Ref:** L207-241

**Description:**
NEW registry is missing dynamic catalog refresh:

**Missing Functions:**
- `refreshModelCatalog(options)` - Refreshes model list from providers
- `forceRefreshModelCatalog()` - Forces cache refresh
- `getModelCatalog()` - Gets current model catalog
- `listProviderCatalogs()` - Lists catalogs by provider

**Impact:**
Model list cannot be refreshed at runtime. Requires restart to see new models.

**Suggested Fix:**
Add catalog refresh functions if dynamic discovery is implemented.

---

#### [P5-FNC-028] Missing `getLanguageModel` Function

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/model-registry.ts`
**NEW File:** `lib/ai/registry.ts`
**Line Ref:** L349-361

**Description:**
OLD has `getLanguageModel(id)` that:
- Looks up metadata to get actual `modelId`
- Resolves via `providerRegistry.languageModel()`
- Returns `LanguageModelV2` instance

NEW has `getModel(id)` with similar functionality but different return pattern.

**Impact:**
Minor - function exists with different name. Update call sites.

**Suggested Fix:**
Add `getLanguageModel` as alias for `getModel` for backward compatibility.

---

#### [P5-FNC-029] Reduced Curated Model List

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/curated-models.ts`
**NEW File:** `lib/ai/registry.ts`
**Line Ref:** L68-240 (NEW) vs L1-582 (OLD)

**Description:**
NEW has significantly fewer curated models:

**OLD Models (582 lines, ~40+ models):**
- Title-specific model
- OpenAI: GPT-4o, GPT-4.1
- Google: Gemini 3.0 Pro, Gemma 3 family (1B, 4B, 12B, 27B), Gemini 2.5 family
- Google Image/Video: Imagen 4, Veo 3
- Anthropic: Claude 3.7 Sonnet, Claude 3.5 Sonnet
- DeepSeek: R1, V3
- Alibaba: Qwen Max
- Venice: Uncensored (free)
- OpenAI OSS: GPT-OSS 120B, 20B (free)
- GLM-4.5 Air (free)
- Kimi K2 (free)

**NEW Models (240 lines, ~9 models):**
- OpenAI: GPT-4o, GPT-4o-mini, o1
- Google: Gemini 2.0 Flash, 2.5 Flash, 2.5 Pro
- XAI: Grok 2
- Vercel Gateway: GPT-4o
- OpenRouter: Claude 3.5 Sonnet

**Missing in NEW:**
- Gemma 3 family (open source)
- Claude 3.7 Sonnet (latest)
- DeepSeek models (free reasoning)
- Free models via OpenRouter
- Image/video generation models

**Impact:**
Fewer model choices for users. No free model options.

**Suggested Fix:**
Expand curated model list in `lib/ai/registry.ts` or implement dynamic discovery.

---

### API Utilities (lib/api/)

#### [P5-FNC-030] Missing `requireAuth` and `requireAuthForRoute` Functions

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/api/guards.ts`
**NEW File:** N/A - Not found in lib/api/
**Line Ref:** L50-101

**Description:**
OLD has centralized authentication guards in `lib/api/guards.ts`:
- `requireAuth(surface)` - Returns `{ session, ctx }` or throws `ChatSDKError`
- `requireAuthForRoute(surface)` - Returns `{ session, ctx }` or `Response` on error

NEW has auth guards in `lib/auth/guards.ts` instead:
- `requireAuth(options)` - Returns `{ userId }` or redirects
- `requireAuthAction()` - Returns `userId` or throws `UnauthorizedError`

**Key Differences:**
1. OLD guards return `AppSession` and `DataContext`, NEW returns just `userId`
2. OLD guards have `surface` parameter for error context, NEW doesn't
3. OLD has `requireAuthForRoute` that returns `Response`, NEW doesn't have route-specific variant
4. NEW guards are in `lib/auth/` not `lib/api/`

**Impact:**
Code expecting `requireAuth` to return `session` and `ctx` will fail. Route handlers expecting `Response` returns need adaptation.

**Suggested Fix:**
Either:
1. Create `lib/api/guards.ts` with route-specific guards that return `Response`
2. Update all call sites to use `lib/auth/guards.ts` pattern

---

#### [P5-FNC-031] Missing `requireRateLimit` and `requireRateLimitForRoute` Functions

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/api/guards.ts`
**NEW File:** N/A - Not found
**Line Ref:** L118-204

**Description:**
OLD has rate limiting guards integrated with API utilities:
- `requireRateLimit(limiterType, identifier, surface)` - Throws `ChatSDKError` if exceeded
- `requireRateLimitForRoute(...)` - Returns `RateLimitResult` or `Response`
- `requireCustomRateLimit(config, surface)` - Custom rate limit config
- `requireCustomRateLimitForRoute(...)` - Returns `Response` variant

NEW has rate limiting in `lib/rate-limit/` but no integration with API response builders.

**Impact:**
API routes need to manually integrate rate limiting with response handling. No unified pattern for rate limit errors.

**Suggested Fix:**
Create `lib/api/rate-limit.ts` with route-aware rate limit guards that return `Response` objects.

---

#### [P5-FNC-032] Missing `verifyOwnership` and `verifyOwnershipForRoute` Functions

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/api/guards.ts`
**NEW File:** `lib/auth/guards.ts` (similar but different)
**Line Ref:** L229-260

**Description:**
OLD has ownership verification in API guards:
- `verifyOwnership(resource, session, surface)` - Throws if mismatch
- `verifyOwnershipForRoute(...)` - Returns `Response` on failure

NEW has `requireOwnership(resourceOwnerId, userId?)` in `lib/auth/guards.ts`:
- Throws `ForbiddenError` if mismatch
- No route-specific variant that returns `Response`

**Impact:**
API routes need to catch errors and convert to responses manually.

**Suggested Fix:**
Add `requireOwnershipForRoute` function to `lib/api/` that returns `Response`.

---

#### [P5-FNC-033] Missing `requireResource` and `requireResourceForRoute` Functions

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/api/guards.ts`
**NEW File:** N/A - Not found
**Line Ref:** L277-304

**Description:**
OLD has resource existence checks:
- `requireResource<T>(resource, surface)` - Returns `T` or throws `ChatSDKError`
- `requireResourceForRoute<T>(...)` - Returns `T` or `Response`

**Impact:**
No standardized way to handle "not found" cases in API routes with proper error responses.

**Suggested Fix:**
Add `requireResource` helper to `lib/api/validation.ts` or create `lib/api/guards.ts`.

---

#### [P5-FNC-034] Missing `requireNonGuest` and `requireNonGuestForRoute` Functions

**Severity:** Low
**Status:** Open
**OLD File:** `archive/oldapp/lib/api/guards.ts`
**NEW File:** `lib/auth/guards.ts` (similar)
**Line Ref:** L320-352

**Description:**
OLD has guest user restrictions:
- `requireNonGuest(session, surface, action)` - Throws if guest
- `requireNonGuestForRoute(...)` - Returns `Response` if guest

NEW has `requireAuthenticatedUser()` which serves similar purpose but:
- No `action` parameter for contextual error messages
- No route-specific variant

**Impact:**
Minor - similar functionality exists with different API.

**Suggested Fix:**
Add `action` parameter to `requireAuthenticatedUser` for better error messages.

---

#### [P5-FNC-035] Missing `parseTimestamp` and `parseTimestampForRoute` Functions

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/api/validators.ts`
**NEW File:** N/A - Not found
**Line Ref:** L87-120

**Description:**
OLD has timestamp parsing with error handling:
- `parseTimestamp(value, paramName, surface)` - Returns `Date` or throws
- `parseTimestampForRoute(...)` - Returns `Date` or `Response`

**Impact:**
No standardized timestamp validation with proper error responses.

**Suggested Fix:**
Add timestamp parsing helpers to `lib/api/validation.ts`.

---

#### [P5-FNC-036] Missing `requireQueryParam` and `requireQueryParamForRoute` Functions

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/api/validators.ts`
**NEW File:** N/A - Not found
**Line Ref:** L137-170

**Description:**
OLD has required query param extraction:
- `requireQueryParam(searchParams, paramName, surface)` - Returns string or throws
- `requireQueryParamForRoute(...)` - Returns string or `Response`

NEW has `validateQuery` with Zod schema but no simple "required param" helper.

**Impact:**
Need to define Zod schema for simple required param extraction.

**Suggested Fix:**
Add `requireQueryParam` helper to `lib/api/validation.ts`.

---

### Data Layer (lib/data/)

#### [P5-FNC-037] Missing `saveWithContext` Optimized Batch Operation

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/data/chat.ts`
**NEW File:** N/A - Not found
**Line Ref:** L1015-1180

**Description:**
OLD has `messageData.saveWithContext()` that:
- Batches messages + context update in single operation
- Reduces cache operations from ~6 to ~2
- Handles both new chat creation and existing chat updates
- Updates `lastContext` for usage tracking
- Increments quota counter for user messages

NEW has `SaveWithContextParam` in `message.repository.ts` but:
- Simpler implementation without cache optimization
- No quota tracking integration

**Impact:**
Performance degradation from multiple separate operations instead of batched update.

**Suggested Fix:**
Implement batched `saveWithContext` in `MessageRepository` or `ChatService`.

---

#### [P5-FNC-038] Missing `deleteAfterTimestamp` for Message Regeneration

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/data/chat.ts`
**NEW File:** N/A - Not found
**Line Ref:** L1190-1254

**Description:**
OLD has `messageData.deleteAfterTimestamp()`:
- Deletes messages at or after a timestamp
- Used for message regeneration and chat editing
- Uses transaction to prevent race conditions
- Deletes associated votes within same transaction
- Updates cache in parallel with DB

**Impact:**
Message regeneration feature cannot work without this functionality.

**Suggested Fix:**
Add `deleteMessagesAfterTimestamp` method to `MessageRepository`.

---

#### [P5-FNC-039] Missing `ChatWithMessages` Return Type

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/data/chat.ts`
**NEW File:** `lib/data/repositories/chat.repository.ts`
**Line Ref:** L187-326 vs L478-500

**Description:**
OLD `chatData.getWithMessages()` returns:
```typescript
ChatWithMessages {
  chat: Chat;
  messages: MessageRow[];
}
```

NEW `chatRepository.findWithMessages()` returns similar but:
- Uses `Message[]` type instead of `MessageRow[]`
- Different type definitions

**Impact:**
Minor type mismatch when migrating code that expects `MessageRow[]`.

**Suggested Fix:**
Verify type compatibility or add type alias for backward compatibility.

---

#### [P5-FNC-040] Missing Document Versioning Support

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/data/document.ts`
**NEW File:** `lib/data/repositories/artifact.repository.ts`
**Line Ref:** L180-260, L378-469

**Description:**
OLD `documentData` has versioning support:
- `getAll(documentId, ctx)` - Get all versions of a document
- `deleteAfterTimestamp()` - Delete versions after timestamp (rollback)
- Versions stored as array in cache

NEW `ArtifactRepository` has:
- `findVersions()` - Similar to `getAll`
- `saveVersion()` - Save new version
- Different structure without rollback support

**Impact:**
Document version history and rollback features need adaptation.

**Suggested Fix:**
Add `deleteVersionsAfterTimestamp` method to `ArtifactRepository` for rollback support.

---

### Cache Layer (lib/cache/)

#### [P5-FNC-041] Missing ZSET-Based Message Storage

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/cache/types.ts`, `archive/oldapp/lib/cache/operations.ts`
**NEW File:** N/A - Different approach
**Line Ref:** types.ts L17-30, operations.ts L93-106

**Description:**
OLD uses Redis Sorted Sets (ZSET) for message storage:
- `chat:{chatId}:{userId}:msgs` - ZSET with timestamp scores
- O(log N) message append via ZADD
- O(log N + M) range deletion via ZREMRANGEBYSCORE
- Natural time-based ordering

NEW uses simpler key-value approach without ZSET optimization.

**Impact:**
Performance degradation for chats with many messages. Range operations (delete after timestamp) less efficient.

**Suggested Fix:**
Consider implementing ZSET-based message storage in cache strategies.

---

#### [P5-FNC-042] Missing `warmChatCache` and `warmDocumentCache` Functions

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/cache/operations.ts`
**NEW File:** `lib/cache/tiered-cache.ts` (different approach)
**Line Ref:** L600-700

**Description:**
OLD has cache warming functions:
- `warmChatCache(chatId, userId, chat, messages)` - Populates cache after DB fetch
- `warmDocumentCache(documentId, userId, documents)` - Populates document cache

NEW has `warmCache` and `createCacheWarmer` but:
- Generic approach, not entity-specific
- No automatic warming on cache miss

**Impact:**
Cache misses require repeated DB queries until data is cached.

**Suggested Fix:**
Implement entity-specific cache warming in repositories.

---

#### [P5-FNC-043] Missing `CachedChat`, `CachedMessage`, `CachedDocument` Types

**Severity:** Low
**Status:** Open
**OLD File:** `archive/oldapp/lib/cache/types.ts`
**NEW File:** N/A - Not found
**Line Ref:** L33-80

**Description:**
OLD has detailed cache type definitions:
- `CachedChatMeta` - Chat metadata without messages
- `CachedChat` - Full chat with messages
- `CachedMessage` - Message with parts, attachments
- `CachedDocument` - Document with versions array
- `DocumentVersion` - Single document version
- `CacheKeys` - Key generator functions

NEW has `CacheKeys` in `lib/cache/keys.ts` but:
- No cached entity type definitions
- Different key structure

**Impact:**
No type safety for cached data structures.

**Suggested Fix:**
Add cache type definitions to `lib/cache/` or `lib/data/types.ts`.

---

### Auth Utilities (lib/auth/)

#### [P5-FNC-044] Different Authentication Provider (Supabase vs NextAuth)

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/auth/session.ts`
**NEW File:** `lib/auth/session.ts`, `lib/auth/index.ts`
**Line Ref:** L1-269 vs L1-200

**Description:**
OLD uses Supabase Auth:
- `getSupabaseSessionFromCookies()` - JWT verification with Supabase secret
- `getSupabaseSessionFromToken(accessToken)` - Parse session from token
- `getSupabaseAccessTokenCookieName()` - Cookie name config
- JWT verification with audience and issuer checks

NEW uses NextAuth:
- `auth()` from NextAuth for session
- Different session structure
- `AppSession` type abstraction layer

**Impact:**
Complete authentication system change. All session handling code needs adaptation.

**Suggested Fix:**
Ensure `AppSession` type provides sufficient abstraction for any auth provider.

---

#### [P5-FNC-045] Missing `getSupabaseSessionFromToken` Function

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/auth/session.ts`
**NEW File:** N/A - Not found
**Line Ref:** L100-135

**Description:**
OLD can parse session from a raw token:
- Used when token is immediately available after setting cookie
- Avoids cookie read timing issues in Next.js
- Validates JWT with audience and issuer

**Impact:**
Cannot parse session from token in scenarios where cookie read isn't reliable.

**Suggested Fix:**
Add `getSessionFromToken` function if needed for cookie timing scenarios.

---

#### [P5-FNC-046] Missing `createGuestSession` Function

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/auth/session.ts`
**NEW File:** `lib/auth/session.ts` (different implementation)
**Line Ref:** L212-250

**Description:**
OLD `createGuestSession()`:
- Creates JWT-signed guest token
- Uses `GUEST_JWT_SECRET` environment variable
- Sets cookie with `getSecureCookieOptions()`
- Returns `AppSession` with `guest` type

NEW has `createGuestSession()` but implementation differs:
- Uses simpler cookie-based approach
- No JWT signing for guest tokens

**Impact:**
Guest session security model changed. OLD had cryptographically signed guest tokens.

**Suggested Fix:**
Verify guest session security requirements and adjust implementation if needed.

---

#### [P5-FNC-047] Missing Supabase Browser Client

**Severity:** Low
**Status:** Open
**OLD File:** `archive/oldapp/lib/auth/client.ts`
**NEW File:** N/A - Not found
**Line Ref:** L1-23

**Description:**
OLD has `getSupabaseBrowserClient()`:
- Creates Supabase client for browser-side auth
- Singleton pattern to avoid re-initialization
- Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

NEW uses NextAuth which handles client-side auth differently.

**Impact:**
No impact if NextAuth client-side auth is properly configured.

**Suggested Fix:**
Ensure NextAuth client-side session handling is properly implemented.

---

### Database Layer (lib/db/)

#### [P5-FNC-048] Missing `batch.ts` - Batch Operations Module

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/db/batch.ts`
**NEW File:** N/A - Not found
**Line Ref:** L1-371

**Description:**
The entire `batch.ts` module is missing. This provides efficient batch operations:

**Missing Functions:**
1. `batchInsert(table, records, options)` - Batch insert with automatic chunking
   - Configurable chunk size (default 100, max 1000)
   - Optional continueOnError flag
   - OpenTelemetry span attributes

2. `batchUpdate(table, updates, options)` - Batch update by ID
   - Deduplication by ID (keeps last update)
   - Transaction-wrapped updates
   - Performance tracking

3. `batchDelete(table, ids, options)` - Batch delete by IDs
   - Safety limit (default 10,000)
   - ID deduplication
   - Chunked execution

4. `batchUpsert(table, records, options)` - Batch upsert
   - Insert with conflict ignore
   - Returns inserted records

**Impact:**
No efficient bulk operations. Each operation will require individual queries, causing:
- Increased network overhead
- Poor connection pool utilization
- No atomicity for batch updates

**Suggested Fix:**
Create `lib/db/batch.ts` with all batch operation functions.

---

#### [P5-FNC-049] Missing `pagination.ts` - Cursor-Based Pagination

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/db/pagination.ts`
**NEW File:** N/A - Not found
**Line Ref:** L1-329

**Description:**
The entire `pagination.ts` module is missing. This provides efficient cursor-based pagination:

**Missing Types:**
- `PaginationDirection` - "forward" | "backward"
- `PaginationOptions<T>` - limit, cursor, direction, sortField, sortOrder
- `CursorPaginatedResult<T>` - data, nextCursor, prevCursor, hasMore, totalCount

**Missing Functions:**
1. `buildCursorQuery(table, options)` - Build cursor condition for query
2. `paginate(query, table, options)` - Execute paginated query
3. `paginateWithCount(query, table, countQuery, options)` - Include total count
4. `createPaginationResponse(result, baseUrl)` - API response helper

**Missing Features:**
- O(1) query complexity vs O(N) for offset
- Consistent results (no missed/duplicate records)
- Encrypted cursors (base64url encoded)
- Bidirectional pagination
- OpenTelemetry integration

**Impact:**
No standardized pagination. API endpoints will need to implement pagination individually, likely using inefficient offset-based approach.

**Suggested Fix:**
Create `lib/db/pagination.ts` with cursor-based pagination utilities.

---

#### [P5-FNC-050] Missing `transactions.ts` - Transaction Wrapper

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/db/transactions.ts`
**NEW File:** `lib/db/client.ts` (simpler version)
**Line Ref:** L1-107

**Description:**
OLD has a sophisticated transaction wrapper:

**OLD Features:**
1. `withTransaction(fn, operation)` - Wrapped transaction with:
   - Automatic rollback on errors
   - OpenTelemetry span attributes
   - Performance tracking
   - Slow transaction warning (>500ms)
   - Proper error conversion via `toDatabaseError`

2. `withSequentialTransactions(operations)` - Sequential execution
   - Runs transactions one at a time
   - Avoids potential conflicts
   - Returns array of results

**NEW Features:**
- `withTransaction(fn)` - Simple wrapper without:
  - Operation name for logging
  - Performance tracking
  - Slow transaction warnings
  - OpenTelemetry integration

**Impact:**
No performance monitoring for transactions. No warning for slow transactions.

**Suggested Fix:**
Enhance `withTransaction` in `lib/db/client.ts` with operation name, performance tracking, and slow transaction warnings.

---

#### [P5-FNC-051] Missing `queries.ts` - Direct Query Functions

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/db/queries.ts`
**NEW File:** N/A - Moved to repositories
**Line Ref:** L1-215

**Description:**
OLD has direct query functions in `queries.ts`:

**OLD Functions:**
1. `getUser(email)` - Get user by email
2. `getUserById(id)` - Get user by ID
3. `getMessageById({ id })` - Get message by ID
4. `voteMessage({ chatId, messageId, type, userId })` - Upsert vote
5. `getVotesByChatId({ id })` - Get votes for chat
6. `getVotesByChatIdAndUserId({ chatId, userId })` - Get user's votes
7. `saveSuggestions({ suggestions })` - Batch insert suggestions
8. `getSuggestionsByDocumentId({ documentId, userId })` - Get suggestions with IDOR protection

**NEW Approach:**
- Queries moved to repositories in `lib/data/repositories/`
- No direct query exports from `lib/db/`

**Impact:**
Code expecting direct query functions from `lib/db/queries` will fail. Need to import from repositories instead.

**Suggested Fix:**
Add backward-compatible re-exports from `lib/db/index.ts` pointing to repository functions, or update all import sites.

---

#### [P5-FNC-052] Missing `helpers/` Directory - DB Helpers

**Severity:** Low
**Status:** Open
**OLD File:** `archive/oldapp/lib/db/helpers/01-core-to-parts.ts`
**NEW File:** N/A - Not found
**Line Ref:** L1-250

**Description:**
OLD has a helpers directory with message part conversion:

**Missing:**
- `coreToParts(coreMessage)` - Convert core message to parts array
- Handles various message content types
- Used for message serialization

**Impact:**
Minor - if message format handling is implemented elsewhere.

**Suggested Fix:**
Verify message part conversion is handled in repositories or create `lib/db/helpers/` if needed.

---

#### [P5-FNC-053] Schema lastContext Type Change

**Severity:** Low
**Status:** Open
**OLD File:** `archive/oldapp/lib/db/schema.ts`
**NEW File:** `lib/db/schema.ts`
**Line Ref:** L53 vs L114

**Description:**
OLD: `lastContext: jsonb("last_context").$type<AppUsage | null>()`
NEW: `lastContext: jsonb("last_context").$type<unknown | null>()`

The type changed from `AppUsage` to `unknown`. This is likely intentional as `AppUsage` type was in `lib/usage.ts` which may not exist in NEW.

**Impact:**
Loss of type safety for `lastContext` field. Type casting required when accessing.

**Suggested Fix:**
Define `AppUsage` type in NEW or document the intentional type relaxation.

---

#### [P5-FNC-054] Missing `migrations/` Directory Structure

**Severity:** Low
**Status:** Open
**OLD File:** `archive/oldapp/lib/db/migrations/`
**NEW File:** `drizzle/` (different location)
**Line Ref:** All files

**Description:**
OLD has migrations in `lib/db/migrations/`:
- `0000_glorious_sandman.sql` through `0003_supreme_joshua_kane.sql`
- `meta/` directory with snapshots and journal
- `old_db_migration/` subdirectory with legacy migrations

NEW has migrations in `drizzle/` directory (standard Drizzle location).

**Impact:**
Migration path changed. `migrate.ts` updated to use `./drizzle/migrations`.

**Suggested Fix:**
No fix needed - this is architectural refactoring that preserves functionality.

---

### Middleware Layer (lib/middleware/)

#### [P5-FNC-055] Missing `deduplication.ts` - Request Deduplication

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/middleware/deduplication.ts`
**NEW File:** N/A - Not found
**Line Ref:** L1-386

**Description:**
The entire `deduplication.ts` module is missing. This prevents duplicate request processing:

**Missing Types:**
- `DeduplicationConfig` - key, windowSeconds, cacheResponse, metadata
- `DeduplicationResult<T>` - isFirst, isDuplicate, cachedResponse, expiresIn

**Missing Class:**
- `RequestDeduplicator` with:
  - `checkDuplication(config)` - Check if request is duplicate
  - `storeResponse(key, response, windowSeconds)` - Cache response
  - `registerInFlight(key, promise)` - Track in-flight requests
  - `clear(key)` - Clear deduplication state

**Missing Functions:**
1. `deduplicateRequest(config, handler)` - Auto-dedup with caching
2. `generateRequestFingerprint(method, url, body, userId)` - Request key
3. `withDeduplication(config, handler)` - Middleware wrapper

**Missing Presets:**
- `DeduplicationPresets.short` (2s)
- `DeduplicationPresets.standard` (5s)
- `DeduplicationPresets.long` (30s)
- `DeduplicationPresets.idempotent` (60s)

**Impact:**
- No protection against double-submit on slow networks
- No race condition prevention for concurrent requests
- Wasted resources processing duplicate requests

**Suggested Fix:**
Create `lib/middleware/deduplication.ts` with request deduplication functionality.

---

#### [P5-FNC-056] Missing `edge-rate-limit.ts` - Edge-Compatible Rate Limiting

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/middleware/edge-rate-limit.ts`
**NEW File:** `lib/rate-limit/rate-limiter.ts` (different approach)
**Line Ref:** L1-191

**Description:**
OLD has edge-compatible rate limiting for Next.js Edge Runtime:

**OLD Features:**
1. `checkEdgeRateLimit(options)` - Edge runtime compatible
   - Uses Upstash Redis HTTP API directly
   - No server-only imports
   - `failClosed` option for auth endpoints

2. `EdgeRateLimiters` presets:
   - `api(identifier)` - 100/60s, fail open
   - `strict(identifier)` - 10/60s, fail open
   - `auth(identifier)` - 20/60s, fail closed

3. `getClientIP(request)` - Extract client IP from headers

**NEW Approach:**
- Rate limiting in `lib/rate-limit/` uses `@upstash/ratelimit`
- Same underlying library but different API
- `RateLimiter` class with `consumeToken()` method

**Impact:**
Different API for rate limiting. Code using `EdgeRateLimiters` pattern needs update.

**Suggested Fix:**
Verify `lib/rate-limit/` works in Edge runtime. Add edge-compatible presets if needed.

---

#### [P5-FNC-057] Missing `rate-limit-config.ts` - Centralized Rate Limit Config

**Severity:** Low
**Status:** Open
**OLD File:** `archive/oldapp/lib/middleware/rate-limit-config.ts`
**NEW File:** `lib/constants.ts` (different location)
**Line Ref:** L1-127

**Description:**
OLD has centralized rate limit configuration:

**OLD Constants:**
```typescript
RATE_LIMITS = {
  EDGE_API: { limit: 100, window: 60, prefix: "edge:api" },
  EDGE_STRICT: { limit: 10, window: 60, prefix: "edge:strict" },
  EDGE_AUTH: { limit: 20, window: 60, prefix: "edge:auth" },
  STRICT: { limit: 10, window: 60, namespace: "strict" },
  STANDARD: { limit: 100, window: 60, namespace: "standard" },
  GENEROUS: { limit: 1000, window: 60, namespace: "generous" },
  CHAT: { limit: 50, window: 60, namespace: "chat" },
  UPLOAD: { limit: 10, window: 3600, namespace: "upload" },
  AUTH_EXCHANGE: { limit: 10, window: 60, namespace: "auth_exchange" },
  AUTH_GUEST: { limit: 20, window: 60, namespace: "guest_auth" },
}
```

**NEW Constants:**
In `lib/constants.ts`:
```typescript
RATE_LIMITS = {
  chat: { requests: 60, window: 60 },
  auth: { requests: 10, window: 60 },
  upload: { requests: 20, window: 60 },
  api: { requests: 100, window: 60 },
}
```

**Impact:**
Different structure and some limits changed:
- Chat: 50 -> 60 requests
- Upload: 10/3600 -> 20/60 (hourly -> per minute!)
- Missing: EDGE_API, EDGE_STRICT, EDGE_AUTH, STRICT, STANDARD, GENEROUS, AUTH_EXCHANGE, AUTH_GUEST

**Suggested Fix:**
Add missing rate limit presets to `lib/constants.ts` and verify upload limit change is intentional.

---

#### [P5-FNC-058] Missing `rate-limit.ts` - Full Rate Limiting Module

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/middleware/rate-limit.ts`
**NEW File:** `lib/middleware/rate-limit.ts` (simpler), `lib/rate-limit/` (separate module)
**Line Ref:** L1-475

**Description:**
OLD has comprehensive rate limiting with multiple algorithms:

**OLD Algorithms:**
1. **Token Bucket** (`TokenBucketLimiter`)
   - Allows bursts while maintaining average rate
   - Refills tokens based on time elapsed
   - Best for chat/AI endpoints

2. **Sliding Window** (`SlidingWindowLimiter`)
   - Precise rate limiting using sorted sets
   - Lua script for atomicity
   - Best for general API

3. **Fixed Window** (`FixedWindowLimiter`)
   - Simple counter-based
   - Efficient but can allow bursts at window edges

**OLD Functions:**
- `checkRateLimit(config)` - Check with strategy selection
- `createRateLimiter(config)` - Middleware factory

**OLD Presets:**
- `RateLimiters.strict(identifier)` - 10/60s
- `RateLimiters.standard(identifier)` - 100/60s
- `RateLimiters.generous(identifier)` - 1000/60s
- `RateLimiters.chat(userId)` - 50/60s (token bucket)
- `RateLimiters.upload(userId)` - 10/3600s (fixed window)

**NEW Approach:**
- Uses `@upstash/ratelimit` library
- Only sliding window algorithm
- Simpler `RateLimiter` class

**Impact:**
- No token bucket for burst handling in chat
- No fixed window for uploads
- Less flexibility in rate limiting strategies

**Suggested Fix:**
Add token bucket algorithm support to `lib/rate-limit/` for chat endpoints, or document architectural decision to use single algorithm.

---

### Root Middleware (middleware.ts)

#### [P5-FNC-059] No Root Middleware in OLD Archive

**Severity:** Low
**Status:** Open
**OLD File:** N/A - Not found in archive/oldapp/
**NEW File:** `middleware.ts`
**Line Ref:** L1-286

**Description:**
OLD archive does not have a root `middleware.ts` file. The NEW codebase has a comprehensive root middleware:

**NEW Features:**
1. Route classification helpers:
   - `isAuthCallbackRoute(pathname)` - Skip NextAuth routes
   - `isHealthRoute(pathname)` - Skip health checks
   - `isProtectedPageRoute(pathname)` - Chat pages require auth
   - `isAuthPageRoute(pathname)` - Redirect logged-in users

2. Rate limiting:
   - `applyRateLimit(pathname, identifier)` - Route-specific limiters
   - `getLimiterForRoute(pathname)` - Select limiter by route
   - `createRateLimitResponse(result)` - 429 response builder

3. User context:
   - `setUserContextHeaders(response, userId, isAuthenticated)` - Headers for downstream
   - `getGuestId(request)` - Guest ID from cookies or generate

**Impact:**
This is a NEW feature, not a migration issue. The root middleware provides centralized request handling that wasn't present in OLD.

**Suggested Fix:**
No fix needed - this is an improvement in NEW.

---

### Rate Limit Module (lib/rate-limit/)

#### [P5-FNC-060] Different Rate Limiter API

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/middleware/rate-limit.ts`
**NEW File:** `lib/rate-limit/rate-limiter.ts`
**Line Ref:** L1-475 vs L1-337

**Description:**
The rate limiter API has changed significantly:

**OLD API:**
```typescript
await checkRateLimit({
  strategy: "sliding_window", // or "token_bucket", "fixed_window"
  limit: 100,
  window: 60,
  identifier: "user:123",
  namespace: "api",
  errorMessage: "Custom message"
});
// Returns: { allowed, remaining, limit, resetIn, retryAfter }
```

**NEW API:**
```typescript
const limiter = createRateLimiter({
  limit: 100,
  window: 60,
  prefix: "ratelimit:api"
});
const result = await limiter.consumeToken("user:123");
// Returns: { success, limit, remaining, reset }
```

**Key Differences:**
1. OLD returns `allowed`, NEW returns `success`
2. OLD returns `resetIn` (seconds), NEW returns `reset` (timestamp ms)
3. OLD has `retryAfter`, NEW calculates via `getRetryAfter(reset)`
4. OLD has strategy selection, NEW only sliding window
5. NEW has `checkLimit()` (no consume), `resetLimit()`, `getRemaining()`
6. NEW has `failClosed` option in constructor

**Impact:**
Code using OLD API needs to be updated to use NEW class-based approach.

**Suggested Fix:**
Add backward-compatible `checkRateLimit` function that wraps `RateLimiter`, or update all call sites.

---

#### [P5-FNC-061] Missing `strict` and `generous` Rate Limiters

**Severity:** Low
**Status:** Open
**OLD File:** `archive/oldapp/lib/middleware/rate-limit.ts`
**NEW File:** `lib/rate-limit/limits.ts`
**Line Ref:** L428-454 vs L23-67

**Description:**
OLD has `strict` and `generous` limiter presets:
- `RateLimiters.strict` - 10/60s for destructive operations
- `RateLimiters.generous` - 1000/60s for high-volume endpoints

NEW only has:
- `chatLimiter` - 60/60s
- `authLimiter` - 10/60s
- `uploadLimiter` - 20/60s
- `apiLimiter` - 100/60s

**Impact:**
No pre-configured limiters for strict (10/min) or generous (1000/min) use cases.

**Suggested Fix:**
Add `strictLimiter` and `generousLimiter` to `lib/rate-limit/limits.ts`.

---

#### [P5-FNC-062] Upload Rate Limit Window Changed

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/middleware/rate-limit-config.ts`
**NEW File:** `lib/constants.ts`
**Line Ref:** L88-94 vs L35-38

**Description:**
Upload rate limit window changed dramatically:

**OLD:**
```typescript
UPLOAD: {
  limit: 10,
  window: 3600, // 1 hour
  namespace: "upload",
}
```

**NEW:**
```typescript
upload: {
  requests: 20,
  window: 60, // 1 minute
}
```

**Impact:**
- OLD: 10 uploads per hour (very strict)
- NEW: 20 uploads per minute (much more lenient)

This is a 12x increase in allowed uploads (from 10/hour to 1200/hour potential).

**Suggested Fix:**
Verify this change is intentional. If upload abuse prevention is important, consider reverting to hourly window.

---

### Part 5: Remaining Utilities

#### [P5-FNC-063] request-context.ts: No issues found - functionally equivalent

**Severity:** N/A
**Status:** Resolved
**OLD File:** `archive/oldapp/lib/request-context.ts`
**NEW File:** `lib/api/context.ts`
**Line Ref:** Full file

**Description:**
NEW `lib/api/context.ts` is a superset of OLD `request-context.ts` with all functionality preserved and enhanced:

**Preserved Functions:**
- `generateRequestId()` - UUID generation
- `getRequestContext()` - AsyncLocalStorage access
- `getRequestId()` - Get current request ID
- `runWithRequestContext()` - Sync context wrapper
- `runWithRequestContextAsync()` - Async context wrapper
- `updateRequestContext()` - Update context fields
- `getRequestDuration()` - Elapsed time calculation
- `formatRequestContext()` - Context formatting for logs

**NEW Enhancements:**
- Additional context fields: `isGuest`, `clientIp`, `userAgent`
- `getApiContext()` - Context with helper methods
- `getClientIp()` - Extract client IP from headers
- `getSearchParams()` - URL search params helper
- `validateOrigin()` - CSRF origin validation
- `setRequestUser()` - Convenience for setting user
- `getOrCreateRequestId()` - With validation
- `withRequestContext()` - Route handler wrapper

**Impact:**
None - full functional equivalence with improvements.

---

#### [P5-FNC-064] Different Logging Architecture - Console vs OpenTelemetry

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/log.ts`
**NEW File:** `lib/log.ts`
**Line Ref:** L1-185 vs L1-510

**Description:**
OLD and NEW have fundamentally different logging approaches:

**OLD Approach (OpenTelemetry-based):**
- Logs to active OpenTelemetry span via `trace.getActiveSpan()`
- `span.addEvent("log", attributes)` for structured events
- `span.recordException()` for errors
- `span.setStatus()` for error status
- Client-side is no-op (returns early)
- Auto-injects request context from `getRequestContextFn`

**NEW Approach (Console-based):**
- Logs to console with structured formatting
- JSON format option via `LOG_FORMAT=json` env var
- `LogEntry` interface with timestamp, level, message, context, error
- `Logger` class for context-aware logging
- `timeAsync()` and `timeSync()` for performance timing
- Environment-aware log level filtering
- Works on both client and server

**Missing in NEW:**
- OpenTelemetry span integration
- `span.recordException()` for error tracking
- `span.setStatus()` for error status propagation

**NEW Features Not in OLD:**
- `logDebug()` function
- `Logger` class with `child()` method
- `timeAsync()` and `timeSync()` utilities
- JSON log format option
- Log level filtering via `LOG_LEVEL` env

**Impact:**
- Distributed tracing won't have log events correlated with spans
- Error tracking won't automatically set span status
- Need to configure separate OTel instrumentation for tracing

**Suggested Fix:**
Either:
1. Add OTel integration to NEW logger as optional transport
2. Accept console-based logging as architectural decision
3. Use both: console for logs, OTel for traces separately

---

#### [P5-FNC-065] Missing MotionProvider Export

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/motion.tsx`
**NEW File:** N/A - Not found
**Line Ref:** L1-14

**Description:**
OLD has a dedicated motion module that:
- Exports `MotionProvider` component with `LazyMotion` for performance
- Re-exports `AnimatePresence` and `motion` (as `m`) from framer-motion
- Uses `domAnimation` features for reduced motion bundle

NEW doesn't have a dedicated motion provider file. The `features/chat/components/toolbar.tsx` imports directly from framer-motion without LazyMotion optimization.

**Impact:**
- Larger framer-motion bundle size without LazyMotion
- No centralized motion configuration
- Each component imports framer-motion directly

**Suggested Fix:**
Create `lib/motion.tsx` with `MotionProvider` and re-exports, or add to `components/` as shared utility.

---

#### [P5-FNC-066] types.ts: No issues found - functionally equivalent

**Severity:** N/A
**Status:** Resolved
**OLD File:** `archive/oldapp/lib/types.ts`
**NEW File:** `features/chat/types.ts`
**Line Ref:** Full file

**Description:**
NEW `features/chat/types.ts` is a superset of OLD `lib/types.ts` with all functionality preserved:

**Preserved Types:**
- `ChatMessage` - UIMessage with custom types
- `CustomUIDataTypes` - Custom data types for streaming
- `MessageMetadata` - Message metadata with createdAt
- `ChatTools` - Tool definitions
- `UserVote` - Vote type
- `Attachment` - File attachment type
- `StreamingSuggestion` - Partial suggestion during streaming
- `ArtifactKind` - "text" | "code" | "image" | "sheet"
- `DataChatTitlePart`, `DataAppendMessagePart`, `DataUsagePart` - Data parts
- Type guards: `isDataChatTitlePart`, `isDataAppendMessagePart`, `isDataUsagePart`

**NEW Enhancements:**
- `WeatherOutput`, `DocumentOutput`, `SuggestionOutput` - Tool output types
- `AppUsage` defined inline (simpler than OLD's tokenlens import)
- Better organized with JSDoc comments
- Feature-scoped instead of global lib

**Impact:**
None - full functional equivalence with improvements.

---

#### [P5-FNC-067] Missing tokenlens Integration for Usage Tracking

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/lib/usage.ts`
**NEW File:** `features/chat/types.ts` (inline definition)
**Line Ref:** L1-5 vs L179-188

**Description:**
OLD has dedicated usage type with tokenlens integration:

**OLD:**
```typescript
import type { LanguageModelUsage } from "ai";
import type { UsageData } from "tokenlens/helpers";

export type AppUsage = LanguageModelUsage & UsageData & { modelId?: string };
```

This merges:
- `LanguageModelUsage` from AI SDK (promptTokens, completionTokens)
- `UsageData` from tokenlens (cost calculation helpers)
- Custom `modelId` field

**NEW:**
```typescript
export interface AppUsage {
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  model?: string;
}
```

NEW has a simplified interface without tokenlens integration.

**Impact:**
- No automatic cost calculation from tokenlens
- No standardized usage data structure from AI SDK
- Simpler but less feature-rich

**Suggested Fix:**
Either:
1. Add tokenlens package and restore full `AppUsage` type
2. Accept simplified usage tracking as architectural decision
3. Create custom cost calculation if needed

---

#### [P5-FNC-068] artifacts/server.ts: No issues found - functionally equivalent

**Severity:** N/A
**Status:** Resolved
**OLD File:** `archive/oldapp/lib/artifacts/server.ts`
**NEW File:** `features/artifact/handlers/`
**Line Ref:** Full file

**Description:**
NEW `features/artifact/handlers/` provides equivalent functionality with improved architecture:

**Preserved Functionality:**
- `DocumentHandler` interface with `kind`, `onCreateDocument`, `onUpdateDocument`
- `createDocumentHandler()` factory function
- Handler registry by artifact kind
- Document persistence after AI generation

**NEW Architecture Improvements:**
- `BaseArtifactHandler` abstract class for OOP approach
- Separate handler files: `text.handler.ts`, `code.handler.ts`, `sheet.handler.ts`, `image.handler.ts`
- `getArtifactHandler(kind)` helper function
- `supportedArtifactKinds` array derived from registry
- Better separation of concerns with feature-based structure

**Mapping:**
- OLD `documentHandlersByArtifactKind` -> NEW `artifactHandlersByKind`
- OLD `artifactKinds` -> NEW `supportedArtifactKinds`
- OLD `createDocumentHandler` -> NEW `createArtifactHandler`
- OLD `DocumentHandler` -> NEW `ArtifactHandler`

**Impact:**
None - full functional equivalence with architectural improvements.

---

#### [P5-FNC-069] Missing Response Utilities with Request ID Headers

**Severity:** Low
**Status:** Open
**OLD File:** `archive/oldapp/lib/api-context.ts`
**NEW File:** `lib/api/context.ts`
**Line Ref:** L69-132

**Description:**
OLD has response utilities that include request ID headers:

**Missing in NEW:**
1. `createResponseWithRequestId(body, init, requestId)` - Creates Response with X-Request-ID header
2. `jsonResponseWithRequestId(data, init, requestId)` - JSON response with request ID header
3. `addRequestContextToResponse(response, context)` - Add request ID and duration headers to existing response
4. `ResponseContext` type - `{ requestId: string; duration?: number }`
5. `setRequestUserId(userId)` - Convenience function (NEW has `setRequestUser` which is equivalent)

**NEW has:**
- `withRequestContext()` - Route handler wrapper (same)
- `setRequestUser(userId, isGuest)` - Enhanced with isGuest flag
- `formatRequestContext()` - Context formatting (same)

**Impact:**
- No standardized way to add request ID to response headers
- Clients can't correlate requests by X-Request-ID header
- No X-Response-Time header for duration tracking

**Suggested Fix:**
Add response utilities to `lib/api/response.ts` or `lib/api/context.ts`:
- `createResponseWithRequestId()`
- `jsonResponseWithRequestId()`
- `addRequestContextToResponse()`

---

## Improvement Only

_No improvement-only issues found in this phase. All issues represent missing functionality that needs to be addressed._

---

## NEW Improvements (Not in OLD)

The NEW codebase has several improvements not present in OLD:

### Core Utilities
1. **Date Utilities** (`lib/utils/date.ts`):
   - `isToday()`, `isYesterday()`, `startOfDay()`, `endOfDay()`, `addDays()`, `differenceInDays()`

2. **Format Utilities** (`lib/utils/format.ts`):
   - `formatDate()`, `formatRelativeTime()`, `formatFileSize()`, `formatDuration()`, `formatNumber()`

3. **String Utilities** (`lib/utils/string.ts`):
   - `truncate()`, `slugify()`, `capitalize()`, `sanitizeHtml()`

4. **Validation Utilities** (`lib/utils/validation.ts`):
   - `isValidEmail()`, `isValidUrl()`, `isValidUuid()`

5. **Error Message i18n** (`lib/errors/messages.ts`):
   - Internationalization-ready error messages with title, message, and action

6. **Feature Flags** (`lib/constants.ts`):
   - `FEATURE_FLAGS` object for feature toggles

7. **Rate Limiting Configuration** (`lib/constants.ts`):
   - `RATE_LIMITS` object with endpoint-specific limits

### AI Utilities
1. **Context Window Management** (`lib/ai/context-window.ts`)
   - `truncateMessages()` with multiple strategies
   - `validateContext()` for budget checking
   - `getContextWindowSize()` and `getMaxOutputTokens()`
   - `TokenBudget` interface

2. **Token Counting** (`lib/ai/token-counter.ts`)
   - `countTokens()` with provider-specific multipliers
   - `countMessagesTokens()` for conversation context
   - `countToolsTokens()` for tool definitions
   - `calculateTokenBudget()` for request planning

3. **Cleaner Provider Exports** (`lib/ai/providers.ts`)
   - Individual provider exports (`openai`, `google`, `xai`, etc.)
   - `isProviderAvailable()` helper
   - `getDefaultProvider()` with priority order

### API Utilities
1. **Request Context with AsyncLocalStorage** (`lib/api/context.ts`)
   - `runWithRequestContext()` - Context propagation across async boundaries
   - `getRequestContext()` - Access context anywhere in request
   - `getRequestDuration()` - Timing for performance monitoring

2. **Response Builders** (`lib/api/response.ts`)
   - `success()`, `error()`, `notFound()`, `unauthorized()`, `forbidden()`, `rateLimit()`
   - `paginated()` - Paginated response helper
   - `stream()` - Streaming response helper
   - Consistent response format with `ApiResponse<T>`

3. **Validation Utilities** (`lib/api/validation.ts`)
   - `validateBody()`, `validateQuery()`, `validateParams()`, `validateFormData()`
   - Safe variants that return results instead of throwing
   - Common schema helpers

### Data Layer
1. **Repository Pattern** (`lib/data/repositories/`)
   - `BaseRepository<T, NewT, UpdateT>` with CRUD operations
   - Consistent interface across all entities
   - Cache-through strategy built-in

2. **Service Layer** (`lib/data/services/`)
   - Business logic separated from data access
   - `ChatService`, `ArtifactService`, `AuthService`

3. **Query Layer** (`lib/data/queries/`)
   - Complex queries separated from repositories
   - `ChatQueries`, `UserQueries`

### Cache Layer
1. **Tiered Cache** (`lib/cache/tiered-cache.ts`)
   - L1 (memory) + L2 (Redis) caching
   - Automatic fallback when L2 unavailable

2. **LRU Memory Cache** (`lib/cache/memory-cache.ts`)
   - In-memory caching for hot data
   - Configurable max size and TTL

3. **Cache Strategies** (`lib/cache/strategies.ts`)
   - `cacheAside`, `cacheThrough`, `writeThrough`, `writeBehind`
   - Flexible caching patterns

4. **Cache Invalidation** (`lib/cache/invalidation.ts`)
   - Entity-specific invalidation functions
   - Pattern-based invalidation

5. **Redis Health Check** (`lib/cache/client.ts`)
   - `checkRedisHealth()` - Verify connectivity
   - `requireRedisClient()` - Throw if unavailable

### Auth Utilities
1. **Authorization Guards** (`lib/auth/guards.ts`)
   - `requireAuth()`, `requireAuthAction()`, `requireAuthenticatedUser()`
   - `requireOwnership()`, `canAccessChat()`
   - `optionalAuth()` - Get userId if available

2. **Session Utilities** (`lib/auth/session.ts`)
   - `requireSession()` - Throw if no session
   - `isAuthenticated()`, `isGuest()` - Helper functions
   - `getSessionUser()`, `getUserId()` - Convenience functions

---

## Migration Checklist

### Core Utilities
- [ ] Implement `fetcher` function for SWR
- [ ] Implement `fetchWithErrorHandlers` function
- [ ] Implement `generateUUID` function
- [ ] Implement `getMostRecentUserMessage` function
- [ ] Implement `getTrailingMessageId` function
- [ ] Implement `sanitizeText` function
- [ ] Implement `convertToUIMessages` function
- [ ] Implement `getTextFromMessage` function
- [ ] Migrate error handling to new `AppError` system or create adapter
- [ ] Implement `toDatabaseError` helper
- [ ] Implement PostgreSQL error code mapping
- [ ] Add guest-specific error messages
- [ ] Implement error visibility configuration
- [ ] Create file validation utilities module
- [ ] Verify pagination limit change is intentional
- [ ] Add backward compatibility exports for renamed constants

### AI Utilities
- [ ] Create `lib/ai/chat-completion.ts` with `executeChatCompletion`
- [ ] Create `lib/ai/prompts.ts` with all system prompts
- [ ] Create `lib/ai/title-generation.ts` with title functions
- [ ] Create `lib/ai/tools/` directory with 4 tool files
- [ ] Create `lib/ai/constants.ts` with AI configuration
- [ ] Create `lib/ai/entitlements.ts` or integrate elsewhere
- [ ] Create `lib/ai/types.ts` with model metadata types
- [ ] Add `ProviderId` type to `lib/ai/providers.ts`
- [ ] Add reasoning middleware support to providers
- [ ] Add `myProvider` export for backward compatibility
- [ ] Add Cloudflare AI Gateway support
- [ ] Add Cloudflare Workers AI support
- [ ] Expand curated model list or implement discovery
- [ ] Add `getLanguageModel` alias function

### API Utilities
- [ ] Create `lib/api/guards.ts` with route-specific guards
- [ ] Add `requireRateLimitForRoute` function
- [ ] Add `requireOwnershipForRoute` function
- [ ] Add `requireResourceForRoute` function
- [ ] Add `parseTimestampForRoute` function
- [ ] Add `requireQueryParamForRoute` function

### Data Layer
- [ ] Implement guest-aware data strategy in repositories
- [ ] Add `saveWithContext` batch operation
- [ ] Add `deleteMessagesAfterTimestamp` method
- [ ] Add document version rollback support
- [ ] Verify `ChatWithMessages` type compatibility

### Cache Layer
- [ ] Add circuit breaker for Redis failures
- [ ] Consider ZSET-based message storage
- [ ] Implement entity-specific cache warming
- [ ] Add cache entity type definitions

### Auth Utilities
- [ ] Verify NextAuth integration is complete
- [ ] Add `getSessionFromToken` if needed
- [ ] Verify guest session security model
- [ ] Ensure client-side auth is properly configured

### Database Layer
- [ ] Create `lib/db/batch.ts` with batch operations
- [ ] Create `lib/db/pagination.ts` with cursor-based pagination
- [ ] Enhance `withTransaction` with operation name and performance tracking
- [ ] Add backward-compatible query function exports or update imports
- [ ] Verify message part conversion is handled
- [ ] Define `AppUsage` type or document type relaxation for `lastContext`

### Middleware Layer
- [ ] Create `lib/middleware/deduplication.ts` with request deduplication
- [ ] Verify `lib/rate-limit/` works in Edge runtime
- [ ] Add missing rate limit presets to `lib/constants.ts`
- [ ] Verify upload rate limit change is intentional (hourly -> per minute)
- [ ] Add token bucket algorithm support or document architectural decision

### Rate Limit Module
- [ ] Add backward-compatible `checkRateLimit` function wrapper
- [ ] Add `strictLimiter` and `generousLimiter` presets
- [ ] Verify upload rate limit window change is intentional

---

**Summary:**
- Total Issues: 69
- By Category: UI (0), BUG (1), BRK (5), FNC (63), IMP (0)
- By Severity: Critical (10), High (21), Medium (26), Low (12)
