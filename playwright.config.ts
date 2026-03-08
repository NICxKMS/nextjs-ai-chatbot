import { existsSync } from "node:fs"
import { defineConfig, devices } from "@playwright/test"

// Load .env.local if it exists (Node 20.12+ built-in)
if (existsSync(".env.local")) {
	process.loadEnvFile(".env.local")
}

export default defineConfig({
	testDir: "./e2e",
	globalSetup: "./e2e/global-setup.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 1,
	// Single worker avoids overwhelming the dev server — multiple
	// real-API tests running concurrently cause cascading timeouts.
	workers: process.env.CI ? 2 : 1,
	reporter: "html",
	timeout: 120_000,
	expect: { timeout: 10_000 },
	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "pnpm dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
})
