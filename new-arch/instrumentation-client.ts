/**
 * Client-side instrumentation for error tracking.
 * This file is automatically loaded by Next.js for client-side error handling.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

type RequestErrorContext = {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "page" | "route" | "action";
};

/**
 * Called when a request error occurs on the client side.
 * Use this to log errors to monitoring services like Sentry.
 */
export function onRequestError({
    error,
    request,
    context,
}: {
    error: Error;
    request: Request;
    context: RequestErrorContext;
}) {
    // Log client-side errors with context
    console.error("Request error:", {
        message: error.message,
        name: error.name,
        path: context.routePath,
        type: context.routeType,
        router: context.routerKind,
        url: request.url,
    });

    // Send to Sentry if configured
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        // @ts-expect-error - Sentry is an optional dependency
        import("@sentry/nextjs")
            .then((Sentry) => {
                Sentry.captureException(error, {
                    tags: {
                        routePath: context.routePath,
                        routeType: context.routeType,
                        routerKind: context.routerKind,
                    },
                });
            })
            .catch(() => {
                // Sentry not installed, skip
            });
    }
}
