/**
 * Guest to Authenticated User Data Migration
 * SEC-003: Guest-to-Auth Session Migration
 *
 * Migrates guest user data (chats, messages) from Redis cache
 * to the PostgreSQL database when a guest user registers/signs in.
 *
 * Data flow:
 * 1. Guest creates chats/messages → stored in Redis only
 * 2. Guest registers/signs in → gets Supabase UID
 * 3. This module migrates cached data to DB under the new UID
 * 4. Guest cache keys are cleaned up
 */
import "server-only";

import {
    deleteAllUserChatsFromCache,
    getChatFromCache,
    getMessagesFromCache,
    getUserChatsFromCache,
} from "@/lib/cache-ops";
import { schema, withTransaction } from "@/lib/db";
import type { NewChat, NewMessage } from "@/lib/db/schema";

const { chat, message } = schema;

/**
 * Migration result type
 */
export interface MigrationResult {
    /** Whether migration was successful */
    success: boolean;
    /** Number of chats migrated */
    migratedChats: number;
    /** Number of messages migrated */
    migratedMessages: number;
    /** Migration timestamp */
    migratedAt: Date;
    /** Any warnings during migration */
    warnings: string[];
    /** Error message if failed */
    error?: string;
}

/**
 * No-op result when there's nothing to migrate
 */
const EMPTY_RESULT: MigrationResult = {
    success: true,
    migratedChats: 0,
    migratedMessages: 0,
    migratedAt: new Date(),
    warnings: [],
};

/**
 * Migrate guest user data from cache to database
 *
 * SEC-003: Core migration function
 *
 * @param guestId - Guest user ID (the short nanoid, NOT prefixed with "guest:")
 * @param authUserId - Authenticated user's Supabase UID
 * @returns Migration result with counts and status
 */
export async function migrateGuestToAuthUser(
    guestId: string,
    authUserId: string
): Promise<MigrationResult> {
    const warnings: string[] = [];

    try {
        // Validate inputs
        if (!guestId || !authUserId) {
            return {
                success: false,
                migratedChats: 0,
                migratedMessages: 0,
                migratedAt: new Date(),
                warnings: [],
                error: "Invalid guest ID or auth user ID",
            };
        }

        // Validate authUserId is a UUID (Supabase format)
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(authUserId)) {
            return {
                success: false,
                migratedChats: 0,
                migratedMessages: 0,
                migratedAt: new Date(),
                warnings: [],
                error: "Auth user ID must be a valid UUID",
            };
        }

        // Step 1: Get all guest chats from cache
        const cachedChats = await getUserChatsFromCache(guestId);

        if (!cachedChats || cachedChats.length === 0) {
            console.info("[SEC-003] No guest data to migrate", {
                guestId,
                authUserId,
            });
            return EMPTY_RESULT;
        }

        console.info("[SEC-003] Starting guest data migration", {
            guestId,
            authUserId,
            chatCount: cachedChats.length,
        });

        // Step 2: Collect all chat data with messages
        const chatsToMigrate: Array<{
            meta: {
                id: string;
                title: string;
                visibility: "public" | "private";
                createdAt: Date;
                updatedAt: Date;
            };
            messages: Array<{
                id: string;
                role: "user" | "assistant" | "system";
                parts: unknown;
                attachments: unknown;
                createdAt: Date;
            }>;
        }> = [];

        for (const cachedChat of cachedChats) {
            // cachedChat has { chatId, updatedAt } structure
            const chatId = cachedChat.chatId;

            // Get full chat metadata
            const chatMeta = await getChatFromCache(chatId, guestId);
            if (!chatMeta) {
                warnings.push(`Chat ${chatId} metadata not found`);
                continue;
            }

            // Get messages for this chat
            const cachedMessages = await getMessagesFromCache(chatId, guestId);

            chatsToMigrate.push({
                meta: {
                    id: chatMeta.id,
                    title: chatMeta.title || "Untitled Chat",
                    visibility:
                        (chatMeta.visibility as "public" | "private") ||
                        "private",
                    createdAt: new Date(chatMeta.createdAt),
                    updatedAt: new Date(chatMeta.updatedAt),
                },
                messages: (cachedMessages || []).map((msg) => ({
                    id: msg.id,
                    role: msg.role as "user" | "assistant" | "system",
                    parts: msg.parts,
                    attachments: msg.attachments || [],
                    createdAt: new Date(msg.createdAt),
                })),
            });
        }

        if (chatsToMigrate.length === 0) {
            console.info(
                "[SEC-003] No valid chats to migrate after validation",
                {
                    guestId,
                    authUserId,
                }
            );
            return { ...EMPTY_RESULT, warnings };
        }

        // Step 3: Execute migration in a transaction
        const result = await withTransaction(async (tx) => {
            let totalMessages = 0;

            for (const chatData of chatsToMigrate) {
                // Insert chat record
                const newChat: NewChat = {
                    id: chatData.meta.id,
                    userId: authUserId,
                    title: chatData.meta.title,
                    visibility: chatData.meta.visibility,
                    createdAt: chatData.meta.createdAt,
                    updatedAt: chatData.meta.updatedAt,
                };

                await tx.insert(chat).values(newChat).onConflictDoNothing();

                // Insert messages
                if (chatData.messages.length > 0) {
                    const messagesToInsert: NewMessage[] =
                        chatData.messages.map((msg) => ({
                            id: msg.id,
                            chatId: chatData.meta.id,
                            role: msg.role,
                            parts: msg.parts,
                            attachments: msg.attachments,
                            createdAt: msg.createdAt,
                        }));

                    await tx
                        .insert(message)
                        .values(messagesToInsert)
                        .onConflictDoNothing();

                    totalMessages += messagesToInsert.length;
                }
            }

            return {
                chatCount: chatsToMigrate.length,
                messageCount: totalMessages,
            };
        }, "migrateGuestToAuth");

        // Step 4: Clean up guest cache data
        // Note: We do this AFTER successful migration to prevent data loss
        try {
            await deleteAllUserChatsFromCache(guestId);
            console.info("[SEC-003] Guest cache cleaned up", { guestId });
        } catch (cleanupError) {
            // Log but don't fail - data is already migrated
            console.warn("[SEC-003] Failed to clean up guest cache", {
                guestId,
                error: cleanupError,
            });
            warnings.push("Cache cleanup failed - data may persist in cache");
        }

        console.info("[SEC-003] Migration completed successfully", {
            guestId,
            authUserId,
            chats: result.chatCount,
            messages: result.messageCount,
        });

        return {
            success: true,
            migratedChats: result.chatCount,
            migratedMessages: result.messageCount,
            migratedAt: new Date(),
            warnings,
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

        console.error("[SEC-003] Migration failed", {
            guestId,
            authUserId,
            error: errorMessage,
        });

        return {
            success: false,
            migratedChats: 0,
            migratedMessages: 0,
            migratedAt: new Date(),
            warnings,
            error: errorMessage,
        };
    }
}

/**
 * Check if a user ID is a guest ID
 * Guest IDs are nanoid format (no hyphens)
 */
export function isGuestId(userId: string): boolean {
    // Guest IDs are nanoids (21 chars, no hyphens)
    // Auth IDs are UUIDs (36 chars with hyphens)
    return !userId.includes("-");
}
