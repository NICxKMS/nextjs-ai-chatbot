"use client";

/**
 * TipTap Suggestions Extension
 *
 * Provides inline suggestion decorations for TipTap editor.
 * Displays AI-generated text suggestions with apply/reject actions.
 *
 * @module lib/editor/suggestions-extension
 */

import { Extension } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { createRoot } from "react-dom/client";
import type { Suggestion } from "@/lib/db/schema";
import type { ArtifactKind } from "@/lib/types";

// ============================================================================
// Types
// ============================================================================

/**
 * Streaming suggestion - partial Suggestion used during AI streaming
 * before full persistence to database.
 */
export type StreamingSuggestion = Omit<
    Suggestion,
    "userId" | "createdAt" | "documentCreatedAt"
>;

/**
 * Union type accepting both persisted and streaming suggestions.
 */
export type SuggestionLike = Suggestion | StreamingSuggestion;

/**
 * UI-ready suggestion with computed position information.
 */
export interface UISuggestion extends StreamingSuggestion {
    /** Start position in document */
    selectionStart: number;
    /** End position in document */
    selectionEnd: number;
}

/**
 * Position range within a ProseMirror document.
 */
type Position = {
    start: number;
    end: number;
};

/**
 * Plugin state for tracking suggestion decorations.
 */
export interface SuggestionsPluginState {
    decorations: DecorationSet;
    selected: string | null;
}

/**
 * Options for the suggestions extension.
 */
export interface SuggestionOptions {
    /** Callback when a suggestion is applied */
    onApply?: (suggestion: UISuggestion) => void;
    /** Callback when a suggestion is rejected */
    onReject?: (suggestion: UISuggestion) => void;
    /** Default artifact kind for styling */
    artifactKind?: ArtifactKind;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Find the position of a text string within a ProseMirror document.
 *
 * @param doc - ProseMirror document node
 * @param searchText - Text to find
 * @returns Position range or null if not found
 */
function findPositionsInDoc(doc: Node, searchText: string): Position | null {
    let positions: Position | null = null;

    doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (node.isText && node.text) {
            const index = node.text.indexOf(searchText);

            if (index !== -1) {
                positions = {
                    start: pos + index,
                    end: pos + index + searchText.length,
                };

                return false;
            }
        }

        return true;
    });

    return positions;
}

/**
 * Project suggestions onto document positions.
 * Maps suggestion originalText to document coordinates.
 *
 * @param doc - ProseMirror document
 * @param suggestions - Array of suggestions to position
 * @returns Array of UI suggestions with positions
 */
export function getSuggestionPositions(
    doc: Node,
    suggestions: SuggestionLike[]
): UISuggestion[] {
    return suggestions.map((suggestion) => {
        const positions = findPositionsInDoc(doc, suggestion.originalText);

        if (!positions) {
            return {
                ...suggestion,
                selectionStart: 0,
                selectionEnd: 0,
            };
        }

        return {
            ...suggestion,
            selectionStart: positions.start,
            selectionEnd: positions.end,
        };
    });
}

// ============================================================================
// Suggestion Widget
// ============================================================================

/**
 * Props for the inline suggestion widget.
 */
interface SuggestionWidgetProps {
    suggestion: UISuggestion;
    onApply: () => void;
    artifactKind: ArtifactKind;
}

/**
 * Inline suggestion widget component.
 * Displays expandable suggestion with apply action.
 */
function SuggestionWidget({
    suggestion,
    onApply,
    artifactKind,
}: SuggestionWidgetProps) {
    const [isExpanded, setIsExpanded] = React.useState(false);

    const expandedClasses =
        artifactKind === "text"
            ? "-right-12 absolute z-50 flex w-56 flex-col gap-2 rounded-lg border bg-background p-3 font-sans text-sm shadow-xl"
            : "absolute right-0 z-50 flex w-56 flex-col gap-2 rounded-lg border bg-background p-3 font-sans text-sm shadow-xl";

    const collapsedClasses =
        artifactKind === "text"
            ? "-right-6 absolute cursor-pointer p-1 text-muted-foreground hover:text-foreground"
            : "sticky right-2 top-0 cursor-pointer p-1 text-muted-foreground hover:text-foreground";

    return (
        <span className="suggestion-widget relative inline-block">
            {isExpanded ? (
                <span className={expandedClasses} style={{ top: "-1.5rem" }}>
                    <span className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <span className="size-4 rounded-full bg-muted-foreground/25" />
                            <span className="font-medium">Assistant</span>
                        </span>
                        <button
                            className="cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setIsExpanded(false)}
                            title="Close"
                            type="button"
                        >
                            ✕
                        </button>
                    </span>
                    {suggestion.description && (
                        <span className="text-muted-foreground">
                            {suggestion.description}
                        </span>
                    )}
                    <button
                        className="w-fit rounded-full border px-3 py-1 text-xs hover:bg-muted"
                        onClick={onApply}
                        type="button"
                    >
                        Apply
                    </button>
                </span>
            ) : (
                <button
                    className={collapsedClasses}
                    onClick={() => setIsExpanded(true)}
                    title="View suggestion"
                    type="button"
                >
                    💬
                </button>
            )}
        </span>
    );
}

// Import React for the widget
import * as React from "react";

/**
 * Create a suggestion widget DOM element with React rendering.
 *
 * @param suggestion - The suggestion to render
 * @param view - ProseMirror editor view
 * @param artifactKind - Type of artifact for styling
 * @returns DOM element and cleanup function
 */
export function createSuggestionWidget(
    suggestion: UISuggestion,
    view: EditorView,
    artifactKind: ArtifactKind = "text"
): { dom: HTMLElement; destroy: () => void } {
    const dom = document.createElement("span");
    const root = createRoot(dom);

    const handleMouseDown = (event: MouseEvent) => {
        event.preventDefault();
        view.dom.blur();
    };

    dom.addEventListener("mousedown", handleMouseDown);

    const onApply = () => {
        const { state, dispatch } = view;

        // Remove decoration for this suggestion
        const decorationTransaction = state.tr;
        const currentState = suggestionsPluginKey.getState(state);
        const currentDecorations = currentState?.decorations;

        if (currentDecorations) {
            const newDecorations = DecorationSet.create(
                state.doc,
                currentDecorations.find().filter((decoration: Decoration) => {
                    return decoration.spec.suggestionId !== suggestion.id;
                })
            );

            decorationTransaction.setMeta(suggestionsPluginKey, {
                decorations: newDecorations,
                selected: null,
            });
            dispatch(decorationTransaction);
        }

        // Apply text replacement
        const textTransaction = view.state.tr.replaceWith(
            suggestion.selectionStart,
            suggestion.selectionEnd,
            state.schema.text(suggestion.suggestedText)
        );

        textTransaction.setMeta("no-debounce", true);
        dispatch(textTransaction);
    };

    root.render(
        <SuggestionWidget
            artifactKind={artifactKind}
            onApply={onApply}
            suggestion={suggestion}
        />
    );

    return {
        dom,
        destroy: () => {
            dom.removeEventListener("mousedown", handleMouseDown);
            // Defer unmount to avoid React warnings during render
            setTimeout(() => {
                root.unmount();
            }, 0);
        },
    };
}

// ============================================================================
// Decoration Creator
// ============================================================================

/**
 * Create ProseMirror decorations for suggestions.
 * Creates both highlight decorations and widget decorations.
 *
 * @param suggestions - Array of positioned suggestions
 * @param view - ProseMirror editor view
 * @param artifactKind - Type of artifact for styling
 * @returns DecorationSet with all suggestion decorations
 */
export function createSuggestionDecorations(
    suggestions: UISuggestion[],
    view: EditorView,
    artifactKind: ArtifactKind = "text"
): DecorationSet {
    const decorations: Decoration[] = [];

    for (const suggestion of suggestions) {
        // Skip suggestions without valid positions
        if (
            suggestion.selectionStart === 0 &&
            suggestion.selectionEnd === 0 &&
            suggestion.originalText.length > 0
        ) {
            continue;
        }

        // Highlight decoration for the original text
        decorations.push(
            Decoration.inline(
                suggestion.selectionStart,
                suggestion.selectionEnd,
                {
                    class: "suggestion-highlight",
                },
                {
                    suggestionId: suggestion.id,
                    type: "highlight",
                }
            )
        );

        // Widget decoration for the suggestion popup
        decorations.push(
            Decoration.widget(
                suggestion.selectionStart,
                (currentView) => {
                    const { dom, destroy } = createSuggestionWidget(
                        suggestion,
                        currentView,
                        artifactKind
                    );
                    // Store destroy function on DOM element for cleanup
                    (
                        dom as HTMLElement & {
                            __suggestionDestroy?: () => void;
                        }
                    ).__suggestionDestroy = destroy;
                    return dom;
                },
                {
                    suggestionId: suggestion.id,
                    type: "widget",
                    destroy: (node) => {
                        const dom = node as unknown as HTMLElement & {
                            __suggestionDestroy?: () => void;
                        };
                        dom.__suggestionDestroy?.();
                    },
                }
            )
        );
    }

    return DecorationSet.create(view.state.doc, decorations);
}

// ============================================================================
// Plugin Key
// ============================================================================

/**
 * ProseMirror plugin key for the suggestions extension.
 * Use this to access suggestion state from editor state.
 */
export const suggestionsPluginKey = new PluginKey<SuggestionsPluginState>(
    "suggestions"
);

// ============================================================================
// TipTap Extension
// ============================================================================

/**
 * TipTap extension for inline text suggestions.
 *
 * @example
 * ```typescript
 * import { SuggestionsExtension } from '@/lib/editor';
 *
 * const editor = useEditor({
 *   extensions: [
 *     StarterKit,
 *     SuggestionsExtension,
 *   ],
 * });
 *
 * // Apply suggestions
 * const positioned = getSuggestionPositions(editor.state.doc, suggestions);
 * const decorations = createSuggestionDecorations(positioned, editor.view);
 * editor.view.dispatch(
 *   editor.state.tr.setMeta(suggestionsPluginKey, { decorations })
 * );
 * ```
 */
export const SuggestionsExtension = Extension.create<SuggestionOptions>({
    name: "suggestions",

    addOptions() {
        return {
            onApply: undefined,
            onReject: undefined,
            artifactKind: "text",
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin<SuggestionsPluginState>({
                key: suggestionsPluginKey,
                state: {
                    init(): SuggestionsPluginState {
                        return {
                            decorations: DecorationSet.empty,
                            selected: null,
                        };
                    },
                    apply(tr, state): SuggestionsPluginState {
                        const newDecorations = tr.getMeta(suggestionsPluginKey);
                        if (newDecorations) {
                            return newDecorations;
                        }

                        return {
                            decorations: state.decorations.map(
                                tr.mapping,
                                tr.doc
                            ),
                            selected: state.selected,
                        };
                    },
                },
                props: {
                    decorations(state) {
                        return (
                            this.getState(state)?.decorations ??
                            DecorationSet.empty
                        );
                    },
                },
            }),
        ];
    },
});

// ============================================================================
// Legacy Alias
// ============================================================================

/**
 * Alias for getSuggestionPositions for backward compatibility.
 * @deprecated Use getSuggestionPositions instead
 */
export const projectWithPositions = getSuggestionPositions;
