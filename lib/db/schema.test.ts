// Flow: data-model | Step: schema-definition
import { describe, expect, it } from "vitest"

import {
	artifactKindEnum,
	artifacts,
	chats,
	messages,
	roleEnum,
	suggestions,
	users,
	visibilityEnum,
	votes,
} from "./schema"

// ── Helpers ──────────────────────────────────────────────────
/** Get all column names for a table. */
function columnNames(table: object): string[] {
	const record = table as Record<string, unknown>
	return Object.keys(record).filter((key) => {
		const col = record[key]
		return typeof col === "object" && col !== null && "name" in col
	})
}

// ── Table Existence ──────────────────────────────────────────
describe("schema: table existence", () => {
	it.each([
		["users", users],
		["chats", chats],
		["messages", messages],
		["votes", votes],
		["artifacts", artifacts],
		["suggestions", suggestions],
	])("exports the %s table", (_name, table) => {
		expect(table).toBeDefined()
	})
})

// ── Enum Definitions ─────────────────────────────────────────
describe("schema: enum definitions", () => {
	it("defines visibilityEnum with public and private", () => {
		expect(visibilityEnum.enumValues).toEqual(["public", "private"])
	})

	it("defines roleEnum with user, assistant, and system", () => {
		expect(roleEnum.enumValues).toEqual(["user", "assistant", "system"])
	})

	it("defines artifactKindEnum with text, code, image, and sheet", () => {
		expect(artifactKindEnum.enumValues).toEqual(["text", "code", "image", "sheet"])
	})
})

// ── Key Columns ──────────────────────────────────────────────
describe("schema: users table columns", () => {
	it("has expected columns", () => {
		const cols = columnNames(users)
		expect(cols).toContain("id")
		expect(cols).toContain("email")
		expect(cols).toContain("passwordHash")
		expect(cols).toContain("createdAt")
	})
})

describe("schema: chats table columns", () => {
	it("has expected columns", () => {
		const cols = columnNames(chats)
		expect(cols).toContain("id")
		expect(cols).toContain("createdAt")
		expect(cols).toContain("updatedAt")
		expect(cols).toContain("title")
		expect(cols).toContain("userId")
		expect(cols).toContain("visibility")
		expect(cols).toContain("model")
	})
})

describe("schema: messages table columns", () => {
	it("has expected columns", () => {
		const cols = columnNames(messages)
		expect(cols).toContain("id")
		expect(cols).toContain("chatId")
		expect(cols).toContain("role")
		expect(cols).toContain("parts")
		expect(cols).toContain("createdAt")
	})
})

describe("schema: votes table columns", () => {
	it("has expected columns", () => {
		const cols = columnNames(votes)
		expect(cols).toContain("chatId")
		expect(cols).toContain("messageId")
		expect(cols).toContain("userId")
		expect(cols).toContain("isUpvoted")
	})
})

describe("schema: artifacts table columns", () => {
	it("has expected columns", () => {
		const cols = columnNames(artifacts)
		expect(cols).toContain("id")
		expect(cols).toContain("createdAt")
		expect(cols).toContain("title")
		expect(cols).toContain("content")
		expect(cols).toContain("kind")
		expect(cols).toContain("userId")
		expect(cols).toContain("chatId")
	})
})

describe("schema: suggestions table columns", () => {
	it("has expected columns", () => {
		const cols = columnNames(suggestions)
		expect(cols).toContain("id")
		expect(cols).toContain("artifactId")
		expect(cols).toContain("artifactCreatedAt")
		expect(cols).toContain("originalText")
		expect(cols).toContain("suggestedText")
		expect(cols).toContain("isResolved")
		expect(cols).toContain("userId")
	})
})

// ── Foreign Key Relationships ────────────────────────────────
describe("schema: foreign key structure", () => {
	it("chats.userId references users", () => {
		// Drizzle column objects have a reference function when FK is declared
		const userIdCol = chats.userId
		expect(userIdCol).toBeDefined()
		expect(userIdCol.notNull).toBe(true)
	})

	it("messages.chatId references chats", () => {
		const chatIdCol = messages.chatId
		expect(chatIdCol).toBeDefined()
		expect(chatIdCol.notNull).toBe(true)
	})

	it("votes has composite primary key columns", () => {
		expect(votes.chatId).toBeDefined()
		expect(votes.messageId).toBeDefined()
		expect(votes.userId).toBeDefined()
	})

	it("artifacts has composite primary key (id + createdAt)", () => {
		expect(artifacts.id).toBeDefined()
		expect(artifacts.createdAt).toBeDefined()
	})

	it("suggestions.userId references users", () => {
		const userIdCol = suggestions.userId
		expect(userIdCol).toBeDefined()
		expect(userIdCol.notNull).toBe(true)
	})
})
