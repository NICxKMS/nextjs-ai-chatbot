/**
 * Parallel Data Loading Utilities
 * Ref: PERF-002 - Parallel Data Loading
 * Ref: PERF-004 - Cache Prewarming (smart cold-check)
 *
 * Provides optimized parallel data fetching to eliminate request waterfalls.
 * Uses Promise.allSettled for resilience - partial failures don't break the page.
 *
 * @module lib/data/parallel-loader
 */
import "server-only";

import type { AppSession } from "@/lib/auth";
import { getSessionCached } from "@/lib/auth";
import { prewarmIfCold } from "@/lib/cache-ops";
import type { Chat, ChatWithMessages, Vote } from "@/lib/db";
import { createContext } from "./base";
import { getChatWithMessagesCached, getVotesByChatIdCached } from "./cached";
import type { DataContext } from "./types";

// ============================================================================
// Types
// ============================================================================

/**
 * Vote in UI format (mapped from DB vote)
 */
export type UIVote = {
    chatId: string;
    messageId: string;
    vote: "up" | "down";
};

/**
 * Result of loading existing chat page data
 * PERF-002: All optional fields loaded in parallel after session
 */
export type ChatPageData = {
    session: AppSession | null;
    ctx: DataContext | null;
    chatWithMessages: ChatWithMessages | null;
    votes: UIVote[];
    error?: string;
};

/**
 * Options for parallel chat page loading
 */
export type LoadChatPageOptions = {
    /** Whether user is authenticated (non-guest) for vote loading */
    loadVotes?: boolean;
};

// ============================================================================
// Parallel Loaders
// ============================================================================

/**
 * PERF-002: Load existing chat page data with parallel fetching.
 *
 * Load strategy:
 * 1. Session first (required for userId/context)
 * 2. Chat+messages and votes in parallel (both need userId)
 *
 * Uses Promise.allSettled for resilience - votes failing doesn't break the page.
 *
 * @param chatId - The chat ID to load
 * @param options - Loading options
 * @returns ChatPageData with session, chat, messages, and votes
 *
 * @example
 * ```ts
 * const { session, chatWithMessages, votes } = await loadChatPageData(id);
 * if (!session) redirect("/login");
 * if (!chatWithMessages) notFound();
 * ```
 */
export async function loadChatPageData(
    chatId: string,
    options: LoadChatPageOptions = {}
): Promise<ChatPageData> {
    const { loadVotes = true } = options;

    // Step 1: Get session (required for userId)
    const session = await getSessionCached();

    if (!session?.user) {
        return {
            session: null,
            ctx: null,
            chatWithMessages: null,
            votes: [],
        };
    }

    const user = session.user;
    const ctx = createContext(user.id, user.type);

    // Step 2: PERF-002 - Load chat and votes in parallel
    // Both operations need userId but don't depend on each other
    const shouldLoadVotes = loadVotes && user.type !== "guest";

    const [chatResult, votesResult] = await Promise.allSettled([
        getChatWithMessagesCached(chatId, ctx),
        shouldLoadVotes
            ? getVotesByChatIdCached(chatId, ctx)
            : Promise.resolve([]),
    ]);

    // Extract chat result
    const chatWithMessages =
        chatResult.status === "fulfilled" ? chatResult.value : null;

    // Extract votes and convert to UI format
    let votes: UIVote[] = [];
    if (votesResult.status === "fulfilled" && votesResult.value.length > 0) {
        votes = mapVotesToUIFormat(votesResult.value);
    }

    // Log any parallel loading errors (non-fatal)
    if (chatResult.status === "rejected") {
        console.error("[PERF-002] Chat loading failed:", chatResult.reason);
    }
    if (votesResult.status === "rejected") {
        console.error("[PERF-002] Votes loading failed:", votesResult.reason);
    }

    // PERF-004: Background prewarm for authenticated users
    // Non-blocking - runs after response data is prepared
    if (user.type !== "guest") {
        prewarmIfCold(user.id, user.type).catch((error) => {
            console.error("[PERF-004] Background prewarm failed:", error);
        });
    }

    return {
        session,
        ctx,
        chatWithMessages,
        votes,
    };
}

/**
 * PERF-002: Load multiple chat summaries in parallel.
 *
 * Useful for preloading chat list with metadata.
 * Uses Promise.allSettled for resilience.
 *
 * @param chatIds - Array of chat IDs to load
 * @param ctx - Data context with user info
 * @returns Array of chats (nulls filtered out)
 */
export async function loadChatsInParallel(
    chatIds: string[],
    ctx: DataContext
): Promise<Chat[]> {
    if (chatIds.length === 0) {
        return [];
    }

    const results = await Promise.allSettled(
        chatIds.map((id) => getChatWithMessagesCached(id, ctx))
    );

    return results
        .filter(
            (r): r is PromiseFulfilledResult<ChatWithMessages> =>
                r.status === "fulfilled" && r.value !== null
        )
        .map((r) => r.value.chat);
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert DB votes to UI vote format
 */
function mapVotesToUIFormat(dbVotes: Vote[]): UIVote[] {
    return dbVotes.map((v) => ({
        chatId: v.chatId,
        messageId: v.messageId,
        vote: v.isUpvoted ? "up" : "down",
    }));
}

/**
 * PERF-002: Type guard to check if parallel load succeeded
 */
export function hasValidChatData(data: ChatPageData): data is ChatPageData & {
    session: AppSession;
    ctx: DataContext;
    chatWithMessages: ChatWithMessages;
} {
    return (
        data.session !== null &&
        data.ctx !== null &&
        data.chatWithMessages !== null
    );
}
