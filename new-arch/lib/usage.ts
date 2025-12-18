/**
 * Usage Types and Utilities - Stub
 * @module new-arch/lib/usage
 *
 * This is a placeholder for usage tracking.
 * Will be implemented in future.
 */

export type AppUsage = {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd?: number;
    timestamp?: Date;
};

export function createEmptyUsage(): AppUsage {
    return {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
    };
}

export function combineUsage(a: AppUsage, b: AppUsage): AppUsage {
    return {
        promptTokens: a.promptTokens + b.promptTokens,
        completionTokens: a.completionTokens + b.completionTokens,
        totalTokens: a.totalTokens + b.totalTokens,
        costUsd:
            a.costUsd !== undefined || b.costUsd !== undefined
                ? (a.costUsd ?? 0) + (b.costUsd ?? 0)
                : undefined,
    };
}
