"use client";

/**
 * Shimmer Wrapper
 *
 * Enhanced wrapper around AI Element Shimmer component.
 * Adds preset sizes, custom shapes, and convenience components.
 */

import {
    Shimmer as BaseShimmer,
    type TextShimmerProps,
} from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils/index";

// Re-export base types
export type { TextShimmerProps } from "@/components/ai-elements/shimmer";

/**
 * Preset sizes for shimmer text
 */
export type ShimmerSize = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Size class mappings
 */
const SIZE_CLASSES: Record<ShimmerSize, string> = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
};

/**
 * Enhanced shimmer props with size presets
 */
export interface ShimmerProps extends Omit<TextShimmerProps, "children"> {
    /** Text to display with shimmer effect */
    children: string;
    /** Preset size for the shimmer text */
    size?: ShimmerSize;
}

/**
 * Enhanced Shimmer component with size presets
 */
export function Shimmer({ size = "md", className, ...props }: ShimmerProps) {
    return (
        <BaseShimmer className={cn(SIZE_CLASSES[size], className)} {...props} />
    );
}

/**
 * Skeleton shimmer shape types
 */
export type SkeletonShape = "text" | "circle" | "rectangle" | "card" | "avatar";

/**
 * Skeleton shimmer props
 */
export type SkeletonShimmerProps = {
    /** Shape of the skeleton */
    shape?: SkeletonShape;
    /** Width (CSS value or number of pixels) */
    width?: string | number;
    /** Height (CSS value or number of pixels) */
    height?: string | number;
    /** Number of skeleton lines (for text shape) */
    lines?: number;
    /** Custom class name */
    className?: string;
    /** Animation duration in seconds */
    duration?: number;
};

/**
 * Get dimensions for a shape
 */
function getShapeDimensions(shape: SkeletonShape): {
    width: string;
    height: string;
} {
    switch (shape) {
        case "circle":
            return { width: "40px", height: "40px" };
        case "avatar":
            return { width: "32px", height: "32px" };
        case "card":
            return { width: "100%", height: "120px" };
        case "rectangle":
            return { width: "100%", height: "20px" };
        default:
            return { width: "100%", height: "16px" };
    }
}

/**
 * Get shape-specific classes
 */
function getShapeClasses(shape: SkeletonShape): string {
    switch (shape) {
        case "circle":
        case "avatar":
            return "rounded-full";
        case "card":
            return "rounded-lg";
        default:
            return "rounded";
    }
}

/**
 * Skeleton shimmer component for loading states
 */
export function SkeletonShimmer({
    shape = "text",
    width,
    height,
    lines = 1,
    className,
    duration = 1.5,
}: SkeletonShimmerProps) {
    const defaults = getShapeDimensions(shape);
    const shapeClasses = getShapeClasses(shape);

    const finalWidth = width
        ? typeof width === "number"
            ? `${width}px`
            : width
        : defaults.width;

    const finalHeight = height
        ? typeof height === "number"
            ? `${height}px`
            : height
        : defaults.height;

    const style = {
        width: finalWidth,
        height: finalHeight,
        animationDuration: `${duration}s`,
    };

    if (lines > 1 && shape === "text") {
        return (
            <div className={cn("flex flex-col gap-2", className)}>
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        className={cn(
                            "animate-pulse bg-muted",
                            shapeClasses,
                            // Make last line shorter for natural look
                            i === lines - 1 && "w-3/4"
                        )}
                        // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton lines, order never changes
                        key={i}
                        style={{
                            ...style,
                            width: i === lines - 1 ? "75%" : finalWidth,
                        }}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={cn("animate-pulse bg-muted", shapeClasses, className)}
            style={style}
        />
    );
}

/**
 * Preset shimmer configurations
 */
export const ShimmerPresets = {
    /** Message bubble shimmer */
    message: () => (
        <div className="flex flex-col gap-2">
            <SkeletonShimmer shape="text" width="90%" />
            <SkeletonShimmer shape="text" width="70%" />
            <SkeletonShimmer shape="text" width="80%" />
        </div>
    ),

    /** Avatar with text shimmer */
    avatarWithText: () => (
        <div className="flex items-center gap-3">
            <SkeletonShimmer shape="avatar" />
            <div className="flex flex-col gap-1">
                <SkeletonShimmer height={14} shape="text" width={120} />
                <SkeletonShimmer height={12} shape="text" width={80} />
            </div>
        </div>
    ),

    /** Card shimmer */
    card: () => (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
            <SkeletonShimmer height={160} shape="rectangle" />
            <SkeletonShimmer shape="text" width="60%" />
            <SkeletonShimmer lines={2} shape="text" />
        </div>
    ),

    /** List item shimmer */
    listItem: () => (
        <div className="flex items-center gap-3 py-2">
            <SkeletonShimmer height={24} shape="circle" width={24} />
            <SkeletonShimmer shape="text" width="70%" />
        </div>
    ),

    /** Inline shimmer text */
    inline: (text: string) => <Shimmer size="sm">{text}</Shimmer>,
};

/**
 * Hook for managing shimmer loading states
 */
export function useShimmerState(initialLoading = true) {
    const [isLoading, setIsLoading] = useState(initialLoading);

    const startLoading = useCallback(() => setIsLoading(true), []);
    const stopLoading = useCallback(() => setIsLoading(false), []);

    return {
        isLoading,
        startLoading,
        stopLoading,
        setIsLoading,
    };
}

// Import useState and useCallback for the hook
import { useCallback, useState } from "react";
