/**
 * Database Integration Tests
 * Tests raw database operations with real PostgreSQL instance
 *
 * Run with: TEST_USE_REAL_DB=true pnpm test:integration
 *
 * @module tests/integration/database/database.integration.test
 */

import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { describeIf, isServiceAvailable } from "../../config/test-config";

// Only run these tests when real database is available (flag + DATABASE_URL)
describeIf(isServiceAvailable("database"), "Database Integration Tests", () => {
    // Import real modules (not mocked)
    let db: Awaited<ReturnType<typeof import("@/lib/db").getDb>>;

    beforeAll(async () => {
        const { getDb } = await import("@/lib/db");
        db = getDb();
    });

    describe("Connection", () => {
        it("can connect and query", async () => {
            // Simple query to verify connection using sql helper
            const result = await db.execute(sql`SELECT 1 as test`);
            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]?.test).toBe(1);
        });

        it("can query current timestamp", async () => {
            const result = await db.execute(sql`SELECT NOW() as now`);
            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
            // NOW() returns a Date or string depending on driver
            expect(result[0]?.now).toBeDefined();
        });

        it("can query database version", async () => {
            const result = await db.execute(sql`SELECT version()`);
            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]?.version).toContain("PostgreSQL");
        });
    });

    describe("Schema", () => {
        it("has chat table", async () => {
            // Table name is "Chat" (capitalized)
            const result = await db.execute(sql`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'Chat'
                ) as exists
            `);
            expect(result[0]?.exists).toBe(true);
        });

        it("has message table", async () => {
            // Table name is "Message_v2"
            const result = await db.execute(sql`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'Message_v2'
                ) as exists
            `);
            expect(result[0]?.exists).toBe(true);
        });

        it("has user table", async () => {
            // Table name is "User" (capitalized)
            const result = await db.execute(sql`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'User'
                ) as exists
            `);
            expect(result[0]?.exists).toBe(true);
        });

        it("has document table", async () => {
            // Table name is "Document" (capitalized)
            const result = await db.execute(sql`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'Document'
                ) as exists
            `);
            expect(result[0]?.exists).toBe(true);
        });

        it("has vote table", async () => {
            // Table name is "Vote_v2"
            const result = await db.execute(sql`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'Vote_v2'
                ) as exists
            `);
            expect(result[0]?.exists).toBe(true);
        });
    });

    // Note: Write tests should use test prefixes and clean up after themselves
    // We don't include write tests here to avoid any risk to production data
});
