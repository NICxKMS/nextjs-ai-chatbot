/**
 * Database Module - Public API
 * Ref: 03-data-layer-optimal-design.md
 *
 * @module lib/db
 */

export type { Database, PoolDatabase } from "./client";
// Client
export { getDb, getPoolDb, schema } from "./client";
// Schema types
export type {
    Chat,
    Document,
    Message,
    NewChat,
    NewDocument,
    NewMessage,
    NewSuggestion,
    NewUser,
    NewVote,
    Suggestion,
    User,
    Visibility,
    Vote,
} from "./schema";
export type { Transaction } from "./transactions";
// Transactions
export { withTransaction, withTransactionSafe } from "./transactions";

// Client-safe types
export type { ChatWithMessages, DocumentWithSuggestions } from "./types";
