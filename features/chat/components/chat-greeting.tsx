/**
 * ChatGreeting Component
 *
 * Welcome message displayed when starting a new chat.
 * Shows animated greeting text to guide users.
 *
 * @module features/chat/components/chat-greeting
 */

"use client";

import { memo } from "react";
import { motion } from "@/lib/motion";

/**
 * Animated greeting component for empty chat state.
 *
 * Displays a welcoming message with staggered fade-in animations.
 * Used when no messages exist in the current chat session.
 *
 * @example
 * ```tsx
 * {messages.length === 0 && <ChatGreeting />}
 * ```
 */
export const ChatGreeting = memo(function ChatGreeting() {
    return (
        <div
            aria-label="Welcome message"
            className="flex min-h-[120px] flex-col justify-center px-4 md:px-8"
            role="region"
        >
            <motion.h1
                animate={{ opacity: 1, y: 0 }}
                className="font-semibold text-foreground text-xl md:text-2xl"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                Hello there!
            </motion.h1>
            <motion.p
                animate={{ opacity: 1, y: 0 }}
                className="text-muted-foreground text-xl md:text-2xl"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.6, duration: 0.5 }}
            >
                Ask me anything about coding, writing, or research.
            </motion.p>
        </div>
    );
});
