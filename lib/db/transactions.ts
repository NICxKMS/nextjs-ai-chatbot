/**
 * Transaction Wrapper
 * Ref: 03-data-layer-optimal-design.md §5
 *
 * Extracted from OldApp: oldapp/lib/db/transactions.ts
 */
import "server-only";

import { getPoolDb } from "./client";

export type Transaction = Parameters<
    Parameters<ReturnType<typeof getPoolDb>["transaction"]>[0]
>[0];

/**
 * Execute a function within a database transaction
 * Automatically rolls back on error
 */
export async function withTransaction<T>(
    fn: (tx: Transaction) => Promise<T>,
    operation = "transaction"
): Promise<T> {
    const db = getPoolDb();

    try {
        const result = await db.transaction(async (tx) => {
            return fn(tx);
        });
        return result;
    } catch (error) {
        // Log transaction failure
        console.error(`Transaction failed [${operation}]:`, error);
        throw error;
    }
}

/**
 * Execute a function within a transaction, returning null on error
 * Useful for operations where failure is acceptable
 */
export async function withTransactionSafe<T>(
    fn: (tx: Transaction) => Promise<T>,
    operation = "transaction"
): Promise<T | null> {
    try {
        return await withTransaction(fn, operation);
    } catch {
        return null;
    }
}
