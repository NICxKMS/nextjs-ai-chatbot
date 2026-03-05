import { describe, expect, it } from "vitest"

import { loginSchema, registerSchema } from "@/features/auth/schemas/auth.schema"

describe("loginSchema", () => {
	it("accepts valid email and password", () => {
		const parsed = loginSchema.parse({
			email: "user@example.com",
			password: "secret123",
		})

		expect(parsed).toEqual({
			email: "user@example.com",
			password: "secret123",
		})
	})

	it("accepts password length boundaries", () => {
		expect(() =>
			loginSchema.parse({
				email: "min@example.com",
				password: "a".repeat(6),
			}),
		).not.toThrow()

		expect(() =>
			loginSchema.parse({
				email: "max@example.com",
				password: "a".repeat(100),
			}),
		).not.toThrow()
	})

	it("rejects invalid email", () => {
		expect(() =>
			loginSchema.parse({
				email: "invalid-email",
				password: "secret123",
			}),
		).toThrow()
	})

	it("rejects passwords shorter than 6 characters", () => {
		expect(() =>
			loginSchema.parse({
				email: "user@example.com",
				password: "short",
			}),
		).toThrow()
	})

	it("rejects passwords longer than 100 characters", () => {
		expect(() =>
			loginSchema.parse({
				email: "user@example.com",
				password: "a".repeat(101),
			}),
		).toThrow()
	})
})

describe("registerSchema", () => {
	it("accepts valid input without a name", () => {
		expect(() =>
			registerSchema.parse({
				email: "user@example.com",
				password: "secret123",
			}),
		).not.toThrow()
	})

	it("accepts a name up to 100 characters", () => {
		expect(() =>
			registerSchema.parse({
				email: "user@example.com",
				password: "secret123",
				name: "a".repeat(100),
			}),
		).not.toThrow()
	})

	it("rejects names longer than 100 characters", () => {
		expect(() =>
			registerSchema.parse({
				email: "user@example.com",
				password: "secret123",
				name: "a".repeat(101),
			}),
		).toThrow()
	})
})
