/**
 * Chat History API Client
 *
 * Client-side API service for chat history operations.
 * Centralizes fetch calls for chat/history endpoints.
 *
 * @module features/sidebar/services/history-api
 */

import { apiClient } from "@/lib/api";
import type { ChatHistoryItem } from "../types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Paginated history response from the API.
 */
export interface HistoryResponse {
    chats: ChatHistoryItem[];
    hasMore: boolean;
    nextCursor?: string;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Fetch paginated chat history.
 *
 * @param url - Full URL with query params (e.g., /api/history?limit=20&cursor=xxx)
 * @returns Paginated history response
 * @throws AppError on failure
 */
export async function fetchChatHistory(url: string): Promise<HistoryResponse> {
    return apiClient.get<HistoryResponse>(url);
}

/**
 * Delete a single chat by ID.
 *
 * @param chatId - ID of the chat to delete
 * @throws AppError on failure
 */
export async function deleteChat(chatId: string): Promise<void> {
    await apiClient.delete(`/api/chat?id=${chatId}`);
}

/**
 * Delete all chat history for the current user.
 *
 * @throws AppError on failure
 */
export async function deleteAllChatHistory(): Promise<void> {
    await apiClient.delete("/api/history");
}
