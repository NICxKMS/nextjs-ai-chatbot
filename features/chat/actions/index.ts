/**
 * Chat Actions Module
 *
 * Server actions for chat-related operations.
 *
 * @module features/chat/actions
 */

export { voteOnMessage, removeVote } from "./vote";
export type { VoteInput, VoteResult } from "./vote";

export { deleteTrailingMessages } from "./message";
export type {
    DeleteTrailingMessagesInput,
    DeleteTrailingMessagesResult,
} from "./message";

export { updateChatVisibility } from "./visibility";
export type {
    UpdateVisibilityInput,
    UpdateVisibilityResult,
} from "./visibility";
