import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	reactCompiler: true,
	cacheComponents: true,
	images: {
		remotePatterns: [
			{
				hostname: "avatar.vercel.sh",
			},
		],
	},
}

export default nextConfig
