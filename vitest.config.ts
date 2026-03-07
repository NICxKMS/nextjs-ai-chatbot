import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const root = resolve(fileURLToPath(import.meta.url), "..")
const testExclude = ["node_modules", ".next", ".opencode", "oldapp", "plan", "tests/e2e/**"]
const contractTestExclude = [...testExclude, "tests/integration/**/*.db.test.ts"]

export default defineConfig({
	resolve: {
		alias: {
			"@": root,
		},
	},
	test: {
		setupFiles: ["./tests/setup.ts"],
		projects: [
			{
				extends: true,
				test: {
					name: "unit-node",
					include: ["tests/**/*.test.ts"],
					exclude: [...testExclude, "tests/integration/**", "tests/unit/app/**"],
					environment: "node",
				},
			},
			{
				extends: true,
				test: {
					name: "unit-jsdom",
					include: ["tests/**/*.test.tsx", "tests/unit/app/**/*.test.ts"],
					exclude: [...testExclude, "tests/unit/**/*deep.test.tsx"],
					environment: "jsdom",
				},
			},
			{
				extends: true,
				test: {
					name: "contract-node",
					include: ["tests/integration/**/*.test.ts"],
					exclude: contractTestExclude,
					environment: "node",
					testTimeout: 15_000,
				},
			},
			{
				extends: true,
				test: {
					name: "integration-db-node",
					include: ["tests/integration/**/*.db.test.ts"],
					exclude: testExclude,
					environment: "node",
					testTimeout: 30_000,
				},
			},
			{
				extends: true,
				test: {
					name: "deep-jsdom",
					include: ["tests/unit/**/*deep.test.tsx"],
					exclude: testExclude,
					environment: "jsdom",
					testTimeout: 15_000,
				},
			},
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
