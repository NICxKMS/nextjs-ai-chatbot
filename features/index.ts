/**
 * Features Module - Public API
 *
 * Main entry point for all feature modules.
 * Re-exports commonly used components, hooks, and types.
 *
 * @module features
 */

// =============================================================================
// ARTIFACTS
// =============================================================================

export type {
    ArtifactAction,
    ArtifactActionContext,
    ArtifactBoundingBox,
    ArtifactChatHelpers,
    ArtifactConfig,
    ArtifactContentProps,
    ArtifactDefinition,
    ArtifactInitializeParams,
    ArtifactKind,
    ArtifactStatus,
    ArtifactStreamPart,
    ArtifactStreamPartArgs,
    ArtifactStreamPartType,
    ArtifactToolbarContext,
    ArtifactToolbarItem,
    CodeEditorProps,
    ConsoleOutput,
    ConsoleOutputContent,
    ConsoleOutputStatus,
    ConsoleProps,
    DataStreamHandlerProps as ArtifactDataStreamHandlerProps,
    DiffTypeValue,
    DiffViewProps,
    ImageEditorProps,
    SheetEditorProps,
    UIArtifact,
    UseArtifactReturn,
} from "./artifacts";
export {
    ARTIFACT_KIND_LABELS,
    ARTIFACT_KINDS,
    Artifact,
    ArtifactActions,
    ArtifactClose,
    ArtifactErrorBoundary,
    ArtifactFactory,
    ArtifactMessages,
    artifactDefinitions,
    artifactKinds,
    artifactRegistry,
    CodeEditor,
    Console,
    codeArtifact,
    DataStreamHandler as ArtifactDataStreamHandler,
    DEFAULT_ARTIFACT_CONTENT,
    DiffType,
    DiffView,
    getArtifactDefinition,
    getSuggestions,
    ImageEditor,
    imageArtifact,
    initialArtifactData,
    isArtifactDefinition,
    SheetEditor,
    sheetArtifact,
    TextEditor,
    Toolbar,
    Tools,
    textArtifact,
    useArtifact,
    useArtifactSelector,
    VersionFooter,
} from "./artifacts";

// =============================================================================
// AUTH
// =============================================================================

export type {
    AuthActions,
    AuthContextValue,
    AuthFormMode,
    AuthFormProps,
    AuthState,
    GuestSessionResponse,
} from "./auth";
export {
    AuthBootstrap,
    AuthForm,
    AuthProvider,
    createGuestSession,
    EMPTY_AUTH_STATE,
    LOADING_AUTH_STATE,
    useAuth,
} from "./auth";

// =============================================================================
// CHAT
// =============================================================================

export type {
    Attachment,
    ChatContainerProps,
    ChatHeaderProps,
    ChatHelpers,
    ChatInputProps,
    ChatMessage,
    ChatMessagesProps,
    ChatProps,
    ChatProviderProps,
    ChatRequestOptions,
    ChatStatus,
    CreateMessage,
    DataStreamHandlerProps,
    DataStreamPart,
    DataStreamProviderProps,
    DataUsageType,
    DeleteMessagesParams,
    FullChatProps,
    GenerateTitleParams,
    IModelPersistence,
    IModelService,
    MessageItemProps,
    MessagePart,
    MessageVote,
    ModelCapabilities,
    ModelMetadata,
    ModelSelectorProps,
    ModelState,
    NewChatButtonProps,
    ReasoningPart,
    RetryState,
    SourcePart,
    TextPart,
    ToolCallPart,
    ToolResultPart,
    UIMessage,
    UpdateVisibilityParams,
    UseChatVisibilityOptions,
    UseChatVisibilityReturn,
    UseDataStreamHandlerOptions,
    UseMessageRetryOptions,
    UseMessageRetryReturn,
    UseMessagesOptions,
    UseMessagesReturn,
    UseRequestAbortReturn,
    UseScrollToBottomReturn,
    VisibilityType,
    VoteInput,
    VoteResult,
    VoteType,
} from "./chat";
export {
    Chat,
    ChatContainer,
    ChatErrorBoundary,
    ChatHeader,
    ChatProvider,
    combineAbortSignals,
    createModelService,
    createTimeoutAbortController,
    DataStreamHandler,
    DataStreamProvider,
    defaultModelService,
    getDefaultModelId,
    getModels,
    isDataAppendMessagePart,
    isDataChatTitlePart,
    isDataUsagePart,
    ModelSelector,
    NewChatButton,
    removeVote,
    useChatHelpers,
    useChatMetadata,
    useChatVisibility,
    useDataStream,
    useDataStreamHandler,
    useMessageRetry,
    useMessages,
    useModelState,
    useRequestAbort,
    useScrollToBottom,
    voteOnMessage,
} from "./chat";

// =============================================================================
// DOCUMENTS
// =============================================================================

export type {
    Document,
    DocumentData,
    DocumentOperationType,
    DocumentPreviewProps,
    DocumentSkeletonProps,
    DocumentToolArgs,
    DocumentToolCallProps,
    DocumentToolProps,
    DocumentToolResult as DocumentToolResultType,
    DocumentToolResultProps,
    SaveDocumentRequest,
} from "./documents";
export {
    CodePreview,
    DocumentPreview,
    DocumentSkeleton,
    DocumentToolCall,
    DocumentToolResult,
    fetchDocument,
    fetchDocumentVersions,
    fetchSuggestions,
    ImagePreview,
    InlineDocumentSkeleton,
    restoreDocumentVersion,
    SheetPreview,
    saveDocument,
    TextPreview,
} from "./documents";

// =============================================================================
// SETTINGS
// =============================================================================

export type {
    AppSettings,
    ModelSelectorDisplayMode,
    SamplingSettings,
    SettingsStore,
} from "./settings";
export {
    DEFAULT_SETTINGS,
    SettingsButton,
    SettingsHydration,
    SettingsIconButton,
    SettingsSheet,
    useAutoScrollSetting,
    useEnableReasoningSetting,
    useModelSelectorDisplayMode,
    useSamplingSettings,
    useSelectedModelId,
    useSettings,
    useSettingsHydration,
    useSettingsSnapshot,
    useStreamArtifactsSetting,
    useSystemPromptSetting,
} from "./settings";

// =============================================================================
// SIDEBAR
// =============================================================================

export type {
    AppSidebarProps,
    ChatGroup,
    ChatHistoryItem,
    HistoryResponse,
    SidebarContext,
    SidebarHistoryItemProps,
    SidebarHistoryProps,
    SidebarProviderProps,
    SidebarState,
    SidebarUserNavProps,
    UpdateVisibilityAction,
    VisibilityType as SidebarVisibilityType,
} from "./sidebar";
export {
    AppSidebar,
    deleteAllChatHistory,
    deleteChat,
    fetchChatHistory,
    groupChatsByDate,
    OptimisticChatsProvider,
    SidebarHistory,
    SidebarHistoryItem,
    SidebarProvider,
    SidebarToggle,
    SidebarUserNav,
    useChatHistory,
    useOptimisticChats,
    useSidebar,
} from "./sidebar";
