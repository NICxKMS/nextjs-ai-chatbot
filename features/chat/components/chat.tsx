/**
 * Main Chat Component
 *
 * Composes all chat sub-components into a cohesive chat experience.
 * This is the primary entry point for rendering a complete chat interface.
 *
 * @module features/chat/components/chat
 */

"use client";

import { useSidebar } from "@/shared/ui/sidebar";
import type { ChatProps, MessageVote } from "../types";
import { ArtifactWrapper } from "./artifact-wrapper";
import { ChatContainer } from "./chat-container";
import { ChatErrorBoundary } from "./chat-error-boundary";
import { ChatHeader } from "./chat-header";
import { ChatInput } from "./chat-input";
import { ChatMessages } from "./chat-messages";
import { ChatProvider } from "./chat-provider";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Full props for the main Chat component.
 * Extends base ChatProps with additional composition-level props.
 */
export interface FullChatProps extends ChatProps {
    /** Message votes for displaying upvote/downvote state */
    votes?: MessageVote[];
    /** Callback when user initiates a new chat */
    onNewChat?: () => void;
    /** Visibility type for the chat */
    selectedVisibilityType?: "private" | "public";
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Main Chat component that orchestrates the complete chat experience.
 *
 * @remarks
 * Composition structure:
 * - ChatErrorBoundary: Catches and handles errors gracefully
 * - ChatProvider: Manages chat state and actions via context
 * - ChatContainer: Provides responsive layout structure
 * - ChatHeader: Title, model selector, and action buttons
 * - ChatMessages: Virtualized message list
 * - ChatInput: Multimodal input with attachments
 *
 * @example
 * ```tsx
 * <Chat
 *   id="chat-123"
 *   initialMessages={messages}
 *   selectedModelId="gpt-4"
 *   votes={votes}
 *   onNewChat={() => router.push('/chat')}
 * />
 * ```
 */
export function Chat({
    id,
    initialMessages = [],
    selectedModelId,
    isReadonly = false,
    votes = [],
    onNewChat,
    selectedVisibilityType = "private",
}: FullChatProps) {
    // Convert votes to the format expected by components
    const formattedVotes = votes.map((v) => ({
        messageId: v.messageId,
        vote: v.vote,
    }));

    const { toggleSidebar } = useSidebar();

    return (
        <ChatErrorBoundary>
            <ChatProvider
                chatId={id}
                initialMessages={initialMessages}
                isReadonly={isReadonly}
                selectedModelId={selectedModelId}
            >
                <ChatContainer>
                    <ChatHeader
                        onNewChat={onNewChat}
                        onToggleSidebar={toggleSidebar}
                        selectedVisibilityType={selectedVisibilityType}
                    />
                    <ChatMessages isReadonly={isReadonly} votes={votes} />
                    <div className="sticky bottom-0 z-10 mx-auto flex w-full max-w-4xl gap-2 bg-background px-2 pb-3 md:px-4 md:pb-4">
                        <ChatInput />
                    </div>
                </ChatContainer>

                {/* Artifact panel - renders alongside chat when visible */}
                <ArtifactWrapper
                    isReadonly={isReadonly}
                    selectedVisibilityType={selectedVisibilityType}
                    votes={formattedVotes}
                />
            </ChatProvider>
        </ChatErrorBoundary>
    );
}
