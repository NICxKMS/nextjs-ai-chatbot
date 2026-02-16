/**
 * Test Data Fixtures
 *
 * Provides test data for users, chats, messages, and artifacts.
 * Use these fixtures for consistent test data across unit and integration tests.
 *
 * @module src/test/fixtures
 */

import type {
	Artifact,
	Chat,
	Message,
	NewArtifact,
	NewChat,
	NewMessage,
	NewUser,
	NewVote,
	User,
	Vote,
} from "@/lib/db/schema"

// =============================================================================
// User Fixtures
// =============================================================================

/**
 * Test user fixtures
 */
export const userFixtures = {
	/**
	 * Standard test user
	 */
	testUser: {
		id: "00000000-0000-0000-0000-000000000001",
		email: "test@example.com",
		passwordHash: "$2b$10$test-hashed-password",
		createdAt: new Date("2024-01-01T00:00:00Z"),
		lastLogin: new Date("2024-01-15T12:00:00Z"),
	} as User,

	/**
	 * Admin test user
	 */
	adminUser: {
		id: "00000000-0000-0000-0000-000000000002",
		email: "admin@example.com",
		passwordHash: "$2b$10$admin-hashed-password",
		createdAt: new Date("2024-01-01T00:00:00Z"),
		lastLogin: new Date("2024-01-15T12:00:00Z"),
	} as User,

	/**
	 * Guest user
	 */
	guestUser: {
		id: "00000000-0000-0000-0000-000000000003",
		email: "guest@example.com",
		passwordHash: null,
		createdAt: new Date("2024-01-01T00:00:00Z"),
		lastLogin: null,
	} as User,

	/**
	 * Create a new user with custom data
	 */
	createUser: (overrides: Partial<NewUser> = {}): NewUser => ({
		email: "newuser@example.com",
		passwordHash: "$2b$10$new-user-password",
		...overrides,
	}),
}

// =============================================================================
// Chat Fixtures
// =============================================================================

/**
 * Test chat fixtures
 */
export const chatFixtures = {
	/**
	 * Standard test chat
	 */
	testChat: {
		id: "10000000-0000-0000-0000-000000000001",
		createdAt: new Date("2024-01-10T10:00:00Z"),
		updatedAt: new Date("2024-01-10T11:00:00Z"),
		title: "Test Chat",
		userId: "00000000-0000-0000-0000-000000000001",
		visibility: "private" as const,
		lastContext: null,
	} as Chat,

	/**
	 * Public chat
	 */
	publicChat: {
		id: "10000000-0000-0000-0000-000000000002",
		createdAt: new Date("2024-01-11T10:00:00Z"),
		updatedAt: new Date("2024-01-11T11:00:00Z"),
		title: "Public Chat",
		userId: "00000000-0000-0000-0000-000000000001",
		visibility: "public" as const,
		lastContext: null,
	} as Chat,

	/**
	 * Empty chat (no messages)
	 */
	emptyChat: {
		id: "10000000-0000-0000-0000-000000000003",
		createdAt: new Date("2024-01-12T10:00:00Z"),
		updatedAt: new Date("2024-01-12T10:00:00Z"),
		title: "New Chat",
		userId: "00000000-0000-0000-0000-000000000001",
		visibility: "private" as const,
		lastContext: null,
	} as Chat,

	/**
	 * Create a new chat with custom data
	 */
	createChat: (overrides: Partial<NewChat> = {}): NewChat => ({
		title: "New Chat",
		userId: "00000000-0000-0000-0000-000000000001",
		visibility: "private" as const,
		...overrides,
	}),
}

// =============================================================================
// Message Fixtures
// =============================================================================

/**
 * Message part types for structured content
 */
export type MessagePart =
	| { type: "text"; text: string }
	| { type: "image"; image: string }
	| {
			type: "tool-call"
			toolCallId: string
			toolName: string
			args: Record<string, unknown>
	  }
	| { type: "tool-result"; toolCallId: string; result: unknown }

/**
 * Test message fixtures
 */
export const messageFixtures = {
	/**
	 * User message
	 */
	userMessage: {
		id: "20000000-0000-0000-0000-000000000001",
		chatId: "10000000-0000-0000-0000-000000000001",
		role: "user" as const,
		parts: [
			{ type: "text", text: "Hello, can you help me?" },
		] as MessagePart[],
		attachments: [],
		createdAt: new Date("2024-01-10T10:00:00Z"),
	} as Message,

	/**
	 * Assistant message
	 */
	assistantMessage: {
		id: "20000000-0000-0000-0000-000000000002",
		chatId: "10000000-0000-0000-0000-000000000001",
		role: "assistant" as const,
		parts: [
			{
				type: "text",
				text: "Of course! I'm here to help. What do you need?",
			},
		] as MessagePart[],
		attachments: [],
		createdAt: new Date("2024-01-10T10:01:00Z"),
	} as Message,

	/**
	 * System message
	 */
	systemMessage: {
		id: "20000000-0000-0000-0000-000000000003",
		chatId: "10000000-0000-0000-0000-000000000001",
		role: "system" as const,
		parts: [
			{ type: "text", text: "You are a helpful assistant." },
		] as MessagePart[],
		attachments: [],
		createdAt: new Date("2024-01-10T09:59:00Z"),
	} as Message,

	/**
	 * Message with tool call
	 */
	toolCallMessage: {
		id: "20000000-0000-0000-0000-000000000004",
		chatId: "10000000-0000-0000-0000-000000000001",
		role: "assistant" as const,
		parts: [
			{ type: "text", text: "Let me check the weather for you." },
			{
				type: "tool-call",
				toolCallId: "tool-call-001",
				toolName: "weather",
				args: { location: "New York" },
			},
		] as MessagePart[],
		attachments: [],
		createdAt: new Date("2024-01-10T10:02:00Z"),
	} as Message,

	/**
	 * Message with tool result
	 */
	toolResultMessage: {
		id: "20000000-0000-0000-0000-000000000005",
		chatId: "10000000-0000-0000-0000-000000000001",
		role: "tool" as const,
		parts: [
			{
				type: "tool-result",
				toolCallId: "tool-call-001",
				result: {
					location: "New York",
					temperature: 72,
					condition: "sunny",
				},
			},
		] as MessagePart[],
		attachments: [],
		createdAt: new Date("2024-01-10T10:02:30Z"),
	} as unknown as Message,

	/**
	 * Message with image attachment
	 */
	imageMessage: {
		id: "20000000-0000-0000-0000-000000000006",
		chatId: "10000000-0000-0000-0000-000000000001",
		role: "user" as const,
		parts: [
			{ type: "text", text: "What's in this image?" },
		] as MessagePart[],
		attachments: [
			{
				name: "test-image.png",
				contentType: "image/png",
				url: "https://example.com/test-image.png",
			},
		],
		createdAt: new Date("2024-01-10T10:03:00Z"),
	} as Message,

	/**
	 * Create a new message with custom data
	 */
	createMessage: (overrides: Partial<NewMessage> = {}): NewMessage => ({
		chatId: "10000000-0000-0000-0000-000000000001",
		role: "user" as const,
		parts: [{ type: "text", text: "Test message" }] as MessagePart[],
		attachments: [],
		...overrides,
	}),
}

// =============================================================================
// Artifact Fixtures
// =============================================================================

/**
 * Test artifact fixtures
 */
export const artifactFixtures = {
	/**
	 * Text artifact
	 */
	textArtifact: {
		id: "30000000-0000-0000-0000-000000000001",
		createdAt: new Date("2024-01-10T10:05:00Z"),
		updatedAt: new Date("2024-01-10T10:05:00Z"),
		chatId: "10000000-0000-0000-0000-000000000001",
		kind: "text" as const,
		title: "Sample Document",
		content:
			"# Sample Document\n\nThis is a sample text document for testing.",
		userId: "00000000-0000-0000-0000-000000000001",
	} as Artifact,

	/**
	 * Code artifact
	 */
	codeArtifact: {
		id: "30000000-0000-0000-0000-000000000002",
		createdAt: new Date("2024-01-10T10:10:00Z"),
		updatedAt: new Date("2024-01-10T10:10:00Z"),
		chatId: "10000000-0000-0000-0000-000000000001",
		kind: "code" as const,
		title: "Sample Code",
		content: "function hello() {\n  console.log('Hello, World!');\n}",
		userId: "00000000-0000-0000-0000-000000000001",
	} as Artifact,

	/**
	 * Image artifact
	 */
	imageArtifact: {
		id: "30000000-0000-0000-0000-000000000003",
		createdAt: new Date("2024-01-10T10:15:00Z"),
		updatedAt: new Date("2024-01-10T10:15:00Z"),
		chatId: "10000000-0000-0000-0000-000000000001",
		kind: "image" as const,
		title: "Sample Image",
		content: "https://example.com/generated-image.png",
		userId: "00000000-0000-0000-0000-000000000001",
	} as Artifact,

	/**
	 * Sheet artifact
	 */
	sheetArtifact: {
		id: "30000000-0000-0000-0000-000000000004",
		createdAt: new Date("2024-01-10T10:20:00Z"),
		updatedAt: new Date("2024-01-10T10:20:00Z"),
		chatId: "10000000-0000-0000-0000-000000000001",
		kind: "sheet" as const,
		title: "Sample Spreadsheet",
		content: "A,B,C\n1,2,3\n4,5,6",
		userId: "00000000-0000-0000-0000-000000000001",
	} as Artifact,

	/**
	 * Create a new artifact with custom data
	 */
	createArtifact: (overrides: Partial<NewArtifact> = {}): NewArtifact => ({
		chatId: "10000000-0000-0000-0000-000000000001",
		kind: "text" as const,
		title: "New Artifact",
		content: "",
		userId: "00000000-0000-0000-0000-000000000001",
		...overrides,
	}),
}

// =============================================================================
// Vote Fixtures
// =============================================================================

/**
 * Test vote fixtures
 */
export const voteFixtures = {
	/**
	 * Upvote
	 */
	upvote: {
		chatId: "10000000-0000-0000-0000-000000000001",
		messageId: "20000000-0000-0000-0000-000000000002",
		userId: "00000000-0000-0000-0000-000000000001",
		isUpvoted: true,
	} as Vote,

	/**
	 * Downvote
	 */
	downvote: {
		chatId: "10000000-0000-0000-0000-000000000001",
		messageId: "20000000-0000-0000-0000-000000000002",
		userId: "00000000-0000-0000-0000-000000000002",
		isUpvoted: false,
	} as Vote,

	/**
	 * Create a new vote with custom data
	 */
	createVote: (overrides: Partial<NewVote> = {}): NewVote => ({
		chatId: "10000000-0000-0000-0000-000000000001",
		messageId: "20000000-0000-0000-0000-000000000002",
		userId: "00000000-0000-0000-0000-000000000001",
		isUpvoted: true,
		...overrides,
	}),
}

// =============================================================================
// Complete Test Scenarios
// =============================================================================

/**
 * Complete test scenario with user, chat, and messages
 */
export const testScenario = {
	user: userFixtures.testUser,
	chat: chatFixtures.testChat,
	messages: [
		messageFixtures.systemMessage,
		messageFixtures.userMessage,
		messageFixtures.assistantMessage,
	],
	artifacts: [artifactFixtures.textArtifact],
}

/**
 * Multi-user test scenario
 */
export const multiUserScenario = {
	users: [
		userFixtures.testUser,
		userFixtures.adminUser,
		userFixtures.guestUser,
	],
	chats: [chatFixtures.testChat, chatFixtures.publicChat],
	messages: [messageFixtures.userMessage, messageFixtures.assistantMessage],
}

// =============================================================================
// Fixture Index Export
// =============================================================================

export const fixtures = {
	user: userFixtures,
	chat: chatFixtures,
	message: messageFixtures,
	artifact: artifactFixtures,
	vote: voteFixtures,
	scenarios: {
		test: testScenario,
		multiUser: multiUserScenario,
	},
}

export default fixtures
