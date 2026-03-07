import { defineConfig, devices } from "@playwright/test"
import { ensureTestAuthEnvironment } from "./tests/test-env"

ensureTestAuthEnvironment()

const PORT = process.env.PORT || 3000
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: true,
	outputDir: "test-results/playwright",
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 2,
	reporter: "html",
	use: {
		baseURL,
		headless: true,
		trace: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "pnpm dev",
		url: baseURL,
		timeout: 120_000,
		reuseExistingServer: !process.env.CI,
	},
})
