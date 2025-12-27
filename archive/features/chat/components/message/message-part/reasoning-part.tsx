/**
 * Reasoning Part Component
 *
 * Renders chain-of-thought reasoning display with collapsible UI.
 *
 * @module features/chat/components/message/message-part/reasoning-part
 */

"use client";

import {
    Reasoning,
    ReasoningContent,
    ReasoningTrigger,
} from "@/components/ai-elements/reasoning";

export type ReasoningPartViewProps = {
    reasoning: string;
    isStreaming?: boolean;
    className?: string;
};

/**
 * Renders chain-of-thought reasoning display with collapsible UI and duration tracking.
 */
export function ReasoningPartView({
    reasoning,
    isStreaming,
    className,
}: ReasoningPartViewProps) {
    return (
        <Reasoning
            className={className}
            defaultOpen={true}
            isStreaming={isStreaming}
        >
            <ReasoningTrigger />
            <ReasoningContent>{reasoning}</ReasoningContent>
        </Reasoning>
    );
}
