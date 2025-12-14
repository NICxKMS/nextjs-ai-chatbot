import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    cacheComponents: true,
    reactCompiler: true,
    productionBrowserSourceMaps: true,
    reactStrictMode: false,

    experimental: {
        inlineCss: true,
        cssChunking: true,
        optimizeCss: true,
        scrollRestoration: true,
        optimizePackageImports: [
            // UI Libraries
            "lucide-react",
            "@radix-ui/react-icons",
            "@radix-ui/react-select",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-slot",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-context-menu",
            "framer-motion",
            "sonner",
            "embla-carousel-react",
            // Editor Libraries
            "@tiptap/react",
            "@tiptap/extension-link",
            "@tiptap/extension-highlight",
            "@tiptap/starter-kit",
            "@tiptap/core",
            "@tiptap/pm",
            "@codemirror/view",
            "@codemirror/state",
            "@codemirror/lang-javascript",
            "@codemirror/lang-python",
            "@codemirror/autocomplete",
            "codemirror",
            // AI SDK
            "@ai-sdk/react",
            "@ai-sdk/openai",
            "@ai-sdk/google",
            "ai",
            // Utilities
            "date-fns",
            "usehooks-ts",
            "clsx",
            "class-variance-authority",
            "tailwind-merge",
            // Auth/Data
            "@supabase/ssr",
            "@supabase/supabase-js",
            // Data Grid
            "react-data-grid",
            "papaparse",
            // Icons
            "@icons-pack/react-simple-icons",
        ],
    },

    // Turbopack configuration (Next.js 16 default bundler)
    // Turbopack handles chunking automatically and more efficiently than webpack
    // The optimizePackageImports above handles tree-shaking for listed packages
    turbopack: {
        // Turbopack uses automatic code splitting
        // No manual splitChunks needed - it analyzes the module graph
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

// Wrap your config with analyzer
export default withBundleAnalyzer({
    enabled: process.env.ANALYZE === "true",
})(nextConfig);
