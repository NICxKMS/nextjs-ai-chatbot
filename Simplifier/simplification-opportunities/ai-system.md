# AI System Simplification Opportunities

## Overview

This document identifies opportunities to simplify the `lib/ai/` codebase, organized by impact and complexity.

---

## High Impact, Low Complexity

### 1. Extract Model Definitions to Configuration

**Current State:**
- [`registry.ts`](../../lib/ai/registry.ts) contains 50+ inline model definitions (lines 95-935)
- Each model is ~15 lines of configuration
- Total: ~840 lines of data in a code file

**Problem:**
- Hard to maintain model metadata
- Difficult to add/remove models
- Code review noise for model updates
- No separation between code and data

**Recommendation:**
```typescript
// Create lib/ai/models/curated-models.json
[
  {
    "id": "openai:gpt-4o",
    "name": "GPT-4o",
    "provider": "openai",
    "modelId": "gpt-4o",
    "maxTokens": 16384,
    "contextWindow": 128000,
    "capabilities": { "chat": true, "vision": true, "tools": true, "reasoning": false, "code": true },
    "description": "Latest GPT-4o with adaptive responses and multimodal capabilities",
    "tags": ["curated", "latest", "flagship", "multimodal"],
    "modalities": ["text", "vision", "audio"],
    "capabilityList": ["chat", "multimodal", "tooling", "memory"]
  }
  // ... other models
]

// Update registry.ts
import curatedModelsData from "./models/curated-models.json";

const curatedModels: ModelDefinition[] = curatedModelsData.map(m => ({
  ...m,
  isCurated: true,
  source: "curated" as const,
}));
```

**Impact:**
- Reduces registry.ts from 1209 to ~400 lines
- Enables non-developers to update model metadata
- Cleaner git diffs for model changes

---

### 2. Consolidate Token Counting Logic

**Current State:**
- [`token-counter.ts`](../../lib/ai/token-counter.ts): `countTokens()`, `countMessageTokens()`, `countMessagesTokens()`
- [`context-window.ts`](../../lib/ai/context-window.ts): Re-implements similar counting in truncation functions

**Problem:**
```typescript
// context-window.ts lines 196-199
const originalTokens = countMessagesTokens(
  messages.map((m) => ({ role: m.role, content: m.content })),
  modelId,
);

// Then again in truncatePreserveSystem (lines 272-275)
const systemTokens = countMessagesTokens(
  systemMessages.map((m) => ({ role: m.role, content: m.content })),
  modelId,
);

// And again in truncatePreserveRecent (lines 331-334)
const msgTokens = countMessagesTokens(
  [{ role: msg.role, content: msg.content }],
  modelId,
);
```

**Recommendation:**
```typescript
// Create a TokenCounter class to cache and optimize
class TokenCounter {
  private cache = new Map<string, number>();
  
  constructor(private modelId: string) {}
  
  countMessage(message: ContextMessage): number {
    const key = `${message.role}:${message.content}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    
    const count = countMessageTokens(message.role, message.content, this.modelId);
    this.cache.set(key, count);
    return count;
  }
  
  countMessages(messages: ContextMessage[]): number {
    return messages.reduce((sum, m) => sum + this.countMessage(m), 0);
  }
}

// Use in truncation functions
function truncateMessages(messages: ContextMessage[], ...): TruncationResult {
  const counter = new TokenCounter(modelId);
  const originalTokens = counter.countMessages(messages);
  // ... use counter throughout
}
```

**Impact:**
- Eliminates redundant token counting
- Provides caching for repeated operations
- Reduces complexity in truncation functions

---

### 3. Simplify Provider Options Builder

**Current State:**
```typescript
// chat-completion.ts lines 206-256
export function buildProviderOptions(
  selectedModel: ModelDefinition | undefined,
): Record<string, Record<string, unknown>> {
  const providerOptions: Record<string, Record<string, unknown>> = {}

  if (!selectedModel?.reasoningType) {
    return providerOptions
  }

  switch (selectedModel.reasoningType) {
    case "openai-thinking":
      providerOptions.openai = { reasoningEffort: "high" }
      break
    case "anthropic-thinking":
      providerOptions.anthropic = { thinkingBudget: selectedModel.thinkingBudget ?? 8000 }
      break
    case "gemini-thinking":
      providerOptions.google = {
        thinkingConfig: {
          type: "enabled",
          includeThoughts: true,
          budgetTokens: selectedModel.thinkingBudget ?? 1024,
        },
      }
      break
    // ... more cases
  }
  return providerOptions
}
```

**Recommendation:**
```typescript
// Use a configuration map instead of switch
const REASONING_CONFIGS: Record<ReasoningType, (model: ModelDefinition) => Record<string, unknown>> = {
  "openai-thinking": () => ({ openai: { reasoningEffort: "high" } }),
  "anthropic-thinking": (m) => ({ anthropic: { thinkingBudget: m.thinkingBudget ?? 8000 } }),
  "gemini-thinking": (m) => ({
    google: {
      thinkingConfig: {
        type: "enabled",
        includeThoughts: true,
        budgetTokens: m.thinkingBudget ?? 1024,
      },
    },
  }),
  "deepseek-thinking": () => ({ deepseek: { reasoningLevel: "high" } }),
  "internal-thinking": (m) => ({ reasoning: { enabled: true, budget: m.thinkingBudget ?? 6000 } }),
  "none": () => ({}),
};

export function buildProviderOptions(
  selectedModel: ModelDefinition | undefined,
): Record<string, Record<string, unknown>> {
  if (!selectedModel?.reasoningType) return {};
  
  const builder = REASONING_CONFIGS[selectedModel.reasoningType];
  return builder ? builder(selectedModel) : {};
}
```

**Impact:**
- Eliminates switch statement
- Easier to add new reasoning types
- Declarative configuration

---

### 4. Remove Redundant Type Conversions

**Current State:**
```typescript
// chat-completion.ts lines 266-290
function toModelMetadata(model: ModelDefinition): ModelMetadata {
  const result: ModelMetadata = {
    id: model.id,
    providerId: model.provider as ModelMetadata["providerId"],
    providerName: model.provider,
    modelId: model.modelId,
    name: model.name,
    description: model.description ?? "",
    modalities: model.modalities ?? [],
    capabilities: model.capabilityList ?? [],
    tags: model.tags ?? [],
    source: model.source ?? "curated",
    isCurated: model.isCurated ?? false,
  }
  // Only add optional properties if they have defined values
  if (model.reasoningType !== undefined) {
    result.reasoningType = model.reasoningType
  }
  if (model.thinkingBudget !== undefined) {
    result.thinkingBudget = model.thinkingBudget
  }
  return result
}
```

**Problem:**
- `ModelDefinition` and `ModelMetadata` are nearly identical
- Conversion function adds complexity
- Two type systems for same data

**Recommendation:**
```typescript
// Unify the types - ModelDefinition extends ModelMetadata
interface ModelMetadata {
  id: string;
  providerId: ProviderId;
  providerName: string;
  modelId: string;
  name: string;
  description: string;
  modalities: ModelModality[];
  capabilities: ModelCapability[];
  tags: string[];
  source: ModelSource;
  isCurated: boolean;
  reasoningType?: ReasoningType;
  thinkingBudget?: number;
  contextWindow?: number;
  maxOutputTokens?: number;
}

// ModelDefinition adds registry-specific fields
interface ModelDefinition extends ModelMetadata {
  maxTokens: number;      // Renamed from maxOutputTokens for consistency
  contextWindow: number;  // Required in Definition
  capabilities: ModelCapabilities;  // Legacy format for backward compat
}

// No conversion needed - just use the object directly
```

**Impact:**
- Eliminates `toModelMetadata()` function
- Reduces type confusion
- Simpler codebase

---

## Medium Impact, Medium Complexity

### 5. Simplify Truncation Strategies

**Current State:**
- Three separate functions: `truncatePreserveSystem()`, `truncatePreserveRecent()`, `truncatePreserveFirstLast()`
- Each ~40-60 lines
- Similar iteration logic

**Recommendation:**
```typescript
// Unified truncation with strategy pattern
type TruncationFilter = (
  messages: ContextMessage[],
  index: number
) => { keep: boolean; priority: number };

const TRUNCATION_FILTERS: Record<TruncationStrategy, TruncationFilter> = {
  "preserve-system": (msg, i) => ({
    keep: msg.role === "system",
    priority: msg.role === "system" ? 1000 : i,
  }),
  "preserve-recent": (_, i, msgs) => ({
    keep: true,
    priority: i,
  }),
  "preserve-first-last": (_, i, msgs) => ({
    keep: i === 0 || i === msgs.length - 1,
    priority: i === 0 ? 1000 : i === msgs.length - 1 ? 999 : i,
  }),
};

function truncateMessages(
  messages: ContextMessage[],
  maxTokens: number,
  modelId: string,
  strategy: TruncationStrategy = "preserve-system",
): TruncationResult {
  const counter = new TokenCounter(modelId);
  
  // Score and sort messages by priority
  const scored = messages.map((m, i) => ({
    message: m,
    ...TRUNCATION_FILTERS[strategy](m, i, messages),
    tokens: counter.countMessage(m),
  }));
  
  // Sort by priority (descending), then fit within budget
  scored.sort((a, b) => b.priority - a.priority);
  
  // ... fitting logic
}
```

**Impact:**
- Reduces code duplication
- Easier to add new strategies
- Centralized logic

---

### 6. Cache Model Lookups

**Current State:**
```typescript
// registry.ts line 1048
export function getModelById(id: string): ModelDefinition | undefined {
  return listModels().find((model) => model.id === id)
}

// Called multiple times per request
```

**Problem:**
- `listModels()` filters all models every call
- `Array.find()` is O(n) every lookup
- Multiple calls per request

**Recommendation:**
```typescript
// Create a cached map
let modelCache: Map<string, ModelDefinition> | null = null;
let cachedProviderIds: string[] | null = null;

function buildModelCache(): Map<string, ModelDefinition> {
  if (modelCache && cachedProviderIds === availableProviderIds) {
    return modelCache;
  }
  
  modelCache = new Map();
  for (const model of curatedModels) {
    if (availableProviderIds.includes(model.provider)) {
      modelCache.set(model.id, model);
    }
  }
  cachedProviderIds = [...availableProviderIds];
  return modelCache;
}

export function getModelById(id: string): ModelDefinition | undefined {
  return buildModelCache().get(id);
}

export function listModels(): ModelDefinition[] {
  return Array.from(buildModelCache().values());
}
```

**Impact:**
- O(1) lookups instead of O(n)
- Eliminates redundant filtering
- Better performance for multiple lookups

---

### 7. Simplify Reasoning Tag Name Function

**Current State:**
```typescript
// registry.ts lines 974-994
export function getReasoningTagName(reasoningType?: ReasoningType): string {
  switch (reasoningType) {
    case "openai-thinking":
      return "think"
    case "anthropic-thinking":
      return "thinking"
    case "gemini-thinking":
      return "think"
    case "deepseek-thinking":
      return "think"
    case "internal-thinking":
      return "think"
    default:
      return "think"
  }
}
```

**Problem:**
- 5 of 6 cases return "think"
- Only Anthropic uses "thinking"
- Unnecessary complexity

**Recommendation:**
```typescript
const REASONING_TAG_NAMES: Record<ReasoningType, string> = {
  "openai-thinking": "think",
  "anthropic-thinking": "thinking",
  "gemini-thinking": "think",
  "deepseek-thinking": "think",
  "internal-thinking": "think",
  "none": "think",
};

export function getReasoningTagName(reasoningType?: ReasoningType): string {
  return REASONING_TAG_NAMES[reasoningType ?? "none"];
}

// Or even simpler:
export function getReasoningTagName(reasoningType?: ReasoningType): string {
  return reasoningType === "anthropic-thinking" ? "thinking" : "think";
}
```

**Impact:**
- Reduces 20 lines to 1
- Clearer intent
- Easier to maintain

---

## Low Impact, High Complexity

### 8. Unify Discovery Functions

**Current State:**
- `discoverOpenAI()`, `discoverGoogleGemini()`, `discoverOpenRouter()`, `discoverCloudflareWorkers()`
- Each ~50-80 lines
- Similar structure: check key, fetch, map, cache

**Analysis:**
- Each provider has different API response format
- Different error handling needs
- Different model mapping logic

**Recommendation:** Keep separate. The differences in API structure and response mapping outweigh the benefits of unification. The current approach is clear and maintainable.

---

### 9. Create AI Client Facade

**Current State:**
- Multiple entry points: `getModel()`, `executeChatCompletion()`, `generateTitleFromUserMessage()`
- Consumers need to understand internal flow

**Recommendation:**
```typescript
// Create a unified AI client
export class AIClient {
  constructor(private config: AIConfig) {}
  
  async chat(params: ChatParams): Promise<ChatResult> {
    // Handles model resolution, prompt building, streaming
  }
  
  async generateTitle(message: UIMessage): Promise<string> {
    // Uses chat internally with title-specific settings
  }
  
  listModels(): ModelDefinition[] {
    // Cached model list
  }
  
  validateContext(messages: ContextMessage[]): ValidationResult {
    // Context validation
  }
}
```

**Analysis:**
- Would add abstraction layer
- Current functional approach is clear
- May over-engineer for current needs

**Recommendation:** Defer until more complex orchestration is needed.

---

## Dead Code Identification

### Potentially Unused Code

| Location | Code | Status |
|----------|------|--------|
| [`registry.ts:118`](../../lib/ai/registry.ts:118) | `REASONING_MODEL_ID = "openai:o1-mini"` | Used once in prompts.ts - verify if still needed |
| [`types.ts:169`](../../lib/ai/types.ts:169) | `ModelCapabilities` (legacy) | Marked deprecated but still used |
| [`context-window.ts:42`](../../lib/ai/context-window.ts:42) | `"summarize"` strategy | Listed but not implemented |

### Verification Needed

```typescript
// Check if REASONING_MODEL_ID is still correct
const REASONING_MODEL_ID = "openai:o1-mini";  // Is this the right model?

// In prompts.ts line 151
const shouldIncludeArtifacts = !(
  selectedChatModel === REASONING_MODEL_ID ||
  selectedModel?.capabilities.includes("reasoning")
);
```

---

## Complexity Metrics

| File | Lines | Functions | Cyclomatic Complexity | Recommendation |
|------|-------|-----------|----------------------|----------------|
| `registry.ts` | 1209 | 10 | Low | Extract model data |
| `chat-completion.ts` | 539 | 3 | Medium | Simplify provider options |
| `context-window.ts` | 582 | 8 | Medium | Consolidate truncation |
| `model-discovery.ts` | 656 | 9 | Low | Keep as-is |
| `token-counter.ts` | 308 | 5 | Low | Add caching |
| `prompts.ts` | 278 | 6 | Low | Keep as-is |
| `types.ts` | 218 | 2 | Low | Unify with registry |
| `providers.ts` | 265 | 4 | Low | Keep as-is |

---

## Summary

### Quick Wins (Do First)
1. Extract model definitions to JSON
2. Simplify `getReasoningTagName()` to one line
3. Add model lookup caching

### Medium Effort (Do Next)
4. Consolidate token counting with caching
5. Simplify provider options with config map
6. Unify `ModelDefinition` and `ModelMetadata`

### Consider Carefully
7. Truncation strategy unification
8. AI client facade (defer until needed)
