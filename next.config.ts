import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	reactCompiler: true,
	cacheComponents: true,
	reactStrictMode: true,
	productionBrowserSourceMaps: true,
	devIndicators: false,

	experimental: {
		inlineCss: true,
		useLightningcss: true,
		optimisticClientCache: true,
		turbopackFileSystemCacheForDev: true,
		viewTransition: true,
		optimizeCss: true,
		optimizePackageImports: ["lucide-react", "date-fns"],
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
