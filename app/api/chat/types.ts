/**
 * Chat API Types & Schemas
 * Shared type definitions and validation schemas for the chat API.
 *
 * @module app/api/chat/types
 */

import type { UIMessage } from "ai";
import { z } from "zod";
import type { AppSession } from "@/lib/auth/types";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Timeout for AI completion requests (55 seconds to stay under serverless limits)
 * PERF-003: Used in combined abort signal with client disconnect handling
 */
export const AI_COMPLETION_TIMEOUT_MS = 55_000;

/**
 * Models allowed for guest (unauthenticated) users
 * Only fast/affordable models to prevent cost abuse
 */
export const GUEST_ALLOWED_MODELS = new Set([
    "openai:gpt-4o-mini",
    "google:gemini-2.0-flash-exp",
    "google:gemini-1.5-flash",
]);

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for validating message parts in UIMessage
 * Uses passthrough for parts to allow all valid AI SDK part types
 */
export const messagePartSchema = z
    .object({
        type: z.string(),
    })
    .passthrough();

/**
 * Schema for validating UIMessage objects
 * Supports user, assistant, and system roles
 */
export const uiMessageSchema = z
    .object({
        id: z.string().min(1, "Message ID is required"),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().optional(),
        parts: z.array(messagePartSchema).optional(),
        createdAt: z.coerce.date().optional(),
    })
    .passthrough();

/**
 * Schema for validating the chat request body
 * Requires a chat ID and at least one message
 */
export const chatRequestSchema = z.object({
    id: z.string().min(1, "Chat ID is required"),
    messages: z
        .array(uiMessageSchema)
        .min(1, "At least one message is required"),
    modelId: z.string().optional(),
});

export type ChatRequestBody = z.infer<typeof chatRequestSchema>;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Validated chat request with parsed data
 */
export interface ValidatedChatRequest {
    chatId: string;
    messages: UIMessage[];
    modelId: string;
    session: AppSession | null;
    userId: string | undefined;
    isGuest: boolean;
    isNewChat: boolean;
    userMessageContent: string;
}

/**
 * Context passed to stream handler
 */
export interface StreamContext {
    request: ValidatedChatRequest;
    toolSession: AppSession;
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

export const SYSTEM_PROMPT = `You are a helpful AI assistant. You provide clear, accurate, and helpful responses.

Guidelines:
- Be concise but thorough
- Use markdown formatting when appropriate
- If you're unsure about something, say so
- Break down complex topics into digestible parts

Document/Artifact Guidelines:
- Use createDocument for substantial content (>10 lines) like code, documentation, or spreadsheets
- Use updateDocument to modify existing documents when the user asks for changes
- For simple inline responses, respond directly without creating a document
- Supported document kinds: text (markdown), code (programming), sheet (spreadsheets)`;
