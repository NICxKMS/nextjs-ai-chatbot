/**
 * Vitest Integration Test Configuration
 * Separate config for integration tests with longer timeouts
 *
 * @module tests/integration/vitest.integration.config
 */

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/integration/**/*.test.ts"],
        exclude: ["**/node_modules/**", "**/dist/**"],
        testTimeout: 30_000, // 30s for integration tests
        hookTimeout: 30_000,
        setupFiles: ["./tests/integration/setup.ts"],
        globals: true,
        environment: "node",
        // Run integration tests sequentially to avoid race conditions
        pool: "forks",
        poolOptions: {
            forks: {
                singleFork: true,
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "../../"),
            "server-only": path.resolve(
                __dirname,
                "../__mocks__/server-only.ts"
            ),
        },
    },
});
