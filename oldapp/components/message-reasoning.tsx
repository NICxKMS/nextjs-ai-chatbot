"use client";

import { useEffect, useRef, useState } from "react";
import {
    Reasoning,
    ReasoningContent,
    ReasoningTrigger,
} from "./elements/reasoning";

type MessageReasoningProps = {
    isLoading: boolean;
    reasoning: string;
};

export function MessageReasoning({
    isLoading,
    reasoning,
}: MessageReasoningProps) {
    const [hasBeenStreaming, setHasBeenStreaming] = useState(isLoading);
    const [isReasoningStreaming, setIsReasoningStreaming] = useState(false);
    const prevReasoningRef = useRef(reasoning);

    useEffect(() => {
        if (isLoading) {
            setHasBeenStreaming(true);
        }
    }, [isLoading]);

    // Track when reasoning content is actually changing (streaming)
    useEffect(() => {
        if (isLoading && reasoning !== prevReasoningRef.current) {
            // Reasoning content is changing while loading - it's streaming
            setIsReasoningStreaming(true);
            prevReasoningRef.current = reasoning;
        } else if (
            isReasoningStreaming &&
            (!isLoading || reasoning === prevReasoningRef.current)
        ) {
            // Content stopped changing or loading ended, reasoning is done
            setIsReasoningStreaming(false);
        }

        if (!isLoading) {
            prevReasoningRef.current = reasoning;
        }
    }, [isLoading, reasoning, isReasoningStreaming]);

    return (
        <Reasoning
            data-testid="message-reasoning"
            defaultOpen={hasBeenStreaming}
            isStreaming={isReasoningStreaming}
        >
            <ReasoningTrigger />
            <ReasoningContent>{reasoning}</ReasoningContent>
        </Reasoning>
    );
}
