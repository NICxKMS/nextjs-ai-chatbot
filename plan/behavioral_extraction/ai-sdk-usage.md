# AI SDK Usage

> **Updated per redesign audit (2026-03-01)**

## Overview

The app uses **Vercel AI SDK v5** (`ai@5.0.26`) with `@ai-sdk/react@2.0.26` for client-side hooks. It supports multiple providers through a provider registry pattern with curated + dynamically discovered models.

---

## Provider Configuration

### Provider Registry
Built with `createProviderRegistry(baseProviders)` from AI SDK. Providers are registered conditionally based on environment variables.

| Provider ID | Package | Env Var(s) | Notes |
|-------------|---------|------------|-------|
| `openai` | `@ai-sdk/openai` | `OPENAI_API_KEY` | GPT-4o, GPT-4.1, o3 |
| `google` | `@ai-sdk/google` | `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini 2.5/3.0, Gemma 3 |

> **Environment variable:** `GOOGLE_GENERATIVE_AI_API_KEY` (used by Vercel AI SDK Google provider). The old name `GEMINI_API_KEY` may appear in legacy references but the redesign standardizes on `GOOGLE_GENERATIVE_AI_API_KEY`.
| `openrouter` | `@ai-sdk/openai` (OpenRouter baseURL) | `OPENROUTER_API_KEY` | Multi-provider proxy |

> *Registry follows redesign baseline providers only: `google`, `openai`, `openrouter`.*

### myProvider (Custom Provider)
`lib/ai/provider.ts` exports `myProvider` which wraps the registry:
- In test: returns mock models (`chat-model`, `title-model`, `artifact-model`, etc.)
- In production: resolves model ID through registry, wraps reasoning models with `extractReasoningMiddleware`

---

## Model Catalog

### Model Types (`ModelMetadata`)
```typescript
interface ModelMetadata {
  id: string;                           // full model ID (e.g. "openai:gpt-4o")
  provider: string;                     // was providerId: ProviderId
  providerModelId: string;              // was modelId
  label: string;                        // was name
  description?: string;
  supportsToolCalling: boolean;         // was capabilities array
  supportsReasoning: boolean;           // was capabilities array
  modalities: { input: string[]; output: string[] };
  contextWindow: number;
  maxOutputTokens: number;
  source: 'static' | 'dynamic';        // was 'curated' | 'discovered'
}
```

> **Redesign note:** `providerId` → `provider`, `modelId` → `providerModelId`, `name` → `label`. The `capabilities` array was replaced by explicit boolean flags (`supportsToolCalling`, `supportsReasoning`). `isCurated` removed; use `source === 'static'` instead. `reasoningType` and `thinkingBudget` are no longer part of `ModelMetadata` — reasoning config is resolved at call time via provider options.

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

> **Note:** If using preview models, the full ID may be `google:gemini-2.5-flash-lite-preview-06-17`. The plan uses the stable alias `google:gemini-2.5-flash-lite`.
| Reasoning | `google:gemini-2.5-flash` | — |

### Model Discovery
Model discovery and catalog merge live in `lib/ai/models.ts` (no standalone `model-discovery.ts`). Curated models take priority; discovered models extend the catalog with dedup by model ID.

---

## Tool Definitions

### 4 Tools in `lib/ai/tools/`

> *Tools are registered in a handler registry (`lib/ai/`). All `data-*` stream parts renamed to `artifact-*`.*

#### `getWeather`
- **Schema**: `z.union([{ latitude, longitude }, { city }])`
- **Behavior**: Geocodes city via Open-Meteo API, fetches weather forecast
- **Returns**: Temperature, hourly forecast, sunrise/sunset

#### `createArtifact({ session, dataStream, chatId })`
- **Schema**: `z.object({ title: z.string(), kind: z.enum(["text","code","sheet"]) })`
- **Behavior**: Generates UUID, streams data parts (`artifact-kind`, `artifact-id`, `artifact-title`, `artifact-clear`), delegates to `artifactHandler.create()`, writes `artifact-finish`
- **Returns**: `{ id, title, kind, content: "An artifact was created..." }`

#### `updateArtifact({ session, dataStream })`
- **Schema**: `z.object({ id: z.string(), description: z.string() })`
- **Behavior**: Fetches existing artifact via `getArtifactById()`, streams `artifact-clear`, delegates to `artifactHandler.update()`, writes `artifact-finish`
- **Returns**: `{ id, title, kind, content: "The artifact has been updated..." }`

#### `requestSuggestions({ session, dataStream })`
- **Schema**: `z.object({ artifactId: z.string() })`
- **Behavior**: Fetches artifact, uses `streamObject` with artifact-model to generate up to 5 suggestions, streams each as `artifact-suggestion`
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
  tools: { getWeather, createArtifact, updateArtifact, requestSuggestions },
  temperature, topP, maxOutputTokens, // from user settings
  providerOptions,  // reasoning config per provider
  onFinish: async ({ usage }) => { /* usage tracking (no data-usage stream part) */ },
});

result.consumeStream();
dataStream.merge(result.toUIMessageStream({ sendReasoning: true }));
```

### Title Generation
```typescript
const { text: title } = await generateText({
  model: myProvider.languageModel(TITLE_MODEL),
  system: "generate short title...",
  prompt: JSON.stringify(message),
});
```
- Runs in parallel with streaming (non-blocking)
- Fallback: first 80 chars of message text
- Placeholder title used immediately; real title updates via `chat-title` stream part (single-channel)

### Artifact Content Generation

> *Handler registry pattern — each `ArtifactKind` maps to an `ArtifactHandler` with `.create()` and `.update()` methods. Registry lives in `lib/ai/artifact-handlers.ts`; handlers are implemented in `features/artifacts/handlers/` and registered there.*

**Text**: `streamText` → `artifact-textDelta` (accumulated)
**Code**: `streamObject` with `z.object({ code: z.string() })` → `artifact-codeDelta` (replaced)
**Sheet**: `streamObject` with `z.object({ csv: z.string() })` → `artifact-sheetDelta` (replaced)

### Data Stream Protocol (Custom Parts)

> *All `data-*` parts renamed to `artifact-*`. `data-chatTitle` → `chat-title`. `data-usage` removed. `data-appendMessage` removed (useChat manages messages natively).*

| Part Type | Data | Direction | Transient |
|-----------|------|-----------|-----------|
| `artifact-id` | Artifact UUID | Server→Client | Yes |
| `artifact-title` | Artifact title | Server→Client | Yes |
| `artifact-kind` | Artifact kind | Server→Client | Yes |
| `artifact-clear` | null | Server→Client | Yes |
| `artifact-finish` | null | Server→Client | Yes |
| `artifact-textDelta` | Text chunk | Server→Client | Yes |
| `artifact-codeDelta` | Full code | Server→Client | Yes |
| `artifact-sheetDelta` | Full CSV | Server→Client | Yes |
| `artifact-imageDelta` | Base64 image | Server→Client | Yes |
| `artifact-suggestion` | Suggestion object | Server→Client | Yes |
| `chat-title` | Chat title string | Server→Client | Yes |

> *`data-appendMessage` was removed per redesign — `useChat` manages messages natively, so a separate append stream part is unnecessary.*

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
Instructions for `createArtifact`/`updateArtifact` tool usage. Rules: substantial content (>10 lines), code always in artifacts, Python only, never update immediately after creating.

### `updateArtifactPrompt(content, type)`
Update existing content based on user feedback.

### `codePrompt`
Instructs the model to write self-contained Python code: use `print()` for output, keep under 15 lines, no network or file access.

### `sheetPrompt`
Instructs the model to generate CSV data with headers as the first row.

---

## Usage & Limits

`data-usage` stream parts and `AppUsage` credit-style UI state are removed. The AI layer emits standard SDK usage to server-side logs/observability only. Abuse prevention is enforced through route/action rate limiting (HTTP 429), independent of AI provider billing semantics.
