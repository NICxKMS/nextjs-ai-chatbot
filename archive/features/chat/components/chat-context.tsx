/**
 * ChatContext Component
 *
 * Displays context information about the current chat session including
 * usage stats, sampling parameters, and system prompt indicator.
 *
 * @module features/chat/components/chat-context
 */

"use client";

import { Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/shared/components/tooltip";
import type { SamplingSettings } from "@/shared/types";

/**
 * Usage statistics for the current chat session.
 */
export type ChatUsage = {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
};

/**
 * Default sampling settings for comparison.
 */
const DEFAULT_SAMPLING: SamplingSettings = {
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 4096,
};

/**
 * Props for the ChatContext component.
 */
export type ChatContextProps = {
    /** Optional usage statistics to display */
    usage?: ChatUsage;
    /** Current sampling settings (injected from settings feature) */
    sampling?: SamplingSettings;
    /** Current system prompt (injected from settings feature) */
    systemPrompt?: string;
};

/**
 * Displays chat context information in a tooltip.
 *
 * Shows:
 * - Token usage (if available)
 * - Temperature (if different from default)
 * - Top P (if different from default)
 * - System prompt indicator (if set)
 *
 * @example
 * ```tsx
 * <ChatContext
 *   usage={{ totalTokens: 1500 }}
 *   sampling={{ temperature: 0.8, topP: 0.95, maxOutputTokens: 4096 }}
 *   systemPrompt="You are a helpful assistant."
 * />
 * ```
 */
export function ChatContext({
    usage,
    sampling = DEFAULT_SAMPLING,
    systemPrompt = "",
}: ChatContextProps) {
    const { temperature, topP } = sampling;

    const defaultTemp = DEFAULT_SAMPLING.temperature;
    const defaultTopP = DEFAULT_SAMPLING.topP;

    const hasUsage = usage?.totalTokens !== undefined && usage.totalTokens > 0;
    const hasNonDefaultTemp = temperature !== defaultTemp;
    const hasNonDefaultTopP = topP !== defaultTopP;
    const hasSystemPrompt = systemPrompt && systemPrompt.trim().length > 0;

    const hasContext =
        hasUsage || hasNonDefaultTemp || hasNonDefaultTopP || hasSystemPrompt;

    if (!hasContext) {
        return null;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    aria-label="View chat context"
                    className="flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
                    type="button"
                >
                    <Info className="size-3" />
                    <span>Context</span>
                </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="top">
                <div className="space-y-1 text-xs">
                    {hasUsage && (
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                                Tokens:
                            </span>
                            <span className="font-mono">
                                {usage.totalTokens?.toLocaleString()}
                            </span>
                        </div>
                    )}
                    {usage?.promptTokens !== undefined && (
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                                Prompt:
                            </span>
                            <span className="font-mono">
                                {usage.promptTokens.toLocaleString()}
                            </span>
                        </div>
                    )}
                    {usage?.completionTokens !== undefined && (
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                                Completion:
                            </span>
                            <span className="font-mono">
                                {usage.completionTokens.toLocaleString()}
                            </span>
                        </div>
                    )}
                    {hasNonDefaultTemp && (
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                                Temperature:
                            </span>
                            <span className="font-mono">{temperature}</span>
                        </div>
                    )}
                    {hasNonDefaultTopP && (
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                                Top P:
                            </span>
                            <span className="font-mono">{topP}</span>
                        </div>
                    )}
                    {hasSystemPrompt && (
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                                System:
                            </span>
                            <span
                                className="max-w-[150px] truncate"
                                title={systemPrompt}
                            >
                                {systemPrompt.slice(0, 50)}
                                {systemPrompt.length > 50 ? "..." : ""}
                            </span>
                        </div>
                    )}
                </div>
            </TooltipContent>
        </Tooltip>
    );
}
