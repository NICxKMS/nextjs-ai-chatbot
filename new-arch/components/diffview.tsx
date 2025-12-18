"use client";

import { Editor, Extension, Mark as TiptapMark } from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { Markdown } from "@tiptap/markdown";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DecorationSet } from "@tiptap/pm/view";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { useEffect, useMemo } from "react";

import { DiffType, diffEditor } from "@/lib/editor/diff";

// Create a custom mark for diff highlighting
const DiffMark = TiptapMark.create({
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
                    const type = node.getAttribute("data-diff-type");
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
});

// Create extension to apply diff on content
const DiffExtension = Extension.create({
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
});

type DiffEditorProps = {
    oldContent: string;
    newContent: string;
};

export const DiffView = ({ oldContent, newContent }: DiffEditorProps) => {
    // Compute diff content using useMemo to avoid recalculation
    const diffContent = useMemo(() => {
        // Create temporary editors to parse markdown
        const oldEditor = new Editor({
            extensions: [
                StarterKit,
                Markdown,
                Table.configure({ resizable: true }),
                TableRow,
                TableHeader,
                TableCell,
                DiffMark,
            ],
            content: oldContent,
            contentType: "markdown",
        });

        const newEditor = new Editor({
            extensions: [
                StarterKit,
                Markdown,
                Table.configure({ resizable: true }),
                TableRow,
                TableHeader,
                TableCell,
                DiffMark,
            ],
            content: newContent,
            contentType: "markdown",
        });

        const oldDoc = oldEditor.state.doc;
        const newDoc = newEditor.state.doc;

        // Compute diff
        const diffedDoc = diffEditor(
            oldEditor.schema,
            oldDoc.toJSON(),
            newDoc.toJSON()
        );

        // Cleanup temporary editors
        oldEditor.destroy();
        newEditor.destroy();

        return diffedDoc.toJSON();
    }, [oldContent, newContent]);

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
};
