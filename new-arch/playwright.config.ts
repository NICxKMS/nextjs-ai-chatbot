import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.test" });

const PORT = process.env.PORT || 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 4 : 8,
    reporter: [
        ["html", { open: "never" }],
        ["json", { outputFile: "test-results/results.json" }],
        process.env.CI ? ["github"] : ["line"],
    ],

    use: {
        baseURL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },

    // Reasonable timeouts
    timeout: 60_000, // 60s max per test
    expect: {
        timeout: 10_000, // 10s for assertions
    },

    projects: [
        // Setup project for global auth
        {
            name: "setup",
            testMatch: /global\.setup\.ts/,
        },

        // E2E tests - Desktop Chrome
        {
            name: "e2e-chrome",
            testMatch: /e2e\/.*.test.ts/,
            dependencies: ["setup"],
            use: { ...devices["Desktop Chrome"] },
        },

        // E2E tests - Desktop Firefox
        {
            name: "e2e-firefox",
            testMatch: /e2e\/.*.test.ts/,
            dependencies: ["setup"],
            use: { ...devices["Desktop Firefox"] },
            grep: /@cross-browser/,
        },

        // Integration/API tests
        {
            name: "integration",
            testMatch: /integration\/.*.test.ts/,
            dependencies: ["setup"],
            use: { ...devices["Desktop Chrome"] },
        },

        // Mobile viewport tests
        {
            name: "mobile",
            testMatch: /e2e\/.*.test.ts/,
            dependencies: ["setup"],
            use: { ...devices["iPhone 13"] },
            grep: /@mobile/,
        },
    ],

    webServer: {
        command: process.env.CI ? "pnpm build && pnpm start" : "pnpm dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
