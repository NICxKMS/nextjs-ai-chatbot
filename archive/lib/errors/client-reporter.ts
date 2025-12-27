/**
 * Client-Side Error Reporting Infrastructure
 * Captures and batches client-side errors for backend reporting.
 *
 * Features:
 * - Captures JavaScript errors via window.onerror
 * - Captures unhandled promise rejections
 * - Captures React error boundary errors
 * - Queues and batches errors to reduce network requests
 * - Memory-limited queue to prevent unbounded growth
 * - SSR-safe (no-op on server)
 *
 * @module lib/errors/client-reporter
 * @see P2-032
 */

// =============================================================================
// TYPES
// =============================================================================

export type ErrorLevel = "error" | "warning" | "info";

export interface ClientError {
    /** Unique error ID */
    id: string;
    /** Error message */
    message: string;
    /** Stack trace if available */
    stack?: string;
    /** React component stack for error boundary errors */
    componentStack?: string;
    /** URL where error occurred */
    url: string;
    /** Timestamp when error was captured */
    timestamp: Date;
    /** Browser user agent */
    userAgent: string;
    /** Error severity level */
    level: ErrorLevel;
    /** Source file and line info */
    source?: {
        filename?: string;
        lineno?: number;
        colno?: number;
    };
    /** Additional context data */
    extra?: Record<string, unknown>;
    /** Error fingerprint for deduplication */
    fingerprint: string;
}

export interface ClientErrorReporterOptions {
    /** API endpoint to send errors to */
    endpoint?: string;
    /** Maximum errors to queue before forcing flush */
    maxQueueSize?: number;
    /** Interval in ms to flush queue */
    flushInterval?: number;
    /** Whether to auto-setup global handlers */
    autoSetup?: boolean;
    /** Whether to deduplicate identical errors */
    deduplicate?: boolean;
    /** Maximum errors with same fingerprint */
    maxDuplicates?: number;
    /** Enable console logging for debugging */
    debug?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_OPTIONS: Required<ClientErrorReporterOptions> = {
    endpoint: "/api/errors",
    maxQueueSize: 50,
    flushInterval: 10_000, // 10 seconds
    autoSetup: true,
    deduplicate: true,
    maxDuplicates: 3,
    debug: false,
};

const IS_BROWSER = typeof window !== "undefined";

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Generate a unique error ID
 */
function generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Generate a fingerprint for error deduplication
 */
function generateFingerprint(
    message: string,
    stack?: string,
    source?: ClientError["source"]
): string {
    const parts = [
        message.slice(0, 100),
        source?.filename ?? "",
        source?.lineno?.toString() ?? "",
        stack?.split("\n")[1]?.trim() ?? "",
    ];
    return parts.join("|");
}

/**
 * Safely get current URL
 */
function getCurrentUrl(): string {
    if (!IS_BROWSER) {
        return "server";
    }
    try {
        return window.location.href;
    } catch {
        return "unknown";
    }
}

/**
 * Safely get user agent
 */
function getUserAgent(): string {
    if (!IS_BROWSER) {
        return "server";
    }
    try {
        return navigator.userAgent;
    } catch {
        return "unknown";
    }
}

/**
 * Extract error message from various error types
 */
function extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message: unknown }).message);
    }
    return String(error);
}

/**
 * Extract stack trace from error
 */
function extractStack(error: unknown): string | undefined {
    if (error instanceof Error && error.stack) {
        return error.stack;
    }
    return;
}

// =============================================================================
// CLIENT ERROR REPORTER CLASS
// =============================================================================

export class ClientErrorReporter {
    private queue: ClientError[] = [];
    private readonly options: Required<ClientErrorReporterOptions>;
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private readonly fingerprintCounts: Map<string, number> = new Map();
    private isSetup = false;
    private isFlushing = false;

    constructor(options: ClientErrorReporterOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };

        if (IS_BROWSER && this.options.autoSetup) {
            this.setup();
        }
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Set up global error handlers.
     * Called automatically if autoSetup is true.
     */
    setup(): void {
        if (!IS_BROWSER || this.isSetup) {
            return;
        }

        this.setupGlobalErrorHandler();
        this.setupUnhandledRejectionHandler();
        this.startFlushTimer();

        this.isSetup = true;
        this.log("Client error reporter initialized");
    }

    /**
     * Tear down global error handlers.
     * Useful for cleanup in tests.
     */
    teardown(): void {
        if (!IS_BROWSER) {
            return;
        }

        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }

        this.isSetup = false;
        this.log("Client error reporter torn down");
    }

    /**
     * Capture an error with optional extra context.
     */
    captureError(error: Error, extra?: Record<string, unknown>): string {
        const source: ClientError["source"] = {};
        const stack = extractStack(error);

        // Try to parse source from stack
        if (stack) {
            const match = stack.match(/at\s+.*\((.+):(\d+):(\d+)\)/);
            if (match?.[1] && match[2] && match[3]) {
                source.filename = match[1];
                source.lineno = Number.parseInt(match[2], 10);
                source.colno = Number.parseInt(match[3], 10);
            }
        }

        return this.addToQueue({
            message: error.message,
            stack,
            level: "error",
            source,
            extra,
        });
    }

    /**
     * Capture an error from React error boundary.
     */
    captureErrorBoundary(
        error: Error,
        errorInfo: { componentStack?: string }
    ): string {
        return this.addToQueue({
            message: error.message,
            stack: extractStack(error),
            componentStack: errorInfo.componentStack,
            level: "error",
            extra: { source: "errorBoundary" },
        });
    }

    /**
     * Capture a message with a severity level.
     */
    captureMessage(
        message: string,
        level: ErrorLevel = "error",
        extra?: Record<string, unknown>
    ): string {
        return this.addToQueue({
            message,
            level,
            extra,
        });
    }

    /**
     * Capture from window.onerror handler.
     */
    captureWindowError(
        message: string | Event,
        source?: string,
        lineno?: number,
        colno?: number,
        error?: Error
    ): string {
        const errorMessage =
            error?.message ?? extractErrorMessage(message) ?? "Unknown error";

        return this.addToQueue({
            message: errorMessage,
            stack: extractStack(error),
            level: "error",
            source: {
                filename: source,
                lineno,
                colno,
            },
            extra: { source: "windowError" },
        });
    }

    /**
     * Capture from unhandledrejection handler.
     */
    captureUnhandledRejection(reason: unknown): string {
        const message =
            extractErrorMessage(reason) ?? "Unhandled promise rejection";

        return this.addToQueue({
            message,
            stack: extractStack(reason),
            level: "error",
            extra: { source: "unhandledRejection" },
        });
    }

    /**
     * Flush the error queue to the backend.
     * Returns the number of errors sent.
     */
    async flush(): Promise<number> {
        if (!IS_BROWSER || this.queue.length === 0 || this.isFlushing) {
            return 0;
        }

        this.isFlushing = true;
        const errors = [...this.queue];
        this.queue = [];

        try {
            const response = await fetch(this.options.endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ errors }),
                // Use keepalive for reliable delivery during page unload
                keepalive: true,
            });

            if (!response.ok) {
                // Put errors back in queue on failure
                this.queue = [...errors, ...this.queue].slice(
                    0,
                    this.options.maxQueueSize
                );
                this.log(`Failed to send errors: ${response.status}`);
                return 0;
            }

            this.log(`Sent ${errors.length} errors`);
            return errors.length;
        } catch (error) {
            // Put errors back in queue on network failure
            this.queue = [...errors, ...this.queue].slice(
                0,
                this.options.maxQueueSize
            );
            this.log(
                `Network error sending errors: ${extractErrorMessage(error)}`
            );
            return 0;
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * Get current queue size.
     */
    getQueueSize(): number {
        return this.queue.length;
    }

    /**
     * Clear the queue without sending.
     */
    clearQueue(): void {
        this.queue = [];
        this.fingerprintCounts.clear();
    }

    // =========================================================================
    // PRIVATE METHODS
    // =========================================================================

    private addToQueue(
        errorData: Omit<
            ClientError,
            "id" | "url" | "timestamp" | "userAgent" | "fingerprint"
        >
    ): string {
        const fingerprint = generateFingerprint(
            errorData.message,
            errorData.stack,
            errorData.source
        );

        // Deduplicate if enabled
        if (this.options.deduplicate) {
            const count = this.fingerprintCounts.get(fingerprint) ?? 0;
            if (count >= this.options.maxDuplicates) {
                this.log(
                    `Skipping duplicate error: ${errorData.message.slice(0, 50)}`
                );
                return "";
            }
            this.fingerprintCounts.set(fingerprint, count + 1);
        }

        const id = generateErrorId();

        const clientError: ClientError = {
            id,
            message: errorData.message,
            stack: errorData.stack,
            componentStack: errorData.componentStack,
            url: getCurrentUrl(),
            timestamp: new Date(),
            userAgent: getUserAgent(),
            level: errorData.level,
            source: errorData.source,
            extra: errorData.extra,
            fingerprint,
        };

        this.queue.push(clientError);
        this.log(`Captured error: ${clientError.message.slice(0, 50)}`);

        // Auto-flush if queue is at max size
        if (this.queue.length >= this.options.maxQueueSize) {
            this.flush();
        }

        return id;
    }

    private setupGlobalErrorHandler(): void {
        const existingHandler = window.onerror;

        window.onerror = (
            message: string | Event,
            source?: string,
            lineno?: number,
            colno?: number,
            error?: Error
        ): boolean => {
            this.captureWindowError(message, source, lineno, colno, error);

            // Call existing handler if present
            if (typeof existingHandler === "function") {
                return existingHandler.call(
                    window,
                    message,
                    source,
                    lineno,
                    colno,
                    error
                );
            }

            // Return false to let the error propagate
            return false;
        };
    }

    private setupUnhandledRejectionHandler(): void {
        const existingHandler = window.onunhandledrejection;

        window.onunhandledrejection = (event: PromiseRejectionEvent): void => {
            this.captureUnhandledRejection(event.reason);

            // Call existing handler if present
            if (typeof existingHandler === "function") {
                existingHandler.call(window, event);
            }
        };
    }

    private startFlushTimer(): void {
        if (this.flushTimer) {
            return;
        }

        this.flushTimer = setInterval(() => {
            if (this.queue.length > 0) {
                this.flush();
            }
        }, this.options.flushInterval);

        // Flush on page unload
        window.addEventListener("beforeunload", () => {
            if (this.queue.length > 0) {
                this.flush();
            }
        });

        // Flush on visibility change (tab hidden)
        document.addEventListener("visibilitychange", () => {
            if (
                document.visibilityState === "hidden" &&
                this.queue.length > 0
            ) {
                this.flush();
            }
        });
    }

    private log(message: string): void {
        if (this.options.debug) {
            console.log(`[ClientErrorReporter] ${message}`);
        }
    }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Default error reporter instance.
 * Auto-initializes in browser environment.
 *
 * @example
 * ```typescript
 * import { errorReporter } from '@/lib/errors/client-reporter';
 *
 * // Manually capture an error
 * try {
 *   riskyOperation();
 * } catch (error) {
 *   errorReporter.captureError(error as Error, { context: 'risky-op' });
 * }
 *
 * // Capture a message
 * errorReporter.captureMessage('User clicked deprecated button', 'warning');
 *
 * // Force flush (e.g., before navigation)
 * await errorReporter.flush();
 * ```
 */
export const errorReporter = new ClientErrorReporter();

// =============================================================================
// REACT INTEGRATION HELPERS
// =============================================================================

/**
 * Create an error handler for React error boundaries.
 *
 * @example
 * ```tsx
 * class ErrorBoundary extends React.Component {
 *   componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
 *     createErrorBoundaryHandler()(error, errorInfo);
 *   }
 * }
 * ```
 */
export function createErrorBoundaryHandler(
    reporter: ClientErrorReporter = errorReporter
): (error: Error, errorInfo: { componentStack?: string }) => void {
    return (error, errorInfo) => {
        reporter.captureErrorBoundary(error, errorInfo);
    };
}

/**
 * HOC to wrap a component with error reporting.
 * Use this factory to create a wrapped component that captures errors.
 *
 * @example
 * ```tsx
 * // In a .tsx file:
 * import { createErrorReportingWrapper } from '@/lib/errors/client-reporter';
 *
 * const ErrorReportingWrapper = createErrorReportingWrapper(errorReporter);
 *
 * function MyComponent() {
 *   return <ErrorReportingWrapper componentName="MyComponent">
 *     <ActualComponent />
 *   </ErrorReportingWrapper>;
 * }
 * ```
 */
export function captureRenderError(
    error: Error,
    componentName: string,
    reporter: ClientErrorReporter = errorReporter
): string {
    return reporter.captureError(error, {
        component: componentName,
        source: "render",
    });
}
