/**
 * API Schemas
 * @module lib/api/schemas
 *
 * Common Zod schemas for API validation:
 * - Primitive schemas (UUID, pagination)
 * - Chat schemas
 * - Document schemas
 * - Message schemas
 * - Vote schemas
 */

import { z } from 'zod';

// ============================================
// Primitive Schemas
// ============================================

/**
 * UUID v4 validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Pagination parameters schema
 * Transforms string inputs to numbers with defaults
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1).default(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100).default(20)),
});

/**
 * Cursor-based pagination schema
 */
export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100).default(20)),
});

// ============================================
// Chat Schemas
// ============================================

/**
 * Schema for creating a new chat
 */
export const createChatSchema = z.object({
  id: uuidSchema.optional(),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less')
    .optional(),
  visibility: z.enum(['public', 'private']).default('private'),
});

/**
 * Schema for updating a chat
 */
export const updateChatSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title must be 255 characters or less')
    .optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

/**
 * Chat visibility filter schema
 */
export const chatVisibilitySchema = z.enum(['public', 'private', 'all']).default('all');

// ============================================
// Message Schemas
// ============================================

/**
 * Message role enum
 */
export const messageRoleSchema = z.enum(['user', 'assistant', 'system', 'tool']);

/**
 * Schema for saving a message
 */
export const saveMessageSchema = z.object({
  chatId: uuidSchema,
  id: uuidSchema.optional(),
  role: messageRoleSchema,
  content: z.string().min(1, 'Message content is required'),
  parts: z.array(z.unknown()).optional(),
  attachments: z.array(z.unknown()).optional(),
});

/**
 * Schema for message list query params
 */
export const messageQuerySchema = z.object({
  chatId: uuidSchema,
  ...cursorPaginationSchema.shape,
});

// ============================================
// Document Schemas
// ============================================

/**
 * Document kind enum
 */
export const documentKindSchema = z.enum(['text', 'code', 'image', 'sheet']);

/**
 * Schema for creating a document
 */
export const createDocumentSchema = z.object({
  id: uuidSchema.optional(),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less'),
  content: z.string().optional().default(''),
  kind: documentKindSchema.default('text'),
});

/**
 * Schema for updating a document
 */
export const updateDocumentSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title must be 255 characters or less')
    .optional(),
  content: z.string().optional(),
  kind: documentKindSchema.optional(),
});

// ============================================
// Vote Schemas
// ============================================

/**
 * Schema for submitting a vote
 */
export const voteSchema = z.object({
  chatId: uuidSchema,
  messageId: uuidSchema,
  isUpvoted: z.boolean(),
});

/**
 * Schema for getting votes
 */
export const getVotesSchema = z.object({
  chatId: uuidSchema,
});

// ============================================
// User Schemas
// ============================================

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email format');

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or less');

/**
 * User type enum
 */
export const userTypeSchema = z.enum(['guest', 'regular']);

// ============================================
// Common Query Schemas
// ============================================

/**
 * ID path parameter schema
 */
export const idParamSchema = z.object({
  id: uuidSchema,
});

/**
 * Search query schema
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200, 'Query too long'),
  ...paginationSchema.shape,
});

/**
 * Date range filter schema
 */
export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// ============================================
// Type Exports
// ============================================

export type Pagination = z.infer<typeof paginationSchema>;
export type CursorPagination = z.infer<typeof cursorPaginationSchema>;
export type CreateChatInput = z.infer<typeof createChatSchema>;
export type UpdateChatInput = z.infer<typeof updateChatSchema>;
export type SaveMessageInput = z.infer<typeof saveMessageSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
export type MessageRole = z.infer<typeof messageRoleSchema>;
export type DocumentKind = z.infer<typeof documentKindSchema>;
export type UserType = z.infer<typeof userTypeSchema>;
