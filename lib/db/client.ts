import "server-only"

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is not set")
}

// ── Pool configuration ─────────────────────────────────────────
// Session mode PgBouncer limits total clients to pool_size,
// so keep max low — especially in dev where HMR and the 'use cache'
// environment can spawn multiple module evaluations.

function getPoolConfig() {
	const isProduction = process.env.NODE_ENV === "production"
	const isVercelFluid = process.env.VERCEL_FLUID === "1"

	if (isVercelFluid) {
		// Vercel Fluid Compute: optimize for rapid scaling
		return { max: 5, idle_timeout: 10 }
	}
	if (isProduction) {
		return { max: 10, idle_timeout: 20 }
	}
	// Development: minimal pooling to avoid exhausting Supabase connection limits
	return { max: 3, idle_timeout: 30 }
}

// ── Singleton client ───────────────────────────────────────────
// Prevents connection leaks during HMR: reuse the same postgres
// client across hot-reloads instead of creating a new pool each time.

const globalForDb = globalThis as unknown as {
	pgClient: ReturnType<typeof postgres> | undefined
}

const poolConfig = getPoolConfig()

const client =
	globalForDb.pgClient ??
	postgres(process.env.DATABASE_URL, {
		...poolConfig,
		connect_timeout: 10,
		prepare: false, // Required for PgBouncer transaction mode; safe in session mode
	})

if (process.env.NODE_ENV !== "production") {
	globalForDb.pgClient = client
}

export const db = drizzle(client, { schema })
