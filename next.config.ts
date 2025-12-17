import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
    cacheComponents: true,
    reactCompiler: true,
    productionBrowserSourceMaps: process.env.VERCEL_ENV === "preview", //only enabled in preview to save ~50% bundle size in production
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
            "sonner",

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
            "@supabase/auth-js",
            "@supabase/functions-js",

            "@supabase/postgrest-js",
            "@supabase/realtime-js",

            "@supabase/ssr",
            "@supabase/supabase-js",

            "@supabase/storage-js",

            "@ai-sdk/gateway",
            "@ai-sdk/google",
            "@ai-sdk/openai",
            "@ai-sdk/provider",
            "@ai-sdk/react",
            "@ai-sdk/xai",
            "@codemirror/lang-javascript",
            "@codemirror/lang-python",
            "@codemirror/state",
            "@codemirror/theme-one-dark",
            "@codemirror/view",
            "@openrouter/ai-sdk-provider",
            "@opentelemetry/api",
            "@opentelemetry/api-logs",
            "@radix-ui/react-icons",
            "@radix-ui/react-select",
            "@radix-ui/react-use-controllable-state",
            "@radix-ui/react-visually-hidden",
            "@supabase/ssr",
            "@supabase/supabase-js",
            "@tiptap/core",
            "@tiptap/extension-mathematics",
            "@tiptap/extension-table",
            "@tiptap/extension-table-cell",
            "@tiptap/extension-table-header",
            "@tiptap/extension-table-row",
            "@tiptap/markdown",
            "@tiptap/pm",
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@upstash/ratelimit",
            "@upstash/redis",
            "@vercel/analytics",
            "@vercel/blob",
            "@vercel/functions",
            "@vercel/otel",
            "@vercel/speed-insights",
            "ai",
            "ai-gateway-provider",
            "babel-plugin-react-compiler",
            "class-variance-authority",
            "clsx",
            "codemirror",
            "date-fns",
            "diff-match-patch",
            "dotenv",
            "drizzle-orm",
            "embla-carousel-react",
            "fast-deep-equal",
            "framer-motion",
            "geist",
            "import-in-the-middle",
            "jose",
            "lucide-react",
            "nanoid",
            "next",
            "next-themes",
            "papaparse",
            "postgres",
            "radix-ui",
            "react",
            "react-data-grid",
            "react-dom",
            "react-resizable-panels",
            "react-virtuoso",
            "rehype-katex",
            "remark-math",
            "sonner",
            "streamdown",
            "swr",
            "tailwind-merge",
            "tailwindcss-animate",
            "tokenlens",
            "use-stick-to-bottom",
            "usehooks-ts",
            "workers-ai-provider",
            "zod",
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

export default withBundleAnalyzer(nextConfig);
