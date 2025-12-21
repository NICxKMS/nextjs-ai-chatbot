/**
 * Vitest Integration Test Configuration
 * Separate config for integration tests with longer timeouts
 *
 * @module tests/integration/vitest.integration.config
 */

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    test: {
        include: ["tests/integration/**/*.test.ts"],
        exclude: ["**/node_modules/**", "**/dist/**"],
        testTimeout: 30000, // 30s for integration tests
        hookTimeout: 30000,
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
            "server-only": path.resolve(__dirname, "../__mocks__/server-only.ts"),
        },
    },
});
