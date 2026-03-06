import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	reactCompiler: true,
	cacheComponents: true,
	reactStrictMode: true,
	productionBrowserSourceMaps: true,
	devIndicators: false,

	experimental: {
		inlineCss: true,
		optimisticClientCache: true,
		turbopackFileSystemCacheForDev: true,
		viewTransition: true,
		optimizeCss: true,
		optimizePackageImports: [
			"lucide-react",
			"date-fns",

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
