/**
 * Database Client
 * Ref: 03-data-layer-optimal-design.md §4
 *
 * Uses postgres (porsager/postgres) driver with Drizzle ORM
 * Supabase PostgreSQL compatible
 */
import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Get pool configuration based on environment
 */
function getPoolConfig() {
    const isProd = process.env.NODE_ENV === "production";
    const isVercel = process.env.VERCEL === "1";

    if (isVercel) {
        return {
            max: 5,
            idle_timeout: 10,
            connect_timeout: 10,
            prepare: false, // Required for serverless
        };
    }
    if (isProd) {
        return {
            max: 10,
            idle_timeout: 20,
            connect_timeout: 10,
            prepare: false,
        };
    }
    // Development - increased pool for load testing capability
    // max: 10 handles concurrent test requests without pool exhaustion
    // connect_timeout: 10s fails faster to avoid long waits under load
    return {
        max: 10,
        idle_timeout: 30,
        connect_timeout: 10,
        prepare: false,
    };
}

// Create postgres client
const client = postgres(process.env.DATABASE_URL!, getPoolConfig());

// Create drizzle instance
const db = drizzle(client, { schema });

/**
 * Get database client
 */
export function getDb() {
    return db;
}

/**
 * Get database client for transactions
 * Note: postgres-js supports transactions natively
 */
export function getPoolDb() {
    return db;
}

// Re-export schema for convenience
export { schema };

// Type for database instance
export type Database = typeof db;
export type PoolDatabase = typeof db;
