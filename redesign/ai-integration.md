# AI Integration — Provider Registry, Model Catalog, Tools & Prompts

> Complete AI SDK integration: provider setup, model discovery,
> tool definitions, system prompt composition, and per-provider options.
> Addresses: SEAM-001, SEAM-002, SEAM-003, SEAM-004, SEAM-005, IV-1, VIII-1

---

## 1. Provider Registry

### Registry Construction (`lib/ai/registry.ts`)

```typescript
import { createProviderRegistry, customProvider } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai'

// Conditional providers — only include those with env keys
function buildRegistry() {
  const providers: Record<string, any> = {}

  // Always available: local/default
  const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })
  providers.google = google

  // Optional: OpenAI
  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    providers.openai = openai
  }

  // Optional: OpenRouter (aggregates many models)
  if (process.env.OPENROUTER_API_KEY) {
    const openrouter = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    })
    providers.openrouter = openrouter
  }

  return createProviderRegistry(providers)
}

export const registry = buildRegistry()
```

### myProvider Wrapper (`lib/ai/provider.ts`)

The `myProvider` wrapper applies reasoning middleware based on the model being used.
This is the **single entry point** for obtaining language models throughout the app.

```typescript
import { customProvider, wrapLanguageModel, extractReasoningMiddleware } from 'ai'
import { registry } from './registry'

/** Reasoning middleware tag patterns per provider */
const REASONING_TAGS: Record<string, { tagName: string }> = {
  'openai:o': { tagName: 'thinking' },                     // o1, o3, o4-mini
  'google:gemini-2.5': { tagName: 'thinking' },             // Gemini 2.5 series
  'openrouter:deepseek/deepseek-r1': { tagName: 'think' },  // DeepSeek R1
  'openrouter:anthropic/claude': { tagName: 'thinking' },   // Claude via OpenRouter
}

function getReasoningTag(modelId: string): { tagName: string } | null {
  for (const [prefix, tag] of Object.entries(REASONING_TAGS)) {
    if (modelId.startsWith(prefix)) return tag
  }
  return null
}

export const myProvider = customProvider({
  languageModel: (modelId: string) => {
    const base = registry.languageModel(modelId)
    const reasoningTag = getReasoningTag(modelId)

    if (reasoningTag) {
      return wrapLanguageModel({
        model: base,
        middleware: extractReasoningMiddleware(reasoningTag),
      })
    }

    return base
  },
})
```

**Why `customProvider`**: single concern (middleware in one place), transparent to consumers, extensible for future middleware (logging, token counting), testable (mock `myProvider` only).

---

## 2. Model Catalog

### Model Metadata Type (`lib/types/model.types.ts`)

```typescript
export interface ModelMetadata {
  /** Full provider:model-name ID */
  id: string
  /** Human-readable display name */
  name: string
  /** Provider name (google, openai, openrouter) */
  provider: string
  /** Provider-specific model ID (without provider prefix) */
  providerModelId: string
  /** Modality support */
  modalities: {
    input: ('text' | 'image' | 'file')[]
    output: ('text' | 'reasoning')[]
  }
  /** Context window size in tokens (approximate) */
  contextWindow: number
  /** Max output tokens (approximate) */
  maxOutputTokens: number
  /** Whether this model supports tool/function calling */
  supportsToolCalling: boolean
  /** Whether this model has native reasoning capability */
  supportsReasoning: boolean
  /** Source: 'static' (hardcoded) or 'dynamic' (discovered via API) */
  source: 'static' | 'dynamic'
}

export const DEFAULT_CHAT_MODEL = 'google:gemma-3-4b-it'
export const TITLE_MODEL = 'google:gemma-3-4b-it'
export const ARTIFACT_MODEL = 'google:gemini-2.5-flash-lite-preview-06-17'
```

### Model Discovery (`lib/ai/models.ts`)

```typescript
import 'server-only'
import { cacheTag, cacheLife } from 'next/cache'

// STATIC_MODELS: ModelMetadata[] — hardcoded fallback catalog
// Includes gemma-3-4b-it, gemini-2.5-flash, gemini-2.5-flash-lite, etc.

async function listChatModels(): Promise<ModelMetadata[]> {
  'use cache'
  cacheTag('models')
  cacheLife('hours')

  const dynamicModels = await discoverModels()  // OpenRouter API, 5s timeout
  return deduplicateModels([...STATIC_MODELS, ...dynamicModels])
    .sort((a, b) => a.name.localeCompare(b.name))
}
```

**Cache**: `cacheLife('hours')` auto-refreshes. Manual: `revalidateTag('models')`. On deploy: cache cleared.

---

## 3. Tool System

All tools use **"artifact"** naming. No "document" anywhere.

### Tool Definitions Overview

| Tool | Purpose | Parameters | Handler Location |
|------|---------|------------|------------------|
| `getWeather` | Show weather widget | `{ latitude, longitude }` | `features/chat/lib/tools/weather.ts` (self-contained) |
| `createArtifact` | Create new text/code/sheet | `{ title, kind }` | Handler via registry → `features/artifacts/handlers/` |
| `updateArtifact` | Modify existing artifact | `{ id, description }` | Handler via registry → `features/artifacts/handlers/` |
| `requestSuggestions` | Suggest inline edits | `{ artifactId }` | `features/chat/lib/tools/request-suggestions.ts` |

### getWeather Tool

```typescript
// features/chat/lib/tools/weather.ts
import { z } from 'zod'

export const weatherTool = {
  description: 'Get current weather at a location.',
  parameters: z.object({
    latitude: z.number().describe('Latitude'),
    longitude: z.number().describe('Longitude'),
  }),
  execute: async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
    )
    return res.json()
  },
}
```

### createArtifact Tool

```typescript
// features/chat/lib/tools/create-artifact.ts
import { z } from 'zod'
import { getArtifactHandler } from '@/lib/ai/artifact-handlers'
import { saveArtifactVersion } from '@/lib/data/artifact'
import { generateUUID } from '@/lib/utils'
import type { ArtifactStreamWriter } from '@/lib/types/artifact-handler.types'

const artifactKindSchema = z.enum(['text', 'code', 'sheet'])

export function createArtifactTool({
  session,
  ChatStream,
  chatId,
}: {
  session: { userId: string; isGuest: boolean }
  ChatStream: ArtifactStreamWriter
  chatId: string
}) {
  return {
    description: 'Create an artifact for substantial, self-contained content (>10 lines). '
      + 'Use "text" for prose/markdown, "code" for runnable Python, "sheet" for tabular CSV.',
    parameters: z.object({
      title: z.string().describe('Descriptive title for the artifact'),
      kind: artifactKindSchema.describe('Type of artifact to create'),
    }),
    execute: async ({ title, kind }: { title: string; kind: z.infer<typeof artifactKindSchema> }) => {
      const id = generateUUID()
      const handler = getArtifactHandler(kind)

      // Signal client to open artifact panel
      ChatStream.writeData({ type: 'artifact-kind', content: kind })
      ChatStream.writeData({ type: 'artifact-id', content: id })
      ChatStream.writeData({ type: 'artifact-title', content: title })
      ChatStream.writeData({ type: 'artifact-clear', content: '' })

      // Delegate content generation to registered handler
      const content = await handler.create({ id, title, kind, ChatStream, session, chatId })

      // Persist
      await saveArtifactVersion({ id, title, kind, content, userId: session.userId, chatId })
      ChatStream.writeData({ type: 'artifact-finish', content: '' })

      return { id, title, kind, content: `Created artifact: "${title}"` }
    },
  }
}
```

### updateArtifact Tool

Same factory pattern as `createArtifact`. Parameters: `{ id, description }`. Loads artifact via `getArtifactById(id)`, resolves handler from registry via `getArtifactHandler(artifact.kind)`, writes `artifact-clear` → delegates to `handler.update()` → `saveArtifactVersion()` → `artifact-finish`.

### requestSuggestions Tool

Uses `streamObject` with array output to generate 3–5 inline edit suggestions for text artifacts:

```typescript
// features/chat/lib/tools/request-suggestions.ts
const suggestionSchema = z.object({
  originalText: z.string(),
  suggestedText: z.string(),
  description: z.string(),
})

// Inside execute: loads artifact, streams suggestions via elementStream,
// writes each as { type: 'artifact-suggestion', content: suggestion }
```

### Tool Enablement Logic

```typescript
// lib/ai/tools.ts
import type { ModelMetadata } from '@/lib/types/model.types'

const ALL_TOOLS = ['getWeather', 'createArtifact', 'updateArtifact', 'requestSuggestions'] as const

/**
 * Determines which tools are available for a given model.
 * Models without tool calling support get NO tools (reasoning-only mode).
 */
export function getEnabledTools(modelId: string): typeof ALL_TOOLS[number][] | undefined {
  // Models that don't support function calling
  const noToolModels = [
    'google:gemma-3',         // Gemma family
    'openrouter:deepseek/deepseek-r1',  // DeepSeek R1 (reasoning only)
  ]

  for (const prefix of noToolModels) {
    if (modelId.startsWith(prefix)) return undefined  // undefined = no tools
  }

  return [...ALL_TOOLS]
}
```

When `experimental_activeTools` is `undefined`, AI SDK disables all tools for that request.

---

## 4. Artifact Handler Implementations (Sketch)

These live in `features/artifacts/handlers/` and register via the handler registry.

### Text Handler

```typescript
// features/artifacts/handlers/text-handler.ts
import { streamText } from 'ai'
import { myProvider } from '@/lib/ai/provider'
import { ARTIFACT_MODEL } from '@/lib/types/model.types'
import type { ArtifactHandler, CreateArtifactParams, UpdateArtifactParams } from '@/lib/types/artifact-handler.types'

export const textHandler: ArtifactHandler = {
  async create({ title, ChatStream }) {
    let content = ''
    const result = streamText({
      model: myProvider.languageModel(ARTIFACT_MODEL),
      system: 'Write rich markdown content. No code fences around the whole document.',
      prompt: `Write a document titled "${title}".`,
    })

    for await (const chunk of result.textStream) {
      content += chunk
      ChatStream.writeData({ type: 'artifact-textDelta', content: chunk })
    }
    return content
  },

  async update({ title, currentContent, description, ChatStream }) {
    let content = ''
    const result = streamText({
      model: myProvider.languageModel(ARTIFACT_MODEL),
      system: 'Rewrite the full document incorporating the requested changes.',
      prompt: `Current content:\n${currentContent}\n\nChanges: ${description}`,
    })

    for await (const chunk of result.textStream) {
      content += chunk
      ChatStream.writeData({ type: 'artifact-textDelta', content: chunk })
    }
    return content
  },
}
```

**Delta pattern:** `artifact-textDelta` is **appended** (client accumulates). The content arrives token-by-token for typewriter UX.

### Code & Sheet Handlers

Both use `streamObject` with a schema, emitting **replace** deltas (client overwrites content each time):

```typescript
// code-handler.ts: schema = z.object({ code: z.string() })
//   System: 'Write self-contained Python. Use print() for output. Max 15 lines.'
//   Delta: artifact-codeDelta (REPLACE)

// sheet-handler.ts: schema = z.object({ csv: z.string() })
//   System: 'Generate CSV with headers.'
//   Delta: artifact-sheetDelta (REPLACE)
```

Both follow the same `for await (partial of partialObjectStream)` pattern as text handler, but write the full partial object value (not appending).

---

## 5. System Prompt Composition

### Prompt Builder (`lib/ai/prompts.ts`)

```typescript
import type { UserSettings } from '@/lib/types/settings.types'

/** Base system prompt — always included */
const BASE_PROMPT = `You are a helpful assistant. Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}.`

/** Artifact instructions — included when tools are enabled */
const ARTIFACTS_PROMPT = `
You can create and update artifacts for substantial content.
Use the createArtifact tool when the user requests content that is:
- More than 10 lines of text, code, or data
- Self-contained and referenceable (not inline conversation)
- Iteratively editable (user may want revisions)

Artifact kinds:
- "text": Rich markdown documents, essays, reports, emails
- "code": Self-contained Python code (use print() for output, max 15 lines for simple tasks)
- "sheet": Tabular data as CSV with headers

Do NOT create artifacts for:
- Short code snippets (< 10 lines)
- Brief explanations or answers
- Lists that are part of conversation flow

When updating artifacts, use updateArtifact with a clear description of changes.
`

/** Reasoning instructions — when model supports reasoning */
const REASONING_PROMPT = `
Think step-by-step before responding. Use your reasoning capability for complex tasks.
`

export function composeSystemPrompt({
  settings,
  hasTools,
}: {
  settings: UserSettings
  hasTools: boolean
}): string {
  const parts: string[] = [BASE_PROMPT]

  // User custom system prompt (if set)
  if (settings.systemPrompt?.trim()) {
    parts.push(settings.systemPrompt.trim())
  }

  // Artifact instructions (only when tools available)
  if (hasTools) {
    parts.push(ARTIFACTS_PROMPT)
  }

  // Reasoning hint (when enabled + model supports it)
  if (settings.enableReasoning) {
    parts.push(REASONING_PROMPT)
  }

  return parts.join('\n\n')
}
```

### What Is NOT in the Prompt

| Removed | Reason |
|---------|--------|
| Credit/token usage warnings | No credit/quota system |
| Gateway routing instructions | No gateway layer |
| "Document" references | Renamed to "artifact" everywhere |

---

## 6. Provider Options

### Per-Provider Reasoning Config

```typescript
// lib/ai/provider-options.ts
import type { UserSettings } from '@/lib/types/settings.types'

export function getProviderOptions(
  modelId: string,
  settings: UserSettings,
): Record<string, unknown> {
  const opts: Record<string, unknown> = {}

  // Temperature, topP, maxOutputTokens from user settings
  if (settings.temperature !== undefined) opts.temperature = settings.temperature
  if (settings.topP !== undefined) opts.topP = settings.topP
  if (settings.maxOutputTokens !== undefined) opts.maxTokens = settings.maxOutputTokens

  // Per-provider reasoning configuration
  if (settings.enableReasoning) {
    if (modelId.startsWith('google:')) {
      opts.providerOptions = {
        google: { thinkingConfig: { thinkingBudget: settings.reasoningBudget ?? 1024 } },
      }
    }
    if (modelId.startsWith('openai:')) {
      opts.providerOptions = {
        openai: {
          reasoningEffort: settings.reasoningEffort ?? 'medium',
        },
      }
    }
  }

  return opts
}
```

### Provider-Specific smoothStream

```typescript
// Applied at call site in route handler
const transform = smoothStream({
  delayInMs: modelId.startsWith('google:') ? 2 : 5,  // Google is already smooth
  chunking: 'word',
})
```

---

## 7. Title Generation

```typescript
// lib/ai/title.ts
import { generateText } from 'ai'
import { myProvider } from './provider'
import { TITLE_MODEL } from '@/lib/types/model.types'

export async function generateTitle(messageContent: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: myProvider.languageModel(TITLE_MODEL),
      system: 'Generate a short (4-8 word) title for this conversation. No quotes, no punctuation at the end.',
      prompt: messageContent.slice(0, 500),  // Limit input to save tokens
      maxTokens: 30,
    })
    return text.trim() || messageContent.slice(0, 80)
  } catch {
    return messageContent.slice(0, 80)  // Graceful fallback
  }
}
```

**Called as:** `const titlePromise = generateTitle(msg)` at the top of the stream handler, then `await titlePromise` before stream close. Runs in parallel with main AI generation.

---

## 8. Complete File Map

```
lib/ai/
  ├── registry.ts              # createProviderRegistry (conditional providers)
  ├── provider.ts              # myProvider (reasoning middleware wrapper)
  ├── models.ts                # listChatModels() with 'use cache'
  ├── prompts.ts               # composeSystemPrompt()
  ├── provider-options.ts      # getProviderOptions() per-provider config
  ├── artifact-handlers.ts     # Handler registry (register/get)
  ├── tools.ts                 # getEnabledTools() model-based tool gating
  └── title.ts                 # generateTitle()

lib/types/
  ├── model.types.ts           # ModelMetadata, DEFAULT_CHAT_MODEL, etc.
  ├── artifact.types.ts        # UIArtifact, ArtifactKind
  ├── artifact-handler.types.ts # ArtifactHandler, ArtifactStreamWriter, Create/UpdateParams
  └── settings.types.ts        # UserSettings

features/chat/lib/tools/
  ├── weather.ts               # getWeather (self-contained)
  ├── create-artifact.ts       # createArtifact (uses handler registry)
  ├── update-artifact.ts       # updateArtifact (uses handler registry)
  └── request-suggestions.ts   # requestSuggestions (streams suggestions)

features/artifacts/handlers/
  ├── index.ts                 # Side-effect: registers all handlers
  ├── text-handler.ts          # streamText → artifact-textDelta (append)
  ├── code-handler.ts          # streamObject → artifact-codeDelta (replace)
  └── sheet-handler.ts         # streamObject → artifact-sheetDelta (replace)
```

---

## 9. Summary: What Changed from Old Architecture

| Old Pattern | New Pattern | Finding |
|-------------|-------------|---------|
| `createDocument` / `updateDocument` tools | `createArtifact` / `updateArtifact` | VIII-1 |
| Tools directly import handler implementations | Handler registry in `lib/ai/` with dependency inversion | IV-1 |
| `data-document-*` stream parts | `artifact-*` stream parts | VIII-1 |
| `data-usage` / credit prompting | Removed entirely | No credit logic |
| Hardcoded model list | `listChatModels()` with `use cache` + dynamic discovery | New |
| `middleware.ts` for proxy | `proxy.ts` at project root | Constraint |
| Monolithic system prompt | `composeSystemPrompt()` with conditional composition | SEAM-005 |
| Provider config scattered | `getProviderOptions()` centralized | SEAM-002 |
| No tool gating per model | `getEnabledTools()` respects model capabilities | SEAM-004 |
