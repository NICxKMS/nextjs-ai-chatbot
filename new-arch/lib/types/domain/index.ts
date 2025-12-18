/**
 * Domain Types Barrel Export
 * @module lib/types/domain
 *
 * Re-exports all domain type definitions.
 */

// Artifact types
export type {
    Artifact,
    ArtifactKind,
    ArtifactKindInfo,
    ArtifactStatus,
    ArtifactVersion,
    ArtifactWithVersions,
    BoundingBox,
    UIArtifact,
} from "./artifact";
export { ARTIFACT_KINDS, isArtifactKind } from "./artifact";
// Chat types
export type {
    Chat,
    ChatListItem,
    ChatSummary,
    ChatVisibility,
    ChatWithMessages,
} from "./chat";
// Document types
export type {
    CreateDocumentInput,
    Document,
    DocumentKind,
    DocumentMetadata,
    DocumentVersion,
    DocumentWithVersions,
    UpdateDocumentInput,
} from "./document";
// Message types
export type {
    Attachment,
    ChatMessage,
    CodePart,
    CustomUIDataTypes,
    FilePart,
    ImagePart,
    Message,
    MessagePart,
    MessageRole,
    MessageWithContent,
    ReasoningPart,
    SourcePart,
    TextPart,
    ToolCallPart,
    ToolResultPart,
    UserVote,
} from "./message";
export {
    extractTextFromParts,
    isDataAppendMessagePart,
    isDataChatTitlePart,
    isFilePart,
    isReasoningPart,
    isTextPart,
    isToolCallPart,
    isToolResultPart,
} from "./message";
// User types
export type {
    AuthenticatedSession,
    GuestSession,
    Session,
    User,
    UserPreferences,
    UserProfile,
    UserType,
} from "./user";
export { hasProFeatures, isAdmin, isAuthenticated } from "./user";

// Vote types
export type {
    Vote,
    VoteInput,
    VoteSummary,
    VoteValue,
    VoteWithValue,
} from "./vote";

export { fromVoteValue, toVoteValue } from "./vote";
