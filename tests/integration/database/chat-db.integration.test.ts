/**
 * Chat Database Integration Tests
 * Tests chat data layer operations with real PostgreSQL instance
 *
 * Run with: TEST_USE_REAL_DB=true pnpm test:integration
 *
 * @module tests/integration/database/chat-db.integration.test
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { describeIf, isServiceAvailable } from "../../config/test-config";
import type { DataContext } from "@/lib/data/types";

// Valid UUIDs for non-existent resource tests (Postgres requires valid UUID format)
const NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000000000";
const OTHER_USER_UUID = "11111111-1111-1111-1111-111111111111";

// Only run these tests when real database is available (flag + DATABASE_URL)
describeIf(
    isServiceAvailable("database"),
    "Chat Database Integration Tests",
    () => {
        // Import real modules
        let chatData: typeof import("@/lib/data/chat");
        let db: Awaited<ReturnType<typeof import("@/lib/db").getDb>>;
        let schema: typeof import("@/lib/db").schema;

        // Use unique test UUID to avoid conflicts (must be valid UUID format)
        const TEST_USER_ID = randomUUID();
        const TEST_CHAT_IDS: string[] = [];

        const testCtx: DataContext = {
            userId: TEST_USER_ID,
            userType: "regular",
        };

        // Track whether test setup succeeded
        let testSetupSucceeded = false;

        beforeAll(async () => {
            chatData = await import("@/lib/data/chat");
            const dbModule = await import("@/lib/db");
            db = dbModule.getDb();
            schema = dbModule.schema;

            try {
                // Try to create test user
                // Note: This may fail if User table has FK to auth.users (Supabase)
                await db
                    .insert(schema.user)
                    .values({
                        id: TEST_USER_ID,
                        email: `test-${Date.now()}@integration-test.local`,
                    })
                    .onConflictDoNothing();
                testSetupSucceeded = true;
            } catch (error) {
                // If user creation fails (e.g., FK constraint to Supabase auth.users),
                // try to use an existing user instead
                console.warn("Could not create test user (may need Supabase auth):", error);
                
                // Try to find an existing user to use for tests
                const existingUsers = await db.select().from(schema.user).limit(1);
                if (existingUsers.length > 0) {
                    // Update TEST_USER_ID to use existing user
                    (testCtx as { userId: string }).userId = existingUsers[0].id;
                    testSetupSucceeded = true;
                } else {
                    console.warn("No existing users found - chat-db tests will be skipped");
                }
            }
        });

        afterAll(async () => {
            // Clean up all test chats
            if (db && schema && TEST_CHAT_IDS.length > 0) {
                for (const chatId of TEST_CHAT_IDS) {
                    try {
                        // Delete messages and votes first (foreign key constraints)
                        await db
                            .delete(schema.vote)
                            .where(
                                require("drizzle-orm").eq(
                                    schema.vote.chatId,
                                    chatId
                                )
                            );
                        await db
                            .delete(schema.message)
                            .where(
                                require("drizzle-orm").eq(
                                    schema.message.chatId,
                                    chatId
                                )
                            );
                        await db
                            .delete(schema.chat)
                            .where(
                                require("drizzle-orm").eq(
                                    schema.chat.id,
                                    chatId
                                )
                            );
                    } catch {
                        // Ignore cleanup errors
                    }
                }
            }

            // Clean up test user - only if we created one (not using existing)
            if (db && schema && testSetupSucceeded) {
                try {
                    // Only delete user if we created it (not an existing one)
                    // Check if the user ID matches what we generated
                    if (testCtx.userId === TEST_USER_ID) {
                        await db
                            .delete(schema.user)
                            .where(
                                require("drizzle-orm").eq(
                                    schema.user.id,
                                    TEST_USER_ID
                                )
                            );
                    }
                } catch {
                    // Ignore cleanup errors
                }
            }
        });

        // Helper to skip test if setup failed
        function skipIfNoSetup() {
            if (!testSetupSucceeded) {
                console.log("Skipping test - no valid user available");
                return true;
            }
            return false;
        }

        describe("createChat", () => {
            it("creates a new chat with default visibility", async () => {
                if (skipIfNoSetup()) return;
                
                const chat = await chatData.createChat(
                    {
                        title: "Integration Test Chat - Default",
                    },
                    testCtx
                );

                expect(chat).toBeDefined();
                expect(chat.id).toBeDefined();
                expect(chat.title).toBe("Integration Test Chat - Default");
                expect(chat.userId).toBe(testCtx.userId);
                expect(chat.visibility).toBe("private");

                // Track for cleanup
                TEST_CHAT_IDS.push(chat.id);
            });

            it("creates a chat with public visibility", async () => {
                const chat = await chatData.createChat(
                    {
                        title: "Integration Test Chat - Public",
                        visibility: "public",
                    },
                    testCtx
                );

                expect(chat).toBeDefined();
                expect(chat.visibility).toBe("public");

                // Track for cleanup
                TEST_CHAT_IDS.push(chat.id);
            });
        });

        describe("getChat", () => {
            it("retrieves an existing chat", async () => {
                // Create a chat first
                const created = await chatData.createChat(
                    { title: "Get Test Chat" },
                    testCtx
                );
                TEST_CHAT_IDS.push(created.id);

                // Retrieve it
                const chat = await chatData.getChat(created.id, testCtx);

                expect(chat).toBeDefined();
                expect(chat?.id).toBe(created.id);
                expect(chat?.title).toBe("Get Test Chat");
            });

            it("returns null for non-existent chat", async () => {
                const chat = await chatData.getChat(
                    NON_EXISTENT_UUID,
                    testCtx
                );
                expect(chat).toBeNull();
            });

            it("returns null for chat owned by different user", async () => {
                // Create a chat
                const created = await chatData.createChat(
                    { title: "Other User Chat" },
                    testCtx
                );
                TEST_CHAT_IDS.push(created.id);

                // Try to access with different user (must be valid UUID for Postgres)
                const otherCtx: DataContext = {
                    userId: OTHER_USER_UUID,
                    userType: "regular",
                };

                const chat = await chatData.getChat(created.id, otherCtx);
                expect(chat).toBeNull();
            });
        });

        describe("updateChatTitle", () => {
            it("updates chat title", async () => {
                // Create a chat
                const created = await chatData.createChat(
                    { title: "Original Title" },
                    testCtx
                );
                TEST_CHAT_IDS.push(created.id);

                // Update title
                const updated = await chatData.updateChatTitle(
                    created.id,
                    "Updated Title",
                    testCtx
                );

                expect(updated).toBeDefined();
                expect(updated?.title).toBe("Updated Title");

                // Verify the update persisted
                const chat = await chatData.getChat(created.id, testCtx);
                expect(chat?.title).toBe("Updated Title");
            });

            it("returns null when updating non-existent chat", async () => {
                const result = await chatData.updateChatTitle(
                    NON_EXISTENT_UUID,
                    "New Title",
                    testCtx
                );
                expect(result).toBeNull();
            });
        });

        describe("updateChatVisibility", () => {
            it("updates chat visibility", async () => {
                // Create a private chat
                const created = await chatData.createChat(
                    { title: "Visibility Test", visibility: "private" },
                    testCtx
                );
                TEST_CHAT_IDS.push(created.id);

                // Update to public
                const updated = await chatData.updateChatVisibility(
                    created.id,
                    "public",
                    testCtx
                );

                expect(updated).toBeDefined();
                expect(updated?.visibility).toBe("public");
            });
        });

        describe("listChats", () => {
            it("lists chats for user", async () => {
                // Ensure at least one chat exists
                const created = await chatData.createChat(
                    { title: "List Test Chat" },
                    testCtx
                );
                TEST_CHAT_IDS.push(created.id);

                const result = await chatData.listChats(testCtx, { limit: 10 });

                expect(result).toBeDefined();
                expect(result.items).toBeInstanceOf(Array);
                expect(result.items.length).toBeGreaterThan(0);

                // All returned chats should belong to test user
                for (const chat of result.items) {
                    expect(chat.userId).toBe(testCtx.userId);
                }
            });

            it("respects pagination limit", async () => {
                // Create multiple chats
                for (let i = 0; i < 3; i++) {
                    const chat = await chatData.createChat(
                        { title: `Pagination Test ${i}` },
                        testCtx
                    );
                    TEST_CHAT_IDS.push(chat.id);
                }

                const result = await chatData.listChats(testCtx, { limit: 2 });

                expect(result.items.length).toBeLessThanOrEqual(2);
            });
        });

        describe("chatExists", () => {
            it("returns true for existing chat", async () => {
                const created = await chatData.createChat(
                    { title: "Exists Test" },
                    testCtx
                );
                TEST_CHAT_IDS.push(created.id);

                const exists = await chatData.chatExists(created.id, testCtx);
                expect(exists).toBe(true);
            });

            it("returns false for non-existent chat", async () => {
                const exists = await chatData.chatExists(
                    NON_EXISTENT_UUID,
                    testCtx
                );
                expect(exists).toBe(false);
            });
        });

        describe("deleteChat", () => {
            it("deletes an existing chat", async () => {
                // Create a chat
                const created = await chatData.createChat(
                    { title: "Delete Test" },
                    testCtx
                );
                // Don't track - we're testing deletion

                // Verify it exists
                const beforeDelete = await chatData.getChat(
                    created.id,
                    testCtx
                );
                expect(beforeDelete).toBeDefined();

                // Delete it
                const deleted = await chatData.deleteChat(created.id, testCtx);
                expect(deleted).toBe(true);

                // Verify it's gone
                const afterDelete = await chatData.getChat(
                    created.id,
                    testCtx
                );
                expect(afterDelete).toBeNull();
            });

            it("returns false for non-existent chat", async () => {
                const deleted = await chatData.deleteChat(
                    NON_EXISTENT_UUID,
                    testCtx
                );
                expect(deleted).toBe(false);
            });
        });

        describe("getChatCount", () => {
            it("returns count of user chats", async () => {
                // Get initial count
                const initialCount = await chatData.getChatCount(testCtx);
                expect(typeof initialCount).toBe("number");

                // Create a chat
                const created = await chatData.createChat(
                    { title: "Count Test" },
                    testCtx
                );
                TEST_CHAT_IDS.push(created.id);

                // Count should increase
                const newCount = await chatData.getChatCount(testCtx);
                expect(newCount).toBe(initialCount + 1);
            });
        });
    }
);
