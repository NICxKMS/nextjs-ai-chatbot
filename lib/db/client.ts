/**
 * Database Client
 * @module @/lib/db/client
 *
 * PostgreSQL client with Drizzle ORM.
 * Configures connection pooling per environment.
 */
import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import * as schema from "./schema";

// Environment-specific pool configuration
function getPoolConfig() {
	const isVercel = process.env.VERCEL === "1";
	const isProd = process.env.NODE_ENV === "production";

	if (isVercel) {
		return {
			max: 10,
			idle_timeout: 20,
			connect_timeout: 30,
			prepare: false, // Required for serverless
		};
	}

	if (isProd) {
		return {
			max: 20,
			idle_timeout: 30,
			connect_timeout: 30,
		};
	}

	// Development
	return {
		max: 5,
		idle_timeout: 60,
	};
}

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is required");
}

// Create postgres client with pooling
const client: Sql = postgres(process.env.DATABASE_URL, getPoolConfig());

// Create Drizzle instance
export const db: PostgresJsDatabase<typeof schema> = drizzle(client, {
	schema,
});

// Export for type safety
export type Database = typeof db;
