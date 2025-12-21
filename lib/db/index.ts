/**
 * Database Module - Public API
 * Ref: 03-data-layer-optimal-design.md
 *
 * @module lib/db
 */

// Client
export { getDb, getPoolDb, schema } from "./client";
export type { Database, PoolDatabase } from "./client";

// Transactions
export { withTransaction, withTransactionSafe } from "./transactions";
export type { Transaction } from "./transactions";

// Schema types
export type {
    User,
    NewUser,
    Chat,
    NewChat,
    Message,
    NewMessage,
    Vote,
    NewVote,
    Document,
    NewDocument,
    Suggestion,
    NewSuggestion,
    Visibility,
} from "./schema";

// Client-safe types
export type {
    MessagePart,
    ChatWithMessages,
    DocumentWithSuggestions,
} from "./types";
