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
			// icons
			"lucide-react",

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

			// large bundles behind dynamic imports (ai-elements)
			"@xyflow/react",
			"@rive-app/react-webgl2",
		],
	},
	images: {
		remotePatterns: [
			{
				hostname: "avatar.vercel.sh",
			},
		],
	},

	async headers() {
		// ── Content-Security-Policy (Report-Only) ───────────────────
		// Report-Only mode: violations are logged to the browser console
		// but nothing is blocked. This is the safe first step before
		// enforcing. Kept permissive — tighten iteratively once the
		// report-only logs show no false positives.
		const cspDirectives = [
			// Default fallback — restrict to same-origin
			"default-src 'self'",

			// Scripts: self + inline (Next.js hydration) + WASM (Pyodide, Rive) + CDN (Pyodide)
			"script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",

			// Styles: self + inline (Tailwind, theme-provider, dynamic styles)
			"style-src 'self' 'unsafe-inline'",

			// Images: self + data/blob (ai-elements base64, attachments) + avatar + Rive assets
			"img-src 'self' data: blob: https://avatar.vercel.sh https://*.public.blob.vercel-storage.com",

			// Fonts: self only (geist fonts are bundled locally via npm)
			"font-src 'self'",

			// Fetch/XHR/WebSocket: self + Supabase (API + realtime WS) + Pyodide CDN + Vercel analytics
			"connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://va.vercel-scripts.com https://vitals.vercel-insights.com",

			// Audio/video sources (audio-player ai-element)
			"media-src 'self' data: blob:",

			// Web Workers (Pyodide may spawn blob workers)
			"worker-src 'self' blob:",

			// Iframes: blob for web-preview sandbox
			"frame-src 'self' blob:",

			// Clickjacking protection (mirrors X-Frame-Options: DENY)
			"frame-ancestors 'none'",

			// Restrict <base> and <form> targets
			"base-uri 'self'",
			"form-action 'self'",

			// Block <object>, <embed>, <applet>
			"object-src 'none'",
		]

		const cspValue = cspDirectives.join("; ")

		return [
			{
				source: "/(.*)",
				headers: [
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
					{ key: "X-DNS-Prefetch-Control", value: "on" },
					{
						key: "Content-Security-Policy-Report-Only",
						value: cspValue,
					},
				],
			},
		]
	},
}

export default nextConfig
