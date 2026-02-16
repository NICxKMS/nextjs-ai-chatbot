/**
 * Settings Feature Schemas
 *
 * Zod validation schemas for settings operations.
 *
 * @module features/settings/schemas
 */

import { z } from "zod"

// =============================================================================
// Theme Schemas
// =============================================================================

/**
 * Theme mode schema
 */
export const themeModeSchema = z.enum(["light", "dark", "system"])

/**
 * Theme mode type
 */
export type ThemeModeSchema = z.infer<typeof themeModeSchema>

// =============================================================================
// Model Schemas
// =============================================================================

/**
 * Model capability schema
 */
export const modelCapabilitySchema = z.enum([
	"chat",
	"code",
	"vision",
	"audio",
	"function-calling",
	"streaming",
	"reasoning",
	"multimodal",
])

/**
 * Model option schema
 */
export const modelOptionSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	provider: z.string().min(1),
	providerId: z.string().optional(),
	description: z.string().optional(),
	contextWindow: z.number().positive().optional(),
	maxTokens: z.number().positive().optional(),
	capabilities: z.array(modelCapabilitySchema).default([]),
	isDefault: z.boolean().optional(),
	isCurated: z.boolean().optional(),
	source: z.enum(["static", "discovered"]).optional(),
	release: z.string().optional(),
	price: z.string().optional(),
})

/**
 * Model option type
 */
export type ModelOptionSchema = z.infer<typeof modelOptionSchema>

// =============================================================================
// Sampling Schemas
// =============================================================================

/**
 * Sampling settings schema
 */
export const samplingSettingsSchema = z.object({
	temperature: z.number().min(0).max(2),
	topP: z.number().min(0).max(1),
	maxOutputTokens: z.number().min(256).max(1_000_000),
})

/**
 * Sampling settings type
 */
export type SamplingSettingsSchema = z.infer<typeof samplingSettingsSchema>

// =============================================================================
// User Preferences Schemas
// =============================================================================

/**
 * Font size schema
 */
export const fontSizeSchema = z.enum(["small", "medium", "large"])

/**
 * User preferences schema
 */
export const userPreferencesSchema = z.object({
	theme: themeModeSchema,
	defaultModel: z.string().min(1),
	language: z.string().min(2).max(10),
	fontSize: fontSizeSchema,
	sendOnEnter: z.boolean(),
	showTimestamps: z.boolean(),
	compactMode: z.boolean(),
})

/**
 * User preferences type from schema
 */
export type UserPreferencesSchema = z.infer<typeof userPreferencesSchema>

/**
 * Partial user preferences schema for updates
 */
export const updateUserPreferencesSchema = userPreferencesSchema.partial()

/**
 * Update user preferences type
 */
export type UpdateUserPreferencesSchema = z.infer<
	typeof updateUserPreferencesSchema
>

// =============================================================================
// App Settings Schemas
// =============================================================================

/**
 * Model selector display mode schema
 */
export const modelSelectorDisplayModeSchema = z.enum(["full", "compact"])

/**
 * App settings schema
 */
export const appSettingsSchema = z.object({
	selectedModelId: z.string().min(1),
	modelSelectorDisplayMode: modelSelectorDisplayModeSchema,
	sampling: samplingSettingsSchema,
	systemPrompt: z.string(),
	enableReasoning: z.boolean(),
	streamArtifacts: z.boolean(),
	autoScroll: z.boolean(),
})

/**
 * App settings type from schema
 */
export type AppSettingsSchema = z.infer<typeof appSettingsSchema>

/**
 * Partial app settings schema for updates
 */
export const updateAppSettingsSchema = appSettingsSchema.partial()

/**
 * Update app settings type
 */
export type UpdateAppSettingsSchema = z.infer<typeof updateAppSettingsSchema>

// =============================================================================
// Action Input Schemas
// =============================================================================

/**
 * Update preferences input schema
 */
export const updatePreferencesInputSchema = z.object({
	userId: z.string().uuid(),
	preferences: updateUserPreferencesSchema,
})

/**
 * Update preferences input type
 */
export type UpdatePreferencesInputSchema = z.infer<
	typeof updatePreferencesInputSchema
>
