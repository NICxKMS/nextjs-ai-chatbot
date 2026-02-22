# AI Behavior Catalog

## AI Behavior Catalog

## 1) Model Availability And Runtime Discovery
- Provider registry is built from environment-backed providers at startup:
  - `vercel-gateway`, `openai`, `google`, `openrouter`, `cloudflare-workers`, `cloudflare-ai-gateway` (conditional).
- Curated model metadata is merged with discovered provider catalogs.
- Final catalog is filtered to currently configured providers only.
- Dynamic model list drives UI selector and server model validation (`isValidModelId`).
- Default/reasoning model fallbacks are computed from available catalog priority lists.

Behavioral implication:
- exact model inventory is deployment-dependent and can change when env keys or discovery outputs change.

## 2) Model Identity, Reasoning, And Provider Options
- Selected model ID is validated before generation begins.
- Reasoning behavior uses `reasoningType` metadata:
  - maps to provider-specific options (`openai.reasoningEffort`, `anthropic.thinkingBudget`, `google.thinkingConfig`, etc.).
- Provider middleware wraps reasoning models with tag extraction (`extractReasoningMiddleware`) using tag mapping:
  - OpenAI/Gemini/DeepSeek/internal -> `think`.
  - Anthropic -> `thinking`.
- Some models have tooling disabled by policy:
  - pure reasoning-only capability models.
  - specific gemma model class restrictions.

## 3) System Prompt Composition
Runtime prompt is assembled from:
1. base assistant style prompt (`regularPrompt`),
2. user geolocation hints (`lat/lon/city/country`),
3. optional user system prompt from settings,
4. artifact guidance prompt (unless reasoning model branch suppresses it).

Behavioral effect:
- prompt content differs per request context, selected model type, and user settings.

## 4) Streaming Completion Pipeline
- Core execution uses `streamText` with:
  - converted UI messages,
  - stop condition `stepCountIs(5)`,
  - timeout abort signal (~55s),
  - smooth stream transformation with word chunking.
- Stream merged into UI channel with `sendReasoning: true`.
- `consumeStream()` called to ensure stream is consumed and side effects continue.

On-completion behavior:
- usage data enriched via TokenLens when catalog fetch succeeds.
- fallback usage object sent when enrichment fails.
- `data-usage` event emitted to client.

## 5) Tooling Behavior In Chat Generation
Enabled tool set candidate:
- `getWeather`
- `createDocument`
- `updateDocument`
- `requestSuggestions`

Activation:
- `experimental_activeTools` set from model capability policy.
- Tool definitions only attached when at least one tool is enabled.

## 6) Tool Contract Summaries
### `getWeather`
- accepts either city name or coordinates.
- city branch geocodes first then fetches forecast.
- returns weather JSON or structured error string payload.

### `createDocument`
- allocates `documentId` and writes artifact stream metadata and deltas.
- dispatches kind-specific handler (`text`, `code`, `sheet`).
- persists generated content through document data layer.

### `updateDocument`
- loads existing document by id.
- streams clear + updated deltas using matching handler by document kind.
- persists as new version.

### `requestSuggestions`
- streams structured suggestion elements from `streamObject`.
- emits transient suggestion deltas to UI.
- persists suggestions only for non-guest users.

## 7) Artifact Generation Model Behavior
- Artifact handlers use `artifact-model` mapping.
- Kind-specific generation:
  - text: `streamText` markdown content.
  - code: `streamObject` schema `{ code }`.
  - sheet: `streamObject` schema `{ csv }`.
- Updates use `updateDocumentPrompt(currentContent, kind)` to guide rewrite behavior.
- Generated content persisted as versioned document entries.

## 8) Title Generation Behavior
- New chat starts with placeholder title from first user text.
- Concurrent async title generation using dedicated model path.
- Generated title may be streamed transiently (`data-chatTitle`) before DB update.
- Failure fallback: first message text slice up to 80 chars or "New Chat".
- DB title update is fire-and-forget and race-safe against chat deletion.

## 9) Quota/Entitlement Interaction With AI Calls
- Before generation:
  - per-minute rate limit (`chat` limiter),
  - per-day quota check by user type.
- Message count increment happens asynchronously after message persistence and only for user-role messages.

## 10) Error And Fallback Semantics In AI Path
- Invalid model ID rejected before model invocation.
- Initialization errors inside execute path emit stream `error` part.
- Stream-level `onError` returns user-facing fallback text.
- Provider-specific billing failure text is mapped to dedicated gateway activation error.
- Unhandled exceptions map to `offline:chat:unhandled`.

## 11) Test-Observed AI Behaviors
- Route/e2e tests expect:
  - deterministic mock responses in test mode (`chat-model`, reasoning variants).
  - reasoning outputs containing `<think>...</think>` in reasoning model tests.
  - weather tool invocation output formatting.

## Behavioral Conclusions
- AI behavior is not a single provider flow; it is policy-driven orchestration across model metadata, runtime provider availability, and tool gating.
- Streaming is both content transport and state/event transport (usage/title/artifact metadata), so downstream implementations must preserve both channels.
- Artifact tools are integrated into conversational output semantics, not a separate API-only subsystem.
