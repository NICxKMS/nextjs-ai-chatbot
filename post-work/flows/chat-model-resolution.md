FLOW: Model Resolution (User Selection → Provider Lookup → Reasoning Middleware → streamText)
ENTRY: User selects a model via ModelSelector component; model ID stored in `chatModel` state (use-chat-session.ts)

STEPS:
  1. **User model selection** →
     `ModelSelector` component → user picks from available models →
     `setChatModel(modelId)` in useChatSession → stored in `chatModel` state + `chatModelRef` ref →
     Model cookie persisted for next session: `MODEL_COOKIE_NAME = "chat-model"` →
     OUTPUT: Model ID string (e.g., "google:gemini-2.5-flash", "openai:gpt-4o")

  2. **Transport sends model ID** (features/chat/hooks/use-chat-session.ts:100) →
     `DefaultChatTransport.prepareSendMessagesRequest` reads `chatModelRef.current` →
     Includes `selectedChatModel` in POST body →
     OUTPUT: Model ID in request payload

  3. **Server-side validation** (features/chat/lib/chat-route.ts:172-177) →
     In `resolveChatRouteContext`:
     `getAvailableModels()` → fetches full model catalog (cached for hours via `'use cache'`) →
     `availableModels.find(model => model.id === selectedChatModel)` →
     If not found → 400 "Unknown model" →
     OUTPUT: `ModelMetadata` object with capabilities

  4. **Model catalog assembly** (features/models/lib/models.ts:42-52) →
     `getAvailableModels()` [cached]:
       - `getAvailableProviderIds()` → checks which env vars are set (GEMINI_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY)
       - `discoverModels()` → OpenRouter dynamic discovery (if configured)
       - `mergeAvailableModels(discovered, availableProviders)`:
         1. Deduplicate: filter discovered models that duplicate static IDs
         2. Merge: `[...STATIC_MODELS, ...uniqueDiscovered]`
         3. Filter: keep only models whose provider has env var configured
     OUTPUT: `ModelMetadata[]`

  5. **Tool enablement check** (features/chat/lib/chat-route.ts:213) →
     `getEnabledTools(modelMetadata)` (lib/ai/tools.ts:30-35) →
     Checks `model.supportsToolCalling` from metadata →
     If true: returns all TOOL_IDS `["getWeather", "createArtifact", "updateArtifact", "requestSuggestions"]` →
     If false: returns empty array →
     OUTPUT: `hasTools: boolean` for system prompt + tool construction

  6. **Provider options construction** (app/api/chat/route.ts:141) →
     `getProviderOptions(selectedChatModel, effectiveSettings)` (lib/ai/provider-options.ts:52-89) →
     Base options from user settings: `{ temperature, topP, maxOutputTokens }` →
     Reasoning config (if `settings.enableReasoning && model.supportsReasoning`):
       - Google `google:*` → `providerOptions.google.thinkingConfig.thinkingBudget = -1` (unlimited)
       - OpenAI `openai:*` → `providerOptions.openai.reasoningEffort = "medium"`
       - OpenRouter `openrouter:*` → `providerOptions.openrouter.reasoning.max_tokens = 8000`
     OUTPUT: `ProviderOptionsResult` spread into streamText

  7. **Language model instantiation** (app/api/chat/route.ts:157) →
     `myProvider.languageModel(selectedChatModel)` (lib/ai/provider.ts:58-60) →
     `myProvider` = `customProvider({ fallbackProvider: reasoningProvider })` →
     No models in custom provider map → always falls through to `reasoningProvider`

  8. **Reasoning middleware** (lib/ai/provider.ts:14-34) →
     `reasoningProvider.languageModel(modelId)`:
       8a. `registry.languageModel(modelId)` → resolve base model from AI provider registry
       8b. `getModelCapabilities(modelId)` → `getReasoningTag(modelId)` (lib/ai/model-capability-inference.ts)
       8c. Reasoning tag lookup by prefix:
           - `"google:gemini-2.5"` → `{ tagName: "thinking" }`
           - `"openai:o"` → `{ tagName: "thinking" }`
           - `"openrouter:deepseek/deepseek-r1"` → `{ tagName: "think" }`
           - All others → `null`
       8d. If reasoningTag exists:
           `wrapLanguageModel({ model: base, middleware: extractReasoningMiddleware(reasoningTag) })` →
           Wraps model to extract `<thinking>` XML tags from output into structured reasoning parts
       8e. If no reasoningTag: returns base model unchanged
     OUTPUT: Language model (wrapped or unwrapped)

  9. **Registry resolution** (lib/ai/registry.ts:65-79) →
     `registry.languageModel("google:gemma-3-4b-it")` →
     `createProviderRegistry(providers)` → parses `"provider:modelId"` format →
     Dispatches to the correct SDK provider:
       - Google: `createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })`
       - OpenAI: `createOpenAI({ apiKey: process.env.OPENAI_API_KEY })`
       - OpenRouter: `createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })`
     OUTPUT: Provider-specific language model instance

  10. **streamText invocation** (app/api/chat/route.ts:159-170) →
      Final model passed to `streamText({ model, system, messages, tools, ...providerOpts })` →
      Model handles all provider-specific API calls internally →
      OUTPUT: Streaming response

  --- INTERNAL MODEL RESOLUTION (for artifact/title) ---

  11. `getInternalLanguageModel(kind)` (lib/ai/internal-models.ts:14-24) →
      Always resolves to Google provider regardless of user selection:
        - `"artifact"` → `google:ARTIFACT_MODEL`
        - `"title"` → `google:TITLE_MODEL`
      Checks `isProviderConfigured("google")` → throws if GEMINI_API_KEY missing →
      Uses same `myProvider.languageModel(modelId)` → goes through reasoning middleware →
      OUTPUT: Google language model for internal operations

BOTTLENECKS:
  - `getAvailableModels()` is cached but the FIRST call per cache window triggers: `discoverModels()` → HTTP to OpenRouter API → network latency
  - Model validation fetches the ENTIRE catalog just to check if one ID exists — linear scan
  - Reasoning middleware wrapping happens on every request — creates a new wrapped model instance each time (no caching of wrapped models)

WASTE:
  - `getModelCapabilities` is called in multiple places: once for tool enablement (step 5), once for provider options (step 6), and once inside `reasoningProvider` (step 8b) — the same model capabilities are computed up to 3 times
  - The `customProvider` + `reasoningProvider` + `registry` three-layer chain adds indirection for every model resolution — the `customProvider` has no custom models at all, it just delegates everything
  - `mergeAvailableModels` filters by `availableProviders` on every catalog fetch — this filtering could be done once at registry build time

SIMPLIFICATION OPPORTUNITIES:
  - Pre-compute model capabilities once during catalog assembly and store in `ModelMetadata` — eliminates redundant `getModelCapabilities` calls
  - The `customProvider({ fallbackProvider: reasoningProvider })` wrapper is unnecessary — `reasoningProvider` could BE the provider directly (customProvider adds no value with an empty model map)
  - Model validation could use a `Set<string>` of available model IDs instead of `array.find()` — O(1) vs O(n) lookup
  - Cache the wrapped model instances keyed by `modelId` to avoid re-wrapping on every request
  - The 3 prefixes in `REASONING_TAGS` (model-capability-inference.ts) could be auto-derived from `ModelMetadata.supportsReasoning` + a tag field in the catalog

EXIT: Language model instance (potentially wrapped with reasoning middleware) passed to streamText. Provider options (temperature, reasoning config) applied. Tools enabled/disabled based on model capabilities.
