/**
 * Error Class Hierarchy
 * @module @/src/errors
 *
 * This barrel export provides all error classes.
 * All application errors extend from AppError.
 */

// API-specific errors
export * from "./api.errors";
// Base error class
export * from "./base.error";
