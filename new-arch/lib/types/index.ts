/**
 * Types System Barrel Export
 * @module lib/types
 *
 * Centralized type definitions for the application.
 * This module provides type-safe definitions for all domain entities,
 * API contracts, UI state, and validation schemas.
 *
 * @example
 * ```typescript
 * // Import domain types
 * import type { Chat, Message, User } from '@/lib/types';
 *
 * // Import API types
 * import type { ApiResponse, CreateChatRequest } from '@/lib/types';
 *
 * // Import schemas
 * import { createChatSchema, sendMessageSchema } from '@/lib/types';
 * ```
 */

// =============================================================================
// DOMAIN TYPES
// =============================================================================

export type {
    // Artifact
    Artifact,
    ArtifactKind,
    ArtifactKindInfo,
    ArtifactStatus,
    ArtifactVersion,
    ArtifactWithVersions,
    Attachment,
    AuthenticatedSession,
    BoundingBox,
    // Chat
    Chat,
    ChatListItem,
    ChatMessage,
    ChatSummary,
    ChatVisibility,
    ChatWithMessages,
    CodePart,
    CreateDocumentInput,
    CustomUIDataTypes,
    // Document
    Document,
    DocumentKind,
    DocumentMetadata,
    DocumentVersion,
    DocumentWithVersions,
    FilePart,
    GuestSession,
    ImagePart,
    // Message
    Message,
    MessagePart,
    MessageRole,
    MessageWithContent,
    ReasoningPart,
    Session,
    SourcePart,
    TextPart,
    ToolCallPart,
    ToolResultPart,
    UIArtifact,
    UpdateDocumentInput,
    // User
    User,
    UserPreferences,
    UserProfile,
    UserType,
    UserVote,
    // Vote
    Vote,
    VoteInput,
    VoteSummary,
    VoteValue,
    VoteWithValue,
} from "./domain";

// Domain utilities
export {
    // Artifact utilities
    ARTIFACT_KINDS,
    extractTextFromParts,
    fromVoteValue,
    hasProFeatures,
    isAdmin,
    isArtifactKind,
    // User utilities
    isAuthenticated,
    isDataAppendMessagePart,
    isDataChatTitlePart,
    isFilePart,
    isReasoningPart,
    // Message utilities
    isTextPart,
    isToolCallPart,
    isToolResultPart,
    // Vote utilities
    toVoteValue,
} from "./domain";

// =============================================================================
// API TYPES
// =============================================================================

export type {
    // Errors
    ApiError,
    ApiErrorCode,
    // Responses
    ApiResponse,
    AuthError,
    BatchResponse,
    // Requests
    CreateChatRequest,
    CreateDocumentRequest,
    CreatedResponse,
    EmptyResponse,
    ErrorResponse,
    ListChatsRequest,
    ListMessagesRequest,
    PaginatedApiResponse,
    PaginatedResponse,
    PaginationParams,
    RateLimitError,
    RegenerateMessageRequest,
    SendMessageRequest,
    StreamDoneEvent,
    StreamEvent,
    StreamEventType,
    SuccessResponse,
    TextDeltaEvent,
    ToolCallEvent,
    UpdateChatRequest,
    UpdateDocumentRequest,
    ValidationError,
    VoteRequest,
} from "./api";

// API utilities
export {
    createApiError,
    createForbiddenError,
    createNotFoundError,
    createUnauthorizedError,
    createValidationError,
    ERROR_STATUS_MAP,
    getErrorStatusCode,
    isAuthError,
    isErrorResponse,
    isRateLimitError,
    isSuccessResponse,
    isValidationError,
} from "./api";

// =============================================================================
// UI TYPES
// =============================================================================

export type {
    ArtifactPanelState,
    ArtifactViewState,
    AsyncState,
    AttachmentState,
    ChatInputState,
    ConfirmDialogState,
    EmptyStateProps,
    ErrorStateProps,
    FieldProps,
    InputProps,
    // Props
    LoadingState,
    LoadingStateProps,
    ModalState,
    Orientation,
    RequireChildren,
    ScrollState,
    SelectionState,
    SettingsState,
    // State
    SidebarState,
    Size,
    ToastState,
    ToastType,
    Variant,
    WithChildren,
    WithClassName,
    WithClassNameAndChildren,
    WithOnClick,
    WithOnClose,
    WithOnSubmit,
    WithSize,
    WithVariant,
} from "./ui";

// =============================================================================
// SCHEMAS
// =============================================================================

export type {
    AttachmentInput,
    // Chat schema types
    ChatIdParams,
    CreateChatInput,
    DeleteChatInput,
    ListChatsInput,
    ListMessagesInput,
    // Message schema types
    MessageIdParams,
    MessagePartInput,
    RegenerateMessageInput,
    SendMessageInput,
    UpdateChatInput as UpdateChatSchemaInput,
} from "./schemas";
export {
    attachmentSchema,
    chatIdSchema,
    createChatSchema,
    deleteChatSchema,
    filePartSchema,
    listChatsSchema,
    listMessagesSchema,
    messageIdSchema,
    messagePartSchema,
    // Message schemas
    messageRoleSchema,
    reasoningPartSchema,
    regenerateMessageSchema,
    sendMessageSchema,
    textPartSchema,
    toolCallPartSchema,
    toolResultPartSchema,
    updateChatSchema,
    // Chat schemas
    uuidSchema,
    visibilitySchema,
} from "./schemas";
