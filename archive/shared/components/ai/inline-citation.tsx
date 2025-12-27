"use client";

/**
 * InlineCitation Wrapper
 *
 * Enhanced wrapper around AI Element InlineCitation component.
 * Adds click handlers and custom styling for different source types.
 */

import { useCallback } from "react";
import { cn } from "@/lib/utils/index";

// Re-export all base components and types
export {
    InlineCitation,
    InlineCitationCard,
    InlineCitationCardBody,
    type InlineCitationCardBodyProps,
    type InlineCitationCardProps,
    InlineCitationCardTrigger,
    type InlineCitationCardTriggerProps,
    InlineCitationCarousel,
    InlineCitationCarouselContent,
    type InlineCitationCarouselContentProps,
    InlineCitationCarouselHeader,
    type InlineCitationCarouselHeaderProps,
    InlineCitationCarouselIndex,
    type InlineCitationCarouselIndexProps,
    InlineCitationCarouselItem,
    type InlineCitationCarouselItemProps,
    InlineCitationCarouselNext,
    type InlineCitationCarouselNextProps,
    InlineCitationCarouselPrev,
    type InlineCitationCarouselPrevProps,
    type InlineCitationCarouselProps,
    type InlineCitationProps,
    InlineCitationQuote,
    type InlineCitationQuoteProps,
    InlineCitationSource,
    type InlineCitationSourceProps,
    InlineCitationText,
    type InlineCitationTextProps,
} from "@/components/ai-elements/inline-citation";

import {
    InlineCitationCardTrigger as BaseCardTrigger,
    type InlineCitationCardTriggerProps,
} from "@/components/ai-elements/inline-citation";

/**
 * Source type for styling different citation types
 */
export type CitationSourceType =
    | "web"
    | "document"
    | "code"
    | "academic"
    | "internal"
    | "unknown";

/**
 * Detect source type from URL
 */
export function detectCitationSourceType(url: string): CitationSourceType {
    try {
        const { hostname, pathname } = new URL(url);

        // Academic sources
        if (
            hostname.includes("arxiv.org") ||
            hostname.includes("scholar.google") ||
            hostname.includes("pubmed") ||
            hostname.includes("doi.org") ||
            hostname.includes("researchgate") ||
            hostname.includes("jstor.org")
        ) {
            return "academic";
        }

        // Code repositories
        if (
            hostname.includes("github.com") ||
            hostname.includes("gitlab.com") ||
            hostname.includes("bitbucket.org") ||
            hostname.includes("stackoverflow.com")
        ) {
            return "code";
        }

        // Document formats
        if (
            pathname.endsWith(".pdf") ||
            pathname.endsWith(".doc") ||
            pathname.endsWith(".docx")
        ) {
            return "document";
        }

        // Internal links (relative or localhost)
        if (
            hostname === "localhost" ||
            hostname.includes("127.0.0.1") ||
            !hostname.includes(".")
        ) {
            return "internal";
        }

        return "web";
    } catch {
        return "unknown";
    }
}

/**
 * Get style classes for source type
 */
export function getCitationTypeStyles(type: CitationSourceType): string {
    switch (type) {
        case "academic":
            return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
        case "code":
            return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
        case "document":
            return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
        case "internal":
            return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
        case "web":
            return "bg-secondary text-secondary-foreground";
        default:
            return "bg-muted text-muted-foreground";
    }
}

/**
 * Enhanced card trigger props with click handler and type styling
 */
export interface EnhancedCitationCardTriggerProps
    extends Omit<InlineCitationCardTriggerProps, "onClick"> {
    /** Click handler when citation sources are clicked */
    onSourceClick?: (sources: string[]) => void;
    /** Auto-detect and apply source type styling */
    autoStyle?: boolean;
}

/**
 * Enhanced citation card trigger with click handler and type-based styling
 */
export function EnhancedCitationCardTrigger({
    sources,
    onSourceClick,
    autoStyle = true,
    className,
    ...props
}: EnhancedCitationCardTriggerProps) {
    const sourceType = autoStyle
        ? detectCitationSourceType(sources[0] ?? "")
        : "web";

    const handleClick = useCallback(() => {
        onSourceClick?.(sources);
    }, [onSourceClick, sources]);

    return (
        <BaseCardTrigger
            className={cn(
                autoStyle && getCitationTypeStyles(sourceType),
                "cursor-pointer transition-opacity hover:opacity-80",
                className
            )}
            onClick={handleClick}
            sources={sources}
            {...props}
        />
    );
}

/**
 * Citation click handler type
 */
export type CitationClickHandler = (
    url: string,
    event: React.MouseEvent
) => void;

/**
 * Hook for managing citation interactions
 */
export function useCitationHandler(options?: {
    onCitationClick?: CitationClickHandler;
    openInNewTab?: boolean;
}) {
    const { onCitationClick, openInNewTab = true } = options ?? {};

    const handleCitationClick = useCallback(
        (url: string, event: React.MouseEvent) => {
            if (onCitationClick) {
                onCitationClick(url, event);
                return;
            }

            // Default behavior: open in new tab
            if (openInNewTab) {
                window.open(url, "_blank", "noopener,noreferrer");
            } else {
                window.location.href = url;
            }
        },
        [onCitationClick, openInNewTab]
    );

    return {
        handleCitationClick,
    };
}
