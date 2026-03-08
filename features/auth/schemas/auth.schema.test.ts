// Flow: auth-validation | Step: schema-validation

import { describe, expect, it } from "vitest"

import { loginSchema, registerSchema } from "@/features/auth/schemas/auth.schema"

describe("loginSchema", () => {
	it("accepts valid email and password", () => {
		const result = loginSchema.safeParse({
			email: "user@example.com",
			password: "secure123",
		})
		expect(result.success).toBe(true)
	})

	it("rejects missing email", () => {
		const result = loginSchema.safeParse({ password: "secure123" })
		expect(result.success).toBe(false)
	})

	it("rejects missing password", () => {
		const result = loginSchema.safeParse({ email: "user@example.com" })
		expect(result.success).toBe(false)
	})

	it("rejects invalid email format", () => {
		const result = loginSchema.safeParse({
			email: "not-an-email",
			password: "secure123",
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe("Please enter a valid email address")
		}
	})

	it("rejects password shorter than 6 characters", () => {
		const result = loginSchema.safeParse({
			email: "user@example.com",
			password: "12345",
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe("Password must be at least 6 characters")
		}
	})

	it("rejects password longer than 100 characters", () => {
		const result = loginSchema.safeParse({
			email: "user@example.com",
			password: "a".repeat(101),
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe("Password must be at most 100 characters")
		}
	})

	it("accepts password at exactly 6 characters (min boundary)", () => {
		const result = loginSchema.safeParse({
			email: "user@example.com",
			password: "abcdef",
		})
		expect(result.success).toBe(true)
	})

	it("accepts password at exactly 100 characters (max boundary)", () => {
		const result = loginSchema.safeParse({
			email: "user@example.com",
			password: "a".repeat(100),
		})
		expect(result.success).toBe(true)
	})

	it("rejects empty string for email", () => {
		const result = loginSchema.safeParse({
			email: "",
			password: "secure123",
		})
		expect(result.success).toBe(false)
	})

	it("rejects empty string for password", () => {
		const result = loginSchema.safeParse({
			email: "user@example.com",
			password: "",
		})
		expect(result.success).toBe(false)
	})
})

describe("registerSchema", () => {
	it("is identical to loginSchema", () => {
		// registerSchema is aliased to loginSchema
		expect(registerSchema).toBe(loginSchema)
	})

	it("accepts valid registration input", () => {
		const result = registerSchema.safeParse({
			email: "newuser@example.com",
			password: "password123",
		})
		expect(result.success).toBe(true)
	})

	it("rejects invalid registration input", () => {
		const result = registerSchema.safeParse({
			email: "bad-email",
			password: "short",
		})
		expect(result.success).toBe(false)
	})
})
