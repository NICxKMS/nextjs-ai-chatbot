import type { SettingsState } from "@/lib/types/settings.types"

// ── Prompt Segments ──────────────────────────────────────────────────────────

const BASE_PROMPT = `\
You are a helpful AI assistant.

**Style Guide:**
- Be concise and direct.
- Use short paragraphs and bullet points for readability.
- Avoid fluff and filler phrases.

**Interaction:**
- Match the user's tone.
- Acknowledge uncertainty; do not guess.
- Ask clarifying questions only if essential.`

const ARTIFACTS_PROMPT = `\
You have access to "Artifacts", a side-panel UI for creating and editing content.

**Tool Usage:**
- Use \`createArtifact\` for:
  - Substantial content (>10 lines).
  - Code snippets (Python only).
  - Content likely to be saved/reused (emails, essays, spreadsheets).
- Use \`updateArtifact\` for:
  - Modifying existing artifacts based on user feedback.
  - Prefer full rewrites for major changes.

**Artifact Kinds:**
- \`text\` — prose, articles, or rich content.
- \`code\` — executable Python code. Wrap in \`\`\`python ... \`\`\`.
- \`sheet\` — CSV spreadsheets with meaningful headers.

**Constraints:**
- **Code:** Always use Artifacts for code. Only Python is supported.
- **Timing:** NEVER update an artifact immediately after creating it. Wait for user feedback.
- **Exclusions:** Do not use Artifacts for short, informational, or conversational responses.`

// ── Prompt for artifact-specific content generation ──────────────────────────

/** System prompt segment for generating code artifacts. */
export const CODE_PROMPT = `\
Generate self-contained, executable Python code.

**Requirements:**
- **Complete:** Runnable as-is.
- **Output:** Use \`print()\` to show results.
- **Concise:** Keep under 15 lines if possible.
- **Standard Lib:** No external dependencies.
- **Safe:** No \`input()\`, infinite loops, file access, or network calls.
- **Documented:** Brief comments explaining logic.`

/** System prompt segment for generating spreadsheet artifacts. */
export const SHEET_PROMPT = `\
Generate a CSV spreadsheet based on the user's request.
- Include meaningful headers.
- Ensure data is consistent and formatted correctly.`

/** System prompt segment for updating existing artifact content. */
export function getUpdateArtifactPrompt(
	currentContent: string | null,
	kind: "text" | "code" | "sheet" | "image",
): string {
	const mediaType =
		kind === "code"
			? "code snippet"
			: kind === "sheet"
				? "spreadsheet"
				: kind === "image"
					? "image"
					: "text artifact"

	return `Update the ${mediaType} below based on the user's request.

${currentContent}`
}

// ── Date Context ─────────────────────────────────────────────────────────────

function getDateContext(): string {
	const now = new Date()
	return `Current date and time: ${now.toISOString()} (${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })})`
}

// ── System Prompt Composition ────────────────────────────────────────────────

export interface ComposeSystemPromptOptions {
	/** Current user settings (may include a custom system prompt). */
	settings?: SettingsState
	/** Whether the model has access to tools (e.g. createArtifact). */
	hasTools?: boolean
	/** Whether the model supports reasoning/chain-of-thought. */
	supportsReasoning?: boolean
}

/**
 * Compose the full system prompt for a chat completion request.
 *
 * Assembles segments in order:
 * 1. Base assistant identity and style guide
 * 2. Current date/time context
 * 3. User's custom system prompt (if provided)
 * 4. Artifact/tool instructions (when tools are enabled and model is not reasoning-only)
 *
 * @returns A non-empty system prompt string.
 */
export function composeSystemPrompt({
	settings,
	hasTools = false,
	supportsReasoning = false,
}: ComposeSystemPromptOptions = {}): string {
	const segments: string[] = [BASE_PROMPT, getDateContext()]

	// User-defined system prompt (injected between base and tool instructions)
	if (settings?.systemPrompt) {
		segments.push(settings.systemPrompt)
	}

	// Artifact instructions: included when the model has tools AND is not
	// a reasoning-only model (reasoning models typically don't use artifacts).
	if (hasTools && !supportsReasoning) {
		segments.push(ARTIFACTS_PROMPT)
	}

	return segments.join("\n\n")
}
