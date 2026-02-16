import bundleAnalyzer from "@next/bundle-analyzer"
import type { NextConfig } from "next"

const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
})

const nextConfig: NextConfig = {
	// Enable React Compiler
	// Note: cacheComponents disabled because this app uses cookies/session which are
	// incompatible with static prerendering at build time
	cacheComponents: false,
	reactCompiler: true,

	// Disable source maps in production for smaller bundle size
	productionBrowserSourceMaps: false,

	// Enable React strict mode for better development experience
	reactStrictMode: true,

	experimental: {
		// Smooth navigation animations
		viewTransition: true,

		// 50% faster dev restarts
		turbopackFileSystemCacheForDev: true,

		// Inline CSS for better performance
		inlineCss: true,

		// Optimize package imports for better bundle size
		optimizePackageImports: [
			"lucide-react",
			"date-fns",
			"@radix-ui/react-icons",
			"framer-motion",
			"@tiptap/react",
			"@ai-sdk/react",
			"streamdown",
			"shiki",
			"codemirror",
			"@codemirror/lang-python",
			"@codemirror/lang-javascript",
			"@codemirror/lang-typescript",
			"remark-math",
			"rehype-katex",
			"katex",
			"cytoscape",
			"cytoscape-dagre",
			"mermaid",
		],
	},

	images: {
		remotePatterns: [
			{
				hostname: "avatar.vercel.sh",
			},
			{
				protocol: "https",
				hostname: "*.blob.vercel-storage.com",
			},
		],
		formats: ["image/avif", "image/webp"],
		minimumCacheTTL: 60,
	},
}

export default withBundleAnalyzer(nextConfig)
