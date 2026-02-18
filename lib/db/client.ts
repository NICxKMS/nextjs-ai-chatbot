/**
 * Database Client
 *
 * Drizzle ORM client configured for PostgreSQL with connection pooling
 * optimized for serverless environments. Includes logging integration
 * and error handling.
 *
 * @module lib/db/client
 */

import { trace } from "@opentelemetry/api"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { toDatabaseError } from "@/lib/errors/database"
import { logDebug, logError, logInfo, logWarn } from "@/lib/log"

import * as schema from "./schema"

// =============================================================================
// Environment Validation
// =============================================================================

/**
 * Validates that the DATABASE_URL environment variable is set
 */
function getDatabaseUrl(): string {
	const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL

	if (!url) {
		logError("DATABASE_URL or POSTGRES_URL environment variable is not set")
		throw new Error(
			"DATABASE_URL or POSTGRES_URL environment variable is not set",
		)
	}

	return url
}

// =============================================================================
// Connection Pool Configuration
// =============================================================================

/**
 * Environment-aware PostgreSQL pool configuration
 * Optimizes connection pooling based on deployment environment
 */
function getPoolConfig() {
	const isVercelFluid = process.env.VERCEL_FLUID === "1"
	const isProduction = process.env.NODE_ENV === "production"

	if (isVercelFluid) {
		// Vercel Fluid Compute: optimize for rapid scaling
		logDebug("Database pool configured for Vercel Fluid Compute", {
			max: 5,
			idle_timeout: 10,
		})
		return { max: 5, idle_timeout: 10 }
	}

	if (isProduction) {
		// Traditional serverless: moderate pooling
		logDebug("Database pool configured for production serverless", {
			max: 10,
			idle_timeout: 20,
		})
		return { max: 10, idle_timeout: 20 }
	}

	// Development: minimal pooling
	logDebug("Database pool configured for development", {
		max: 3,
		idle_timeout: 30,
	})
	return { max: 3, idle_timeout: 30 }
}

// =============================================================================
// Database Connection
// =============================================================================

const databaseUrl = getDatabaseUrl()
const poolConfig = getPoolConfig()

/**
 * PostgreSQL connection pool client
 * Configured with prepare: false for better serverless compatibility
 */
const pool = postgres(databaseUrl, {
	...poolConfig,
	connect_timeout: 10,
	prepare: false, // Better for serverless environments
	onnotice: (notice) => {
		// Log PostgreSQL notices at debug level
		logDebug(`PostgreSQL notice: ${notice.message}`, {
			code: notice.code,
			severity: notice.severity,
		})
	},
})

/**
 * Drizzle ORM database client
 * Typed database client with all schema tables
 *
 * @example
 * ```typescript
 * import { db } from '@/lib/db/client';
 * import { chats } from '@/lib/db/schema';
 * import { eq } from 'drizzle-orm';
 *
 * const chat = await db.select().from(chats).where(eq(chats.id, id));
 * ```
 */
export const db = drizzle(pool, { schema })

// =============================================================================
// Connection Health Check
// =============================================================================

/**
 * Check database connection health
 * Useful for health check endpoints and startup validation
 *
 * @returns Promise<boolean> - true if connection is healthy
 *
 * @example
 * ```typescript
 * import { isHealthy } from '@/lib/db/client';
 *
 * if (await isHealthy()) {
 *   console.log('Database connection is healthy');
 * }
 * ```
 */
export async function isHealthy(): Promise<boolean> {
	try {
		await pool`SELECT 1`
		logDebug("Database health check passed")
		return true
	} catch (error) {
		logError("Database health check failed", error as Error)
		return false
	}
}

// =============================================================================
// Connection Cleanup
// =============================================================================

/**
 * Close the database connection pool
 * Should be called during graceful shutdown
 *
 * @example
 * ```typescript
 * import { closeConnection } from '@/lib/db/client';
 *
 * process.on('SIGTERM', async () => {
 *   await closeConnection();
 * });
 * ```
 */
export async function closeConnection(): Promise<void> {
	try {
		await pool.end()
		logInfo("Database connection pool closed")
	} catch (error) {
		logError("Failed to close database connection pool", error as Error)
		throw error
	}
}

// =============================================================================
// Transaction Helper
// =============================================================================

/** Threshold for slow transaction warnings (ms) */
const SLOW_TRANSACTION_THRESHOLD = 500

/**
 * Execute a function within a database transaction
 *
 * Provides automatic rollback on errors, OpenTelemetry integration,
 * performance tracking, and proper error handling.
 *
 * @param fn - Function to execute within the transaction
 * @param operation - Optional operation name for logging/tracing
 * @returns The result of the function
 * @throws DatabaseError on transaction failure
 *
 * @example
 * ```typescript
 * import { withTransaction, db } from '@/lib/db/client';
 * import { chats, messages } from '@/lib/db/schema';
 *
 * const result = await withTransaction(async (tx) => {
 *   const [chat] = await tx.insert(chats).values({ title: 'New Chat' }).returning();
 *   await tx.insert(messages).values({ chatId: chat.id, content: 'Hello' });
 *   return chat;
 * }, 'create_chat_with_message');
 * ```
 */
export async function withTransaction<T>(
	fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
	operation = "database_transaction",
): Promise<T> {
	const start = performance.now()
	const span = trace.getActiveSpan()

	if (span) {
		span.setAttribute("db.transaction", true)
		span.setAttribute("db.operation", operation)
	}

	try {
		const result = await db.transaction(fn)

		const duration = performance.now() - start

		if (span) {
			span.setAttribute("db.transaction.duration_ms", duration)
			span.setAttribute("db.transaction.success", true)
		}

		if (duration > SLOW_TRANSACTION_THRESHOLD) {
			logWarn(`Slow transaction: ${operation}`, { duration })
		}

		logDebug(`Transaction completed: ${operation}`, { duration })

		return result
	} catch (error) {
		const duration = performance.now() - start

		if (span) {
			span.setAttribute("db.transaction.duration_ms", duration)
			span.setAttribute("db.transaction.success", false)
			span.recordException(error as Error)
		}

		// Transaction automatically rolled back by Drizzle
		throw toDatabaseError(
			operation,
			error,
			`Transaction failed: ${operation}`,
		)
	}
}

// =============================================================================
// Sequential Transactions Helper
// =============================================================================

/**
 * Execute multiple transactions in sequence
 *
 * Unlike Promise.all, this ensures transactions run one at a time
 * to avoid potential conflicts.
 *
 * @param operations - Array of transaction operations with names
 * @returns Array of results from each transaction
 *
 * @example
 * ```typescript
 * const results = await withSequentialTransactions([
 *   { name: 'create_user', fn: async (tx) => { ... } },
 *   { name: 'create_profile', fn: async (tx) => { ... } }
 * ]);
 * ```
 */
export async function withSequentialTransactions<T>(
	operations: Array<{
		name: string
		fn: (
			tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
		) => Promise<T>
	}>,
): Promise<T[]> {
	const results: T[] = []

	for (const { name, fn } of operations) {
		const result = await withTransaction<T>(fn, name)
		results.push(result)
	}

	return results
}
