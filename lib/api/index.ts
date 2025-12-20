/**
 * API Utilities Module
 * @module lib/api
 *
 * Public API for route handlers:
 * - Guards for security checks
 * - Validators for request parsing
 * - Response helpers for consistent responses
 * - Schemas for validation
 */

// Guards
export { verifyOrigin, verifyContentType, extractBearerToken } from './guards';

// Validators
export { validateBody, validateSearchParams, validatePathParam } from './validators';

// Response helpers
export {
  json,
  success,
  errorResponse,
  noContent,
  redirect,
  streaming,
  corsOptions,
  HEADERS,
} from './response';

// Schemas
export {
  // Primitives
  uuidSchema,
  paginationSchema,
  cursorPaginationSchema,
  // Chat
  createChatSchema,
  updateChatSchema,
  chatVisibilitySchema,
  // Message
  messageRoleSchema,
  saveMessageSchema,
  messageQuerySchema,
  // Document
  documentKindSchema,
  createDocumentSchema,
  updateDocumentSchema,
  // Vote
  voteSchema,
  getVotesSchema,
  // User
  emailSchema,
  passwordSchema,
  userTypeSchema,
  // Common
  idParamSchema,
  searchQuerySchema,
  dateRangeSchema,
} from './schemas';

// Schema types
export type {
  Pagination,
  CursorPagination,
  CreateChatInput,
  UpdateChatInput,
  SaveMessageInput,
  CreateDocumentInput,
  UpdateDocumentInput,
  VoteInput,
  MessageRole,
  DocumentKind,
  UserType,
} from './schemas';
