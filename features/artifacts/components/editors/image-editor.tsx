"use client";

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
// Icons
// ============================================================================

function LoaderIcon({ size = 16 }: { size?: number }) {
    return (
        <svg
            height={size}
            strokeLinejoin="round"
            style={{ color: "currentcolor" }}
            viewBox="0 0 16 16"
            width={size}
        >
            <g clipPath="url(#clip0_2393_1490)">
                <path d="M8 0V4" stroke="currentColor" strokeWidth="1.5" />
                <path
                    d="M8 16V12"
                    opacity="0.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <path
                    d="M3.29773 1.52783L5.64887 4.7639"
                    opacity="0.9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <path
                    d="M12.7023 1.52783L10.3511 4.7639"
                    opacity="0.1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <path
                    d="M12.7023 14.472L10.3511 11.236"
                    opacity="0.4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <path
                    d="M3.29773 14.472L5.64887 11.236"
                    opacity="0.6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <path
                    d="M15.6085 5.52783L11.8043 6.7639"
                    opacity="0.2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <path
                    d="M0.391602 10.472L4.19583 9.23598"
                    opacity="0.7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <path
                    d="M15.6085 10.4722L11.8043 9.2361"
                    opacity="0.3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <path
                    d="M0.391602 5.52783L4.19583 6.7639"
                    opacity="0.8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
            </g>
            <defs>
                <clipPath id="clip0_2393_1490">
                    <rect fill="white" height="16" width="16" />
                </clipPath>
            </defs>
        </svg>
    );
}

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
                    {!isInline && (
                        <div className="animate-spin">
                            <LoaderIcon />
                        </div>
                    )}
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
