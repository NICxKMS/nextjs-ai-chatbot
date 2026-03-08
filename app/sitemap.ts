import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

// biome-ignore lint/style/noDefaultExport: Next.js file convention requires default export
export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{
			url: BASE_URL,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 1,
		},
	]
}
