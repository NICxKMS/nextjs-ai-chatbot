import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./tests/unit/setup.ts"],
        include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
        exclude: ["node_modules", "oldapp", ".next"],
        // Don't fail on unhandled rejections from AbortSignal (jsdom + fake timers known issue)
        dangerouslyIgnoreUnhandledErrors: true,
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: ["node_modules", "oldapp", ".next", "tests"],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
            // Mock server-only for tests (Next.js server boundary marker)
            "server-only": path.resolve(
                __dirname,
                "./tests/unit/__mocks__/server-only.ts"
            ),
        },
    },
});
