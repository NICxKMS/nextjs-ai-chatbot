/**
 * SuggestedActions Component
 *
 * Displays quick-start action buttons below the chat input.
 * Each button sends a predefined message when clicked.
 *
 * @module features/chat/components/suggested-actions
 */

"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { motion } from "@/lib/motion";
import { createRateLimiter } from "@/lib/utils";
import type { ChatMessage, VisibilityType } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export type SuggestedActionsProps = {
    /** Chat session identifier */
    chatId: string;
    /** Whether the suggestions are disabled */
    disabled?: boolean;
    /** AI SDK sendMessage function to send messages */
    sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
    /** Current visibility setting (for memoization) */
    selectedVisibilityType?: VisibilityType;
};

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Pool of suggestions covering various categories.
 * First 4 are shown by default (from OldApp greeting).
 * Additional suggestions available for future expansion.
 */
const SUGGESTION_POOL = [
    // Primary suggestions (from OldApp greeting - shown by default)
    "Explain quantum computing in simple terms",
    "What are the benefits of TypeScript over JavaScript?",
    "Write a Python function to find prime numbers",
    "How do I optimize React performance?",

    // Coding
    "Write a React hook for fetching data with loading states",
    "Explain the difference between let, const, and var in JavaScript",
    "Debug this code: [paste your code here]",
    "Convert this function to TypeScript with proper types",

    // Writing
    "Help me write a professional email to request time off",
    "Summarize this article in 3 bullet points",
    "Write a creative story opening about a mysterious door",
    "Help me improve this paragraph for clarity",

    // Research
    "Compare the pros and cons of React vs Vue",
    "Explain how machine learning works in simple terms",
    "What are the latest trends in web development?",
    "How do I optimize a website for better performance?",

    // Creative
    "Generate 5 unique business name ideas for a coffee shop",
    "Create a workout plan for a beginner",
    "Suggest recipes using chicken and vegetables",
    "Plan a weekend trip itinerary for New York City",
] as const;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Pure implementation of suggested actions.
 */
function PureSuggestedActions({
    chatId,
    disabled,
    sendMessage,
}: SuggestedActionsProps) {
    const router = useRouter();

    // Use stable first 4 suggestions to prevent SSR/client hydration mismatch
    const suggestions = useMemo(() => SUGGESTION_POOL.slice(0, 4), []);

    // Rate limiter to prevent rapid-fire clicks (5 per 10 seconds)
    const rateLimiterRef = useRef(
        createRateLimiter({ maxRequests: 5, windowMs: 10_000 })
    );

    const handleClick = useCallback(
        (suggestion: string) => {
            // Check rate limit before processing
            const result = rateLimiterRef.current.check();
            if (!result.allowed) {
                toast.error(
                    `Too many requests. Try again in ${Math.ceil(result.resetIn / 1000)}s`
                );
                return;
            }

            // Update URL to include chat ID (SSR-safe)
            router.replace(`/chat/${chatId}`, { scroll: false });

            // Send the suggested message
            sendMessage({
                role: "user",
                parts: [{ type: "text", text: suggestion }],
            });
        },
        [chatId, router, sendMessage]
    );

    return (
        <div
            className="grid w-full gap-2 sm:grid-cols-2"
            data-testid="suggested-actions"
        >
            {suggestions.map((suggestion, index) => (
                <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    initial={{ opacity: 0, y: 20 }}
                    key={suggestion}
                    transition={{ delay: 0.05 * index }}
                >
                    <Suggestion
                        className="h-auto w-full cursor-pointer whitespace-normal rounded-full p-3 px-4 text-left"
                        disabled={disabled}
                        onClick={handleClick}
                        suggestion={suggestion}
                    />
                </motion.div>
            ))}
        </div>
    );
}

/**
 * Memoized suggested actions component.
 *
 * Features:
 * - Grid layout with responsive columns
 * - Staggered animation on mount
 * - Sends predefined messages on click
 *
 * Visual parity with oldapp/components/suggested-actions.tsx
 */
export const SuggestedActions = memo(
    PureSuggestedActions,
    (prevProps, nextProps) => {
        if (prevProps.chatId !== nextProps.chatId) {
            return false;
        }
        if (
            prevProps.selectedVisibilityType !==
            nextProps.selectedVisibilityType
        ) {
            return false;
        }
        return true;
    }
);
