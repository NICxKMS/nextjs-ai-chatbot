export default function Head() {
    return (
        <>
            {/* CDN for Pyodide - with crossOrigin for CORS requests */}
            <link
                crossOrigin="anonymous"
                href="https://cdn.jsdelivr.net"
                rel="preconnect"
            />
            <link href="https://cdn.jsdelivr.net" rel="dns-prefetch" />

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

            {/* Weather API (tool usage) */}
            <link href="https://api.open-meteo.com" rel="dns-prefetch" />
        </>
    );
}
