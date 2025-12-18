"use client";

import { Messages } from "@/components/messages";
import { useArtifactSelector } from "@/hooks/use-artifact";
import type { UserVote } from "@/lib/types";
import { useChatActions, useChatState, useModel } from "./context";

type ChatMessagesProps = {
    votes?: UserVote[];
};

/**
 * ChatMessages - Message list component
 * Only re-renders when messages, status, or error changes
 * Does NOT re-render on model change, input change, or attachment changes
 */
export function ChatMessages({ votes }: ChatMessagesProps) {
    const { chatId, messages, status, error, isReadonly, isGuest } =
        useChatState();
    const { setMessages, regenerate, clearError } = useChatActions();
    const { currentModelId } = useModel();
    const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

    return (
        <Messages
            chatError={error}
            chatId={chatId}
            clearError={clearError}
            isArtifactVisible={isArtifactVisible}
            isGuest={isGuest}
            isReadonly={isReadonly}
            messages={messages}
            regenerate={regenerate}
            selectedModelId={currentModelId}
            setMessages={setMessages}
            status={status}
            votes={votes}
        />
    );
}
