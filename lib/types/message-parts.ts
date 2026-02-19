/**
 * Message Parts Type System
 *
 * Comprehensive type definitions and Zod schemas for message parts.
 * These types represent the structured content blocks within chat messages.
 *
 * This module provides:
 * - Zod schemas for runtime validation of message parts
 * - Type guards for narrowing message part types
 * - Utility functions for working with message parts
 *
 * @module lib/types/message-parts
 */

import { z } from "zod"

import { isValidMimeType } from "@/lib/utils/file-validation"

// =============================================================================
// Base Schema
// =============================================================================

/**
 * Base schema for all message parts.
 * Every message part must have a type field.
 */
const baseMessagePartSchema = z.object({
	type: z.string(),
})

// =============================================================================
// Message Part Schemas
// =============================================================================

/**
 * Schema for text content part - the most common message part.
 */
export const textPartSchema = z.object({
	type: z.literal("text"),
	text: z.string(),
})

/**
 * Schema for file attachment part - images, documents, etc.
 *
 * Validates:
 * - URL must be a valid URL format
 * - Name must be 1-100 characters if provided
 * - MIME type must be in allowed list (image/*, audio/*, video/*, or specific types)
 */
export const filePartSchema = z.object({
	type: z.literal("file"),
	url: z.string().url("Invalid file URL"),
	name: z.string().min(1).max(100).optional(),
	filename: z.string().min(1).max(100).optional(),
	mediaType: z
		.string()
		.refine(isValidMimeType, {
			message:
				"Unsupported file type. Allowed: images, audio, video, PDF, text, and common document formats",
		})
		.optional(),
	mimeType: z
		.string()
		.refine(isValidMimeType, {
			message:
				"Unsupported file type. Allowed: images, audio, video, PDF, text, and common document formats",
		})
		.optional(),
	size: z.number().int().nonnegative().optional(),
})

/**
 * Schema for reasoning/thinking part - chain of thought content.
 */
export const reasoningPartSchema = z.object({
	type: z.literal("reasoning"),
	text: z.string(),
	isCollapsed: z.boolean().optional(),
})

/**
 * Schema for model reference part - indicates which model was used.
 */
export const modelPartSchema = z.object({
	type: z.literal("model"),
	id: z.string().min(1),
	provider: z.string().optional(),
})

/**
 * Schema for tool call part - when the model calls a tool.
 */
export const toolCallPartSchema = z.object({
	type: z.literal("tool-call"),
	toolCallId: z.string().min(1),
	toolName: z.string().min(1),
	args: z.record(z.unknown()),
})

/**
 * Schema for tool result part - result from tool execution.
 */
export const toolResultPartSchema = z.object({
	type: z.literal("tool-result"),
	toolCallId: z.string().min(1),
	toolName: z.string().min(1),
	result: z.unknown(),
	isError: z.boolean().optional(),
})

/**
 * Schema for source/citation part - for RAG or web search results.
 */
export const sourcePartSchema = z.object({
	type: z.literal("source"),
	url: z.string().url().optional(),
	title: z.string().optional(),
	content: z.string().optional(),
	relevanceScore: z.number().min(0).max(1).optional(),
})

/**
 * Schema for code part - inline code or code blocks.
 */
export const codePartSchema = z.object({
	type: z.literal("code"),
	code: z.string(),
	language: z.string().optional(),
	filename: z.string().optional(),
})

/**
 * Schema for artifact reference part - references to created artifacts.
 */
export const artifactPartSchema = z.object({
	type: z.literal("artifact"),
	artifactId: z.string().min(1),
	kind: z.enum(["text", "code", "image", "sheet"]),
	title: z.string().optional(),
})

/**
 * Schema for image generation part - for AI-generated images.
 */
export const imagePartSchema = z.object({
	type: z.literal("image"),
	url: z.string().url(),
	alt: z.string().optional(),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	prompt: z.string().optional(),
})

/**
 * Schema for error part - structured error content returned by tools/systems.
 */
export const errorPartSchema = z.object({
	type: z.literal("error"),
	message: z.string(),
	code: z.string().optional(),
	details: z.unknown().optional(),
})

/**
 * Schema for system part - system-level instructional or status content.
 */
export const systemPartSchema = z.object({
	type: z.literal("system"),
	text: z.string(),
	kind: z.string().optional(),
})

/**
 * Schema for audio part.
 */
export const audioPartSchema = z.object({
	type: z.literal("audio"),
	url: z.string().url(),
	durationMs: z.number().int().positive().optional(),
	transcript: z.string().optional(),
	mediaType: z.string().optional(),
})

/**
 * Schema for video part.
 */
export const videoPartSchema = z.object({
	type: z.literal("video"),
	url: z.string().url(),
	durationMs: z.number().int().positive().optional(),
	thumbnailUrl: z.string().url().optional(),
	mediaType: z.string().optional(),
})

/**
 * Schema for embeddable content part.
 */
export const embedPartSchema = z.object({
	type: z.literal("embed"),
	url: z.string().url(),
	title: z.string().optional(),
	provider: z.string().optional(),
})

/**
 * Schema for step indicator part - for multi-step reasoning.
 */
export const stepPartSchema = z.object({
	type: z.literal("step"),
	stepNumber: z.number().int().nonnegative(),
	title: z.string().optional(),
	content: z.string(),
})

/**
 * Schema for unknown/fallback part for extensibility.
 */
export const unknownPartSchema = baseMessagePartSchema.passthrough()

// =============================================================================
// Union Schema
// =============================================================================

/**
 * Schema for any valid message part.
 * Uses Zod's discriminated union for efficient parsing.
 */
export const messagePartSchema = z.discriminatedUnion("type", [
	textPartSchema,
	filePartSchema,
	reasoningPartSchema,
	modelPartSchema,
	toolCallPartSchema,
	toolResultPartSchema,
	sourcePartSchema,
	codePartSchema,
	artifactPartSchema,
	imagePartSchema,
	errorPartSchema,
	systemPartSchema,
	audioPartSchema,
	videoPartSchema,
	embedPartSchema,
	stepPartSchema,
])

/**
 * Schema for an array of message parts.
 */
export const messagePartsArraySchema = z.array(messagePartSchema)

// =============================================================================
// Inferred Types (re-exported for convenience)
// =============================================================================

/**
 * Text content part type inferred from schema.
 */
export type TextPart = z.infer<typeof textPartSchema>

/**
 * File attachment part type inferred from schema.
 */
export type FilePart = z.infer<typeof filePartSchema>

/**
 * Reasoning/thinking part type inferred from schema.
 */
export type ReasoningPart = z.infer<typeof reasoningPartSchema>

/**
 * Model reference part type inferred from schema.
 */
export type ModelPart = z.infer<typeof modelPartSchema>

/**
 * Tool call part type inferred from schema.
 */
export type ToolCallPart = z.infer<typeof toolCallPartSchema>

/**
 * Tool result part type inferred from schema.
 */
export type ToolResultPart = z.infer<typeof toolResultPartSchema>

/**
 * Source/citation part type inferred from schema.
 */
export type SourcePart = z.infer<typeof sourcePartSchema>

/**
 * Code part type inferred from schema.
 */
export type CodePart = z.infer<typeof codePartSchema>

/**
 * Artifact reference part type inferred from schema.
 */
export type ArtifactPart = z.infer<typeof artifactPartSchema>

/**
 * Image generation part type inferred from schema.
 */
export type ImagePart = z.infer<typeof imagePartSchema>

/**
 * Error part type inferred from schema.
 */
export type ErrorPart = z.infer<typeof errorPartSchema>

/**
 * System part type inferred from schema.
 */
export type SystemPart = z.infer<typeof systemPartSchema>

/**
 * Audio part type inferred from schema.
 */
export type AudioPart = z.infer<typeof audioPartSchema>

/**
 * Video part type inferred from schema.
 */
export type VideoPart = z.infer<typeof videoPartSchema>

/**
 * Embed part type inferred from schema.
 */
export type EmbedPart = z.infer<typeof embedPartSchema>

/**
 * Step indicator part type inferred from schema.
 */
export type StepPart = z.infer<typeof stepPartSchema>

/**
 * Unknown part type inferred from schema.
 */
export type UnknownPart = z.infer<typeof unknownPartSchema>

/**
 * Union type for all message parts.
 */
export type MessagePart = z.infer<typeof messagePartSchema>

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is a valid MessagePart.
 *
 * @param value - The value to check
 * @returns True if the value is a valid MessagePart
 */
export function isMessagePart(value: unknown): value is MessagePart {
	const result = messagePartSchema.safeParse(value)
	return result.success
}

/**
 * Type guard to check if a MessagePart is a TextPart.
 *
 * @param part - The message part to check
 * @returns True if the part is a TextPart
 */
export function isTextPart(part: MessagePart): part is TextPart {
	return part.type === "text"
}

/**
 * Type guard to check if a MessagePart is a FilePart.
 *
 * @param part - The message part to check
 * @returns True if the part is a FilePart
 */
export function isFilePart(part: MessagePart): part is FilePart {
	return part.type === "file"
}

/**
 * Type guard to check if a MessagePart is a ReasoningPart.
 *
 * @param part - The message part to check
 * @returns True if the part is a ReasoningPart
 */
export function isReasoningPart(part: MessagePart): part is ReasoningPart {
	return part.type === "reasoning"
}

/**
 * Type guard to check if a MessagePart is a ModelPart.
 *
 * @param part - The message part to check
 * @returns True if the part is a ModelPart
 */
export function isModelPart(part: MessagePart): part is ModelPart {
	return part.type === "model"
}

/**
 * Type guard to check if a MessagePart is a ToolCallPart.
 *
 * @param part - The message part to check
 * @returns True if the part is a ToolCallPart
 */
export function isToolCallPart(part: MessagePart): part is ToolCallPart {
	return part.type === "tool-call"
}

/**
 * Type guard to check if a MessagePart is a ToolResultPart.
 *
 * @param part - The message part to check
 * @returns True if the part is a ToolResultPart
 */
export function isToolResultPart(part: MessagePart): part is ToolResultPart {
	return part.type === "tool-result"
}

/**
 * Type guard to check if a MessagePart is a SourcePart.
 *
 * @param part - The message part to check
 * @returns True if the part is a SourcePart
 */
export function isSourcePart(part: MessagePart): part is SourcePart {
	return part.type === "source"
}

/**
 * Type guard to check if a MessagePart is a CodePart.
 *
 * @param part - The message part to check
 * @returns True if the part is a CodePart
 */
export function isCodePart(part: MessagePart): part is CodePart {
	return part.type === "code"
}

/**
 * Type guard to check if a MessagePart is an ArtifactPart.
 *
 * @param part - The message part to check
 * @returns True if the part is an ArtifactPart
 */
export function isArtifactPart(part: MessagePart): part is ArtifactPart {
	return part.type === "artifact"
}

/**
 * Type guard to check if a MessagePart is an ImagePart.
 *
 * @param part - The message part to check
 * @returns True if the part is an ImagePart
 */
export function isImagePart(part: MessagePart): part is ImagePart {
	return part.type === "image"
}

/**
 * Type guard to check if a MessagePart is an ErrorPart.
 */
export function isErrorPart(part: MessagePart): part is ErrorPart {
	return part.type === "error"
}

/**
 * Type guard to check if a MessagePart is a SystemPart.
 */
export function isSystemPart(part: MessagePart): part is SystemPart {
	return part.type === "system"
}

/**
 * Type guard to check if a MessagePart is an AudioPart.
 */
export function isAudioPart(part: MessagePart): part is AudioPart {
	return part.type === "audio"
}

/**
 * Type guard to check if a MessagePart is a VideoPart.
 */
export function isVideoPart(part: MessagePart): part is VideoPart {
	return part.type === "video"
}

/**
 * Type guard to check if a MessagePart is an EmbedPart.
 */
export function isEmbedPart(part: MessagePart): part is EmbedPart {
	return part.type === "embed"
}

/**
 * Type guard to check if a MessagePart is a StepPart.
 *
 * @param part - The message part to check
 * @returns True if the part is a StepPart
 */
export function isStepPart(part: MessagePart): part is StepPart {
	return part.type === "step"
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Parse and validate unknown data as a MessagePart.
 *
 * @param data - Unknown data to parse
 * @returns The validated MessagePart or throws ZodError
 * @throws {z.ZodError} If validation fails
 */
export function parseMessagePart(data: unknown): MessagePart {
	return messagePartSchema.parse(data)
}

/**
 * Safely parse unknown data as a MessagePart.
 *
 * @param data - Unknown data to parse
 * @returns Object with success flag and either data or error
 */
export function safeParseMessagePart(
	data: unknown,
): z.SafeParseReturnType<unknown, MessagePart> {
	return messagePartSchema.safeParse(data)
}

/**
 * Parse and validate an array of message parts.
 *
 * @param data - Unknown data to parse
 * @returns Array of validated MessagePart objects or throws ZodError
 * @throws {z.ZodError} If validation fails
 */
export function parseMessageParts(data: unknown): MessagePart[] {
	return messagePartsArraySchema.parse(data)
}

/**
 * Safely parse an array of message parts.
 *
 * @param data - Unknown data to parse
 * @returns Object with success flag and either data or error
 */
export function safeParseMessageParts(
	data: unknown,
): z.SafeParseReturnType<unknown, MessagePart[]> {
	return messagePartsArraySchema.safeParse(data)
}

/**
 * Extract text content from message parts.
 *
 * @param parts - Array of message parts
 * @returns Concatenated text from all text parts
 */
export function extractTextFromParts(parts: MessagePart[]): string {
	return parts
		.filter(isTextPart)
		.map((part) => part.text)
		.join("\n")
}

/**
 * Compatibility alias for extracting text content from message parts.
 */
export function getTextContent(parts: MessagePart[]): string {
	return extractTextFromParts(parts)
}

/**
 * Extract all file URLs from message parts.
 *
 * @param parts - Array of message parts
 * @returns Array of file URLs
 */
export function extractFileUrlsFromParts(parts: MessagePart[]): string[] {
	return parts.filter(isFilePart).map((part) => part.url)
}

/**
 * Compatibility helper that returns image parts from a message payload.
 */
export function getImageParts(parts: MessagePart[]): ImagePart[] {
	return parts.filter(isImagePart)
}

/**
 * Check if parts array contains any tool calls.
 *
 * @param parts - Array of message parts
 * @returns True if any tool calls are present
 */
export function hasToolCalls(parts: MessagePart[]): boolean {
	return parts.some(isToolCallPart)
}

/**
 * Check if parts array contains reasoning content.
 *
 * @param parts - Array of message parts
 * @returns True if any reasoning parts are present
 */
export function hasReasoning(parts: MessagePart[]): boolean {
	return parts.some(isReasoningPart)
}

/**
 * Check if parts array contains any artifacts.
 *
 * @param parts - Array of message parts
 * @returns True if any artifact parts are present
 */
export function hasArtifacts(parts: MessagePart[]): boolean {
	return parts.some(isArtifactPart)
}

/**
 * Check if parts array contains any images.
 *
 * @param parts - Array of message parts
 * @returns True if any image parts are present
 */
export function hasImages(parts: MessagePart[]): boolean {
	return parts.some(isImagePart)
}

/**
 * Check if parts array contains any code blocks.
 *
 * @param parts - Array of message parts
 * @returns True if any code parts are present
 */
export function hasCode(parts: MessagePart[]): boolean {
	return parts.some(isCodePart)
}

/**
 * Check if parts array contains any sources/citations.
 *
 * @param parts - Array of message parts
 * @returns True if any source parts are present
 */
export function hasSources(parts: MessagePart[]): boolean {
	return parts.some(isSourcePart)
}

/**
 * Get all artifact IDs from message parts.
 *
 * @param parts - Array of message parts
 * @returns Array of artifact IDs
 */
export function getArtifactIds(parts: MessagePart[]): string[] {
	return parts.filter(isArtifactPart).map((part) => part.artifactId)
}

/**
 * Get all tool call IDs from message parts.
 *
 * @param parts - Array of message parts
 * @returns Array of tool call IDs
 */
export function getToolCallIds(parts: MessagePart[]): string[] {
	return parts.filter(isToolCallPart).map((part) => part.toolCallId)
}

/**
 * Get file name with fallback logic.
 *
 * @param part - File part to extract name from
 * @returns File name or 'file' as fallback
 */
export function getFileName(part: FilePart): string {
	return part.name ?? part.filename ?? "file"
}

/**
 * Get media type with fallback logic.
 *
 * @param part - File part to extract media type from
 * @returns Media type or undefined
 */
export function getMediaType(part: FilePart): string | undefined {
	return part.mediaType ?? part.mimeType
}

// =============================================================================
// Message Attachment Schema (Legacy Compatibility)
// =============================================================================

/**
 * Schema for legacy message attachment format.
 */
export const messageAttachmentSchema = z.object({
	url: z.string().url(),
	name: z.string().optional(),
	contentType: z.string().optional(),
	size: z.number().int().nonnegative().optional(),
})

/**
 * Message attachment type inferred from schema.
 */
export type MessageAttachment = z.infer<typeof messageAttachmentSchema>

/**
 * Convert legacy attachment to FilePart.
 *
 * @param attachment - Legacy attachment format
 * @returns FilePart representation
 */
export function attachmentToFilePart(attachment: MessageAttachment): FilePart {
	const result: FilePart = {
		type: "file",
		url: attachment.url,
	}
	if (attachment.name !== undefined) result.name = attachment.name
	if (attachment.contentType !== undefined)
		result.mediaType = attachment.contentType
	if (attachment.size !== undefined) result.size = attachment.size
	return result
}

/**
 * Convert FilePart to legacy attachment format.
 *
 * @param part - File part to convert
 * @returns Legacy attachment format
 */
export function filePartToAttachment(part: FilePart): MessageAttachment {
	const result: MessageAttachment = {
		url: part.url,
	}
	const name = getFileName(part)
	if (name !== "file") result.name = name
	const contentType = getMediaType(part)
	if (contentType !== undefined) result.contentType = contentType
	if (part.size !== undefined) result.size = part.size
	return result
}
