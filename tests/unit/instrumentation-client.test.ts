import { afterEach, describe, expect, it, vi } from "vitest"

type RouterTransitionStart = (url: string, navigationType: "push" | "replace" | "traverse") => void
type ClientInstrumentationModule = typeof import("../../instrumentation-client") & {
	onRouterTransitionStart?: RouterTransitionStart
}

function callEventListener(listener: EventListenerOrEventListenerObject, event: Event) {
	if (typeof listener === "function") {
		listener(event)
		return
	}

	listener.handleEvent(event)
}

afterEach(() => {
	vi.resetModules()
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe("client instrumentation", () => {
	it("imports safely when no browser window is available", async () => {
		vi.stubGlobal("window", undefined)

		await expect(import("../../instrumentation-client")).resolves.toBeDefined()
	})

	it("registers lightweight client error handlers when a browser window is available", async () => {
		const listeners = new Map<string, EventListenerOrEventListenerObject[]>()
		const addEventListener = vi.fn(
			(type: string, listener: EventListenerOrEventListenerObject) => {
				listeners.set(type, [...(listeners.get(type) ?? []), listener])
			},
		)
		vi.stubGlobal("window", { addEventListener })

		await import("../../instrumentation-client")

		expect(addEventListener).toHaveBeenCalledWith("error", expect.any(Function))
		expect(addEventListener).toHaveBeenCalledWith("unhandledrejection", expect.any(Function))
		expect(listeners.get("error")).toHaveLength(1)
		expect(listeners.get("unhandledrejection")).toHaveLength(1)
	})

	it("keeps client setup safe if a browser listener cannot be registered", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
		vi.stubGlobal("window", {
			addEventListener: vi.fn(() => {
				throw new Error("listener unavailable")
			}),
		})

		await expect(import("../../instrumentation-client")).resolves.toBeDefined()
		expect(warn).toHaveBeenCalledWith(
			"[instrumentation-client] Failed to register client error handlers.",
		)
	})

	it("logs structured client error and unhandled rejection payloads", async () => {
		const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined)
		const listeners = new Map<string, EventListenerOrEventListenerObject[]>()
		vi.stubGlobal("window", {
			addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
				listeners.set(type, [...(listeners.get(type) ?? []), listener])
			},
		})

		await import("../../instrumentation-client")

		const [errorListener] = listeners.get("error") ?? []
		const [rejectionListener] = listeners.get("unhandledrejection") ?? []
		expect(errorListener).toBeDefined()
		expect(rejectionListener).toBeDefined()
		if (!errorListener || !rejectionListener) {
			throw new Error("Expected client instrumentation listeners to be registered")
		}

		callEventListener(errorListener, {
			colno: 7,
			filename: "app.js",
			lineno: 42,
			message: "client failed",
		} as ErrorEvent)
		callEventListener(rejectionListener, {
			reason: new Error("promise failed"),
		} as PromiseRejectionEvent)

		expect(errorLog).toHaveBeenCalledWith("[client-error]", {
			colno: 7,
			filename: "app.js",
			lineno: 42,
			message: "client failed",
		})
		expect(errorLog).toHaveBeenCalledWith("[client-unhandled-rejection]", {
			reason: "promise failed",
		})
	})

	it("keeps the optional router transition hook safe when exported", async () => {
		const clientInstrumentation = (await import(
			"../../instrumentation-client"
		)) as ClientInstrumentationModule

		if (clientInstrumentation.onRouterTransitionStart) {
			expect(() =>
				clientInstrumentation.onRouterTransitionStart?.("/chat/123", "push"),
			).not.toThrow()
		} else {
			expect(clientInstrumentation.onRouterTransitionStart).toBeUndefined()
		}
	})
})
