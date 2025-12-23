/**
 * Database Seeding Utilities
 *
 * Provides test data constants and seeding functions for consistent
 * test data across integration and e2e tests.
 *
 * @module tests/utils/seed
 */

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type {
    Chat,
    Database,
    Document,
    Message,
    NewChat,
    NewDocument,
    NewMessage,
    NewUser,
    User,
} from "@/lib/db";
import { getDb, schema } from "@/lib/db";

// =============================================================================
// TEST DATA CONSTANTS
// =============================================================================

/**
 * Default test user for seeding
 */
export const TEST_USER: {
    id: string;
    email: string;
    password: string;
} = {
    id: "test-user-001",
    email: "test@example.com",
    password: "testpassword123",
};

/**
 * Default test chat for seeding
 */
export const TEST_CHAT: {
    id: string;
    title: string;
    createdAt: Date;
} = {
    id: "test-chat-001",
    title: "Test Chat",
    createdAt: new Date("2024-01-01T00:00:00Z"),
};

/**
 * Default test message for seeding
 */
export const TEST_MESSAGE: {
    id: string;
    chatId: string;
    role: "user" | "assistant" | "system";
    parts: Array<{ type: string; text: string }>;
    createdAt: Date;
} = {
    id: "test-message-001",
    chatId: "test-chat-001",
    role: "user",
    parts: [{ type: "text", text: "Hello test" }],
    createdAt: new Date("2024-01-01T00:00:01Z"),
};

/**
 * Default test document for seeding
 */
export const TEST_DOCUMENT: {
    id: string;
    title: string;
    content: string;
    kind: "text" | "code" | "image" | "sheet";
    createdAt: Date;
} = {
    id: "test-document-001",
    title: "Test Document",
    content: "Test document content",
    kind: "text",
    createdAt: new Date("2024-01-01T00:00:02Z"),
};

// =============================================================================
// SEEDING FUNCTIONS
// =============================================================================

/**
 * Get database instance, using provided or default
 */
function getDatabase(db?: Database): Database {
    return db ?? getDb();
}

/**
 * Seeds a test user into the database
 * Idempotent: Uses onConflictDoNothing for safe re-runs
 *
 * @param data - Optional user data overrides
 * @param db - Optional database instance
 * @returns The seeded user
 */
export async function seedTestUser(
    data: Partial<typeof TEST_USER> = {},
    db?: Database
): Promise<User> {
    const database = getDatabase(db);
    const userId = data.id ?? TEST_USER.id;
    const email = data.email ?? `test-${Date.now()}@example.com`;

    const newUser: NewUser = {
        id: userId,
        email,
        passwordHash: data.password ?? TEST_USER.password,
    };

    // Upsert: insert or return existing
    const [user] = await database
        .insert(schema.user)
        .values(newUser)
        .onConflictDoNothing()
        .returning();

    // If conflict, fetch existing
    if (!user) {
        const [existing] = await database
            .select()
            .from(schema.user)
            .where(eq(schema.user.id, userId));

        if (!existing) {
            throw new Error(`Failed to seed user: ${userId}`);
        }
        return existing;
    }

    return user;
}

/**
 * Seeds a test chat into the database
 * Idempotent: Uses onConflictDoNothing for safe re-runs
 *
 * @param userId - Owner user ID
 * @param data - Optional chat data overrides
 * @param db - Optional database instance
 * @returns The seeded chat
 */
export async function seedTestChat(
    userId: string,
    data: Partial<typeof TEST_CHAT> = {},
    db?: Database
): Promise<Chat> {
    const database = getDatabase(db);
    const chatId = data.id ?? TEST_CHAT.id;

    const newChat: NewChat = {
        id: chatId,
        userId,
        title: data.title ?? TEST_CHAT.title,
        visibility: "private",
    };

    // Upsert: insert or return existing
    const [chat] = await database
        .insert(schema.chat)
        .values(newChat)
        .onConflictDoNothing()
        .returning();

    // If conflict, fetch existing
    if (!chat) {
        const [existing] = await database
            .select()
            .from(schema.chat)
            .where(eq(schema.chat.id, chatId));

        if (!existing) {
            throw new Error(`Failed to seed chat: ${chatId}`);
        }
        return existing;
    }

    return chat;
}

/**
 * Seeds test messages into the database
 *
 * @param chatId - Chat to add messages to
 * @param count - Number of messages to create (default: 3)
 * @param db - Optional database instance
 * @returns Array of seeded messages
 */
export async function seedTestMessages(
    chatId: string,
    count = 3,
    db?: Database
): Promise<Message[]> {
    const database = getDatabase(db);
    const messages: NewMessage[] = [];

    for (let i = 0; i < count; i++) {
        const isUser = i % 2 === 0;
        const baseTime = TEST_MESSAGE.createdAt.getTime();

        messages.push({
            id: `${TEST_MESSAGE.id}-${i}`,
            chatId,
            role: isUser ? "user" : "assistant",
            parts: [
                {
                    type: "text",
                    text: isUser
                        ? `User message ${i + 1}`
                        : `Assistant response ${i + 1}`,
                },
            ],
            attachments: [],
            createdAt: new Date(baseTime + i * 1000),
        });
    }

    // Insert all messages
    const result = await database
        .insert(schema.message)
        .values(messages)
        .onConflictDoNothing()
        .returning();

    // If some conflicts, fetch all by chatId
    if (result.length < count) {
        const existing = await database
            .select()
            .from(schema.message)
            .where(eq(schema.message.chatId, chatId));
        return existing;
    }

    return result;
}

/**
 * Seeds a test document into the database
 *
 * @param userId - Owner user ID
 * @param chatId - Associated chat ID
 * @param data - Optional document data overrides
 * @param db - Optional database instance
 * @returns The seeded document
 */
export async function seedTestDocument(
    userId: string,
    chatId: string,
    data: Partial<typeof TEST_DOCUMENT> = {},
    db?: Database
): Promise<Document> {
    const database = getDatabase(db);

    const newDocument: NewDocument = {
        id: data.id ?? TEST_DOCUMENT.id,
        userId,
        chatId,
        title: data.title ?? TEST_DOCUMENT.title,
        content: data.content ?? TEST_DOCUMENT.content,
        kind: data.kind ?? TEST_DOCUMENT.kind,
    };

    // Documents use composite PK (id, createdAt), so insert directly
    const [document] = await database
        .insert(schema.document)
        .values(newDocument)
        .returning();

    if (!document) {
        throw new Error(`Failed to seed document: ${newDocument.id}`);
    }

    return document;
}

// =============================================================================
// CLEANUP FUNCTIONS
// =============================================================================

/**
 * Cleans up all test data from the database
 * Deletes in correct order to respect foreign key constraints
 *
 * @param db - Optional database instance
 */
export async function cleanupTestData(db?: Database): Promise<void> {
    const database = getDatabase(db);

    // Delete in FK-safe order
    // 1. Suggestions (references documents)
    await database
        .delete(schema.suggestion)
        .where(eq(schema.suggestion.userId, TEST_USER.id));

    // 2. Votes (references messages, chats, users)
    await database
        .delete(schema.vote)
        .where(eq(schema.vote.userId, TEST_USER.id));

    // 3. Documents (references chats, users)
    await database
        .delete(schema.document)
        .where(eq(schema.document.userId, TEST_USER.id));

    // 4. Messages (references chats)
    await database
        .delete(schema.message)
        .where(eq(schema.message.chatId, TEST_CHAT.id));

    // 5. Chats (references users)
    await database
        .delete(schema.chat)
        .where(eq(schema.chat.userId, TEST_USER.id));

    // 6. Users (root table)
    await database.delete(schema.user).where(eq(schema.user.id, TEST_USER.id));
}

/**
 * Cleans up test data for a specific user
 *
 * @param userId - User ID to clean up
 * @param db - Optional database instance
 */
export async function cleanupTestUser(
    userId: string,
    db?: Database
): Promise<void> {
    const database = getDatabase(db);

    // Get all chats for user to clean up messages
    const userChats = await database
        .select({ id: schema.chat.id })
        .from(schema.chat)
        .where(eq(schema.chat.userId, userId));

    const chatIds = userChats.map((c: { id: string }) => c.id);

    // Delete in FK-safe order
    await database
        .delete(schema.suggestion)
        .where(eq(schema.suggestion.userId, userId));

    await database.delete(schema.vote).where(eq(schema.vote.userId, userId));

    await database
        .delete(schema.document)
        .where(eq(schema.document.userId, userId));

    // Delete messages for all user's chats
    for (const chatId of chatIds) {
        await database
            .delete(schema.message)
            .where(eq(schema.message.chatId, chatId));
    }

    await database.delete(schema.chat).where(eq(schema.chat.userId, userId));

    await database.delete(schema.user).where(eq(schema.user.id, userId));
}

/**
 * Cleans up a specific chat and its related data
 *
 * @param chatId - Chat ID to clean up
 * @param db - Optional database instance
 */
export async function cleanupTestChat(
    chatId: string,
    db?: Database
): Promise<void> {
    const database = getDatabase(db);

    // Delete in FK-safe order
    await database.delete(schema.vote).where(eq(schema.vote.chatId, chatId));

    await database
        .delete(schema.document)
        .where(eq(schema.document.chatId, chatId));

    await database
        .delete(schema.message)
        .where(eq(schema.message.chatId, chatId));

    await database.delete(schema.chat).where(eq(schema.chat.id, chatId));
}

// =============================================================================
// COMPOSITE SEEDERS
// =============================================================================

/**
 * Result type for complete test scenario
 */
export type TestScenario = {
    user: User;
    chat: Chat;
    messages: Message[];
    document: Document;
};

/**
 * Seeds a complete test scenario with user, chat, messages, and document
 *
 * @param options - Optional configuration
 * @param db - Optional database instance
 * @returns Complete test scenario data
 */
export async function seedCompleteTestScenario(
    options: {
        userId?: string;
        chatId?: string;
        messageCount?: number;
    } = {},
    db?: Database
): Promise<TestScenario> {
    const database = getDatabase(db);
    const userId = options.userId ?? randomUUID();
    const chatId = options.chatId ?? randomUUID();
    const messageCount = options.messageCount ?? 3;

    // Seed in dependency order
    const user = await seedTestUser({ id: userId }, database);
    const chat = await seedTestChat(userId, { id: chatId }, database);
    const messages = await seedTestMessages(chatId, messageCount, database);
    const document = await seedTestDocument(userId, chatId, {}, database);

    return { user, chat, messages, document };
}

/**
 * Seeds multiple chats with messages for load testing
 *
 * @param userId - User ID (will be created if not exists)
 * @param chatCount - Number of chats to create
 * @param messagesPerChat - Messages per chat
 * @param db - Optional database instance
 * @returns Array of chat IDs created
 */
export async function seedMultipleChats(
    userId: string,
    chatCount: number,
    messagesPerChat = 5,
    db?: Database
): Promise<string[]> {
    const database = getDatabase(db);
    const chatIds: string[] = [];

    // Ensure user exists
    await seedTestUser({ id: userId }, database);

    for (let i = 0; i < chatCount; i++) {
        const chatId = `test-chat-bulk-${i}-${Date.now()}`;
        await seedTestChat(
            userId,
            { id: chatId, title: `Bulk Test Chat ${i + 1}` },
            database
        );
        await seedTestMessages(chatId, messagesPerChat, database);
        chatIds.push(chatId);
    }

    return chatIds;
}

/**
 * Creates a unique test user for isolated tests
 * Use this when tests need their own isolated user
 *
 * @param db - Optional database instance
 * @returns Unique test user
 */
export async function seedIsolatedTestUser(db?: Database): Promise<User> {
    const uniqueId = randomUUID();
    return seedTestUser(
        {
            id: uniqueId,
            email: `test-${uniqueId}@example.com`,
        },
        db
    );
}
