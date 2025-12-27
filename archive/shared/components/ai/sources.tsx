"use client";

import {
    BookIcon,
    ExternalLinkIcon,
    FileIcon,
    GlobeIcon,
    VideoIcon,
} from "lucide-react";
import type { MouseEvent } from "react";
import { useCallback } from "react";
import {
    Source as BaseSource,
    type SourceProps as BaseSourceProps,
    Sources as BaseSources,
    type SourcesProps as BaseSourcesProps,
} from "@/components/ai-elements/sources";

export {
    Source as BaseSource,
    type SourceProps as BaseSourceProps,
    Sources as BaseSources,
    SourcesContent,
    type SourcesContentProps,
    type SourcesProps as BaseSourcesProps,
    SourcesTrigger,
    type SourcesTriggerProps,
} from "@/components/ai-elements/sources";

import { cn } from "@/lib/utils/index";

/**
 * Source type for styling differentiation
 */
export type SourceType =
    | "web"
    | "document"
    | "video"
    | "book"
    | "file"
    | "unknown";

/**
 * Extended sources props
 */
export interface EnhancedSourcesProps extends BaseSourcesProps {
    /** Called when open state changes */
    onOpenChange?: (open: boolean) => void;
}

/**
 * Enhanced Sources wrapper with open state control.
 */
export function Sources({ onOpenChange, ...props }: EnhancedSourcesProps) {
    return <BaseSources {...props} />;
}

/**
 * Extended source props with click handling and type styling
 */
export interface EnhancedSourceProps extends BaseSourceProps {
    /** Source type for icon/styling */
    sourceType?: SourceType;
    /** Called when source is clicked (prevents default navigation) */
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
    /** Navigate internally instead of external link */
    internalNavigation?: boolean;
    /** Source metadata */
    metadata?: {
        author?: string;
        date?: string;
        snippet?: string;
    };
}

/**
 * Get icon component for source type
 */
const getSourceIcon = (type: SourceType) => {
    switch (type) {
        case "web":
            return GlobeIcon;
        case "document":
            return FileIcon;
        case "video":
            return VideoIcon;
        case "book":
            return BookIcon;
        case "file":
            return FileIcon;
        default:
            return ExternalLinkIcon;
    }
};

/**
 * Get styling class for source type
 */
const getSourceTypeClass = (type: SourceType): string => {
    switch (type) {
        case "web":
            return "text-blue-600 dark:text-blue-400";
        case "document":
            return "text-amber-600 dark:text-amber-400";
        case "video":
            return "text-red-600 dark:text-red-400";
        case "book":
            return "text-green-600 dark:text-green-400";
        case "file":
            return "text-purple-600 dark:text-purple-400";
        default:
            return "text-muted-foreground";
    }
};

/**
 * Detect source type from URL
 */
export const detectSourceType = (url: string): SourceType => {
    if (!url) {
        return "unknown";
    }

    const lowerUrl = url.toLowerCase();

    if (lowerUrl.includes("youtube.com") || lowerUrl.includes("vimeo.com")) {
        return "video";
    }
    if (lowerUrl.endsWith(".pdf") || lowerUrl.includes("/docs/")) {
        return "document";
    }
    if (lowerUrl.includes("book") || lowerUrl.includes("isbn")) {
        return "book";
    }
    if (lowerUrl.startsWith("http://") || lowerUrl.startsWith("https://")) {
        return "web";
    }
    if (lowerUrl.startsWith("file://") || lowerUrl.startsWith("/")) {
        return "file";
    }

    return "unknown";
};

/**
 * Enhanced Source with type-based styling and click handling.
 */
export function Source({
    sourceType: providedType,
    onClick,
    internalNavigation,
    metadata,
    href,
    title,
    children,
    className,
    ...props
}: EnhancedSourceProps) {
    const sourceType = providedType ?? detectSourceType(href ?? "");
    const Icon = getSourceIcon(sourceType);
    const typeClass = getSourceTypeClass(sourceType);

    const handleClick = useCallback(
        (event: MouseEvent<HTMLAnchorElement>) => {
            if (onClick) {
                event.preventDefault();
                onClick(event);
            } else if (internalNavigation) {
                event.preventDefault();
                // Allow parent to handle internal navigation
            }
        },
        [onClick, internalNavigation]
    );

    return (
        <BaseSource
            className={cn(
                "group transition-colors hover:text-foreground",
                className
            )}
            href={href}
            onClick={handleClick}
            title={title}
            {...props}
        >
            {children ?? (
                <div className="flex items-start gap-2">
                    <Icon
                        className={cn("mt-0.5 size-4 flex-shrink-0", typeClass)}
                    />
                    <div className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                            {title}
                        </span>
                        {metadata?.snippet && (
                            <span className="mt-0.5 block truncate text-muted-foreground text-xs">
                                {metadata.snippet}
                            </span>
                        )}
                        {metadata?.author && (
                            <span className="mt-0.5 block text-muted-foreground text-xs">
                                {metadata.author}
                                {metadata.date && ` · ${metadata.date}`}
                            </span>
                        )}
                    </div>
                    <ExternalLinkIcon className="size-3 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-50" />
                </div>
            )}
        </BaseSource>
    );
}
