import { existsSync } from "node:fs"
import { defineConfig, devices } from "@playwright/test"

if (existsSync(".env.local")) {
	process.loadEnvFile(".env.local")
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000"
const webServerUrl = new URL(baseURL)
const webServerPort = webServerUrl.port || (webServerUrl.protocol === "https:" ? "443" : "80")

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 2 : 1,
	reporter: "html",
	timeout: 120_000,
	expect: { timeout: 10_000 },
	use: {
		baseURL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: `cmd /c "set ENABLE_E2E_ARTIFACT_FIXTURE=1&& pnpm exec next dev --hostname ${webServerUrl.hostname} --port ${webServerPort}"`,
		env: { ...process.env, ENABLE_E2E_ARTIFACT_FIXTURE: "1" },
		url: baseURL,
		reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1",
		timeout: 120_000,
	},
})
