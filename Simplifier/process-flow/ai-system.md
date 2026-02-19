# AI System Process Flow

## Overview

This document details the AI request/response flow, model selection logic, and streaming mechanisms in the `lib/ai/` system.

---

## 1. Chat Request Flow

### High-Level Flow

```
┌─────────────────┐
│  Client Request │
│  POST /api/chat │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Route Handler                         │
│                  app/api/chat/route.ts                       │
│                                                              │
│  1. Validate session                                         │
│  2. Parse request body (messages, model, settings)          │
│  3. Get request hints (geo location)                        │
│  4. Resolve model from registry                              │
│  5. Build system prompt                                      │
│  6. Execute chat completion                                  │
│  7. Return streaming response                                │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Stream Response│
│  to Client      │
└─────────────────┘
```

### Detailed Flow

#### Step 1: Session Validation

```typescript
// In route handler
const session = await getSession();
if (!session) {
  return new Response("Unauthorized", { status: 401 });
}
```

#### Step 2: Model Resolution

```typescript
// Flow: selectedChatModel → getModelById → getModel

// 1. Get model metadata
const selectedModel = getModelById(selectedChatModel);
// Returns: ModelDefinition | undefined

// 2. Get language model instance
const model = getModel(selectedChatModel);
// Returns: LanguageModelV2
// - Wraps reasoning models with extractReasoningMiddleware
// - Returns mock in test environment
```

**Model Resolution Flow Diagram:**

```
getModel("openai:gpt-4o")
        │
        ├── isTestEnvironment?
        │       │
        │       ├── YES → Return mockChatModel
        │       │
        │       └── NO ↓
        │
        ├── getModelById("openai:gpt-4o")
        │       │
        │       └── Returns ModelDefinition
        │
        ├── getProvider("openai")
        │       │
        │       └── Returns OpenAI provider instance
        │
        ├── provider.languageModel("gpt-4o")
        │       │
        │       └── Returns LanguageModelV2
        │
        └── isReasoningModel?
                │
                ├── YES → wrapLanguageModel({
                │          model,
                │          middleware: extractReasoningMiddleware({ tagName })
                │        })
                │
                └── NO → Return model as-is
```

#### Step 3: System Prompt Building

```typescript
// In chat-completion.ts
const systemPromptOptions = {
  selectedChatModel,
  requestHints,
  selectedModel: toModelMetadata(selectedModel),
  userSystemPrompt: requestBody.settings?.systemPrompt,
};

const system = systemPrompt(systemPromptOptions);
```

**Prompt Assembly Flow:**

```
systemPrompt(options)
        │
        ├── baseSegments = [regularPrompt]
        │
        ├── userSystemPrompt?
        │       └── YES → baseSegments.push(userSystemPrompt)
        │
        ├── baseSegments.push(getRequestPromptFromHints(requestHints))
        │       └── "About the origin of user's request:
        │           - lat: 37.7749
        │           - lon: -122.4194
        │           - city: San Francisco
        │           - country: US"
        │
        └── shouldIncludeArtifacts?
                │
                ├── Reasoning model? → NO (skip artifacts)
                │
                └── Regular model? → YES → baseSegments.push(artifactsPrompt)
                        └── "You have access to Artifacts..."

        Returns: baseSegments.join("\n\n")
```

#### Step 4: Tool Preparation

```typescript
// In chat-completion.ts
const enabledTools = getEnabledTools(selectedModel);

const tools = enabledTools.length > 0
  ? createChatTools({
      userId: session.user?.id ?? "",
      isGuest: !session.user?.id,
      chatId,
      dataStream,
    })
  : undefined;
```

**Tool Enablement Logic:**

```
getEnabledTools(model)
        │
        ├── model undefined? → Return []
        │
        ├── Pure reasoning model?
        │   (reasoning && !tools && !vision)
        │       └── YES → Return []
        │
        ├── Gemma on Google?
        │       └── YES → Return []
        │
        ├── model.capabilities.tools?
        │       └── YES → Return ["createDocument", "updateDocument",
        │                          "requestSuggestions", "getWeather"]
        │
        └── Default → Return []
```

#### Step 5: Provider Options for Reasoning Models

```typescript
// In chat-completion.ts
const providerOptions = buildProviderOptions(selectedModel);
```

**Provider Options Mapping:**

| Reasoning Type | Provider | Options |
|----------------|----------|---------|
| `openai-thinking` | OpenAI | `{ openai: { reasoningEffort: "high" } }` |
| `anthropic-thinking` | Anthropic | `{ anthropic: { thinkingBudget: 8000 } }` |
| `gemini-thinking` | Google | `{ google: { thinkingConfig: { type: "enabled", includeThoughts: true, budgetTokens: 1024 } } }` |
| `deepseek-thinking` | DeepSeek | `{ deepseek: { reasoningLevel: "high" } }` |
| `internal-thinking` | Generic | `{ reasoning: { enabled: true, budget: 6000 } }` |

#### Step 6: Stream Execution

```typescript
// In chat-completion.ts
const result = streamText({
  model: getModel(selectedChatModel),
  system: systemPrompt(systemPromptOptions),
  messages: convertToModelMessages(uiMessages),
  tools,
  stopWhen: stepCountIs(5),
  abortSignal: AbortSignal.timeout(55_000),
  experimental_transform: smoothStream({ delayInMs: 2, chunking: "word" }),
  providerOptions,
  onFinish: async ({ usage }) => {
    // Calculate and report usage
    const finalUsage = await enrichWithTokenLens(usage);
    onUsageCalculated(finalUsage);
    dataStream.write({ type: "data-usage", data: finalUsage });
  },
});

result.consumeStream();
dataStream.merge(result.toUIMessageStream({ sendReasoning: true }));

return result;
```

---

## 2. Model Selection Logic

### Default Model Priority

```typescript
// In registry.ts
const defaultModelPriority = [
  "google:gemini-2.5-flash",
  "google:gemini-2.0-flash",
  "vercel-gateway:openai/gpt-4o",
  "openai:gpt-4o",
  "openai:gpt-4o-mini",
];

function getDefaultChatModel(): ModelDefinition | undefined {
  for (const id of defaultModelPriority) {
    const model = getModelById(id);
    if (model) return model;
  }
  return listChatModels()[0]; // Fallback
}
```

**Selection Flow:**

```
getDefaultChatModel()
        │
        ├── Try "google:gemini-2.5-flash"
        │       └── Available? → Return model
        │
        ├── Try "google:gemini-2.0-flash"
        │       └── Available? → Return model
        │
        ├── Try "vercel-gateway:openai/gpt-4o"
        │       └── Available? → Return model
        │
        ├── Try "openai:gpt-4o"
        │       └── Available? → Return model
        │
        ├── Try "openai:gpt-4o-mini"
        │       └── Available? → Return model
        │
        └── Fallback: listChatModels()[0]
```

### Reasoning Model Selection

```typescript
// In registry.ts
function getReasoningModel(): ModelDefinition | undefined {
  const reasoningPriority = [
    "openai:o1",
    "google:gemini-2.5-pro",
    "google:gemini-2.5-flash",
  ];

  for (const id of reasoningPriority) {
    const model = getModelById(id);
    if (model) return model;
  }

  return listModelsByCapability("reasoning")[0] ?? getDefaultChatModel();
}
```

### Model Filtering by Provider Availability

```typescript
// In registry.ts
function filterByAvailableProviders(models: ModelDefinition[]): ModelDefinition[] {
  return models.filter((model) =>
    availableProviderIds.includes(model.provider)
  );
}

// availableProviderIds comes from providers.ts
// Only includes providers with configured API keys
```

---

## 3. Streaming Flow

### Stream Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     streamText()                             │
│                    (AI SDK Core)                             │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              LanguageModelV2.doStream()              │    │
│  │                                                      │    │
│  │  Provider API → ReadableStream<LanguageModelV2Stream>│    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           smoothStream Transform                     │    │
│  │                                                      │    │
│  │  - Chunks by word                                   │    │
│  │  - 2ms delay between chunks                         │    │
│  │  - Smoother UX perception                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           toUIMessageStream()                        │    │
│  │                                                      │    │
│  │  - Converts to UI message format                    │    │
│  │  - Includes reasoning (sendReasoning: true)         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    dataStream.merge()                        │
│                                                              │
│  Merges AI stream with UI data stream:                      │
│  - Text deltas                                               │
│  - Reasoning content                                         │
│  - Tool calls                                                │
│  - Usage data (on finish)                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Client Connection                         │
│                                                              │
│  SSE (Server-Sent Events) stream to browser                 │
└─────────────────────────────────────────────────────────────┘
```

### Stream Data Types

```typescript
// In chat-completion.ts
interface CustomUIDataTypes {
  textDelta: string;      // Text content chunks
  imageDelta: string;     // Image generation
  sheetDelta: string;     // Spreadsheet updates
  codeDelta: string;      // Code updates
  id: string;             // Message IDs
  title: string;          // Chat titles
  chatTitle: string;      // Chat title updates
  kind: string;           // Artifact kinds
  clear: null;            // Clear signals
  finish: null;           // Completion signals
  usage: AppUsage;        // Token usage data
}
```

### onFinish Callback Flow

```
onFinish({ usage })
        │
        ├── Get TokenLens catalog
        │       │
        │       └── tokenlensCatalogPromise
        │
        ├── Get model ID
        │       └── getModel(selectedChatModel).modelId
        │
        ├── Enrich usage with costs
        │       │
        │       └── getUsage({ modelId, usage, providers })
        │               │
        │               └── Returns: { inputCost, outputCost, totalCost }
        │
        ├── Create final usage object
        │       └── { inputTokens, outputTokens, totalTokens,
        │            reasoningTokens, cachedInputTokens, modelId,
        │            inputCost?, outputCost?, totalCost? }
        │
        ├── Call onUsageCalculated callback
        │
        └── Write to dataStream
                └── { type: "data-usage", data: finalUsage }
```

---

## 4. Context Window Management Flow

### Token Budget Calculation

```
calculateTokenBudget(modelId, options)
        │
        ├── Get model definition
        │       └── getModelById(modelId)
        │
        ├── Calculate system tokens
        │       └── countTokens(systemPrompt, model)
        │
        ├── Calculate tools tokens
        │       └── countToolsTokens(tools, model)
        │
        ├── Calculate messages tokens
        │       └── countMessagesTokens(messages, model)
        │
        └── Return budget breakdown
                ┌─────────────────────────────────────┐
                │ contextWindow: 128000               │
                │ systemReserved: 2000                │
                │ toolsTokens: 500                    │
                │ messagesTokens: 10000               │
                │ maxOutputTokens: 4096               │
                │ availableForInput: 111404           │
                │ isExceeded: false                   │
                └─────────────────────────────────────┘
```

### Message Truncation Flow

```
truncateMessages(messages, maxTokens, modelId, strategy)
        │
        ├── Count original tokens
        │       └── countMessagesTokens(messages, modelId)
        │
        ├── Within budget?
        │       └── YES → Return as-is (no truncation)
        │
        └── NO → Apply strategy
                │
                ├── "preserve-system"
                │       │
                │       ├── Separate system messages
                │       ├── Calculate system token cost
                │       ├── Add recent messages that fit
                │       └── Reorder chronologically
                │
                ├── "preserve-recent"
                │       │
                │       └── Keep most recent messages that fit
                │
                └── "preserve-first-last"
                        │
                        ├── Reserve first and last
                        ├── Fill middle from recent end
                        └── Return [first, ...middle, last]
```

---

## 5. Model Discovery Flow

### Parallel Discovery

```
discoverProviders(options)
        │
        ├── Check global cache
        │       └── Valid? → Return cached result
        │
        ├── Create abort controller (5s timeout)
        │
        ├── Promise.allSettled([
        │       discoverOpenAI(options),
        │       discoverGoogleGemini(options),
        │       discoverOpenRouter(options),
        │       discoverCloudflareWorkers(options),
        │     ])
        │
        ├── Collect results
        │       ├── Fulfilled → Add to catalogs
        │       └── Rejected → Add to errors map
        │
        ├── Add placeholder catalogs
        │       ├── vercel-gateway (no discovery API)
        │       └── cloudflare-ai-gateway (uses Google models)
        │
        ├── Cache result (1 hour TTL)
        │
        └── Return { catalogs, errors }
```

### Per-Provider Discovery

```
discoverOpenAI(options)
        │
        ├── Check API key
        │       └── Missing? → Throw CONFIGURATION_ERROR
        │
        ├── Check cache
        │       └── Valid? → Return cached catalog
        │
        ├── Fetch from API
        │       └── GET https://api.openai.com/v1/models
        │
        ├── Map response to ModelMetadata[]
        │       └── { id, modelId, release, tags }
        │
        ├── Cache result
        │
        └── Return ProviderCatalog
```

---

## 6. Title Generation Flow

```
generateTitleFromUserMessage({ message })
        │
        ├── Get title model
        │       └── getDefaultChatModel() or test fallback
        │
        ├── generateText({
        │       model,
        │       system: TITLE_SYSTEM_PROMPT,
        │       prompt: JSON.stringify(message),
        │       maxOutputTokens: 80,
        │     })
        │
        ├── Success?
        │       └── YES → Return title
        │
        └── Failure?
                │
                ├── Log warning
                │
                └── generatePlaceholderTitle(message)
                        │
                        ├── Extract text from message parts
                        │
                        ├── Trim to 80 chars
                        │
                        └── Return "New Chat" if empty
```

---

## 7. Error Handling Flow

### Chat Completion Errors

```
executeChatCompletion()
        │
        ├── Model not found?
        │       └── Falls back to providerRegistry.languageModel()
        │
        ├── Stream timeout (55s)?
        │       └── AbortSignal.timeout triggers abort
        │
        ├── TokenLens enrichment fails?
        │       └── Log warning, return basic usage
        │
        └── Provider API error?
                └── Propagates to route handler
```

### Discovery Errors

```
discoverProviders()
        │
        └── Promise.allSettled ensures:
                ├── One provider failure doesn't break others
                ├── Errors collected in errors map
                └── Partial results returned
```

---

## 8. Performance Characteristics

| Operation | Time Complexity | Notes |
|-----------|-----------------|-------|
| `getModel()` | O(1) | Map lookup + optional wrap |
| `getModelById()` | O(n) | Array.find on curatedModels |
| `listModels()` | O(n) | Filter by available providers |
| `countTokens()` | O(1) | Character-based estimation |
| `truncateMessages()` | O(n*m) | n messages, m iterations |
| `discoverProviders()` | O(1) parallel | 5s timeout, cached 1hr |
| `executeChatCompletion()` | O(stream) | Depends on response length |

---

## Recommendations

1. **Cache Model Lookups**: `getModelById()` uses `Array.find()` on every call. Consider a Map for O(1) lookup.

2. **Lazy Discovery**: Model discovery runs eagerly. Consider lazy initialization on first request.

3. **Stream Buffering**: The `smoothStream` transform adds 2ms delay per chunk. Consider adaptive chunking based on response size.

4. **Token Counting Accuracy**: Current estimation is character-based. Consider integrating tiktoken for OpenAI models.
