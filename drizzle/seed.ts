/**
 * Database Seed Script
 *
 * Populates the database with sample data for local development and testing.
 *
 * Usage:
 *   pnpm db:seed
 *
 * This script creates:
 * - 2 test users (admin@test.com, user@test.com)
 * - 5 sample chats with messages
 * - 3 sample artifacts (text, code, image)
 *
 * @module drizzle/seed
 */

import "dotenv/config"

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import {
	type Artifact,
	artifact,
	type Chat,
	chat,
	message,
	suggestion,
	type User,
	user,
} from "../lib/db/schema"

// =============================================================================
// Seed Configuration
// =============================================================================

const TEST_USERS: Array<{
	email: string
	passwordHash: string
}> = [
	{
		email: "admin@test.com",
		passwordHash:
			"$2b$10$EpRnZzU4lM0fGqE0d5hF3OZqX5y8wV0sT7vN1kL2mP4qR6sT8uV0W", // placeholder
	},
	{
		email: "user@test.com",
		passwordHash:
			"$2b$10$EpRnZzU4lM0fGqE0d5hF3OZqX5y8wV0sT7vN1kL2mP4qR6sT8uV0W", // placeholder
	},
]

const SAMPLE_CHATS: Array<{
	title: string
	visibility: "public" | "private"
}> = [
	{ title: "Getting Started with AI", visibility: "public" },
	{ title: "Code Review Discussion", visibility: "private" },
	{ title: "Project Planning", visibility: "private" },
	{ title: "Learning TypeScript", visibility: "public" },
	{ title: "API Design Questions", visibility: "private" },
]

const SAMPLE_MESSAGES: Array<{
	role: "user" | "assistant" | "system"
	parts: unknown
	attachments: unknown
}> = [
	{
		role: "user" as const,
		parts: [{ type: "text", text: "Hello! Can you help me get started?" }],
		attachments: [],
	},
	{
		role: "assistant" as const,
		parts: [
			{
				type: "text",
				text: "Of course! I'm here to help. What would you like to know?",
			},
		],
		attachments: [],
	},
	{
		role: "user" as const,
		parts: [{ type: "text", text: "Tell me about this project." }],
		attachments: [],
	},
	{
		role: "assistant" as const,
		parts: [
			{
				type: "text",
				text: "This is an AI chatbot built with Next.js, featuring multi-model support, artifact management, and real-time streaming.",
			},
		],
		attachments: [],
	},
]

const SAMPLE_ARTIFACTS: Array<{
	title: string
	content: string
	kind: "text" | "code" | "image" | "sheet"
}> = [
	{
		title: "Project README",
		content: `# AI Assistant

A modern AI chatbot with multi-model support.

## Features

- Multi-model AI support
- Real-time streaming
- Artifact management
- User authentication

## Getting Started

\`\`\`bash
pnpm install
pnpm dev
\`\`\`
`,
		kind: "text" as const,
	},
	{
		title: "Example Component",
		content: `import * as React from 'react'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
}

export function Button({ 
  children, 
  onClick, 
  variant = 'primary' 
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={\`btn btn-\${variant}\`}
    >
      {children}
    </button>
  )
}`,
		kind: "code" as const,
	},
	{
		title: "Architecture Diagram",
		content: "https://example.com/diagram.png",
		kind: "image" as const,
	},
]

// =============================================================================
// Seed Functions
// =============================================================================

/**
 * Creates a database connection for seeding
 */
function createSeedClient() {
	const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL

	if (!databaseUrl) {
		throw new Error(
			"DATABASE_URL or POSTGRES_URL environment variable is not set",
		)
	}

	// Use a dedicated connection for seeding (not a pool)
	const client = postgres(databaseUrl, {
		max: 1,
	})

	return drizzle(client, {
		schema: { artifact, chat, message, suggestion, user },
	})
}

/**
 * Seeds the database with sample data
 */
async function seed() {
	console.log("🌱 Starting database seed...")

	const db = createSeedClient()

	try {
		// Check if users already exist
		const existingUsers = await db.select().from(user)

		if (existingUsers.length > 0) {
			console.log("ℹ️  Database already contains data. Skipping seed.")
			console.log(
				"   To re-seed, manually clear the database or use the --force flag",
			)
			return
		}

		// ==========================================================================
		// Create Users
		// ==========================================================================
		console.log("📝 Creating test users...")

		const createdUsers: User[] = []
		for (const testUser of TEST_USERS) {
			const [created] = await db.insert(user).values(testUser).returning()
			createdUsers.push(created)
			console.log(`   ✓ Created user: ${created.email}`)
		}

		// ==========================================================================
		// Create Chats with Messages
		// ==========================================================================
		console.log("💬 Creating sample chats...")

		const createdChats: Chat[] = []
		for (const [index, sampleChat] of SAMPLE_CHATS.entries()) {
			const userId = createdUsers[index % createdUsers.length]?.id

			const [chatCreated] = await db
				.insert(chat)
				.values({
					title: sampleChat.title,
					visibility: sampleChat.visibility,
					userId,
				})
				.returning()

			createdChats.push(chatCreated)
			console.log(`   ✓ Created chat: ${chatCreated.title}`)

			// Add messages to each chat
			for (const sampleMessage of SAMPLE_MESSAGES) {
				await db.insert(message).values({
					chatId: chatCreated.id,
					role: sampleMessage.role,
					parts: sampleMessage.parts,
					attachments: sampleMessage.attachments,
				})
			}
			console.log(`   ✓ Added ${SAMPLE_MESSAGES.length} messages to chat`)
		}

		// ==========================================================================
		// Create Artifacts
		// ==========================================================================
		console.log("🎨 Creating sample artifacts...")

		const createdArtifacts: Artifact[] = []
		for (const [index, sampleArtifact] of SAMPLE_ARTIFACTS.entries()) {
			const chatId = createdChats[index % createdChats.length]?.id
			const userId = createdUsers[index % createdUsers.length]?.id

			const [artifactCreated] = await db
				.insert(artifact)
				.values({
					title: sampleArtifact.title,
					content: sampleArtifact.content,
					kind: sampleArtifact.kind,
					chatId,
					userId,
				})
				.returning()

			createdArtifacts.push(artifactCreated)
			console.log(
				`   ✓ Created artifact: ${artifactCreated.title} (${artifactCreated.kind})`,
			)
		}

		// ==========================================================================
		// Create Suggestions for Artifacts
		// ==========================================================================
		console.log("💡 Creating sample suggestions...")

		const textArtifact = createdArtifacts.find((a) => a.kind === "text")
		if (textArtifact) {
			await db.insert(suggestion).values({
				artifactId: textArtifact.id,
				artifactCreatedAt: textArtifact.createdAt,
				originalText: "# AI Assistant",
				suggestedText: "# AI Assistant - Next.js Chatbot",
				description: "Add more descriptive title",
				userId: createdUsers[0]?.id,
			})
			console.log("   ✓ Created suggestion for text artifact")
		}

		// ==========================================================================
		// Summary
		// ==========================================================================
		console.log("\n✅ Database seed completed successfully!")
		console.log("\n📊 Summary:")
		console.log(`   Users: ${createdUsers.length}`)
		console.log(`   Chats: ${createdChats.length}`)
		console.log(`   Artifacts: ${createdArtifacts.length}`)
		console.log("\n🔐 Test Credentials:")
		console.log("   admin@test.com (password: see passwordHash in seed)")
		console.log("   user@test.com (password: see passwordHash in seed)")
	} catch (error) {
		console.error("❌ Seed failed:", error)
		throw error
	} finally {
		// Close the connection
		await db.$client.end()
	}
}

// =============================================================================
// Main Execution
// =============================================================================

seed().catch((error) => {
	console.error("Fatal error during seed:", error)
	process.exit(1)
})
