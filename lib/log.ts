// Centralized logging utility that avoids console usage.
// Server: records structured events on the active OpenTelemetry span (if any).
// Client: no-op (errors are surfaced via UI toasts where appropriate).

import { type Attributes, SpanStatusCode, trace } from "@opentelemetry/api";

// Request context is only available server-side and must be injected
// to avoid bundler issues with "server-only" directive
let getRequestContextFn:
	| (() => { requestId: string; userId?: string } | undefined)
	| undefined;

/**
 * Inject the request context getter function (server-side only).
 * This should be called from instrumentation or server-side initialization.
 */
export function injectRequestContextGetter(
	getter: () => { requestId: string; userId?: string } | undefined
): void {
	getRequestContextFn = getter;
}

function toAttributeValue(
	value: unknown
): string | number | boolean | undefined {
	if (value === null || value === undefined) {
		return;
	}
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return value;
	}
	// Collapse arrays/objects into a JSON string to satisfy OTel attribute restrictions.
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

function addEvent(
	level: "info" | "warn" | "error",
	message: string,
	detail?: unknown,
	attrs?: Record<string, unknown>
): void {
	// Avoid pulling console or other side effects on the client
	if (typeof window !== "undefined") {
		return;
	}
	const span = trace.getActiveSpan();
	if (!span) {
		return;
	}
	const attributes: Attributes = {};
	attributes["log.level"] = level;
	attributes["log.message"] = message;

	// Auto-inject request context if available and not already provided
	if (getRequestContextFn) {
		const ctx = getRequestContextFn();
		if (ctx) {
			if (!attrs?.requestId && ctx.requestId) {
				attributes["log.requestId"] = ctx.requestId;
			}
			if (!attrs?.userId && ctx.userId) {
				attributes["log.userId"] = ctx.userId;
			}
		}
	}

	// Flatten error details into string attributes
	if (detail instanceof Error) {
		attributes["log.detail.name"] = detail.name;
		attributes["log.detail.message"] = detail.message;
		if (detail.stack) {
			attributes["log.detail.stack"] = detail.stack;
		}
	} else if (detail !== undefined) {
		const v = toAttributeValue(detail);
		if (v !== undefined) {
			attributes["log.detail"] = v;
		}
	}
	if (attrs) {
		for (const [key, value] of Object.entries(attrs)) {
			const v = toAttributeValue(value);
			if (v !== undefined) {
				attributes[`log.${key}`] = v;
			}
		}
	}
	span.addEvent("log", attributes);
	if (level === "error") {
		if (detail instanceof Error) {
			span.recordException(detail);
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: message || detail.message,
			});
		} else {
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message,
			});
		}
	}
}

export function logInfo(
	message: string,
	detail?: unknown,
	attrs?: Record<string, unknown>
): void {
	addEvent("info", message, detail, attrs);
}

export function logWarn(
	message: string,
	detail?: unknown,
	attrs?: Record<string, unknown>
): void {
	addEvent("warn", message, detail, attrs);
}

export function logError(
	message: string,
	detail?: unknown,
	attrs?: Record<string, unknown>
): void {
	addEvent("error", message, detail, attrs);
}
