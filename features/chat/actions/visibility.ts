'use server';

/**
 * Visibility Server Actions
 *
 * Server actions for updating chat visibility.
 *
 * @module features/chat/actions/visibility
 */

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import type { VisibilityType } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface UpdateVisibilityInput {
  /** Chat session identifier */
  chatId: string;
  /** New visibility type */
  visibility: VisibilityType;
}

export interface UpdateVisibilityResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
}

// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Updates the visibility of a chat.
 *
 * @param input - Contains chatId and new visibility type
 * @returns Result indicating success or failure
 *
 * @example
 * ```ts
 * const result = await updateChatVisibility({
 *   chatId: 'chat-123',
 *   visibility: 'public',
 * });
 * ```
 */
export async function updateChatVisibility(
  input: UpdateVisibilityInput
): Promise<UpdateVisibilityResult> {
  try {
    // 1. Verify session
    const session = await getSession();
    if (!session?.user?.id) {
      throw new AppError({
        code: 'auth:unauthorized',
        message: 'Must be logged in to update chat visibility',
      });
    }

    // 2. Validate input
    if (!input.chatId || !input.visibility) {
      throw new AppError({
        code: 'validation:invalid_input',
        message: 'Invalid visibility data',
      });
    }

    if (input.visibility !== 'public' && input.visibility !== 'private') {
      throw new AppError({
        code: 'validation:invalid_input',
        message: 'Visibility must be public or private',
      });
    }

    // 3. Update visibility in database
    // TODO: Implement chatData.updateVisibility when data layer is complete
    console.log('[Visibility] Updating chat visibility:', {
      userId: session.user.id,
      chatId: input.chatId,
      visibility: input.visibility,
    });

    // 4. Revalidate chat page
    revalidatePath(`/chat/${input.chatId}`);

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }

    console.error('[Visibility] Failed to update visibility:', error);
    return { success: false, error: 'Failed to update visibility' };
  }
}
