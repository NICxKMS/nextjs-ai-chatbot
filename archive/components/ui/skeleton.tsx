/**
 * Skeleton Component
 *
 * Re-exports skeleton components from shared for consistent usage.
 * Use these components for loading states across the application.
 *
 * @module components/ui/skeleton
 */

"use client";

// Re-export rich skeleton library from shared/components
export {
    Skeleton as SkeletonBase,
    SkeletonAvatar,
    type SkeletonAvatarProps,
    SkeletonButton,
    type SkeletonButtonProps,
    SkeletonCard,
    type SkeletonCardProps,
    SkeletonGroup,
    type SkeletonGroupProps,
    SkeletonInput,
    type SkeletonInputProps,
    SkeletonListItem,
    type SkeletonListItemProps,
    SkeletonMessage,
    type SkeletonMessageProps,
    type SkeletonProps,
    SkeletonText,
    type SkeletonTextProps,
} from "@/shared/components/skeleton";
// Re-export base skeleton from shared/ui for simple use cases
export { Skeleton } from "@/shared/ui/skeleton";
