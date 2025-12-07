import "server-only";

import type { Redis } from "@upstash/redis";
import { logError, logInfo, logWarn } from "../log";
import { getRequestContext } from "../request-context";
import { getRedisClient, isRedisAvailable } from "./redis";

/**
 * Circuit Breaker States
 */
type CircuitState = "closed" | "open" | "half-open";

type CircuitBreakerConfig = {
    failureThreshold: number; // Number of failures before opening circuit
    resetTimeoutMs: number; // Time before attempting to close circuit
    halfOpenMaxAttempts: number; // Max attempts in half-open state
};

/**
 * Retry Configuration
 */
type RetryConfig = {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    retryableErrors: string[];
};

/**
 * Cache Service - Unified cache layer with resilience patterns
 *
 * Features:
 * - Circuit breaker pattern for fault tolerance
 * - Automatic retries with exponential backoff
 * - Request ID correlation for tracing
 * - Batch operations for efficiency
 * - Health monitoring
 */
class CacheService {
    private circuitState: CircuitState = "closed";
    private failureCount = 0;
    private lastFailureTime = 0;
    private halfOpenAttempts = 0;
    private successCount = 0;

    private readonly circuitConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        resetTimeoutMs: 30_000, // 30 seconds
        halfOpenMaxAttempts: 3,
    };

    private readonly retryConfig: RetryConfig = {
        maxRetries: 3,
        baseDelayMs: 100,
        maxDelayMs: 2000,
        retryableErrors: [
            "ECONNRESET",
            "ETIMEDOUT",
            "ECONNREFUSED",
            "EPIPE",
            "ERR_NETWORK",
            "fetch failed",
        ],
    };

    /**
     * Get Redis client with circuit breaker check
     */
    private getClient(): Redis | null {
        if (!this.isCircuitClosed()) {
            const ctx = getRequestContext();
            logWarn("Cache circuit breaker is open", undefined, {
                requestId: ctx?.requestId,
                circuitState: this.circuitState,
            });
            return null;
        }
        return getRedisClient();
    }

    /**
     * Check if circuit is closed (allowing operations)
     */
    private isCircuitClosed(): boolean {
        if (this.circuitState === "closed") {
            return true;
        }

        if (this.circuitState === "open") {
            // Check if we should transition to half-open
            const now = Date.now();
            if (
                now - this.lastFailureTime >=
                this.circuitConfig.resetTimeoutMs
            ) {
                this.circuitState = "half-open";
                this.halfOpenAttempts = 0;
                logInfo("Cache circuit breaker transitioning to half-open");
                return true;
            }
            return false;
        }

        // half-open state - allow limited attempts
        return this.halfOpenAttempts < this.circuitConfig.halfOpenMaxAttempts;
    }

    /**
     * Record operation success
     */
    private recordSuccess(): void {
        if (this.circuitState === "half-open") {
            this.successCount++;
            this.halfOpenAttempts++;
            if (this.successCount >= this.circuitConfig.halfOpenMaxAttempts) {
                this.circuitState = "closed";
                this.failureCount = 0;
                this.successCount = 0;
                this.halfOpenAttempts = 0;
                logInfo(
                    "Cache circuit breaker closed after successful recovery"
                );
            }
        } else if (this.failureCount > 0) {
            // Decay failure count on success in closed state
            this.failureCount = Math.max(0, this.failureCount - 1);
        }
    }

    /**
     * Record operation failure
     */
    private recordFailure(error: unknown): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.circuitState === "half-open") {
            this.halfOpenAttempts++;
            if (
                this.halfOpenAttempts >= this.circuitConfig.halfOpenMaxAttempts
            ) {
                this.circuitState = "open";
                logWarn(
                    "Cache circuit breaker reopened after half-open failures",
                    error
                );
            }
        } else if (
            this.circuitState === "closed" &&
            this.failureCount >= this.circuitConfig.failureThreshold
        ) {
            this.circuitState = "open";
            logWarn("Cache circuit breaker opened due to failures", error, {
                failureCount: this.failureCount,
            });
        }
    }

    /**
     * Check if error is retryable
     */
    private isRetryableError(error: unknown): boolean {
        if (!(error instanceof Error)) {
            return false;
        }

        const errorStr = error.message.toLowerCase();
        return this.retryConfig.retryableErrors.some((retryable) =>
            errorStr.includes(retryable.toLowerCase())
        );
    }

    /**
     * Calculate retry delay with exponential backoff and jitter
     */
    private getRetryDelay(attempt: number): number {
        const exponentialDelay = this.retryConfig.baseDelayMs * 2 ** attempt;
        const jitter = Math.random() * this.retryConfig.baseDelayMs;
        return Math.min(exponentialDelay + jitter, this.retryConfig.maxDelayMs);
    }

    /**
     * Execute operation with retries
     */
    private async withRetry<T>(
        operation: () => Promise<T>,
        operationName: string
    ): Promise<T> {
        const ctx = getRequestContext();
        let lastError: unknown;

        for (
            let attempt = 0;
            attempt <= this.retryConfig.maxRetries;
            attempt++
        ) {
            try {
                const result = await operation();
                this.recordSuccess();
                return result;
            } catch (error) {
                lastError = error;

                if (
                    !this.isRetryableError(error) ||
                    attempt === this.retryConfig.maxRetries
                ) {
                    this.recordFailure(error);
                    throw error;
                }

                const delay = this.getRetryDelay(attempt);
                logWarn(`Cache ${operationName} retry`, error, {
                    requestId: ctx?.requestId,
                    attempt: attempt + 1,
                    maxRetries: this.retryConfig.maxRetries,
                    delayMs: delay,
                });

                await this.sleep(delay);
            }
        }

        this.recordFailure(lastError);
        throw lastError;
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Check if cache service is available
     */
    isAvailable(): boolean {
        return isRedisAvailable() && this.isCircuitClosed();
    }

    /**
     * Get circuit breaker status for health checks
     */
    getCircuitStatus(): {
        state: CircuitState;
        failureCount: number;
        lastFailureTime: number;
    } {
        return {
            state: this.circuitState,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime,
        };
    }

    /**
     * GET operation with resilience
     */
    async get<T>(key: string): Promise<T | null> {
        const redis = this.getClient();
        if (!redis) {
            return null;
        }

        const ctx = getRequestContext();

        try {
            return await this.withRetry(async () => {
                const result = await redis.get<T>(key);
                logInfo("Cache GET", undefined, {
                    requestId: ctx?.requestId,
                    key,
                    hit: result !== null,
                });
                return result;
            }, "GET");
        } catch (error) {
            logError("Cache GET failed", error, {
                requestId: ctx?.requestId,
                key,
            });
            return null;
        }
    }

    /**
     * SET operation with resilience
     */
    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
        const redis = this.getClient();
        if (!redis) {
            return false;
        }

        const ctx = getRequestContext();

        try {
            await this.withRetry(async () => {
                if (ttlSeconds) {
                    await redis.set(key, value, { ex: ttlSeconds });
                } else {
                    await redis.set(key, value);
                }
            }, "SET");

            logInfo("Cache SET", undefined, {
                requestId: ctx?.requestId,
                key,
                ttl: ttlSeconds,
            });
            return true;
        } catch (error) {
            logError("Cache SET failed", error, {
                requestId: ctx?.requestId,
                key,
            });
            return false;
        }
    }

    /**
     * DELETE operation with resilience
     */
    async del(key: string): Promise<boolean> {
        const redis = this.getClient();
        if (!redis) {
            return false;
        }

        const ctx = getRequestContext();

        try {
            await this.withRetry(async () => {
                await redis.del(key);
            }, "DEL");

            logInfo("Cache DEL", undefined, {
                requestId: ctx?.requestId,
                key,
            });
            return true;
        } catch (error) {
            logError("Cache DEL failed", error, {
                requestId: ctx?.requestId,
                key,
            });
            return false;
        }
    }

    /**
     * Execute Lua script with resilience
     */
    async eval(
        script: string,
        keys: string[],
        args: string[]
    ): Promise<unknown> {
        const redis = this.getClient();
        if (!redis) {
            return null;
        }

        const ctx = getRequestContext();

        try {
            return await this.withRetry(async () => {
                return await redis.eval(script, keys, args);
            }, "EVAL");
        } catch (error) {
            logError("Cache EVAL failed", error, {
                requestId: ctx?.requestId,
                keys,
            });
            return null;
        }
    }

    /**
     * Execute pipeline with resilience
     */
    async pipeline<T extends unknown[]>(
        commands: Array<{ cmd: string; args: unknown[] }>
    ): Promise<T | null> {
        const redis = this.getClient();
        if (!redis) {
            return null;
        }

        const ctx = getRequestContext();

        try {
            return await this.withRetry(async () => {
                const pipe = redis.pipeline();
                for (const { cmd, args: cmdArgs } of commands) {
                    // Type-safe command execution
                    const method = (
                        pipe as unknown as Record<
                            string,
                            ((...a: unknown[]) => unknown) | undefined
                        >
                    )[cmd];
                    if (method) {
                        method.call(pipe, ...cmdArgs);
                    }
                }
                return (await pipe.exec()) as T;
            }, "PIPELINE");
        } catch (error) {
            logError("Cache PIPELINE failed", error, {
                requestId: ctx?.requestId,
                commandCount: commands.length,
            });
            return null;
        }
    }

    /**
     * ZADD operation with resilience
     */
    async zadd(key: string, score: number, member: string): Promise<boolean> {
        const redis = this.getClient();
        if (!redis) {
            return false;
        }

        const ctx = getRequestContext();

        try {
            await this.withRetry(async () => {
                await redis.zadd(key, { score, member });
            }, "ZADD");

            logInfo("Cache ZADD", undefined, {
                requestId: ctx?.requestId,
                key,
            });
            return true;
        } catch (error) {
            logError("Cache ZADD failed", error, {
                requestId: ctx?.requestId,
                key,
            });
            return false;
        }
    }

    /**
     * ZRANGE operation with resilience
     */
    async zrange<T>(
        key: string,
        start: number,
        stop: number,
        options?: { rev?: boolean }
    ): Promise<T[]> {
        const redis = this.getClient();
        if (!redis) {
            return [];
        }

        const ctx = getRequestContext();

        try {
            return await this.withRetry(async () => {
                return await redis.zrange<T[]>(key, start, stop, options);
            }, "ZRANGE");
        } catch (error) {
            logError("Cache ZRANGE failed", error, {
                requestId: ctx?.requestId,
                key,
            });
            return [];
        }
    }

    /**
     * ZREM operation with resilience
     */
    async zrem(key: string, member: string): Promise<boolean> {
        const redis = this.getClient();
        if (!redis) {
            return false;
        }

        const ctx = getRequestContext();

        try {
            await this.withRetry(async () => {
                await redis.zrem(key, member);
            }, "ZREM");

            logInfo("Cache ZREM", undefined, {
                requestId: ctx?.requestId,
                key,
            });
            return true;
        } catch (error) {
            logError("Cache ZREM failed", error, {
                requestId: ctx?.requestId,
                key,
            });
            return false;
        }
    }

    /**
     * Set TTL on key
     */
    async expire(key: string, seconds: number): Promise<boolean> {
        const redis = this.getClient();
        if (!redis) {
            return false;
        }

        try {
            await this.withRetry(async () => {
                await redis.expire(key, seconds);
            }, "EXPIRE");
            return true;
        } catch (error) {
            logError("Cache EXPIRE failed", error, { key });
            return false;
        }
    }

    /**
     * Batch GET operations - more efficient than individual calls
     */
    async batchGet<T>(keys: string[]): Promise<Map<string, T | null>> {
        const results = new Map<string, T | null>();
        const redis = this.getClient();

        if (!redis || keys.length === 0) {
            for (const key of keys) {
                results.set(key, null);
            }
            return results;
        }

        const ctx = getRequestContext();

        try {
            const values = await this.withRetry(async () => {
                return await redis.mget<T[]>(...keys);
            }, "MGET");

            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (key !== undefined) {
                    results.set(key, values[i] ?? null);
                }
            }

            logInfo("Cache batch GET", undefined, {
                requestId: ctx?.requestId,
                keyCount: keys.length,
                hitCount: values.filter((v) => v !== null).length,
            });
        } catch (error) {
            logError("Cache batch GET failed", error, {
                requestId: ctx?.requestId,
                keyCount: keys.length,
            });
            for (const key of keys) {
                results.set(key, null);
            }
        }

        return results;
    }

    /**
     * Batch SET operations with pipeline
     */
    async batchSet<T>(
        items: Array<{ key: string; value: T; ttl?: number }>
    ): Promise<boolean> {
        const redis = this.getClient();

        if (!redis || items.length === 0) {
            return false;
        }

        const ctx = getRequestContext();

        try {
            await this.withRetry(async () => {
                const pipe = redis.pipeline();
                for (const { key, value, ttl } of items) {
                    if (ttl) {
                        pipe.set(key, value, { ex: ttl });
                    } else {
                        pipe.set(key, value);
                    }
                }
                await pipe.exec();
            }, "BATCH_SET");

            logInfo("Cache batch SET", undefined, {
                requestId: ctx?.requestId,
                itemCount: items.length,
            });
            return true;
        } catch (error) {
            logError("Cache batch SET failed", error, {
                requestId: ctx?.requestId,
                itemCount: items.length,
            });
            return false;
        }
    }

    /**
     * Batch DELETE operations
     */
    async batchDel(keys: string[]): Promise<boolean> {
        const redis = this.getClient();

        if (!redis || keys.length === 0) {
            return false;
        }

        const ctx = getRequestContext();

        try {
            await this.withRetry(async () => {
                await redis.del(...keys);
            }, "BATCH_DEL");

            logInfo("Cache batch DEL", undefined, {
                requestId: ctx?.requestId,
                keyCount: keys.length,
            });
            return true;
        } catch (error) {
            logError("Cache batch DEL failed", error, {
                requestId: ctx?.requestId,
                keyCount: keys.length,
            });
            return false;
        }
    }

    /**
     * Reset circuit breaker (for testing/admin purposes)
     */
    resetCircuitBreaker(): void {
        this.circuitState = "closed";
        this.failureCount = 0;
        this.successCount = 0;
        this.halfOpenAttempts = 0;
        this.lastFailureTime = 0;
        logInfo("Cache circuit breaker manually reset");
    }
}

// Global singleton instance
const globalForCache = globalThis as unknown as {
    __cacheService?: CacheService;
};

export function getCacheService(): CacheService {
    if (!globalForCache.__cacheService) {
        globalForCache.__cacheService = new CacheService();
    }
    return globalForCache.__cacheService;
}

// Convenience exports for common operations
export const cacheService = {
    get isAvailable() {
        return getCacheService().isAvailable();
    },

    get circuitStatus() {
        return getCacheService().getCircuitStatus();
    },

    get<T>(key: string) {
        return getCacheService().get<T>(key);
    },

    set<T>(key: string, value: T, ttlSeconds?: number) {
        return getCacheService().set(key, value, ttlSeconds);
    },

    del(key: string) {
        return getCacheService().del(key);
    },

    eval(script: string, keys: string[], args: string[]) {
        return getCacheService().eval(script, keys, args);
    },

    zadd(key: string, score: number, member: string) {
        return getCacheService().zadd(key, score, member);
    },

    zrange<T>(
        key: string,
        start: number,
        stop: number,
        options?: { rev?: boolean }
    ) {
        return getCacheService().zrange<T>(key, start, stop, options);
    },

    zrem(key: string, member: string) {
        return getCacheService().zrem(key, member);
    },

    expire(key: string, seconds: number) {
        return getCacheService().expire(key, seconds);
    },

    batchGet<T>(keys: string[]) {
        return getCacheService().batchGet<T>(keys);
    },

    batchSet<T>(items: Array<{ key: string; value: T; ttl?: number }>) {
        return getCacheService().batchSet(items);
    },

    batchDel(keys: string[]) {
        return getCacheService().batchDel(keys);
    },

    resetCircuitBreaker() {
        return getCacheService().resetCircuitBreaker();
    },
};

export type { CircuitState };
