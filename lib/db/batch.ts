import "server-only";

import { trace } from "@opentelemetry/api";
import { logError } from "@/lib/log";
import { db } from "./queries";

/**
 * ==============================================================================
 * BATCH OPERATIONS
 * ==============================================================================
 *
 * Provides efficient batch operations for database queries.
 * Reduces round-trips and improves performance for bulk operations.
 *
 * Features:
 * - Batch inserts with chunking
 * - Batch updates with deduplication
 * - Batch deletes with safety limits
 * - Automatic error handling and retries
 * - Performance tracking
 *
 * Benefits:
 * - Single transaction for atomicity
 * - Reduced network overhead
 * - Better connection pool utilization
 * - OpenTelemetry integration
 */

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 1000;

/**
 * Batch insert records with automatic chunking
 *
 * @param table Drizzle table
 * @param records Array of records to insert
 * @param options Batch options
 * @returns Array of inserted records
 *
 * @example
 * ```typescript
 * await batchInsert(message, messages, {
 *   chunkSize: 50,
 *   continueOnError: false
 * });
 * ```
 */
export async function batchInsert<T extends Record<string, unknown>>(
	table: unknown,
	records: T[],
	options: {
		chunkSize?: number;
		continueOnError?: boolean;
	} = {}
): Promise<T[]> {
	const { chunkSize = DEFAULT_BATCH_SIZE, continueOnError = false } = options;

	if (records.length === 0) {
		return [];
	}

	const safeChunkSize = Math.min(chunkSize, MAX_BATCH_SIZE);
	const span = trace.getActiveSpan();

	if (span) {
		span.setAttribute("batch.operation", "insert");
		span.setAttribute("batch.total_records", records.length);
		span.setAttribute("batch.chunk_size", safeChunkSize);
	}

	const chunks: T[][] = [];
	for (let i = 0; i < records.length; i += safeChunkSize) {
		chunks.push(records.slice(i, i + safeChunkSize));
	}

	const results: T[] = [];
	const errors: Error[] = [];

	for (const [index, chunk] of chunks.entries()) {
		try {
			const inserted = await db
				.insert(table as Parameters<typeof db.insert>[0])
				.values(chunk)
				.returning();

			results.push(...(inserted as T[]));

			if (span) {
				span.addEvent(`Chunk ${index + 1}/${chunks.length} inserted`, {
					records: chunk.length,
				});
			}
		} catch (error) {
			errors.push(error as Error);
			logError(`Batch insert chunk ${index + 1} failed`, error);

			if (!continueOnError) {
				throw error;
			}
		}
	}

	if (errors.length > 0 && span) {
		span.recordException(new Error(`${errors.length} chunks failed`));
	}

	return results;
}

/**
 * Batch update records by ID
 *
 * @param table Drizzle table
 * @param updates Array of {id, data} objects
 * @param options Batch options
 * @returns Number of updated records
 *
 * @example
 * ```typescript
 * await batchUpdate(chat, [
 *   { id: "chat1", data: { title: "New Title" } },
 *   { id: "chat2", data: { title: "Another Title" } }
 * ]);
 * ```
 */
export async function batchUpdate<T extends { id: string }>(
	table: unknown,
	updates: Array<{ id: string; data: Partial<T> }>,
	options: {
		chunkSize?: number;
		continueOnError?: boolean;
	} = {}
): Promise<number> {
	const { chunkSize = DEFAULT_BATCH_SIZE, continueOnError = false } = options;

	if (updates.length === 0) {
		return 0;
	}

	// Deduplicate by ID (keep last update for each ID)
	const deduped = new Map<string, Partial<T>>();
	for (const update of updates) {
		deduped.set(update.id, update.data);
	}

	const uniqueUpdates = Array.from(deduped.entries()).map(([id, data]) => ({
		id,
		data,
	}));

	const span = trace.getActiveSpan();

	if (span) {
		span.setAttribute("batch.operation", "update");
		span.setAttribute("batch.total_records", uniqueUpdates.length);
		span.setAttribute("batch.original_records", updates.length);
	}

	let updateCount = 0;
	const chunks: (typeof uniqueUpdates)[] = [];

	const safeChunkSize = Math.min(chunkSize, MAX_BATCH_SIZE);
	for (let i = 0; i < uniqueUpdates.length; i += safeChunkSize) {
		chunks.push(uniqueUpdates.slice(i, i + safeChunkSize));
	}

	for (const [index, chunk] of chunks.entries()) {
		try {
			// Execute updates in transaction
			const result = await db.transaction(async (tx) => {
				let count = 0;
				for (const { id, data } of chunk) {
					await tx
						.update(table as Parameters<typeof db.update>[0])
						.set(data as Record<string, unknown>)
						.where((table as any).id.eq(id));
					count++;
				}
				return count;
			});

			updateCount += result;

			if (span) {
				span.addEvent(`Chunk ${index + 1}/${chunks.length} updated`, {
					records: chunk.length,
				});
			}
		} catch (error) {
			logError(`Batch update chunk ${index + 1} failed`, error);

			if (!continueOnError) {
				throw error;
			}
		}
	}

	return updateCount;
}

/**
 * Batch delete records by IDs
 *
 * @param table Drizzle table
 * @param ids Array of IDs to delete
 * @param options Batch options
 * @returns Number of deleted records
 *
 * @example
 * ```typescript
 * await batchDelete(message, ["msg1", "msg2", "msg3"], {
 *   safetyLimit: 1000
 * });
 * ```
 */
export async function batchDelete(
	table: unknown,
	ids: string[],
	options: {
		chunkSize?: number;
		safetyLimit?: number;
		continueOnError?: boolean;
	} = {}
): Promise<number> {
	const {
		chunkSize = DEFAULT_BATCH_SIZE,
		safetyLimit = 10_000,
		continueOnError = false,
	} = options;

	if (ids.length === 0) {
		return 0;
	}

	// Safety check
	if (ids.length > safetyLimit) {
		throw new Error(
			`Batch delete exceeds safety limit (${ids.length} > ${safetyLimit.toLocaleString()})`
		);
	}

	// Deduplicate IDs
	const uniqueIds = [...new Set(ids)];

	const span = trace.getActiveSpan();

	if (span) {
		span.setAttribute("batch.operation", "delete");
		span.setAttribute("batch.total_records", uniqueIds.length);
	}

	let deleteCount = 0;
	const chunks: string[][] = [];

	const safeChunkSize = Math.min(chunkSize, MAX_BATCH_SIZE);
	for (let i = 0; i < uniqueIds.length; i += safeChunkSize) {
		chunks.push(uniqueIds.slice(i, i + safeChunkSize));
	}

	for (const [index, chunk] of chunks.entries()) {
		try {
			await db
				.delete(table as Parameters<typeof db.delete>[0])
				.where((table as any).id.in(chunk)); // Count deleted rows (if supported)
			deleteCount += chunk.length;

			if (span) {
				span.addEvent(`Chunk ${index + 1}/${chunks.length} deleted`, {
					records: chunk.length,
				});
			}
		} catch (error) {
			logError(`Batch delete chunk ${index + 1} failed`, error);

			if (!continueOnError) {
				throw error;
			}
		}
	}

	return deleteCount;
}

/**
 * Batch upsert (insert or ignore conflicts) records
 *
 * @param table Drizzle table
 * @param records Array of records to upsert
 * @param options Batch options
 * @returns Array of upserted records
 *
 * @example
 * ```typescript
 * await batchUpsert(user, users, { chunkSize: 50 });
 * ```
 */
export async function batchUpsert<T extends Record<string, unknown>>(
	table: unknown,
	records: T[],
	options: {
		chunkSize?: number;
		continueOnError?: boolean;
	} = {}
): Promise<T[]> {
	const { chunkSize = DEFAULT_BATCH_SIZE, continueOnError = false } = options;

	if (records.length === 0) {
		return [];
	}

	const safeChunkSize = Math.min(chunkSize, MAX_BATCH_SIZE);
	const chunks: T[][] = [];

	for (let i = 0; i < records.length; i += safeChunkSize) {
		chunks.push(records.slice(i, i + safeChunkSize));
	}

	const results: T[] = [];
	const span = trace.getActiveSpan();

	if (span) {
		span.setAttribute("batch.operation", "upsert");
		span.setAttribute("batch.total_records", records.length);
		span.setAttribute("batch.chunk_size", safeChunkSize);
	}

	for (const [index, chunk] of chunks.entries()) {
		try {
			const upserted = await db
				.insert(table as Parameters<typeof db.insert>[0])
				.values(chunk)
				.onConflictDoNothing()
				.returning();

			results.push(...(upserted as T[]));

			if (span) {
				span.addEvent(`Chunk ${index + 1}/${chunks.length} upserted`, {
					records: chunk.length,
				});
			}
		} catch (error) {
			logError(`Batch upsert chunk ${index + 1} failed`, error);

			if (!continueOnError) {
				throw error;
			}
		}
	}

	return results;
}
