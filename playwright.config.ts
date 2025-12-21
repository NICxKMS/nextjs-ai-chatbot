import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local" });

const PORT = process.env.PORT || 3000;
const baseURL = `http://localhost:${PORT}`;

/**
 * Playwright configuration for Next.js AI Chatbot E2E tests.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: "./tests/e2e",

    /* Run tests in files in parallel */
    fullyParallel: true,

    /* Fail the build on CI if you accidentally left test.only in the source code */
    forbidOnly: !!process.env.CI,

    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,

    /* Parallel workers */
    workers: process.env.CI ? 2 : 4,

    /* Reporter to use */
    reporter: process.env.CI ? "github" : "html",

    /* Global timeout for each test */
    timeout: 60_000,

    expect: {
        timeout: 10_000,
    },

    /* Shared settings for all projects */
    use: {
        baseURL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },

    /* Configure projects for different browsers */
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
        },
        {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
        },
        /* Mobile viewports */
        {
            name: "mobile-chrome",
            use: { ...devices["Pixel 5"] },
        },
        {
            name: "mobile-safari",
            use: { ...devices["iPhone 12"] },
        },
    ],

    /* Run local dev server before starting tests */
    webServer: {
        command: "pnpm dev",
        url: `${baseURL}/api/health`,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
    },
});
