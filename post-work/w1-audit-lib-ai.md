# Wave 1 — Static Audit: `lib/ai/`

**Date:** 2026-03-07
**Scope:** 11 files in `lib/ai/`
**Method:** Static analysis cross-referenced with Wave 0 flow maps
**Verdict:** No critical showstoppers. Several HIGH-priority architectural waste findings. Two correctness concerns for dynamic/edge-case models.

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 7 |
| MEDIUM | 7 |
| LOW | 6 |

### Top Themes

1. **Redundant computation** — `getModelCapabilities` computed up to 3× per request (provider.ts, provider-options.ts, and the call-site already had metadata)
2. **No-op indirection** — `customProvider` wrapper adds zero value with an empty model map
3. **Static-only model lookup** — `getModelById` blindspot for dynamically discovered models
4. **Missing model instance caching** — new wrapped model created on every request
5. **Reasoning config/metadata mismatch** — `supportsReasoning` flag and reasoning tag/middleware serve overlapping but disconnected purposes

---

## Findings

---

### Finding 1 — `getModelCapabilities` computed redundantly per request

```
FLOW: chat-model-resolution | STEP: 6 + 8b
SEVERITY: [HIGH]
FILE: lib/ai/provider-options.ts:51, lib/ai/provider.ts:18
FINDING: `getModelCapabilities(modelId)` is called twice per chat request:
  (1) Inside `getProviderOptions()` at provider-options.ts:51 to determine `supportsReasoning`
  (2) Inside `reasoningProvider.languageModel()` at provider.ts:18 to determine `reasoningTag`
  Both calls resolve the same data for the same modelId. The chat route (app/api/chat/route.ts:136)
  already validated the model and computed `modelMetadata` in `resolveChatRouteContext`, but this
  metadata is NOT passed through `ChatRouteContext` to downstream consumers. `getProviderOptions`
  has an optional `capabilities` parameter (line 50) that is never used by its only caller.
RECOMMENDATION: Add `modelMetadata` to `ChatRouteContext`. Pass pre-computed capabilities to
  `getProviderOptions(modelId, settings, { supportsReasoning: metadata.supportsReasoning })`.
  This eliminates both redundant `getModelCapabilities` calls in the hot path. The reasoning
  provider will still need one call (it doesn't receive metadata), but the overall count drops
  from 2→1 in the request path.
```

---

### Finding 2 — `customProvider` wrapper is a no-op

```
FLOW: chat-model-resolution | STEP: 7
SEVERITY: [HIGH]
FILE: lib/ai/provider.ts:53-55
FINDING: `myProvider = customProvider({ fallbackProvider: reasoningProvider })` has NO custom
  models in its model map. Every model ID falls through to `reasoningProvider` unconditionally.
  The `customProvider` wrapper adds one layer of indirection with zero functionality. Every
  `myProvider.languageModel()` call (route.ts:157, internal-models.ts:23) goes through this
  empty wrapper before reaching `reasoningProvider`.
RECOMMENDATION: Export `reasoningProvider` directly as the app-wide provider, or populate
  `customProvider`'s model map with something useful (e.g., cached model instances). This removes
  one function call per model resolution. The architectural rationale in the redesign doc
  (plan-archives/redesign/ai-integration.md:89) says it's "extensible for future middleware" —
  but YAGNI applies until that future arrives.
```

---

### Finding 3 — `getModelById` only searches static models

```
FLOW: chat-model-resolution | STEP: 8b (via getModelCapabilities → getModelById)
SEVERITY: [HIGH]
FILE: lib/ai/models.ts:154-155, lib/ai/model-capabilities.ts:13
FINDING: `getModelById(id)` searches `STATIC_MODEL_LOOKUP` only (10 curated models). Dynamically
  discovered OpenRouter models are NOT in this map. When `getModelCapabilities(modelId)` is called
  for a dynamic model without pre-passed metadata:
    - `resolvedMetadata` = undefined
    - `supportsToolCalling` = false (default)
    - `supportsReasoning` = based solely on prefix matching (may be correct or wrong)
  This means `getProviderOptions` for a dynamic reasoning model would compute wrong capabilities.
  In practice, the current chat route validates against the full catalog in `resolveChatRouteContext`
  (features/chat/lib/chat-route.ts:178), but this validated metadata is discarded — only `hasTools`
  boolean survives into `ChatRouteContext`.
RECOMMENDATION: Either (a) pass `modelMetadata` through `ChatRouteContext` so consumers use the
  validated copy, or (b) make `getModelCapabilities` accept an optional catalog fallback. Option (a)
  is simpler and eliminates the lookup entirely. This is the same fix as Finding 1.
```

---

### Finding 4 — Model instances not cached; re-created per request

```
FLOW: chat-model-resolution | STEP: 8
SEVERITY: [HIGH]
FILE: lib/ai/provider.ts:15-27
FINDING: `reasoningProvider.languageModel(modelId)` creates a new wrapped model instance on every
  call. For reasoning models, this means:
    1. `registry.languageModel(modelId)` — new base model instance from SDK
    2. `getModelCapabilities(modelId)` — redundant lookup (Finding 1)
    3. `wrapLanguageModel({ model, middleware: extractReasoningMiddleware(tag) })` — new wrapper
  For internal models (title + artifact), `getInternalLanguageModel(kind)` is called 6+ times
  per artifact create/update flow (text-handler.ts:25,44; code-handler.ts:28,48;
  sheet-handler.ts:29,47; request-suggestions.ts:144; title.ts:25). Each call produces a fresh
  wrapped model. The SDK providers may internally deduplicate, but the wrapping layer doesn't.
RECOMMENDATION: Cache wrapped model instances keyed by `modelId` in a module-level Map within
  provider.ts. Since reasoning middleware is stateless and deterministic per modelId, the same
  wrapped model can be safely reused across requests. `getInternalLanguageModel` could also cache
  its two known models (title + artifact) as module-level singletons.
```

---

### Finding 5 — `supportsReasoning` metadata and reasoning tag/middleware are disconnected

```
FLOW: chat-model-resolution | STEP: 6 + 8b-8d
SEVERITY: [HIGH]
FILE: lib/ai/model-capability-inference.ts:6-9, lib/ai/provider-options.ts:62-86, lib/ai/provider.ts:18-26
FINDING: Two separate systems control reasoning behavior, and they're not in sync:

  SYSTEM A — Reasoning MIDDLEWARE (provider.ts):
    Controlled by `getReasoningTag(modelId)` prefix matching against 3 prefixes.
    Determines if `<thinking>` XML tags are extracted from model output.
    Only matches: google:gemini-2.5*, openai:o*, openrouter:deepseek/deepseek-r1*

  SYSTEM B — Reasoning PROVIDER OPTIONS (provider-options.ts):
    Controlled by `supportsReasoning` from ModelMetadata + provider prefix.
    Determines if reasoning budget/effort is sent to the API.
    Applies to ALL models with supportsReasoning=true from the catalog.

  Mismatches:
  - Claude 3.7 Sonnet: supportsReasoning=true, but NO reasoning tag → gets reasoning budget
    via OpenRouter provider options, but no middleware to extract thinking tokens
  - DeepSeek V3 (deepseek-chat): supportsReasoning=true, but NO reasoning tag → gets reasoning
    budget via OpenRouter, but no XML tag extraction (correct if V3 doesn't emit think tags)
  - GPT-4.1: supportsReasoning=true, NO reasoning tag → gets `reasoningEffort: "medium"` via
    openai provider options (may or may not be valid for GPT-4.1 depending on OpenAI API support)

  The dual system means adding a new reasoning model requires updating BOTH the metadata catalog
  AND the REASONING_TAGS array, with no compile-time guarantee they stay in sync.
RECOMMENDATION: Unify by adding an optional `reasoningTagName` field to `ModelMetadata`. This
  makes the catalog the single source of truth for reasoning support. `getReasoningTag` becomes
  a simple metadata lookup instead of prefix matching. For discovered models, prefix inference
  remains as a fallback.
```

---

### Finding 6 — `openai:o` prefix is overly broad

```
FLOW: chat-model-resolution | STEP: 8c
SEVERITY: [MEDIUM]
FILE: lib/ai/model-capability-inference.ts:7
FINDING: The prefix `"openai:o"` matches any OpenAI model whose providerModelId starts with "o".
  Currently only o-series models (o1, o3-mini, o4-mini) start with "o", so this works. But
  `startsWith("openai:o")` would also match hypothetical future models like `openai:opus` or any
  model name starting with 'o'. No static models currently trigger a false positive, but
  dynamically discovered models via OpenRouter could — though OpenRouter models use the
  `openrouter:` prefix, so this is limited to direct OpenAI models only.
RECOMMENDATION: Use a more specific prefix like `"openai:o1"`, `"openai:o3"`, `"openai:o4"` —
  or match with a regex `/^openai:o\d/` to only match o-series naming patterns. Alternatively,
  this concern is eliminated by Finding 5's recommendation to move reasoning tags into metadata.
```

---

### Finding 7 — ARTIFACT_MODEL goes through unnecessary reasoning middleware

```
FLOW: artifact-handler-registry | STEP: 6 / chat-title-generation | STEP: 3
SEVERITY: [MEDIUM]
FILE: lib/ai/internal-models.ts:23, lib/ai/provider.ts:18-26
FINDING: Internal models go through `myProvider.languageModel(modelId)` which triggers reasoning
  middleware evaluation. ARTIFACT_MODEL = "google:gemini-2.5-flash-lite" (model.types.ts:40) matches
  the `"google:gemini-2.5"` prefix in REASONING_TAGS.  This means EVERY artifact handler call wraps
  the model with `extractReasoningMiddleware({ tagName: "thinking" })`. This middleware scans ALL
  output tokens for `<thinking>` XML tags — adding overhead to every artifact generation stream.
  Artifact handlers don't use reasoning output; the middleware work is wasted.
  
  TITLE_MODEL = "google:gemma-3-4b-it" does NOT match any prefix, so no middleware is applied.
  Only the artifact model is affected.
RECOMMENDATION: Either (a) skip reasoning middleware for internal models by adding a bypass flag,
  (b) use a non-reasoning model for artifacts (e.g., gemini-2.0-flash), or (c) cache the wrapped
  model so the wrapping overhead is one-time (see Finding 4). Option (c) is the minimal fix.
```

---

### Finding 8 — `ChatRouteContext` discards `modelMetadata`

```
FLOW: chat-model-resolution | STEP: 3 → 6
SEVERITY: [HIGH]
FILE: features/chat/lib/chat-route.ts:38-47, :178
FINDING: `resolveChatRouteContext` resolves `modelMetadata` from the full catalog (line 178:
  `availableModels.find(model => model.id === selectedChatModel)`). It uses this metadata to
  compute `hasTools` (line 213: `getEnabledTools(modelMetadata).length > 0`). But `ChatRouteContext`
  only exposes `hasTools: boolean` — the full `modelMetadata` is discarded. This forces downstream
  consumers to re-derive capabilities from the modelId string alone, which is:
  (a) wasteful (redundant computation), (b) incorrect for dynamic models (Finding 3).
  The validated, authoritative metadata is thrown away at the boundary between context resolution
  and route execution.
RECOMMENDATION: Add `modelMetadata: ModelMetadata` to `ChatRouteContext`. This enables:
  - `getProviderOptions(id, settings, { supportsReasoning: metadata.supportsReasoning })` — no re-lookup
  - Future per-model customizations (maxOutputTokens from metadata, context window checks)
  - Correct behavior for dynamic models
```

---

### Finding 9 — Handler registry error code is misleading

```
FLOW: artifact-handler-registry | STEP: 5
SEVERITY: [LOW]
FILE: lib/ai/artifact-handlers.ts:49
FINDING: `getArtifactHandler` throws `AppError.notFound("not_found:artifact:artifact_not_found", ...)`
  when no handler is registered for a kind. The error code `artifact_not_found` suggests an artifact
  entity is missing from the database, but the actual error is that no HANDLER is registered for the
  given kind — a programming/configuration error, not a data error.
RECOMMENDATION: Use a more specific error code like `"not_found:artifact:handler_not_registered"` or
  throw a plain Error (since this is a developer bug, not a user-facing error). The current code
  would confuse debugging — the error looks like a missing DB record.
```

---

### Finding 10 — `title.ts` creates model instance per call; comment is misleading

```
FLOW: chat-title-generation | STEP: 3-4
SEVERITY: [MEDIUM]
FILE: lib/ai/title.ts:25, :20
FINDING: Two issues:
  (a) `getInternalLanguageModel("title")` is called on every new chat. For TITLE_MODEL (gemma-3-4b-it),
      no reasoning middleware is applied, but the full provider chain is traversed:
      myProvider → customProvider (no-op) → reasoningProvider → registry → capabilities check.
      This is pure indirection overhead on every title generation.
  (b) JSDoc comment at line 20 says "the title is awaited before the stream finishes" — but in the
      actual route (app/api/chat/route.ts:115), title is fire-and-forget: `void generateTitle(...)`.
      The title races with the stream; it's NOT awaited. This comment is misleading.
RECOMMENDATION: (a) Cache the title model as a module-level singleton (see Finding 4).
  (b) Fix the comment to accurately describe fire-and-forget semantics.
```

---

### Finding 11 — Title system prompt is inlined rather than a constant

```
FLOW: chat-title-generation | STEP: 4
SEVERITY: [LOW]
FILE: lib/ai/title.ts:26-31
FINDING: The title generation system prompt is a template literal defined inline in `generateTitle()`.
  Per project conventions (prompts.ts pattern), system prompt segments should be module-level constants.
  The prompts.ts file already defines `BASE_PROMPT`, `ARTIFACTS_PROMPT`, `CODE_PROMPT`, `SHEET_PROMPT`
  as named constants. The title prompt follows a different pattern without justification.
RECOMMENDATION: Extract to a `TITLE_PROMPT` constant in title.ts (or prompts.ts for unity).
  Minor readability improvement, consistent with codebase conventions.
```

---

### Finding 12 — `getAvailableProviderIds` returns `Set<string>` instead of `Set<ProviderId>`

```
FLOW: chat-model-resolution | STEP: 4
SEVERITY: [LOW]
FILE: lib/ai/registry.ts:93
FINDING: `getAvailableProviderIds()` returns `Set<string>` but the values are always `ProviderId`.
  The `cachedAvailableProviderIds` variable is typed as `Set<string> | null` (line 90). This loses
  type information — consumers work with `string` instead of the more specific `ProviderId` union.
RECOMMENDATION: Type as `Set<ProviderId>`. The `.map(([providerId]) => providerId)` already produces
  `ProviderId` values; only the variable declaration needs updating.
```

---

### Finding 13 — Side-effect import for handler registration is fragile

```
FLOW: artifact-handler-registry | STEP: 1
SEVERITY: [LOW]
FILE: app/api/chat/route.ts:9
FINDING: `import "@/features/artifacts/handlers"` is a bare side-effect import that registers
  artifact handlers at module evaluation time. This pattern has known fragility:
  - Tree-shaking or dead-code elimination could remove it (though Next.js API routes are server-only)
  - The import order matters but isn't enforced by the type system
  - No compile-time error if the import is accidentally removed
  Per the flow map (artifact-handler-registry.md), this is intentional, but the fragility is noted
  in the flow's own SIMPLIFICATION OPPORTUNITIES section.
RECOMMENDATION: Consider an explicit `initializeHandlers()` function call at the start of the
  route handler. This makes the dependency visible and testable. Low priority — the current
  approach works and is documented.
```

---

### Finding 14 — `discoverModels` hardcodes `supportsToolCalling: false` for all discovered models

```
FLOW: chat-model-resolution | STEP: 4
SEVERITY: [MEDIUM]
FILE: lib/ai/models.ts:191
FINDING: `mapOpenRouterModel` sets `supportsToolCalling: false` for ALL dynamically discovered
  models. There's a TODO comment: "Keep dynamic OpenRouter tool-calling conservative until discovery
  derives trustworthy capability metadata." This means:
  - Users who select a discovered model cannot use tools (createArtifact, updateArtifact, etc.)
  - This is a SILENT degradation — no warning is shown to the user
  - Many OpenRouter models DO support tool calling
RECOMMENDATION: This is a known trade-off (the TODO acknowledges it). Options:
  (a) Parse OpenRouter's API response for tool-calling capability (if available)
  (b) Maintain a curated allowlist of known tool-capable OpenRouter model prefixes
  (c) Add a UI indicator that tools are disabled for the selected model
  Low urgency since this is intentional conservatism.
```

---

### Finding 15 — `providerOptions.google.thinkingBudget = -1` means unlimited thinking

```
FLOW: chat-model-resolution | STEP: 6
SEVERITY: [MEDIUM]
FILE: lib/ai/provider-options.ts:11
FINDING: `GOOGLE_THINKING_BUDGET = -1` means unlimited thinking tokens for Google reasoning models.
  This is functionally correct but has cost implications — a single request could consume thousands
  of thinking tokens. There's no upper bound. The user's `enableReasoning` toggle activates this
  with no granularity control.
RECOMMENDATION: Consider a bounded default (e.g., 4096 tokens) instead of unlimited. The redesign
  notes (plan/behavioral_extraction/ai-sdk-usage.md:232) acknowledge this: "fields that do not exist
  in the planned SettingsState" — `reasoningBudget`/`reasoningEffort` were deferred to a future wave.
  This is a known gap, not a bug.
```

---

### Finding 16 — `REASONING_TAGS` array could be auto-derived from catalog

```
FLOW: chat-model-resolution | STEP: 8c
SEVERITY: [MEDIUM]
FILE: lib/ai/model-capability-inference.ts:5-9
FINDING: The `REASONING_TAGS` array is a manually maintained list of 3 prefix→tag mappings that
  must stay in sync with the `supportsReasoning` field in STATIC_MODELS. If a model is added to
  the static catalog with `supportsReasoning: true` but no corresponding REASONING_TAGS entry (or
  vice versa), behavior silently diverges (Finding 5). There's no validation that these two data
  sources agree.
RECOMMENDATION: This is the implementation side of Finding 5. If `reasoningTagName` is added to
  `ModelMetadata`, the REASONING_TAGS array becomes unnecessary. As an interim step, a build-time
  or startup-time assertion could verify that every static model with `supportsReasoning: true`
  either has a matching REASONING_TAG entry or explicitly opts out.
```

---

### Finding 17 — Provider `google` registered without env key (fails at runtime)

```
FLOW: chat-model-resolution | STEP: 9
SEVERITY: [LOW]
FILE: lib/ai/registry.ts:21-22
FINDING: Google provider has `registerWithoutEnv: true`, meaning it's always registered in the
  AI provider registry even if `GEMINI_API_KEY` is not set. The SDK constructor receives
  `apiKey: process.env.GEMINI_API_KEY` which could be `undefined`. The failure is deferred to the
  first API call — the provider silently accepts an undefined key and fails at request time.

  `getInternalLanguageModel` guards against this (internal-models.ts:16: `isProviderConfigured("google")`),
  but `myProvider.languageModel("google:...")` called from the chat route does NOT — it relies on
  the earlier model validation in `resolveChatRouteContext` to filter out models with unconfigured
  providers. This is correct but relies on multiple layers of defense.
RECOMMENDATION: No action needed — the defense-in-depth is adequate. `getAvailableModels` filters
  by configured providers (features/models/lib/models.ts:28), and `resolveChatRouteContext` validates
  model exists in catalog. Document the design intent in a code comment at the `registerWithoutEnv`
  line explaining why Google is always registered (internal models).
```

---

### Finding 18 — `getEnabledTools` is all-or-nothing

```
FLOW: chat-tool-execution | STEP: 1
SEVERITY: [LOW]
FILE: lib/ai/tools.ts:26-33
FINDING: `getEnabledTools` returns either ALL tools or NONE based on `supportsToolCalling`. There's
  no per-tool gating — can't enable `getWeather` but disable `createArtifact`, for example. This is
  a design limitation, not a bug. The function is clean and minimal.
RECOMMENDATION: No action needed currently. If per-model or per-session tool gating is needed later,
  this function is the correct extension point. The `ToolId` type and `TOOL_IDS` array make it easy
  to add filtering logic.
```

---

### Finding 19 — `embeddingModel`/`imageModel` on reasoningProvider are pass-through

```
FLOW: N/A (not in any traced flow)
SEVERITY: [LOW]
FILE: lib/ai/provider.ts:30-36
FINDING: `reasoningProvider.embeddingModel()` and `reasoningProvider.imageModel()` simply delegate
  to `registry.embeddingModel()` and `registry.imageModel()` with no additional logic. They exist
  to satisfy the `ProviderV3` interface. Neither is called anywhere in the current codebase — no
  embedding or image model usage exists.
RECOMMENDATION: These are dead code paths for now. They're harmless (required by the interface) and
  correctly implemented. If embedding/image models are never needed, they can stay as-is. No action.
```

---

### Finding 20 — `composeSystemPrompt` doesn't receive `supportsReasoning`

```
FLOW: chat-api-pipeline | STEP: 53
SEVERITY: [MEDIUM]
FILE: lib/ai/prompts.ts:95-96, app/api/chat/route.ts:130-133
FINDING: The plan docs (plan/integration_map/ai-integration.md:443) specify the signature as
  `composeSystemPrompt({ settings, hasTools, supportsReasoning })`. The actual implementation only
  takes `{ settings, hasTools }`. The `supportsReasoning` parameter is missing. Currently, reasoning
  instructions are not part of the system prompt — reasoning is handled entirely through provider
  options and middleware. But if reasoning-aware prompting is needed in the future (e.g., "use your
  thinking to verify before answering"), the parameter is absent.
RECOMMENDATION: Low priority. The current approach works because reasoning is handled at the
  infrastructure layer (middleware + provider options), not the prompt layer. If reasoning-aware
  prompting is needed, add `supportsReasoning` to `ComposeSystemPromptOptions`. Track as a known
  deviation from the integration map spec.
```

---

## File-by-File Assessment

| File | Lines | Findings | Needs Work? |
|------|-------|----------|-------------|
| `artifact-handlers.ts` | 54 | #9, #13 | Minor |
| `internal-models.ts` | 24 | #4, #7 | Medium (caching) |
| `model-capabilities.ts` | 24 | #1, #3, #5 | Yes (redundancy + dynamic model gap) |
| `model-capability-inference.ts` | 18 | #5, #6, #16 | Yes (tight coupling to catalog) |
| `models.ts` | 250 | #3, #14 | Medium (static-only lookup) |
| `prompts.ts` | 124 | #20 | Minor |
| `provider.ts` | 55 | #2, #4 | Yes (no-op wrapper + no caching) |
| `provider-options.ts` | 89 | #1, #5, #15 | Yes (redundancy + reasoning mismatch) |
| `registry.ts` | 95 | #12, #17 | Minor |
| `title.ts` | 50 | #10, #11 | Minor |
| `tools.ts` | 33 | #18 | Clean |

---

## Priority Recommendations (Implementation Order)

### P0 — Quick Wins (Low effort, High impact)
1. **Add `modelMetadata` to `ChatRouteContext`** (Findings #1, #3, #8) — Single change that eliminates redundant computation AND fixes dynamic model blindspot.
2. **Pass capabilities to `getProviderOptions`** (Finding #1) — Its `capabilities` parameter already exists and is unused. Wire it up.

### P1 — Significant Improvements
3. **Cache model instances in provider.ts** (Finding #4) — Module-level Map keyed by modelId. Eliminates redundant wrapping (~6× per artifact flow).
4. **Remove `customProvider` wrapper** (Finding #2) — Export `reasoningProvider` directly. Or keep wrapper but populate it with cached models.

### P2 — Design Improvements (Higher effort)
5. **Unify reasoning metadata** (Findings #5, #6, #16) — Add `reasoningTagName` to `ModelMetadata`. Single source of truth for reasoning support.

### P3 — Deferred / Low Priority
6. Fix handler error code (#9), extract title prompt constant (#11), type provider IDs (#12), document `registerWithoutEnv` (#17).

---

## Confidence: HIGH

All findings derived from direct code reading with cross-references to:
- Source files (11 files in `lib/ai/`)
- Consumer call sites (`app/api/chat/route.ts`, `features/chat/lib/chat-route.ts`, `features/models/lib/models.ts`, `features/artifacts/handlers/*.ts`)
- Flow maps (`chat-model-resolution.md`, `chat-title-generation.md`, `chat-tool-execution.md`, `artifact-handler-registry.md`)
- Type definitions (`lib/types/model.types.ts`)
