/**
 * Chat Visibility Hook - Stub
 * @module new-arch/hooks/use-chat-visibility
 *
 * This is a placeholder for the chat visibility hook.
 * Will be implemented in future.
 */

"use client";

import { useState } from "react";
import type { VisibilityType } from "@/components/visibility-selector";

export type UseChatVisibilityOptions = {
    chatId?: string;
    initialVisibilityType?: VisibilityType;
};

export type UseChatVisibilityResult = {
    visibilityType: VisibilityType;
    setVisibilityType: (type: VisibilityType) => void;
};

export function useChatVisibility({
    initialVisibilityType = "private",
}: UseChatVisibilityOptions): UseChatVisibilityResult {
    const [visibilityType, setVisibilityType] = useState<VisibilityType>(
        initialVisibilityType
    );

    return {
        visibilityType,
        setVisibilityType,
    };
}
