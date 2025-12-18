"use client";

import { useEffect, useRef, useState } from "react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { MessageReasoningProps } from "./types";

/**
 * Displays AI reasoning in a collapsible panel.
 * Auto-opens during streaming, tracks streaming state.
 */
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

    // Track when reasoning content is actively changing (streaming)
    useEffect(() => {
        if (isLoading && reasoning !== prevReasoningRef.current) {
            setIsReasoningStreaming(true);
            prevReasoningRef.current = reasoning;
        } else if (
            isReasoningStreaming &&
            (!isLoading || reasoning === prevReasoningRef.current)
        ) {
            setIsReasoningStreaming(false);
        }

        if (!isLoading) {
            prevReasoningRef.current = reasoning;
        }
    }, [isLoading, reasoning, isReasoningStreaming]);

    if (!reasoning?.trim()) {
        return null;
    }

    return (
        <Collapsible
            className="not-prose mb-4 rounded-md border bg-muted/50"
            data-testid="message-reasoning"
            defaultOpen={hasBeenStreaming}
        >
            <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-sm">
                <span
                    className={cn(
                        "size-2 rounded-full",
                        isReasoningStreaming
                            ? "animate-pulse bg-blue-500"
                            : "bg-muted-foreground"
                    )}
                />
                <span className="font-medium">Reasoning</span>
                {isReasoningStreaming && (
                    <span className="text-muted-foreground text-xs">
                        (streaming...)
                    </span>
                )}
            </CollapsibleTrigger>

            <CollapsibleContent className="border-t px-3 py-2">
                <div className="whitespace-pre-wrap text-muted-foreground text-sm">
                    {reasoning}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
