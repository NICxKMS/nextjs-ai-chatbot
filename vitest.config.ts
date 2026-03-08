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
		include: ["**/*.test.ts", "**/*.test.tsx"],
		exclude: ["node_modules", "oldapp", ".next", "plan", "plan-archives", "e2e"],
		setupFiles: ["__tests__/setup.ts"],
		coverage: {
			provider: "v8",
			include: ["app/**", "features/**", "lib/**", "components/**"],
			exclude: [
				"**/*.test.ts",
				"**/*.test.tsx",
				"__tests__/**",
				"oldapp/**",
				"plan/**",
				"components/ai-elements/**",
			],
		},
	},
})
