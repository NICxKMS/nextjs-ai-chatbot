"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type TextPartProps = HTMLAttributes<HTMLDivElement> & {
    text: string;
    role: "user" | "assistant";
};

/**
 * Renders text content for a message.
 * Handles styling differences between user and assistant messages.
 */
export function TextPart({ text, role, className, ...props }: TextPartProps) {
    if (!text?.trim()) {
        return null;
    }

    return (
        <div
            className={cn(
                "whitespace-pre-wrap break-words",
                role === "user" &&
                    "w-fit rounded-2xl bg-[#006cff] px-3 py-2 text-right text-white",
                role === "assistant" &&
                    "bg-transparent px-0 py-0 text-left text-foreground",
                className
            )}
            data-testid="message-text-part"
            {...props}
        >
            {text}
        </div>
    );
}
