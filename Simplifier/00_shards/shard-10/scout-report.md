# Scout Report: Shard 10 - lib/ai/**

**Shard ID:** 10
**Scope:** AI Integration Layer
**Generated:** 2026-02-19

---

## Metrics Summary

| Files in shard          | 13 |
| Total LOC               | 4861 |
| Exports catalogued      | 67 |
| Cross-shard edges found | 9 |
| Issues flagged          | 12 |
| Critical complexity (>10)| 0 |

---

## File Inventory

### 1. registry.ts
- **Path:** `lib/ai/registry.ts`
- **Size:** 1354 LOC
- **Classification:** Domain logic / Entry point
- **Cyclomatic complexity:** Low-Medium (individual functions simple, but large data structures)
- **Public exports:**
  - Types: `ModelDefinition`
  - Functions: `getDefaultArtifactModel`, `getDefaultChatModel`, `getModel`, `getModelById`, `getReasoningModel`, `isValidModelId`, `listChatModels`, `listModels`, `listModelsByCapability`, `getReasoningTagName`
  - Re-exports from types.ts: `ModelCapabilities`, `ModelCapability`, `ModelMetadata`, `ModelModality`, `ProviderId`, `ReasoningType`, `fromLegacyCapabilities`, `PROVIDER_DISPLAY_NAMES`, `toLegacyCapabilities`
- **Imports:**
  - Internal: `./model-discovery`, `./providers`, `./types`
  - External: `@/lib/constants`, `ai`, `@ai-sdk/provider`
- **Notes:** Contains massive `curatedModelSeed` array (842 lines of model definitions). Consider externalizing to JSON.

### 2. index.ts
- **Path:** `lib/ai/index.ts`
- **Size:** 202 LOC
- **Classification:** Entry point (barrel file)
- **Cyclomatic complexity:** N/A
- **Public exports:** Re-exports all items from sub-modules
- **Imports:** All internal ai/ modules
- **Notes:** Clean barrel file pattern. No logic.

### 3. chat-completion.ts
- **Path:** `lib/ai/chat-completion.ts`
- **Size:** 541 LOC
- **Classification:** Domain logic / Entry point
- **Cyclomatic complexity:** Medium (executeChatCompletion has nested conditionals)
- **Public exports:**
  - Types: `AppUsage`, `ChatCompletionParams`, `ChatMessage`, `ChatSettings`, `CustomUIDataTypes`, `MessageMetadata`, `UsageData`
  - Functions: `buildProviderOptions`, `executeChatCompletion`, `getEnabledTools`
- **Imports:**
  - Internal: `./prompts`, `./registry`, `./types`
  - External: `ai`, `@ai-sdk/provider`, `tokenlens/core`
  - **Cross-shard:** `@/features/chat/lib/tools`, `@/lib/auth/session`, `@/lib/log`
- **Notes:** `executeChatCompletion` is a large orchestrator function (~200 lines).

### 4. prompts.ts
- **Path:** `lib/ai/prompts.ts`
- **Size:** 282 LOC
- **Classification:** Domain logic
- **Cyclomatic complexity:** Low
- **Public exports:**
  - Types: `ArtifactKindForPrompt`, `RequestHints`, `SystemPromptOptions`
  - Constants: `artifactsPrompt`, `codePrompt`, `regularPrompt`, `sheetPrompt`, `textPrompt`
  - Functions: `getCodeUpdatePrompt`, `getRequestPromptFromHints`, `getSheetUpdatePrompt`, `getTextUpdatePrompt`, `systemPrompt`, `updateDocumentPrompt`
- **Imports:** Internal: `./types`
- **Notes:** Well-structured prompt module. Good separation of concerns.

### 5. providers.ts
- **Path:** `lib/ai/providers.ts`
- **Size:** 269 LOC
- **Classification:** Config
- **Cyclomatic complexity:** Low
- **Public exports:**
  - Constants: `openai`, `google`, `xai`, `openrouter`, `vercelGateway`, `cloudflareWorkers`, `cloudflareAiGateway`, `providers`, `availableProviderIds`
  - Functions: `getProvider`, `isProviderAvailable`, `getDefaultProvider`
- **Imports:**
  - External: Multiple AI SDK providers
  - **Cross-shard:** `@/lib/errors`
- **Notes:** Uses `any` type for provider interfaces. `cloudflareAiGateway` has embedded validation logic.

### 6. model-discovery.ts
- **Path:** `lib/ai/model-discovery.ts`
- **Size:** 686 LOC
- **Classification:** Domain logic
- **Cyclomatic complexity:** Medium
- **Public exports:**
  - Types: `DiscoveryOptions`, `DiscoveryResult`
  - Functions: `discoverOpenAI`, `discoverGoogleGemini`, `discoverOpenRouter`, `discoverCloudflareWorkers`, `discoverProviders`, `getModelCatalog`, `refreshModelCatalog`, `forceRefreshModelCatalog`, `listProviderCatalogs`, `clearModelCache`
- **Imports:**
  - Internal: `./constants`, `./types`
  - **Cross-shard:** `@/lib/errors`
- **Notes:** Good caching implementation. Parallel discovery with `Promise.allSettled`.

### 7. entitlements.ts
- **Path:** `lib/ai/entitlements.ts`
- **Size:** 83 LOC
- **Classification:** Domain logic
- **Cyclomatic complexity:** Low
- **Public exports:**
  - Types: `Entitlements`
  - Constants: `entitlementsByUserType`
  - Functions: `getEntitlements`
- **Imports:**
  - Internal: `./registry`
  - **Cross-shard:** `@/lib/auth/session`
- **Notes:** Simple module. May have unused export `entitlementsByUserType`.

### 8. models.mock.ts
- **Path:** `lib/ai/models.mock.ts`
- **Size:** 67 LOC
- **Classification:** Test utility
- **Cyclomatic complexity:** Low
- **Public exports:** `mockChatModel`, `mockReasoningModel`, `mockTitleModel`, `mockArtifactModel`
- **Imports:** External: `ai/test`
- **Notes:** Used only in test environment. Uses `require()` in registry.ts:1195.

### 9. title-generation.ts
- **Path:** `lib/ai/title-generation.ts`
- **Size:** 115 LOC
- **Classification:** Domain logic
- **Cyclomatic complexity:** Low
- **Public exports:** `generateTitleFromUserMessage`, `generatePlaceholderTitle`
- **Imports:**
  - Internal: `./constants`, `./registry`
  - **Cross-shard:** `@/lib/constants`, `@/lib/log`
- **Notes:** Clean separation of AI generation vs fallback.

### 10. types.ts
- **Path:** `lib/ai/types.ts`
- **Size:** 219 LOC
- **Classification:** Type definitions
- **Cyclomatic complexity:** N/A
- **Public exports:**
  - Types: `ProviderId`, `ModelCapability`, `ModelModality`, `ReasoningType`, `ModelSource`, `ModelMetadata`, `ProviderCatalog`, `ModelCatalogResponse`, `ModelCapabilities`
  - Constants: `PROVIDER_DISPLAY_NAMES`
  - Functions: `toLegacyCapabilities`, `fromLegacyCapabilities`
- **Imports:** None
- **Notes:** Core type definitions. Includes legacy compatibility layer.

### 11. constants.ts
- **Path:** `lib/ai/constants.ts`
- **Size:** 151 LOC
- **Classification:** Config
- **Cyclomatic complexity:** N/A
- **Public exports:**
  - Types: `SupportedProviderId`, `ModelCategoryKey`, `ModelCategoryValue`
  - Constants: `DEFAULT_MODEL_ID`, `DEFAULT_TEMPERATURE`, `DEFAULT_MAX_OUTPUT_TOKENS`, `DEFAULT_TOP_P`, `MAX_CONTEXT_TOKENS`, `SYSTEM_PROMPT_RESERVE_TOKENS`, `TITLE_GENERATION_MAX_TOKENS`, `MODEL_CACHE_TTL_MS`, `MODEL_DISCOVERY_TIMEOUT_MS`, `DEFAULT_MESSAGES_PER_MINUTE`, `DEFAULT_TOKENS_PER_MINUTE`, `STREAM_CHUNK_SIZE`, `STREAM_TIMEOUT_MS`, `SUPPORTED_PROVIDERS`, `MODEL_CATEGORIES`
- **Imports:** None
- **Notes:** Good centralization of constants.

### 12. context-window.ts
- **Path:** `lib/ai/context-window.ts`
- **Size:** 583 LOC
- **Classification:** Domain logic
- **Cyclomatic complexity:** Medium
- **Public exports:**
  - Types: `ContextMessage`, `TruncationStrategy`, `TruncationResult`, `ContextWindowConfig`, `ValidateContextOptions`
  - Functions: `getContextWindowSize`, `getMaxOutputTokens`, `getTokenBudget`, `getDefaultContextConfig`, `truncateMessages`, `validateContext`, `calculateMessagesToFit`, `getContextStats`
- **Imports:** Internal: `./registry`, `./token-counter`
- **Notes:** Well-structured truncation strategies. Multiple private helper functions.

### 13. token-counter.ts
- **Path:** `lib/ai/token-counter.ts`
- **Size:** 309 LOC
- **Classification:** Utility
- **Cyclomatic complexity:** Low
- **Public exports:**
  - Types: `TokenBudget`
  - Functions: `estimateTokens`, `countTokens`, `countMessageTokens`, `countMessagesTokens`, `countToolsTokens`, `calculateTokenBudget`
- **Imports:** Internal: `./registry`
- **Notes:** Estimation-based token counting. Could benefit from actual tokenizer integration.

---

## Cross-Shard Dependency Edges

| Source File | Target Module | Direction |
|-------------|---------------|-----------|
| `chat-completion.ts` | `@/features/chat/lib/tools` | Outbound |
| `chat-completion.ts` | `@/lib/auth/session` | Outbound |
| `chat-completion.ts` | `@/lib/log` | Outbound |
| `providers.ts` | `@/lib/errors` | Outbound |
| `model-discovery.ts` | `@/lib/errors` | Outbound |
| `title-generation.ts` | `@/lib/constants` | Outbound |
| `title-generation.ts` | `@/lib/log` | Outbound |
| `entitlements.ts` | `@/lib/auth/session` | Outbound |
| `registry.ts` | `@/lib/constants` | Outbound |

---

## Intra-Shard Pattern Flags

### Duplicate Logic Patterns

1. **Model resolution pattern duplicated** (context-window.ts:94, token-counter.ts:100)
   ```typescript
   const model = typeof modelId === "string" ? getModelById(modelId) : modelId
   ```
   - Appears in 6+ locations across context-window.ts and token-counter.ts
   - **Recommendation:** Extract to shared helper `resolveModelDefinition(modelId: string | ModelDefinition): ModelDefinition`

2. **Optional property assignment pattern** (multiple files)
   - Files: model-discovery.ts:183-195, chat-completion.ts:282-287, chat-completion.ts:385-390
   - Pattern: Check if value !== undefined before adding to object
   - Not a duplication issue, but could use helper for cleaner code

### Redundant Type Definitions

3. **Provider ID types inconsistency**
   - `types.ts:18-25` defines `ProviderId` with 7 providers
   - `constants.ts:113-120` defines `SUPPORTED_PROVIDERS` with 6 different providers (includes "anthropic", "gateway" but not "cloudflare-workers", "cloudflare-ai-gateway")
   - **Recommendation:** Unify into single source of truth

### Naming Inconsistencies

4. **Mixed naming for similar concepts**
   - `ModelCapability` vs `capabilities` field
   - `tools` in legacy `ModelCapabilities` vs `tooling` in `ModelCapability`
   - `contextWindow` vs `MAX_CONTEXT_TOKENS` constant name style

### Functions with Multiple Responsibilities

5. **executeChatCompletion** (chat-completion.ts:342-540)
   - Lines: 342-540 (~200 lines)
   - Responsibilities: Model resolution, tool preparation, system prompt building, provider options, streaming, usage tracking
   - **Recommendation:** Extract into smaller orchestration functions

6. **discoverProviders** (model-discovery.ts:512-619)
   - Lines: 512-619
   - Responsibilities: Cache checking, timeout management, parallel execution, error aggregation, result caching
   - Moderate complexity but well-structured

### Provider Abstraction Issues

7. **Use of `any` type** (providers.ts:196, 228, 249)
   ```typescript
   export const providers: Record<string, any>
   export function getProvider(name: string): any
   export function getDefaultProvider(): any
   ```
   - **Recommendation:** Define proper provider interface or use `ProviderV2 | null`

8. **Embedded validation in provider** (providers.ts:140-155)
   - `cloudflareAiGateway` has model validation logic embedded in `languageModel()` method
   - **Recommendation:** Extract validation to separate function

### Potential Dead Code

9. **entitlementsByUserType** (entitlements.ts:46)
   - Exported but may not be consumed outside module
   - **Recommendation:** Verify usage across codebase

10. **Legacy compatibility types** (types.ts:169-180)
    - `ModelCapabilities` interface marked as `@deprecated`
    - Still in use via `curatedModelSeed` in registry.ts
    - **Recommendation:** Complete migration to `ModelCapability[]`

### Code Quality Issues

11. **Dynamic require in ESM context** (registry.ts:1195-1200)
    ```typescript
    const { mockArtifactModel, mockChatModel, ... } = require("./models.mock")
    ```
    - Non-standard for ESM modules
    - **Recommendation:** Use conditional static import or dynamic `import()`

12. **Large data structure inline** (registry.ts:102-942)
    - `curatedModelSeed` array spans 840 lines
    - **Recommendation:** Externalize to JSON configuration file

---

## Architecture Observations

### Positive Patterns
- Clean barrel file pattern in index.ts
- Good separation between types, constants, and logic
- Legacy compatibility layer with deprecation notice
- Comprehensive token counting utilities
- Multiple truncation strategies in context-window.ts

### Areas for Improvement
- Model resolution pattern should be centralized
- Provider types need proper TypeScript definitions
- Large inline data structures reduce maintainability
- executeChatCompletion could benefit from composition

---

## No Critical Complexity Issues

All individual functions have cyclomatic complexity below threshold of 10. The main concern is file size and data structure management, not algorithmic complexity.

---

## Recommendations Summary

1. **Extract shared helper:** `resolveModelDefinition()` for model ID resolution
2. **Unify provider types:** Merge `ProviderId` and `SupportedProviderId`
3. **Externalize model catalog:** Move `curatedModelSeed` to JSON
4. **Refactor executeChatCompletion:** Break into smaller orchestration functions
5. **Replace `any` types:** Use proper provider interfaces
6. **Convert require to import:** Fix ESM compatibility in registry.ts

---

**End of Scout Report**
