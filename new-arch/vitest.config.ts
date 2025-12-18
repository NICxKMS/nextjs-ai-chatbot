import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./tests/unit/setup.ts"],
        include: ["tests/**/*.{test,spec}.{ts,tsx}"],
        exclude: ["node_modules", ".next", "tests/e2e/**"],
        coverage: {
            provider: "v8",
            reporter: ["text", "text-summary", "html", "lcov", "json"],
            reportsDirectory: "./coverage",
            exclude: [
                "node_modules",
                ".next",
                "tests/**",
                "**/*.d.ts",
                "**/*.config.*",
                "**/types/**",
                "coverage/**",
            ],
            thresholds: {
                global: {
                    branches: 70,
                    functions: 70,
                    lines: 70,
                    statements: 70,
                },
            },
            all: true,
            clean: true,
        },
        reporters: ["default", "html"],
        outputFile: {
            html: "./coverage/test-report.html",
        },
        testTimeout: 10_000,
        hookTimeout: 10_000,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});
