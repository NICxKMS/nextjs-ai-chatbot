import type { NextConfig } from "next"

const enableProductionBrowserSourceMaps =
	process.env.ENABLE_PRODUCTION_BROWSER_SOURCE_MAPS === "true"
const enableExperimentalInlineCss = process.env.ENABLE_EXPERIMENTAL_INLINE_CSS === "true"
const enableExperimentalViewTransition = process.env.ENABLE_EXPERIMENTAL_VIEW_TRANSITION === "true"
const isProductionBuild = process.env.NODE_ENV === "production"

const nextConfig: NextConfig = {
	reactCompiler: true,
	cacheComponents: true,
	reactStrictMode: true,
	productionBrowserSourceMaps: enableProductionBrowserSourceMaps,
	devIndicators: false,
	typescript: {
		tsconfigPath: isProductionBuild ? "tsconfig.build.json" : "tsconfig.json",
	},

	experimental: {
		inlineCss: enableExperimentalInlineCss,
		turbopackFileSystemCacheForDev: true,
		viewTransition: enableExperimentalViewTransition,
		optimizePackageImports: [
			// editor ecosystem
			"@tiptap/react",
			"@tiptap/core",
			"@tiptap/starter-kit",
			"@tiptap/extension-table",
			"@tiptap/extension-table-row",
			"@tiptap/extension-table-cell",
			"@tiptap/extension-table-header",

			// animations
			"framer-motion",
			"motion",

			// codemirror
			"@codemirror/view",
			"@codemirror/state",
			"@codemirror/lang-javascript",
			"@codemirror/lang-python",

			"streamdown",
			"@streamdown/cjk",
			"@streamdown/code",
			"@streamdown/math",
			"@streamdown/mermaid",
			"shiki",
		],
	},
	images: {
		remotePatterns: [
			{
				hostname: "avatar.vercel.sh",
			},
		],
	},
}

export default nextConfig
