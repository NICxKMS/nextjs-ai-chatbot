/**
 * Chat Actions Module
 *
 * Server actions for chat-related operations.
 *
 * @module features/chat/actions
 */

export type {
    DeleteTrailingMessagesInput,
    DeleteTrailingMessagesResult,
} from "./message";
export { deleteTrailingMessages } from "./message";
export type {
    UpdateVisibilityInput,
    UpdateVisibilityResult,
} from "./visibility";
export { updateChatVisibility } from "./visibility";
export type { VoteInput, VoteResult } from "./vote";
export { removeVote, voteOnMessage } from "./vote";
