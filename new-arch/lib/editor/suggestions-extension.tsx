"use client";

import { Extension } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { createRoot } from "react-dom/client";
import type { ArtifactKind } from "@/components/artifact";
import { Suggestion as PreviewSuggestion } from "@/components/suggestion";
import type { Suggestion } from "@/lib/data/schema";

// Streaming suggestion type - a partial Suggestion used during streaming
// before the full Suggestion is persisted to the database
export type StreamingSuggestion = Omit<
    Suggestion,
    "userId" | "createdAt" | "documentCreatedAt"
>;

// A suggestion-like type that accepts both full Suggestions and StreamingSuggestions
export type SuggestionLike = Suggestion | StreamingSuggestion;

export type UISuggestion = StreamingSuggestion & {
    selectionStart: number;
    selectionEnd: number;
};

type Position = {
    start: number;
    end: number;
};

function findPositionsInDoc(doc: Node, searchText: string): Position | null {
    let positions: { start: number; end: number } | null = null;

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

export function projectWithPositions(
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

        const textTransaction = view.state.tr.replaceWith(
            suggestion.selectionStart,
            suggestion.selectionEnd,
            state.schema.text(suggestion.suggestedText)
        );

        textTransaction.setMeta("no-debounce", true);

        dispatch(textTransaction);
    };

    root.render(
        <PreviewSuggestion
            artifactKind={artifactKind}
            onApply={onApply}
            suggestion={suggestion}
        />
    );

    return {
        dom,
        destroy: () => {
            dom.removeEventListener("mousedown", handleMouseDown);
            // Wrapping unmount in setTimeout to avoid synchronous unmounting during render
            setTimeout(() => {
                root.unmount();
            }, 0);
        },
    };
}

export const createDecorations = (
    suggestions: UISuggestion[],
    view: EditorView
) => {
    const decorations: Decoration[] = [];

    for (const suggestion of suggestions) {
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

        decorations.push(
            Decoration.widget(
                suggestion.selectionStart,
                (currentView) => {
                    const { dom, destroy } = createSuggestionWidget(
                        suggestion,
                        currentView
                    );
                    // Store destroy on DOM element for cleanup
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
};

export const suggestionsPluginKey = new PluginKey("suggestions");

export const SuggestionsExtension = Extension.create({
    name: "suggestions",

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: suggestionsPluginKey,
                state: {
                    init() {
                        return {
                            decorations: DecorationSet.empty,
                            selected: null,
                        };
                    },
                    apply(tr, state) {
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
