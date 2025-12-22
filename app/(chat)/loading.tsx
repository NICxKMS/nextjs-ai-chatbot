/**
 * Chat Loading State
 *
 * Displays skeleton UI while chat data is being loaded.
 * Uses reusable skeleton components for consistent loading states.
 *
 * @module app/(chat)/loading
 */

import { Skeleton, SkeletonInput, SkeletonMessage } from "@/shared/components";

export default function ChatLoading() {
    return (
        <div
            aria-label="Loading chat"
            className="flex h-full flex-col"
            role="status"
        >
            {/* Header skeleton */}
            <div className="flex h-14 items-center border-b px-4">
                <Skeleton height={24} width={128} />
            </div>

            {/* Messages skeleton */}
            <div className="flex-1 space-y-6 p-4">
                {[0, 1, 2].map((i) => (
                    <SkeletonMessage
                        isAssistant={i % 2 === 1}
                        key={i}
                        showAvatar
                    />
                ))}
            </div>

            {/* Input skeleton */}
            <div className="border-t p-4">
                <SkeletonInput height={48} />
            </div>
        </div>
    );
}
