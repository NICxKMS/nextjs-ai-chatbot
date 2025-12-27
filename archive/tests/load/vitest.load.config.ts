/**
 * TEST-004: Vitest Configuration for Load Tests
 *
 * Separate configuration for load tests with extended timeouts
 * and specific settings for performance testing.
 *
 * Run with: pnpm vitest run --config tests/load/vitest.load.config.ts
 */

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // Only include load test files
        include: ["tests/load/**/*.load.test.ts"],

        // Extended timeouts for load tests
        testTimeout: 120_000, // 2 minutes per test
        hookTimeout: 30_000, // 30 seconds for hooks

        // Run tests sequentially to avoid interference
        sequence: {
            concurrent: false,
        },

        // Don't run in parallel - load tests should be isolated
        pool: "forks",
        poolOptions: {
            forks: {
                singleFork: true,
            },
        },

        // Disable watch mode by default
        watch: false,

        // Reporter configuration
        reporters: ["verbose"],

        // Global setup (if needed)
        globalSetup: undefined,

        // Environment
        environment: "node",

        // Retry failed tests once (network issues can cause flakiness)
        retry: 1,

        // Coverage is not needed for load tests
        coverage: {
            enabled: false,
        },
    },

    resolve: {
        alias: {
            "@": path.resolve(__dirname, "../../"),
        },
    },
});
