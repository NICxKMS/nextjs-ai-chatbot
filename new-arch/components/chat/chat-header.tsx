"use client";

import { ChatHeader as BaseChatHeader } from "@/components/chat-header";
import type { VisibilityType } from "@/components/visibility-selector";
import { useChatState } from "./context";

type ChatHeaderProps = {
    selectedVisibilityType?: VisibilityType;
};

/**
 * ChatHeader - Header component with model selector
 * Consumes model context for selection state
 */
export function ChatHeader({
    selectedVisibilityType = "private",
}: ChatHeaderProps) {
    const { chatId, isReadonly } = useChatState();

    return (
        <BaseChatHeader
            chatId={chatId}
            isReadonly={isReadonly}
            selectedVisibilityType={selectedVisibilityType}
        />
    );
}
