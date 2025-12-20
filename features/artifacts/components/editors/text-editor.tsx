'use client';

import { memo, useEffect, useMemo, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface TextEditorProps {
  /** Markdown content to display/edit */
  content: string;
  /** Callback when content changes */
  onContentChange?: (content: string, debounce: boolean) => void;
  /** Current artifact status */
  status: 'streaming' | 'idle';
  /** Whether this is the current version being viewed */
  isCurrentVersion: boolean;
}

// ============================================================================
// Lazy-loaded TipTap modules
// ============================================================================

type TipTapModules = {
  Mathematics: typeof import('@tiptap/extension-mathematics').Mathematics;
  migrateMathStrings: typeof import('@tiptap/extension-mathematics').migrateMathStrings;
  Table: typeof import('@tiptap/extension-table').Table;
  TableCell: typeof import('@tiptap/extension-table-cell').TableCell;
  TableHeader: typeof import('@tiptap/extension-table-header').TableHeader;
  TableRow: typeof import('@tiptap/extension-table-row').TableRow;
  Markdown: typeof import('@tiptap/markdown').Markdown;
  EditorContent: typeof import('@tiptap/react').EditorContent;
  useEditor: typeof import('@tiptap/react').useEditor;
  StarterKit: typeof import('@tiptap/starter-kit').StarterKit;
};

let tipTapModulesPromise: Promise<TipTapModules> | null = null;

function loadTipTapModules(): Promise<TipTapModules> {
  if (tipTapModulesPromise) {
    return tipTapModulesPromise;
  }

  tipTapModulesPromise = Promise.all([
    import('@tiptap/extension-mathematics'),
    import('@tiptap/extension-table'),
    import('@tiptap/extension-table-cell'),
    import('@tiptap/extension-table-header'),
    import('@tiptap/extension-table-row'),
    import('@tiptap/markdown'),
    import('@tiptap/react'),
    import('@tiptap/starter-kit'),
  ]).then(
    ([
      mathematicsModule,
      tableModule,
      tableCellModule,
      tableHeaderModule,
      tableRowModule,
      markdownModule,
      reactModule,
      starterKitModule,
    ]) => ({
      Mathematics: mathematicsModule.Mathematics,
      migrateMathStrings: mathematicsModule.migrateMathStrings,
      Table: tableModule.Table,
      TableCell: tableCellModule.TableCell,
      TableHeader: tableHeaderModule.TableHeader,
      TableRow: tableRowModule.TableRow,
      Markdown: markdownModule.Markdown,
      EditorContent: reactModule.EditorContent,
      useEditor: reactModule.useEditor,
      StarterKit: starterKitModule.StarterKit,
    })
  );

  return tipTapModulesPromise;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function EditorSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-5/6" />
      <div className="h-4 bg-muted rounded w-2/3" />
      <div className="h-4 bg-muted rounded w-4/5" />
    </div>
  );
}

// ============================================================================
// Editor Implementation
// ============================================================================

function PureTextEditor({ content, onContentChange, status }: TextEditorProps) {
  const isUpdatingRef = useRef(false);
  const previousContentRef = useRef<string>(content);
  const modulesRef = useRef<TipTapModules | null>(null);
  const [modules, setModules] = React.useState<TipTapModules | null>(null);

  // Load TipTap modules on mount
  useEffect(() => {
    loadTipTapModules().then((loadedModules) => {
      modulesRef.current = loadedModules;
      setModules(loadedModules);
    });
  }, []);

  if (!modules) {
    return <EditorSkeleton />;
  }

  return (
    <TextEditorInner
      content={content}
      modules={modules}
      onContentChange={onContentChange}
      status={status}
    />
  );
}

// Need React import for useState
import React from 'react';

interface TextEditorInnerProps extends Omit<TextEditorProps, 'isCurrentVersion'> {
  modules: TipTapModules;
}

function TextEditorInner({ content, onContentChange, status, modules }: TextEditorInnerProps) {
  const isUpdatingRef = useRef(false);
  const previousContentRef = useRef<string>(content);

  const {
    Mathematics,
    migrateMathStrings,
    Table,
    TableCell,
    TableHeader,
    TableRow,
    Markdown,
    EditorContent,
    useEditor,
    StarterKit,
  } = modules;

  const mathematics = useMemo(
    () =>
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
          errorColor: 'var(--color-muted-foreground)',
        },
      }),
    [Mathematics]
  );

  const editor = useEditor({
    extensions: [
      mathematics,
      StarterKit,
      Markdown,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert relative focus:outline-none',
      },
    },
    onCreate({ editor: currentEditor }) {
      migrateMathStrings(currentEditor);
    },
    onUpdate: ({ editor: currentEditor, transaction }) => {
      if (isUpdatingRef.current || transaction.getMeta('no-save')) {
        return;
      }

      const markdown = currentEditor.getHTML();
      const shouldDebounce = !transaction.getMeta('no-debounce');
      onContentChange?.(markdown, shouldDebounce);
    },
  });

  // Update content when streaming or content changes externally
  useEffect(() => {
    if (!editor || !content) {
      return;
    }

    const currentMarkdown = editor.getHTML();

    if (status === 'streaming') {
      isUpdatingRef.current = true;
      editor.commands.setContent(content);
      migrateMathStrings(editor);
      previousContentRef.current = content;
      isUpdatingRef.current = false;
      return;
    }

    if (currentMarkdown !== content && previousContentRef.current !== content) {
      isUpdatingRef.current = true;
      editor.commands.setContent(content);
      migrateMathStrings(editor);
      previousContentRef.current = content;
      isUpdatingRef.current = false;
    }
  }, [content, status, editor, migrateMathStrings]);

  return <EditorContent editor={editor} />;
}

// ============================================================================
// Memoization
// ============================================================================

function areEqual(prevProps: TextEditorProps, nextProps: TextEditorProps) {
  return (
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    !(prevProps.status === 'streaming' && nextProps.status === 'streaming') &&
    prevProps.content === nextProps.content &&
    prevProps.onContentChange === nextProps.onContentChange
  );
}

export const TextEditor = memo(PureTextEditor, areEqual);
