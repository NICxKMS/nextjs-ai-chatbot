export default function Head() {
    return (
        <>
            {/* Vercel Analytics & Speed Insights */}
            <link
                crossOrigin="anonymous"
                href="https://va.vercel-scripts.com"
                rel="preconnect"
            />
            <link href="https://va.vercel-scripts.com" rel="dns-prefetch" />
            <link
                crossOrigin="anonymous"
                href="https://vitals.vercel-insights.com"
                rel="preconnect"
            />
            <link
                href="https://vitals.vercel-insights.com"
                rel="dns-prefetch"
            />

            {/* Google Fonts - preconnect for faster font loading */}
            <link
                crossOrigin="anonymous"
                href="https://fonts.gstatic.com"
                rel="preconnect"
            />

            {/* AI Provider APIs - dns-prefetch only (backend calls) */}
            <link href="https://api.openai.com" rel="dns-prefetch" />
            <link
                href="https://generativelanguage.googleapis.com"
                rel="dns-prefetch"
            />
        </>
    );
}
