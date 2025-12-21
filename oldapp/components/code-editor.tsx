"use client";

import type { EditorState, Transaction } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { memo, useEffect, useRef, useState } from "react";
import type { Suggestion } from "@/lib/db/schema";

// Lazy-loaded CodeMirror modules
type CodeMirrorModules = {
    EditorState: typeof EditorState;
    Transaction: typeof Transaction;
    EditorView: typeof EditorView;
    basicSetup: typeof import("codemirror").basicSetup;
    python: typeof import("@codemirror/lang-python").python;
    oneDark: typeof import("@codemirror/theme-one-dark").oneDark;
};

// Module cache to avoid reloading
let codeMirrorModulesPromise: Promise<CodeMirrorModules> | null = null;

function loadCodeMirrorModules(): Promise<CodeMirrorModules> {
    if (codeMirrorModulesPromise) {
        return codeMirrorModulesPromise;
    }

    codeMirrorModulesPromise = Promise.all([
        import("@codemirror/state"),
        import("@codemirror/view"),
        import("codemirror"),
        import("@codemirror/lang-python"),
        import("@codemirror/theme-one-dark"),
    ]).then(
        ([stateModule, viewModule, cmModule, pythonModule, themeModule]) => ({
            EditorState: stateModule.EditorState,
            Transaction: stateModule.Transaction,
            EditorView: viewModule.EditorView,
            basicSetup: cmModule.basicSetup,
            python: pythonModule.python,
            oneDark: themeModule.oneDark,
        })
    );

    return codeMirrorModulesPromise;
}

type EditorProps = {
    content: string;
    onSaveContent: (updatedContent: string, debounce: boolean) => void;
    status: "streaming" | "idle";
    isCurrentVersion: boolean;
    currentVersionIndex: number;
    suggestions: Suggestion[];
};

function PureCodeEditor({ content, onSaveContent, status }: EditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<EditorView | null>(null);
    const [modules, setModules] = useState<CodeMirrorModules | null>(null);

    // Load CodeMirror modules on mount
    useEffect(() => {
        loadCodeMirrorModules().then(setModules);
    }, []);

    // Initialize editor once modules are loaded
    useEffect(() => {
        if (!modules || !containerRef.current || editorRef.current) {
            return;
        }

        const { EditorState, EditorView, basicSetup, python, oneDark } =
            modules;

        const startState = EditorState.create({
            doc: content,
            extensions: [basicSetup, python(), oneDark],
        });

        editorRef.current = new EditorView({
            state: startState,
            parent: containerRef.current,
        });

        return () => {
            if (editorRef.current) {
                editorRef.current.destroy();
                editorRef.current = null;
            }
        };
        // NOTE: we only want to run this effect once after modules load
        // eslint-disable-next-line
    }, [modules, content]);

    // Update listener when onSaveContent changes
    useEffect(() => {
        if (!modules || !editorRef.current) {
            return;
        }

        const {
            EditorState,
            Transaction,
            EditorView,
            basicSetup,
            python,
            oneDark,
        } = modules;

        const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                const transaction = update.transactions.find(
                    (tr) => !tr.annotation(Transaction.remote)
                );

                if (transaction) {
                    const newContent = update.state.doc.toString();
                    onSaveContent(newContent, true);
                }
            }
        });

        const currentSelection = editorRef.current.state.selection;

        const newState = EditorState.create({
            doc: editorRef.current.state.doc,
            extensions: [basicSetup, python(), oneDark, updateListener],
            selection: currentSelection,
        });

        editorRef.current.setState(newState);
    }, [modules, onSaveContent]);

    // Sync content changes
    useEffect(() => {
        if (!modules || !editorRef.current || !content) {
            return;
        }

        const { Transaction } = modules;
        const currentContent = editorRef.current.state.doc.toString();

        if (status === "streaming" || currentContent !== content) {
            const transaction = editorRef.current.state.update({
                changes: {
                    from: 0,
                    to: currentContent.length,
                    insert: content,
                },
                annotations: [Transaction.remote.of(true)],
            });

            editorRef.current.dispatch(transaction);
        }
    }, [modules, content, status]);

    // Show loading skeleton while modules load
    if (!modules) {
        return (
            <div className="not-prose relative w-full pb-[calc(80dvh)] text-sm">
                <div className="animate-pulse space-y-2 p-4">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-5/6" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                </div>
            </div>
        );
    }

    return (
        <div
            className="not-prose relative w-full pb-[calc(80dvh)] text-sm"
            ref={containerRef}
        />
    );
}

function areEqual(prevProps: EditorProps, nextProps: EditorProps) {
    if (prevProps.suggestions !== nextProps.suggestions) {
        return false;
    }
    if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex) {
        return false;
    }
    if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) {
        return false;
    }
    if (prevProps.status === "streaming" && nextProps.status === "streaming") {
        return false;
    }
    if (prevProps.content !== nextProps.content) {
        return false;
    }

    return true;
}

export const CodeEditor = memo(PureCodeEditor, areEqual);
