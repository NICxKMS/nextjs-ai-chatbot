import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const root = resolve(fileURLToPath(import.meta.url), "..")

export default defineConfig({
	resolve: {
		alias: {
			"@": root,
		},
	},
	test: {
		setupFiles: ["./tests/setup.ts"],
		include: ["**/*.test.ts", "**/*.test.tsx"],
		exclude: ["node_modules", ".next", ".opencode", "oldapp", "plan", "tests/e2e/**"],
	},
})
