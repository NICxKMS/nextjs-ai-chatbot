import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
    // === Core Performance ===
    reactCompiler: true,
    cacheComponents: true,
    reactStrictMode: true,
    productionBrowserSourceMaps: false,

    // === Experimental Features ===
    experimental: {
        // Build performance
        turbopackFileSystemCacheForDev: true,
        parallelServerCompiles: true,

        // Runtime performance
        inlineCss: true,
        viewTransition: true,
        optimizeCss: true,

        // Bundle optimization - tree-shake heavy packages
        optimizePackageImports: [
            // UI frameworks
            "lucide-react",
            "@radix-ui/react-icons",
            "framer-motion",

            // Rich text
            "@tiptap/react",
            "@tiptap/core",
            "@tiptap/starter-kit",
            "@tiptap/extension-mathematics",
            "@tiptap/extension-table",
            "@tiptap/markdown",
            "@tiptap/pm",

            // Code editing
            "codemirror",
            "@codemirror/lang-python",
            "@codemirror/lang-javascript",
            "@codemirror/lang-typescript",
            "@codemirror/state",
            "@codemirror/view",
            "@codemirror/theme-one-dark",

            // AI SDK
            "@ai-sdk/react",
            "@ai-sdk/openai",
            "@ai-sdk/google",
            "ai",

            // Markdown/Math
            "streamdown",
            "shiki",
            "remark-math",
            "rehype-katex",
            "katex",

            // Visualization
            "cytoscape",
            "cytoscape-dagre",
            "mermaid",

            // Utilities
            "date-fns",
            "zod",
        ],

        // Server Actions
        serverActions: {
            bodySizeLimit: "2mb",
        },
    },

    // === Image Optimization ===
    images: {
        remotePatterns: [
            { hostname: "avatar.vercel.sh" },
            { protocol: "https", hostname: "*.blob.vercel-storage.com" },
        ],
        formats: ["image/avif", "image/webp"],
        minimumCacheTTL: 3600,
        deviceSizes: [640, 750, 828, 1080, 1200],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
    },

    // === Cache Headers ===
    headers() {
        return [
            {
                source: "/static/:path*",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=31536000, immutable",
                    },
                ],
            },
            {
                source: "/_next/static/:path*",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=31536000, immutable",
                    },
                ],
            },
        ];
    },

    // === Redirects for auth ===
    redirects() {
        return [
            {
                source: "/",
                destination: "/chat",
                permanent: false,
                has: [{ type: "cookie", key: "session" }],
            },
        ];
    },
};

export default withBundleAnalyzer(nextConfig);
