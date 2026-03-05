import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    cacheComponents: true,
    reactCompiler: true,
    productionBrowserSourceMaps: false, // Disabled: Saves ~50% bundle size in production
    reactStrictMode: true,
    experimental: {
        // postcss not compatible with lightningcss yet
        // useLightningcss: true,
        viewTransition: true, // Smooth navigation animations
        turbopackFileSystemCacheForDev: true, // 50% faster dev restarts
        inlineCss: true,
        optimizePackageImports: [
            "lucide-react",
            "date-fns",
            "@radix-ui/react-icons",
            "framer-motion",
            "@tiptap/react",
            "@ai-sdk/react",
            // Performance optimization additions
            "streamdown",
            "shiki",
            "codemirror",
            "@codemirror/lang-python",
            "@codemirror/lang-javascript",
            "@codemirror/lang-typescript",
            // Math/markdown plugins
            "remark-math",
            "rehype-katex",
            "katex",
            "cytoscape",
            "cytoscape-dagre",
            "mermaid",
        ],
    },
    // webpack(config, { isServer }) {
    //     if (!isServer) {
    //         // Improve readability of client chunk names
    //         config.output.chunkFilename =
    //             "static/chunks/[name].[contenthash].js";

    //         config.output.filename = "static/chunks/[name].[contenthash].js";
    //     }

    //     return config;
    // },

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
