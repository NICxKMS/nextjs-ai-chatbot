import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
    cacheComponents: true,
    reactCompiler: true,
    productionBrowserSourceMaps: false,
    reactStrictMode: true,

    experimental: {
        inlineCss: true,
        optimizePackageImports: [
            "lucide-react",
            "date-fns",
            "@radix-ui/react-icons",
            "framer-motion",
            "@tiptap/react",
            "@ai-sdk/react",
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
};

export default withBundleAnalyzer(nextConfig);
