import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error(
        "[Data Layer] DATABASE_URL environment variable is not set"
    );
}

// =============================================================================
// POOL CONFIGURATION
// =============================================================================

type PoolConfig = {
    max: number;
    idle_timeout: number;
    connect_timeout: number;
    prepare: boolean;
};

/**
 * Get PostgreSQL pool configuration based on deployment environment
 *
 * - Vercel Fluid: Optimized for rapid scaling with smaller pools
 * - Production: Moderate pooling for traditional serverless
 * - Development: Minimal pooling with longer idle timeout
 */
function getPoolConfig(): PoolConfig {
    const isVercelFluid = process.env.VERCEL_FLUID === "1";
    const isProduction = process.env.NODE_ENV === "production";

    const baseConfig = {
        connect_timeout: 10,
        prepare: false, // Better for serverless environments
    };

    if (isVercelFluid) {
        return { ...baseConfig, max: 5, idle_timeout: 10 };
    }

    if (isProduction) {
        return { ...baseConfig, max: 10, idle_timeout: 20 };
    }

    // Development
    return { ...baseConfig, max: 3, idle_timeout: 30 };
}

// =============================================================================
// DATABASE CLIENT
// =============================================================================

const poolConfig = getPoolConfig();
const client = postgres(DATABASE_URL, poolConfig);

/**
 * Drizzle database instance
 *
 * Server-only: This module is guarded by "server-only" import
 * and will throw a build error if imported in client code.
 */
export const db: PostgresJsDatabase = drizzle(client);

/**
 * Export the raw postgres client for advanced use cases
 * (e.g., raw SQL queries, transactions)
 */
export const sql = client;

export type Database = typeof db;
