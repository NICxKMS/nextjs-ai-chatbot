# AI System Pattern Consistency Analysis

## Overview

This document analyzes the patterns used across `lib/ai/` modules, identifying inconsistencies and providing recommendations for standardization.

---

## 1. Error Handling Patterns

### Current Patterns

#### Pattern A: Throw AppError (Preferred)

```typescript
// model-discovery.ts lines 148-154
const fetchJson = async <T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init)
  if (!response.ok) {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      `Failed to fetch ${input.toString()}: ${response.status}`,
      response.status,
    )
  }
  return response.json() as Promise<T>
}

// model-discovery.ts lines 216-221
if (!apiKey) {
  throw new AppError(
    "CONFIGURATION_ERROR",
    "OPENAI_API_KEY is not configured",
    500,
  )
}
```

#### Pattern B: Throw Error (Legacy)

```typescript
// token-counter.ts lines 276-277
if (!model) {
  throw new Error(`Model not found: ${modelId}`)
}
```

#### Pattern C: Return null/undefined (Safe)

```typescript
// registry.ts lines 1048-1050
export function getModelById(id: string): ModelDefinition | undefined {
  return listModels().find((model) => model.id === id)
}

// providers.ts lines 225-227
export function getProvider(name: string): any {
  return providers[name] ?? null
}
```

#### Pattern D: Try-catch with fallback

```typescript
// title-generation.ts lines 60-79
try {
  const model = getTitleModel()
  const { text: title } = await generateText({ ... })
  return title || "New Chat"
} catch (error) {
  logWarn("Title generation failed, using fallback", { error, messageId: message.id })
  return generatePlaceholderTitle(message)
}
```

### Consistency Issues

| Module | Pattern Used | Should Be |
|--------|--------------|-----------|
| `model-discovery.ts` | AppError | AppError (correct) |
| `token-counter.ts` | Error | AppError |
| `registry.ts` | Return undefined | Return undefined (correct for lookups) |
| `providers.ts` | Return null | Return null (correct for lookups) |
| `title-generation.ts` | Try-catch + fallback | Correct pattern |
| `chat-completion.ts` | No error handling | Should handle provider errors |

### Recommendations

```typescript
// Standardize on these patterns:

// 1. For lookups: Return undefined (not null)
export function getModelById(id: string): ModelDefinition | undefined {
  return listModels().find((model) => model.id === id)
}

// 2. For validation failures: Throw AppError
export function calculateTokenBudget(modelId: string, options: ...): TokenBudget {
  const model = getModelById(modelId);
  if (!model) {
    throw new AppError(
      "not_found:api:model",
      `Model not found: ${modelId}`,
      404
    );
  }
  // ...
}

// 3. For external API calls: Try-catch with logging
export async function executeChatCompletion(params: ChatCompletionParams) {
  try {
    // ... execution
  } catch (error) {
    logError("Chat completion failed", { error, params: redactSensitive(params) });
    throw AppError.fromUnknown(error, "internal_error:ai:completion");
  }
}
```

---

## 2. Type Usage Patterns

### Current Patterns

#### Pattern A: Strict Type Definitions

```typescript
// types.ts lines 48-58
export type ModelCapability =
  | "chat"
  | "reasoning"
  | "vision"
  | "audio"
  | "multimodal"
  | "code"
  | "tooling"
  | "memory"
  | "image-generation"
  | "video-generation"
```

#### Pattern B: Any Type (Escape Hatch)

```typescript
// providers.ts lines 193, 225, 246
// biome-ignore lint/suspicious/noExplicitAny: providers have varying interfaces
export const providers: Record<string, any> = { ... }

// biome-ignore lint/suspicious/noExplicitAny: provider interfaces vary
export function getProvider(name: string): any {
  return providers[name] ?? null
}
```

#### Pattern C: Type Assertions

```typescript
// registry.ts line 1115
const model = provider.languageModel(definition.modelId) as LanguageModelV2

// providers.ts line 179
return gatewayProvider as unknown as ProviderV2
```

#### Pattern D: Union Types vs Boolean Flags

```typescript
// types.ts - New approach (preferred)
export type ModelCapability = "chat" | "reasoning" | "vision" | ...

// types.ts - Legacy approach (deprecated but still used)
export interface ModelCapabilities {
  chat: boolean
  vision: boolean
  tools: boolean
  reasoning: boolean
  code: boolean
}
```

### Consistency Issues

| Issue | Location | Impact |
|-------|----------|--------|
| `any` type for providers | `providers.ts` | Loses type safety |
| Dual capability systems | `types.ts`, `registry.ts` | Confusion, conversion overhead |
| Type assertions | `registry.ts`, `providers.ts` | Potential runtime errors |

### Recommendations

```typescript
// 1. Define proper provider types
import type { OpenAIProvider, GoogleProvider } from "@ai-sdk/*";

type Provider = OpenAIProvider | GoogleProvider | XaiProvider | OpenRouterProvider | GatewayProvider | WorkersAIProvider | CloudflareGatewayProvider;

export const providers: Record<ProviderId, Provider | null> = {
  openai,
  google,
  // ...
};

// 2. Migrate to capability arrays only
// Remove ModelCapabilities interface after migration
// Use toLegacyCapabilities() only for external API compatibility

// 3. Avoid type assertions - use type guards
function isLanguageModelV2(value: unknown): value is LanguageModelV2 {
  return typeof value === "object" && value !== null && "specificationVersion" in value;
}
```

---

## 3. Async/Await Patterns

### Current Patterns

#### Pattern A: Async Function with Await

```typescript
// model-discovery.ts lines 94-112
const withCache = async (
  providerId: ProviderId,
  fetcher: () => Promise<ProviderCatalog>,
  options?: DiscoveryOptions,
): Promise<ProviderCatalog> => {
  const existing = providerCaches.get(providerId)

  if (!options?.forceRefresh && isCacheValid(existing ?? null) && existing) {
    return existing.catalog
  }

  const catalog = await fetcher()
  providerCaches.set(providerId, {
    catalog,
    expiresAt: Date.now() + MODEL_CACHE_TTL_MS,
  })

  return catalog
}
```

#### Pattern B: Promise Direct Return

```typescript
// model-discovery.ts lines 598-603
export const getModelCatalog = async (): Promise<DiscoveryResult> => {
  if (globalCatalogCache && Date.now() < globalCatalogCache.expiresAt) {
    return globalCatalogCache.catalog
  }
  return discoverProviders()  // No await needed
}
```

#### Pattern C: Async Arrow Functions

```typescript
// model-discovery.ts line 211
export const discoverOpenAI = async (options?: DiscoveryOptions): Promise<ProviderCatalog> => {
  // ...
}
```

#### Pattern D: Async Function Declarations

```typescript
// title-generation.ts line 55
export async function generateTitleFromUserMessage({ message }: { message: UIMessage }): Promise<string> {
  // ...
}
```

### Consistency Issues

| Pattern | Used In | Preference |
|---------|---------|------------|
| `export const x = async () =>` | `model-discovery.ts` | Less common |
| `export async function x()` | `title-generation.ts`, `context-window.ts` | More readable |

### Recommendations

```typescript
// Prefer async function declarations for exported functions
export async function discoverOpenAI(options?: DiscoveryOptions): Promise<ProviderCatalog> {
  // ...
}

// Use async arrow functions for internal utilities
const withCache = async (...): Promise<ProviderCatalog> => {
  // ...
}

// Return promises directly when no await needed
export async function getModelCatalog(): Promise<DiscoveryResult> {
  if (globalCatalogCache && Date.now() < globalCatalogCache.expiresAt) {
    return globalCatalogCache.catalog;
  }
  return discoverProviders();  // Direct return, no await
}
```

---

## 4. Null/Undefined Handling Patterns

### Current Patterns

#### Pattern A: Nullish Coalescing

```typescript
// providers.ts line 31
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN

// registry.ts line 1167
return listChatModels()[0]  // No nullish coalescing
```

#### Pattern B: Optional Chaining

```typescript
// chat-completion.ts lines 420-421
if (requestBody.settings?.sampling?.temperature !== undefined) {
  optionalOptions.temperature = requestBody.settings.sampling.temperature
}
```

#### Pattern C: Null Checks

```typescript
// providers.ts lines 206-208
export const availableProviderIds: string[] = Object.entries(providers)
  .filter(([, provider]) => provider !== null)
  .map(([id]) => id)
```

#### Pattern D: Undefined Checks

```typescript
// token-counter.ts lines 283-285
const systemTokens = options.systemPrompt
  ? countTokens(options.systemPrompt, model)
  : 0
```

### Consistency Issues

| Module | Pattern | Issue |
|--------|---------|-------|
| `providers.ts` | Uses `null` for missing providers | Inconsistent with `undefined` elsewhere |
| `registry.ts` | Returns `undefined` for missing models | Correct |
| `token-counter.ts` | Throws for missing model | Should return `undefined` or throw AppError |

### Recommendations

```typescript
// 1. Standardize on undefined for "not found"
export const providers: Record<ProviderId, Provider | undefined> = {
  openai: openai ?? undefined,
  google: google ?? undefined,
  // ...
};

export function getProvider(name: string): Provider | undefined {
  return providers[name as ProviderId];
}

// 2. Use nullish coalescing consistently
const model = getModelById(id) ?? getDefaultChatModel();

// 3. Use optional chaining for nested access
const temperature = requestBody.settings?.sampling?.temperature;
if (temperature !== undefined) {
  options.temperature = temperature;
}
```

---

## 5. Object Construction Patterns

### Current Patterns

#### Pattern A: Spread Operator

```typescript
// chat-completion.ts lines 440-443
const streamTextOptions = {
  ...baseOptions,
  ...optionalOptions,
  onFinish: async (callResult: { usage: LanguageModelV2Usage }) => { ... }
}
```

#### Pattern B: Direct Assignment

```typescript
// context-window.ts lines 160-166
return {
  maxTokens: contextWindow,
  systemReserve: 2000,
  outputReserve: maxOutput,
  truncationStrategy: "preserve-system",
  minMessagesToKeep: 2,
}
```

#### Pattern C: Conditional Property Addition

```typescript
// chat-completion.ts lines 413-438
const optionalOptions: Record<string, unknown> = {}

if (tools) {
  optionalOptions.tools = tools
  optionalOptions.experimental_activeTools = enabledTools
}

if (requestBody.settings?.sampling?.temperature !== undefined) {
  optionalOptions.temperature = requestBody.settings.sampling.temperature
}
```

#### Pattern D: Conditional Spread

```typescript
// Alternative pattern (not currently used)
const options = {
  ...baseOptions,
  ...(tools && { tools, experimental_activeTools: enabledTools }),
  ...(temperature !== undefined && { temperature }),
}
```

### Recommendations

```typescript
// Prefer conditional spread for cleaner code
const streamTextOptions = {
  ...baseOptions,
  ...(tools && {
    tools,
    experimental_activeTools: enabledTools,
  }),
  ...(requestBody.settings?.sampling?.temperature !== undefined && {
    temperature: requestBody.settings.sampling.temperature,
  }),
  ...(requestBody.settings?.sampling?.topP !== undefined && {
    topP: requestBody.settings.sampling.topP,
  }),
  onFinish: async ({ usage }) => { /* ... */ },
};
```

---

## 6. Function Export Patterns

### Current Patterns

#### Pattern A: Named Export Function Declaration

```typescript
// registry.ts
export function getModel(id: string): LanguageModelV2 { ... }
export function listModels(): ModelDefinition[] { ... }
```

#### Pattern B: Named Export Const

```typescript
// model-discovery.ts
export const discoverOpenAI = async (options?: DiscoveryOptions): Promise<ProviderCatalog> => { ... }
export const clearModelCache = (): void => { ... }
```

#### Pattern C: Export After Declaration

```typescript
// Not used in this codebase
function internalHelper() { ... }
export { internalHelper }
```

### Consistency Issues

| Module | Pattern | Count |
|--------|---------|-------|
| `registry.ts` | Function declaration | 10 |
| `model-discovery.ts` | Const arrow | 9 |
| `context-window.ts` | Function declaration | 8 |
| `token-counter.ts` | Function declaration | 5 |

### Recommendations

```typescript
// Standardize on function declarations for exports
// More readable, hoisted, better for debugging

// Preferred:
export function getModel(id: string): LanguageModelV2 { ... }

// Avoid:
export const getModel = (id: string): LanguageModelV2 => { ... }

// Exception: Simple one-liners are OK as const
export const clearModelCache = (): void => {
  providerCaches.clear();
  globalCatalogCache = null;
};
```

---

## 7. Import Patterns

### Current Patterns

#### Pattern A: Named Imports

```typescript
// registry.ts lines 11-16
import type { LanguageModelV2, ProviderV2 } from "@ai-sdk/provider"
import {
  createProviderRegistry,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai"
```

#### Pattern B: Type-Only Imports

```typescript
// registry.ts lines 19-24
import type {
  ModelCapabilities,
  ModelCapability,
  ModelModality,
  ReasoningType,
} from "./types"
```

#### Pattern C: Barrel Imports

```typescript
// index.ts - Re-exports from all modules
export type { ModelCapabilities, ... } from "./types"
export { getModel, ... } from "./registry"
```

#### Pattern D: Dynamic Imports

```typescript
// chat-completion.ts line 477
const { getUsage } = await import("tokenlens/helpers")
```

### Consistency Issues

| Issue | Location | Impact |
|-------|----------|--------|
| Mixed import styles | Various | Minor readability |
| Dynamic import in hot path | `chat-completion.ts` | Performance |

### Recommendations

```typescript
// 1. Group imports logically
// - External packages first
// - Internal modules second
// - Types last

import { streamText, smoothStream } from "ai";
import type { LanguageModelV2 } from "@ai-sdk/provider";

import { getModel, getModelById } from "./registry";
import { systemPrompt } from "./prompts";
import type { ModelDefinition } from "./registry";

// 2. Prefer static imports for hot paths
// Move tokenlens import to top level
import { getUsage } from "tokenlens/helpers";

// 3. Use type-only imports for types
import type { ModelCapabilities } from "./types";
```

---

## 8. Documentation Patterns

### Current Patterns

#### Pattern A: JSDoc with @module

```typescript
// Every file has this header
/**
 * AI Model Registry
 *
 * Model definitions including IDs, display names, capabilities, and defaults.
 * Provides functions to get models by ID and list available models.
 * Includes reasoning model middleware support for chain-of-thought extraction.
 *
 * @module lib/ai/registry
 */
```

#### Pattern B: JSDoc for Functions

```typescript
// registry.ts lines 1000-1009
/**
 * Filter models by available providers.
 */
function filterByAvailableProviders(
  models: ModelDefinition[],
): ModelDefinition[] {
  return models.filter((model) =>
    availableProviderIds.includes(model.provider),
  )
}
```

#### Pattern C: Inline Comments

```typescript
// registry.ts lines 1117-1121
// Check if this model is a reasoning model that needs middleware wrapping
const isReasoningModel =
  definition.capabilities.reasoning &&
  definition.reasoningType !== undefined &&
  definition.reasoningType !== "none"
```

### Consistency Issues

| Issue | Location | Impact |
|-------|----------|--------|
| Inconsistent JSDoc detail | Various | Some functions lack @param/@returns |
| Missing examples | Most functions | JSDoc shows @example but rarely used |

### Recommendations

```typescript
// Standardize JSDoc format with all sections
/**
 * Get a language model instance by ID.
 * Automatically wraps reasoning models with chain-of-thought extraction middleware.
 * In test environment, returns mock models to avoid API calls.
 *
 * @param id - Model identifier (provider:model format)
 * @returns Language model instance for use with AI SDK
 * @throws {AppError} If provider is not configured (implicit via getProvider)
 *
 * @example
 * ```typescript
 * const model = getModel("openai:gpt-4o");
 * const { text } = await generateText({ model, prompt: "Hello!" });
 * ```
 */
export function getModel(id: string): LanguageModelV2 {
  // ...
}
```

---

## 9. Configuration Patterns

### Current Patterns

#### Pattern A: Environment Variables at Module Level

```typescript
// providers.ts lines 26-41
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const XAI_API_KEY = process.env.XAI_API_KEY
// ...
```

#### Pattern B: Constants in Separate File

```typescript
// constants.ts
export const DEFAULT_MODEL_ID = "openai:gpt-4o-mini"
export const DEFAULT_TEMPERATURE = 0.7
export const DEFAULT_MAX_OUTPUT_TOKENS = 4096
```

#### Pattern C: Inline Configuration

```typescript
// registry.ts lines 1148-1154
const defaultModelPriority = [
  "google:gemini-2.5-flash",
  "google:gemini-2.0-flash",
  "vercel-gateway:openai/gpt-4o",
  "openai:gpt-4o",
  "openai:gpt-4o-mini",
]
```

### Consistency Issues

| Configuration | Location | Should Be |
|---------------|----------|-----------|
| Model priority | `registry.ts` inline | `constants.ts` |
| Reasoning tag names | `registry.ts` inline | `constants.ts` |
| Tool names | `chat-completion.ts` inline | `constants.ts` |
| Timeouts | `constants.ts` | Correct |

### Recommendations

```typescript
// constants.ts - Add all configuration
export const DEFAULT_MODEL_PRIORITY = [
  "google:gemini-2.5-flash",
  "google:gemini-2.0-flash",
  "vercel-gateway:openai/gpt-4o",
  "openai:gpt-4o",
  "openai:gpt-4o-mini",
] as const;

export const REASONING_TAG_NAMES: Record<ReasoningType, string> = {
  "openai-thinking": "think",
  "anthropic-thinking": "thinking",
  "gemini-thinking": "think",
  "deepseek-thinking": "think",
  "internal-thinking": "think",
  "none": "think",
} as const;

export const CHAT_TOOL_NAMES = [
  "createDocument",
  "updateDocument",
  "requestSuggestions",
  "getWeather",
] as const;
```

---

## Summary

### Pattern Consistency Score

| Category | Score | Status |
|----------|-------|--------|
| Error Handling | 6/10 | Needs AppError standardization |
| Type Usage | 7/10 | Reduce `any`, unify capability types |
| Async/Await | 8/10 | Minor style differences |
| Null/Undefined | 7/10 | Standardize on `undefined` |
| Object Construction | 8/10 | Consider conditional spread |
| Function Exports | 7/10 | Prefer function declarations |
| Imports | 9/10 | Good, minor improvements |
| Documentation | 8/10 | Add more examples |
| Configuration | 7/10 | Centralize in constants.ts |

### Priority Fixes

1. **High**: Replace `Error` with `AppError` in `token-counter.ts`
2. **High**: Standardize on `undefined` instead of `null` for missing values
3. **Medium**: Migrate from `ModelCapabilities` to `ModelCapability[]`
4. **Medium**: Use function declarations for exports
5. **Low**: Move inline configurations to `constants.ts`