"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
    Context as BaseContext,
    type ContextProps as BaseContextProps,
    ContextContent,
    type ContextContentProps,
} from "@/components/ai-elements/context";

export {
    Context as BaseContext,
    ContextContent,
    ContextContentBody,
    ContextContentFooter,
    ContextContentHeader,
    type ContextContentProps,
    type ContextProps as BaseContextProps,
    ContextTrigger,
    type ContextTriggerProps,
} from "@/components/ai-elements/context";

import { cn } from "@/lib/utils/index";

/**
 * Sampling configuration for context display
 */
export type SamplingConfig = {
    temperature?: number;
    topP?: number;
    topK?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
};

/**
 * Extended context props with sampling and hook integration
 */
export interface EnhancedContextProps extends BaseContextProps {
    /** Sampling configuration to display */
    sampling?: SamplingConfig;
    /** Custom trigger element */
    customTrigger?: ReactNode;
    /** Additional context items to display */
    additionalItems?: Array<{ label: string; value: string | number }>;
}

/**
 * Enhanced Context wrapper with sampling display and hook integration.
 * Displays model context usage along with sampling parameters.
 */
export function Context({
    sampling,
    customTrigger,
    additionalItems,
    children,
    ...props
}: EnhancedContextProps) {
    return <BaseContext {...props}>{children}</BaseContext>;
}

/**
 * Extended context content with sampling display
 */
export interface EnhancedContextContentProps extends ContextContentProps {
    /** Sampling configuration to display */
    sampling?: SamplingConfig;
    /** Additional context items */
    additionalItems?: Array<{ label: string; value: string | number }>;
    /** Show sampling section */
    showSampling?: boolean;
}

/**
 * Enhanced ContextContent that displays sampling parameters.
 */
export const EnhancedContextContent = ({
    sampling,
    additionalItems,
    showSampling = true,
    children,
    className,
    ...props
}: EnhancedContextContentProps) => {
    const samplingItems = useMemo(() => {
        if (!sampling || !showSampling) {
            return [];
        }

        const items: Array<{ label: string; value: string }> = [];

        if (sampling.temperature !== undefined) {
            items.push({
                label: "Temperature",
                value: sampling.temperature.toFixed(2),
            });
        }
        if (sampling.topP !== undefined) {
            items.push({ label: "Top P", value: sampling.topP.toFixed(2) });
        }
        if (sampling.topK !== undefined) {
            items.push({ label: "Top K", value: sampling.topK.toString() });
        }
        if (sampling.frequencyPenalty !== undefined) {
            items.push({
                label: "Frequency Penalty",
                value: sampling.frequencyPenalty.toFixed(2),
            });
        }
        if (sampling.presencePenalty !== undefined) {
            items.push({
                label: "Presence Penalty",
                value: sampling.presencePenalty.toFixed(2),
            });
        }

        return items;
    }, [sampling, showSampling]);

    return (
        <ContextContent className={cn(className)} {...props}>
            {children}
            {samplingItems.length > 0 && (
                <div className="space-y-1 p-3">
                    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        Sampling
                    </h4>
                    {samplingItems.map((item) => (
                        <div
                            className="flex items-center justify-between text-sm"
                            key={item.label}
                        >
                            <span className="text-muted-foreground">
                                {item.label}
                            </span>
                            <span className="font-mono">{item.value}</span>
                        </div>
                    ))}
                </div>
            )}
            {additionalItems && additionalItems.length > 0 && (
                <div className="space-y-1 p-3">
                    {additionalItems.map((item) => (
                        <div
                            className="flex items-center justify-between text-sm"
                            key={item.label}
                        >
                            <span className="text-muted-foreground">
                                {item.label}
                            </span>
                            <span className="font-mono">
                                {String(item.value)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </ContextContent>
    );
};

/**
 * Hook to calculate context usage from messages
 */
export function useContextCalculation(
    messages: Array<{ content: string }>,
    maxTokens: number
): { usedTokens: number; maxTokens: number; percentage: number } {
    return useMemo(() => {
        // Simple estimation: ~4 characters per token
        const CHARS_PER_TOKEN = 4;
        const totalChars = messages.reduce(
            (acc, msg) => acc + (msg.content?.length ?? 0),
            0
        );
        const usedTokens = Math.ceil(totalChars / CHARS_PER_TOKEN);
        const percentage = Math.min((usedTokens / maxTokens) * 100, 100);

        return { usedTokens, maxTokens, percentage };
    }, [messages, maxTokens]);
}
