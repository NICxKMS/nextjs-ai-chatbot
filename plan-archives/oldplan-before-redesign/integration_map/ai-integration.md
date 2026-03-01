# AI Integration

> Complete documentation of AI SDK usage, DataStreamHandler event processing,
> tool execution flow, artifact creation from AI, system prompt composition,
> provider/model resolution, streaming protocol, and usage tracking.

---

## 1. useChat Configuration

The `useChat` hook from `@ai-sdk/react` is the core client-side integration point
for chat functionality. Configured in the `Chat` component.

### Hook Setup

```typescript
const { messages, setMessages, handleSubmit, sendMessage, status, stop, reload } = useChat({
  id: chatId,
  api: "/api/chat",

  // Transport: DefaultChatTransport with custom request preparation
  transport: new DefaultChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest: ({ id, messages }) => ({
      id: chatId,
      message: messages.at(-1),              // Only the latest message
      selectedChatModel: currentModelId,
      selectedVisibilityType: visibilityType,
      settings: settingsSnapshot,           // From useSettingsSnapshot()
    }),
  }),

  initialMessages,                          // Server-fetched for existing chats
  experimental_throttle: adaptiveThrottle,  // 50/100/150ms by connection speed
  generateId: () => generateUUID(),
  maxSteps: 5,                              // Max tool call round-trips
  sendExtraMessageFields: true,

  // Custom data part handling
  onData: (data) => {
    for (const part of data) {
      if (part.type === "data-chatTitle") {
        updateOptimisticChat(chatId, { title: part.data });
      }
      if (part.type === "data-usage") {
        setUsage(part.data);
      }
    }
  },

  // Post-completion handling
  onFinish: (message) => {
    // Poll for confirmed title (5 attempts, 500ms interval)
    pollForTitle(chatId);
    // Dispatch event for sidebar revalidation
    window.dispatchEvent(new Event('chat-title-updated'));
  },

  // Error handling
  onError: (error) => {
    // Parse ChatSDKError from response
    // Show toast with user-friendly message
    // Special handling: rate_limit → specific rate limit message
    //                   offline → "connection lost" message
  },
});
```

### Adaptive Throttle

```typescript
const adaptiveThrottle = (() => {
  if (typeof navigator === 'undefined') return 100;
  const conn = (navigator as any).connection;
  if (!conn) return 100;
  const dl = conn.downlink;
  if (dl >= 10) return 50;    // Fast (≥10 Mbps)
  if (dl >= 1) return 100;    // Medium
  return 150;                  // Slow (<1 Mbps)
})();
```

### Key Behavior Notes

- **Only latest message sent**: `prepareSendMessagesRequest` sends only the last message,
  not full history. Server loads history from DB/cache.
- **Custom fetch**: Wraps `AbortController` for stop/cancel functionality.
- **URL update**: On first message, `history.replaceState` updates URL to `/chat/{chatId}`.
- **Optimistic sidebar**: On first message, `addOptimisticChat()` creates sidebar entry.

---

## 2. DataStreamHandler Event Processing

`DataStreamHandler` is a client component that renders `null`. It bridges the SSE
data stream to client-side SWR state.

### Architecture

```
SSE Stream → useChat → DataStreamProvider (context)
                            ↓
                    DataStreamHandler (effect)
                            ↓ reads dataStream state
                    Processes deltas sequentially
                            ↓
                    setArtifact() (SWR mutate)
                            ↓
                    Artifact panel re-renders
```

### Delta Processing Logic

```typescript
// DataStreamHandler processes accumulated deltas from DataStreamProvider
for (const delta of newDeltas) {
  // 1. Base artifact state updates
  switch (delta.type) {
    case "data-id":     setArtifact({ documentId: delta.data, status: "streaming" });
    case "data-title":  setArtifact({ title: delta.data, status: "streaming" });
    case "data-kind":   setArtifact({ kind: delta.data, status: "streaming" });
    case "data-clear":  setArtifact({ content: "", status: "streaming" });
    case "data-finish": setArtifact({ status: "idle" });
  }

  // 2. Per-kind content delta processing (via artifactDefinition.onStreamPart)
  // Each artifact kind defines how it processes its specific delta type
}
```

### Per-Kind Stream Part Handlers

| Kind | Delta Type | Behavior | Accumulation |
|------|-----------|----------|-------------|
| text | `data-textDelta` | Append to content | `content += delta.data` |
| code | `data-codeDelta` | Replace content | `content = delta.data` |
| sheet | `data-sheetDelta` | Replace content | `content = delta.data` |
| image | `data-imageDelta` | Replace content | `content = delta.data` (base64) |

### Processing Safeguards

- `lastProcessedIndex` ref prevents reprocessing deltas
- `lastArtifactKind` ref detects kind changes → resets processing index
- Empty dataStream → resets processing index
- Single `setArtifact` call per delta (prevents double state updates)

---

## 3. Tool Execution Flow

### Tool Registration (Server-Side)

```
POST /api/chat → executeChatCompletion()
  │
  ├── Tools registered with streamText():
  │     tools: {
  │       getWeather,                           // Static tool definition
  │       createDocument({ session, dataStream, chatId }),  // Factory with closures
  │       updateDocument({ session, dataStream }),          // Factory with closures
  │       requestSuggestions({ session, dataStream }),      // Factory with closures
  │     }
  │
  ├── Tool enablement based on model:
  │     → reasoning-only (single "reasoning" capability) → NO tools
  │     → google:gemma-* models → NO tools
  │     → has "tooling" capability → ALL 4 tools
  │     → otherwise → NO tools
  │
  └── experimental_activeTools filters to enabled tools only
```

### Tool Execution Lifecycle

```
1. AI model returns tool_call in stream
2. AI SDK invokes tool.execute()
3. Tool writes data parts to dataStream
4. Tool may invoke AI generation (streamText/streamObject)
5. Tool returns structured result
6. AI SDK includes tool_result in next step
7. AI model continues with tool result context
8. Max 5 steps (stepCountIs(5))
```

### getWeather Tool

```
Input: { latitude, longitude } OR { city }
  │
  ├── If city provided:
  │     GET https://geocoding-api.open-meteo.com/v1/search?name={city}
  │     Extract latitude, longitude from first result
  │
  ├── GET https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}
  │     &hourly=temperature_2m,relative_humidity_2m&daily=sunrise,sunset
  │
  └── Return: { temperature, hourlyForecast[], sunrise, sunset }
```

### createDocument Tool

```
Input: { title: string, kind: "text"|"code"|"sheet" }
  │
  ├── id = generateUUID()
  ├── Stream metadata: data-kind → data-id → data-title → data-clear
  │
  ├── Find handler: documentHandlersByArtifactKind[kind]
  │     ├── TEXT: streamText({ model: artifact-model, system: textPrompt })
  │     │         → stream data-textDelta parts (character-by-character)
  │     ├── CODE: streamObject({ model: artifact-model, schema: { code: string } })
  │     │         → stream data-codeDelta parts (full replacement)
  │     └── SHEET: streamObject({ model: artifact-model, schema: { csv: string } })
  │               → stream data-sheetDelta parts (full replacement)
  │
  ├── documentData.save({ id, title, kind, content, userId, chatId })
  │     ├── Guest: cache only (Redis)
  │     └── Auth: DB INSERT + cache update
  │
  ├── Stream: data-finish
  └── Return: { id, title, kind, content: "A document was created..." }
```

### updateDocument Tool

```
Input: { id: string, description: string }
  │
  ├── documentData.get(id, ctx) → existing document with versions
  ├── latestVersion = document.versions.at(-1)
  │
  ├── Stream: data-clear
  │
  ├── handler.onUpdateDocument({ document: latestVersion, description })
  │     ├── Same per-kind streaming as create
  │     └── Uses existing content + description as AI context
  │
  ├── documentData.save() → new version row (same id, new createdAt)
  ├── Stream: data-finish
  └── Return: { id, title, kind, content: "The document has been updated..." }
```

### requestSuggestions Tool

```
Input: { documentId: string }
  │
  ├── documentData.get(documentId, ctx) → document
  ├── latestVersion = document.versions.at(-1)
  │
  ├── streamObject({
  │     model: artifact-model,
  │     schema: z.object({
  │       suggestions: z.array(z.object({
  │         originalText: z.string(),
  │         suggestedText: z.string(),
  │         description: z.string()
  │       })).max(5)
  │     }),
  │     prompt: latestVersion.content
  │   })
  │
  ├── For each suggestion:
  │     dataStream.write({ type: "data-suggestion", data: suggestion })
  │
  ├── Auth users: saveSuggestions() → DB
  ├── Guest users: in-session only (not persisted)
  │
  └── Return: { id, title, kind, message: "Suggestions have been added..." }
```

---

## 4. System Prompt Composition

### Assembly Order

```typescript
systemPrompt = [
  regularPrompt,              // Always included — base assistant instructions
  userSystemPrompt?,          // From settings (max 8192 chars), if non-empty
  requestPrompt,              // Geo hints: latitude, longitude, city, country
  artifactsPrompt?,           // Only if model is NOT reasoning-only
].filter(Boolean).join("\n\n")
```

### Prompt Components

| Prompt | Source | Content |
|--------|--------|---------|
| `regularPrompt` | `lib/ai/prompts.ts` | "You are a helpful assistant. Be concise and direct. Use tools only when necessary. Match the user's tone." |
| `userSystemPrompt` | `settings.systemPrompt` (localStorage → request body) | User-defined custom instructions (max 8192 chars) |
| `requestPrompt` | `geolocation(request)` (Vercel Functions) | Geo hints: "The user is located near {city}, {country} ({lat}, {lon})" |
| `artifactsPrompt` | `lib/ai/prompts.ts` | Instructions for createDocument/updateDocument usage: when to create artifacts, Python-only code, >10 lines threshold |

### Artifact Sub-Prompts (Per-Kind)

| Kind | Prompt | Key Instructions |
|------|--------|-----------------|
| text | `textPrompt` | Write Markdown, no code blocks in artifacts |
| code | `codePrompt` | Self-contained Python, print() for output, max 15 lines, no network/file access |
| sheet | `sheetPrompt` | CSV with headers |
| update | `updateDocumentPrompt(content, type)` | Update existing content based on user description |

---

## 5. Provider/Model Resolution

### Provider Registry

```
createProviderRegistry(baseProviders)
  │
  ├── Conditionally initialized based on env vars:
  │     ├── vercel-gateway: AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN
  │     ├── openai: OPENAI_API_KEY
  │     ├── google: GEMINI_API_KEY
  │     ├── openrouter: OPENROUTER_API_KEY
  │     ├── cloudflare-workers: CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_KEY
  │     └── cloudflare-ai-gateway: CLOUDFLARE_ACCOUNT_ID + name + API key
  │
  └── Models resolved as: "provider:model-name" → registry.languageModel("provider:model-name")
```

### myProvider Wrapper

```typescript
// lib/ai/providers.ts
export const myProvider = {
  languageModel(modelId: string) {
    // Test mode: return mock models
    if (isTest) return mockModel(modelId);

    // Production: resolve through registry
    const model = registry.languageModel(modelId);

    // Wrap reasoning models with middleware
    const metadata = getModelById(modelId);
    if (metadata?.reasoningType) {
      return wrapLanguageModel(model,
        extractReasoningMiddleware({ tagName: getTagName(metadata.reasoningType) })
      );
    }

    return model;
  }
};
```

### Reasoning Middleware Configuration

| Reasoning Type | Tag Name | Provider Options |
|----------------|----------|-----------------|
| `openai-thinking` | `<think>` | `openai: { reasoningEffort: "high" }` |
| `anthropic-thinking` | `<thinking>` | `anthropic: { thinkingBudget: N }` |
| `gemini-thinking` | `<think>` | `google: { thinkingConfig: { type: "enabled", includeThoughts: true } }` |
| `deepseek-thinking` | `<think>` | `deepseek: { reasoningLevel: "high" }` |
| `internal-thinking` | `<think>` | `reasoning: { enabled: true, budget: N }` |

### Model Catalog

```
Curated models (lib/ai/curated-models.ts)
  + Discovered models (lib/ai/model-discovery.ts → provider.listModels())
  = Merged catalog (curated takes priority on ID collision)

Model discovery:
  - Iterates configured providers
  - Calls provider-specific list API
  - Maps to ModelMetadata format
  - Marks as source: "discovered"

Default models:
  - Chat: google:gemma-3-4b-it
  - Title generation: google:gemma-3-4b-it
  - Artifact generation: google:gemini-2.5-flash-lite (fallback: DEFAULT_CHAT_MODEL)
```

---

## 6. Streaming Protocol Details

### Server-Side Stream Construction

```typescript
const stream = createUIMessageStream({
  execute: ({ writer: dataStream }) => {
    // 1. Title generation (parallel, non-blocking for new chats)
    generateTitleFromUserMessage({ message }).then(title => {
      dataStream.write({ type: "data-chatTitle", data: title, transient: true });
    });

    // 2. Chat completion
    const result = streamText({
      model: myProvider.languageModel(modelId),
      system: systemPrompt,
      messages: convertToModelMessages(uiMessages),
      tools: enabledTools,
      stopWhen: stepCountIs(5),
      abortSignal: AbortSignal.timeout(55_000),
      experimental_transform: smoothStream({ delayInMs: 2, chunking: "word" }),
      temperature, topP, maxOutputTokens,
      providerOptions,
      onFinish: async ({ usage }) => {
        // TokenLens usage enrichment
        const catalog = await tokenlensCatalogPromise;
        const appUsage = getUsage(usage, catalog);
        dataStream.write({ type: "data-usage", data: appUsage });
      },
    });

    result.consumeStream();
    dataStream.merge(result.toUIMessageStream({ sendReasoning: true }));
  },
  onFinish: async ({ messages }) => {
    // Persist: save messages, increment quota, update title
    await saveChat({ chatId, messages, ctx, ... });
  },
});

return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
```

### smoothStream Configuration

```typescript
experimental_transform: smoothStream({
  delayInMs: 2,         // 2ms between chunks
  chunking: "word",     // Word-level chunking (not character)
})
```

### Stream Lifecycle

```
1. Client POST /api/chat
2. Server creates UIMessageStream
3. Title generation starts (async, parallel)
4. streamText() begins → tokens flow
5. Tool calls may interrupt → execute tool → resume
6. data-chatTitle arrives (from title generation)
7. AI response completes → data-usage written
8. onFinish → messages saved to DB/cache
9. Stream closes
10. Client: status → "ready", onFinish callback fires
```

---

## 7. Usage Tracking

### TokenLens Integration

```typescript
// Catalog fetched with "use cache" directive (24h TTL)
async function getTokenlensCatalog(): Promise<ModelCatalog | undefined> {
  "use cache";
  cacheTag("tokenlens-catalog");
  cacheLife("days");
  const { fetchModels } = await import("tokenlens/fetch");
  return await fetchModels();
}

// On completion:
onFinish: async ({ usage }) => {
  const catalog = await tokenlensCatalogPromise;
  const appUsage = getUsage(usage, catalog, modelId);
  // appUsage includes: promptTokens, completionTokens, totalTokens, cost data
  dataStream.write({ type: "data-usage", data: appUsage });
  // Also saved to chat.lastContext
}
```

### AppUsage Type

```typescript
type AppUsage = LanguageModelUsage & {
  modelId: string;
  // Cost info from TokenLens catalog
};
// Extends AI SDK LanguageModelUsage: { promptTokens, completionTokens, totalTokens }
```

### Entitlements / Quotas

| User Type | Max Messages/Day | Tracked Via |
|-----------|-----------------|-------------|
| Guest | 20 | Redis counter: `quota:{userId}:messages` |
| Authenticated | 100 | Redis counter: `quota:{userId}:messages` |

Quota checked before processing, incremented after successful save (async).
Daily TTL on Redis counter auto-resets at midnight.
