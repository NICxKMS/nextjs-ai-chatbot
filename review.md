# Comprehensive Implementation Review

- Date: 2026-02-18
- Plan Source: `.apm/Implementation_Plan.md`
- Manager Guide: `.github/prompts/apm-2-initiate-manager.prompt.md`
- Memory Logs Source: `.apm/Memory/`
- Review Method: Per-phase strict code validation against NEW code + LEGACY `archive/oldapp/` references (evidence-required)

## Master Summary

- Total phases reviewed: 8
- Total planned tasks reviewed: 97
- Completed: 44
- Partial: 47
- Missing: 0
- Incorrect: 6
- Overall completion percentage: 45.36%

### Phase Completion Breakdown

| Phase | Tasks | Completed | Partial | Missing | Incorrect | Completion % |
|---|---:|---:|---:|---:|---:|---:|
| Phase 1: AI Core & Chat Streaming | 13 | 7 | 5 | 0 | 1 | 53.85% |
| Phase 2: Security Hardening | 10 | 2 | 8 | 0 | 0 | 20.00% |
| Phase 3: Error & Data Infrastructure | 15 | 8 | 6 | 0 | 1 | 53.33% |
| Phase 4: Chat UI & Sidebar Components | 13 | 6 | 7 | 0 | 0 | 46.15% |
| Phase 5: Artifact System | 10 | 3 | 7 | 0 | 0 | 30.00% |
| Phase 6: Page Components, Hooks & State | 13 | 8 | 4 | 0 | 1 | 61.54% |
| Phase 7: API Routes & Server Actions | 14 | 3 | 8 | 0 | 3 | 21.43% |
| Phase 8: Middleware, Types & Configuration | 9 | 7 | 2 | 0 | 0 | 77.78% |

## Failed or Incomplete Tasks

- Phase 1 / Task 1.12 — Expand Curated Model List | **Partial** | Catalog expansion is present, but registry has not fully adopted ModelMetadata capability-array model as primary representation.
- Phase 1 / Task 1.13 — Create Dynamic Model Discovery | **Partial** | Global cache guard in discoverProviders is ineffective due to isCacheValid(null), reducing intended cache path correctness.
- Phase 1 / Task 1.2 — Create AI Model Catalog Types & ProviderId | **Partial** | Registry was not fully migrated away from boolean capability flags; lossy ModelCapabilities remains primary in curated model definitions.
- Phase 1 / Task 1.6 — Wire Tools into Chat Pipeline & Fix Capabilities | **Partial** | Chat pipeline does not pass a model into createSuggestionsTool; suggestions path degrades to placeholder output instead of actual AI suggestion generation.
- Phase 1 / Task 1.8 — Fix Artifact Handler Placeholder Model Strings | **Incorrect** | Production alias resolution for "artifact-model" is missing; handlers now call getModel("artifact-model") but registry only handles this alias in test mode.
- Phase 1 / Task 1.9 — Implement Chat POST AI Execution & Streaming | **Partial** | Usage data is not persisted to DB/chat context in new route; only logged.
- Phase 2 / Task 2.1 — Fix Guest Session JWT Signing | **Partial** | Unsigned guest-cookie fallback remains if GUEST_JWT_SECRET is unset, which conflicts with the objective to replace unsigned guest cookies.
- Phase 2 / Task 2.10 — Create File Attachment Validation Utilities | **Partial** | Required APIs/constants are not implemented with specified contract/names (validateAttachment, ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_SIZE, getFileExtension).
- Phase 2 / Task 2.2 — Fix CSRF Protection in Guest Route | **Partial** | CSRF protection is present, but failure response code is generic FORBIDDEN instead of forbidden:auth:csrf as specified.
- Phase 2 / Task 2.4 — Fix Auth Rate Limiting Middleware Bypass | **Partial** | Guest route is not routed to authLimiter as specified.
- Phase 2 / Task 2.5 — Add Rate Limiting to Guest Route | **Partial** | Configured route limit is 5/60, not 20/60 as specified.
- Phase 2 / Task 2.7 — Fix Vote User Filter | **Partial** | GET does not return empty array for unauthenticated requests; it requires auth and returns an auth error path.
- Phase 2 / Task 2.8 — Add Ownership Verification to Votes & Suggestions | **Partial** | Required guard helpers (requireChatAccess/requireOwnership) are not used.
- Phase 2 / Task 2.9 — Add Rate Limiting to Artifact/File/History Routes | **Partial** | /api/suggestions is not routed to apiLimiter as specified.
- Phase 3 / Task 3.10 — Create Message Parts Type System | **Partial** | Required part types from plan are missing (ErrorPart, SystemPart, AudioPart, VideoPart, EmbedPart).
- Phase 3 / Task 3.11 — Add Missing ZSET Cache Operations | **Partial** | Plan-required wrappers addToChatList/removeFromChatList/getChatList are missing.
- Phase 3 / Task 3.12 — Create Batch Operations & Transaction Wrapper | **Partial** | Plan-required output paths lib/data/batch.ts and lib/data/transaction.ts are missing.
- Phase 3 / Task 3.13 — Create Cursor-Based Pagination | **Partial** | Plan-required file lib/data/pagination.ts is missing.
- Phase 3 / Task 3.14a — Fix Schema Column Types & Data Casting | **Partial** | Plan-required auth provider architecture difference documentation comments are not present.
- Phase 3 / Task 3.6 — Fix deleteAfterTimestamp for Message Regeneration | **Partial** | Regeneration flow action bypasses chat service and calls repository deletion directly.
- Phase 3 / Task 3.8 — Implement Guest-Aware Data Strategy | **Incorrect** | Required guest cache-only behavior is not applied in repository read paths.
- Phase 4 / Task 4.1 — Fix Chat Component Core Functionality | **Partial** | Custom transport error handling parity is incomplete (missing fetchWithErrorHandlers).
- Phase 4 / Task 4.11 — Restore Animations & UI Polish | **Partial** | Plan item 'chat page gradient animation' is not evidenced in current chat page files.
- Phase 4 / Task 4.12a — Fix Chat Component Bugs | **Partial** | P3-BUG-012 parity gap remains: vote actions do not optimistically mutate cached vote state.
- Phase 4 / Task 4.2 — Add Messages Virtualization | **Partial** | Virtualization is implemented, but explicit scroll-restoration config from plan guidance (initialTopMostItemIndex) is not present.
- Phase 4 / Task 4.3 — Fix Data Stream Handlers | **Partial** | Planned handlers for data-error/data-tool-call/data-tool-result are not implemented as explicit stream handlers.
- Phase 4 / Task 4.5 — Fix SWR Cache & Logout Flow | **Partial** | Global cache invalidation on logout is not implemented per task guidance.
- Phase 4 / Task 4.8 — Add Optimistic Chats Integration | **Partial** | Plan item for optimistic deletion with rollback is not implemented.
- Phase 5 / Task 5.1 — Create ArtifactMessages Component | **Partial** | No explicit artifact-related message filtering is implemented; component renders all chat messages.
- Phase 5 / Task 5.2 — Create Artifact Class & Registration System | **Partial** | Registry is implemented but no concrete text/code/image/sheet definitions are registered in new runtime.
- Phase 5 / Task 5.3 — Add MultimodalInput to Artifact Panel | **Partial** | Component-level integration exists, but ArtifactPanel is not mounted in active chat flow.
- Phase 5 / Task 5.4 — Add Toolbar to Artifact Panel | **Partial** | Expected output file features/artifact/components/toolbar.tsx is missing.
- Phase 5 / Task 5.5 — Fix Artifact Actions Implementation | **Partial** | Download actions are not implemented.
- Phase 5 / Task 5.6 — Fix Artifact GET Endpoint | **Partial** | Timestamp-based rollback DELETE endpoint is not implemented in app/api/artifacts/route.ts.
- Phase 5 / Task 5.9a — Fix Artifact Panel Hook Integrations | **Partial** | VersionFooter component is not integrated as required.
- Phase 6 / Task 6.10b — Fix Hydration Bugs | **Partial** | Delivered changes align to P1-BUG-002/003, but no explicit hydration mismatch remediation was implemented.
- Phase 6 / Task 6.12 — Add Auth State Change Listener | **Partial** | Auth event handling updates session state, but does not clear stale SWR/application caches on login/logout/session-update.
- Phase 6 / Task 6.2 — Create SettingsProvider | **Partial** | Provider persists locally but does not perform server sync as required.
- Phase 6 / Task 6.3 — Fix Chat Visibility Hook | **Partial** | Failure toast exists, but no success toast feedback after successful visibility update.
- Phase 6 / Task 6.7 — Fix Auth Redirects & Email Confirmation | **Incorrect** | Fallback redirect path uses /chat despite no /chat index route, creating broken navigation behavior.
- Phase 7 / Task 7.1 — Add Missing DELETE Endpoint for Chat | **Partial** | Cascade behavior is explicit for messages/votes but not explicit for suggestions; suggestion FK does not define onDelete cascade.
- Phase 7 / Task 7.10 — Fix Suggestion Route Query & Response | **Incorrect** | documentVersion filter requirement is not implemented.
- Phase 7 / Task 7.2 — Add Settings Support in Chat Schema | **Partial** | Route uses a TypeScript interface for request parsing but does not enforce runtime Zod schema validation.
- Phase 7 / Task 7.3 — Add File Part Validation | **Partial** | File-part validation schemas are defined but not applied in /api/chat request handling.
- Phase 7 / Task 7.4 — Add Cursor-Based Pagination to History | **Incorrect** | Route cursor contract (timestamp-encoded cursor) is incompatible with repository contract (chatId cursor), breaking page traversal correctness.
- Phase 7 / Task 7.5 — Add Stream Reconnection Logic | **Partial** | Reconnection does not resume from lastEventId; it only replays the latest assistant message within a short window.
- Phase 7 / Task 7.6 — Create Missing Server Actions | **Incorrect** | Plan specifies deleteTrailingMessages(chatId, messageId), but implemented signature remains timestamp-based.
- Phase 7 / Task 7.7a — Add Chat Route Input Validation & Quota | **Partial** | Quota/entitlement checks are implemented in streamChatAction but not in the active /api/chat route path.
- Phase 7 / Task 7.7b — Add Chat Route Infrastructure Enhancements | **Partial** | Geo enrichment does not explicitly process x-forwarded-for despite task requirement.
- Phase 7 / Task 7.8 — Add Artifact Route Validation & Versioning | **Partial** | Version parameter is not functionally applied to update semantics.
- Phase 7 / Task 7.9 — Fix Vote Route Methods & Validation | **Partial** | Client-route integration mismatch remains: UI calls /api/vote while implemented route is /api/votes.
- Phase 8 / Task 8.3 — Add OpenTelemetry Integration to Rate Limiting | **Partial** | Requested logger-level OTel integration (span attributes/events alongside logs) is not present in current lib/log.ts.
- Phase 8 / Task 8.6 — Fix ChatSDKError Migration | **Partial** | Compatibility adapter exists, but active code still mixes legacy-style codes with new AppError usage, so migration consistency is incomplete.

## Critical Issues

- Phase 1 / Task 1.8 — Fix Artifact Handler Placeholder Model Strings: Production alias resolution for "artifact-model" is missing; handlers now call getModel("artifact-model") but registry only handles this alias in test mode.
- Phase 1 / Phase-level — AI Core & Chat Streaming: Task 1.8: "artifact-model" alias is not resolved in production registry path, causing artifact handlers/tools to reference a non-resolvable model ID.
- Phase 1 / Phase-level — AI Core & Chat Streaming: Task 1.9: AI usage is emitted/logged but not persisted to chat context, breaking parity with legacy usage tracking/cost data persistence.
- Phase 1 / Phase-level — AI Core & Chat Streaming: Task 1.6: Suggestions tool in chat pipeline can run in placeholder mode because no model is injected for requestSuggestions.
- Phase 2 / Phase-level — Security Hardening: Guest session code still permits unsigned cookie fallback when GUEST_JWT_SECRET is missing.
- Phase 2 / Phase-level — Security Hardening: Suggestions ownership flow does not consistently return 403 unauthorized responses as required.
- Phase 2 / Phase-level — Security Hardening: File upload validation lacks magic-byte verification, leaving MIME-spoofing risk.
- Phase 3 / Task 3.8 — Implement Guest-Aware Data Strategy: Required guest cache-only behavior is not applied in repository read paths.
- Phase 3 / Phase-level — Error & Data Infrastructure: Task 3.8 is incorrect: guest cache-only strategy is implemented as helpers but not integrated into repository behavior; guest cache misses still fall back to DB.
- Phase 3 / Phase-level — Error & Data Infrastructure: Task 3.6 is only partially wired: regeneration action bypasses the service path that performs vote + message transactional cleanup.
- Phase 3 / Phase-level — Error & Data Infrastructure: Tasks 3.12 and 3.13 are partial due to data-layer API/path mismatch (implemented under lib/db, missing required lib/data module surfaces and expected function names).
- Phase 4 / Phase-level — Chat UI & Sidebar Components: Task 4.1 is still missing transport-level fetchWithErrorHandlers and robust user-facing error handling parity in chat.
- Phase 4 / Phase-level — Chat UI & Sidebar Components: Task 4.3 does not fully meet planned stream-handler coverage and does not respect auto-scroll preference gating.
- Phase 4 / Phase-level — Chat UI & Sidebar Components: Task 4.5 lacks planned SWR/global cache invalidation on logout, leaving stale client cache risk.
- Phase 4 / Phase-level — Chat UI & Sidebar Components: Task 4.12a still lacks optimistic vote cache mutation parity in MessageActions.
- Phase 5 / Phase-level — Artifact System: ArtifactPanel is not mounted in active chat rendering, so several Phase 5 UI deliverables are not reachable at runtime.
- Phase 5 / Phase-level — Artifact System: app/api/artifacts/route.ts lacks timestamp-based rollback DELETE behavior expected by phase requirements and legacy parity.
- Phase 5 / Phase-level — Artifact System: Artifact registration system exists but has no concrete runtime registrations/icons, limiting type-specific action/toolbar behavior.
- Phase 6 / Task 6.7 — Fix Auth Redirects & Email Confirmation: Fallback redirect path uses /chat despite no /chat index route, creating broken navigation behavior.
- Phase 6 / Phase-level — Page Components, Hooks & State: Post-auth redirect defaults to /chat while no /chat index route exists, causing broken login/auth-layout navigation.
- Phase 6 / Phase-level — Page Components, Hooks & State: Auth state synchronization is incomplete for stale cache clearing and streaming-logout edge handling.
- Phase 7 / Task 7.4 — Add Cursor-Based Pagination to History: Route cursor contract (timestamp-encoded cursor) is incompatible with repository contract (chatId cursor), breaking page traversal correctness.
- Phase 7 / Task 7.6 — Create Missing Server Actions: Plan specifies deleteTrailingMessages(chatId, messageId), but implemented signature remains timestamp-based.
- Phase 7 / Task 7.10 — Fix Suggestion Route Query & Response: documentVersion filter requirement is not implemented.
- Phase 7 / Phase-level — API Routes & Server Actions: History cursor contract mismatch (timestamp cursor in route vs chatId cursor in repository) causes incorrect pagination behavior.
- Phase 7 / Phase-level — API Routes & Server Actions: Vote API integration mismatch: UI calls /api/vote but implemented endpoint is /api/votes.
- Phase 7 / Phase-level — API Routes & Server Actions: Suggestion route misses required documentVersion filtering and required response envelope with metadata.
- Phase 7 / Phase-level — API Routes & Server Actions: Chat route lacks enforced runtime schema validation for message/file parts despite defined schemas.
- Phase 8 / Phase-level — Middleware, Types & Configuration: Task 8.3: lib/log.ts lacks requested OpenTelemetry span/event integration for logging correlation.
- Phase 8 / Phase-level — Middleware, Types & Configuration: Task 8.6: Active new code still mixes legacy and new error-code patterns; compatibility adapter is not integrated into main runtime error flow.

## Recommended Priority Fixes

- Migrate registry model definitions to ModelCapability[] as source of truth, then derive legacy booleans only where needed via compatibility helpers.
- Pass model: getModel("artifact-model") (or equivalent resolved artifact model) when creating chat tools, or make suggestions tool default to a resolved artifact model internally.
- Add non-test alias mapping for "artifact-model" in registry (e.g., resolve to a configured default artifact model ID) before provider lookup.
- Optionally register an explicit curated model ID for artifact use and point handlers/tools to that concrete ID.
- Capture onUsageCalculated result in route scope and persist via chat context update (e.g., repository updateContext/lastContext) during onFinish.
- Either wire executeChatCompletion/createUIMessageStream responsibilities into stream-chat.action.ts or formally deprecate that action and update plan/task traceability.
- Use ModelMetadata-style capability arrays as the canonical shape in registry and derive legacy booleans only for compatibility.
- Add explicit title model resolution in title-generation (configured title model ID from registry/constants).
- Replace isCacheValid(null) branch with direct globalCatalogCache expiry validation.
- Pass controller.signal (or merged signal) into each provider discovery call to make MODEL_DISCOVERY_TIMEOUT_MS effective.
- Fail closed for guest session creation when GUEST_JWT_SECRET is missing (no unsigned fallback).
- Implement explicit token rotation when JWT is near expiry while keeping long cookie TTL.
- Return a 403 response with the explicit error code forbidden:auth:csrf for CSRF failures.
- Route /api/auth/guest and /api/auth/logout through authLimiter (or update plan/spec explicitly if different limiter is intentional).
- Narrow bypass logic to the required callback patterns if strict parity is required.
- Align guest route limit to 20 requests/60 seconds if plan parity is required.
- Use a single IP extraction helper from rate-limit utilities and unify limiter selection across middleware and route.
- Implement explicit unauthenticated behavior returning [] for GET if strict plan parity is required.
- Use requireOwnership()/requireChatAccess() explicitly in votes/suggestions route guards.
- Return explicit 403 for unauthorized access attempts in suggestions flow per plan requirement.
- Explicitly map /api/artifacts, /api/history, /api/suggestions, /api/votes to apiLimiter in getLimiterForRoute().
- Keep /api/files/upload on uploadLimiter and /api/auth/logout on authLimiter, with explicit route comments/tests.
- Add validateAttachment({ file, maxSize, allowedTypes }) API and export required constants/helpers.
- Implement magic-byte file signature checks and enforce them in upload validation path.
- Update features/chat/actions/delete-trailing-messages.action.ts to call chatService.deleteMessagesAfterTimestamp().

## Phase Reports

### Phase 1: AI Core & Chat Streaming

#### Task 1.1 — Create AI Configuration Constants
- Status: Completed
- Evidence (new code):
  - lib/ai/constants.ts: exports DEFAULT_MODEL_ID, DEFAULT_TEMPERATURE, DEFAULT_MAX_OUTPUT_TOKENS, DEFAULT_TOP_P, MAX_CONTEXT_TOKENS, SYSTEM_PROMPT_RESERVE_TOKENS, TITLE_GENERATION_MAX_TOKENS, MODEL_CACHE_TTL_MS, MODEL_DISCOVERY_TIMEOUT_MS, STREAM_CHUNK_SIZE, STREAM_TIMEOUT_MS, DEFAULT_MESSAGES_PER_MINUTE, DEFAULT_TOKENS_PER_MINUTE, SUPPORTED_PROVIDERS, MODEL_CATEGORIES
  - features/settings/types.ts: DEFAULT_SAMPLING uses DEFAULT_TEMPERATURE/DEFAULT_TOP_P/DEFAULT_MAX_OUTPUT_TOKENS from lib/ai/constants
- Evidence (legacy code):
  - archive/oldapp/lib/ai/constants.ts: baseline constants and provider/category definitions
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 1.2 — Create AI Model Catalog Types & ProviderId
- Status: Partial
- Evidence (new code):
  - lib/ai/types.ts: defines ProviderId, PROVIDER_DISPLAY_NAMES, ModelCapability, ModelModality, ReasoningType, ModelMetadata, ProviderCatalog, ModelCatalogResponse
  - lib/ai/registry.ts: ModelDefinition still uses capabilities: ModelCapabilities (boolean flags) with optional capabilityList
- Evidence (legacy code):
  - archive/oldapp/lib/ai/model-catalog-types.ts: capabilities represented as ModelCapability[]
  - archive/oldapp/lib/ai/provider-info.ts: ProviderId + provider display names
- Issues Found:
  - Registry was not fully migrated away from boolean capability flags; lossy ModelCapabilities remains primary in curated model definitions.
- Suggested Fixes:
  - Migrate registry model definitions to ModelCapability[] as source of truth, then derive legacy booleans only where needed via compatibility helpers.

#### Task 1.3 — Create System Prompts Module
- Status: Completed
- Evidence (new code):
  - lib/ai/prompts.ts: exports regularPrompt, artifactsPrompt, RequestHints, getRequestPromptFromHints, systemPrompt, codePrompt, sheetPrompt, updateDocumentPrompt
  - features/artifact/handlers/code.handler.ts: imports codePrompt/getCodeUpdatePrompt from lib/ai/prompts
  - features/artifact/handlers/sheet.handler.ts and text.handler.ts: import prompt helpers from lib/ai/prompts
- Evidence (legacy code):
  - archive/oldapp/lib/ai/prompts.ts: same prompt families and systemPrompt composition
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 1.4 — Create Chat Completion Executor
- Status: Completed
- Evidence (new code):
  - lib/ai/chat-completion.ts: executeChatCompletion uses streamText + smoothStream + AbortSignal.timeout(55_000)
  - lib/ai/chat-completion.ts: getEnabledTools(model), buildProviderOptions(selectedModel), onFinish usage callback, exported ChatCompletionParams
- Evidence (legacy code):
  - archive/oldapp/lib/ai/chat-completion.ts: same execution pattern (tools gating, provider options, streamText, onFinish usage)
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 1.5 — Create Title Generation Module
- Status: Completed
- Evidence (new code):
  - lib/ai/title-generation.ts: generateTitleFromUserMessage uses generateText and TITLE_GENERATION_MAX_TOKENS with fallback
  - lib/ai/title-generation.ts: generatePlaceholderTitle extracts first text part and truncates to 80 chars
- Evidence (legacy code):
  - archive/oldapp/lib/ai/title-generation.ts: same async generation + sync fallback structure
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 1.6 — Wire Tools into Chat Pipeline & Fix Capabilities
- Status: Partial
- Evidence (new code):
  - features/chat/lib/tools/create-document.tool.ts: delegates to getArtifactHandler(kind).createDocument(...)
  - features/chat/lib/tools/update-document.tool.ts: delegates to getArtifactHandler(...).updateDocument(...)
  - features/chat/lib/tools/suggestions.tool.ts: persists all generated suggestions via artifactService.addSuggestions(suggestions.map(...))
  - lib/ai/chat-completion.ts: createChatTools(...) is wired into streaming path
  - features/chat/lib/tools/suggestions.tool.ts: if (!context.model) returns placeholder suggestion instead of AI-generated suggestions
- Evidence (legacy code):
  - archive/oldapp/lib/ai/tools/request-suggestions.ts: always uses myProvider.languageModel("artifact-model") for AI suggestions
  - archive/oldapp/lib/ai/tools/create-document.ts and update-document.ts: delegated tool execution into artifact handlers
- Issues Found:
  - Chat pipeline does not pass a model into createSuggestionsTool; suggestions path degrades to placeholder output instead of actual AI suggestion generation.
- Suggested Fixes:
  - Pass model: getModel("artifact-model") (or equivalent resolved artifact model) when creating chat tools, or make suggestions tool default to a resolved artifact model internally.

#### Task 1.7 — Add Reasoning Model Middleware Support
- Status: Completed
- Evidence (new code):
  - lib/ai/registry.ts: getReasoningTagName(reasoningType) maps reasoning tags
  - lib/ai/registry.ts: getModel(...) wraps reasoning models with wrapLanguageModel + extractReasoningMiddleware
  - lib/ai/models.mock.ts and registry.ts test branch: mock model handling for test environment
- Evidence (legacy code):
  - archive/oldapp/lib/ai/providers.ts: reasoning middleware wrapping pattern and tag mapping
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 1.8 — Fix Artifact Handler Placeholder Model Strings
- Status: Incorrect
- Evidence (new code):
  - features/artifact/handlers/code.handler.ts, text.handler.ts, sheet.handler.ts: replaced model string with getModel("artifact-model")
  - lib/ai/registry.ts: only explicit artifact-model handling exists in test switch case; production path falls through to providerRegistry.languageModel(id)
  - lib/ai/registry.ts: provider fallback call is providerRegistry.languageModel(id as `${string}:${string}`)
- Evidence (legacy code):
  - archive/oldapp/lib/ai/providers.ts: production explicitly maps "artifact-model" to DEFAULT_ARTIFACT_MODEL before provider lookup
- Issues Found:
  - Production alias resolution for "artifact-model" is missing; handlers now call getModel("artifact-model") but registry only handles this alias in test mode.
- Suggested Fixes:
  - Add non-test alias mapping for "artifact-model" in registry (e.g., resolve to a configured default artifact model ID) before provider lookup.
  - Optionally register an explicit curated model ID for artifact use and point handlers/tools to that concrete ID.

#### Task 1.9 — Implement Chat POST AI Execution & Streaming
- Status: Partial
- Evidence (new code):
  - app/api/chat/route.ts: uses createUIMessageStream, executeChatCompletion, emits data-chatTitle, returns JsonToSseTransformStream SSE response
  - app/api/chat/route.ts: onUsageCalculated currently logs usage only
  - features/chat/actions/stream-chat.action.ts: streamChatAction persists chat/messages but does not invoke executeChatCompletion or stream orchestration
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/chat/route.ts: saveChat call includes usage: finalMergedUsage in persistence flow
- Issues Found:
  - Usage data is not persisted to DB/chat context in new route; only logged.
  - Planned stream-chat action integration was not implemented; streaming execution is route-only.
- Suggested Fixes:
  - Capture onUsageCalculated result in route scope and persist via chat context update (e.g., repository updateContext/lastContext) during onFinish.
  - Either wire executeChatCompletion/createUIMessageStream responsibilities into stream-chat.action.ts or formally deprecate that action and update plan/task traceability.

#### Task 1.10 — Create User Model Entitlements
- Status: Completed
- Evidence (new code):
  - lib/ai/entitlements.ts: Entitlements type, entitlementsByUserType (guest=20/day, regular=100/day), getEntitlements(userType)
- Evidence (legacy code):
  - archive/oldapp/lib/ai/entitlements.ts: same guest/regular entitlement structure
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 1.11 — Add Cloudflare Providers
- Status: Completed
- Evidence (new code):
  - lib/ai/providers.ts: cloudflare-workers via createWorkersAI with CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_KEY
  - lib/ai/providers.ts: cloudflare-ai-gateway via createAiGateway with supported Gemini list and flash-lite fallback chain
  - package.json: includes workers-ai-provider and ai-gateway-provider
- Evidence (legacy code):
  - archive/oldapp/lib/ai/model-registry.ts: Cloudflare Workers and AI Gateway provider setup with Gemini fallback behavior
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 1.12 — Expand Curated Model List
- Status: Partial
- Evidence (new code):
  - lib/ai/registry.ts: curatedModels expanded (35 id entries counted) including Gemma 3 free, DeepSeek free, Claude 3.7 Sonnet, image/video models, title-specific model entry
  - lib/ai/registry.ts: model entries still primarily use boolean capabilities under ModelDefinition
  - lib/ai/title-generation.ts: title model selection uses getDefaultChatModel() instead of explicit title-specific curated model ID
- Evidence (legacy code):
  - archive/oldapp/lib/ai/curated-models.ts: curated model catalog baseline
  - archive/oldapp/lib/ai/title-generation.ts: dedicated DEFAULT_TITLE_MODEL path
- Issues Found:
  - Catalog expansion is present, but registry has not fully adopted ModelMetadata capability-array model as primary representation.
  - Title-generation flow does not explicitly consume the title-specific curated model configuration.
- Suggested Fixes:
  - Use ModelMetadata-style capability arrays as the canonical shape in registry and derive legacy booleans only for compatibility.
  - Add explicit title model resolution in title-generation (configured title model ID from registry/constants).

#### Task 1.13 — Create Dynamic Model Discovery
- Status: Partial
- Evidence (new code):
  - lib/ai/model-discovery.ts: discoverProviders uses Promise.allSettled and provider-specific discoverOpenAI/discoverGoogleGemini/discoverOpenRouter/discoverCloudflareWorkers
  - lib/ai/model-discovery.ts: exports getModelCatalog/refreshModelCatalog/forceRefreshModelCatalog/listProviderCatalogs
  - lib/ai/model-discovery.ts: global cache check uses isCacheValid(null) in discoverProviders
  - lib/ai/model-discovery.ts: timeout AbortController is created but provider calls use discoverers.map((d) => d.run()) without injecting controller.signal
- Evidence (legacy code):
  - archive/oldapp/lib/ai/model-discovery.ts: allSettled-based provider discovery and error isolation pattern
- Issues Found:
  - Global cache guard in discoverProviders is ineffective due to isCacheValid(null), reducing intended cache path correctness.
  - Discovery timeout controller is not wired into provider requests, so timeout abort behavior is not enforced end-to-end.
- Suggested Fixes:
  - Replace isCacheValid(null) branch with direct globalCatalogCache expiry validation.
  - Pass controller.signal (or merged signal) into each provider discovery call to make MODEL_DISCOVERY_TIMEOUT_MS effective.

### Phase 2: Security Hardening

#### Task 2.1 — Fix Guest Session JWT Signing
- Status: Partial
- Evidence (new code):
  - lib/auth/session.ts: getGuestJwtSecret(), getGuestSession(), createGuestSession() (jwtVerify/SignJWT)
  - lib/auth/session.ts: createGuestSession() fallback sets unsigned guest_id cookie when secret missing
  - .env.example: GUEST_JWT_SECRET
- Evidence (legacy code):
  - archive/oldapp/lib/auth/session.ts: getGuestSessionFromCookies() uses jwtVerify
  - archive/oldapp/lib/auth/session.ts: createGuestSession() returns null when GUEST_JWT_SECRET is missing (no unsigned fallback)
- Issues Found:
  - Unsigned guest-cookie fallback remains if GUEST_JWT_SECRET is unset, which conflicts with the objective to replace unsigned guest cookies.
  - JWT/cookie TTL split is implemented, but explicit near-expiry token rotation logic is not implemented in this path.
- Suggested Fixes:
  - Fail closed for guest session creation when GUEST_JWT_SECRET is missing (no unsigned fallback).
  - Implement explicit token rotation when JWT is near expiry while keeping long cookie TTL.

#### Task 2.2 — Fix CSRF Protection in Guest Route
- Status: Partial
- Evidence (new code):
  - app/api/auth/guest/route.ts: POST(request) calls validateOrigin(request) at handler start
  - app/api/auth/guest/route.ts: CSRF failure returns forbidden("Invalid request origin")
  - lib/api/context.ts: validateOrigin(request)
- Evidence (legacy code):
  - archive/oldapp/app/api/auth/guest/route.ts: POST checks validateOrigin(request)
  - archive/oldapp/app/api/auth/guest/route.ts: CSRF failure returns code forbidden:auth:csrf
- Issues Found:
  - CSRF protection is present, but failure response code is generic FORBIDDEN instead of forbidden:auth:csrf as specified.
- Suggested Fixes:
  - Return a 403 response with the explicit error code forbidden:auth:csrf for CSRF failures.

#### Task 2.3 — Fix Open Redirect Vulnerability
- Status: Completed
- Evidence (new code):
  - lib/utils/validation.ts: getSafeRedirectUrl() blocks javascript/data/vbscript/file schemes
  - lib/utils/validation.ts: getSafeRedirectUrl() blocks protocol-relative URLs and backslash traversal patterns
  - app/api/auth/guest/route.ts: GET uses getSafeRedirectUrl() before NextResponse.redirect
- Evidence (legacy code):
  - archive/oldapp/app/api/auth/guest/route.ts: inline getSafeRedirectUrl() with equivalent checks
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 2.4 — Fix Auth Rate Limiting Middleware Bypass
- Status: Partial
- Evidence (new code):
  - middleware.ts: isAuthCallbackRoute() no longer bypasses all /api/auth/*; guest/logout continue through rate-limiting path
  - middleware.ts: getLimiterForRoute() maps /api/auth/logout to authLimiter
  - middleware.ts: getLimiterForRoute() maps /api/auth/guest to authGuestLimiter (not authLimiter)
- Evidence (legacy code):
  - archive/oldapp/proxy.ts: auth routes grouped under AUTH_RATE_LIMIT_PATHS (/api/auth/)
- Issues Found:
  - Guest route is not routed to authLimiter as specified.
  - Callback bypass set includes multiple NextAuth internal endpoints, not only callback/[...nextauth] as specified.
- Suggested Fixes:
  - Route /api/auth/guest and /api/auth/logout through authLimiter (or update plan/spec explicitly if different limiter is intentional).
  - Narrow bypass logic to the required callback patterns if strict parity is required.

#### Task 2.5 — Add Rate Limiting to Guest Route
- Status: Partial
- Evidence (new code):
  - app/api/auth/guest/route.ts: POST applies checkGuestLimit(clientIp), logs events, returns 429 with Retry-After
  - app/api/auth/guest/route.ts: client IP obtained via getClientIp from lib/api
  - lib/constants.ts + lib/rate-limit/limits.ts: guest limiter configured as 5 requests/60s
- Evidence (legacy code):
  - archive/oldapp/app/api/auth/guest/route.ts: POST uses IP-based custom rate limit with AUTH_GUEST config (20/60)
- Issues Found:
  - Configured route limit is 5/60, not 20/60 as specified.
  - IP extraction source differs from requested getClientIP from lib/rate-limit.
  - Guest route uses different guest limiters across middleware and route-level logic.
- Suggested Fixes:
  - Align guest route limit to 20 requests/60 seconds if plan parity is required.
  - Use a single IP extraction helper from rate-limit utilities and unify limiter selection across middleware and route.

#### Task 2.6 — Fix Upload Rate Limit Window
- Status: Completed
- Evidence (new code):
  - lib/constants.ts: RATE_LIMITS.upload set to { requests: 10, window: 3600 }
  - lib/rate-limit/limits.ts: uploadLimiter uses RATE_LIMITS.upload
  - middleware.ts: getLimiterForRoute() routes /api/files/upload to uploadLimiter
  - app/api/files/upload/route.ts: POST calls checkUploadLimit(userId)
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/files/upload/route.ts: upload endpoint protected by upload rate limiting
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 2.7 — Fix Vote User Filter
- Status: Partial
- Evidence (new code):
  - lib/data/repositories/vote.repository.ts: findByChatIdAndUserId(chatId, userId)
  - app/api/votes/route.ts: GET verifies chat ownership and uses findByChatIdAndUserId()
  - app/api/votes/route.ts: PATCH blocks guests via requireNonGuest()
- Evidence (legacy code):
  - archive/oldapp/lib/db/queries.ts: getVotesByChatIdAndUserId({ chatId, userId })
  - archive/oldapp/app/(chat)/api/vote/route.ts: ownership and message-in-chat checks
- Issues Found:
  - GET does not return empty array for unauthenticated requests; it requires auth and returns an auth error path.
- Suggested Fixes:
  - Implement explicit unauthenticated behavior returning [] for GET if strict plan parity is required.

#### Task 2.8 — Add Ownership Verification to Votes & Suggestions
- Status: Partial
- Evidence (new code):
  - app/api/votes/route.ts: chat ownership verified before vote read/write operations
  - app/api/suggestions/route.ts: artifact existence/access checked via artifactRepository.findLatestVersion() and user-scoped context
  - lib/data/repositories/artifact.repository.ts: findLatestVersion() filters by context.userId
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/suggestions/route.ts: document ownership verification before suggestion fetch
  - archive/oldapp/lib/db/queries.ts: getSuggestionsByDocumentId filters by userId
- Issues Found:
  - Required guard helpers (requireChatAccess/requireOwnership) are not used.
  - Suggestions unauthorized path commonly returns [] (through user-filtered repository null result) instead of explicit 403 as specified.
- Suggested Fixes:
  - Use requireOwnership()/requireChatAccess() explicitly in votes/suggestions route guards.
  - Return explicit 403 for unauthorized access attempts in suggestions flow per plan requirement.

#### Task 2.9 — Add Rate Limiting to Artifact/File/History Routes
- Status: Partial
- Evidence (new code):
  - middleware.ts: getLimiterForRoute() routes /api/files/upload to uploadLimiter and /api/auth/logout to authLimiter
  - middleware.ts: /api/suggestions currently routed to chatLimiter
  - middleware.ts: /api/votes, /api/history, /api/artifacts fall through to default apiLimiter
- Evidence (legacy code):
  - archive/oldapp/proxy.ts: API routes receive edge rate limiting with auth-route specialization
- Issues Found:
  - /api/suggestions is not routed to apiLimiter as specified.
  - Target routes (artifacts/history/votes) are not explicitly mapped in getLimiterForRoute (rely on default path).
- Suggested Fixes:
  - Explicitly map /api/artifacts, /api/history, /api/suggestions, /api/votes to apiLimiter in getLimiterForRoute().
  - Keep /api/files/upload on uploadLimiter and /api/auth/logout on authLimiter, with explicit route comments/tests.

#### Task 2.10 — Create File Attachment Validation Utilities
- Status: Partial
- Evidence (new code):
  - lib/utils/file-validation.ts: validateFile(), isValidMimeType(), size/type checks, filename sanitization
  - app/api/files/upload/route.ts: integrates centralized validation via validateFile()
  - lib/utils/file-validation.ts: no magic-byte signature verification implementation
- Evidence (legacy code):
  - archive/oldapp/lib/files.ts: attachment MIME allowlist utilities and constants
- Issues Found:
  - Required APIs/constants are not implemented with specified contract/names (validateAttachment, ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_SIZE, getFileExtension).
  - Magic-byte validation is missing.
- Suggested Fixes:
  - Add validateAttachment({ file, maxSize, allowedTypes }) API and export required constants/helpers.
  - Implement magic-byte file signature checks and enforce them in upload validation path.

### Phase 3: Error & Data Infrastructure

#### Task 3.1 — Create Shared Fetcher & Error Handler Functions
- Status: Completed
- Evidence (new code):
  - lib/utils/fetcher.ts: fetcher<T>(), fetchWithErrorHandlers(), handleChatNotFoundRedirect()
  - lib/utils/index.ts: exports fetcher and fetchWithErrorHandlers
- Evidence (legacy code):
  - archive/oldapp/lib/utils.ts: fetcher
  - archive/oldapp/lib/utils.ts: fetchWithErrorHandlers
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 3.2 — Create Missing Utility Functions
- Status: Completed
- Evidence (new code):
  - lib/utils/uuid.ts: generateUUID()
  - lib/utils/message.ts: getMostRecentUserMessage(), getTrailingMessageId()
  - lib/utils/string.ts: sanitizeText()
  - lib/utils/index.ts: utility exports
- Evidence (legacy code):
  - archive/oldapp/lib/utils.ts: generateUUID()
  - archive/oldapp/lib/utils.ts: getMostRecentUserMessage()
  - archive/oldapp/lib/utils.ts: getTrailingMessageId()
  - archive/oldapp/lib/utils.ts: sanitizeText()
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 3.3 — Fix Error Utility Functions
- Status: Completed
- Evidence (new code):
  - lib/errors/database.ts: DatabaseError, mapPostgresCodeToError(), toDatabaseError()
  - lib/errors/messages.ts: guestSpecificMessages and contextual guest message helpers
  - lib/errors/index.ts: database/message utility exports
- Evidence (legacy code):
  - archive/oldapp/lib/errors.ts: mapPostgresCodeToError()
  - archive/oldapp/lib/errors.ts: toDatabaseError()
  - archive/oldapp/lib/errors.ts: getMessageByErrorCode() guest branch
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 3.4 — Fix Missing Auth Guard Functions
- Status: Completed
- Evidence (new code):
  - lib/auth/guards.ts: requireRateLimit(), requireResource(), parseTimestamp(), requireQueryParam()
  - lib/auth/guards.ts: requireAuth() returns { session, userId }
- Evidence (legacy code):
  - archive/oldapp/lib/api/guards.ts: requireAuth(), requireRateLimit(), requireResource()
  - archive/oldapp/lib/api/validators.ts: parseTimestamp(), requireQueryParam()
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 3.5 — Fix saveWithContext Batch Operation
- Status: Completed
- Evidence (new code):
  - lib/data/repositories/message.repository.ts: saveWithContext() transaction with message insert + chat context update
  - lib/data/repositories/message.repository.ts: onConflictDoNothing() and context.userId ownership filter
  - lib/data/repositories/message.repository.ts: post-transaction cache invalidation and logging
- Evidence (legacy code):
  - archive/oldapp/lib/data/chat.ts: saveWithContext()
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 3.6 — Fix deleteAfterTimestamp for Message Regeneration
- Status: Partial
- Evidence (new code):
  - lib/data/repositories/message.repository.ts: deleteAfterTimestamp() with cache invalidation
  - lib/data/services/chat.service.ts: deleteMessagesAfterTimestamp() with vote + message transactional delete
  - features/chat/actions/delete-trailing-messages.action.ts: uses messageRepository.deleteAfterTimestamp() directly
- Evidence (legacy code):
  - archive/oldapp/lib/data/chat.ts: deleteAfterTimestamp() transactional vote/message deletion
- Issues Found:
  - Regeneration flow action bypasses chat service and calls repository deletion directly.
  - Current action path does not enforce the vote-cascade cleanup path implemented in ChatService.
- Suggested Fixes:
  - Update features/chat/actions/delete-trailing-messages.action.ts to call chatService.deleteMessagesAfterTimestamp().
  - Ensure regeneration path always deletes dependent votes before deleting messages.

#### Task 3.7 — Implement Circuit Breaker for Redis
- Status: Completed
- Evidence (new code):
  - lib/cache/circuit-breaker.ts: CIRCUIT_BREAKER_THRESHOLD, CIRCUIT_BREAKER_RESET_MS, isCircuitOpen(), recordCacheFailure(), recordCacheSuccess()
  - lib/cache/strategies.ts: fast-fail checks and success/failure recording in cache operations
- Evidence (legacy code):
  - archive/oldapp/lib/cache/operations.ts: circuit breaker constants and functions
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 3.8 — Implement Guest-Aware Data Strategy
- Status: Incorrect
- Evidence (new code):
  - lib/data/guest-strategy.ts: guestAwareGet()/guestAwareWrite()/guestAwareDelete() implemented but standalone
  - lib/data/repositories/base.repository.ts: findById() cache miss always falls back to DB
  - lib/data/repositories/chat.repository.ts: doFindById()/findWithMessages() have no guest cache-only branch
- Evidence (legacy code):
  - archive/oldapp/lib/data/chat.ts: ctx.isGuest branches return cache-only/null on miss
  - archive/oldapp/lib/data/document.ts: ctx.isGuest cache-only behavior
- Issues Found:
  - Required guest cache-only behavior is not applied in repository read paths.
  - Guest strategy module exists but is not integrated into ChatRepository/MessageRepository/ArtifactRepository behavior.
- Suggested Fixes:
  - Integrate guest-aware logic into repository read/write/delete paths (or BaseRepository) so guest cache misses do not hit DB.
  - Apply explicit guest checks in chat/message/artifact repository methods required by the plan.

#### Task 3.9 — Create Cache Entity Types
- Status: Completed
- Evidence (new code):
  - lib/cache/types.ts: CachedChatMeta, CachedChat, CachedMessage, UserChatListItem, CachedDocument, DocumentVersion
  - lib/cache/index.ts: cache type exports
- Evidence (legacy code):
  - archive/oldapp/lib/cache/types.ts: corresponding cache entity types
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 3.10 — Create Message Parts Type System
- Status: Partial
- Evidence (new code):
  - lib/types/message-parts.ts: message part union + Zod schemas + helpers (extractTextFromParts, hasToolCalls)
  - lib/types/index.ts: exports message-parts module
- Evidence (legacy code):
  - archive/oldapp/lib/types/message-parts.ts: message part union and helpers
- Issues Found:
  - Required part types from plan are missing (ErrorPart, SystemPart, AudioPart, VideoPart, EmbedPart).
  - Required helper names from plan are missing (getTextContent, getImageParts).
- Suggested Fixes:
  - Add the missing part schemas/types and include them in MessagePart union.
  - Add plan-specified helper functions (or aliases) to match required API surface.

#### Task 3.11 — Add Missing ZSET Cache Operations
- Status: Partial
- Evidence (new code):
  - lib/cache/zset.ts: generic zadd(), zrem(), zrevrange() and related primitives
  - lib/data/repositories/chat.repository.ts: no addToChatList()/removeFromChatList()/getChatList() integration
- Evidence (legacy code):
  - archive/oldapp/lib/cache/operations.ts: user chat list ZSET operations and getUserChatsFromCache() integration
- Issues Found:
  - Plan-required wrappers addToChatList/removeFromChatList/getChatList are missing.
  - Chat repository list management is not wired to the new ZSET operations.
- Suggested Fixes:
  - Implement addToChatList(), removeFromChatList(), getChatList() on top of zset primitives.
  - Integrate these operations into chat repository create/delete/list flows.

#### Task 3.12 — Create Batch Operations & Transaction Wrapper
- Status: Partial
- Evidence (new code):
  - lib/db/batch.ts: batchInsert(), batchUpdate(), batchDelete(), batchUpsert()
  - lib/db/client.ts: withTransaction() and withSequentialTransactions()
  - lib/data/index.ts: no lib/data batch/transaction exports
- Evidence (legacy code):
  - archive/oldapp/lib/db/batch.ts: batch operations
  - archive/oldapp/lib/db/transactions.ts: withTransaction()
- Issues Found:
  - Plan-required output paths lib/data/batch.ts and lib/data/transaction.ts are missing.
  - Plan-requested batchUpdate(table, items, keyFn) API is not present.
  - Progress callback support for large batches is not implemented.
- Suggested Fixes:
  - Add lib/data/batch.ts and lib/data/transaction.ts (wrapping lib/db utilities if desired).
  - Add keyFn-based batchUpdate signature and progress callback support.
  - Export these utilities from lib/data/index.ts.

#### Task 3.13 — Create Cursor-Based Pagination
- Status: Partial
- Evidence (new code):
  - lib/db/pagination.ts: paginate(), CursorPaginatedResult, createPaginationResponse()
  - lib/data/index.ts: no pagination utility exports from lib/data layer
- Evidence (legacy code):
  - archive/oldapp/lib/db/pagination.ts: cursor pagination utilities
- Issues Found:
  - Plan-required file lib/data/pagination.ts is missing.
  - Plan-required API names CursorPaginationParams, applyCursorPagination, buildCursorResponse are missing.
  - Utilities are implemented under lib/db instead of required data-layer surface.
- Suggested Fixes:
  - Create lib/data/pagination.ts with required type/function names (can wrap lib/db/pagination.ts).
  - Export pagination utilities from lib/data/index.ts and align consumers to that API.

#### Task 3.14a — Fix Schema Column Types & Data Casting
- Status: Partial
- Evidence (new code):
  - lib/db/schema.ts: chat.lastContext typed as AppUsage | null
  - lib/cache/cast.ts: type-safe cache casting helpers
  - lib/cache/index.ts: cast utility exports
- Evidence (legacy code):
  - archive/oldapp/lib/db/schema.ts: chat.lastContext typed as AppUsage | null
- Issues Found:
  - Plan-required auth provider architecture difference documentation comments are not present.
  - Casting utilities are created but not clearly integrated into repository cache read paths.
- Suggested Fixes:
  - Add explicit code comments documenting NextAuth vs Supabase auth-provider architecture differences where requested.
  - Adopt cast utilities in cache read/deserialize paths inside repositories/services.

#### Task 3.14b — Fix Auth Route Operational Issues
- Status: Completed
- Evidence (new code):
  - app/api/auth/guest/route.ts: export const maxDuration = 10
  - app/api/auth/guest/route.ts: structured logInfo/logWarn for session create/reuse and rate-limit events
- Evidence (legacy code):
  - archive/oldapp/app/api/auth/guest/route.ts: maxDuration and structured guest-route logging
- Issues Found:
  - None
- Suggested Fixes:
  - None

### Phase 4: Chat UI & Sidebar Components

#### Task 4.1 — Fix Chat Component Core Functionality
- Status: Partial
- Evidence (new code):
  - features/chat/components/chat.tsx: DefaultChatTransport has no fetch override (no fetchWithErrorHandlers)
  - features/chat/components/chat.tsx: onError only logs via console.error
  - features/chat/components/chat.tsx: no isNewSession/clearNewSessionFlag usage
- Evidence (legacy code):
  - archive/oldapp/components/chat.tsx: DefaultChatTransport uses fetchWithErrorHandlers
  - archive/oldapp/components/chat.tsx: onError handles ChatSDKError + toast + billing alert
  - archive/oldapp/components/chat.tsx: first-message flow calls clearNewSessionFlag()
- Issues Found:
  - Custom transport error handling parity is incomplete (missing fetchWithErrorHandlers).
  - User-facing error UX is reduced (no toast/dialog path in chat onError).
  - New-session optimization hook usage is missing.
- Suggested Fixes:
  - Add fetchWithErrorHandlers to DefaultChatTransport fetch option.
  - Restore user-facing onError handling (toast/error-classification path).
  - Wire isNewSession/clearNewSessionFlag behavior for first-message flow.

#### Task 4.2 — Add Messages Virtualization
- Status: Partial
- Evidence (new code):
  - features/chat/components/messages.tsx: Virtuoso list implemented with followOutput='smooth' and atBottomStateChange
  - features/chat/components/messages.tsx: no initialTopMostItemIndex prop on Virtuoso
- Evidence (legacy code):
  - archive/oldapp/components/messages.tsx: Virtuoso-based virtualization baseline
- Issues Found:
  - Virtualization is implemented, but explicit scroll-restoration config from plan guidance (initialTopMostItemIndex) is not present.
- Suggested Fixes:
  - Add initialTopMostItemIndex (or equivalent restoration mechanism) and document restoration behavior.

#### Task 4.3 — Fix Data Stream Handlers
- Status: Partial
- Evidence (new code):
  - features/chat/components/data-stream-handler.tsx: handles artifact stream parts and deltas
  - features/chat/components/messages.tsx: no auto-scroll preference gate (no settings snapshot check)
  - features/chat/components/chat.tsx: handles data-chatTitle/data-usage/data-appendMessage only
- Evidence (legacy code):
  - archive/oldapp/components/data-stream-handler.tsx: artifact stream processing baseline
  - archive/oldapp/components/messages.tsx: auto-scroll respects settings autoScroll flag
- Issues Found:
  - Planned handlers for data-error/data-tool-call/data-tool-result are not implemented as explicit stream handlers.
  - Auto-scroll preference check is not wired in current messages flow.
- Suggested Fixes:
  - Add explicit handling path for remaining planned stream event categories (or update plan/type-system to current SDK model-parts behavior).
  - Gate auto-scroll behavior by user preference as in legacy behavior.

#### Task 4.4 — Add Tool Component Implementations
- Status: Completed
- Evidence (new code):
  - features/chat/components/message.tsx: tool-* rendering with Weather, DocumentToolCall, DocumentToolResult, and AIToolCall states
  - components/ai/tools/weather.tsx: weather result UI component
- Evidence (legacy code):
  - archive/oldapp/components/message.tsx: tool rendering for weather/document/suggestions
  - archive/oldapp/components/weather.tsx: weather tool UI baseline
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 4.5 — Fix SWR Cache & Logout Flow
- Status: Partial
- Evidence (new code):
  - features/sidebar/components/sidebar-user-nav.tsx: logout calls /api/auth/logout and clears auth context via setSession(null)
  - features/sidebar/components/sidebar-user-nav.tsx: no SWR mutate cache-clear call
- Evidence (legacy code):
  - archive/oldapp/components/sidebar-user-nav.tsx: uses SWR mutate on logout flow
  - archive/oldapp/components/sidebar-user-nav.tsx: chained logout flow included cache invalidation before navigation
- Issues Found:
  - Global cache invalidation on logout is not implemented per task guidance.
  - Planned SWR cache clearing for chat/vote/suggestion keys is not evidenced.
- Suggested Fixes:
  - Add SWR cache clear strategy (e.g., mutate(() => true, undefined, { revalidate: false })) before redirect.
  - Ensure vote/suggestion and history keys are explicitly invalidated when logout succeeds.

#### Task 4.6 — Add Chat Deduplication
- Status: Completed
- Evidence (new code):
  - features/sidebar/components/sidebar-history.tsx: loadMore deduplicates incoming chats by id
  - features/sidebar/components/sidebar-history.tsx: groupedChats path deduplicates via Map safety net
- Evidence (legacy code):
  - archive/oldapp/components/sidebar-history.tsx: dedupe-by-id Map pattern before rendering
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 4.7 — Fix Sidebar Virtualization
- Status: Completed
- Evidence (new code):
  - features/sidebar/components/sidebar-history.tsx: GroupedVirtuoso with groupCounts/groupContent/itemContent and date groups
- Evidence (legacy code):
  - archive/oldapp/components/sidebar-history.tsx: GroupedVirtuoso date-grouped history baseline
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 4.8 — Add Optimistic Chats Integration
- Status: Partial
- Evidence (new code):
  - features/sidebar/hooks/use-optimistic-chats.tsx: optimistic chat context add/update/remove
  - features/chat/components/chat.tsx: adds optimistic chat on first message and updates title from data-chatTitle
  - features/sidebar/components/sidebar-history.tsx: merges optimistic + fetched chats and removes optimistic entry on confirmation
  - features/sidebar/components/sidebar-history.tsx: optimistic entries are non-deletable (early return in onDelete)
- Evidence (legacy code):
  - archive/oldapp/hooks/use-optimistic-chats.tsx: optimistic chat context baseline
  - archive/oldapp/components/sidebar-history.tsx: merge/remove optimistic entries with fetched data
- Issues Found:
  - Plan item for optimistic deletion with rollback is not implemented.
- Suggested Fixes:
  - Implement optimistic delete state + rollback on deletion failure, or adjust plan scope to current non-optimistic delete design.

#### Task 4.9 — Add Chat Title Update Listener
- Status: Completed
- Evidence (new code):
  - features/chat/components/chat.tsx: dispatches chat-title-updated on data-chatTitle and on delayed onFinish polls
  - features/sidebar/components/sidebar-history.tsx: listens for chat-title-updated and refreshes history state
- Evidence (legacy code):
  - archive/oldapp/components/sidebar-history.tsx: chat-title-updated listener with history refresh via mutate
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 4.10 — Fix Infinite Scroll in Sidebar
- Status: Completed
- Evidence (new code):
  - features/sidebar/components/sidebar-history.tsx: GroupedVirtuoso endReached triggers loadMore
  - features/sidebar/components/sidebar-history.tsx: footer includes loading/end/error-retry states
- Evidence (legacy code):
  - archive/oldapp/components/sidebar-history.tsx: endReached-driven infinite pagination pattern
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 4.11 — Restore Animations & UI Polish
- Status: Partial
- Evidence (new code):
  - features/chat/components/messages.tsx: AnimatePresence around ThinkingMessage
  - features/chat/components/message.tsx: motion-based message and ThinkingMessage animations
  - features/artifact/components/artifact-panel.tsx: AnimatePresence + motion slide-in panel transitions
  - app/globals.css: CodeMirror selector uses .ͼo class
- Evidence (legacy code):
  - archive/oldapp/components/messages.tsx: AnimatePresence usage baseline
  - archive/oldapp/components/message.tsx: motion-based message animations baseline
  - archive/oldapp/components/artifact.tsx: animated artifact panel transitions
  - archive/oldapp/app/globals.css: .ͼo CodeMirror selector
- Issues Found:
  - Plan item 'chat page gradient animation' is not evidenced in current chat page files.
- Suggested Fixes:
  - Implement the planned chat-page gradient animation (if still required) or update the plan to reflect current intended UX.

#### Task 4.12a — Fix Chat Component Bugs
- Status: Partial
- Evidence (new code):
  - features/sidebar/components/sidebar-user-nav.tsx: ChevronUp added in trigger
  - features/chat/components/message.tsx: MessageReasoning integrated for reasoning parts
  - features/chat/components/message-editor.tsx: calls deleteTrailingMessagesAction
  - features/chat/components/message-actions.tsx: voting handlers do fetch without SWR mutate
- Evidence (legacy code):
  - archive/oldapp/components/sidebar-user-nav.tsx: ChevronUp trigger pattern
  - archive/oldapp/components/message.tsx: MessageReasoning integration baseline
  - archive/oldapp/components/message-editor.tsx: trailing-message deletion flow
  - archive/oldapp/components/message-actions.tsx: SWR mutate after voting
- Issues Found:
  - P3-BUG-012 parity gap remains: vote actions do not optimistically mutate cached vote state.
- Suggested Fixes:
  - Restore SWR vote-cache mutate flow (or equivalent optimistic state update) in MessageActions.

#### Task 4.12b — Fix Message Functional Discrepancies
- Status: Completed
- Evidence (new code):
  - features/chat/components/message.tsx: uses sanitizeText + Streamdown response rendering
  - features/chat/components/message.tsx: integrates MessageEditor and MessageActions
  - features/chat/components/message.tsx: attachment preview + tool error/result rendering
- Evidence (legacy code):
  - archive/oldapp/components/message.tsx: message rendering baseline for text/actions/attachments/tool outputs
- Issues Found:
  - None
- Suggested Fixes:
  - None

### Phase 5: Artifact System

#### Task 5.1 — Create ArtifactMessages Component
- Status: Partial
- Evidence (new code):
  - features/artifact/components/artifact-messages.tsx: ArtifactMessages/PureArtifactMessages
  - features/artifact/components/artifact-panel.tsx: ArtifactMessages is rendered with full messages array
- Evidence (legacy code):
  - archive/oldapp/components/artifact-messages.tsx: PureArtifactMessages
  - archive/oldapp/components/artifact.tsx: left-panel ArtifactMessages integration
- Issues Found:
  - No explicit artifact-related message filtering is implemented; component renders all chat messages.
  - Artifact panel host is not mounted in active chat UI, limiting runtime impact.
- Suggested Fixes:
  - Filter messages by artifact context (artifact id/tool call lineage) before render.
  - Mount ArtifactPanel in the active chat render tree and pass required props.

#### Task 5.2 — Create Artifact Class & Registration System
- Status: Partial
- Evidence (new code):
  - features/artifact/lib/artifact-class.ts: Artifact class + registerArtifact/getArtifactDefinition registry
  - features/artifact/types.ts: ArtifactDefinition and related generic artifact types
- Evidence (legacy code):
  - archive/oldapp/components/create-artifact.tsx: Artifact class pattern
  - archive/oldapp/artifacts/text/client.tsx: concrete artifact definition instance
- Issues Found:
  - Registry is implemented but no concrete text/code/image/sheet definitions are registered in new runtime.
  - Required helper getArtifactIcon(kind) is missing.
  - Plan-specified fields handler/model are not present on ArtifactDefinition.
- Suggested Fixes:
  - Register concrete artifact definitions during artifact feature initialization.
  - Add getArtifactIcon(kind) and exported artifact kind constants/map.
  - Either extend ArtifactDefinition with handler/model fields or document an explicit v6 deviation.

#### Task 5.3 — Add MultimodalInput to Artifact Panel
- Status: Partial
- Evidence (new code):
  - features/artifact/components/artifact-panel.tsx: MultimodalInput integrated in artifact left panel
  - features/artifact/components/artifact-panel.tsx: attachments/input/sendMessage/setMessages wiring
- Evidence (legacy code):
  - archive/oldapp/components/artifact.tsx: MultimodalInput placement and wiring in artifact panel
- Issues Found:
  - Component-level integration exists, but ArtifactPanel is not mounted in active chat flow.
  - Inline artifact chat path is therefore not reachable at runtime.
- Suggested Fixes:
  - Render ArtifactPanel from features/chat/components/chat.tsx (or equivalent active container).
  - Pass useChat state/handlers to ArtifactPanel as in legacy chat-to-artifact composition.

#### Task 5.4 — Add Toolbar to Artifact Panel
- Status: Partial
- Evidence (new code):
  - features/artifact/components/artifact-panel.tsx: imports Toolbar from features/chat/components/toolbar
  - features/chat/components/toolbar.tsx: file header marks it as simplified placeholder
- Evidence (legacy code):
  - archive/oldapp/components/toolbar.tsx: toolbar implementation
  - archive/oldapp/components/artifact.tsx: toolbar integration
- Issues Found:
  - Expected output file features/artifact/components/toolbar.tsx is missing.
  - Current toolbar does not provide the plan-required Undo/Redo/Copy/Download/Version History action set.
  - No keyboard-shortcut implementation for artifact actions in the integrated toolbar path.
- Suggested Fixes:
  - Create artifact-scoped toolbar component under features/artifact/components.
  - Implement required action groups and separators, and add keyboard shortcuts.
  - Wire toolbar actions to artifact state/version handlers.

#### Task 5.5 — Fix Artifact Actions Implementation
- Status: Partial
- Evidence (new code):
  - features/artifact/components/artifact-actions.tsx: createDefaultActions (view changes/prev/next/copy)
  - features/artifact/components/artifact-panel.tsx: ArtifactActions wired into panel header
- Evidence (legacy code):
  - archive/oldapp/components/artifact-actions.tsx: action rendering from artifact definitions
  - archive/oldapp/artifacts/text/client.tsx: baseline action set (view/copy/version navigation)
- Issues Found:
  - Download actions are not implemented.
  - Version comparison modal is not implemented (only mode toggle exists).
  - Action set is closer to legacy baseline but misses plan-specified enhancements.
- Suggested Fixes:
  - Add per-kind download handlers (.md/.csv/image/code extensions).
  - Implement explicit version comparison modal flow and wire from actions.
  - Expose these actions through toolbar/buttons consistently.

#### Task 5.6 — Fix Artifact GET Endpoint
- Status: Partial
- Evidence (new code):
  - app/api/artifacts/route.ts: GET uses getVersionHistory(id) and returns versions array with Cache-Control
  - app/api/artifacts/route.ts: DELETE currently deletes artifact by id (no timestamp rollback)
  - features/artifact/actions/versions.ts: rollbackToVersion action exists
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/document/route.ts: GET returns all document versions
  - archive/oldapp/app/(chat)/api/document/route.ts: DELETE requires timestamp and deletes versions after timestamp
- Issues Found:
  - Timestamp-based rollback DELETE endpoint is not implemented in app/api/artifacts/route.ts.
  - Artifact panel fetch path still uses getArtifact latest-version pattern instead of version-array endpoint.
- Suggested Fixes:
  - Add DELETE timestamp handling in app/api/artifacts/route.ts and call rollbackToVersion.
  - Update artifact panel/version UI to consume version-array API data directly.

#### Task 5.7 — Fix rejectSuggestion Implementation
- Status: Completed
- Evidence (new code):
  - features/artifact/actions/suggestions.ts: rejectSuggestion verifies and calls artifactService.deleteSuggestion
  - lib/data/services/artifact.service.ts: deleteSuggestion(suggestionId, ctx)
- Evidence (legacy code):
  - archive/oldapp/artifacts/text/client.tsx: suggestion-driven artifact workflow
  - archive/oldapp/app/(chat)/api/suggestions/route.ts: suggestion ownership/access pattern
- Issues Found:
  - rejectSuggestion uses generic Error("Suggestion not found") instead of typed AppError.
- Suggested Fixes:
  - Use NotFoundError/ValidationError in rejectSuggestion for consistency with v6 error hierarchy.

#### Task 5.8 — Fix Data Stream Artifact Handlers
- Status: Completed
- Evidence (new code):
  - features/chat/components/data-stream-handler.tsx: text handler accumulates suggestions via callback setMetadata
  - features/chat/components/data-stream-handler.tsx: text delta sets status streaming + auto-visibility window (~400-450 chars)
  - features/chat/components/data-stream-handler.tsx: code/image/sheet delta handlers set status streaming
- Evidence (legacy code):
  - archive/oldapp/components/data-stream-handler.tsx: artifact onStreamPart dispatch model
  - archive/oldapp/artifacts/text/client.tsx: suggestion accumulation + visibility/status behavior
- Issues Found:
  - None
- Suggested Fixes:
  - Add unit tests for stream-part accumulation/visibility/status transitions.

#### Task 5.9a — Fix Artifact Panel Hook Integrations
- Status: Partial
- Evidence (new code):
  - features/artifact/components/artifact-panel.tsx: useSidebar + useWindowSize integrated for width behavior
  - components/version-footer.tsx: VersionFooter component exists but is not used by artifact panel
  - features/artifact/components/artifact-panel.tsx: custom inline version footer block used instead
- Evidence (legacy code):
  - archive/oldapp/components/artifact.tsx: useSidebar/useWindowSize + VersionFooter integration
  - archive/oldapp/components/version-footer.tsx: rollback footer behavior
- Issues Found:
  - VersionFooter component is not integrated as required.
  - Current inline footer lacks legacy restore/rollback interaction.
  - Artifact panel remains unmounted in active chat UI.
- Suggested Fixes:
  - Integrate VersionFooter (or equivalent rollback-capable component) into ArtifactPanel.
  - Connect footer restore action to timestamp rollback endpoint.
  - Mount ArtifactPanel in active chat composition.

#### Task 5.9b — Fix Broken Artifact Component References
- Status: Completed
- Evidence (new code):
  - features/artifact/index.ts: consolidated artifact barrel exports
  - features/artifact/components/index.ts: artifact component export surface
  - features/artifact/lib/index.ts: artifact registry/class exports
- Evidence (legacy code):
  - archive/oldapp/lib/types.ts: legacy import path pattern from '@/components/artifact'
  - archive/oldapp/components/artifact.tsx: monolithic legacy artifact component references
- Issues Found:
  - Task scope in plan references P3-BRK-017–024, which appears primarily tied to chat/message components outside artifact files.
- Suggested Fixes:
  - Keep artifact-reference fixes in Phase 5 and move non-artifact reference defects to Phase 4 tracking.

### Phase 6: Page Components, Hooks & State

#### Task 6.1 — Create OptimisticChatsProvider
- Status: Completed
- Evidence (new code):
  - features/sidebar/hooks/use-optimistic-chats.tsx: OptimisticChatsProvider, useOptimisticChats
  - features/sidebar/components/sidebar-history.tsx: convertToVirtuosoGroups(), processedOptimisticIds race-handling/removal
  - app/(chat)/layout.tsx: provider hierarchy includes OptimisticChatsProvider
- Evidence (legacy code):
  - archive/oldapp/hooks/use-optimistic-chats.tsx: OptimisticChatsProvider and optimistic chat API
  - archive/oldapp/components/sidebar-history.tsx: optimistic merge and dedupe/removal flow
  - archive/oldapp/app/(chat)/chat-layout-client.tsx: OptimisticChatsProvider wrapping
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 6.2 — Create SettingsProvider
- Status: Partial
- Evidence (new code):
  - features/settings/components/settings-provider.tsx: SettingsProvider with localStorage persistence (useLocalStorage)
  - app/(chat)/layout.tsx: SettingsProvider added to provider hierarchy
  - features/chat/components/chat.tsx: uses useModelSelection from features/settings/hooks (not provider-backed hooks)
- Evidence (legacy code):
  - archive/oldapp/lib/ui/settings-store.tsx: SettingsProvider/useSettings pattern
  - archive/oldapp/app/(chat)/chat-layout-client.tsx: SettingsProvider wrapper usage
- Issues Found:
  - Provider persists locally but does not perform server sync as required.
  - Primary consumers still rely on hook-based model selection state outside the new provider context.
- Suggested Fixes:
  - Wire provider updates to settings server actions (e.g., updateAppSettings/getAppSettings sync path).
  - Migrate chat/settings consumers to provider-backed hooks to make the provider the single source of truth.

#### Task 6.3 — Fix Chat Visibility Hook
- Status: Partial
- Evidence (new code):
  - hooks/use-chat-visibility.ts: optimistic setVisibilityType(), rollback on failure, updateVisibilityAction() call
  - features/chat/actions/update-visibility.action.ts: server action for visibility persistence and revalidation
  - features/chat/actions/index.ts: update-visibility action exported
- Evidence (legacy code):
  - archive/oldapp/hooks/use-chat-visibility.ts: optimistic visibility update + rollback pattern
  - archive/oldapp/app/(chat)/actions.ts: updateChatVisibility() server action
- Issues Found:
  - Failure toast exists, but no success toast feedback after successful visibility update.
- Suggested Fixes:
  - Add success notification on successful visibility persistence.
  - Optionally remove non-functional AbortController path or implement cancellable request semantics.

#### Task 6.4 — Fix Register Form
- Status: Completed
- Evidence (new code):
  - features/auth/components/auth-form.tsx: confirmPassword field with client-side mismatch validation and error UI
  - features/auth/schemas/auth.schema.ts: registerSchema confirmPassword refine() validation
  - features/auth/components/submit-button.tsx: type-switching submit behavior + output aria-live="polite"
  - app/(auth)/register/page.tsx: showConfirmPassword and SubmitButton integration
- Evidence (legacy code):
  - archive/oldapp/components/auth-form.tsx: baseline form without confirmPassword
  - archive/oldapp/components/submit-button.tsx: ARIA output/type-switching baseline
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 6.5 — Create Loading & Error Pages
- Status: Completed
- Evidence (new code):
  - app/(chat)/loading.tsx: chat route loading state
  - app/(chat)/chat/[id]/loading.tsx: chat message skeleton loading state
  - app/(chat)/chat/[id]/error.tsx: error boundary with Try Again and Go Home actions
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/loading.tsx: chat loading baseline
  - archive/oldapp/app/(chat)/chat/[id]/loading.tsx: per-chat loading baseline
  - archive/oldapp/app/(chat)/error.tsx: chat error boundary with Go Home/Try Again
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 6.6 — Add Analytics Components
- Status: Completed
- Evidence (new code):
  - app/layout.tsx: imports Analytics and SpeedInsights and renders only when NODE_ENV === "production"
- Evidence (legacy code):
  - archive/oldapp/app/layout.tsx: Analytics and SpeedInsights present (unconditional)
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 6.7 — Fix Auth Redirects & Email Confirmation
- Status: Incorrect
- Evidence (new code):
  - features/auth/actions/login.action.ts: default redirectTo is callbackUrl || "/chat"
  - app/(auth)/login/page.tsx: fallback router.push(result.redirectTo || "/chat")
  - app/(auth)/layout.tsx: authenticated users redirected to "/chat"
  - lib/auth/config.ts: authorized callback redirects logged-in auth-page visits to "/chat"
  - app/(chat)/chat/: only [id]/ route exists (no /chat page)
- Evidence (legacy code):
  - archive/oldapp/app/(auth)/login/page.tsx: successful login redirects to "/"
  - archive/oldapp/app/(auth)/register/page.tsx: email-confirmation branch redirects to "/login"
- Issues Found:
  - Fallback redirect path uses /chat despite no /chat index route, creating broken navigation behavior.
  - Requirement specifies redirect to intended path or '/', but implementation defaults to '/chat'.
  - Email confirmation flow is not implemented in code and not documented in repository docs.
- Suggested Fixes:
  - Change all auth fallback redirects from '/chat' to '/' (login action/page, auth layout, auth config callback).
  - Add explicit documentation for intentionally removed email confirmation, or implement verification workflow.

#### Task 6.8 — Add Resource Hints & Pyodide Script
- Status: Completed
- Evidence (new code):
  - app/layout.tsx: preconnect + dns-prefetch resource hints added in <head>
  - app/layout.tsx: Pyodide script loaded with strategy="lazyOnload"
- Evidence (legacy code):
  - archive/oldapp/app/head.tsx: resource hints baseline
  - archive/oldapp/app/(chat)/chat-layout-client.tsx: Pyodide script loading baseline
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 6.9 — Add Notice Toast Handler
- Status: Completed
- Evidence (new code):
  - features/chat/hooks/use-notice-toast.ts: notice parsing, toast dispatch, URL param cleanup
  - features/chat/components/notice-toast-handler.tsx: handler component wrapper
  - app/(chat)/layout.tsx: Suspense-wrapped NoticeToastHandler integration
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/chat-layout-client.tsx: notice query handling and URL cleanup with toasts
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 6.10a — Fix Page Metadata & SEO
- Status: Completed
- Evidence (new code):
  - app/layout.tsx: expanded metadata + viewport exports
  - app/(auth)/layout.tsx: auth-layout metadata export
  - app/(chat)/layout.tsx: chat-layout metadata export
  - features/sidebar/components/sidebar.tsx and features/sidebar/components/sidebar-item.tsx: Link prefetch={true}
- Evidence (legacy code):
  - archive/oldapp/app/layout.tsx: baseline metadata/viewport implementation
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 6.10b — Fix Hydration Bugs
- Status: Partial
- Evidence (new code):
  - app/(chat)/chat/[id]/page.tsx: convertToUIMessages now validates message.id with ValidationError
  - app/error.tsx: console.error gated to development
  - app/global-error.tsx: console.error gated to development
- Evidence (legacy code):
  - archive/oldapp/lib/utils.ts: convertToUIMessages throws on missing message id
  - archive/oldapp/app/global-error.tsx: global error boundary baseline
- Issues Found:
  - Delivered changes align to P1-BUG-002/003, but no explicit hydration mismatch remediation was implemented.
  - Task objective and implemented scope are misaligned (hydration-specific verification/fixes are not evidenced).
- Suggested Fixes:
  - Add explicit hydration audit evidence (components checked and mismatch elimination rationale) and patch any reproducible mismatch points.
  - If scope is intentionally P1-BUG-002/003 only, update task naming/guidance to remove hydration wording.

#### Task 6.11 — Fix Hooks Discrepancies
- Status: Completed
- Evidence (new code):
  - hooks/use-scroll-to-bottom.tsx: observer/event listener cleanup in effect returns
  - hooks/use-mobile.ts: media query listener cleanup
  - hooks/use-window-size.ts: resize listener cleanup
  - hooks/use-local-storage.ts: storage listener cleanup
- Evidence (legacy code):
  - archive/oldapp/hooks/use-scroll-to-bottom.tsx: baseline hook behavior for scroll edge cases
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 6.12 — Add Auth State Change Listener
- Status: Partial
- Evidence (new code):
  - features/auth/components/auth-provider.tsx: BroadcastChannel + storage listeners for login/logout/session-update
  - app/api/auth/session/route.ts: session refresh endpoint for cross-tab sync
  - features/auth/hooks/use-logout-handler.ts: onBeforeLogout callback and cross-tab broadcast helper
  - features/sidebar/components/sidebar-user-nav.tsx: logout still uses direct fetch flow (hook not integrated)
- Evidence (legacy code):
  - archive/oldapp/components/auth-provider.tsx: supabase.auth.onAuthStateChange session synchronization
  - archive/oldapp/components/sidebar-user-nav.tsx: SWR cache clearing on logout
- Issues Found:
  - Auth event handling updates session state, but does not clear stale SWR/application caches on login/logout/session-update.
  - Stream-abort edge case is only exposed as an unused helper hook; logout UI path does not consume it.
- Suggested Fixes:
  - Add cache invalidation on auth state transitions (history, votes, suggestions, and related keyed caches).
  - Integrate useLogoutHandler in active logout UI and pass stream-stop callback where chat streaming is present.

### Phase 7: API Routes & Server Actions

#### Task 7.1 — Add Missing DELETE Endpoint for Chat
- Status: Partial
- Evidence (new code):
  - app/api/chat/route.ts: DELETE(request) handler with UUID/auth/rate-limit checks
  - lib/data/services/chat.service.ts: deleteChat(chatId, ctx) transaction deletes votes/messages/chat
  - lib/db/schema.ts: artifact.chatId references chat.id with onDelete:cascade; suggestion.artifactRef has no onDelete cascade
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/chat/route.ts: DELETE(request) with ownership verification
  - archive/oldapp/lib/db/schema.ts: document.chatId cascades from chat; suggestion documentRef has no onDelete cascade
- Issues Found:
  - Cascade behavior is explicit for messages/votes but not explicit for suggestions; suggestion FK does not define onDelete cascade.
  - Task requirement explicitly calls out cascading suggestions/artifacts; artifacts are implicit via FK, suggestions are not handled in service.
- Suggested Fixes:
  - Delete suggestions tied to artifact versions before chat delete, or add onDelete:cascade to suggestion artifact foreign key.
  - Expand delete result/reporting to include artifact/suggestion deletion counts for auditability.

#### Task 7.2 — Add Settings Support in Chat Schema
- Status: Partial
- Evidence (new code):
  - app/api/chat/route.ts: ChatPostBody includes settings and passes requestBody.settings to executeChatCompletion
  - lib/ai/chat-completion.ts: applies settings.sampling.temperature/topP/maxOutputTokens
  - features/chat/schemas/chat.schema.ts: ChatSettingsSchema and SamplingSettingsSchema
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/chat/schema.ts: postRequestBodySchema includes settings.sampling
  - archive/oldapp/app/(chat)/api/chat/route.ts: parseJsonBodyForRoute(postRequestBodySchema)
- Issues Found:
  - Route uses a TypeScript interface for request parsing but does not enforce runtime Zod schema validation.
  - Plan calls for schema-level support in chat POST path; schema exists but is not enforced at the route boundary.
- Suggested Fixes:
  - Validate chat POST with a Zod schema (StreamChatSchema or route-specific schema) before processing.
  - If contract requires top-level selectedModel/temperature/maxTokens aliases, add normalization + validation mapping.

#### Task 7.3 — Add File Part Validation
- Status: Partial
- Evidence (new code):
  - features/chat/schemas/chat.schema.ts: FilePartSchema/CreateMessageSchema validate MIME and attachment size
  - lib/types/message-parts.ts: messagePartSchema with file MIME refinements
  - app/api/chat/route.ts: request body parsed via request.json() without safeParse against file-part schemas
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/chat/schema.ts: partSchema enforces text/file structure
  - archive/oldapp/app/(chat)/api/chat/route.ts: parseJsonBodyForRoute(postRequestBodySchema)
- Issues Found:
  - File-part validation schemas are defined but not applied in /api/chat request handling.
  - Invalid attachment parts are not reliably rejected at chat route boundary.
- Suggested Fixes:
  - Apply Zod parsing to incoming chat POST body and reject invalid file parts with 400.
  - Enforce file-part size checks in chat message validation path (in addition to upload endpoint validation).

#### Task 7.4 — Add Cursor-Based Pagination to History
- Status: Incorrect
- Evidence (new code):
  - app/api/history/route.ts: CursorCodec encodes/decodes updatedAt timestamps
  - app/api/history/route.ts: passes cursor string into getHistoryAction startingAfter/endingBefore
  - lib/data/repositories/chat.repository.ts: startingAfter/endingBefore expect chat IDs and lookup cursor chat by id
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/history/route.ts: uses starting_after/ending_before id-based pagination contract
- Issues Found:
  - Route cursor contract (timestamp-encoded cursor) is incompatible with repository contract (chatId cursor), breaking page traversal correctness.
  - Plan required data-layer cursor utility alignment and backward compatibility; neither is fully satisfied.
- Suggested Fixes:
  - Unify cursor semantics end-to-end (either opaque timestamp cursor in repository or id cursor in route).
  - Add compatibility support for prior pagination params (starting_after/ending_before or documented offset fallback).

#### Task 7.5 — Add Stream Reconnection Logic
- Status: Partial
- Evidence (new code):
  - app/api/chat/[id]/reconnect/route.ts: GET accepts lastEventId/retryCount, returns Retry-After backoff headers
  - app/api/chat/[id]/reconnect/route.ts: lastEventId is parsed but not used for resume positioning
  - app/api/chat/[id]/reconnect/route.ts: uses requireRateLimit('api', userId)
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/chat/[id]/stream/route.ts: stream reconnect pattern with stream context and standard limiter
- Issues Found:
  - Reconnection does not resume from lastEventId; it only replays the latest assistant message within a short window.
  - Rate limiting is generic API limiter, not stream-specific as required.
- Suggested Fixes:
  - Implement event-offset resume using persisted stream checkpoints keyed by chat/user/session.
  - Apply stream-specific limiter namespace/config for reconnect abuse protection.

#### Task 7.6 — Create Missing Server Actions
- Status: Incorrect
- Evidence (new code):
  - features/chat/actions/delete-trailing-messages.action.ts: deleteTrailingMessagesAction({ chatId, createdAt })
  - features/chat/actions/update-visibility.action.ts: updateVisibilityAction({ chatId, visibility })
  - features/chat/actions/index.ts: both actions exported
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/actions.ts: deleteTrailingMessages uses createdAt timestamp; updateChatVisibility action
- Issues Found:
  - Plan specifies deleteTrailingMessages(chatId, messageId), but implemented signature remains timestamp-based.
  - Input validation is minimal (no dedicated Zod schema for action payloads).
- Suggested Fixes:
  - Refactor deleteTrailingMessages action to accept messageId and resolve deletion boundary server-side.
  - Add schema-based validation for chatId/messageId/visibility inputs.

#### Task 7.7a — Add Chat Route Input Validation & Quota
- Status: Partial
- Evidence (new code):
  - features/chat/actions/stream-chat.action.ts: validates model access via entitlements and enforces daily quota
  - app/api/chat/route.ts: route path uses its own logic and does not enforce daily message quota
  - features/chat/actions/stream-chat.action.ts: symbol has no runtime callsites beyond barrel exports
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/chat/route.ts: model validation + getUserMessageCount quota checks in live route path
- Issues Found:
  - Quota/entitlement checks are implemented in streamChatAction but not in the active /api/chat route path.
  - Core requirement for chat route quota enforcement is not met end-to-end.
- Suggested Fixes:
  - Move quota + entitlement validation into app/api/chat/route.ts or route through streamChatAction.
  - Add tests proving over-quota requests are rejected on /api/chat.

#### Task 7.7b — Add Chat Route Infrastructure Enhancements
- Status: Partial
- Evidence (new code):
  - app/api/chat/route.ts: export const maxDuration = 60
  - lib/data/services/chat.service.ts: getWithMessages orders by message.createdAt
  - app/api/chat/route.ts: geolocation(request) used for city/country/lat/long hints
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/chat/route.ts: maxDuration + geolocation usage pattern
- Issues Found:
  - Geo enrichment does not explicitly process x-forwarded-for despite task requirement.
  - Ordering is chronological by createdAt but no deterministic tie-breaker for equal timestamps.
- Suggested Fixes:
  - Add explicit IP extraction from x-forwarded-for/x-real-ip and merge with Vercel geo hints.
  - Add stable tie-break ordering (e.g., createdAt + id) before stream context generation.

#### Task 7.8 — Add Artifact Route Validation & Versioning
- Status: Partial
- Evidence (new code):
  - app/api/artifacts/route.ts: UUID checks and Cache-Control private,max-age=60 on GET
  - app/api/artifacts/route.ts: parses version query in PATCH but comments note version not applied
  - app/api/artifacts/route.ts: no Content-Type vs kind validation
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/document/route.ts: UUID validation and kind mismatch checks
  - archive/oldapp/app/(chat)/api/document/route.ts: Cache-Control header on GET
- Issues Found:
  - Version parameter is not functionally applied to update semantics.
  - Content-Type validation against artifact kind is missing.
- Suggested Fixes:
  - Implement version-targeted update/create behavior in artifact service/repository APIs.
  - Validate Content-Type against allowed kinds and return 415 for mismatches.

#### Task 7.9 — Fix Vote Route Methods & Validation
- Status: Partial
- Evidence (new code):
  - app/api/votes/route.ts: PATCH method with zod payload validation and structured logging
  - app/api/votes/route.ts: response shape { success: true, messageId, type }
  - features/chat/components/message-actions.tsx: client still calls /api/vote (singular)
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/vote/route.ts: PATCH /api/vote route and response { success, messageId, type }
  - archive/oldapp/components/message-actions.tsx: client calls /api/vote
- Issues Found:
  - Client-route integration mismatch remains: UI calls /api/vote while implemented route is /api/votes.
  - Plan payload naming referenced isUpvoted; implementation uses type ('up'|'down') only.
- Suggested Fixes:
  - Add backward-compatible /api/vote alias route or migrate all client calls to /api/votes.
  - Support both payload forms (type and isUpvoted) during transition.

#### Task 7.10 — Fix Suggestion Route Query & Response
- Status: Incorrect
- Evidence (new code):
  - app/api/suggestions/route.ts: GET accepts artifactId and returns raw array
  - app/api/suggestions/route.ts: no documentVersion query handling
  - lib/data/repositories/suggestion.repository.ts: findByArtifactId has no version filter parameter
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/suggestions/route.ts: GET by documentId returns array
  - archive/oldapp/app/(chat)/api/suggestions/route.ts: no documentVersion filter either
- Issues Found:
  - documentVersion filter requirement is not implemented.
  - Required response envelope { suggestions: [...] } with metadata is not implemented.
- Suggested Fixes:
  - Add documentVersion/artifactVersion query support and filter at repository level.
  - Return structured response object with suggestions + metadata fields.

#### Task 7.11 — Integrate File Validation in Upload Route
- Status: Completed
- Evidence (new code):
  - app/api/files/upload/route.ts: validateFile(...) used before blob upload
  - app/api/files/upload/route.ts: ATTACHMENT_MAX_FILE_SIZE enforced
  - app/api/files/upload/route.ts: returns 413 for size and 415 for MIME failures
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/files/upload/route.ts: schema-based file validation before upload
  - archive/oldapp/lib/files.ts: legacy attachment MIME policy reference
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 7.12 — Add Artifact Route Body Validation
- Status: Completed
- Evidence (new code):
  - app/api/artifacts/route.ts: validateBody(request, CreateArtifactSchema) in POST
  - app/api/artifacts/route.ts: validateBody(request, UpdateArtifactSchema) in PATCH
  - app/api/artifacts/route.ts: ArtifactUUIDSchema validation for PATCH/DELETE id params
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/document/route.ts: parseJsonBodyForRoute(documentPostSchema)
  - archive/oldapp/app/(chat)/api/document/schema.ts: documentPostSchema title/content constraints
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 7.13 — Add History Route Search & Caching (Enhancement)
- Status: Completed
- Evidence (new code):
  - app/api/history/route.ts: parses q/from/to and sets Cache-Control private,max-age=30,stale-while-revalidate=60
  - features/chat/actions/get-history.action.ts: forwards searchQuery/fromDate/toDate
  - lib/data/repositories/chat.repository.ts: ilike(title), date-range filters, orderBy updatedAt DESC
- Evidence (legacy code):
  - archive/oldapp/app/(chat)/api/history/route.ts: baseline history listing without q/from/to enhancement
- Issues Found:
  - None
- Suggested Fixes:
  - None

### Phase 8: Middleware, Types & Configuration

#### Task 8.1 — Create Request Deduplication System
- Status: Completed
- Evidence (new code):
  - lib/middleware/deduplication.ts: RequestDeduplicator (inFlightRequests, checkDuplication, storeResponse, registerInFlight, clear)
  - lib/middleware/deduplication.ts: generateRequestFingerprint, deduplicateRequest, withDeduplication, DeduplicationPresets
  - lib/middleware/index.ts: deduplication exports
- Evidence (legacy code):
  - archive/oldapp/lib/middleware/deduplication.ts: RequestDeduplicator + deduplicateRequest + generateRequestFingerprint + withDeduplication + DeduplicationPresets
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 8.2 — Add Rate Limiting Algorithm Options
- Status: Completed
- Evidence (new code):
  - lib/rate-limit/rate-limiter.ts: RateLimitAlgorithm ('sliding_window' | 'token_bucket') and initializeRatelimit algorithm switch
  - lib/rate-limit/rate-limiter.ts: createTokenBucketLimiter uses Ratelimit.tokenBucket()
  - lib/rate-limit/limits.ts: chatLimiter uses algorithm 'token_bucket'; authLimiter/apiLimiter use default sliding window
- Evidence (legacy code):
  - archive/oldapp/lib/middleware/rate-limit.ts: TokenBucketLimiter and strategy-based limiter selection
- Issues Found:
  - Token bucket refill uses Math.max(1, floor(limit/window)); if reused with limit < window it can over-allow compared to configured average rate.
- Suggested Fixes:
  - Compute token-bucket parameters to preserve exact average rate across arbitrary limit/window values (e.g., interval based on window, not forced 1 token/sec).

#### Task 8.3 — Add OpenTelemetry Integration to Rate Limiting
- Status: Partial
- Evidence (new code):
  - lib/rate-limit/rate-limiter.ts: trace import and span attributes in performLimitCheck/resetLimit (rate_limit.strategy, limit, allowed, remaining, namespace, etc.)
  - lib/middleware/deduplication.ts: dedup span attributes on active span
  - lib/log.ts: structured logger outputs console/JSON logs but does not emit OpenTelemetry span events/attributes
- Evidence (legacy code):
  - archive/oldapp/lib/middleware/rate-limit.ts: OTel span attributes for rate-limit checks
  - archive/oldapp/lib/log.ts: trace.getActiveSpan + span.addEvent('log', attributes)
- Issues Found:
  - Requested logger-level OTel integration (span attributes/events alongside logs) is not present in current lib/log.ts.
  - Deduplication uses active-span attributes but no dedicated traced operation wrapper in rate-limit workflow.
- Suggested Fixes:
  - Add OpenTelemetry integration to lib/log.ts (active span event emission and attribute propagation) similar to legacy pattern.
  - Optionally wrap deduplication and rate-limit checks in explicit spans for clearer trace boundaries.

#### Task 8.4 — Add Granular Rate Limit Presets
- Status: Completed
- Evidence (new code):
  - lib/constants.ts: RATE_LIMITS.strict, RATE_LIMITS.standard, RATE_LIMITS.generous, RATE_LIMITS.authGuest
  - lib/rate-limit/limits.ts: standardLimiter, generousLimiter, authGuestLimiter and registry/convenience check functions
  - middleware.ts: /api/auth/guest route uses authGuestLimiter
- Evidence (legacy code):
  - archive/oldapp/lib/middleware/rate-limit-config.ts: STRICT/STANDARD/GENEROUS/AUTH_GUEST presets
  - archive/oldapp/lib/middleware/rate-limit.ts: presets consumed through RateLimiters
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 8.5 — Complete Middleware Composition System
- Status: Completed
- Evidence (new code):
  - lib/middleware/compose.ts: apiMiddleware composes withRateLimitMiddleware(apiLimiter) + withAuthMiddleware
  - lib/middleware/compose.ts: publicMiddleware composes withRateLimitMiddleware(apiLimiter)
  - app/api/health/route.ts: GET exported as publicMiddleware(healthHandler)
- Evidence (legacy code):
  - archive/oldapp/lib/api/guards.ts: combined auth/rate-limit guard flow (legacy composition equivalent)
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 8.6 — Fix ChatSDKError Migration
- Status: Partial
- Evidence (new code):
  - lib/errors/chat-sdk-compat.ts: ChatSDKError adapter, LegacyToNewCodeMap/NewToLegacyCodeMap, legacyCodeToAppError, createCompatErrorResponse
  - lib/errors/index.ts: compatibility adapter exports
  - lib/ai/providers.ts: legacy-format code literal used in new AppError
  - components/ui/sidebar.tsx, components/ui/carousel.tsx, features/settings/components/settings-provider.tsx: legacy-format code literals still used
- Evidence (legacy code):
  - archive/oldapp/lib/errors.ts: original ChatSDKError format and response handling
- Issues Found:
  - Compatibility adapter exists, but active code still mixes legacy-style codes with new AppError usage, so migration consistency is incomplete.
  - No evidence of runtime integration of the adapter in main error-response paths.
- Suggested Fixes:
  - Standardize active code to ErrorCodes/AppError subclasses where possible; reserve compat adapter for external/legacy boundaries.
  - If legacy codes must remain, route them through compat conversion at response boundaries and add regression tests for code mapping.

#### Task 8.7 — Fix Separator Accessibility
- Status: Completed
- Evidence (new code):
  - components/ui/separator.tsx: role, aria-orientation, and data-orientation based on orientation/decorative props
- Evidence (legacy code):
  - archive/oldapp/components/ui/separator.tsx: Radix Separator primitive with orientation/decorative semantics
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 8.8 — Fix Configuration Issues
- Status: Completed
- Evidence (new code):
  - instrumentation-client.ts: root-level placeholder export
  - package.json: test:e2e uses cross-env PLAYWRIGHT=true playwright test
  - playwright.config.ts: active Playwright config present and aligned to current /api/health startup check
- Evidence (legacy code):
  - archive/oldapp/instrumentation-client.ts: placeholder instrumentation-client file
  - archive/oldapp/package.json: legacy test script sets PLAYWRIGHT env var
  - archive/oldapp/playwright.config.ts: baseline Playwright configuration
- Issues Found:
  - None
- Suggested Fixes:
  - None

#### Task 8.9 — Fix getClientIP Export & Auth Consistency
- Status: Completed
- Evidence (new code):
  - lib/middleware/index.ts: re-export getClientIP from rate-limit module
  - lib/auth/guards.ts: requireAuth returns { session, userId }
  - lib/auth/guards.ts: requireAuthWithSession marked deprecated and delegates to requireAuth()
- Evidence (legacy code):
  - archive/oldapp/lib/api/guards.ts: requireAuth returns session/context pair
  - archive/oldapp/lib/middleware/rate-limit.ts: client IP extraction logic in middleware path
- Issues Found:
  - None
- Suggested Fixes:
  - None
