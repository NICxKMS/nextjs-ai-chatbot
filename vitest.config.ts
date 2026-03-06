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
		environmentMatchGlobs: [
			["**/*.test.tsx", "jsdom"],
			["tests/unit/app/**", "jsdom"],
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				// vitest defaults
				"coverage/**",
				"dist/**",
				"node_modules/**",
				".next/**",
				"oldapp/**",
				"plan/**",
				"tests/**",
				"scripts/**",
				// Infrastructure - not testable as units
				"**/*.config.{ts,js}",
				"global.d.ts",
				"next-env.d.ts",
				"postcss.config.mjs",
				"proxy.ts",
				"next.config.ts",
				"drizzle.config.ts",
				"coverage-summary.md",
				"instrumentation*.ts",
				"lib/db/migrate.ts",
				"lib/db/client.ts",
				"lib/db/schema.ts",
				// Pure type files
				"**/*.types.ts",
				"lib/types/**",
				"features/**/types/**",
				// App loading/error stubs
				"app/**/loading.tsx",
				"app/**/error.tsx",
				"app/global-error.tsx",
				"app/not-found.tsx",
				"app/layout.tsx",
				"app/**/layout.tsx",
			],
		},
	},
})
