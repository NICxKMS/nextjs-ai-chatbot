/**
 * Shared UI Elements
 * @module shared/components/elements
 * 
 * Composite UI components for chat interface
 */

// Action buttons
export {
    Actions,
    Action,
    type ActionsProps,
    type ActionProps,
} from "./actions";

// Branch navigation (message alternatives)
export {
    Branch,
    BranchMessages,
    BranchSelector,
    BranchPrevious,
    BranchNext,
    BranchPage,
    type BranchProps,
    type BranchMessagesProps,
    type BranchSelectorProps,
    type BranchPreviousProps,
    type BranchNextProps,
    type BranchPageProps,
} from "./branch";

// Context/token usage display
export {
    Context,
    ContextIcon,
    type ContextProps,
} from "./context";

// Conversation container with auto-scroll
export {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
    type ConversationProps,
    type ConversationContentProps,
    type ConversationScrollButtonProps,
} from "./conversation";

// AI-generated images
export {
    Image,
    type ImageProps,
} from "./image";

// Inline citations with hover cards
export {
    InlineCitation,
    InlineCitationText,
    InlineCitationCard,
    InlineCitationCardTrigger,
    InlineCitationCardBody,
    InlineCitationCarousel,
    InlineCitationCarouselContent,
    InlineCitationCarouselItem,
    InlineCitationCarouselHeader,
    InlineCitationCarouselIndex,
    InlineCitationCarouselPrev,
    InlineCitationCarouselNext,
    InlineCitationSource,
    InlineCitationQuote,
    type InlineCitationProps,
    type InlineCitationTextProps,
    type InlineCitationCardProps,
    type InlineCitationCardTriggerProps,
    type InlineCitationCardBodyProps,
    type InlineCitationCarouselProps,
    type InlineCitationCarouselContentProps,
    type InlineCitationCarouselItemProps,
    type InlineCitationCarouselHeaderProps,
    type InlineCitationCarouselIndexProps,
    type InlineCitationCarouselPrevProps,
    type InlineCitationCarouselNextProps,
    type InlineCitationSourceProps,
    type InlineCitationQuoteProps,
} from "./inline-citation";

// Loading spinner
export {
    Loader,
    type LoaderProps,
} from "./loader";

// Message display
export {
    Message,
    MessageContent,
    MessageAvatar,
    type MessageProps,
    type MessageContentProps,
    type MessageAvatarProps,
} from "./message";

// Prompt input form
export {
    PromptInput,
    PromptInputTextarea,
    PromptInputToolbar,
    PromptInputTools,
    PromptInputButton,
    PromptInputSubmit,
    PromptInputModelSelect,
    PromptInputModelSelectTrigger,
    PromptInputModelSelectContent,
    PromptInputModelSelectItem,
    PromptInputModelSelectValue,
    type PromptInputProps,
    type PromptInputTextareaProps,
    type PromptInputToolbarProps,
    type PromptInputToolsProps,
    type PromptInputButtonProps,
    type PromptInputSubmitProps,
    type PromptInputModelSelectProps,
    type PromptInputModelSelectTriggerProps,
    type PromptInputModelSelectContentProps,
    type PromptInputModelSelectItemProps,
    type PromptInputModelSelectValueProps,
} from "./prompt-input";

// Reasoning/thinking display
export {
    Reasoning,
    ReasoningTrigger,
    ReasoningContent,
    type ReasoningProps,
    type ReasoningTriggerProps,
    type ReasoningContentProps,
} from "./reasoning";

// Markdown streaming response
export {
    Response,
} from "./response";

// Source attribution
export {
    Sources,
    SourcesTrigger,
    SourcesContent,
    Source,
    type SourcesProps,
    type SourcesTriggerProps,
    type SourcesContentProps,
    type SourceProps,
} from "./source";

// Suggestion chips
export {
    Suggestions,
    Suggestion,
    type SuggestionsProps,
    type SuggestionProps,
} from "./suggestion";

// Task display
export {
    Task,
    TaskTrigger,
    TaskContent,
    TaskItem,
    TaskItemFile,
    type TaskProps,
    type TaskTriggerProps,
    type TaskContentProps,
    type TaskItemProps,
    type TaskItemFileProps,
} from "./task";

// Tool invocation display
export {
    Tool,
    ToolHeader,
    ToolContent,
    ToolInput,
    ToolOutput,
    type ToolProps,
    type ToolHeaderProps,
    type ToolContentProps,
    type ToolInputProps,
    type ToolOutputProps,
} from "./tool";

// Web preview iframe
export {
    WebPreview,
    WebPreviewNavigation,
    WebPreviewNavigationButton,
    WebPreviewUrl,
    WebPreviewBody,
    WebPreviewConsole,
    type WebPreviewProps,
    type WebPreviewContextValue,
    type WebPreviewNavigationProps,
    type WebPreviewNavigationButtonProps,
    type WebPreviewUrlProps,
    type WebPreviewBodyProps,
    type WebPreviewConsoleProps,
} from "./web-preview";
