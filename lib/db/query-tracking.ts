import "server-only";

import type { SQL } from "drizzle-orm";
import { logger } from "@/lib/monitoring/logger";

/**
 * Database query wrapper with automatic performance tracking
 * Logs query execution time and metadata to New Relic
 */
export async function withQueryTracking<T>(
	queryName: string,
	queryFn: () => Promise<T>,
	metadata?: Record<string, unknown>
): Promise<T> {
	const startTime = Date.now();

	try {
		const result = await queryFn();
		const duration = Date.now() - startTime;

		// Log performance metric
		logger.perf(`DB: ${queryName}`, duration, {
			operation: "query",
			...metadata,
		});

		// Warn on slow queries (> 500ms)
		if (duration > 500) {
			logger.warn("Slow database query detected", {
				query: queryName,
				duration,
				...metadata,
			});
		}

		return result;
	} catch (error) {
		const duration = Date.now() - startTime;

		logger.error("Database query failed", {
			query: queryName,
			duration,
			error,
			...metadata,
		});

		throw error;
	}
}

/**
 * Transaction wrapper with automatic performance tracking
 */
export async function withTransactionTracking<T>(
	transactionName: string,
	transactionFn: () => Promise<T>,
	metadata?: Record<string, unknown>
): Promise<T> {
	const startTime = Date.now();

	try {
		const result = await transactionFn();
		const duration = Date.now() - startTime;

		logger.perf(`TX: ${transactionName}`, duration, {
			operation: "transaction",
			...metadata,
		});

		// Warn on slow transactions (> 1s)
		if (duration > 1000) {
			logger.warn("Slow database transaction detected", {
				transaction: transactionName,
				duration,
				...metadata,
			});
		}

		return result;
	} catch (error) {
		const duration = Date.now() - startTime;

		logger.error("Database transaction failed", {
			transaction: transactionName,
			duration,
			error,
			...metadata,
		});

		throw error;
	}
}

const QUERY_REGEX =
	/^(SELECT|INSERT|UPDATE|DELETE).*?(?:FROM|INTO)\s+"?(\w+)"?/i;

/**
 * Helper to extract table name from SQL query
 * Used for automatic query labeling
 */
export function getQueryLabel(sql: SQL | unknown): string {
	if (typeof sql === "object" && sql !== null && "queryChunks" in sql) {
		const chunks = (sql as { queryChunks: unknown[] }).queryChunks;
		const firstChunk = chunks[0];

		if (typeof firstChunk === "string") {
			// Extract operation and table from SQL
			const match = firstChunk.match(QUERY_REGEX);
			if (match) {
				const [, operation, table] = match;
				return `${operation} ${table}`;
			}
		}
	}

	return "unknown query";
}
