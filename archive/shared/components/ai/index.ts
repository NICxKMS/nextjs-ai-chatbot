/**
 * AI Element Wrappers
 *
 * This module provides enhanced wrapper components for AI Elements.
 * Wrappers add custom functionality (voting, downloads, previews, etc.)
 * while preserving the original AI Element API.
 *
 * ## Usage
 *
 * Import wrappers from this module instead of directly from ai-elements:
 *
 * ```tsx
 * // Instead of:
 * import { Message } from '@/components/ai-elements/message';
 *
 * // Use:
 * import { Message } from '@/shared/components/ai';
 * ```
 *
 * ## Available Wrappers
 *
 * - **Message**: Enhanced with voting, editing, copying, and avatar support
 * - **Tool**: Custom tool result renderers and state persistence
 * - **Context**: Sampling display and context calculation hooks
 * - **Sources**: Type-based styling and click handlers
 * - **Image**: Download functionality and full-screen preview modal
 * - **Reasoning**: Collapsible reasoning/thinking display
 * - **Suggestion**: Prompt suggestion buttons
 * - **Loader**: Animated loading spinner
 */

// CodeBlock wrapper and components
export {
    CodeBlock,
    CodeBlockCopyButton,
    type CodeBlockCopyButtonProps,
    CompactCodeBlock,
    type CompactCodeBlockProps,
    type EnhancedCodeBlockProps,
    getLanguageLabel,
    highlightCode,
    LanguageBadge,
    type LanguageBadgeProps,
    useCodeBlock,
} from "./code-block";
// Confirmation wrapper and components
export {
    type ApprovalResult,
    type BaseConfirmationProps,
    Confirmation,
    ConfirmationAccepted,
    type ConfirmationAcceptedProps,
    ConfirmationAction,
    type ConfirmationActionProps,
    ConfirmationActions,
    type ConfirmationActionsProps,
    ConfirmationRejected,
    type ConfirmationRejectedProps,
    ConfirmationRequest,
    type ConfirmationRequestProps,
    ConfirmationTitle,
    type ConfirmationTitleProps,
    type EnhancedConfirmationProps,
    QuickConfirmation,
    type QuickConfirmationProps,
    type ToolApprovalState,
    useConfirmationWorkflow,
    useToolApproval,
} from "./confirmation";
// Context wrapper and components
export {
    type BaseContextProps,
    Context,
    ContextContent,
    ContextContentBody,
    ContextContentFooter,
    ContextContentHeader,
    type ContextContentProps,
    ContextTrigger,
    type ContextTriggerProps,
    EnhancedContextContent,
    type EnhancedContextContentProps,
    type EnhancedContextProps,
    type SamplingConfig,
    useContextCalculation,
} from "./context";
// Conversation wrapper and components
export {
    type BaseConversationProps,
    Conversation,
    ConversationContent,
    type ConversationContentProps,
    ConversationEmptyState,
    type ConversationEmptyStateProps,
    ConversationScrollButton,
    type ConversationScrollButtonProps,
    EnhancedConversationEmptyState,
    type EnhancedConversationProps,
    type EnhancedEmptyStateProps,
    type ScrollState,
    useAutoScroll,
    useConversationScroll,
} from "./conversation";
// Image wrapper
export {
    type BaseImageProps,
    type EnhancedImageProps,
    Image,
} from "./image";
// InlineCitation wrapper and components
export {
    type CitationClickHandler,
    type CitationSourceType,
    detectCitationSourceType,
    EnhancedCitationCardTrigger,
    type EnhancedCitationCardTriggerProps,
    getCitationTypeStyles,
    InlineCitation,
    InlineCitationCard,
    InlineCitationCardBody,
    type InlineCitationCardBodyProps,
    type InlineCitationCardProps,
    InlineCitationCardTrigger,
    type InlineCitationCardTriggerProps,
    InlineCitationCarousel,
    InlineCitationCarouselContent,
    type InlineCitationCarouselContentProps,
    InlineCitationCarouselHeader,
    type InlineCitationCarouselHeaderProps,
    InlineCitationCarouselIndex,
    type InlineCitationCarouselIndexProps,
    InlineCitationCarouselItem,
    type InlineCitationCarouselItemProps,
    InlineCitationCarouselNext,
    type InlineCitationCarouselNextProps,
    InlineCitationCarouselPrev,
    type InlineCitationCarouselPrevProps,
    type InlineCitationCarouselProps,
    type InlineCitationProps,
    InlineCitationQuote,
    type InlineCitationQuoteProps,
    InlineCitationSource,
    type InlineCitationSourceProps,
    InlineCitationText,
    type InlineCitationTextProps,
    useCitationHandler,
} from "./inline-citation";
// Loader wrapper
export { Loader, type LoaderProps } from "./loader";
// Message wrapper and components
export {
    type BaseMessageProps,
    EnhancedMessageActions,
    type EnhancedMessageActionsProps,
    type EnhancedMessageProps,
    Message,
    MessageAction,
    type MessageActionProps,
    MessageActions,
    type MessageActionsProps,
    MessageBranch,
    MessageBranchContent,
    MessageBranchNext,
    MessageBranchPage,
    MessageBranchPrevious,
    type MessageBranchProps,
    MessageBranchSelector,
    MessageContent,
    type MessageContentProps,
} from "./message";
// Reasoning wrapper
export {
    Reasoning,
    ReasoningContent,
    type ReasoningContentProps,
    type ReasoningProps,
    ReasoningTrigger,
    type ReasoningTriggerProps,
    useReasoning,
} from "./reasoning";
// Shimmer wrapper and components
export {
    Shimmer,
    ShimmerPresets,
    type ShimmerProps,
    type ShimmerSize,
    type SkeletonShape,
    SkeletonShimmer,
    type SkeletonShimmerProps,
    type TextShimmerProps,
    useShimmerState,
} from "./shimmer";
// Sources wrapper and components
export {
    type BaseSourceProps,
    type BaseSourcesProps,
    detectSourceType,
    type EnhancedSourceProps,
    type EnhancedSourcesProps,
    Source,
    Sources,
    SourcesContent,
    type SourcesContentProps,
    SourcesTrigger,
    type SourcesTriggerProps,
    type SourceType,
} from "./sources";
// Suggestion wrapper
export {
    Suggestion,
    type SuggestionProps,
    Suggestions,
    type SuggestionsProps,
} from "./suggestion";
// Task wrapper and components
export {
    type BaseTaskProps,
    EnhancedTaskItem,
    type EnhancedTaskItemProps,
    type EnhancedTaskProps,
    Task,
    TaskContent,
    type TaskContentProps,
    TaskItem,
    TaskItemFile,
    type TaskItemFileProps,
    type TaskItemProps,
    type TaskProgress,
    TaskProgressBar,
    type TaskProgressBarProps,
    type TaskStatus,
    TaskStatusIndicator,
    type TaskStatusIndicatorProps,
    TaskTrigger,
    type TaskTriggerProps,
    useTaskList,
    useTaskState,
} from "./task";
// Tool wrapper and components
export {
    type BaseToolProps,
    defaultToolRenderers,
    documentToolRenderer,
    EnhancedToolOutput,
    type EnhancedToolOutputProps,
    type EnhancedToolProps,
    Tool,
    ToolContent,
    type ToolContentProps,
    ToolHeader,
    type ToolHeaderProps,
    ToolInput,
    type ToolInputProps,
    ToolOutput,
    type ToolOutputProps,
    type ToolRendererMap,
    type ToolResultRenderer,
    weatherToolRenderer,
} from "./tool";
