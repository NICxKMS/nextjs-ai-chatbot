/**
 * Vote Domain Types
 * @module lib/types/domain/vote
 *
 * Type definitions for vote-related entities.
 */

// =============================================================================
// VOTE VALUE
// =============================================================================

/**
 * Vote direction
 */
export type VoteValue = "up" | "down";

// =============================================================================
// VOTE
// =============================================================================

/**
 * Core vote entity
 */
export type Vote = {
    /** Associated chat ID */
    chatId: string;
    /** Voted message ID */
    messageId: string;
    /** Voter user ID */
    userId: string;
    /** Whether the vote is an upvote */
    isUpvoted: boolean;
};

/**
 * Vote with computed value
 */
export type VoteWithValue = Vote & {
    /** Computed vote value */
    value: VoteValue;
};

/**
 * Vote summary for a message
 */
export type VoteSummary = {
    /** Message ID */
    messageId: string;
    /** Total upvotes */
    upvotes: number;
    /** Total downvotes */
    downvotes: number;
    /** Net score (upvotes - downvotes) */
    score: number;
    /** Current user's vote (if any) */
    userVote?: VoteValue;
};

// =============================================================================
// VOTE INPUT
// =============================================================================

/**
 * Input for creating/updating a vote
 */
export type VoteInput = {
    chatId: string;
    messageId: string;
    isUpvoted: boolean;
};

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Convert boolean upvote to VoteValue
 */
export function toVoteValue(isUpvoted: boolean): VoteValue {
    return isUpvoted ? "up" : "down";
}

/**
 * Convert VoteValue to boolean
 */
export function fromVoteValue(value: VoteValue): boolean {
    return value === "up";
}
