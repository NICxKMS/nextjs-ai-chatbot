/**
 * Reusable Skeleton Components
 *
 * Provides consistent loading skeleton UI across the application.
 * Uses CSS animations for optimal performance.
 *
 * @module shared/components/skeleton
 */

"use client";

import { cn } from "@/lib/utils";

// =============================================================================
// BASE SKELETON
// =============================================================================

export type SkeletonProps = {
    /** Width - CSS value or number (pixels) */
    width?: string | number;
    /** Height - CSS value or number (pixels) */
    height?: string | number;
    /** Border radius variant */
    variant?:
        | "default"
        | "circle"
        | "rounded-full"
        | "rounded-lg"
        | "rounded-xl";
    /** Additional class names */
    className?: string;
    /** Animation type */
    animation?: "pulse" | "shimmer" | "none";
};

/**
 * Base skeleton component for building loading states.
 *
 * @example
 * ```tsx
 * <Skeleton width={200} height={24} />
 * <Skeleton variant="circle" width={40} height={40} />
 * ```
 */
export function Skeleton({
    width,
    height,
    variant = "default",
    className,
    animation = "pulse",
}: SkeletonProps) {
    const variantClasses = {
        default: "rounded",
        circle: "rounded-full",
        "rounded-full": "rounded-full",
        "rounded-lg": "rounded-lg",
        "rounded-xl": "rounded-xl",
    };

    const animationClasses = {
        pulse: "animate-pulse",
        shimmer:
            "animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]",
        none: "",
    };

    const style: React.CSSProperties = {
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
    };

    return (
        <div
            aria-hidden="true"
            className={cn(
                "bg-muted",
                variantClasses[variant],
                animationClasses[animation],
                className
            )}
            style={style}
        />
    );
}

// =============================================================================
// SKELETON TEXT
// =============================================================================

export type SkeletonTextProps = {
    /** Number of lines to render */
    lines?: number;
    /** Line height in pixels */
    lineHeight?: number;
    /** Gap between lines in pixels */
    gap?: number;
    /** Make last line shorter for natural look */
    shortLastLine?: boolean;
    /** Additional class names */
    className?: string;
};

/**
 * Multi-line text skeleton.
 *
 * @example
 * ```tsx
 * <SkeletonText lines={3} />
 * ```
 */
export function SkeletonText({
    lines = 3,
    lineHeight = 16,
    gap = 8,
    shortLastLine = true,
    className,
}: SkeletonTextProps) {
    return (
        <div
            aria-hidden="true"
            className={cn("flex flex-col", className)}
            style={{ gap: `${gap}px` }}
        >
            {Array.from({ length: lines }).map((_, i) => {
                const isLast = i === lines - 1;
                const width = isLast && shortLastLine ? "65%" : "100%";

                return <Skeleton height={lineHeight} key={i} width={width} />;
            })}
        </div>
    );
}

// =============================================================================
// SKELETON AVATAR
// =============================================================================

export type SkeletonAvatarProps = {
    /** Size in pixels */
    size?: number;
    /** Additional class names */
    className?: string;
};

/**
 * Avatar placeholder skeleton.
 *
 * @example
 * ```tsx
 * <SkeletonAvatar size={40} />
 * ```
 */
export function SkeletonAvatar({ size = 32, className }: SkeletonAvatarProps) {
    return (
        <Skeleton
            className={className}
            height={size}
            variant="circle"
            width={size}
        />
    );
}

// =============================================================================
// SKELETON CARD
// =============================================================================

export type SkeletonCardProps = {
    /** Show header section */
    showHeader?: boolean;
    /** Show image/media section */
    showMedia?: boolean;
    /** Number of text lines */
    textLines?: number;
    /** Additional class names */
    className?: string;
};

/**
 * Card placeholder skeleton.
 *
 * @example
 * ```tsx
 * <SkeletonCard showHeader showMedia textLines={2} />
 * ```
 */
export function SkeletonCard({
    showHeader = true,
    showMedia = false,
    textLines = 2,
    className,
}: SkeletonCardProps) {
    return (
        <div
            aria-hidden="true"
            className={cn(
                "flex flex-col gap-3 rounded-lg border p-4",
                className
            )}
        >
            {showHeader && (
                <div className="flex items-center gap-3">
                    <SkeletonAvatar size={32} />
                    <div className="flex flex-col gap-1">
                        <Skeleton height={14} width={120} />
                        <Skeleton height={12} width={80} />
                    </div>
                </div>
            )}
            {showMedia && (
                <Skeleton
                    className="w-full"
                    height={160}
                    variant="rounded-lg"
                />
            )}
            <SkeletonText lines={textLines} />
        </div>
    );
}

// =============================================================================
// SKELETON LIST ITEM
// =============================================================================

export type SkeletonListItemProps = {
    /** Show leading avatar/icon */
    showLeading?: boolean;
    /** Show trailing action */
    showTrailing?: boolean;
    /** Leading element size */
    leadingSize?: number;
    /** Additional class names */
    className?: string;
};

/**
 * List item placeholder skeleton.
 *
 * @example
 * ```tsx
 * <SkeletonListItem showLeading showTrailing />
 * ```
 */
export function SkeletonListItem({
    showLeading = true,
    showTrailing = false,
    leadingSize = 24,
    className,
}: SkeletonListItemProps) {
    return (
        <div
            aria-hidden="true"
            className={cn("flex items-center gap-3 py-2", className)}
        >
            {showLeading && (
                <Skeleton
                    height={leadingSize}
                    variant="circle"
                    width={leadingSize}
                />
            )}
            <div className="flex flex-1 flex-col gap-1">
                <Skeleton height={16} width="70%" />
                <Skeleton height={12} width="40%" />
            </div>
            {showTrailing && <Skeleton height={20} width={60} />}
        </div>
    );
}

// =============================================================================
// SKELETON MESSAGE
// =============================================================================

export type SkeletonMessageProps = {
    /** Is this an assistant message (longer) */
    isAssistant?: boolean;
    /** Show avatar */
    showAvatar?: boolean;
    /** Additional class names */
    className?: string;
};

/**
 * Chat message placeholder skeleton.
 *
 * @example
 * ```tsx
 * <SkeletonMessage isAssistant showAvatar />
 * ```
 */
export function SkeletonMessage({
    isAssistant = true,
    showAvatar = true,
    className,
}: SkeletonMessageProps) {
    return (
        <div aria-hidden="true" className={cn("flex gap-4", className)}>
            {showAvatar && <SkeletonAvatar size={32} />}
            <div
                className={cn(
                    "flex flex-1 flex-col gap-2",
                    !showAvatar && "ml-12"
                )}
            >
                {isAssistant ? (
                    <>
                        <Skeleton height={16} width="90%" />
                        <Skeleton height={16} width="75%" />
                        <Skeleton height={16} width="60%" />
                    </>
                ) : (
                    <Skeleton height={16} width="40%" />
                )}
            </div>
        </div>
    );
}

// =============================================================================
// SKELETON BUTTON
// =============================================================================

export type SkeletonButtonProps = {
    /** Button size variant */
    size?: "sm" | "md" | "lg";
    /** Button width */
    width?: string | number;
    /** Additional class names */
    className?: string;
};

/**
 * Button placeholder skeleton.
 *
 * @example
 * ```tsx
 * <SkeletonButton size="md" width={100} />
 * ```
 */
export function SkeletonButton({
    size = "md",
    width = 100,
    className,
}: SkeletonButtonProps) {
    const sizeHeights = {
        sm: 28,
        md: 36,
        lg: 44,
    };

    return (
        <Skeleton
            className={className}
            height={sizeHeights[size]}
            variant="rounded-lg"
            width={width}
        />
    );
}

// =============================================================================
// SKELETON INPUT
// =============================================================================

export type SkeletonInputProps = {
    /** Input height */
    height?: number;
    /** Additional class names */
    className?: string;
};

/**
 * Input field placeholder skeleton.
 *
 * @example
 * ```tsx
 * <SkeletonInput />
 * ```
 */
export function SkeletonInput({ height = 40, className }: SkeletonInputProps) {
    return (
        <Skeleton
            className={cn("w-full", className)}
            height={height}
            variant="rounded-lg"
        />
    );
}

// =============================================================================
// SKELETON GROUP
// =============================================================================

export type SkeletonGroupProps = {
    /** Number of skeleton items */
    count: number;
    /** Render function for each item */
    children: (index: number) => React.ReactNode;
    /** Gap between items in pixels */
    gap?: number;
    /** Additional class names */
    className?: string;
};

/**
 * Utility component for rendering multiple skeleton items.
 *
 * @example
 * ```tsx
 * <SkeletonGroup count={5}>
 *   {(i) => <SkeletonListItem key={i} />}
 * </SkeletonGroup>
 * ```
 */
export function SkeletonGroup({
    count,
    children,
    gap = 8,
    className,
}: SkeletonGroupProps) {
    return (
        <div
            aria-hidden="true"
            aria-label="Loading..."
            className={cn("flex flex-col", className)}
            role="status"
            style={{ gap: `${gap}px` }}
        >
            {Array.from({ length: count }).map((_, i) => children(i))}
        </div>
    );
}
