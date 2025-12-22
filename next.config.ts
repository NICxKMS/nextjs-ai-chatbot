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
