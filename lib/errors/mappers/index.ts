/**
 * Error Mappers
 * @module lib/errors/mappers
 * 
 * Barrel export for error mapper functions.
 * Maps external errors (DB, AI, HTTP) to AppError instances.
 */

export { mapPostgresError, isPostgresError } from './postgres';
export { mapAIProviderError, isAIProviderError } from './ai-provider';
export { mapHttpError, mapNetworkError } from './http';
