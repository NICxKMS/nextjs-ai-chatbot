import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

// biome-ignore lint/style/noDefaultExport: Next.js file convention requires default export
export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: ["/api/*", "/chat/*", "/login", "/register"],
		},
		sitemap: `${BASE_URL}/sitemap.xml`,
	}
}
