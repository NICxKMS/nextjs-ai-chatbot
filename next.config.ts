import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    cacheComponents: true,
    reactCompiler: true,
    productionBrowserSourceMaps: false,
    reactStrictMode: false,

    // Exclude newrelic from bundling - it must run as a native Node.js module
    // This prevents Turbopack/Webpack from trying to analyze dynamic requires
    serverExternalPackages: ["newrelic", "@newrelic/security-agent"],

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

    // Include newrelic.js in serverless function bundles
    // This ensures the New Relic config file is available at runtime on Vercel
    outputFileTracingIncludes: {
        "/*": ["./newrelic.js"],
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

export default nextConfig;
