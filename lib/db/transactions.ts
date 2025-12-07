import "server-only";

import { trace } from "@opentelemetry/api";
import { toDatabaseError } from "../errors";
import { logInfo, logWarn } from "../log";
import { db } from "./queries";

/**
 * ==============================================================================
 * DATABASE TRANSACTION WRAPPER
 * ==============================================================================
 *
 * Provides a safe wrapper for database transactions with:
 * - Automatic rollback on errors
 * - OpenTelemetry integration
 * - Performance tracking
 * - Proper error handling
 *
 * Usage:
 * ```typescript
 * const result = await withTransaction(async (tx) => {
 *     const [chat] = await tx.insert(chat).values({...}).returning();
 *     await tx.insert(message).values(messages);
 *     return chat;
 * });
 * ```
 */

/**
 * Execute a database transaction with automatic rollback on errors
 *
 * @param fn Transaction callback function
 * @param operation Optional operation name for logging/tracing
 * @returns Transaction result
 * @throws ChatSDKError on transaction failure
 */
export async function withTransaction<T>(
	fn: Parameters<typeof db.transaction>[0],
	operation = "database_transaction"
): Promise<T> {
	const start = performance.now();
	const span = trace.getActiveSpan();

	if (span) {
		span.setAttribute("db.transaction", true);
		span.setAttribute("db.operation", operation);
	}

	try {
		const result = await db.transaction(fn);

		const duration = performance.now() - start;

		if (span) {
			span.setAttribute("db.transaction.duration_ms", duration);
			span.setAttribute("db.transaction.success", true);
		}

		if (duration > 500) {
			logWarn(`Slow transaction: ${operation}`, { duration });
		}

		logInfo(`Transaction completed: ${operation}`, { duration });

		return result as T;
	} catch (error) {
		const duration = performance.now() - start;

		if (span) {
			span.setAttribute("db.transaction.duration_ms", duration);
			span.setAttribute("db.transaction.success", false);
			span.recordException(error as Error);
		}

		// Transaction automatically rolled back by Drizzle
		throw toDatabaseError(
			"transaction_failed",
			error,
			`Transaction failed: ${operation}`
		);
	}
}

/**
 * Execute multiple transactions in sequence
 *
 * Unlike Promise.all, this ensures transactions run one at a time
 * to avoid potential conflicts.
 *
 * @param operations Array of transaction operations
 * @returns Array of results
 */
export async function withSequentialTransactions<T>(
	operations: Array<{
		name: string;
		fn: Parameters<typeof db.transaction>[0];
	}>
): Promise<T[]> {
	const results: T[] = [];

	for (const { name, fn } of operations) {
		const result = await withTransaction<T>(fn, name);
		results.push(result);
	}

	return results;
}
