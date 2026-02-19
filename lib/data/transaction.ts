/**
 * Data Layer Transaction Adapter
 *
 * Compatibility wrapper that exposes transaction helpers under `lib/data/*`
 * while delegating to canonical database transaction utilities.
 *
 * @module lib/data/transaction
 */

import "server-only"

import {
	withSequentialTransactions as dbWithSequentialTransactions,
	withTransaction as dbWithTransaction,
} from "@/lib/db/client"

/**
 * Execute a function within a database transaction.
 */
export async function withTransaction<T>(
	fn: Parameters<typeof dbWithTransaction>[0],
	operation = "data_transaction",
): Promise<T> {
	return dbWithTransaction(fn, operation) as Promise<T>
}

/**
 * Execute multiple transactions sequentially.
 */
export async function withSequentialTransactions<T>(
	operations: Parameters<typeof dbWithSequentialTransactions>[0],
): Promise<T[]> {
	return dbWithSequentialTransactions(operations) as Promise<T[]>
}
