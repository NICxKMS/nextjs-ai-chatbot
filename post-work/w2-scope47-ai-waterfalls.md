# Scope 4+7 — Waterfall Optimization + AI Model Pipeline Cleanup

**Date:** 2026-03-07
**Status:** ✅ Complete

---

## Summary

Merged two scopes targeting the AI model pipeline and request waterfalls. The changes eliminate sequential awaits in both the chat page and API route, remove redundant capability computation, and add runtime validation and type safety throughout the AI pipeline.

---

## Changes by File

### 1. `lib/types/model.types.ts`
- **Added** `reasoningTagName?: string` field to `ModelMetadata` interface
- Makes the catalog the single source of truth for reasoning tag configuration

### 2. `lib/ai/models.ts`
- **Populated** `reasoningTagName` on all 8 static models that support reasoning:
  - Google models: `"thinking"`
  - OpenAI gpt-4.1: `"thinking"`
  - OpenRouter Claude 3.7: `"thinking"`
  - OpenRouter DeepSeek R1/V3: `"think"`
- **Updated** `mapOpenRouterModel()` to include `reasoningTagName` from inference for dynamic models

### 3. `lib/ai/model-capabilities.ts`
- **Changed** `getModelCapabilities()` to prefer `metadata.reasoningTagName` (catalog source of truth)
- Falls back to prefix-based `getReasoningTag()` inference for models not in the catalog
- Added detailed JSDoc explaining the resolution hierarchy

### 4. `lib/ai/provider.ts`
- **Removed** the no-op `customProvider` wrapper — it had an empty model map so all IDs fell through to the fallback provider
- **Exported** the provider logic directly as `myProvider: ProviderV3`
- **Added** module-level `modelCache = new Map<string, LanguageModel>()` — model instances (including reasoning middleware wrapping) are cached per modelId
- Added explicit return types for `embeddingModel` and `imageModel` methods
- **Removed** `customProvider` from imports (no longer needed from `ai` package)

### 5. `lib/ai/provider-options.ts`
- **Changed** `getProviderOptions()` signature: third parameter is now `Pick<ModelMetadata, "supportsReasoning" | "provider">` instead of `Pick<ModelCapabilities, "supportsReasoning">`
- **Removed** import of `getModelCapabilities` — no longer re-derives capabilities from string
- Uses `metadata.provider` for provider-specific reasoning config instead of `modelId.startsWith()` prefix matching
- Falls back to `modelId.split(":")[0]` when no metadata provided (backward compat)

### 6. `features/chat/lib/message-utils.ts`
- **Added** runtime validation for `role` and `parts` fields from DB rows:
  - `isValidRole()` — type guard checking against `Set<UIMessage["role"]>`
  - `isValidParts()` — validates array of objects with `type: string`
  - `toValidatedUIMessage()` — validates then converts, throws on corrupt data
- `convertToUIMessages()` now uses validated conversion instead of raw casts

### 7. `features/chat/lib/chat-route.ts`
- **Added** `modelMetadata: ModelMetadata` field to `ChatRouteContext` type
- **Added** centralized role validation: `VALID_DB_ROLES` Set + `toDbRole()` helper
  - Replaces the scattered `message.role as NewMessage["role"]` cast in `toAssistantDbMessages()`
- **Parallelized** `resolveChatRouteContext()`: messages now fetch in the initial `Promise.all` alongside model validation and chat lookup
  - Before: `[models, chat] → messages` (sequential)
  - After: `[models, chat, messages]` (parallel)
  - For new chats, `getMessagesForChatRender` returns empty array (correct behavior)
- `modelMetadata` is now included in the returned context for downstream consumers

### 8. `app/api/chat/route.ts`
- **Created** `ChatStreamDataPart` union type for the 3 known data part types
- **Created** `writeStreamData()` typed helper that centralizes the single necessary cast
  - Replaces 4 scattered `as Parameters<typeof writer.write>[0]` casts
- **Destructures** `modelMetadata` from `chatContext`
- **Passes** `modelMetadata` to `getProviderOptions()` — capabilities computed once, not twice

### 9. `app/(chat)/chat/[id]/page.tsx`
- **Parallelized** page-level fetches: messages, access control (getChatPageState), and models all start at time-0 via `Promise.all`
  - Before: `getChatPageState → [messages, models]` (waterfall)
  - After: `[getChatPageState, messages, models]` (parallel)
  - Messages are fetched speculatively — discarded if access control fails (`notFound()`)

---

## Architectural Deviations

### 1. No-op `customProvider` removed
- **Original:** `customProvider({ fallbackProvider: reasoningProvider })` — a two-layer wrapper
- **New:** Direct `ProviderV3` object exported as `myProvider`
- **Why:** The `customProvider` wrapper had an empty model map, meaning every call fell through to the fallback provider. The wrapper added an unnecessary function call per model resolution with zero behavior difference.
- **Trade-off:** If future models need static model map entries, they'd be added to the `myProvider` object directly.

### 2. Provider detection via `metadata.provider` instead of `modelId.startsWith()`
- **Original:** `modelId.startsWith("google:")` for provider-specific reasoning config
- **New:** `metadata?.provider ?? modelId.split(":")[0]`
- **Why:** Metadata-driven dispatch is more reliable (the provider field is validated) and doesn't break if model ID format changes.

### 3. Speculative messages fetch in page
- **Original:** Messages fetched after access control confirmed ownership
- **New:** Messages fetched in parallel with access control
- **Why:** Eliminates ~70-150ms waterfall. If access control fails, the speculative fetch result is simply discarded (React Server Component function exits via `notFound()`).
- **Trade-off:** One extra DB query on unauthorized access attempts. Acceptable because: (a) unauthorized access is the rare path, (b) `getMessagesForChatRender` is a read-only SELECT, (c) the query uses chatId which may return empty if the chat doesn't exist.

---

## Victory Condition Checklist

- [x] `ChatRouteContext` includes `modelMetadata`
- [x] Model capabilities computed once per request (not 2×) — metadata flows from context to `getProviderOptions`
- [x] Chat page waterfall eliminated (parallel fetch via `Promise.all`)
- [x] API route messages fetched in parallel with validation
- [x] No-op `customProvider` eliminated (direct `ProviderV3` export)
- [x] Model instances cached at module level (`modelCache`)
- [x] Unsafe writer casts replaced with typed `writeStreamData()` helper
- [x] role/parts DB casts have runtime validation (`toValidatedUIMessage`)
- [x] `pnpm typecheck` passes (only pre-existing `suggestions-extension.tsx` errors remain)

---

## Validation

```
pnpm format   — ✅ (only pre-existing suggestions-extension.tsx parsing error)
pnpm typecheck — ✅ (only pre-existing suggestions-extension.tsx errors)
pnpm lint     — ✅ (only pre-existing unrelated lint warnings)
```

---

## Files Modified

| File | Lines Changed |
|------|---------------|
| `lib/types/model.types.ts` | +2 |
| `lib/ai/models.ts` | +12 -4 |
| `lib/ai/model-capabilities.ts` | +15 -7 |
| `lib/ai/provider.ts` | +52 -42 |
| `lib/ai/provider-options.ts` | +15 -12 |
| `features/chat/lib/message-utils.ts` | +48 -9 |
| `features/chat/lib/chat-route.ts` | +28 -8 |
| `app/api/chat/route.ts` | +23 -12 |
| `app/(chat)/chat/[id]/page.tsx` | +10 -10 |
