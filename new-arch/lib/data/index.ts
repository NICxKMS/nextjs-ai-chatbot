/**
 * Data Layer - Core exports
 *
 * This module provides the foundation for data access:
 * - Type definitions for all entities
 * - Database connection with server-only guard
 */

// Database connection (server-only)
export { type Database, db, sql } from "./db";

// Entity types
export type {
    Chat,
    Document,
    DocumentKind,
    Message,
    NewChat,
    NewDocument,
    NewMessage,
    NewSuggestion,
    // Insert types
    NewUser,
    NewVote,
    PartialChat,
    PartialDocument,
    PartialMessage,
    PartialSuggestion,
    // Partial types (for updates)
    PartialUser,
    Role,
    Suggestion,
    // Core entities
    User,
    // Enums
    Visibility,
    Vote,
} from "./types";
