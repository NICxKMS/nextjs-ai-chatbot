import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
			"server-only": path.resolve(__dirname, "__tests__/mocks/server-only.ts"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["tests/**/*.test.ts"],
		exclude: ["node_modules", "oldapp", ".next", ".opencode", "plan", "plan-archives", "e2e"],
		setupFiles: ["__tests__/setup.ts"],
		coverage: {
			provider: "v8",
			include: ["app/**", "features/**", "lib/**", "components/**", "scripts/**"],
			exclude: [
				"tests/**",
				"__tests__/**",
				"e2e/**",
				"oldapp/**",
				"plan/**",
				"plan-archives/**",
				"components/ai-elements/**",
			],
		},
	},
})
