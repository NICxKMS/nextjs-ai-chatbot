'use client';

import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { ClipboardCopy, Undo, Redo, History, Pen, MessageSquare } from 'lucide-react';

import { Artifact } from './base';
import type { ArtifactContentProps } from '../types';

// ============================================================================
// Dynamic Imports
// ============================================================================

const TextEditor = dynamic(
  () => import('../components/editors').then((m) => m.TextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-muted-foreground text-sm">Loading editor…</div>
      </div>
    ),
  }
);

const DiffView = dynamic(
  () => import('../components/editors').then((m) => m.DiffView),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-muted-foreground text-sm">Loading diff…</div>
    ),
  }
);

// ============================================================================
// Text Artifact Definition
// ============================================================================

export const textArtifact = new Artifact<'text', undefined>({
  kind: 'text',
  description: 'Useful for text content, like drafting essays and emails.',
  content: ({
    mode,
    status,
    content,
    isCurrentVersion,
    currentVersionIndex,
    onSaveContent,
    getDocumentContentById,
    isLoading,
  }: ArtifactContentProps<undefined>) => {
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center p-4">
          <div className="text-muted-foreground text-sm">Loading document…</div>
        </div>
      );
    }

    if (mode === 'diff') {
      const oldContent = getDocumentContentById(currentVersionIndex - 1);
      const newContent = getDocumentContentById(currentVersionIndex);
      return <DiffView newContent={newContent} oldContent={oldContent} />;
    }

    return (
      <div className="flex flex-row px-4 py-8 md:p-20">
        <TextEditor
          content={content}
          status={status}
          onContentChange={onSaveContent}
          isCurrentVersion={isCurrentVersion}
        />
      </div>
    );
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === 'data-textDelta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: draftArtifact.content + (streamPart.data as string),
        isVisible:
          draftArtifact.status === 'streaming' &&
          draftArtifact.content.length > 400 &&
          draftArtifact.content.length < 450
            ? true
            : draftArtifact.isVisible,
        status: 'streaming',
      }));
    }
  },
  actions: [
    {
      icon: <History size={18} />,
      description: 'View changes',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('toggle');
      },
      isDisabled: ({ currentVersionIndex }) => currentVersionIndex === 0,
    },
    {
      icon: <Undo size={18} />,
      description: 'View Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => currentVersionIndex === 0,
    },
    {
      icon: <Redo size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => isCurrentVersion,
    },
    {
      icon: <ClipboardCopy size={18} />,
      description: 'Copy to clipboard',
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard!');
      },
    },
  ],
  toolbar: [
    {
      icon: <Pen size={18} />,
      description: 'Add final polish',
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'Please add final polish and check for grammar, add section titles for better structure, and ensure everything reads smoothly.',
            },
          ],
        });
      },
    },
    {
      icon: <MessageSquare size={18} />,
      description: 'Request suggestions',
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'Please add suggestions you have that could improve the writing.',
            },
          ],
        });
      },
    },
  ],
});
