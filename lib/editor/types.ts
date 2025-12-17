import type { Suggestion } from "@/lib/db/schema";
import type { StreamingSuggestion } from "@/lib/types";

/**
 * Shared type for suggestions - either from DB or streaming.
 * Extracted to prevent TipTap runtime imports from being pulled into consumers.
 */
export type SuggestionLike = Suggestion | StreamingSuggestion;

/**
 * UI representation of a suggestion with selection information.
 */
export interface UISuggestion extends StreamingSuggestion {
    selectionStart: number;
    selectionEnd: number;
}
