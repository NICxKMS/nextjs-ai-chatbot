/**
 * Batch Database Operations
 *
 * Provides efficient batch operations for database queries.
 * Reduces round-trips and improves performance for bulk operations.
 *
 * Features:
 * - Batch inserts with automatic chunking
 * - Batch updates with deduplication
 * - Batch deletes with safety limits
 * - Batch upserts (insert or ignore conflicts)
 * - Automatic error handling
 * - OpenTelemetry integration
 *
 * @module lib/db/batch
 */

import "server-only"

import { trace } from "@opentelemetry/api"
import { eq, inArray } from "drizzle-orm"

import { toDatabaseError } from "@/lib/errors/database"
import { logDebug, logError, logWarn } from "@/lib/log"

import { db } from "./client"

// =============================================================================
// Constants
// =============================================================================

/** Default number of records to process per batch */
const DEFAULT_BATCH_SIZE = 100

/** Maximum allowed batch size to prevent memory issues */
const MAX_BATCH_SIZE = 1000

/** Default safety limit for batch deletes */
const DEFAULT_SAFETY_LIMIT = 10_000

// =============================================================================
// Types
// =============================================================================

/**
 * Options for batch insert operations
 */
export interface BatchInsertOptions {
	/** Number of records per chunk (default: 100, max: 1000) */
	chunkSize?: number
	/** Whether to continue processing if a chunk fails (default: false) */
	continueOnError?: boolean
}

/**
 * Options for batch update operations
 */
export interface BatchUpdateOptions extends BatchInsertOptions {
	// Additional options can be added here
}

/**
 * Options for batch delete operations
 */
export interface BatchDeleteOptions extends BatchInsertOptions {
	/** Maximum number of records that can be deleted in one call (default: 10,000) */
	safetyLimit?: number
}

/**
 * Options for batch upsert operations
 */
export interface BatchUpsertOptions extends BatchInsertOptions {
	// Additional options can be added here
}

/**
 * Result of a batch operation
 */
export interface BatchResult<T> {
	/** Successfully processed records */
	successful: T[]
	/** Number of failed chunks */
	failedChunks: number
	/** Errors encountered during processing */
	errors: Error[]
}

// =============================================================================
// Batch Insert
// =============================================================================

/**
 * Batch insert records with automatic chunking
 *
 * @param table - Drizzle table to insert into
 * @param records - Array of records to insert
 * @param options - Batch operation options
 * @returns Array of inserted records
 * @throws DatabaseError if operation fails and continueOnError is false
 *
 * @example
 * ```typescript
 * import { messages } from '@/lib/db/schema';
 *
 * const inserted = await batchInsert(messages, messageData, {
 *   chunkSize: 50,
 *   continueOnError: false
 * });
 * ```
 */
export async function batchInsert<T extends Record<string, unknown>>(
	table: Parameters<typeof db.insert>[0],
	records: T[],
	options: BatchInsertOptions = {},
): Promise<T[]> {
	const { chunkSize = DEFAULT_BATCH_SIZE, continueOnError = false } = options

	if (records.length === 0) {
		return []
	}

	const safeChunkSize = Math.min(chunkSize, MAX_BATCH_SIZE)
	const span = trace.getActiveSpan()

	if (span) {
		span.setAttribute("batch.operation", "insert")
		span.setAttribute("batch.total_records", records.length)
		span.setAttribute("batch.chunk_size", safeChunkSize)
	}

	// Split records into chunks
	const chunks: T[][] = []
	for (let i = 0; i < records.length; i += safeChunkSize) {
		chunks.push(records.slice(i, i + safeChunkSize))
	}

	const results: T[] = []
	const errors: Error[] = []

	for (const [index, chunk] of chunks.entries()) {
		try {
			const inserted = await db.insert(table).values(chunk).returning()

			results.push(...(inserted as T[]))

			if (span) {
				span.addEvent(`Chunk ${index + 1}/${chunks.length} inserted`, {
					records: chunk.length,
				})
			}

			logDebug(
				`Batch insert chunk ${index + 1}/${chunks.length} completed`,
				{
					records: chunk.length,
				},
			)
		} catch (error) {
			const typedError =
				error instanceof Error ? error : new Error(String(error))
			errors.push(typedError)
			logError(
				`Batch insert chunk ${index + 1}/${chunks.length} failed`,
				typedError,
			)

			if (span) {
				span.addEvent(`Chunk ${index + 1}/${chunks.length} failed`, {
					error: typedError.message,
				})
			}

			if (!continueOnError) {
				throw toDatabaseError(
					"batch_insert_failed",
					error,
					`Batch insert failed at chunk ${index + 1}/${chunks.length}`,
				)
			}
		}
	}

	if (errors.length > 0 && span) {
		span.recordException(new Error(`${errors.length} chunks failed`))
	}

	return results
}

// =============================================================================
// Batch Update
// =============================================================================

/**
 * Batch update records by ID
 *
 * @param table - Drizzle table to update
 * @param updates - Array of {id, data} objects
 * @param options - Batch operation options
 * @returns Number of updated records
 * @throws DatabaseError if operation fails and continueOnError is false
 *
 * @example
 * ```typescript
 * import { chats } from '@/lib/db/schema';
 *
 * const count = await batchUpdate(chats, [
 *   { id: "chat1", data: { title: "New Title" } },
 *   { id: "chat2", data: { title: "Another Title" } }
 * ]);
 * ```
 */
export async function batchUpdate<T extends { id: string }>(
	table: Parameters<typeof db.update>[0],
	updates: Array<{ id: string; data: Partial<T> }>,
	options: BatchUpdateOptions = {},
): Promise<number> {
	const { chunkSize = DEFAULT_BATCH_SIZE, continueOnError = false } = options

	if (updates.length === 0) {
		return 0
	}

	// Deduplicate by ID (keep last update for each ID)
	const deduped = new Map<string, Partial<T>>()
	for (const update of updates) {
		deduped.set(update.id, update.data)
	}

	const uniqueUpdates = Array.from(deduped.entries()).map(([id, data]) => ({
		id,
		data,
	}))

	const span = trace.getActiveSpan()

	if (span) {
		span.setAttribute("batch.operation", "update")
		span.setAttribute("batch.total_records", uniqueUpdates.length)
		span.setAttribute("batch.original_records", updates.length)
	}

	const safeChunkSize = Math.min(chunkSize, MAX_BATCH_SIZE)
	const chunks: (typeof uniqueUpdates)[] = []

	for (let i = 0; i < uniqueUpdates.length; i += safeChunkSize) {
		chunks.push(uniqueUpdates.slice(i, i + safeChunkSize))
	}

	let updateCount = 0

	for (const [index, chunk] of chunks.entries()) {
		try {
			// Execute updates in transaction
			const result = await db.transaction(async (tx) => {
				let count = 0
				for (const { id, data } of chunk) {
					// Cast table to access id column
					const tableRef = table as Parameters<
						typeof tx.update
					>[0] & {
						id: unknown
					}
					await tx
						.update(tableRef)
						.set(data as Record<string, unknown>)
						.where(eq(tableRef.id as Parameters<typeof eq>[0], id))
					count++
				}
				return count
			})

			updateCount += result

			if (span) {
				span.addEvent(`Chunk ${index + 1}/${chunks.length} updated`, {
					records: chunk.length,
				})
			}

			logDebug(
				`Batch update chunk ${index + 1}/${chunks.length} completed`,
				{
					records: chunk.length,
				},
			)
		} catch (error) {
			const typedError =
				error instanceof Error ? error : new Error(String(error))
			logError(
				`Batch update chunk ${index + 1}/${chunks.length} failed`,
				typedError,
			)

			if (span) {
				span.addEvent(`Chunk ${index + 1}/${chunks.length} failed`, {
					error: typedError.message,
				})
			}

			if (!continueOnError) {
				throw toDatabaseError(
					"batch_update_failed",
					error,
					`Batch update failed at chunk ${index + 1}/${chunks.length}`,
				)
			}
		}
	}

	return updateCount
}

// =============================================================================
// Batch Delete
// =============================================================================

/**
 * Batch delete records by IDs
 *
 * @param table - Drizzle table to delete from
 * @param ids - Array of IDs to delete
 * @param options - Batch operation options
 * @returns Number of deleted records
 * @throws DatabaseError if operation fails and continueOnError is false
 * @throws Error if safety limit is exceeded
 *
 * @example
 * ```typescript
 * import { messages } from '@/lib/db/schema';
 *
 * const count = await batchDelete(messages, ["msg1", "msg2", "msg3"], {
 *   safetyLimit: 1000
 * });
 * ```
 */
export async function batchDelete(
	table: Parameters<typeof db.delete>[0],
	ids: string[],
	options: BatchDeleteOptions = {},
): Promise<number> {
	const {
		chunkSize = DEFAULT_BATCH_SIZE,
		safetyLimit = DEFAULT_SAFETY_LIMIT,
		continueOnError = false,
	} = options

	if (ids.length === 0) {
		return 0
	}

	// Safety check
	if (ids.length > safetyLimit) {
		throw new Error(
			`Batch delete exceeds safety limit (${ids.length} > ${safetyLimit.toLocaleString()})`,
		)
	}

	// Deduplicate IDs
	const uniqueIds = [...new Set(ids)]

	const span = trace.getActiveSpan()

	if (span) {
		span.setAttribute("batch.operation", "delete")
		span.setAttribute("batch.total_records", uniqueIds.length)
	}

	const safeChunkSize = Math.min(chunkSize, MAX_BATCH_SIZE)
	const chunks: string[][] = []

	for (let i = 0; i < uniqueIds.length; i += safeChunkSize) {
		chunks.push(uniqueIds.slice(i, i + safeChunkSize))
	}

	let deleteCount = 0

	for (const [index, chunk] of chunks.entries()) {
		try {
			// Cast table to access id column
			const tableRef = table as Parameters<typeof db.delete>[0] & {
				id: unknown
			}
			await db
				.delete(tableRef)
				.where(
					inArray(
						tableRef.id as Parameters<typeof inArray>[0],
						chunk,
					),
				)

			deleteCount += chunk.length

			if (span) {
				span.addEvent(`Chunk ${index + 1}/${chunks.length} deleted`, {
					records: chunk.length,
				})
			}

			logDebug(
				`Batch delete chunk ${index + 1}/${chunks.length} completed`,
				{
					records: chunk.length,
				},
			)
		} catch (error) {
			const typedError =
				error instanceof Error ? error : new Error(String(error))
			logError(
				`Batch delete chunk ${index + 1}/${chunks.length} failed`,
				typedError,
			)

			if (span) {
				span.addEvent(`Chunk ${index + 1}/${chunks.length} failed`, {
					error: typedError.message,
				})
			}

			if (!continueOnError) {
				throw toDatabaseError(
					"batch_delete_failed",
					error,
					`Batch delete failed at chunk ${index + 1}/${chunks.length}`,
				)
			}
		}
	}

	return deleteCount
}

// =============================================================================
// Batch Upsert
// =============================================================================

/**
 * Batch upsert (insert or ignore conflicts) records
 *
 * @param table - Drizzle table to upsert into
 * @param records - Array of records to upsert
 * @param options - Batch operation options
 * @returns Array of upserted records
 * @throws DatabaseError if operation fails and continueOnError is false
 *
 * @example
 * ```typescript
 * import { users } from '@/lib/db/schema';
 *
 * const upserted = await batchUpsert(users, userData, { chunkSize: 50 });
 * ```
 */
export async function batchUpsert<T extends Record<string, unknown>>(
	table: Parameters<typeof db.insert>[0],
	records: T[],
	options: BatchUpsertOptions = {},
): Promise<T[]> {
	const { chunkSize = DEFAULT_BATCH_SIZE, continueOnError = false } = options

	if (records.length === 0) {
		return []
	}

	const safeChunkSize = Math.min(chunkSize, MAX_BATCH_SIZE)
	const chunks: T[][] = []

	for (let i = 0; i < records.length; i += safeChunkSize) {
		chunks.push(records.slice(i, i + safeChunkSize))
	}

	const results: T[] = []
	const span = trace.getActiveSpan()

	if (span) {
		span.setAttribute("batch.operation", "upsert")
		span.setAttribute("batch.total_records", records.length)
		span.setAttribute("batch.chunk_size", safeChunkSize)
	}

	for (const [index, chunk] of chunks.entries()) {
		try {
			const upserted = await db
				.insert(table)
				.values(chunk)
				.onConflictDoNothing()
				.returning()

			results.push(...(upserted as T[]))

			if (span) {
				span.addEvent(`Chunk ${index + 1}/${chunks.length} upserted`, {
					records: chunk.length,
				})
			}

			logDebug(
				`Batch upsert chunk ${index + 1}/${chunks.length} completed`,
				{
					records: chunk.length,
				},
			)
		} catch (error) {
			const typedError =
				error instanceof Error ? error : new Error(String(error))
			logError(
				`Batch upsert chunk ${index + 1}/${chunks.length} failed`,
				typedError,
			)

			if (span) {
				span.addEvent(`Chunk ${index + 1}/${chunks.length} failed`, {
					error: typedError.message,
				})
			}

			if (!continueOnError) {
				throw toDatabaseError(
					"batch_upsert_failed",
					error,
					`Batch upsert failed at chunk ${index + 1}/${chunks.length}`,
				)
			}
		}
	}

	return results
}

// =============================================================================
// Batch Operation with Result
// =============================================================================

/**
 * Execute a batch operation and return detailed results
 *
 * This is useful when you need to know which records succeeded and which failed,
 * rather than just getting the successful records.
 *
 * @param table - Drizzle table
 * @param records - Array of records to process
 * @param operation - Operation type: 'insert', 'upsert'
 * @param options - Batch operation options
 * @returns Detailed batch result with successes and failures
 *
 * @example
 * ```typescript
 * const result = await batchWithResult(messages, messageData, 'insert', {
 *   continueOnError: true
 * });
 *
 * console.log(`Inserted ${result.successful.length} records`);
 * console.log(`Failed ${result.failedChunks} chunks`);
 * ```
 */
export async function batchWithResult<T extends Record<string, unknown>>(
	table: Parameters<typeof db.insert>[0],
	records: T[],
	operation: "insert" | "upsert",
	options: BatchInsertOptions = {},
): Promise<BatchResult<T>> {
	const { chunkSize = DEFAULT_BATCH_SIZE } = options

	if (records.length === 0) {
		return {
			successful: [],
			failedChunks: 0,
			errors: [],
		}
	}

	const safeChunkSize = Math.min(chunkSize, MAX_BATCH_SIZE)
	const chunks: T[][] = []

	for (let i = 0; i < records.length; i += safeChunkSize) {
		chunks.push(records.slice(i, i + safeChunkSize))
	}

	const results: T[] = []
	const errors: Error[] = []
	let failedChunks = 0

	for (const [index, chunk] of chunks.entries()) {
		try {
			let inserted: T[]

			if (operation === "upsert") {
				inserted = (await db
					.insert(table)
					.values(chunk)
					.onConflictDoNothing()
					.returning()) as T[]
			} else {
				inserted = (await db
					.insert(table)
					.values(chunk)
					.returning()) as T[]
			}

			results.push(...inserted)

			logDebug(
				`Batch ${operation} chunk ${index + 1}/${chunks.length} completed`,
				{
					records: chunk.length,
				},
			)
		} catch (error) {
			failedChunks++
			const typedError =
				error instanceof Error ? error : new Error(String(error))
			errors.push(typedError)
			logError(
				`Batch ${operation} chunk ${index + 1}/${chunks.length} failed`,
				typedError,
			)
		}
	}

	if (failedChunks > 0) {
		logWarn(
			`Batch ${operation} completed with ${failedChunks} failed chunks`,
			{
				total: chunks.length,
				failed: failedChunks,
				successful: results.length,
			},
		)
	}

	return {
		successful: results,
		failedChunks,
		errors,
	}
}
