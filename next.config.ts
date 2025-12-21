import type { NextConfig } from 'next';

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
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
};

export default nextConfig;
