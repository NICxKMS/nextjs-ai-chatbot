# AI SDK Usage

## Overview

The app uses **Vercel AI SDK v5** (`ai@5.0.26`) with `@ai-sdk/react@2.0.26` for client-side hooks. It supports multiple providers through a provider registry pattern with curated + dynamically discovered models.

---

## Provider Configuration

### Provider Registry
Built with `createProviderRegistry(baseProviders)` from AI SDK. Providers are registered conditionally based on environment variables.

| Provider ID | Package | Env Var(s) | Notes |
|-------------|---------|------------|-------|
| `vercel-gateway` | `@ai-sdk/gateway` | `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN` | Primary when available |
| `openai` | `@ai-sdk/openai` | `OPENAI_API_KEY` | GPT-4o, GPT-4.1, o3 |
| `google` | `@ai-sdk/google` | `GEMINI_API_KEY` | Gemini 2.5/3.0, Gemma 3 |
| `openrouter` | `@openrouter/ai-sdk-provider` | `OPENROUTER_API_KEY` | Multi-provider proxy |
| `cloudflare-workers` | `workers-ai-provider` | `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_KEY` | Workers AI |
| `cloudflare-ai-gateway` | `ai-gateway-provider` | `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_AI_GATEWAY_NAME` + `CLOUDFLARE_AI_GATEWAY_API_KEY` | Gemini models with flash-lite fallback |

### myProvider (Custom Provider)
`lib/ai/providers.ts` exports `myProvider` which wraps the registry:
- In test: returns mock models (`chat-model`, `title-model`, `artifact-model`, etc.)
- In production: resolves model ID through registry, wraps reasoning models with `extractReasoningMiddleware`

---

## Model Catalog

### Model Types (`ModelMetadata`)
```typescript
type ModelMetadata = {
  id: string;                    // e.g., "google:gemini-2.5-flash"
  providerId: ProviderId;        // e.g., "google"
  modelId: string;               // e.g., "gemini-2.5-flash" (provider-specific)
  name: string;                  // Human-readable name
  capabilities: ModelCapability[];
  modalities: ModelModality[];
  reasoningType?: ReasoningType;
  thinkingBudget?: number;
  source: "curated" | "discovered";
  isCurated: boolean;
};
```

### Capabilities
`chat`, `reasoning`, `vision`, `audio`, `multimodal`, `code`, `tooling`, `memory`, `image-generation`, `video-generation`

### Reasoning Types & Middleware
| Type | Tag Name | Provider Options |
|------|----------|-----------------|
| `openai-thinking` | `<think>` | `openai.reasoningEffort: "high"` |
| `anthropic-thinking` | `<thinking>` | `anthropic.thinkingBudget: N` |
| `gemini-thinking` | `<think>` | `google.thinkingConfig: { type: "enabled", includeThoughts: true }` |
| `deepseek-thinking` | `<think>` | `deepseek.reasoningLevel: "high"` |
| `internal-thinking` | `<think>` | `reasoning.enabled: true, budget: N` |

Reasoning models are wrapped with `extractReasoningMiddleware({ tagName })` from AI SDK.

### Default Models
| Purpose | Default | Fallback |
|---------|---------|----------|
| Chat | `google:gemma-3-4b-it` | — |
| Title generation | `google:gemma-3-4b-it` | — |
| Artifact creation | `google:gemini-2.5-flash-lite` | DEFAULT_CHAT_MODEL |
| Reasoning | `google:gemini-2.5-flash` | — |

### Model Discovery
`lib/ai/model-discovery.ts` dynamically discovers models from configured providers. Curated models take priority; discovered models extend the catalog. Merged via `mergeCatalogs()` with dedup by model ID.

---

## Tool Definitions

### 4 Tools in `lib/ai/tools/`

#### `getWeather`
- **Schema**: `z.union([{ latitude, longitude }, { city }])`
- **Behavior**: Geocodes city via Open-Meteo API, fetches weather forecast
- **Returns**: Temperature, hourly forecast, sunrise/sunset

#### `createDocument({ session, dataStream, chatId })`
- **Schema**: `z.object({ title: z.string(), kind: z.enum(["text","code","sheet"]) })`
- **Behavior**: Generates UUID, streams data parts (data-kind, data-id, data-title, data-clear), delegates to `documentHandler.onCreateDocument()`, writes data-finish
- **Returns**: `{ id, title, kind, content: "A document was created..." }`

#### `updateDocument({ session, dataStream })`
- **Schema**: `z.object({ id: z.string(), description: z.string() })`
- **Behavior**: Fetches existing document via `documentData.get()`, streams data-clear, delegates to `documentHandler.onUpdateDocument()`, writes data-finish
- **Returns**: `{ id, title, kind, content: "The document has been updated..." }`

#### `requestSuggestions({ session, dataStream })`
- **Schema**: `z.object({ documentId: z.string() })`
- **Behavior**: Fetches document, uses `streamObject` with artifact-model to generate up to 5 suggestions, streams each as `data-suggestion`
- **Saves**: To DB for authenticated users only
- **Returns**: `{ id, title, kind, message: "Suggestions have been added..." }`

### Tool Enablement Logic
```
if (model has ONLY "reasoning" capability) → no tools
if (model is google:gemma-*) → no tools
if (model has "tooling" capability) → ALL tools enabled
otherwise → no tools
```

---

## Streaming Patterns

### Chat Completion (`executeChatCompletion`)
```typescript
const result = streamText({
  model: myProvider.languageModel(selectedChatModel),
  system: systemPrompt({...}),
  messages: convertToModelMessages(uiMessages),
  stopWhen: stepCountIs(5),
  abortSignal: AbortSignal.timeout(55_000),
  experimental_activeTools: enabledTools,
  experimental_transform: smoothStream({ delayInMs: 2, chunking: "word" }),
  tools: { getWeather, createDocument, updateDocument, requestSuggestions },
  temperature, topP, maxOutputTokens, // from user settings
  providerOptions,  // reasoning config per provider
  onFinish: async ({ usage }) => { /* TokenLens enrichment, emit data-usage */ },
});

result.consumeStream();
dataStream.merge(result.toUIMessageStream({ sendReasoning: true }));
```

### Title Generation
```typescript
const { text: title } = await generateText({
  model: myProvider.languageModel(DEFAULT_TITLE_MODEL),
  system: "generate short title...",
  prompt: JSON.stringify(message),
});
```
- Runs in parallel with streaming (non-blocking)
- Fallback: first 80 chars of message text
- Placeholder title used immediately; real title updates via `data-chatTitle` stream part

### Artifact Content Generation

**Text**: `streamText` → `data-textDelta` (accumulated)
**Code**: `streamObject` with `z.object({ code: z.string() })` → `data-codeDelta` (replaced)
**Sheet**: `streamObject` with `z.object({ csv: z.string() })` → `data-sheetDelta` (replaced)

### Data Stream Protocol (Custom Parts)
| Part Type | Data | Direction | Transient |
|-----------|------|-----------|-----------|
| `data-id` | Document UUID | Server→Client | Yes |
| `data-title` | Document title | Server→Client | Yes |
| `data-kind` | Artifact kind | Server→Client | Yes |
| `data-clear` | null | Server→Client | Yes |
| `data-finish` | null | Server→Client | Yes |
| `data-textDelta` | Text chunk | Server→Client | Yes |
| `data-codeDelta` | Full code | Server→Client | Yes |
| `data-sheetDelta` | Full CSV | Server→Client | Yes |
| `data-imageDelta` | Base64 image | Server→Client | Yes |
| `data-suggestion` | Suggestion object | Server→Client | Yes |
| `data-chatTitle` | Chat title string | Server→Client | Yes |
| `data-usage` | AppUsage object | Server→Client | No |
| `data-appendMessage` | Message JSON | Server→Client | No |

---

## System Prompts (`lib/ai/prompts.ts`)

### Composition
```typescript
systemPrompt = [
  regularPrompt,           // Base assistant behavior
  userSystemPrompt?,       // User-configured (from settings, max 8192 chars)
  requestPrompt,           // Geo hints (lat, lon, city, country)
  artifactsPrompt?,        // Only if NOT a reasoning model
].join("\n\n")
```

### `regularPrompt`
Concise, direct assistant. Use tools only when necessary. Match user's tone.

### `artifactsPrompt`
Instructions for `createDocument`/`updateDocument` tool usage. Rules: substantial content (>10 lines), code always in artifacts, Python only, never update immediately after creating.

### Artifact-specific prompts
- `codePrompt`: Self-contained Python, print() for output, under 15 lines, no network/file access
- `sheetPrompt`: CSV spreadsheet with headers
- `updateDocumentPrompt(content, type)`: Update existing content based on user feedback

---

## Usage Tracking

### TokenLens Integration
- `tokenlens` package for cost/token tracking
- Catalog fetched with `"use cache"` directive (24h), tagged `tokenlens-catalog`
- On completion: `getUsage()` enriches raw AI SDK usage with pricing data
- Result written as `data-usage` stream part and saved to `chat.lastContext`

### `AppUsage` type
Extends `LanguageModelUsage` with: `modelId`, cost info from TokenLens

### Entitlements
| User Type | Max Messages/Day |
|-----------|-----------------|
| Guest | 20 |
| Regular | 100 |

Quota tracked via Redis counter: `getUserMessageCount(userId)`, incremented async after save.
