"use client";

import { useEffect, useMemo, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export type DiffViewProps = {
    /** Original content for comparison */
    oldContent: string;
    /** New content for comparison */
    newContent: string;
};

// ============================================================================
// Diff Type Constants
// ============================================================================

export const DiffType = {
    Unchanged: 0,
    Deleted: -1,
    Inserted: 1,
} as const;

export type DiffTypeValue = (typeof DiffType)[keyof typeof DiffType];

// ============================================================================
// Lazy-loaded TipTap modules for diff rendering
// ============================================================================

type TipTapDiffModules = {
    Editor: typeof import("@tiptap/core").Editor;
    Extension: typeof import("@tiptap/core").Extension;
    Mark: typeof import("@tiptap/core").Mark;
    Table: typeof import("@tiptap/extension-table").Table;
    TableCell: typeof import("@tiptap/extension-table-cell").TableCell;
    TableHeader: typeof import("@tiptap/extension-table-header").TableHeader;
    TableRow: typeof import("@tiptap/extension-table-row").TableRow;
    Markdown: typeof import("@tiptap/markdown").Markdown;
    Plugin: typeof import("@tiptap/pm/state").Plugin;
    PluginKey: typeof import("@tiptap/pm/state").PluginKey;
    DecorationSet: typeof import("@tiptap/pm/view").DecorationSet;
    EditorContent: typeof import("@tiptap/react").EditorContent;
    useEditor: typeof import("@tiptap/react").useEditor;
    StarterKit: typeof import("@tiptap/starter-kit").StarterKit;
    diff_match_patch: typeof import("diff-match-patch").diff_match_patch;
};

let tipTapDiffModulesPromise: Promise<TipTapDiffModules> | null = null;

function loadTipTapDiffModules(): Promise<TipTapDiffModules> {
    if (tipTapDiffModulesPromise) {
        return tipTapDiffModulesPromise;
    }

    tipTapDiffModulesPromise = Promise.all([
        import("@tiptap/core"),
        import("@tiptap/extension-table"),
        import("@tiptap/extension-table-cell"),
        import("@tiptap/extension-table-header"),
        import("@tiptap/extension-table-row"),
        import("@tiptap/markdown"),
        import("@tiptap/pm/state"),
        import("@tiptap/pm/view"),
        import("@tiptap/react"),
        import("@tiptap/starter-kit"),
        import("diff-match-patch"),
    ]).then(
        ([
            coreModule,
            tableModule,
            tableCellModule,
            tableHeaderModule,
            tableRowModule,
            markdownModule,
            pmStateModule,
            pmViewModule,
            reactModule,
            starterKitModule,
            diffMatchPatchModule,
        ]) => ({
            Editor: coreModule.Editor,
            Extension: coreModule.Extension,
            Mark: coreModule.Mark,
            Table: tableModule.Table,
            TableCell: tableCellModule.TableCell,
            TableHeader: tableHeaderModule.TableHeader,
            TableRow: tableRowModule.TableRow,
            Markdown: markdownModule.Markdown,
            Plugin: pmStateModule.Plugin,
            PluginKey: pmStateModule.PluginKey,
            DecorationSet: pmViewModule.DecorationSet,
            EditorContent: reactModule.EditorContent,
            useEditor: reactModule.useEditor,
            StarterKit: starterKitModule.StarterKit,
            diff_match_patch: diffMatchPatchModule.diff_match_patch,
        })
    );

    return tipTapDiffModulesPromise;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function DiffSkeleton() {
    return (
        <div className="w-full rounded-lg border border-border bg-background p-4">
            <div className="animate-pulse space-y-3">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-5/6 rounded bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
        </div>
    );
}

// ============================================================================
// Component
// ============================================================================

export function DiffView({ oldContent, newContent }: DiffViewProps) {
    const [modules, setModules] = useState<TipTapDiffModules | null>(null);

    useEffect(() => {
        loadTipTapDiffModules().then(setModules);
    }, []);

    if (!modules) {
        return <DiffSkeleton />;
    }

    return (
        <DiffViewInner
            modules={modules}
            newContent={newContent}
            oldContent={oldContent}
        />
    );
}

interface DiffViewInnerProps extends DiffViewProps {
    modules: TipTapDiffModules;
}

function DiffViewInner({
    oldContent,
    newContent,
    modules,
}: DiffViewInnerProps) {
    const {
        Extension,
        Mark,
        Table,
        TableCell,
        TableHeader,
        TableRow,
        Markdown,
        Plugin,
        PluginKey,
        DecorationSet,
        EditorContent,
        useEditor,
        StarterKit,
        diff_match_patch,
    } = modules;

    // Create DiffMark extension
    const DiffMark = useMemo(
        () =>
            Mark.create({
                name: "diffMark",

                addAttributes() {
                    return {
                        type: {
                            default: "",
                        },
                    };
                },

                parseHTML() {
                    return [
                        {
                            tag: "span[data-diff-type]",
                            getAttrs: (node: string | HTMLElement) => {
                                if (typeof node === "string") {
                                    return {};
                                }
                                const type =
                                    node.getAttribute("data-diff-type");
                                return { type };
                            },
                        },
                    ];
                },

                renderHTML({
                    HTMLAttributes,
                }: {
                    HTMLAttributes: Record<string, unknown>;
                }) {
                    const type = HTMLAttributes.type;
                    let className = "";

                    switch (type) {
                        case DiffType.Inserted:
                            className =
                                "bg-green-100 text-green-700 dark:bg-green-500/70 dark:text-green-300";
                            break;
                        case DiffType.Deleted:
                            className =
                                "bg-red-100 line-through text-red-600 dark:bg-red-500/70 dark:text-red-300";
                            break;
                        default:
                            className = "";
                    }

                    return [
                        "span",
                        {
                            class: className,
                            "data-diff-type": type,
                        },
                        0,
                    ];
                },
            }),
        [Mark]
    );

    // Create DiffExtension
    const DiffExtension = useMemo(
        () =>
            Extension.create({
                name: "diff",

                addProseMirrorPlugins() {
                    return [
                        new Plugin({
                            key: new PluginKey("diff"),
                            state: {
                                init() {
                                    return DecorationSet.empty;
                                },
                                apply(tr, decorations) {
                                    return decorations.map(tr.mapping, tr.doc);
                                },
                            },
                        }),
                    ];
                },
            }),
        [Extension, Plugin, PluginKey, DecorationSet]
    );

    // Compute diff content
    const diffContent = useMemo(() => {
        // Use diff-match-patch for simple text diff
        const dmp = new diff_match_patch();
        const diffs = dmp.diff_main(oldContent, newContent);
        dmp.diff_cleanupSemantic(diffs);

        // Build markdown with diff markers
        let result = "";
        for (const [op, text] of diffs) {
            if (op === 0) {
                // Unchanged
                result += text;
            } else if (op === -1) {
                // Deleted
                result += `<span data-diff-type="${DiffType.Deleted}">${text}</span>`;
            } else if (op === 1) {
                // Inserted
                result += `<span data-diff-type="${DiffType.Inserted}">${text}</span>`;
            }
        }

        return result;
    }, [oldContent, newContent, diff_match_patch]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Markdown,
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            DiffMark,
            DiffExtension,
        ],
        content: diffContent,
        editable: false,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: "prose dark:prose-invert max-w-none focus:outline-none",
            },
        },
    });

    useEffect(() => {
        if (editor && diffContent) {
            editor.commands.setContent(diffContent);
        }
    }, [editor, diffContent]);

    return (
        <div className="w-full rounded-lg border border-border bg-background p-4">
            <EditorContent editor={editor} />
        </div>
    );
}
