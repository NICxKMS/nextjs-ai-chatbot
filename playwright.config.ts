import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright E2E Test Configuration for AI Assistant v6
 * @see https://playwright.dev/docs/test-configuration
 */

import { config } from "dotenv"

// Load environment variables from .env.local
config({ path: ".env.local" })

/* Use process.env.PORT by default and fallback to port 3000 */
const PORT = process.env.PORT || 3000

/**
 * Set webServer.url and use.baseURL with the location
 * of the WebServer respecting the correct set port
 */
const baseURL = `http://localhost:${PORT}`

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
	// Test directory
	testDir: "./e2e",

	// Run tests in files in parallel
	fullyParallel: true,

	// Fail the build on CI if you accidentally left test.only in the source code
	forbidOnly: !!process.env.CI,

	// Retry failed tests on CI
	retries: process.env.CI ? 2 : 0,

	// Opt out of parallel tests on CI
	workers: process.env.CI ? 1 : 4,

	// Reporter to use
	reporter: [["html"], ["list"]],

	// Global test timeout
	timeout: 60 * 1000, // 60 seconds per test

	// Expect timeout
	expect: {
		timeout: 10 * 1000, // 10 seconds for assertions
		// Visual regression testing configuration
		toHaveScreenshot: {
			maxDiffPixels: 100,
			threshold: 0.001, // 0.1% threshold for visual differences
		},
	},

	// Snapshot directory for visual regression tests
	snapshotDir: "./e2e/visual/snapshots",

	// Shared settings for all the projects below
	use: {
		// Base URL to use in actions like `await page.goto('/')`
		baseURL,

		// Collect trace when retrying the failed test
		trace: "on-first-retry",

		// Screenshot on failure
		screenshot: "only-on-failure",

		// Video on failure
		video: "retain-on-failure",

		// Action timeout
		actionTimeout: 10 * 1000,

		// Navigation timeout
		navigationTimeout: 30 * 1000,
	},

	// Configure projects for different test types
	projects: [
		// E2E tests - Desktop Chrome
		{
			name: "e2e-chrome",
			testMatch: /.*\.spec\.ts/,
			use: {
				...devices["Desktop Chrome"],
			},
		},

		// E2E tests - Desktop Firefox (optional, uncomment to enable)
		// {
		//   name: 'e2e-firefox',
		//   testMatch: /.*\.spec\.ts/,
		//   use: { ...devices['Desktop Firefox'] },
		// },

		// E2E tests - Desktop Safari (optional, uncomment to enable)
		// {
		//   name: 'e2e-safari',
		//   testMatch: /.*\.spec\.ts/,
		//   use: { ...devices['Desktop Safari'] },
		// },

		// Mobile viewport tests (optional, uncomment to enable)
		// {
		//   name: 'mobile-chrome',
		//   testMatch: /.*\.spec\.ts/,
		//   use: { ...devices['Pixel 5'] },
		// },
		// {
		//   name: 'mobile-safari',
		//   testMatch: /.*\.spec\.ts/,
		//   use: { ...devices['iPhone 12'] },
		// },
	],

	// Run your local dev server before starting the tests
	webServer: {
		command: "pnpm dev",
		url: `${baseURL}/api/health`,
		timeout: 120 * 1000, // 2 minutes to start server
		reuseExistingServer: !process.env.CI,
	},
})
