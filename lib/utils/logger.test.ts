// Flow: observability | Step: logging
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { logger } from "@/lib/utils/logger"

// biome-ignore lint/suspicious/noEmptyBlockStatements: intentional mock noop
const noop = () => {}

describe("logger", () => {
	const consoleSpy = {
		debug: vi.spyOn(console, "debug").mockImplementation(noop),
		info: vi.spyOn(console, "info").mockImplementation(noop),
		warn: vi.spyOn(console, "warn").mockImplementation(noop),
		error: vi.spyOn(console, "error").mockImplementation(noop),
	}

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe("in development mode (NODE_ENV !== production)", () => {
		beforeEach(() => {
			// Default test environment is "test", which triggers the dev path
			consoleSpy.debug = vi.spyOn(console, "debug").mockImplementation(noop)
			consoleSpy.info = vi.spyOn(console, "info").mockImplementation(noop)
			consoleSpy.warn = vi.spyOn(console, "warn").mockImplementation(noop)
			consoleSpy.error = vi.spyOn(console, "error").mockImplementation(noop)
		})

		it("logger.debug calls console.debug", () => {
			logger.debug("test debug")
			expect(consoleSpy.debug).toHaveBeenCalledOnce()
		})

		it("logger.info calls console.info", () => {
			logger.info("test info")
			expect(consoleSpy.info).toHaveBeenCalledOnce()
		})

		it("logger.warn calls console.warn", () => {
			logger.warn("test warn")
			expect(consoleSpy.warn).toHaveBeenCalledOnce()
		})

		it("logger.error calls console.error", () => {
			logger.error("test error")
			expect(consoleSpy.error).toHaveBeenCalledOnce()
		})

		it("passes message as an argument to the console method", () => {
			logger.info("hello world")
			const callArgs = consoleSpy.info.mock.calls[0]
			if (!callArgs) throw new Error("Expected console.info to be called")
			// In dev mode, the format is: prefix, message, [context]
			expect(callArgs.some((arg: unknown) => arg === "hello world")).toBe(true)
		})

		it("includes context object when provided", () => {
			const ctx = { userId: "123", action: "login" }
			logger.info("user action", ctx)
			const callArgs = consoleSpy.info.mock.calls[0]
			if (!callArgs) throw new Error("Expected console.info to be called")
			expect(
				callArgs.some(
					(arg: unknown) => typeof arg === "object" && arg !== null && "userId" in arg,
				),
			).toBe(true)
		})

		it("handles messages without context", () => {
			logger.warn("no context")
			expect(consoleSpy.warn).toHaveBeenCalledOnce()
			// Should not throw
		})
	})

	describe("structured output shape (dev mode)", () => {
		beforeEach(() => {
			consoleSpy.debug = vi.spyOn(console, "debug").mockImplementation(noop)
			consoleSpy.info = vi.spyOn(console, "info").mockImplementation(noop)
		})

		it("includes a timestamp-like prefix in dev mode", () => {
			logger.info("check prefix")
			const firstArg = consoleSpy.info.mock.calls[0]?.[0] as string

			// Dev prefix includes ANSI color codes and HH:mm:ss.SSS timestamp
			expect(firstArg).toBeDefined()
			expect(typeof firstArg).toBe("string")
			// Should contain [INFO] in the prefix
			expect(firstArg).toContain("[INFO]")
		})

		it("includes [DEBUG] in debug prefix", () => {
			logger.debug("check debug prefix")
			const firstArg = consoleSpy.debug.mock.calls[0]?.[0] as string
			expect(firstArg).toContain("[DEBUG]")
		})
	})

	describe("all log levels are accessible", () => {
		it("exposes debug, info, warn, and error methods", () => {
			expect(typeof logger.debug).toBe("function")
			expect(typeof logger.info).toBe("function")
			expect(typeof logger.warn).toBe("function")
			expect(typeof logger.error).toBe("function")
		})
	})
})
