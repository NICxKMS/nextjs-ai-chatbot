/**
 * OpenTelemetry instrumentation for Next.js server runtime.
 * This file is automatically loaded by Next.js on server start.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        try {
            // @ts-expect-error - OpenTelemetry packages are optional dependencies
            const { NodeSDK } = await import("@opentelemetry/sdk-node");
            // @ts-expect-error - OpenTelemetry packages are optional dependencies
            const { getNodeAutoInstrumentations } = await import(
                "@opentelemetry/auto-instrumentations-node"
            );
            // @ts-expect-error - OpenTelemetry packages are optional dependencies
            const { OTLPTraceExporter } = await import(
                "@opentelemetry/exporter-trace-otlp-http"
            );

            const endpoint =
                process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
                "http://localhost:4318/v1/traces";

            const sdk = new NodeSDK({
                traceExporter: new OTLPTraceExporter({ url: endpoint }),
                instrumentations: [
                    getNodeAutoInstrumentations({
                        // Disable fs instrumentation to reduce noise
                        "@opentelemetry/instrumentation-fs": { enabled: false },
                    }),
                ],
            });

            sdk.start();

            // Graceful shutdown on process exit
            process.on("SIGTERM", () => {
                sdk.shutdown()
                    .then(() => console.log("OpenTelemetry SDK shut down"))
                    .catch((err: unknown) =>
                        console.error(
                            "Error shutting down OpenTelemetry SDK",
                            err
                        )
                    );
            });
        } catch (error) {
            // OpenTelemetry packages may not be installed in all environments
            console.warn("OpenTelemetry initialization skipped:", error);
        }
    }

    if (process.env.NEXT_RUNTIME === "edge") {
        // Edge runtime instrumentation is handled differently.
        // Vercel's built-in tracing handles this automatically.
        // Custom edge instrumentation can be added here if needed.
    }
}
