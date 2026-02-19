# Phase 1: AI Core & Chat Streaming — Detailed Review (Multi-Agent, Chunked)

- Date: 2026-02-18
- Phase: Phase 1: AI Core & Chat Streaming
- Task count: 13
- Chunk files: P1-C1, P1-C2, P1-C3

## Summary

- Status counts: Completed=7, Partial=4, Incorrect=2, Missing=0
- Difference counts: defect=3, partial=3, other-problem=0, improvement=1, no-difference=6

## Task Matrix

| Task | Name | Status | Difference Type | Detail |
|---|---|---|---|---|
| 1.1 | Create AI Configuration Constants | Completed | no-difference | Implemented required AI constants module and replaced sampling magic numbers in settings with constants imports, matching plan and legacy behavior. |
| 1.2 | Create AI Model Catalog Types & ProviderId | Partial | partial | `lib/ai/types.ts` includes the required unions and catalog metadata, but `lib/ai/registry.ts` still uses legacy boolean `ModelCapabilities` as the primary capability shape instead of migrating to rich typed capability metadata. |
| 1.3 | Create System Prompts Module | Completed | no-difference | Centralized prompts module is present with required prompt exports and system prompt builder; artifact handlers import prompts from `lib/ai/prompts.ts` instead of inline prompt strings. |
| 1.4 | Create Chat Completion Executor | Completed | no-difference | `executeChatCompletion` is implemented with `streamText`, enabled tool gating, provider options, timeout via `AbortSignal.timeout(55_000)`, smooth streaming, and usage reporting in `onFinish`, with exported `ChatCompletionParams`. |
| 1.5 | Create Title Generation Module | Completed | no-difference | Title generation module exists with async AI title generation plus fallback text extraction and placeholder title generation bounded by `TITLE_GENERATION_MAX_TOKENS`. |
| 1.6 | Wire Tools into Chat Pipeline & Fix Capabilities | Incorrect | defect | Tool wiring exists, but `requestSuggestions` is effectively downgraded in the chat pipeline: `createChatTools()` is called without a model, triggering placeholder-only behavior in `suggestions.tool.ts` instead of AI-generated suggestions. Memory log marks task completed, but runtime behavior differs from plan/legacy intent. |
| 1.7 | Add Reasoning Model Middleware Support | Completed | improvement | Objective is met with a v6-adapted implementation in `lib/ai/registry.ts` (not `providers.ts`): reasoning tag mapping, middleware wrapping, and test-environment mock handling are present and active at model resolution time. |
| 1.8 | Fix Artifact Handler Placeholder Model Strings | Incorrect | defect | Handlers correctly switched to `getModel("artifact-model")`, but `artifact-model` is only handled in test mode; there is no production alias/registration, so artifact generation/update can fail at runtime. Memory log marks completed, but plan step 5 remains unmet. |
| 1.9 | Implement Chat POST AI Execution & Streaming | Partial | partial | Core route streaming is implemented (`executeChatCompletion`, `createUIMessageStream`, SSE transform, title event). However, required `stream-chat.action.ts` integration is not present, and usage is only logged, not persisted as `AppUsage` in save flow. |
| 1.10 | Create User Model Entitlements | Completed | no-difference | Entitlements module is present with expected type, guest/regular limits (20/100), model list mapping, and `getEntitlements(userType)` export; behavior aligns with plan and legacy implementation. |
| 1.11 | Add Cloudflare Providers | Completed | no-difference | Cloudflare Workers AI and Cloudflare AI Gateway providers are implemented with gateway-supported Gemini list and primary+fallback behavior, matching plan and legacy behavior. |
| 1.12 | Expand Curated Model List | Partial | partial | Model catalog is expanded to 35 curated entries (including free OpenRouter, Claude 3.7, title model, image/video models), but Task 1.12 step 5 is not fully met because registry still uses legacy boolean capabilities as primary shape instead of ModelMetadata-first typing. |
| 1.13 | Create Dynamic Model Discovery | Partial | defect | Discovery module and required functions exist, but runtime enablement is incomplete because registry remains static and discovery is not consumed by model selection paths; additionally, cache/timeout logic has defects. |

## Defect Items

### 1.6 — Wire Tools into Chat Pipeline & Fix Capabilities (Incorrect)
- Detail: Tool wiring exists, but `requestSuggestions` is effectively downgraded in the chat pipeline: `createChatTools()` is called without a model, triggering placeholder-only behavior in `suggestions.tool.ts` instead of AI-generated suggestions. Memory log marks task completed, but runtime behavior differs from plan/legacy intent.
- Issues:
  - `requestSuggestions` receives no model in the main chat path and falls back to placeholder suggestions.
  - Task memory log says Completed, but observed behavior does not fully match oldapp/plan expectations for AI-backed suggestions.
- Suggested fixes:
  - Pass an artifact-capable model when creating tools in `executeChatCompletion` (e.g., via `createChatTools({ ..., model: getModel("artifact-model") })`).
  - Make suggestion-model availability explicit (required or guaranteed default) to prevent silent placeholder fallback in production.
- Evidence (new):
  - lib/ai/chat-completion.ts#L364-L369
  - features/chat/lib/tools/suggestions.tool.ts#L104-L124
  - features/chat/lib/tools/suggestions.tool.ts#L173-L183
  - features/chat/lib/tools/create-document.tool.ts#L103-L114
  - features/chat/lib/tools/update-document.tool.ts#L96-L109
- Evidence (legacy):
  - archive/oldapp/lib/ai/chat-completion.ts#L170-L177
  - archive/oldapp/lib/ai/tools/request-suggestions.ts#L45-L45
- Plan refs:
  - .apm/Implementation_Plan.md#L111-L121
  - .apm/Memory/Phase_01_ai_core_chat_streaming/Task_1_6_wire_tools_chat_pipeline.md

### 1.8 — Fix Artifact Handler Placeholder Model Strings (Incorrect)
- Detail: Handlers correctly switched to `getModel("artifact-model")`, but `artifact-model` is only handled in test mode; there is no production alias/registration, so artifact generation/update can fail at runtime. Memory log marks completed, but plan step 5 remains unmet.
- Issues:
  - `artifact-model` alias is not resolved in production path of `getModel()`.
  - Artifact handlers now rely on an ID that is effectively test-only in current registry logic.
- Suggested fixes:
  - Add production resolution for `artifact-model` in `lib/ai/registry.ts` (map to a concrete default artifact model ID before provider resolution).
  - Alternatively register a curated model entry with ID `artifact-model` that points to a valid provider/modelId pair.
- Evidence (new):
  - features/artifact/handlers/code.handler.ts#L52-L52
  - features/artifact/handlers/text.handler.ts#L44-L44
  - features/artifact/handlers/sheet.handler.ts#L52-L52
  - lib/ai/registry.ts#L1099-L1099
  - lib/ai/registry.ts#L1137-L1137
- Evidence (legacy):
  - archive/oldapp/lib/ai/providers.ts#L69-L70
- Plan refs:
  - .apm/Implementation_Plan.md#L132-L142
  - .apm/Memory/Phase_01_ai_core_chat_streaming/Task_1_8_artifact_handler_model_strings.md

### 1.13 — Create Dynamic Model Discovery (Partial)
- Detail: Discovery module and required functions exist, but runtime enablement is incomplete because registry remains static and discovery is not consumed by model selection paths; additionally, cache/timeout logic has defects.
- Issues:
  - `discoverProviders` global-cache short-circuit is effectively disabled by `isCacheValid(null)`, making that branch unreachable.
  - Abort timeout controller is created but its signal is not propagated to discovery fetches (`discoverers.map((d) => d.run())` ignores controller signal), so timeout protection is ineffective.
  - Runtime model list path remains static (`listModels()` returns filtered curated array only), so dynamic discovery results do not affect active catalog selection.
- Suggested fixes:
  - Fix cache guard to validate `globalCatalogCache` directly and short-circuit when still within TTL.
  - Thread timeout signal into provider discovery calls (or pass merged signal into each fetch call) so `MODEL_DISCOVERY_TIMEOUT_MS` is enforced.
  - Integrate `getModelCatalog`/`refreshModelCatalog` output into registry selection (`listModels`, `getModelById`) to truly enable runtime discovery.
- Evidence (new):
  - lib/ai/model-discovery.ts#L180-L506
  - lib/ai/model-discovery.ts#L511-L650
  - lib/ai/model-discovery.ts#L516
  - lib/ai/model-discovery.ts#L539-L548
  - lib/ai/index.ts#L188-L199
  - lib/ai/registry.ts#L1017-L1018
- Evidence (legacy):
  - archive/oldapp/lib/ai/model-discovery.ts#L1-L407
  - archive/oldapp/lib/ai/model-registry.ts#L174-L282
- Plan refs:
  - .apm/Implementation_Plan.md#L187-L199
  - .apm/Memory/Phase_01_ai_core_chat_streaming/Task_1_13_dynamic_model_discovery.md

## Partial Items

### 1.2 — Create AI Model Catalog Types & ProviderId (Partial)
- Detail: `lib/ai/types.ts` includes the required unions and catalog metadata, but `lib/ai/registry.ts` still uses legacy boolean `ModelCapabilities` as the primary capability shape instead of migrating to rich typed capability metadata.
- Issues:
  - `lib/ai/registry.ts` still defines `ModelDefinition.capabilities` as `ModelCapabilities` (boolean flags), leaving Task 1.2 step 6 incomplete.
- Suggested fixes:
  - Refactor `ModelDefinition` and curated model entries in `lib/ai/registry.ts` to use `ModelCapability[]`/metadata as canonical, and derive legacy booleans only for compatibility consumers.
- Evidence (new):
  - lib/ai/types.ts#L18-L199
  - lib/ai/registry.ts#L67
  - lib/ai/registry.ts#L77
  - lib/ai/registry.ts#L106-L115
- Evidence (legacy):
  - archive/oldapp/lib/ai/model-catalog-types.ts#L3-L58
  - archive/oldapp/lib/ai/provider-info.ts#L1-L16
- Plan refs:
  - .apm/Implementation_Plan.md#L66-L76
  - .apm/Memory/Phase_01_ai_core_chat_streaming/Task_1_2_model_catalog_types.md

### 1.9 — Implement Chat POST AI Execution & Streaming (Partial)
- Detail: Core route streaming is implemented (`executeChatCompletion`, `createUIMessageStream`, SSE transform, title event). However, required `stream-chat.action.ts` integration is not present, and usage is only logged, not persisted as `AppUsage` in save flow.
- Issues:
  - `features/chat/actions/stream-chat.action.ts` does not call `executeChatCompletion()` or build a `UIMessageStream` as specified.
  - `onUsageCalculated` in route logs token usage but no persistence field exists in `SaveChatParams`/chat save path.
- Suggested fixes:
  - Implement or delegate AI execution/stream creation in `stream-chat.action.ts` per task scope, then reuse from route.
  - Extend save pipeline to accept/store `AppUsage` (service + persistence layer), and pass captured usage from streaming onFinish path.
- Evidence (new):
  - app/api/chat/route.ts#L13-L13
  - app/api/chat/route.ts#L311-L320
  - app/api/chat/route.ts#L485-L485
  - features/chat/actions/stream-chat.action.ts#L130-L258
  - lib/data/services/chat.service.ts#L49-L61
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/chat/route.ts#L219-L230
  - archive/oldapp/app/(chat)/api/chat/route.ts#L261-L270
- Plan refs:
  - .apm/Implementation_Plan.md#L143-L155
  - .apm/Memory/Phase_01_ai_core_chat_streaming/Task_1_9_chat_post_ai_streaming.md

### 1.12 — Expand Curated Model List (Partial)
- Detail: Model catalog is expanded to 35 curated entries (including free OpenRouter, Claude 3.7, title model, image/video models), but Task 1.12 step 5 is not fully met because registry still uses legacy boolean capabilities as primary shape instead of ModelMetadata-first typing.
- Issues:
  - Registry model shape remains ModelDefinition with legacy boolean `capabilities` as the primary field; `ModelMetadata` rich capability arrays are only duplicated via optional `capabilityList`/`modalities`, not the core contract requested in Task 1.12 step 5.
- Suggested fixes:
  - Make curated catalog ModelMetadata-first (from lib/ai/types.ts), then derive legacy booleans via adapter functions only at compatibility boundaries.
  - Replace parallel `capabilities`+`capabilityList` dual-shape with a single authoritative capability representation to avoid drift.
- Evidence (new):
  - lib/ai/registry.ts#L95-L935
  - lib/ai/registry.ts#L243
  - lib/ai/registry.ts#L516
  - lib/ai/registry.ts#L890-L932
  - lib/ai/registry.ts#L1017-L1018
  - lib/ai/types.ts#L83-L117
- Evidence (legacy):
  - archive/oldapp/lib/ai/curated-models.ts#L1-L582
- Plan refs:
  - .apm/Implementation_Plan.md#L176-L186
  - .apm/Memory/Phase_01_ai_core_chat_streaming/Task_1_12_expand_curated_model_list.md

## Other-Problem Items

- None

## Improvement Items

### 1.7 — Add Reasoning Model Middleware Support (Completed)
- Detail: Objective is met with a v6-adapted implementation in `lib/ai/registry.ts` (not `providers.ts`): reasoning tag mapping, middleware wrapping, and test-environment mock handling are present and active at model resolution time.
- Evidence (new):
  - lib/ai/registry.ts#L974-L991
  - lib/ai/registry.ts#L1078-L1104
  - lib/ai/registry.ts#L1120-L1129
- Evidence (legacy):
  - archive/oldapp/lib/ai/providers.ts#L17-L34
  - archive/oldapp/lib/ai/providers.ts#L79-L84
- Plan refs:
  - .apm/Implementation_Plan.md#L122-L131
  - .apm/Memory/Phase_01_ai_core_chat_streaming/Task_1_7_reasoning_model_middleware.md

## No-Difference Items

### 1.1 — Create AI Configuration Constants (Completed)
- Detail: Implemented required AI constants module and replaced sampling magic numbers in settings with constants imports, matching plan and legacy behavior.
- Evidence (new):
  - lib/ai/constants.ts#L18-L148
  - features/settings/types.ts#L10-L13
  - features/settings/types.ts#L279-L281
- Evidence (legacy):
  - archive/oldapp/lib/ai/constants.ts#L11-L65
- Plan refs:
  - .apm/Implementation_Plan.md#L55-L64
  - .apm/Memory/Phase_01_ai_core_chat_streaming/Task_1_1_ai_configuration_constants.md

### 1.3 — Create System Prompts Module (Completed)
- Detail: Centralized prompts module is present with required prompt exports and system prompt builder; artifact handlers import prompts from `lib/ai/prompts.ts` instead of inline prompt strings.
- Evidence (new):
  - lib/ai/prompts.ts#L21-L251
  - features/artifact/handlers/code.handler.ts#L12
  - features/artifact/handlers/sheet.handler.ts#L12
  - features/artifact/handlers/text.handler.ts#L11
- Evidence (legacy):
  - archive/oldapp/lib/ai/prompts.ts#L6-L215
- Plan refs:
  - .apm/Implementation_Plan.md#L78-L88
  - .apm/Memory/Phase_01_ai_core_chat_streaming/Task_1_3_system_prompts_module.md

### 1.4 — Create Chat Completion Executor (Completed)
- Detail: `executeChatCompletion` is implemented with `streamText`, enabled tool gating, provider options, timeout via `AbortSignal.timeout(55_000)`, smooth streaming, and usage reporting in `onFinish`, with exported `ChatCompletionParams`.
- Evidence (new):
  - lib/ai/chat-completion.ts#L116-L138
  - lib/ai/chat-completion.ts#L163-L255
  - lib/ai/chat-completion.ts#L342-L445
  - lib/ai/chat-completion.ts#L399-L401
- Evidence (legacy):
  - archive/oldapp/lib/ai/chat-completion.ts#L49-L121
  - archive/oldapp/lib/ai/chat-completion.ts#L146-L239
- Plan refs:
  - .apm/Implementation_Plan.md#L90-L101
  - .apm/Memory/Phase_01_ai_core_chat_streaming/Task_1_4_chat_completion_executor.md

### 1.5 — Create Title Generation Module (Completed)
- Detail: Title generation module exists with async AI title generation plus fallback text extraction and placeholder title generation bounded by `TITLE_GENERATION_MAX_TOKENS`.
- Evidence (new):
  - lib/ai/title-generation.ts#L55-L76
  - lib/ai/title-generation.ts#L96-L112
  - lib/ai/title-generation.ts#L67
- Evidence (legacy):
  - archive/oldapp/lib/ai/title-generation.ts#L12-L50
  - archive/oldapp/lib/ai/title-generation.ts#L54-L67
- Plan refs:
  - .apm/Implementation_Plan.md#L103-L108
  - .apm/Memory/Phase_01_ai_core_chat_streaming/Task_1_5_title_generation_module.md

### 1.10 — Create User Model Entitlements (Completed)
- Detail: Entitlements module is present with expected type, guest/regular limits (20/100), model list mapping, and `getEntitlements(userType)` export; behavior aligns with plan and legacy implementation.
- Evidence (new):
  - lib/ai/entitlements.ts#L21-L24
  - lib/ai/entitlements.ts#L46-L60
  - lib/ai/entitlements.ts#L80-L81
- Evidence (legacy):
  - archive/oldapp/lib/ai/entitlements.ts#L4-L6
  - archive/oldapp/lib/ai/entitlements.ts#L11-L25
- Plan refs:
  - .apm/Implementation_Plan.md#L156-L163
  - .apm/Memory/Phase_01_ai_core_chat_streaming/Task_1_10_user_model_entitlements.md

### 1.11 — Add Cloudflare Providers (Completed)
- Detail: Cloudflare Workers AI and Cloudflare AI Gateway providers are implemented with gateway-supported Gemini list and primary+fallback behavior, matching plan and legacy behavior.
- Evidence (new):
  - lib/ai/providers.ts#L16-L18
  - lib/ai/providers.ts#L89-L95
  - lib/ai/providers.ts#L106-L110
  - lib/ai/providers.ts#L125-L178
  - lib/ai/providers.ts#L199-L200
  - package.json
- Evidence (legacy):
  - archive/oldapp/lib/ai/model-registry.ts#L85-L160
- Plan refs:
  - .apm/Implementation_Plan.md#L165-L174
  - .apm/Memory/Phase_01_ai_core_chat_streaming/Task_1_11_cloudflare_providers.md
