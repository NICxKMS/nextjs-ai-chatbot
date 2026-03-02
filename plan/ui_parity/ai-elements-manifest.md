# AI Elements Manifest — 31 Read-Only Primitives

> **Updated per redesign audit (2026-03-01)**

> Location: `oldapp/components/elements/` → Rebuild: `components/ai-elements/`
> These are read-only UI primitives. They must be copied verbatim (checksum-verified) into the rebuild.

---

## Summary

| Metric | Value |
|--------|-------|
| Total files | 31 |
| Total LOC | 4,881 |
| Total exports | ~440 |
| Primary consumers | `message.tsx`, `multimodal-input.tsx`, `message-reasoning.tsx`, `artifact.tsx` |

---

## Element Catalog

### 1. artifact.tsx — `components/ai-elements/artifact.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 128 |
| **Exports** | `ArtifactProps`, `Artifact`, `ArtifactHeaderProps`, `ArtifactHeader`, `ArtifactCloseProps`, `ArtifactClose`, `ArtifactTitleProps`, `ArtifactTitle`, `ArtifactDescriptionProps`, `ArtifactDescription`, `ArtifactActionsProps`, `ArtifactActions`, `ArtifactActionProps`, `ArtifactAction`, `ArtifactContentProps`, `ArtifactContent` (16) |
| **Dependencies** | `lucide-react`, `react`, `@/components/ui/button`, `@/components/ui/tooltip`, `@/lib/utils/cn` |
| **Consumed by** | Artifact panel wrapper |

### 2. canvas.tsx — `components/ai-elements/canvas.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 20 |
| **Exports** | `Canvas` (1) |
| **Dependencies** | `@xyflow/react`, `react` |
| **Consumed by** | Graph/flow visualizations |

### 3. chain-of-thought.tsx — `components/ai-elements/chain-of-thought.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 211 |
| **Exports** | `ChainOfThoughtProps`, `ChainOfThought`, `ChainOfThoughtHeaderProps`, `ChainOfThoughtHeader`, `ChainOfThoughtStepProps`, `ChainOfThoughtStep`, `ChainOfThoughtSearchResultsProps`, `ChainOfThoughtSearchResults`, `ChainOfThoughtSearchResultProps`, `ChainOfThoughtSearchResult`, `ChainOfThoughtContentProps`, `ChainOfThoughtContent`, `ChainOfThoughtImageProps`, `ChainOfThoughtImage` (14) |
| **Dependencies** | `@radix-ui/react-use-controllable-state`, `lucide-react`, `react`, `@/components/ui/badge`, `@/components/ui/collapsible`, `@/lib/utils/cn` |
| **Consumed by** | Search/reasoning display |

### 4. checkpoint.tsx — `components/ai-elements/checkpoint.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 64 |
| **Exports** | `CheckpointProps`, `Checkpoint`, `CheckpointIconProps`, `CheckpointIcon`, `CheckpointTriggerProps`, `CheckpointTrigger` (6) |
| **Dependencies** | `lucide-react`, `react`, `@/components/ui/button`, `@/components/ui/separator`, `@/components/ui/tooltip`, `@/lib/utils/cn` |
| **Consumed by** | Progress/step indicators |

### 5. code-block.tsx — `components/ai-elements/code-block.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 182 |
| **Exports** | `CodeBlock`, `CodeBlockCopyButtonProps`, `CodeBlockCopyButton` (4) |
| **Dependencies** | `dompurify`, `lucide-react`, `react`, `shiki`, `@/components/ui/button`, `@/lib/utils/cn` |
| **Consumed by** | `MessageContent` (code fence rendering), `ToolOutput` |

### 6. confirmation.tsx — `components/ai-elements/confirmation.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 158 |
| **Exports** | `ConfirmationProps`, `Confirmation`, `ConfirmationTitleProps`, `ConfirmationTitle`, `ConfirmationRequestProps`, `ConfirmationRequest`, `ConfirmationAcceptedProps`, `ConfirmationAccepted`, `ConfirmationRejectedProps`, `ConfirmationRejected`, `ConfirmationActionsProps`, `ConfirmationActions`, `ConfirmationActionProps`, `ConfirmationAction` (14) |
| **Dependencies** | `react`, `@/components/ui/alert`, `@/components/ui/button`, `@/lib/types/ai-sdk`, `@/lib/utils/cn` |
| **Consumed by** | Tool confirmation dialogs |

### 7. connection.tsx — `components/ai-elements/connection.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 26 |
| **Exports** | `Connection` (1) |
| **Dependencies** | `@xyflow/react` |
| **Consumed by** | Graph/flow visualizations |

### 8. context.tsx — `components/ai-elements/context.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 379 |
| **Exports** | `ContextProps`, `Context`, `ContextTriggerProps`, `ContextTrigger`, `ContextContentProps`, `ContextContent`, `ContextContentHeaderProps`, `ContextContentHeader`, `ContextContentBodyProps`, `ContextContentBody`, `ContextContentFooterProps`, `ContextContentFooter`, `ContextInputUsageProps`, `ContextInputUsage`, `ContextOutputUsageProps`, `ContextOutputUsage`, `ContextReasoningUsageProps`, `ContextReasoningUsage`, `ContextCacheUsageProps`, `ContextCacheUsage` (20) |
| **Dependencies** | `ai`, `react`, `tokenlens`, `@/components/ui/button`, `@/components/ui/hover-card`, `@/components/ui/progress`, `@/lib/utils/cn` |
| **Consumed by** | `MultimodalInput` (usage/context display) |

### 9. controls.tsx — `components/ai-elements/controls.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 15 |
| **Exports** | `ControlsProps`, `Controls` (2) |
| **Dependencies** | `@xyflow/react`, `react`, `@/lib/utils/cn` |
| **Consumed by** | Graph/flow visualizations |

### 10. conversation.tsx — `components/ai-elements/conversation.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 92 |
| **Exports** | `ConversationProps`, `Conversation`, `ConversationContentProps`, `ConversationContent`, `ConversationEmptyStateProps`, `ConversationEmptyState`, `ConversationScrollButtonProps`, `ConversationScrollButton` (8) |
| **Dependencies** | `lucide-react`, `react`, `use-stick-to-bottom`, `@/components/ui/button`, `@/lib/utils/cn` |
| **Consumed by** | Message list wrappers |

### 11. edge.tsx — `components/ai-elements/edge.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 132 |
| **Exports** | `Edge` (1) |
| **Dependencies** | `@xyflow/react` |
| **Consumed by** | Flow diagram edges |

### 12. image.tsx — `components/ai-elements/image.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 107 |
| **Exports** | `ImageProps`, `Image` (2) |
| **Dependencies** | `ai`, `react`, `@/lib/utils/cn` |
| **Consumed by** | Image file part rendering |

### 13. inline-citation.tsx — `components/ai-elements/inline-citation.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 258 |
| **Exports** | `InlineCitationProps`, `InlineCitation`, `InlineCitationTextProps`, `InlineCitationText`, `InlineCitationCardProps`, `InlineCitationCard`, `InlineCitationCardTriggerProps`, `InlineCitationCardTrigger`, `InlineCitationCardBodyProps`, `InlineCitationCardBody`, `InlineCitationCarouselProps`, `InlineCitationCarousel`, `InlineCitationCarouselContentProps`, `InlineCitationCarouselContent`, `InlineCitationCarouselItemProps`, `InlineCitationCarouselItem`, `InlineCitationCarouselHeaderProps`, `InlineCitationCarouselHeader`, `InlineCitationCarouselIndexProps`, `InlineCitationCarouselIndex`, `InlineCitationCarouselPrevProps`, `InlineCitationCarouselPrev`, `InlineCitationCarouselNextProps`, `InlineCitationCarouselNext`, `InlineCitationSourceProps`, `InlineCitationSource`, `InlineCitationQuoteProps`, `InlineCitationQuote` (28) |
| **Dependencies** | `lucide-react`, `react`, `@/components/ui/badge`, `@/components/ui/carousel`, `@/components/ui/hover-card`, `@/lib/utils/cn` |
| **Consumed by** | `MessageContent` (citation rendering) |

### 14. lazy.tsx — `components/ai-elements/lazy.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 100 |
| **Exports** | `LazyCodeBlock`, `LazyCodeBlockCopyButton`, `LazyCanvas`, `LazyWebPreview`, `LazyReasoning`, `LazyReasoningTrigger`, `LazyReasoningContent`, `preloaders` (9) |
| **Dependencies** | `next/dynamic`, `@/lib/utils/lazy` |
| **Consumed by** | Performance-sensitive rendering paths (lazy-loads heavy components) |

### 15. loader.tsx — `components/ai-elements/loader.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 92 |
| **Exports** | `LoaderProps`, `Loader` (2) |
| **Dependencies** | `react`, `@/lib/utils/cn` |
| **Consumed by** | Various loading states |

### 16. message.tsx — `components/ai-elements/message.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 394 |
| **Exports** | `MessageProps`, `Message`, `MessageContentProps`, `MessageContent`, `MessageActionsProps`, `MessageActions`, `MessageActionProps`, `MessageAction`, `MessageBranchProps`, `MessageBranch`, `MessageBranchContentProps`, `MessageBranchContent`, `MessageBranchSelectorProps`, `MessageBranchSelector`, `MessageBranchPreviousProps`, `MessageBranchPrevious`, `MessageBranchNextProps`, `MessageBranchNext`, `MessageBranchPageProps`, `MessageBranchPage`, `MessageResponseProps`, `MessageResponse`, `MessageAttachmentProps`, `MessageAttachment`, `MessageAttachmentsProps`, `MessageAttachments`, `MessageToolbarProps`, `MessageToolbar` (28) |
| **Dependencies** | `ai`, `lucide-react`, `react`, `streamdown`, `@/components/ui/button`, `@/components/ui/button-group`, `@/components/ui/tooltip`, `@/lib/utils/cn` |
| **Consumed by** | `PreviewMessage` (message rendering), `MessageActions` component |

### 17. model-selector.tsx — `components/ai-elements/model-selector.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 177 |
| **Exports** | `ModelSelectorProps`, `ModelSelector`, `ModelSelectorTriggerProps`, `ModelSelectorTrigger`, `ModelSelectorContentProps`, `ModelSelectorContent`, `ModelSelectorDialogProps`, `ModelSelectorDialog`, `ModelSelectorInputProps`, `ModelSelectorInput`, `ModelSelectorListProps`, `ModelSelectorList`, `ModelSelectorEmptyProps`, `ModelSelectorEmpty`, `ModelSelectorGroupProps`, `ModelSelectorGroup`, `ModelSelectorItemProps`, `ModelSelectorItem`, `ModelSelectorShortcutProps`, `ModelSelectorShortcut`, `ModelSelectorSeparatorProps`, `ModelSelectorSeparator`, `ModelSelectorLogoProps`, `ModelSelectorLogo`, `ModelSelectorLogoGroupProps`, `ModelSelectorLogoGroup`, `ModelSelectorNameProps`, `ModelSelectorName` (28) |
| **Dependencies** | `react`, `@/components/ui/command`, `@/components/ui/dialog`, `@/lib/utils/cn` |
| **Consumed by** | `ModelSelectorCompact`, `ModelSelector` components |

### 18. node.tsx — `components/ai-elements/node.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 60 |
| **Exports** | `NodeProps`, `Node`, `NodeHeaderProps`, `NodeHeader`, `NodeTitleProps`, `NodeTitle`, `NodeDescriptionProps`, `NodeDescription`, `NodeActionProps`, `NodeAction`, `NodeContentProps`, `NodeContent`, `NodeFooterProps`, `NodeFooter` (14) |
| **Dependencies** | `@xyflow/react`, `react`, `@/components/ui/card`, `@/lib/utils/cn` |
| **Consumed by** | Graph/flow nodes |

### 19. open-in-chat.tsx — `components/ai-elements/open-in-chat.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 339 |
| **Exports** | `OpenInProps`, `OpenIn`, `OpenInContentProps`, `OpenInContent`, `OpenInItemProps`, `OpenInItem`, `OpenInLabelProps`, `OpenInLabel`, `OpenInSeparatorProps`, `OpenInSeparator`, `OpenInTriggerProps`, `OpenInTrigger`, `OpenInChatGPTProps`, `OpenInChatGPT`, `OpenInClaudeProps`, `OpenInClaude`, `OpenInT3Props`, `OpenInT3`, `OpenInSciraProps`, `OpenInScira`, `OpenInv0Props`, `OpenInv0`, `OpenInCursorProps`, `OpenInCursor` (24) |
| **Dependencies** | `lucide-react`, `react`, `@/components/ui/button`, `@/components/ui/dropdown-menu`, `@/lib/utils/cn` |
| **Consumed by** | "Open in..." menu for cross-platform AI integration |

### 20. panel.tsx — `components/ai-elements/panel.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 13 |
| **Exports** | `Panel` (1) |
| **Dependencies** | `@xyflow/react`, `react`, `@/lib/utils/cn` |
| **Consumed by** | Graph/flow panel overlays |

### 21. plan.tsx — `components/ai-elements/plan.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 120 |
| **Exports** | `PlanProps`, `Plan`, `PlanHeaderProps`, `PlanHeader`, `PlanTitleProps`, `PlanTitle`, `PlanDescriptionProps`, `PlanDescription`, `PlanActionProps`, `PlanAction`, `PlanContentProps`, `PlanContent`, `PlanFooterProps`, `PlanFooter`, `PlanTriggerProps`, `PlanTrigger` (16) |
| **Dependencies** | `lucide-react`, `react`, `@/components/ui/button`, `@/components/ui/card`, `@/components/ui/collapsible`, `@/lib/utils/cn`, `./shimmer` |
| **Consumed by** | Plan/step display in messages |

### 22. prompt-input.tsx — `components/ai-elements/prompt-input.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 1,275 |
| **Exports** | `AttachmentsContext`, `TextInputContext`, `PromptInputControllerProps`, `usePromptInputController`, `useProviderAttachments`, `PromptInputProviderProps`, `PromptInputProvider`, `usePromptInputAttachments`, `PromptInputAttachmentProps`, `PromptInputAttachment`, `PromptInputAttachmentsProps`, `PromptInputAttachments`, `PromptInputActionAddAttachmentsProps`, `PromptInputActionAddAttachments`, `PromptInputMessage`, `PromptInputProps`, `PromptInput`, `PromptInputBodyProps`, `PromptInputBody`, `PromptInputTextareaProps`, `PromptInputTextarea`, `PromptInputHeaderProps`, `PromptInputHeader`, `PromptInputFooterProps`, `PromptInputFooter`, `PromptInputToolsProps`, `PromptInputTools`, `PromptInputButtonProps`, `PromptInputButton`, `PromptInputActionMenuProps`, `PromptInputActionMenu`, `PromptInputActionMenuTriggerProps`, `PromptInputActionMenuTrigger`, `PromptInputActionMenuContentProps`, `PromptInputActionMenuContent`, `PromptInputActionMenuItemProps`, `PromptInputActionMenuItem`, `PromptInputSubmitProps`, `PromptInputSubmit`, `PromptInputSpeechButtonProps`, `PromptInputSpeechButton`, `PromptInputSelectProps`, `PromptInputSelect`, `PromptInputSelectTriggerProps`, `PromptInputSelectTrigger`, `PromptInputSelectContentProps`, `PromptInputSelectContent`, `PromptInputSelectItemProps`, `PromptInputSelectItem`, `PromptInputSelectValueProps`, `PromptInputSelectValue`, `PromptInputHoverCardProps`, `PromptInputHoverCard`, `PromptInputHoverCardTriggerProps`, `PromptInputHoverCardTrigger`, `PromptInputHoverCardContentProps`, `PromptInputHoverCardContent`, `PromptInputTabsListProps`, `PromptInputTabsList`, `PromptInputTabProps`, `PromptInputTab`, `PromptInputTabLabelProps`, `PromptInputTabLabel`, `PromptInputTabBodyProps`, `PromptInputTabBody`, `PromptInputTabItemProps`, `PromptInputTabItem`, `PromptInputCommandProps`, `PromptInputCommand`, `PromptInputCommandInputProps`, `PromptInputCommandInput`, `PromptInputCommandListProps`, `PromptInputCommandList`, `PromptInputCommandEmptyProps`, `PromptInputCommandEmpty`, `PromptInputCommandGroupProps`, `PromptInputCommandGroup`, `PromptInputCommandItemProps`, `PromptInputCommandItem`, `PromptInputCommandSeparatorProps`, `PromptInputCommandSeparator` (81) |
| **Dependencies** | `ai`, `lucide-react`, `nanoid`, `react`, `@/components/ui/button`, `@/components/ui/command`, `@/components/ui/dropdown-menu`, `@/components/ui/hover-card`, `@/components/ui/input-group`, `@/components/ui/select`, `@/lib/utils/cn`, `@/lib/utils/logger` |
| **Consumed by** | `MultimodalInput` (primary chat input) |
| **Note** | Largest AI element. Rich input with TipTap-style textarea, attachment support, command palette, speech input, hover cards, tabs, action menu. |

### 23. queue.tsx — `components/ai-elements/queue.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 245 |
| **Exports** | `QueueMessagePart`, `QueueMessage`, `QueueTodo`, `QueueItemProps`, `QueueItem`, `QueueItemIndicatorProps`, `QueueItemIndicator`, `QueueItemContentProps`, `QueueItemContent`, `QueueItemDescriptionProps`, `QueueItemDescription`, `QueueItemActionsProps`, `QueueItemActions`, `QueueItemActionProps`, `QueueItemAction`, `QueueItemAttachmentProps`, `QueueItemAttachment`, `QueueItemImageProps`, `QueueItemImage`, `QueueItemFileProps`, `QueueItemFile`, `QueueListProps`, `QueueList`, `QueueSectionProps`, `QueueSection`, `QueueSectionTriggerProps`, `QueueSectionTrigger`, `QueueSectionLabelProps`, `QueueSectionLabel`, `QueueSectionContentProps`, `QueueSectionContent`, `QueueProps`, `Queue` (33) |
| **Dependencies** | `lucide-react`, `react`, `@/components/ui/button`, `@/components/ui/collapsible`, `@/components/ui/scroll-area`, `@/lib/utils/cn` |
| **Consumed by** | Task queue display in messages |

### 24. reasoning.tsx — `components/ai-elements/reasoning.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 183 |
| **Exports** | `useReasoning`, `ReasoningProps`, `Reasoning`, `ReasoningTriggerProps`, `ReasoningTrigger`, `ReasoningContentProps`, `ReasoningContent` (7) |
| **Dependencies** | `@radix-ui/react-use-controllable-state`, `lucide-react`, `react`, `streamdown`, `@/components/ui/collapsible`, `@/lib/utils/cn`, `./shimmer` |
| **Consumed by** | `MessageReasoning` component |

### 25. shimmer.tsx — `components/ai-elements/shimmer.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 58 |
| **Exports** | `TextShimmerProps`, `Shimmer` (2) |
| **Dependencies** | `motion/react`, `react`, `@/lib/utils/cn` |
| **Consumed by** | `reasoning.tsx`, `plan.tsx` (streaming text shimmer effect) |

### 26. sources.tsx — `components/ai-elements/sources.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 68 |
| **Exports** | `SourcesProps`, `Sources`, `SourcesTriggerProps`, `SourcesTrigger`, `SourcesContentProps`, `SourcesContent`, `SourceProps`, `Source` (8) |
| **Dependencies** | `lucide-react`, `react`, `@/components/ui/collapsible`, `@/lib/utils/cn` |
| **Consumed by** | Citation/source display in messages |

### 27. suggestion.tsx — `components/ai-elements/suggestion.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 56 |
| **Exports** | `SuggestionsProps`, `Suggestions`, `SuggestionProps`, `Suggestion` (4) |
| **Dependencies** | `react`, `@/components/ui/button`, `@/components/ui/scroll-area`, `@/lib/utils/cn` |
| **Consumed by** | `SuggestedActions`, input area suggestions |

### 28. task.tsx — `components/ai-elements/task.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 80 |
| **Exports** | `TaskItemFileProps`, `TaskItemFile`, `TaskItemProps`, `TaskItem`, `TaskProps`, `Task`, `TaskTriggerProps`, `TaskTrigger`, `TaskContentProps`, `TaskContent` (10) |
| **Dependencies** | `lucide-react`, `react`, `@/components/ui/collapsible`, `@/lib/utils/cn` |
| **Consumed by** | Task/progress display in tool output |

### 29. tool.tsx — `components/ai-elements/tool.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 156 |
| **Exports** | `ToolProps`, `Tool`, `ToolHeaderProps`, `ToolHeader`, `ToolContentProps`, `ToolContent`, `ToolInputProps`, `ToolInput`, `ToolOutputProps`, `ToolOutput` (10) |
| **Dependencies** | `ai`, `lucide-react`, `react`, `@/components/ui/badge`, `@/components/ui/collapsible`, `@/lib/types/ai-sdk`, `@/lib/utils/cn`, `./code-block` |
| **Consumed by** | `PreviewMessage` (generic tool invocation display) |

### 30. toolbar.tsx — `components/ai-elements/toolbar.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 14 |
| **Exports** | `Toolbar` (1) |
| **Dependencies** | `@xyflow/react`, `react`, `@/lib/utils/cn` |
| **Consumed by** | Graph/flow toolbar |

### 31. web-preview.tsx — `components/ai-elements/web-preview.tsx`

| Field | Detail |
|-------|--------|
| **LOC** | 243 |
| **Exports** | `WebPreviewContextValue`, `WebPreviewProps`, `WebPreview`, `WebPreviewNavigationProps`, `WebPreviewNavigation`, `WebPreviewNavigationButtonProps`, `WebPreviewNavigationButton`, `WebPreviewUrlProps`, `WebPreviewUrl`, `WebPreviewBodyProps`, `WebPreviewBody`, `WebPreviewConsoleProps`, `WebPreviewConsole` (13) |
| **Dependencies** | `lucide-react`, `react`, `@/components/ui/button`, `@/components/ui/collapsible`, `@/components/ui/input`, `@/components/ui/tooltip`, `@/lib/utils/cn` |
| **Consumed by** | Web preview/iframe display |

---

## Dependency Summary

| External Package | Used By |
|-----------------|---------|
| `@xyflow/react` | canvas, connection, controls, edge, node, panel, toolbar |
| `lucide-react` | artifact, chain-of-thought, checkpoint, code-block, context, conversation, inline-citation, message, open-in-chat, plan, prompt-input, queue, reasoning, sources, task, tool, web-preview |
| `@radix-ui/react-use-controllable-state` | chain-of-thought, reasoning |
| `shiki` | code-block |
| `dompurify` | code-block |
| `streamdown` | message, reasoning |
| `motion/react` | shimmer |
| `ai` | context, image, message, prompt-input, tool |
| `tokenlens` | context |
| `nanoid` | prompt-input |
| `use-stick-to-bottom` | conversation |

## Checksum Task Reference

Each file must pass bit-exact checksum comparison. The rebuild task should:
1. Copy each file from `oldapp/components/elements/` to `components/ai-elements/`
2. Update import paths (`@/components/ui/` → same, `@/lib/utils/` → same or new path)
3. Generate SHA-256 checksum of source (post-import-rewrite)
4. Verify no logic changes between old and new
