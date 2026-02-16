/**
 * Vitest Configuration
 *
 * Configuration for unit and integration tests with Vitest.
 * Includes coverage thresholds and path aliases.
 *
 * @see https://vitest.dev/config/
 */

import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		// Test environment - use happy-dom for React hooks/components, node for utilities
		environment: "happy-dom",

		// Global setup
		globals: true,
		setupFiles: ["./src/test/setup.ts"],

		// Include patterns
		include: [
			"**/*.test.ts",
			"**/*.test.tsx",
			"**/*.spec.ts",
			"**/*.spec.tsx",
		],

		// Exclude patterns
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/archive/**",
			"**/e2e/**",
			"**/tests/e2e/**",
			// Exclude read-only AI elements from coverage
			"**/components/ai-elements/**",
			"**/html/**",
		],

		// Coverage configuration
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],

			// Coverage thresholds - 70% minimum
			thresholds: {
				global: {
					branches: 70,
					functions: 70,
					lines: 70,
					statements: 70,
				},
			},

			// Include patterns for coverage
			include: [
				"lib/**/*.ts",
				"features/**/*.ts",
				"components/**/*.ts",
				"components/**/*.tsx",
				"app/**/*.ts",
				"app/**/*.tsx",
			],

			// Exclude from coverage
			exclude: [
				"**/*.d.ts",
				"**/*.test.ts",
				"**/*.test.tsx",
				"**/*.spec.ts",
				"**/*.spec.tsx",
				"**/types/**",
				"**/__tests__/**",
				// Exclude read-only AI elements from coverage
				"**/components/ai-elements/**",
				// Exclude test utilities
				"**/src/test/**",
			],

			// Clean coverage output before each run
			clean: true,
		},

		// Test timeout
		testTimeout: 10000,
		hookTimeout: 10000,

		// Reporters
		reporters: ["default", "html"],

		// Watch mode settings
		watch: false,
	},

	// Path aliases matching tsconfig.json
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./"),
			// Mock server-only for tests
			"server-only": path.resolve(
				__dirname,
				"./src/test/mocks/server-only.ts",
			),
		},
	},

	// Define environment variables for tests
	define: {
		"process.env.NODE_ENV": JSON.stringify("test"),
	},
})
