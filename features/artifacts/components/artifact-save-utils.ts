import type { Artifact } from "@/lib/types/entity.types"

// ── Types ────────────────────────────────────────────────────

export type SaveState = "idle" | "pending" | "error"

// ── Constants ────────────────────────────────────────────────

export const DEFAULT_SAVE_ERROR_MESSAGE = "Failed to save changes. Please try again."

export const SAVE_DEBOUNCE_MS = 2000

// ── SWR fetcher ──────────────────────────────────────────────

export async function artifactVersionFetcher(url: string): Promise<Artifact[]> {
	const res = await fetch(url)
	if (!res.ok) throw new Error(`Artifact fetch failed: ${res.status}`)
	return res.json()
}

// ── Version merging ──────────────────────────────────────────

export function mergeArtifactVersion(
	versions: Artifact[] | undefined,
	nextVersion: Artifact,
): Artifact[] {
	const remainingVersions =
		versions?.filter((version) => version.createdAt !== nextVersion.createdAt) ?? []

	return [nextVersion, ...remainingVersions]
}

// ── Error message extraction ─────────────────────────────────

export async function readSaveErrorMessage(response: Response): Promise<string> {
	if (typeof response.json === "function") {
		try {
			const body = (await response.json()) as {
				message?: string
				error?: string
				errorMessage?: string
			}

			for (const candidate of [body.message, body.error, body.errorMessage]) {
				if (typeof candidate === "string" && candidate.trim().length > 0) {
					return candidate
				}
			}
		} catch {
			// Fall back to the generic save error below.
		}
	}

	return DEFAULT_SAVE_ERROR_MESSAGE
}
