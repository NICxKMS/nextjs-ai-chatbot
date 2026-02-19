/**
 * Data Layer Batch Operations Adapter
 *
 * Compatibility adapter that exposes batch utilities under `lib/data/*`
 * while delegating execution to the canonical `lib/db/batch` implementation.
 *
 * @module lib/data/batch
 */

import "server-only"

import {
	type BatchDeleteOptions,
	type BatchInsertOptions,
	type BatchUpdateOptions,
	batchDelete as dbBatchDelete,
	batchInsert as dbBatchInsert,
	batchUpdate as dbBatchUpdate,
} from "@/lib/db/batch"

/**
 * Progress information for long-running batch operations.
 */
export interface BatchProgress {
	/** Number of records processed so far */
	processed: number
	/** Total number of records requested */
	total: number
	/** Current chunk index (1-based) */
	chunk: number
	/** Number of records in the processed chunk */
	chunkSize: number
}

/**
 * Shared options for data-layer batch adapters.
 */
export interface DataBatchOptions {
	/** Chunk size per DB round-trip */
	chunkSize?: number
	/** Continue processing remaining chunks after a chunk failure */
	continueOnError?: boolean
	/** Progress callback invoked after each successful chunk */
	onProgress?: (progress: BatchProgress) => void
}

function splitIntoChunks<T>(items: T[], chunkSize: number): T[][] {
	if (items.length === 0) {
		return []
	}

	const chunks: T[][] = []
	for (let i = 0; i < items.length; i += chunkSize) {
		chunks.push(items.slice(i, i + chunkSize))
	}
	return chunks
}

/**
 * Chunked batch insert with optional progress callback.
 */
export async function batchInsert<T extends Record<string, unknown>>(
	table: Parameters<typeof dbBatchInsert>[0],
	items: T[],
	options: DataBatchOptions = {},
): Promise<T[]> {
	const { chunkSize = 100, continueOnError = false, onProgress } = options

	if (items.length === 0) {
		return []
	}

	const chunks = splitIntoChunks(items, chunkSize)
	const inserted: T[] = []
	let processed = 0

	for (const [index, chunk] of chunks.entries()) {
		const results = await dbBatchInsert(table, chunk, {
			chunkSize: chunk.length,
			continueOnError,
		} satisfies BatchInsertOptions)

		inserted.push(...results)
		processed += chunk.length
		onProgress?.({
			processed,
			total: items.length,
			chunk: index + 1,
			chunkSize: chunk.length,
		})
	}

	return inserted
}

/**
 * Chunked batch update using a key extractor function.
 */
export async function batchUpdate<T extends Record<string, unknown>>(
	table: Parameters<typeof dbBatchUpdate>[0],
	items: T[],
	keyFn: (item: T) => string,
	options: DataBatchOptions = {},
): Promise<number> {
	const { chunkSize = 100, continueOnError = false, onProgress } = options

	if (items.length === 0) {
		return 0
	}

	const chunks = splitIntoChunks(items, chunkSize)
	let processed = 0
	let updated = 0

	for (const [index, chunk] of chunks.entries()) {
		const chunkUpdates = chunk.map((item) => ({
			id: keyFn(item),
			data: item as Partial<{ id: string }>,
		}))

		updated += await dbBatchUpdate(table, chunkUpdates, {
			chunkSize: chunk.length,
			continueOnError,
		} satisfies BatchUpdateOptions)

		processed += chunk.length
		onProgress?.({
			processed,
			total: items.length,
			chunk: index + 1,
			chunkSize: chunk.length,
		})
	}

	return updated
}

/**
 * Chunked batch delete with optional progress callback.
 */
export async function batchDelete(
	table: Parameters<typeof dbBatchDelete>[0],
	ids: string[],
	options: DataBatchOptions & { safetyLimit?: number } = {},
): Promise<number> {
	const {
		chunkSize = 100,
		safetyLimit,
		continueOnError = false,
		onProgress,
	} = options

	if (ids.length === 0) {
		return 0
	}

	const chunks = splitIntoChunks(ids, chunkSize)
	let processed = 0
	let deleted = 0

	for (const [index, chunk] of chunks.entries()) {
		const deleteOptions: BatchDeleteOptions = {
			chunkSize: chunk.length,
			continueOnError,
		}

		if (safetyLimit !== undefined) {
			deleteOptions.safetyLimit = safetyLimit
		}

		deleted += await dbBatchDelete(table, chunk, deleteOptions)

		processed += chunk.length
		onProgress?.({
			processed,
			total: ids.length,
			chunk: index + 1,
			chunkSize: chunk.length,
		})
	}

	return deleted
}
