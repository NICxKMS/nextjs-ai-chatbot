/**
 * Artifact Wrapper Component
 *
 * Bridge component that connects the Artifact to the Chat context.
 * Extracts required props from chat helpers and passes to Artifact.
 *
 * @module features/chat/components/artifact-wrapper
 */

"use client";

import { useState } from "react";
import {
    Artifact,
    artifactDefinitions,
    DataStreamHandler,
    useArtifact,
} from "@/features/artifacts";
import {
    useChatHelpers,
    useChatMetadata,
    useModelState,
} from "./chat-provider";

// =============================================================================
// TYPES
// =============================================================================

export type ArtifactWrapperProps = {
    /** Message votes for displaying vote state */
    votes?: Array<{ messageId: string; vote: "up" | "down" }>;
    /** Whether the chat is in read-only mode */
    isReadonly?: boolean;
    /** Visibility type for the chat */
    selectedVisibilityType?: "private" | "public";
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ArtifactWrapper bridges the Chat context with the Artifact component.
 *
 * This component:
 * - Extracts chat helpers from context (messages, status, etc.)
 * - Manages artifact-specific input state
 * - Renders the DataStreamHandler for stream processing
 * - Renders the Artifact component with all required props
 *
 * @example
 * ```tsx
 * // Inside ChatProvider
 * <ArtifactWrapper votes={votes} isReadonly={false} />
 * ```
 */
export function ArtifactWrapper({
    votes = [],
    isReadonly = false,
    selectedVisibilityType = "private",
}: ArtifactWrapperProps) {
    // Get chat helpers from context
    const chatHelpers = useChatHelpers();
    const { messages, setMessages, status, stop, sendMessage, regenerate } =
        chatHelpers;

    // Get model state
    const { currentModelId } = useModelState();

    // Get chat metadata
    const { chatId } = useChatMetadata();

    // Get artifact state for visibility check
    const { artifact } = useArtifact();

    // Local input state for artifact (separate from main chat input)
    const [artifactInput, setArtifactInput] = useState("");

    // Attachment state for artifact
    const [attachments, setAttachments] = useState<
        Array<{ name: string; contentType: string; url: string }>
    >([]);

    // Convert messages to the format Artifact expects
    // UIMessage has parts, but we need to extract text content
    const artifactMessages = messages.map((m) => {
        // Extract text from parts if available
        const textParts = m.parts?.filter(
            (p): p is { type: "text"; text: string } => p.type === "text"
        );
        const content = textParts?.map((p) => p.text).join("") ?? "";

        return {
            id: m.id,
            role: m.role,
            content,
            parts: m.parts as
                | Array<{ type: string; text?: string }>
                | undefined,
        };
    });

    // Convert votes to the format Artifact expects
    const artifactVotes = votes.map((v) => ({
        messageId: v.messageId,
        vote: v.vote,
    }));

    return (
        <>
            {/* DataStreamHandler processes artifact stream parts */}
            <DataStreamHandler
                artifactDefinitions={Object.values(artifactDefinitions)} // Will be populated by chat streaming
                dataStream={[]}
            />

            {/* Artifact panel - renders when visible */}
            {artifact.isVisible && (
                <Artifact
                    attachments={attachments}
                    chatId={chatId}
                    input={artifactInput}
                    isReadonly={isReadonly}
                    messages={artifactMessages}
                    regenerate={regenerate}
                    selectedModelId={currentModelId}
                    selectedVisibilityType={selectedVisibilityType}
                    sendMessage={
                        sendMessage as Parameters<
                            typeof Artifact
                        >[0]["sendMessage"]
                    }
                    setAttachments={setAttachments}
                    // Type assertion needed because Artifact uses UseChatHelpers<any>
                    // but our context uses UseChatHelpers<ChatMessage>
                    setInput={setArtifactInput}
                    setMessages={setMessages}
                    status={status}
                    stop={stop}
                    votes={artifactVotes}
                />
            )}
        </>
    );
}
