/**
 * AI System Prompts Module
 *
 * Centralized system prompts for AI chat interactions and artifact generation.
 * All prompts are defined here to prevent cross-handler prompt drift and ensure
 * consistency across the application.
 *
 * @module lib/ai/prompts
 */

import type { ModelMetadata } from "./types"

// =============================================================================
// Chat System Prompts
// =============================================================================

/**
 * Base system prompt for assistant behavior guidelines.
 * Used as the foundation for all chat interactions.
 */
export const regularPrompt = `
You are a helpful AI assistant.

**Style Guide:**
- Be concise and direct.
- Use short paragraphs and bullet points for readability.
- Avoid fluff and filler phrases.

**Tool Usage:**
- Use tools only when necessary to improve accuracy or interactivity.
- If a tool is not needed, answer directly in the chat.

**Interaction:**
- Match the user's tone.
- Acknowledge uncertainty; do not guess.
- Ask clarifying questions only if essential.
`

/**
 * System prompt for Artifacts UI usage.
 * Instructs the model on when and how to use the Artifacts side-panel.
 */
export const artifactsPrompt = `
You have access to "Artifacts", a side-panel UI for creating and editing content.

**Tool Usage:**
- Use \`createDocument\` for:
  - Substantial content (>10 lines).
  - Code snippets (Python only).
  - Content likely to be saved/reused (emails, essays).
- Use \`updateDocument\` for:
  - Modifying existing documents based on user feedback.
  - Prefer full rewrites for major changes.

**Constraints:**
- **Code:** Always use Artifacts for code. Wrap in \`\`\`python ... \`\`\`. Only Python is supported.
- **Timing:** NEVER update a document immediately after creating it. Wait for user feedback.
- **Exclusions:** Do not use Artifacts for short, informational, or conversational responses.
`

// =============================================================================
// Request Hints
// =============================================================================

/**
 * Geographic request hints for location-aware responses.
 * Derived from Vercel's Geo information.
 */
export interface RequestHints {
	/** Latitude coordinate */
	latitude: number | undefined
	/** Longitude coordinate */
	longitude: number | undefined
	/** City name */
	city: string | undefined
	/** Country name */
	country: string | undefined
}

/**
 * Generates a location context prompt from request hints.
 *
 * @param requestHints - Geographic information from the request
 * @returns Formatted location context string
 */
export function getRequestPromptFromHints(requestHints: RequestHints): string {
	return `\
About the origin of user's request:
- lat: ${requestHints.latitude}
- lon: ${requestHints.longitude}
- city: ${requestHints.city}
- country: ${requestHints.country}
`
}

// =============================================================================
// Main System Prompt Builder
// =============================================================================

/**
 * Options for building the main system prompt.
 */
export interface SystemPromptOptions {
	/** The selected chat model ID */
	selectedChatModel: string
	/** Geographic request hints */
	requestHints: RequestHints
	/** Optional model metadata for capability checks */
	selectedModel?: ModelMetadata
	/** Optional user-defined custom system prompt */
	userSystemPrompt?: string
}

/**
 * Reasoning model ID constant.
 * Models with this ID or reasoning capability should not include artifacts prompt.
 */
const REASONING_MODEL_ID = "openai:o1-mini"

/**
 * Builds the complete system prompt for chat interactions.
 *
 * Combines:
 * - Base assistant behavior guidelines (regularPrompt)
 * - Optional user custom prompt
 * - Location context from request hints
 * - Conditional artifacts prompt (excluded for reasoning models)
 *
 * @param options - System prompt configuration options
 * @returns Complete system prompt string
 */
export function systemPrompt({
	selectedChatModel,
	requestHints,
	selectedModel,
	userSystemPrompt,
}: SystemPromptOptions): string {
	const requestPrompt = getRequestPromptFromHints(requestHints)

	const baseSegments = [regularPrompt]

	// Insert user custom prompt after base prompt if provided
	if (userSystemPrompt) {
		baseSegments.push(userSystemPrompt)
	}

	baseSegments.push(requestPrompt)

	// Exclude artifacts prompt for reasoning models
	const shouldIncludeArtifacts = !(
		selectedChatModel === REASONING_MODEL_ID ||
		selectedModel?.capabilities.includes("reasoning")
	)

	if (shouldIncludeArtifacts) {
		baseSegments.push(artifactsPrompt)
	}

	return baseSegments.join("\n\n")
}

// =============================================================================
// Artifact Handler Prompts
// =============================================================================

/**
 * System prompt for code artifact creation.
 * Used by the code handler for generating Python code.
 */
export const codePrompt = `
Generate self-contained, executable Python code.

**Requirements:**
- **Complete:** Runnable as-is.
- **Output:** Use \`print()\` to show results.
- **Concise:** Keep under 15 lines if possible.
- **Standard Lib:** No external dependencies.
- **Safe:** No \`input()\`, infinite loops, file access, or network calls.
- **Documented:** Brief comments explaining logic.
`

/**
 * System prompt for sheet artifact creation.
 * Used by the sheet handler for generating CSV spreadsheets.
 */
export const sheetPrompt = `
Generate a CSV spreadsheet based on the user's request.
- Include meaningful headers.
- Ensure data is consistent and formatted correctly.
`

/**
 * System prompt for text artifact creation.
 * Used by the text handler for generating markdown content.
 */
export const textPrompt =
	"Write about the given topic. Markdown is supported. Use headings wherever appropriate."

/**
 * Artifact kind type for update prompts.
 * Matches the ArtifactKind from features/artifact/types.ts.
 */
export type ArtifactKindForPrompt = "text" | "code" | "image" | "sheet"

/**
 * Generates a system prompt for updating existing artifacts.
 *
 * @param currentContent - The current artifact content
 * @param type - The type of artifact being updated
 * @returns System prompt for the update operation
 */
export function updateDocumentPrompt(
	currentContent: string | null,
	type: ArtifactKindForPrompt,
): string {
	const mediaType =
		type === "code"
			? "code snippet"
			: type === "sheet"
				? "spreadsheet"
				: "document"

	return `Update the ${mediaType} below based on the user's request.

${currentContent}`
}

/**
 * Generates a system prompt for updating code artifacts.
 * Provides context about the current code and instructions for updates.
 *
 * @param currentContent - The current code content
 * @returns System prompt for code update operation
 */
export function getCodeUpdatePrompt(currentContent: string | null): string {
	return `You are a helpful assistant that helps update Python code.

Current code:
\`\`\`python
${currentContent ?? "# Empty file"}
\`\`\`

Please update the code based on the user's request. Maintain the overall structure and style unless specifically asked to change it.`
}

/**
 * Generates a system prompt for updating sheet artifacts.
 * Provides context about the current CSV content and instructions for updates.
 *
 * @param currentContent - The current CSV content
 * @returns System prompt for sheet update operation
 */
export function getSheetUpdatePrompt(currentContent: string | null): string {
	return `You are a helpful assistant that helps update CSV spreadsheets.

Current CSV content:
\`\`\`csv
${currentContent ?? "# Empty spreadsheet"}
\`\`\`

Please update the spreadsheet based on the user's request. Maintain the overall structure unless specifically asked to change it.`
}

/**
 * Generates a system prompt for updating text artifacts.
 * Provides context about the current document content and instructions for updates.
 *
 * @param currentContent - The current document content
 * @returns System prompt for text update operation
 */
export function getTextUpdatePrompt(currentContent: string | null): string {
	return `You are a helpful assistant that helps update documents.

Current document content:
${currentContent ?? "[Empty document]"}

Please update the document based on the user's request. Maintain the overall structure and style unless specifically asked to change it.`
}
