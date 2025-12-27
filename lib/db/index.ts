/**
 * Database Module
 * @module @/lib/db
 *
 * Barrel export for database layer.
 */

// Database client
export { type Database, db } from "./client";
// Query functions
export * from "./queries";
// Schema and types
export * from "./schema";
