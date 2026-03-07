import { afterEach, describe, expect, it, vi } from "vitest"

async function loadNextConfig() {
	vi.resetModules()
	const module = await import("@/next.config")
	return module.default
}

afterEach(() => {
	vi.unstubAllEnvs()
	vi.resetModules()
})

describe("next.config", () => {
	it("keeps cache components enabled for active use-cache routes", async () => {
		const nextConfig = await loadNextConfig()

		expect(nextConfig.cacheComponents).toBe(true)
	})

	it("uses the main tsconfig outside production builds", async () => {
		vi.stubEnv("NODE_ENV", "test")

		const nextConfig = await loadNextConfig()

		expect(nextConfig.typescript?.tsconfigPath).toBe("tsconfig.json")
	})

	it("uses the production build tsconfig for next build", async () => {
		vi.stubEnv("NODE_ENV", "production")

		const nextConfig = await loadNextConfig()

		expect(nextConfig.typescript?.tsconfigPath).toBe("tsconfig.build.json")
	})

	it("disables production browser source maps by default", async () => {
		vi.stubEnv("ENABLE_PRODUCTION_BROWSER_SOURCE_MAPS", "false")

		const nextConfig = await loadNextConfig()

		expect(nextConfig.productionBrowserSourceMaps).toBe(false)
	})

	it("enables production browser source maps only for explicit diagnostics deployments", async () => {
		vi.stubEnv("ENABLE_PRODUCTION_BROWSER_SOURCE_MAPS", "true")

		const nextConfig = await loadNextConfig()

		expect(nextConfig.productionBrowserSourceMaps).toBe(true)
	})

	it("disables inline CSS by default", async () => {
		vi.stubEnv("ENABLE_EXPERIMENTAL_INLINE_CSS", "false")

		const nextConfig = await loadNextConfig()

		expect(nextConfig.experimental?.inlineCss).toBe(false)
	})

	it("enables inline CSS only when explicitly requested", async () => {
		vi.stubEnv("ENABLE_EXPERIMENTAL_INLINE_CSS", "true")

		const nextConfig = await loadNextConfig()

		expect(nextConfig.experimental?.inlineCss).toBe(true)
	})

	it("disables Next.js view transitions by default", async () => {
		vi.stubEnv("ENABLE_EXPERIMENTAL_VIEW_TRANSITION", "false")

		const nextConfig = await loadNextConfig()

		expect(nextConfig.experimental?.viewTransition).toBe(false)
	})

	it("enables Next.js view transitions only when explicitly requested", async () => {
		vi.stubEnv("ENABLE_EXPERIMENTAL_VIEW_TRANSITION", "true")

		const nextConfig = await loadNextConfig()

		expect(nextConfig.experimental?.viewTransition).toBe(true)
	})

	it("does not opt into undocumented experimental cache and CSS flags", async () => {
		const nextConfig = await loadNextConfig()

		expect(nextConfig.experimental?.optimisticClientCache).toBeUndefined()
		expect(nextConfig.experimental?.optimizeCss).toBeUndefined()
	})
})
