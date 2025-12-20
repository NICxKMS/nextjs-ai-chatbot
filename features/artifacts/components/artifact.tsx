'use client';

import type { UseChatHelpers } from '@ai-sdk/react';
import { formatDistance } from 'date-fns';
import equal from 'fast-deep-equal';
import {
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useDebounceCallback } from 'usehooks-ts';
import { AnimatePresence, m as motion } from 'framer-motion';

import { useArtifact } from '../hooks';
import { useWindowSize } from '@/shared/hooks';
import { useSidebar } from '@/features/sidebar';
import { artifactRegistry } from '../definitions/base';
import { ArtifactActions } from './artifact-actions';
import { ArtifactClose } from './artifact-close';
import { ArtifactErrorBoundary } from './artifact-error';
import { ArtifactMessages } from './artifact-messages';
import { Toolbar } from './toolbar';
import { VersionFooter } from './version-footer';

type VisibilityType = 'private' | 'public';

type Document = {
  id: string;
  title: string;
  content: string | null;
  kind: string;
  createdAt: Date;
  userId: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
};

type ArtifactProps = {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  // biome-ignore lint/suspicious/noExplicitAny: UseChatHelpers generic type is complex
  status: UseChatHelpers<any>['status'];
  // biome-ignore lint/suspicious/noExplicitAny: UseChatHelpers generic type is complex
  stop: UseChatHelpers<any>['stop'];
  attachments: Array<{ name: string; contentType: string; url: string }>;
  setAttachments: Dispatch<SetStateAction<Array<{ name: string; contentType: string; url: string }>>>;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    parts?: Array<{ type: string; text?: string }>;
  }>;
  // biome-ignore lint/suspicious/noExplicitAny: UseChatHelpers generic type is complex
  setMessages: UseChatHelpers<any>['setMessages'];
  votes: Array<{ messageId: string; vote: 'up' | 'down' }> | undefined;
  // biome-ignore lint/suspicious/noExplicitAny: UseChatHelpers generic type is complex
  sendMessage: UseChatHelpers<any>['sendMessage'];
  // biome-ignore lint/suspicious/noExplicitAny: UseChatHelpers generic type is complex
  regenerate: UseChatHelpers<any>['regenerate'];
  isReadonly: boolean;
  selectedVisibilityType: VisibilityType;
  selectedModelId: string;
};

function PureArtifact({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  sendMessage,
  messages,
  setMessages,
  regenerate,
  votes,
  isReadonly,
  selectedVisibilityType,
  selectedModelId,
}: ArtifactProps) {
  const { artifact, setArtifact, metadata, setMetadata } = useArtifact();

  const { data: documents, isLoading: isDocumentsFetching } = useSWR<Document[]>(
    artifact.documentId !== 'init' && artifact.status !== 'streaming'
      ? `/api/document?id=${artifact.documentId}`
      : null,
    fetcher
  );

  const [mode, setMode] = useState<'edit' | 'diff'>('edit');
  const [document, setDocument] = useState<Document | null>(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);

  const { state: sidebarState } = useSidebar();
  const isSidebarOpen = sidebarState.isOpen;

  // Automatically switch to edit mode when streaming starts
  useEffect(() => {
    if (artifact.status === 'streaming') {
      setMode('edit');
    }
  }, [artifact.status]);

  useEffect(() => {
    if (documents && documents.length > 0) {
      const mostRecentDocument = documents.at(-1);

      if (mostRecentDocument) {
        setDocument(mostRecentDocument);
        setCurrentVersionIndex(documents.length - 1);
        setArtifact((currentArtifact) => ({
          ...currentArtifact,
          content: mostRecentDocument.content ?? '',
        }));
      }
    }
  }, [documents, setArtifact]);

  const { mutate } = useSWRConfig();
  const [isContentDirty, setIsContentDirty] = useState(false);
  // Track pending save request for deduplication
  const pendingSaveRef = useRef<AbortController | null>(null);

  const handleContentChange = useCallback(
    (updatedContent: string) => {
      if (!artifact) {
        return;
      }

      // Cancel any pending save to prevent race conditions
      if (pendingSaveRef.current) {
        pendingSaveRef.current.abort();
      }
      const abortController = new AbortController();
      pendingSaveRef.current = abortController;

      mutate<Document[]>(
        `/api/document?id=${artifact.documentId}`,
        async (currentDocuments) => {
          if (!currentDocuments) {
            return [];
          }

          const currentDocument = currentDocuments.at(-1);

          if (!currentDocument || !currentDocument.content) {
            setIsContentDirty(false);
            return currentDocuments;
          }

          if (currentDocument.content !== updatedContent) {
            try {
              const response = await fetch(`/api/document?id=${artifact.documentId}`, {
                method: 'POST',
                body: JSON.stringify({
                  title: artifact.title,
                  content: updatedContent,
                  kind: artifact.kind,
                }),
                signal: abortController.signal,
              });

              setIsContentDirty(false);
              pendingSaveRef.current = null;

              // If save failed, don't update cache with optimistic data
              if (!response.ok) {
                return currentDocuments;
              }
            } catch (error) {
              // If request was aborted, return current data without updating
              if (error instanceof Error && error.name === 'AbortError') {
                return currentDocuments;
              }
              setIsContentDirty(false);
              pendingSaveRef.current = null;
              return currentDocuments;
            }

            const newDocument = {
              ...currentDocument,
              content: updatedContent,
              createdAt: new Date(),
            };

            return [...currentDocuments, newDocument];
          }
          return currentDocuments;
        },
        { revalidate: false }
      );
    },
    [artifact, mutate]
  );

  const debouncedHandleContentChange = useDebounceCallback(handleContentChange, 2000);

  const saveContent = useCallback(
    (updatedContent: string, debounce: boolean) => {
      // Skip save if document not loaded yet - content will be set from server when loaded
      if (!document) {
        return;
      }

      if (updatedContent !== document.content) {
        setIsContentDirty(true);

        if (debounce) {
          debouncedHandleContentChange(updatedContent);
        } else {
          handleContentChange(updatedContent);
        }
      }
    },
    [document, debouncedHandleContentChange, handleContentChange]
  );

  function getDocumentContentById(index: number) {
    if (!documents) {
      return '';
    }
    if (!documents[index]) {
      return '';
    }
    return documents[index].content ?? '';
  }

  const handleVersionChange = (type: 'next' | 'prev' | 'toggle' | 'latest') => {
    if (!documents) {
      return;
    }

    if (type === 'latest') {
      setCurrentVersionIndex(documents.length - 1);
      setMode('edit');
    }

    if (type === 'toggle') {
      setMode((currentMode) => (currentMode === 'edit' ? 'diff' : 'edit'));
    }

    if (type === 'prev') {
      if (currentVersionIndex > 0) {
        setCurrentVersionIndex((index) => index - 1);
      }
    } else if (type === 'next' && currentVersionIndex < documents.length - 1) {
      setCurrentVersionIndex((index) => index + 1);
    }
  };

  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  /*
   * NOTE: if there are no documents, or if
   * the documents are being fetched, then
   * we mark it as the current version.
   */

  const isCurrentVersion =
    documents && documents.length > 0 ? currentVersionIndex === documents.length - 1 : true;

  const { width: windowWidth, height: windowHeight, isMobile } = useWindowSize();

  const artifactDefinition = artifactRegistry.get(artifact.kind);

  // Fallback to text artifact if definition not found
  const safeArtifactDefinition = artifactDefinition ?? artifactRegistry.get('text');

  useEffect(() => {
    if (artifact.documentId !== 'init' && safeArtifactDefinition?.initialize) {
      safeArtifactDefinition.initialize({
        documentId: artifact.documentId,
        setMetadata,
      });
    }
  }, [artifact.documentId, safeArtifactDefinition, setMetadata]);

  if (!safeArtifactDefinition) {
    return null;
  }

  const ContentComponent = safeArtifactDefinition.content;

  return (
    <AnimatePresence initial={false}>
      {artifact.isVisible && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-row bg-transparent"
          data-testid="artifact"
          exit={{ opacity: 0, transition: { delay: 0.4 } }}
          initial={{ opacity: 1 }}
        >
          {!isMobile && (
            <motion.div
              animate={{ width: windowWidth, right: 0 }}
              className="fixed h-dvh bg-background"
              exit={{
                width: isSidebarOpen ? windowWidth - 256 : windowWidth,
                right: 0,
              }}
              initial={{
                width: isSidebarOpen ? windowWidth - 256 : windowWidth,
                right: 0,
              }}
            />
          )}

          {!isMobile && (
            <motion.div
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                transition: {
                  delay: 0.1,
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                },
              }}
              className="relative h-dvh w-[400px] shrink-0 bg-muted dark:bg-background"
              exit={{
                opacity: 0,
                x: 0,
                scale: 1,
                transition: { duration: 0 },
              }}
              initial={{ opacity: 0, x: 10, scale: 1 }}
            >
              <AnimatePresence>
                {!isCurrentVersion && (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className="absolute top-0 left-0 z-50 h-dvh w-[400px] bg-zinc-900/50"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>

              <div className="flex h-full flex-col items-center justify-between">
                <ArtifactMessages
                  artifactStatus={artifact.status}
                  chatId={chatId}
                  isReadonly={isReadonly}
                  messages={messages}
                  regenerate={regenerate}
                  setMessages={setMessages}
                  status={status}
                  votes={votes}
                />

                <div className="relative flex w-full flex-row items-end gap-2 px-4 pb-4">
                  {/* TODO: Add MultimodalInput from features/chat when available */}
                  <div className="w-full rounded-lg border bg-background p-3 dark:bg-muted">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className="w-full bg-transparent text-sm outline-none"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && input.trim()) {
                          sendMessage({
                            content: input,
                            role: 'user',
                          });
                          setInput('');
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            animate={
              isMobile
                ? {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    height: windowHeight,
                    width: windowWidth ? windowWidth : 'calc(100dvw)',
                    borderRadius: 0,
                    transition: {
                      delay: 0,
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                      duration: 0.8,
                    },
                  }
                : {
                    opacity: 1,
                    x: 400,
                    y: 0,
                    height: windowHeight,
                    width: windowWidth ? windowWidth - 400 : 'calc(100dvw-400px)',
                    borderRadius: 0,
                    transition: {
                      delay: 0,
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                      duration: 0.8,
                    },
                  }
            }
            className="fixed flex h-dvh flex-col overflow-y-scroll border-zinc-200 bg-background md:border-l dark:border-zinc-700 dark:bg-muted"
            exit={{
              opacity: 0,
              scale: 0.5,
              transition: {
                delay: 0.1,
                type: 'spring',
                stiffness: 600,
                damping: 30,
              },
            }}
            initial={
              isMobile
                ? {
                    opacity: 1,
                    x: artifact.boundingBox.left,
                    y: artifact.boundingBox.top,
                    height: artifact.boundingBox.height,
                    width: artifact.boundingBox.width,
                    borderRadius: 50,
                  }
                : {
                    opacity: 1,
                    x: artifact.boundingBox.left,
                    y: artifact.boundingBox.top,
                    height: artifact.boundingBox.height,
                    width: artifact.boundingBox.width,
                    borderRadius: 50,
                  }
            }
          >
            <div className="flex flex-row items-start justify-between p-2">
              <div className="flex flex-row items-start gap-4">
                <ArtifactClose />

                <div className="flex flex-col">
                  <div className="font-medium">{artifact.title}</div>

                  {isContentDirty ? (
                    <div className="text-muted-foreground text-sm">Saving changes...</div>
                  ) : document ? (
                    <div className="text-muted-foreground text-sm">
                      {`Updated ${formatDistance(new Date(document.createdAt), new Date(), {
                        addSuffix: true,
                      })}`}
                    </div>
                  ) : (
                    <div className="mt-2 h-3 w-32 animate-pulse rounded-md bg-muted-foreground/20" />
                  )}
                </div>
              </div>

              <ArtifactActions
                artifact={artifact}
                currentVersionIndex={currentVersionIndex}
                handleVersionChange={handleVersionChange}
                isCurrentVersion={isCurrentVersion}
                metadata={metadata}
                mode={mode}
                setMetadata={setMetadata}
              />
            </div>

            <div className="h-full max-w-full! items-center overflow-y-scroll bg-background dark:bg-muted">
              {/* Wrap artifact rendering in error boundary with fallback UI */}
              <ArtifactErrorBoundary>
                <ContentComponent
                  content={
                    isCurrentVersion ? artifact.content : getDocumentContentById(currentVersionIndex)
                  }
                  currentVersionIndex={currentVersionIndex}
                  getDocumentContentById={getDocumentContentById}
                  isCurrentVersion={isCurrentVersion}
                  isInline={false}
                  isLoading={isDocumentsFetching && !artifact.content}
                  metadata={metadata}
                  mode={mode}
                  onSaveContent={saveContent}
                  setMetadata={setMetadata}
                  status={artifact.status}
                  suggestions={[]}
                  title={artifact.title}
                />
              </ArtifactErrorBoundary>

              <AnimatePresence>
                {isCurrentVersion && (
                  <Toolbar
                    artifactKind={artifact.kind}
                    isToolbarVisible={isToolbarVisible}
                    sendMessage={sendMessage}
                    setIsToolbarVisible={setIsToolbarVisible}
                    setMessages={setMessages}
                    status={status}
                    stop={stop}
                  />
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {!isCurrentVersion && (
                <VersionFooter
                  currentVersionIndex={currentVersionIndex}
                  documents={documents}
                  handleVersionChange={handleVersionChange}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const Artifact = memo(PureArtifact, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) {
    return false;
  }
  if (!equal(prevProps.votes, nextProps.votes)) {
    return false;
  }
  if (prevProps.input !== nextProps.input) {
    return false;
  }
  if (!equal(prevProps.messages, nextProps.messages)) {
    return false;
  }
  if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
    return false;
  }
  // Check props that affect rendering
  if (prevProps.isReadonly !== nextProps.isReadonly) {
    return false;
  }
  if (prevProps.selectedModelId !== nextProps.selectedModelId) {
    return false;
  }
  if (!equal(prevProps.attachments, nextProps.attachments)) {
    return false;
  }

  return true;
});
