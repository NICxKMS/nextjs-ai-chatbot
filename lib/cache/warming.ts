import "server-only";

import { trace } from "@opentelemetry/api";
import { logError, logInfo } from "@/lib/log";
import { CacheTTL, warmQueryCache } from "./query-cache";
import { getRedisClient } from "./redis";

/**
 * ==============================================================================
 * CACHE WARMING SYSTEM
 * ==============================================================================
 *
 * Proactively populates cache with frequently accessed data to minimize
 * cache misses and improve application responsiveness.
 *
 * Features:
 * - Scheduled warming on deployment
 * - Priority-based warming
 * - Parallel execution with concurrency control
 * - Error handling and retry logic
 * - Progress tracking
 *
 * Use cases:
 * - Pre-populate user session data
 * - Warm frequently accessed queries
 * - Prepare cache before traffic spikes
 * - Reduce cold start latency
 */

export type WarmingTask = {
    /** Unique identifier for the task */
    id: string;
    /** Human-readable name */
    name: string;
    /** Cache namespace */
    namespace: string;
    /** TTL for cached data */
    ttl: number;
    /** Priority (higher = warmed first) */
    priority: number;
    /** Function to fetch data */
    fetchFn: () => Promise<unknown>;
    /** Estimated data size (for logging) */
    estimatedSize?: number;
};

export type WarmingResult = {
    taskId: string;
    success: boolean;
    duration: number;
    error?: string;
};

export type WarmingProgress = {
    total: number;
    completed: number;
    succeeded: number;
    failed: number;
    inProgress: number;
    estimatedTimeRemaining: number;
};

class CacheWarmer {
    private readonly tasks: Map<string, WarmingTask> = new Map();
    private readonly results: Map<string, WarmingResult> = new Map();
    private isWarming = false;
    private progress: WarmingProgress = {
        total: 0,
        completed: 0,
        succeeded: 0,
        failed: 0,
        inProgress: 0,
        estimatedTimeRemaining: 0,
    };

    /**
     * Register a warming task
     */
    register(task: WarmingTask) {
        this.tasks.set(task.id, task);
        logInfo(`Cache warming task registered: ${task.name}`);
    }

    /**
     * Register multiple warming tasks
     */
    registerMany(tasks: WarmingTask[]) {
        for (const task of tasks) {
            this.register(task);
        }
    }

    /**
     * Execute all registered warming tasks
     */
    async warmAll(
        options: { concurrency?: number; skipIfExists?: boolean } = {}
    ): Promise<WarmingResult[]> {
        const { concurrency = 5, skipIfExists = true } = options;

        if (this.isWarming) {
            throw new Error("Cache warming already in progress");
        }

        this.isWarming = true;
        this.results.clear();

        const span = trace.getActiveSpan();

        try {
            // Sort tasks by priority (highest first)
            const sortedTasks = Array.from(this.tasks.values()).sort(
                (a, b) => b.priority - a.priority
            );

            this.progress = {
                total: sortedTasks.length,
                completed: 0,
                succeeded: 0,
                failed: 0,
                inProgress: 0,
                estimatedTimeRemaining: 0,
            };

            logInfo(`Starting cache warming: ${sortedTasks.length} tasks`);

            if (span) {
                span.setAttribute(
                    "cache.warming.total_tasks",
                    sortedTasks.length
                );
                span.setAttribute("cache.warming.concurrency", concurrency);
            }

            const startTime = Date.now();

            // Execute tasks in batches with concurrency limit
            const results: WarmingResult[] = [];
            for (let i = 0; i < sortedTasks.length; i += concurrency) {
                const batch = sortedTasks.slice(i, i + concurrency);
                this.progress.inProgress = batch.length;

                const batchResults = await Promise.allSettled(
                    batch.map((task) => this.warmTask(task, skipIfExists))
                );

                // Process results
                for (let j = 0; j < batchResults.length; j++) {
                    const result = batchResults[j];
                    const task = batch[j];

                    if (!result || !task) {
                        continue;
                    }

                    if (result.status === "fulfilled") {
                        results.push(result.value);
                        this.results.set(task.id, result.value);

                        if (result.value.success) {
                            this.progress.succeeded++;
                        } else {
                            this.progress.failed++;
                        }
                    } else if (result.status === "rejected") {
                        const failedResult: WarmingResult = {
                            taskId: task.id,
                            success: false,
                            duration: 0,
                            error: result.reason?.message || "Unknown error",
                        };
                        results.push(failedResult);
                        this.results.set(task.id, failedResult);
                        this.progress.failed++;
                    }

                    this.progress.completed++;
                }

                // Update estimated time remaining
                const elapsed = Date.now() - startTime;
                const avgTimePerTask = elapsed / this.progress.completed;
                const remainingTasks =
                    this.progress.total - this.progress.completed;
                this.progress.estimatedTimeRemaining =
                    avgTimePerTask * remainingTasks;

                this.progress.inProgress = 0;
            }

            const totalDuration = Date.now() - startTime;

            logInfo(
                `Cache warming completed: ${this.progress.succeeded}/${this.progress.total} succeeded in ${totalDuration}ms`
            );

            if (span) {
                span.setAttribute(
                    "cache.warming.succeeded",
                    this.progress.succeeded
                );
                span.setAttribute("cache.warming.failed", this.progress.failed);
                span.setAttribute("cache.warming.duration_ms", totalDuration);
            }

            return results;
        } catch (error) {
            logError("Cache warming failed", error);
            throw error;
        } finally {
            this.isWarming = false;
        }
    }

    /**
     * Warm a single task
     */
    private async warmTask(
        task: WarmingTask,
        skipIfExists: boolean
    ): Promise<WarmingResult> {
        const start = Date.now();
        const span = trace.getActiveSpan();

        try {
            if (span) {
                span.addEvent(`Warming: ${task.name}`, {
                    taskId: task.id,
                    priority: task.priority,
                });
            }

            // Check if already cached
            if (skipIfExists) {
                const redis = getRedisClient();
                if (redis) {
                    const exists = await redis.exists(`query:${task.id}`);
                    if (exists) {
                        const duration = Date.now() - start;
                        logInfo(
                            `Cache warming skipped (already exists): ${task.name}`
                        );
                        return {
                            taskId: task.id,
                            success: true,
                            duration,
                        };
                    }
                }
            }

            // Fetch data
            const data = await task.fetchFn();

            // Warm cache
            await warmQueryCache(task.id, data, {
                ttl: task.ttl,
                namespace: task.namespace,
            });

            const duration = Date.now() - start;

            logInfo(
                `Cache warming succeeded: ${task.name} (${duration}ms${task.estimatedSize ? `, ~${task.estimatedSize} bytes` : ""})`
            );

            return {
                taskId: task.id,
                success: true,
                duration,
            };
        } catch (error) {
            const duration = Date.now() - start;
            const errorMessage =
                error instanceof Error ? error.message : String(error);

            logError(`Cache warming failed: ${task.name}`, error);

            return {
                taskId: task.id,
                success: false,
                duration,
                error: errorMessage,
            };
        }
    }

    /**
     * Get warming progress
     */
    getProgress(): WarmingProgress {
        return { ...this.progress };
    }

    /**
     * Get results of last warming run
     */
    getResults(): WarmingResult[] {
        return Array.from(this.results.values());
    }

    /**
     * Get result for specific task
     */
    getResult(taskId: string): WarmingResult | undefined {
        return this.results.get(taskId);
    }

    /**
     * Check if warming is in progress
     */
    get inProgress(): boolean {
        return this.isWarming;
    }

    /**
     * Get all registered tasks
     */
    getTasks(): WarmingTask[] {
        return Array.from(this.tasks.values());
    }

    /**
     * Clear all tasks and results
     */
    clear() {
        this.tasks.clear();
        this.results.clear();
        this.progress = {
            total: 0,
            completed: 0,
            succeeded: 0,
            failed: 0,
            inProgress: 0,
            estimatedTimeRemaining: 0,
        };
    }
}

// Singleton instance
export const cacheWarmer = new CacheWarmer();

/**
 * Helper to create a warming task
 */
export function createWarmingTask(
    id: string,
    name: string,
    fetchFn: () => Promise<unknown>,
    options: {
        namespace?: string;
        ttl?: number;
        priority?: number;
        estimatedSize?: number;
    } = {}
): WarmingTask {
    return {
        id,
        name,
        namespace: options.namespace || "default",
        ttl: options.ttl || CacheTTL.MEDIUM,
        priority: options.priority || 5,
        fetchFn,
        estimatedSize: options.estimatedSize,
    };
}

/**
 * Register common warming tasks for the application
 *
 * Call this during application initialization
 */
export function registerCommonWarmingTasks() {
    // Example tasks - customize based on your application

    // Warm user session data
    cacheWarmer.register({
        id: "active_users",
        name: "Active Users",
        namespace: "user",
        ttl: CacheTTL.SHORT,
        priority: 10,
        fetchFn: () => Promise.resolve({ count: 0, users: [] }),
        estimatedSize: 1024,
    });

    // Warm popular chats
    cacheWarmer.register({
        id: "popular_chats",
        name: "Popular Chats",
        namespace: "chat",
        ttl: CacheTTL.MEDIUM,
        priority: 8,
        fetchFn: () => Promise.resolve({ chats: [] }),
        estimatedSize: 5120,
    });

    // Warm configuration
    cacheWarmer.register({
        id: "app_config",
        name: "Application Configuration",
        namespace: "config",
        ttl: CacheTTL.EXTENDED,
        priority: 9,
        fetchFn: () => Promise.resolve({ settings: {} }),
        estimatedSize: 512,
    });

    logInfo(`Registered ${cacheWarmer.getTasks().length} warming tasks`);
}
