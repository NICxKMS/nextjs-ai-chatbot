import "server-only";

import { logError, logInfo } from "@/lib/log";
import { getRedisClient } from "./redis";

/**
 * ==============================================================================
 * CACHE INVALIDATION
 * ==============================================================================
 *
 * Provides Redis-based cache invalidation for single or distributed deployments.
 * Works seamlessly with single-instance and multi-instance setups.
 *
 * Features:
 * - Pattern-based invalidation (wildcard support)
 * - Event batching to reduce Redis overhead
 * - Local invalidation (single-instance)
 * - Ready for distributed invalidation (multi-instance/serverless)
 *
 * Use cases:
 * - Single-instance deployments (one Vercel region)
 * - Serverless deployments (multiple Lambda/Edge functions)
 * - Cache invalidation after database writes
 *
 * Note: For single-instance setups (one Upstash Redis), this performs
 * local invalidation only. No additional configuration needed.
 */

const INVALIDATION_CHANNEL = "cache:invalidation";
const BATCH_INTERVAL_MS = 100; // Batch invalidations within 100ms window

export type InvalidationEvent = {
	/** Type of invalidation */
	type: "pattern" | "keys" | "namespace" | "all";
	/** Pattern or keys to invalidate */
	target: string | string[];
	/** Source instance ID */
	source: string;
	/** Timestamp */
	timestamp: number;
	/** Optional metadata */
	metadata?: Record<string, unknown>;
};

export type InvalidationStats = {
	localInvalidations: number;
	distributedInvalidations: number;
	eventsReceived: number;
	eventsSent: number;
	lastInvalidation: number | null;
};

class CacheInvalidator {
	private readonly instanceId: string;
	private stats: InvalidationStats = {
		localInvalidations: 0,
		distributedInvalidations: 0,
		eventsReceived: 0,
		eventsSent: 0,
		lastInvalidation: null,
	};
	private batchQueue: InvalidationEvent[] = [];
	private batchTimer: NodeJS.Timeout | null = null;

	constructor() {
		// Generate unique instance ID for tracking (optional metadata)
		this.instanceId = `${process.env.VERCEL_REGION || "local"}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
	}

	/**
	 * Execute the actual cache invalidation
	 */
	private async executeInvalidation(
		event: InvalidationEvent,
		isDistributed: boolean
	) {
		const redis = getRedisClient();
		if (!redis) {
			return;
		}

		try {
			switch (event.type) {
				case "pattern": {
					const pattern = event.target as string;
					const keys = await redis.keys(pattern);
					if (keys.length > 0) {
						await redis.del(...keys);
					}
					break;
				}

				case "keys": {
					const keys = event.target as string[];
					if (keys.length > 0) {
						await redis.del(...keys);
					}
					break;
				}

				case "namespace": {
					const namespace = event.target as string;
					const keys = await redis.keys(`${namespace}:*`);
					if (keys.length > 0) {
						await redis.del(...keys);
					}
					break;
				}

				case "all": {
					await redis.flushdb();
					break;
				}

				default:
					logError(
						`Unknown invalidation event type: ${String((event as InvalidationEvent).type)}`
					);
					break;
			}
			if (isDistributed) {
				this.stats.distributedInvalidations++;
			} else {
				this.stats.localInvalidations++;
			}

			this.stats.lastInvalidation = Date.now();
		} catch (error) {
			logError("Cache invalidation execution failed", error);
			throw error;
		}
	}

	/**
	 * Publish invalidation event to all instances
	 * Note: Since Upstash REST doesn't support pub/sub, this only does local invalidation
	 */
	private async publishInvalidation(event: InvalidationEvent) {
		const redis = getRedisClient();
		if (!redis) {
			return;
		}

		try {
			// Add to batch queue
			this.batchQueue.push(event);

			// Set up batch timer if not already running
			if (!this.batchTimer) {
				this.batchTimer = setTimeout(() => {
					this.flushBatch();
				}, BATCH_INTERVAL_MS);
			}
		} catch (error) {
			logError("Failed to publish invalidation", error);
			// Fallback to local invalidation
			await this.executeInvalidation(event, false);
		}
	}

	/**
	 * Flush batched invalidation events
	 */
	private async flushBatch() {
		if (this.batchQueue.length === 0) {
			return;
		}

		const redis = getRedisClient();
		if (!redis) {
			return;
		}

		const events = [...this.batchQueue];
		this.batchQueue = [];
		this.batchTimer = null;

		try {
			// Execute local invalidations
			await Promise.all(
				events.map((event) => this.executeInvalidation(event, false))
			);

			// Publish to other instances
			for (const event of events) {
				await redis.publish(
					INVALIDATION_CHANNEL,
					JSON.stringify(event)
				);
				this.stats.eventsSent++;
			}

			logInfo(`Flushed ${events.length} invalidation events`);
		} catch (error) {
			logError("Failed to flush invalidation batch", error);
		}
	}

	/**
	 * Invalidate cache by pattern
	 *
	 * @example
	 * ```typescript
	 * await invalidator.invalidateByPattern("user:123:*");
	 * ```
	 */
	async invalidateByPattern(
		pattern: string,
		metadata?: Record<string, unknown>
	) {
		const event: InvalidationEvent = {
			type: "pattern",
			target: pattern,
			source: this.instanceId,
			timestamp: Date.now(),
			metadata,
		};

		await this.publishInvalidation(event);
	}

	/**
	 * Invalidate specific cache keys
	 *
	 * @example
	 * ```typescript
	 * await invalidator.invalidateKeys(["user:123", "chat:456"]);
	 * ```
	 */
	async invalidateKeys(keys: string[], metadata?: Record<string, unknown>) {
		const event: InvalidationEvent = {
			type: "keys",
			target: keys,
			source: this.instanceId,
			timestamp: Date.now(),
			metadata,
		};

		await this.publishInvalidation(event);
	}

	/**
	 * Invalidate entire namespace
	 *
	 * @example
	 * ```typescript
	 * await invalidator.invalidateNamespace("user");
	 * ```
	 */
	async invalidateNamespace(
		namespace: string,
		metadata?: Record<string, unknown>
	) {
		const event: InvalidationEvent = {
			type: "namespace",
			target: namespace,
			source: this.instanceId,
			timestamp: Date.now(),
			metadata,
		};

		await this.publishInvalidation(event);
	}

	/**
	 * Invalidate all cache (use with caution!)
	 */
	async invalidateAll(metadata?: Record<string, unknown>) {
		const event: InvalidationEvent = {
			type: "all",
			target: "*",
			source: this.instanceId,
			timestamp: Date.now(),
			metadata,
		};

		await this.publishInvalidation(event);
	}

	/**
	 * Get invalidation statistics
	 */
	getStats(): InvalidationStats {
		return { ...this.stats };
	}

	/**
	 * Reset statistics
	 */
	resetStats() {
		this.stats = {
			localInvalidations: 0,
			distributedInvalidations: 0,
			eventsReceived: 0,
			eventsSent: 0,
			lastInvalidation: null,
		};
	}

	/**
	 * Cleanup subscription on shutdown
	 */
	async cleanup() {
		if (this.batchTimer) {
			clearTimeout(this.batchTimer);
			await this.flushBatch();
		}
	}
}

// Singleton instance
export const cacheInvalidator = new CacheInvalidator();

/**
 * Helper function to invalidate user-related caches
 */
export async function invalidateUserCaches(userId: string) {
	await cacheInvalidator.invalidateByPattern(`*userId:"${userId}"*`, {
		entity: "user",
		entityId: userId,
	});
}

/**
 * Helper function to invalidate chat-related caches
 */
export async function invalidateChatCaches(chatId: string) {
	await cacheInvalidator.invalidateByPattern(`*chatId:"${chatId}"*`, {
		entity: "chat",
		entityId: chatId,
	});
}

/**
 * Helper function to invalidate document-related caches
 */
export async function invalidateDocumentCaches(documentId: string) {
	await cacheInvalidator.invalidateByPattern(`*documentId:"${documentId}"*`, {
		entity: "document",
		entityId: documentId,
	});
}
