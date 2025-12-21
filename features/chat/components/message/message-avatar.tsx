/**
 * Message Avatar Component
 *
 * Displays an avatar icon based on the message role (user, assistant, or system).
 * Uses consistent styling that matches the OldApp visual design.
 *
 * @module features/chat/components/message/message-avatar
 */

"use client";

import { Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { SparklesIcon } from "@/shared/components/icons";

// =============================================================================
// TYPES
// =============================================================================

export interface MessageAvatarProps {
    /** The role of the message sender */
    role: "user" | "assistant" | "system";
    /** Optional additional class names */
    className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Renders an avatar icon for a chat message.
 *
 * - User: User icon with primary background
 * - Assistant: Bot icon with muted background and ring border
 * - System: Settings icon with secondary background
 *
 * @example
 * ```tsx
 * <MessageAvatar role="assistant" />
 * <MessageAvatar role="user" />
 * ```
 */
export function MessageAvatar({ role, className }: MessageAvatarProps) {
    return (
        <div
            className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                role === "user" && "bg-[#006cff] text-white",
                role === "assistant" && "bg-background ring-1 ring-border",
                role === "system" && "bg-secondary text-secondary-foreground",
                className
            )}
            data-role={role}
        >
            {role === "user" && <User className="size-4" />}
            {role === "assistant" && <SparklesIcon size={14} />}
            {role === "system" && <Settings className="size-4" />}
        </div>
    );
}
