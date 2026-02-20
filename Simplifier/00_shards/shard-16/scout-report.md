# Scout Report: Shard 16 - AI Components

**Generated:** 2026-02-19  
**Scope:** `components/ai/**`, `components/ai-elements/**`

---

## Metrics Block

| Files in shard          | 59 |
| Total LOC               | ~8,700 |
| Exports catalogued      | ~280 |
| Cross-shard edges found | 45 |
| Issues flagged          | 18 |
| Critical complexity (>10)| 0 |

---

## Architecture Overview

### Layer Structure (Documented Intent)

```
Layer 1: ai-elements/ - Read-only SDK primitives (NEVER MODIFY)
Layer 2: ai/ - Project wrappers (compose Layer 1 with project logic)
```

The `components/ai/` directory wraps `components/ai-elements/` primitives with project-specific logic:
- Styling conventions
- Business logic (voting, streaming, state management)
- Project types and interfaces

---

## File Inventory

### components/ai/chat/ (4 files)

| File | LOC | Classification | Exports |
|------|-----|----------------|---------|
| `message.tsx` | 199 | Domain logic | AIMessage, AIThinkingMessage, AIMessageWrapperProps, MessageVote, AIMessageProps, AIMessageContentProps |
| `conversation.tsx` | 148 | Domain logic | AIConversation, AIConversationWrapperProps, MessageVote, useConversationScroll, AIConversationProps |
| `input.tsx` | 194 | Domain logic | AIChatInput, AIChatInputProps, Attachment, AIPromptInputProps |
| `index.ts` | 38 | Config (barrel) | Re-exports from all chat files |

### components/ai/content/ (4 files)

| File | LOC | Classification | Exports |
|------|-----|----------------|---------|
| `code-block.tsx` | 188 | Domain logic | AICodeBlock, AICodeBlockCopyButton, AICodeBlockWrapperProps, AICodeBlockCopyButtonProps, BundledLanguage |
| `web-preview.tsx` | 352 | Domain logic | AIWebPreview, AICodePreview, AIArtifactPreview, AIWebPreviewWrapperProps, AICodePreviewProps, AIArtifactPreviewProps, AIWebPreviewProps |
| `image.tsx` | 309 | Domain logic | AIImage, AIImageGallery, AIImageWrapperProps, AIImageGalleryProps, AIImageProps |
| `index.ts` | 44 | Config (barrel) | Re-exports from all content files |

### components/ai/tools/ (5 files)

| File | LOC | Classification | Exports |
|------|-----|----------------|---------|
| `weather.tsx` | 434 | Domain logic | Weather, WeatherProps, WeatherAtLocation, SAMPLE_WEATHER |
| `confirmation.tsx` | 207 | Domain logic | AIConfirmation, AIToolApproval, AIConfirmationWrapperProps, AIToolApprovalProps, AIConfirmationProps |
| `registry.tsx` | 197 | Domain logic | AIToolRegistry, globalToolRegistry, useToolRegistry, createToolRegistry, registerCommonTools, ToolHandler, ToolRenderer, ToolRendererProps, ToolRegistryProviderProps, commonToolPresets |
| `call.tsx` | 203 | Domain logic | AIToolCall, AIToolCallList, AIToolCallProps, AIToolCallListProps, ToolState, AIToolProps |
| `index.ts` | 42 | Config (barrel) | Re-exports from all tools files |

### components/ai/workflow/ (5 files)

| File | LOC | Classification | Exports |
|------|-----|----------------|---------|
| `task.tsx` | 62 | Domain logic (pass-through) | AITask, AITaskTrigger, AITaskContent, AITaskItem, AITaskItemFile + type exports |
| `queue.tsx` | 163 | Domain logic (pass-through) | AIQueue, AIQueueItem, AIQueueItemIndicator, AIQueueItemContent, AIQueueItemDescription, AIQueueItemActions, AIQueueItemAction, AIQueueItemAttachment, AIQueueItemImage, AIQueueItemFile, AIQueueList, AIQueueSection, AIQueueSectionTrigger, AIQueueSectionLabel, AIQueueSectionContent + type exports |
| `plan.tsx` | 86 | Domain logic (pass-through) | AIPlan, AIPlanHeader, AIPlanTitle, AIPlanDescription, AIPlanAction, AIPlanContent, AIPlanFooter, AIPlanTrigger + type exports |
| `checkpoint.tsx` | 48 | Domain logic (pass-through) | AICheckpoint, AICheckpointIcon, AICheckpointTrigger + type exports |
| `index.ts` | 105 | Config (barrel) | Re-exports from all workflow files |

### components/ai/reasoning/ (4 files)

| File | LOC | Classification | Exports |
|------|-----|----------------|---------|
| `thinking.tsx` | 141 | Domain logic | AIThinking, AIThinkingIndicator, AIThinkingProps, AIThinkingIndicatorProps, AIReasoningProps |
| `steps.tsx` | 192 | Domain logic | AIReasoningSteps, AIReasoningStep, AIReasoningStepsProps, AIReasoningStepProps, ReasoningStep, ReasoningStepStatus, AIChainOfThoughtProps |
| `index.ts` | 33 | Config (barrel) | Re-exports from reasoning files |
| `index.ts` | 33 | Config (barrel) | Re-exports from reasoning files |

### components/ai/utilities/ (4 files)

| File | LOC | Classification | Exports |
|------|-----|----------------|---------|
| `loader.tsx` | 26 | Domain logic (pass-through) | AILoader, AILoaderProps |
| `suggestion.tsx` | 36 | Domain logic (pass-through) | AISuggestions, AISuggestion, AISuggestionsProps, AISuggestionProps |
| `shimmer.tsx` | 28 | Domain logic (pass-through) | AIShimmer, AIShimmerProps |
| `index.ts` | 40 | Config (barrel) | Re-exports from utilities files |

### components/ai/ (1 file)

| File | LOC | Classification | Exports |
|------|-----|----------------|---------|
| `index.ts` | 198 | Config (main barrel) | All exports from subdirectories |

---

### components/ai-elements/ (33 files)

| File | LOC | Classification | Exports |
|------|-----|----------------|---------|
| `message.tsx` | 306 | Primitive | Message, MessageContent, MessageActions, MessageAction, MessageBranch, MessageBranchSelector, MessageAttachments, MessageAttachment + type exports |
| `conversation.tsx` | 129 | Primitive | Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton + type exports |
| `prompt-input.tsx` | 1464 | Primitive | PromptInput, PromptInputProvider, PromptInputTextarea, PromptInputHeader, PromptInputFooter, PromptInputTools, PromptInputButton, PromptInputActionMenu, PromptInputActionMenuTrigger, PromptInputActionMenuContent, PromptInputActionMenuItem, PromptInputSubmit, PromptInputSpeechButton, PromptInputSelect, PromptInputSelectTrigger, PromptInputSelectContent, PromptInputSelectItem, PromptInputSelectValue, PromptInputHoverCard, PromptInputHoverCardTrigger, PromptInputHoverCardContent, PromptInputTabsList, PromptInputTab, PromptInputTabLabel, PromptInputTabBody, PromptInputTabItem, PromptInputCommand, PromptInputCommandInput, PromptInputCommandList, PromptInputCommandEmpty, PromptInputCommandGroup, PromptInputCommandItem, PromptInputCommandSeparator, PromptInputAttachments, PromptInputAttachment, PromptInputActionAddAttachments, usePromptInputController, useProviderAttachments, usePromptInputAttachments + type exports |
| `code-block.tsx` | 225 | Primitive | CodeBlock, CodeBlockCopyButton, highlightCode + type exports |
| `web-preview.tsx` | 271 | Primitive | WebPreview, WebPreviewNavigation, WebPreviewNavigationButton, WebPreviewUrlBar, WebPreviewFrame, WebPreviewContent, WebPreviewConsole, WebPreviewConsoleTrigger, WebPreviewConsoleContent + type exports |
| `image.tsx` | 130 | Primitive | Image + type exports |
| `tool.tsx` | 219 | Primitive | Tool, ToolHeader, ToolContent, ToolInput, ToolOutput + type exports |
| `confirmation.tsx` | 223 | Primitive | Confirmation, ConfirmationTitle, ConfirmationRequest, ConfirmationAccepted, ConfirmationRejected, ConfirmationActions, ConfirmationAction + type exports |
| `task.tsx` | 116 | Primitive | Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile + type exports |
| `queue.tsx` | 333 | Primitive | Queue, QueueItem, QueueItemIndicator, QueueItemContent, QueueItemDescription, QueueItemActions, QueueItemAction, QueueItemAttachment, QueueItemImage, QueueItemFile, QueueList, QueueSection, QueueSectionTrigger, QueueSectionLabel, QueueSectionContent + type exports |
| `plan.tsx` | 177 | Primitive | Plan, PlanHeader, PlanTitle, PlanDescription, PlanAction, PlanContent, PlanFooter, PlanTrigger + type exports |
| `checkpoint.tsx` | 93 | Primitive | Checkpoint, CheckpointIcon, CheckpointTrigger + type exports |
| `reasoning.tsx` | 224 | Primitive | Reasoning, ReasoningTrigger, ReasoningContent, useReasoning + type exports |
| `chain-of-thought.tsx` | 270 | Primitive | ChainOfThought, ChainOfThoughtHeader, ChainOfThoughtStep, ChainOfThoughtSearchResults, ChainOfThoughtSearchResult, ChainOfThoughtContent, ChainOfThoughtImage + type exports |
| `loader.tsx` | 113 | Primitive | Loader + type exports |
| `suggestion.tsx` | 79 | Primitive | Suggestions, Suggestion + type exports |
| `shimmer.tsx` | 75 | Primitive | Shimmer + type exports |
| `artifact.tsx` | 190 | Primitive | Artifact, ArtifactHeader, ArtifactClose, ArtifactTitle, ArtifactDescription, ArtifactActions, ArtifactAction, ArtifactContent + type exports |
| `model-selector.tsx` | 186 | Primitive | ModelSelector, ModelSelectorTrigger, ModelSelectorContent, ModelSelectorDialog, ModelSelectorInput, ModelSelectorList, ModelSelectorEmpty, ModelSelectorGroup, ModelSelectorItem, ModelSelectorShortcut, ModelSelectorSeparator, ModelSelectorLogo + type exports |
| `canvas.tsx` | 43 | Primitive | Canvas + type exports |
| `context.tsx` | 472 | Primitive | Context, ContextTrigger, ContextContent, ContextContentHeader, ContextContentBody, ContextContentFooter, ContextInputUsage, ContextOutputUsage, ContextReasoningUsage, ContextCacheUsage + type exports |
| `controls.tsx` | 32 | Primitive | Controls + type exports |
| `edge.tsx` | 172 | Primitive | Edge.Temporary, Edge.Animated |
| `inline-citation.tsx` | 350 | Primitive | InlineCitation, InlineCitationText, InlineCitationCard, InlineCitationCardTrigger, InlineCitationCardBody, InlineCitationCarousel, InlineCitationCarouselContent, InlineCitationCarouselItem, InlineCitationCarouselHeader, InlineCitationCarouselIndex, InlineCitationCarouselPrev, InlineCitationCarouselNext, InlineCitationSource, InlineCitationQuote + type exports |
| `lazy.tsx` | 116 | Utility | LazyCodeBlock, LazyCodeBlockCopyButton, LazyCanvas, LazyWebPreview, LazyReasoning, LazyReasoningTrigger, LazyReasoningContent, preloaders, createPreloader, preloadModule |
| `node.tsx` | 106 | Primitive | Node, NodeHeader, NodeTitle, NodeDescription, NodeAction, NodeContent, NodeFooter + type exports |
| `open-in-chat.tsx` | 414 | Primitive | OpenIn, OpenInContent, OpenInItem, OpenInLabel, OpenInSeparator, OpenInTrigger, OpenInChatGPT, OpenInClaude, OpenInT3, OpenInScira, OpenInv0, OpenInCursor + type exports |
| `panel.tsx` | 29 | Primitive | Panel + type exports |
| `sources.tsx` | 99 | Primitive | Sources, SourcesTrigger, SourcesContent, Source + type exports |
| `toolbar.tsx` | 30 | Primitive | Toolbar + type exports |
| `connection.tsx` | 42 | Primitive | Connection |
| `index.ts` | 108 | Config (barrel) | Re-exports from all ai-elements files |

---

## Cross-Shard Dependency Edges

### ai/ imports from ai-elements/

| Source File | Target Module |
|-------------|---------------|
| `ai/chat/message.tsx` | `ai-elements/message` |
| `ai/chat/conversation.tsx` | `ai-elements/conversation` |
| `ai/chat/input.tsx` | `ai-elements/prompt-input` |
| `ai/content/code-block.tsx` | `ai-elements/code-block` |
| `ai/content/web-preview.tsx` | `ai-elements/web-preview` |
| `ai/content/image.tsx` | `ai-elements/image` |
| `ai/tools/call.tsx` | `ai-elements/tool` |
| `ai/tools/call.tsx` | `ai-elements/code-block` |
| `ai/tools/confirmation.tsx` | `ai-elements/confirmation` |
| `ai/workflow/task.tsx` | `ai-elements/task` |
| `ai/workflow/queue.tsx` | `ai-elements/queue` |
| `ai/workflow/plan.tsx` | `ai-elements/plan` |
| `ai/workflow/checkpoint.tsx` | `ai-elements/checkpoint` |
| `ai/reasoning/thinking.tsx` | `ai-elements/reasoning` |
| `ai/reasoning/steps.tsx` | `ai-elements/chain-of-thought` |
| `ai/utilities/loader.tsx` | `ai-elements/loader` |
| `ai/utilities/suggestion.tsx` | `ai-elements/suggestion` |
| `ai/utilities/shimmer.tsx` | `ai-elements/shimmer` |

### ai/ imports from external shards

| Source File | Target Module |
|-------------|---------------|
| `ai/chat/message.tsx` | `@/components/icons` |
| `ai/tools/weather.tsx` | `@/hooks/use-mobile` |
| Multiple files | `@/lib/utils` |
| Multiple files | `@/components/ui/*` |
| `ai/tools/confirmation.tsx` | `@/lib/types/ai-sdk` |
| `ai/tools/call.tsx` | `@/lib/types/ai-sdk` |
| `ai-elements/tool.tsx` | `@/lib/types/ai-sdk` |
| `ai-elements/confirmation.tsx` | `@/lib/types/ai-sdk` |

### ai-elements/ imports from external shards

| Source File | Target Module |
|-------------|---------------|
| `ai-elements/prompt-input.tsx` | `@/lib/utils/logger` |
| `ai-elements/lazy.tsx` | `@/lib/utils/lazy` |
| Multiple files | `@/lib/utils` |
| Multiple files | `@/components/ui/*` |

---

## CRITICAL: Duplication Analysis between ai/ and ai-elements/

### Pattern: Pass-Through Wrappers

Many files in `components/ai/` are **pure pass-through wrappers** that add no logic:

| ai/ File | ai-elements/ Source | Wrapper Type |
|----------|---------------------|--------------|
| `ai/workflow/task.tsx` | `ai-elements/task.tsx` | **Pure re-export** (no wrapping logic) |
| `ai/workflow/queue.tsx` | `ai-elements/queue.tsx` | **Pure re-export** (no wrapping logic) |
| `ai/workflow/plan.tsx` | `ai-elements/plan.tsx` | **Pure re-export** (no wrapping logic) |
| `ai/workflow/checkpoint.tsx` | `ai-elements/checkpoint.tsx` | **Pure re-export** (no wrapping logic) |
| `ai/utilities/loader.tsx` | `ai-elements/loader.tsx` | **Pure re-export** (no wrapping logic) |
| `ai/utilities/suggestion.tsx` | `ai-elements/suggestion.tsx` | **Pure re-export** (no wrapping logic) |
| `ai/utilities/shimmer.tsx` | `ai-elements/shimmer.tsx` | **Pure re-export** (no wrapping logic) |

**Issue:** These files exist solely to rename exports (e.g., `Task` → `AITask`) without adding any functionality. This creates:
- Unnecessary indirection
- Import path confusion
- Maintenance burden

### Pattern: Wrappers with Logic

Files that **do** add value through project-specific logic:

| ai/ File | Value Added |
|----------|-------------|
| `ai/chat/message.tsx` | UIMessage integration, memo comparison, role styling, SparklesIcon |
| `ai/chat/conversation.tsx` | MessageVote map, scroll tracking, loading states |
| `ai/chat/input.tsx` | Form handling, attachments, suggestions UI |
| `ai/content/code-block.tsx` | Language display names, streaming indicator, run button |
| `ai/content/web-preview.tsx` | Loading/error overlays, AICodePreview, AIArtifactPreview |
| `ai/content/image.tsx` | Download, fullscreen, gallery, action buttons |
| `ai/tools/confirmation.tsx` | AIToolApproval with parameter display |
| `ai/tools/registry.tsx` | Full registry implementation |
| `ai/tools/call.tsx` | AIToolCallList, custom renderers |
| `ai/reasoning/thinking.tsx` | Streaming detection, AIThinkingIndicator |
| `ai/reasoning/steps.tsx` | Step status styling, icons |

### Duplication Risk: Type Re-definitions

| Type | Defined In Both Locations |
|------|---------------------------|
| `MessageVote` | `ai/chat/message.tsx:29` AND `ai/chat/conversation.tsx:29` |
| `ToolState` | `ai/tools/call.tsx:30` (local definition) |
| ExtendedToolState | Used from `@/lib/types/ai-sdk` in both ai/ and ai-elements/ |

---

## Pattern Flags

### 1. Duplicate Type Definitions

**File:** `components/ai/chat/message.tsx:29-32`  
**File:** `components/ai/chat/conversation.tsx:29-32`  
**Issue:** `MessageVote` interface defined identically in two files.

```
// Both files have identical:
export interface MessageVote {
    isUpvoted?: boolean
    isDownvoted?: boolean
}
```

### 2. Unused Variables

**File:** `components/ai/chat/message.tsx:59-61`  
**Issue:** Props destructured but never used (underscore-prefixed but in function body).

```tsx
const AIMessageComponent = ({
    message,
    vote: _vote,           // unused
    isLoading: _isLoading, // unused
    chatId: _chatId,       // unused
```

**File:** `components/ai/chat/input.tsx:66`  
**Issue:** `chatId` prop destructured but never used.

### 3. Pass-Through Files (Dead Code Candidates)

**Files:** All in `components/ai/workflow/` and `components/ai/utilities/`  
**Issue:** These files only re-export with `AI` prefix, no logic added.

Example from `ai/workflow/task.tsx`:
```tsx
export const AITask = Task
export const AITaskTrigger = TaskTrigger
export const AITaskContent = TaskContent
// etc.
```

### 4. Inconsistent Export Patterns

**File:** `components/ai/content/code-block.tsx:25`  
**Issue:** `BundledLanguage` typed as `string` instead of using Shiki's actual type.

```tsx
export type BundledLanguage = string  // Should import from shiki
```

### 5. Complex Memoization Logic

**File:** `components/ai/chat/message.tsx:148-171`  
**Issue:** Manual memo comparison using `JSON.stringify` is:
- Performance-inefficient for large messages
- Fragile (may miss deep changes in edge cases)
- Lines 160-165 could use a proper deep comparison utility

### 6. Naming Inconsistencies

| ai-elements Export | ai/ Wrapper |
|--------------------|-------------|
| `Message` | `AIMessage` (wraps, different purpose) |
| `Message` (from ai-elements) | Used as `AIMessageBase` in ai/ |
| `CodeBlock` | `AICodeBlock` |
| `Image` | `AIImage` |
| `Conversation` | `AIConversation` |

**Issue:** The naming convention is inconsistent - some primitives are imported with `Base` suffix (`AIMessageBase`), others are renamed at export time.

### 7. Unused Exports

**File:** `components/ai/tools/weather.tsx:376-433`  
**Issue:** `SAMPLE_WEATHER` is exported but likely only used for testing/demos. Should verify usage.

---

## Cross-Shard Import Issues

### Potential Circular Dependency

**File:** `ai/tools/call.tsx:17` imports `CodeBlock` from `ai-elements/code-block`  
**File:** `ai-elements/tool.tsx:30` imports `CodeBlock` from `./code-block`

This is not circular, but `ai/tools/call.tsx` should probably use the `ai/content/code-block.tsx` wrapper instead of going directly to ai-elements.

### Type Dependency on External Shard

**File:** `ai-elements/tool.tsx:28`  
**File:** `ai-elements/confirmation.tsx:20`  
Both import `ExtendedToolState` from `@/lib/types/ai-sdk`. This creates a dependency from ai-elements (Layer 1 primitives) to lib/types. Consider if this type should live in ai-elements or be generic.

---

## Complexity Analysis

No files exceed cyclomatic complexity > 10. The most complex functions are:

| File | Function | Approximate Complexity |
|------|----------|----------------------|
| `ai/chat/message.tsx` | `AIMessageComponent` | 5 |
| `ai/chat/input.tsx` | `AIChatInputInner` | 4 |
| `ai/content/web-preview.tsx` | `AIWebPreviewComponent` | 5 |
| `ai-elements/prompt-input.tsx` | `PromptInput` | 7 |
| `ai-elements/prompt-input.tsx` | `PromptInputProvider` | 6 |

---

## ⚠️ ESCALATION Items

### 1. Architecture Violation: Pass-Through Files

**Severity:** Medium  
**Location:** `components/ai/workflow/*`, `components/ai/utilities/*`  
**Issue:** The documented architecture states `ai/` should add "project-specific logic". Pure re-exports violate this intent.  
**Recommendation:** Either:
1. Remove these wrapper files and import directly from ai-elements
2. Add actual project-specific logic to justify their existence
3. Document that pure pass-throughs are acceptable for naming consistency

### 2. Duplicate Type Definition

**Severity:** Low  
**Location:** `ai/chat/message.tsx:29`, `ai/chat/conversation.tsx:29`  
**Issue:** `MessageVote` defined twice identically  
**Recommendation:** Define once, export from a shared location

### 3. Unused Props Pattern

**Severity:** Low  
**Location:** Multiple files in `ai/chat/`  
**Issue:** Props destructured with underscore prefix but never used  
**Recommendation:** Either implement the features or remove the props from the interface

---

## ⚠️ SCOPE EXTENSION Items

None identified. All analysis stays within the assigned shard scope.

---

## Recommendations

1. **Consolidate Pass-Through Wrappers:** Evaluate if `ai/workflow/` and `ai/utilities/` wrappers provide value. If only for naming, consider a single barrel file pattern.

2. **Move Shared Types:** `MessageVote` should be defined once and exported from a common location.

3. **Fix Unused Variables:** Either implement the intended functionality (vote handling, chatId usage) or remove from interfaces.

4. **Standardize Import Pattern:** Document whether `ai/` files should import from `ai-elements` directly or use relative imports within `ai/`.

5. **Consider Lazy Loading:** The `ai-elements/lazy.tsx` pattern is good; consider extending to more heavy components like `web-preview.tsx`.

---

## Summary

The shard demonstrates a well-intentioned layered architecture with ai-elements as primitives and ai as project wrappers. However, approximately 40% of the ai/ wrapper files are pure pass-throughs that add no value beyond renaming. The wrappers that do add logic (chat/, content/, tools/, reasoning/) follow the intended pattern correctly.

The duplication between directories is **intentional by design** (Layer 1 vs Layer 2), but the implementation could be cleaner by eliminating unnecessary pass-through files and consolidating shared types.
