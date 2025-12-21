"use client";

import { Loader } from "@/components/ai-elements/loader";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type ImageEditorProps = {
    /** Display title for the image alt text */
    title: string;
    /** Base64 encoded image content */
    content: string;
    /** Whether this is the current version being viewed */
    isCurrentVersion?: boolean;
    /** Current artifact status */
    status: "streaming" | "idle";
    /** Whether to display inline (smaller) or full-size */
    isInline?: boolean;
};

// ============================================================================
// Component
// ============================================================================

export function ImageEditor({
    title,
    content,
    status,
    isInline = false,
}: ImageEditorProps) {
    return (
        <div
            className={cn("flex w-full flex-row items-center justify-center", {
                "h-[calc(100dvh-60px)]": !isInline,
                "h-[200px]": isInline,
            })}
        >
            {status === "streaming" ? (
                <div className="flex flex-row items-center gap-4">
                    {!isInline && <Loader />}
                    <div>Generating Image...</div>
                </div>
            ) : (
                <picture>
                    <img
                        alt={title}
                        className={cn(
                            "h-auto w-full max-w-[800px] object-contain",
                            {
                                "p-0 md:p-20": !isInline,
                            }
                        )}
                        height={600}
                        src={`data:image/png;base64,${content}`}
                        style={{ aspectRatio: "4/3" }}
                        width={800}
                    />
                </picture>
            )}
        </div>
    );
}
