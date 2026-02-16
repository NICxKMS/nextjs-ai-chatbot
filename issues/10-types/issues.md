# Phase 10: Type Definitions Comparison

**Comparison Date:** 2026-02-15
**OLD Source:** `archive/oldapp/lib/types.ts`, `archive/oldapp/lib/ai/model-catalog-types.ts`, `archive/oldapp/lib/cache/types.ts`, `archive/oldapp/lib/types/message-parts.ts`
**NEW Source:** `lib/types/index.ts`, `lib/ai/registry.ts`, `lib/cache/keys.ts`, `features/chat/types.ts`

---

## Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| FNC | 2 | 1 | 0 | 0 |
| BRK | 1 | 0 | 0 | 0 |
| **Total** | **3** | **1** | **0** | **0** |

---

## Critical Issues

## [P10-FNC-001] Missing Comprehensive Message Parts Type System

**Severity:** Critical
**Status:** Open
**OLD File:** `archive/oldapp/lib/types/message-parts.ts`
**NEW File:** N/A (missing)
**Line Ref:** L1-415

**Description:**
The OLD app had a comprehensive 415-line message parts type system that is completely missing in the NEW app. This includes:

- 12 message part types: `TextPart`, `FilePart`, `ReasoningPart`, `ModelPart`, `ToolCallPart`, `ToolResultPart`, `SourcePart`, `CodePart`, `ArtifactPart`, `ImagePart`, `StepPart`, `UnknownPart`
- `MessagePart` union type combining all part types
- `MessagePartGuards` object with type guards for each part type
- Helper functions: `extractTextFromParts()`, `extractFileUrlsFromParts()`, `getFileName()`, `getMediaType()`, `hasToolCalls()`, `hasReasoning()`, `parseMessageParts()`, `isValidMessagePart()`
- `MessageRole`, `Message`, `MessageAttachment`, `MessageMetadata` types
- Conversion functions: `attachmentToFilePart()`, `filePartToAttachment()`

**Impact:**
- Loss of type safety for message content handling
- No structured way to parse and validate message parts
- Cache types that depend on `MessagePart` and `MessageAttachment` are broken
- Tool call and reasoning detection functionality lost

**Suggested Fix:**
Migrate `archive/oldapp/lib/types/message-parts.ts` to `lib/types/message-parts.ts` and update imports across the codebase.

---

## [P10-FNC-002] Missing AI Model Catalog Types

**Severity:** Critical
**Status:** Open
**OLD File:** `archive/oldapp/lib/ai/model-catalog-types.ts`
**NEW File:** `lib/ai/registry.ts` (partial)
**Line Ref:** L1-59

**Description:**
The OLD app had comprehensive AI model catalog types that are missing or significantly reduced in the NEW app:

**Missing Types:**
- `ModelCapability` - Extended capabilities including: `audio`, `multimodal`, `memory`, `image-generation`, `video-generation` (NEW only has: `chat`, `vision`, `tools`, `reasoning`, `code`)
- `ModelModality` - `"text" | "vision" | "audio"` (completely missing)
- `ReasoningType` - Chain-of-thought types: `"openai-thinking" | "anthropic-thinking" | "gemini-thinking" | "deepseek-thinking" | "internal-thinking" | "none"` (completely missing)
- `ModelMetadata` - Full metadata with `providerName`, `description`, `release`, `contextWindow`, `maxOutputTokens`, `modalities`, `capabilities`, `tags`, `price`, `source`, `isCurated`, `reasoningType`, `thinkingBudget`
- `ProviderCatalog` - Provider with models array
- `ModelCatalogResponse` - API response for model catalog

**Impact:**
- Cannot properly configure reasoning models (o1, Claude extended thinking, DeepSeek R1)
- Missing modality support for audio/multimodal models
- No structured model discovery or catalog API support
- Reduced model metadata for UI display

**Suggested Fix:**
1. Create `lib/ai/model-catalog-types.ts` with the missing types
2. Extend `ModelCapabilities` in `lib/ai/registry.ts` to include missing capabilities
3. Add `ReasoningType` support for reasoning model configuration

---

## [P10-BRK-001] Missing Cache Entity Types

**Severity:** Critical
**Status:** Open
**OLD File:** `archive/oldapp/lib/cache/types.ts`
**NEW File:** `lib/cache/keys.ts` (partial)
**Line Ref:** L1-98

**Description:**
The OLD app had structured cache entity types that are missing in the NEW app:

**Missing Types:**
- `CachedChatMeta` - Chat metadata for Redis cache (id, userId, title, visibility, createdAt, updatedAt, lastContext, version)
- `CachedChat` - Full cached chat with messages
- `CachedMessage` - Cached message structure (id, chatId, role, parts, attachments, createdAt)
- `UserChatListItem` - User chat list item for ZSET (chatId, title, updatedAt)
- `CachedDocument` - Document with versions array
- `DocumentVersion` - Document version structure (title, content, kind, createdAt, updatedAt)

The NEW app only has key generators in `lib/cache/keys.ts` but no entity types.

**Impact:**
- No type safety for cached data structures
- Cache operations work with `unknown` types
- Cannot validate cached data on retrieval
- Document versioning cache support missing

**Suggested Fix:**
Create `lib/cache/types.ts` with all cache entity types. Import `MessagePart` and `MessageAttachment` from the message-parts module (after P10-FNC-001 is fixed).

---

## High Priority Issues

## [P10-FNC-003] Missing Zod Schema for Message Metadata

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/lib/types.ts`
**NEW File:** `features/chat/types.ts`
**Line Ref:** L50-54 (OLD)

**Description:**
The OLD app had a Zod schema for message metadata validation:

```typescript
export const messageMetadataSchema = z.object({
    createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;
```

The NEW app only has the TypeScript interface without Zod validation:

```typescript
export interface MessageMetadata {
    createdAt: string
}
```

**Impact:**
- No runtime validation of message metadata
- Cannot validate API responses or cached data
- Inconsistent with validation patterns elsewhere in the app

**Suggested Fix:**
Add Zod schema for `MessageMetadata` in `features/chat/schemas/` or create a shared schema in `lib/schemas/`.

---

## Files with No Issues

### `lib/types/index.ts`: No issues found - functionally enhanced
The NEW core types file provides enhanced utility types (`ApiResponse`, `PaginatedResponse`, `DatabaseEntity`, utility types, type guards) that are architectural improvements. These are new additions, not replacements for OLD types.

### `lib/ai/providers.ts`: No issues found - functionally equivalent
Provider configuration is implemented differently but provides equivalent functionality.

### `lib/cache/keys.ts`: No issues found - functionally enhanced
Key generators are more comprehensive with better patterns and prefix support.

### `features/chat/types.ts`: Partial coverage
Contains equivalent types for `ChatMessage`, `UserVote`, `Attachment`, `CustomUIDataTypes`, data part types, and type guards. Missing types are documented above.

---

## Migration Checklist

- [ ] Migrate `message-parts.ts` to `lib/types/`
- [ ] Create `lib/ai/model-catalog-types.ts` with missing AI types
- [ ] Create `lib/cache/types.ts` with cache entity types
- [ ] Add Zod schema for `MessageMetadata`
- [ ] Update imports across codebase
- [ ] Add tests for type guards and helper functions
