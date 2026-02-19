# AI System Functional Mapping

## Overview

The `lib/ai/` directory contains 13 TypeScript modules that form the core AI infrastructure for the Next.js AI chatbot. This document maps each module's capabilities, dependencies, and contracts.

---

## Module Summary

| Module | Lines | Purpose | Exports |
|--------|-------|---------|---------|
| [`registry.ts`](../../lib/ai/registry.ts) | 1209 | Model definitions and retrieval | 10 functions, 6 types |
| [`types.ts`](../../lib/ai/types.ts) | 218 | Type definitions | 8 types, 3 constants, 2 functions |
| [`providers.ts`](../../lib/ai/providers.ts) | 265 | Provider configurations | 7 provider instances, 4 functions |
| [`prompts.ts`](../../lib/ai/prompts.ts) | 278 | System prompts | 8 prompts, 3 functions, 3 types |
| [`chat-completion.ts`](../../lib/ai/chat-completion.ts) | 539 | Chat execution | 3 functions, 7 types |
| [`context-window.ts`](../../lib/ai/context-window.ts) | 582 | Context management | 8 functions, 5 types |
| [`token-counter.ts`](../../lib/ai/token-counter.ts) | 308 | Token counting | 5 functions, 1 type |
| [`model-discovery.ts`](../../lib/ai/model-discovery.ts) | 656 | Dynamic model discovery | 9 functions, 2 types |
| [`title-generation.ts`](../../lib/ai/title-generation.ts) | 114 | Title generation | 2 functions |
| [`constants.ts`](../../lib/ai/constants.ts) | 150 | Configuration constants | 13 constants, 3 types |
| [`entitlements.ts`](../../lib/ai/entitlements.ts) | 82 | User entitlements | 1 function, 1 type, 1 constant |
| [`models.mock.ts`](../../lib/ai/models.mock.ts) | 66 | Test mocks | 4 mock models |
| [`index.ts`](../../lib/ai/index.ts) | 201 | Barrel export | Re-exports all |

---

## Functional Mapping by Module

### 1. [`registry.ts`](../../lib/ai/registry.ts) - Model Registry

**Purpose**: Central model definition and retrieval system with reasoning model middleware support.

#### Functions

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `getModel(id: string)` | Model ID | `LanguageModelV2` | Get model instance with automatic reasoning middleware |
| `getModelById(id: string)` | Model ID | `ModelDefinition \| undefined` | Get model metadata |
| `listModels()` | - | `ModelDefinition[]` | List all available models |
| `listChatModels()` | - | `ModelDefinition[]` | List chat-capable models |
| `listModelsByCapability(capability)` | Capability key | `ModelDefinition[]` | Filter by capability |
| `isValidModelId(id: string)` | Model ID | `boolean` | Validate model existence |
| `getDefaultChatModel()` | - | `ModelDefinition \| undefined` | Get default model by priority |
| `getReasoningModel()` | - | `ModelDefinition \| undefined` | Get reasoning-capable model |
| `getDefaultArtifactModel()` | - | `ModelDefinition \| undefined` | Get artifact-capable model |
| `getReasoningTagName(reasoningType)` | ReasoningType | `string` | Get thinking tag for provider |

#### Dependencies

```
registry.ts
├── providers.ts (getProvider, providers, availableProviderIds)
├── types.ts (ModelCapabilities, ModelCapability, ModelModality, ReasoningType)
├── constants.ts (isTestEnvironment)
└── External: ai (createProviderRegistry, extractReasoningMiddleware, wrapLanguageModel)
```

#### Key Data Structure

```typescript
interface ModelDefinition {
  id: string;              // "provider:model" format
  name: string;            // Display name
  provider: string;        // Provider ID
  modelId: string;         // Actual model ID for API
  maxTokens: number;       // Max output tokens
  contextWindow: number;   // Context window size
  capabilities: ModelCapabilities;  // Legacy boolean flags
  modalities?: ModelModality[];     // Input/output types
  capabilityList?: ModelCapability[]; // New capability array
  reasoningType?: ReasoningType;    // Thinking model type
  thinkingBudget?: number;          // Reasoning token budget
}
```

---

### 2. [`providers.ts`](../../lib/ai/providers.ts) - Provider Configurations

**Purpose**: Configure and export AI provider instances with environment-based availability.

#### Provider Instances

| Export | Type | Environment Variable |
|--------|------|---------------------|
| `openai` | `OpenAI \| null` | `OPENAI_API_KEY` |
| `google` | `GoogleGenerativeAI \| null` | `GEMINI_API_KEY` |
| `xai` | `Xai \| null` | `XAI_API_KEY` |
| `openrouter` | `OpenRouter \| null` | `OPENROUTER_API_KEY` |
| `vercelGateway` | `Gateway \| null` | `AI_GATEWAY_API_KEY` |
| `cloudflareWorkers` | `WorkersAI \| null` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_KEY` |
| `cloudflareAiGateway` | `ProviderV2 \| null` | `CLOUDFLARE_AI_GATEWAY_*` |

#### Functions

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `getProvider(name: string)` | Provider name | `Provider \| null` | Get provider by ID |
| `isProviderAvailable(name: string)` | Provider name | `boolean` | Check if configured |
| `getDefaultProvider()` | - | `Provider \| null` | Get first available by priority |

#### Dependencies

```
providers.ts
├── External: @ai-sdk/* packages
├── External: @openrouter/ai-sdk-provider
├── External: ai-gateway-provider
├── External: workers-ai-provider
└── errors.ts (AppError)
```

---

### 3. [`prompts.ts`](../../lib/ai/prompts.ts) - System Prompts

**Purpose**: Centralized prompt management for consistent AI behavior.

#### Prompt Constants

| Export | Usage |
|--------|-------|
| `regularPrompt` | Base assistant behavior |
| `artifactsPrompt` | Artifact tool usage instructions |
| `codePrompt` | Python code generation |
| `sheetPrompt` | CSV generation |
| `textPrompt` | Markdown document generation |

#### Functions

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `systemPrompt(options)` | `SystemPromptOptions` | `string` | Build complete system prompt |
| `getRequestPromptFromHints(hints)` | `RequestHints` | `string` | Location context |
| `updateDocumentPrompt(content, type)` | Content, type | `string` | Generic update prompt |
| `getCodeUpdatePrompt(content)` | Content | `string` | Code update prompt |
| `getSheetUpdatePrompt(content)` | Content | `string` | Sheet update prompt |
| `getTextUpdatePrompt(content)` | Content | `string` | Text update prompt |

#### Dependencies

```
prompts.ts
└── types.ts (ModelMetadata)
```

---

### 4. [`chat-completion.ts`](../../lib/ai/chat-completion.ts) - Chat Execution

**Purpose**: Core chat streaming execution with tool support and provider options.

#### Functions

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `executeChatCompletion(params)` | `ChatCompletionParams` | `StreamResult` | Execute streaming chat |
| `getEnabledTools(model)` | `ModelDefinition` | `ToolId[]` | Get tools for model |
| `buildProviderOptions(model)` | `ModelDefinition` | `Record<string, unknown>` | Build reasoning options |

#### Key Types

```typescript
interface ChatCompletionParams {
  selectedChatModel: string;
  requestHints: RequestHints;
  requestBody: { settings?: ChatSettings };
  uiMessages: UIMessage[];
  chatId: string;
  session: AppSession;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  tokenlensCatalogPromise: Promise<ModelCatalog | undefined>;
  onUsageCalculated: (usage: AppUsage) => void;
}
```

#### Dependencies

```
chat-completion.ts
├── prompts.ts (systemPrompt, RequestHints)
├── registry.ts (getModel, getModelById, ModelDefinition)
├── types.ts (ModelMetadata)
├── features/chat/lib/tools.ts (createChatTools)
├── lib/auth/session.ts (AppSession)
├── lib/log.ts (logWarn)
└── External: ai (streamText, smoothStream, stepCountIs, convertToModelMessages)
```

---

### 5. [`context-window.ts`](../../lib/ai/context-window.ts) - Context Management

**Purpose**: Manage context windows with truncation strategies and token budgeting.

#### Functions

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `getContextWindowSize(modelId)` | Model ID | `number` | Get context window size |
| `getMaxOutputTokens(modelId)` | Model ID | `number` | Get max output tokens |
| `getTokenBudget(modelId, reserved)` | Model ID, tokens | `number` | Calculate available budget |
| `getDefaultContextConfig(modelId)` | Model ID | `ContextWindowConfig` | Get default config |
| `truncateMessages(messages, maxTokens, modelId, strategy)` | Messages, config | `TruncationResult` | Truncate to fit |
| `validateContext(messages, modelId, options)` | Messages, options | Validation result | Check if fits |
| `calculateMessagesToFit(messages, current, max, modelId)` | Messages, tokens | `number` | Count that fit |
| `getContextStats(messages, modelId)` | Messages | Stats object | Usage statistics |

#### Truncation Strategies

1. **preserve-system**: Keep system message, truncate oldest
2. **preserve-recent**: Keep most recent messages
3. **preserve-first-last**: Keep first and last, truncate middle

#### Dependencies

```
context-window.ts
├── registry.ts (getModelById, ModelDefinition)
└── token-counter.ts (calculateTokenBudget, countMessagesTokens, TokenBudget)
```

---

### 6. [`token-counter.ts`](../../lib/ai/token-counter.ts) - Token Counting

**Purpose**: Estimate token counts for context budgeting.

#### Functions

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `estimateTokens(text, charsPerToken)` | Text, ratio | `number` | Character-based estimation |
| `countTokens(text, modelId)` | Text, model | `number` | Count with model adjustment |
| `countMessageTokens(role, content, modelId)` | Message parts | `number` | Count with overhead |
| `countMessagesTokens(messages, modelId)` | Messages array | `number` | Total with conversation overhead |
| `countToolsTokens(tools, modelId)` | Tool definitions | `number` | Tool token cost |
| `calculateTokenBudget(modelId, options)` | Model, options | `TokenBudget` | Full budget breakdown |

#### Constants

```typescript
const DEFAULT_CHARS_PER_TOKEN = 4;
const TOKEN_MULTIPLIERS = {
  openai: 1.0,
  anthropic: 1.0,
  google: 1.1,
  xai: 1.0,
  openrouter: 1.0,
  "vercel-gateway": 1.0,
};
```

#### Dependencies

```
token-counter.ts
└── registry.ts (getModelById, ModelDefinition)
```

---

### 7. [`model-discovery.ts`](../../lib/ai/model-discovery.ts) - Dynamic Discovery

**Purpose**: Runtime model discovery from provider APIs with caching.

#### Functions

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `discoverOpenAI(options)` | `DiscoveryOptions` | `ProviderCatalog` | Fetch OpenAI models |
| `discoverGoogleGemini(options)` | `DiscoveryOptions` | `ProviderCatalog` | Fetch Gemini models |
| `discoverOpenRouter(options)` | `DiscoveryOptions` | `ProviderCatalog` | Fetch OpenRouter models |
| `discoverCloudflareWorkers(options)` | `DiscoveryOptions` | `ProviderCatalog` | Fetch CF models |
| `discoverProviders(options)` | `DiscoveryOptions` | `DiscoveryResult` | Parallel discovery |
| `getModelCatalog()` | - | `DiscoveryResult` | Get cached catalog |
| `refreshModelCatalog()` | - | `DiscoveryResult` | Force refresh |
| `forceRefreshModelCatalog()` | - | `DiscoveryResult` | Clear cache + refresh |
| `listProviderCatalogs(options)` | `DiscoveryOptions` | `Map<ProviderId, ModelMetadata[]>` | By-provider map |
| `clearModelCache()` | - | `void` | Clear all caches |

#### Dependencies

```
model-discovery.ts
├── constants.ts (MODEL_CACHE_TTL_MS, MODEL_DISCOVERY_TIMEOUT_MS)
├── types.ts (ModelCapability, ModelMetadata, ProviderCatalog, ProviderId)
└── errors.ts (AppError)
```

---

### 8. [`title-generation.ts`](../../lib/ai/title-generation.ts) - Title Generation

**Purpose**: Generate chat titles from user messages.

#### Functions

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `generateTitleFromUserMessage({ message })` | `UIMessage` | `Promise<string>` | AI-generated title |
| `generatePlaceholderTitle(message)` | `UIMessage` | `string` | Sync fallback title |

#### Dependencies

```
title-generation.ts
├── constants.ts (TITLE_GENERATION_MAX_TOKENS, isTestEnvironment)
├── registry.ts (getDefaultChatModel, getModel)
├── lib/log.ts (logWarn)
└── External: ai (generateText, UIMessage)
```

---

### 9. [`constants.ts`](../../lib/ai/constants.ts) - Configuration Constants

**Purpose**: Centralized configuration values.

#### Constants

| Export | Value | Purpose |
|--------|-------|---------|
| `DEFAULT_MODEL_ID` | `"openai:gpt-4o-mini"` | Default model |
| `DEFAULT_TEMPERATURE` | `0.7` | Sampling temperature |
| `DEFAULT_MAX_OUTPUT_TOKENS` | `4096` | Max output |
| `DEFAULT_TOP_P` | `0.95` | Top-p sampling |
| `MAX_CONTEXT_TOKENS` | `128000` | Max context |
| `SYSTEM_PROMPT_RESERVE_TOKENS` | `2000` | System reserve |
| `TITLE_GENERATION_MAX_TOKENS` | `80` | Title max tokens |
| `MODEL_CACHE_TTL_MS` | `3600000` | Cache TTL (1hr) |
| `MODEL_DISCOVERY_TIMEOUT_MS` | `5000` | Discovery timeout |
| `DEFAULT_MESSAGES_PER_MINUTE` | `20` | Rate limit |
| `DEFAULT_TOKENS_PER_MINUTE` | `100000` | Rate limit |
| `STREAM_CHUNK_SIZE` | `1024` | Chunk size |
| `STREAM_TIMEOUT_MS` | `30000` | Stream timeout |

---

### 10. [`entitlements.ts`](../../lib/ai/entitlements.ts) - User Entitlements

**Purpose**: Define per-user-type rate limits and model access.

#### Functions

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `getEntitlements(userType)` | `AppUserType` | `Entitlements` | Get user limits |

#### Configuration

```typescript
entitlementsByUserType = {
  guest: { maxMessagesPerDay: 20, availableChatModelIds: allModels },
  regular: { maxMessagesPerDay: 100, availableChatModelIds: allModels },
}
```

---

## Call Chain Analysis

### Chat Request Flow

```
API Route (app/api/chat/route.ts)
    │
    ├── getModel(selectedChatModel)  [registry.ts]
    │       └── getProvider(provider)  [providers.ts]
    │
    ├── systemPrompt(options)  [prompts.ts]
    │       └── getRequestPromptFromHints(hints)
    │
    ├── executeChatCompletion(params)  [chat-completion.ts]
    │       ├── getModelById(selectedChatModel)  [registry.ts]
    │       ├── buildProviderOptions(model)
    │       ├── getEnabledTools(model)
    │       ├── createChatTools(...)  [features/chat/lib/tools.ts]
    │       └── streamText({ model, system, messages, tools, ... })
    │               └── onFinish: usage calculation
    │                       └── TokenLens enrichment
    │
    └── Context validation (optional)
            ├── validateContext(messages, modelId)  [context-window.ts]
            │       └── calculateTokenBudget(...)  [token-counter.ts]
            │               └── countMessagesTokens(...)
            │                       └── countTokens(...)
            └── truncateMessages(...) if needed
```

### Model Discovery Flow

```
getModelCatalog()  [model-discovery.ts]
    │
    └── discoverProviders()
            ├── discoverOpenAI()
            ├── discoverGoogleGemini()
            ├── discoverOpenRouter()
            └── discoverCloudflareWorkers()
                    │
                    └── withCache(providerId, fetcher)
                            └── fetchJson<T>(url, options)
```

---

## Input/Output Contracts

### Core Contract: Chat Completion

```typescript
// Input
interface ChatCompletionParams {
  selectedChatModel: string;      // Required: Model ID
  requestHints: RequestHints;     // Required: Geo info
  requestBody: { settings?: ChatSettings };  // Optional settings
  uiMessages: UIMessage[];        // Required: Conversation
  chatId: string;                 // Required: Chat ID
  session: AppSession;            // Required: User session
  dataStream: UIMessageStreamWriter;  // Required: Stream writer
  tokenlensCatalogPromise: Promise<ModelCatalog | undefined>;  // Required
  onUsageCalculated: (usage: AppUsage) => void;  // Required: Callback
}

// Output: StreamResult (from AI SDK streamText)
// Side effects:
//   - Writes to dataStream
//   - Calls onUsageCalculated
//   - May call TokenLens for cost enrichment
```

### Core Contract: Model Retrieval

```typescript
// Input: Model ID string (e.g., "openai:gpt-4o")
// Output: LanguageModelV2 instance
// Side effects:
//   - May wrap with reasoning middleware
//   - Returns mock in test environment
// Throws: Never (returns fallback from providerRegistry)
```

---

## Dependency Graph

```
                    ┌─────────────┐
                    │  index.ts   │ (Barrel export)
                    └──────┬──────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ constants.ts│     │   types.ts  │     │ providers.ts│
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                   │
                           ▼                   │
                    ┌─────────────┐            │
                    │ registry.ts │◄───────────┘
                    └──────┬──────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ prompts.ts  │     │token-counter│     │ entitlements│
└──────┬──────┘     └──────┬──────┘     └─────────────┘
       │                   │
       │                   ▼
       │            ┌─────────────┐
       │            │context-window│
       │            └──────┬──────┘
       │                   │
       ▼                   ▼
┌─────────────────────────────────────┐
│        chat-completion.ts            │
└─────────────────────────────────────┘
```

---

## Recommendations

1. **Reduce Registry Size**: The 1209-line [`registry.ts`](../../lib/ai/registry.ts) contains 50+ model definitions. Consider extracting to JSON configuration.

2. **Consolidate Token Counting**: Token counting logic is split between [`token-counter.ts`](../../lib/ai/token-counter.ts) and [`context-window.ts`](../../lib/ai/context-window.ts). Consider unifying.

3. **Extract Model Definitions**: Move `curatedModels` array to a separate data file for easier maintenance.

4. **Simplify Provider Options**: The `buildProviderOptions` function has 5 switch cases - consider a strategy pattern.
