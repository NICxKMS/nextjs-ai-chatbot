/**
 * Reasoning Component
 *
 * Collapsible reasoning display with duration tracking.
 * Matches OldApp reasoning.tsx pattern for visual parity.
 *
 * @module features/chat/components/reasoning
 */

"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { createContext, memo, useContext, useEffect, useState } from "react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/shared/ui/collapsible";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./markdown-renderer";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Delay before auto-closing after streaming ends (ms) */
const AUTO_CLOSE_DELAY = 500;

/** Milliseconds per second */
const MS_IN_S = 1000;

// =============================================================================
// TYPES
// =============================================================================

interface ReasoningContextValue {
    isStreaming: boolean;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    duration: number;
}

export interface ReasoningProps extends ComponentProps<typeof Collapsible> {
    /** Whether reasoning is currently streaming */
    isStreaming?: boolean;
    /** Controlled open state */
    open?: boolean;
    /** Default open state (uncontrolled) */
    defaultOpen?: boolean;
    /** Callback when open state changes */
    onOpenChange?: (open: boolean) => void;
    /** Controlled duration in seconds */
    duration?: number;
}

export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger>;

export interface ReasoningContentProps
    extends ComponentProps<typeof CollapsibleContent> {
    /** The reasoning text content */
    children: string;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

const useReasoning = () => {
    const context = useContext(ReasoningContext);
    if (!context) {
        throw new Error("Reasoning components must be used within <Reasoning>");
    }
    return context;
};

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Root component for collapsible reasoning display.
 * Manages open state, streaming detection, and duration tracking.
 */
export const Reasoning = memo(
    ({
        className,
        isStreaming = false,
        open,
        defaultOpen = true,
        onOpenChange,
        duration: durationProp,
        children,
        ...props
    }: ReasoningProps) => {
        const [isOpen, setIsOpen] = useControllableState({
            prop: open,
            defaultProp: defaultOpen,
            onChange: onOpenChange,
        });
        const [duration, setDuration] = useControllableState({
            prop: durationProp,
            defaultProp: 0,
        });

        const [hasAutoClosedRef, setHasAutoClosedRef] = useState(false);
        const [startTime, setStartTime] = useState<number | null>(null);

        // Track duration when streaming starts and ends
        useEffect(() => {
            if (isStreaming) {
                if (startTime === null) {
                    setStartTime(Date.now());
                }
            } else if (startTime !== null) {
                setDuration(Math.round((Date.now() - startTime) / MS_IN_S));
                setStartTime(null);
            }
        }, [isStreaming, startTime, setDuration]);

        // Auto-open when streaming starts, auto-close when streaming ends (once only)
        useEffect(() => {
            if (defaultOpen && !isStreaming && isOpen && !hasAutoClosedRef) {
                // Add a small delay before closing to allow user to see the content
                const timer = setTimeout(() => {
                    setIsOpen(false);
                    setHasAutoClosedRef(true);
                }, AUTO_CLOSE_DELAY);

                return () => clearTimeout(timer);
            }
        }, [isStreaming, isOpen, defaultOpen, setIsOpen, hasAutoClosedRef]);

        const handleOpenChange = (newOpen: boolean) => {
            setIsOpen(newOpen);
        };

        return (
            <ReasoningContext.Provider
                value={{
                    isStreaming,
                    isOpen: isOpen ?? false,
                    setIsOpen,
                    duration: duration ?? 0,
                }}
            >
                <Collapsible
                    className={cn("not-prose", className)}
                    onOpenChange={handleOpenChange}
                    open={isOpen}
                    {...props}
                >
                    {children}
                </Collapsible>
            </ReasoningContext.Provider>
        );
    }
);

/**
 * Trigger button for expanding/collapsing reasoning content.
 * Shows streaming status and duration.
 */
export const ReasoningTrigger = memo(
    ({ className, children, ...props }: ReasoningTriggerProps) => {
        const { isStreaming, isOpen, duration } = useReasoning();

        return (
            <CollapsibleTrigger
                className={cn(
                    "flex items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground",
                    className
                )}
                {...props}
            >
                {children ?? (
                    <>
                        <BrainIcon className="size-4" />
                        {isStreaming || duration === 0 ? (
                            <p>Thinking...</p>
                        ) : (
                            <p>Thought for {duration}s</p>
                        )}
                        <ChevronDownIcon
                            className={cn(
                                "size-3 text-muted-foreground transition-transform",
                                isOpen ? "rotate-180" : "rotate-0"
                            )}
                        />
                    </>
                )}
            </CollapsibleTrigger>
        );
    }
);

/**
 * Content area for reasoning text.
 * Renders markdown with streaming support.
 */
export const ReasoningContent = memo(
    ({ className, children, ...props }: ReasoningContentProps) => (
        <CollapsibleContent
            className={cn(
                "mt-2 text-muted-foreground text-xs",
                "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in",
                className
            )}
            {...props}
        >
            <MarkdownRenderer className="grid gap-2 text-xs">
                {children}
            </MarkdownRenderer>
        </CollapsibleContent>
    )
);

Reasoning.displayName = "Reasoning";
ReasoningTrigger.displayName = "ReasoningTrigger";
ReasoningContent.displayName = "ReasoningContent";
