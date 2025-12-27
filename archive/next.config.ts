import type { NextConfig } from "next";

// Security headers for all responses
const securityHeaders = [
    {
        // Prevent clickjacking by disallowing iframe embedding
        key: "X-Frame-Options",
        value: "DENY",
    },
    {
        // Prevent MIME type sniffing
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        // Enable XSS filter in older browsers
        key: "X-XSS-Protection",
        value: "1; mode=block",
    },
    {
        // Control referrer information sent with requests
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
    {
        // Restrict browser features and APIs
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
];

const nextConfig: NextConfig = {
    cacheComponents: true,
    reactCompiler: true,
    productionBrowserSourceMaps: false, // Disabled: Saves ~50% bundle size in production
    reactStrictMode: true,
    experimental: {
        // @ts-expect-error - dynamicIO is valid in Next.js 16.1.0 but not in types yet
        dynamicIO: true, // Required for cacheLife profiles (Next.js 16.1.0)
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
    // Custom cacheLife profiles for "use cache" directive (OPT-001)
    cacheLife: {
        // Message history - medium freshness
        chatMessages: {
            stale: 60, // 1 min - serve stale while revalidating
            revalidate: 300, // 5 min - background revalidation
            expire: 3600, // 1 hour - hard expiry
        },
        // Chat sidebar list - higher freshness needed
        userChats: {
            stale: 30, // 30s - serve stale while revalidating
            revalidate: 120, // 2 min - background revalidation
            expire: 1800, // 30 min - hard expiry
        },
        // Document content - lower freshness acceptable
        documents: {
            stale: 120, // 2 min - serve stale while revalidating
            revalidate: 600, // 10 min - background revalidation
            expire: 7200, // 2 hours - hard expiry
        },
        // AI suggestions - lowest freshness needed
        suggestions: {
            stale: 300, // 5 min - serve stale while revalidating
            revalidate: 900, // 15 min - background revalidation
            expire: 86_400, // 24 hours - hard expiry
        },
    }, // Next.js 16: Partial Prerendering
    images: {
        remotePatterns: [
            {
                hostname: "avatar.vercel.sh",
            },
        ],
    },
    // Apply security headers to all routes
    async headers() {
        return [
            {
                // Apply to all routes
                source: "/:path*",
                headers: securityHeaders,
            },
        ];
    },
};

export default nextConfig;
