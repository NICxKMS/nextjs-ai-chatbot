'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, CopyIcon, RefreshCwIcon } from 'lucide-react';
import {
  MessageContent,
  Response,
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
  Actions,
  Action,
} from '@/shared/components/elements';
import { cn } from '@/shared/lib/utils';
import type { ChatMessage } from '../types';

/**
 * Props for MessageItem component
 */
export interface MessageItemProps {
  /** The message to render */
  message: ChatMessage;
  /** Whether this message is currently streaming */
  isStreaming?: boolean;
  /** Whether this is the latest message (shows actions) */
  isLatest?: boolean;
}

/**
 * Type for file attachments in messages
 */
type FilePart = {
  type: 'file';
  url: string;
  mediaType: string;
  name?: string;
  filename?: string;
};

/**
 * Sanitizes text by removing internal markers
 */
function sanitizeText(text: string): string {
  return text.replace('<has_function_call>', '');
}

/**
 * MessageReasoning - Handles reasoning/thinking display with streaming awareness
 */
function MessageReasoning({
  isStreaming,
  reasoning,
}: {
  isStreaming: boolean;
  reasoning: string;
}) {
  const [hasBeenStreaming, setHasBeenStreaming] = useState(isStreaming);
  const [isReasoningStreaming, setIsReasoningStreaming] = useState(false);
  const prevReasoningRef = useRef(reasoning);

  useEffect(() => {
    if (isStreaming) {
      setHasBeenStreaming(true);
    }
  }, [isStreaming]);

  useEffect(() => {
    if (isStreaming && reasoning !== prevReasoningRef.current) {
      setIsReasoningStreaming(true);
      prevReasoningRef.current = reasoning;
    } else if (
      isReasoningStreaming &&
      (!isStreaming || reasoning === prevReasoningRef.current)
    ) {
      setIsReasoningStreaming(false);
    }

    if (!isStreaming) {
      prevReasoningRef.current = reasoning;
    }
  }, [isStreaming, reasoning, isReasoningStreaming]);

  return (
    <Reasoning
      data-testid="message-reasoning"
      defaultOpen={hasBeenStreaming}
      isStreaming={isReasoningStreaming}
    >
      <ReasoningTrigger />
      <ReasoningContent>{reasoning}</ReasoningContent>
    </Reasoning>
  );
}

/**
 * MessageActions - Action buttons for assistant messages
 */
function MessageActions({
  message,
  onCopy,
  onRegenerate,
}: {
  message: ChatMessage;
  onCopy?: () => void;
  onRegenerate?: () => void;
}) {
  const handleCopy = () => {
    const textContent = message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('\n');
    navigator.clipboard.writeText(textContent);
    onCopy?.();
  };

  return (
    <Actions className="opacity-0 transition-opacity group-hover/message:opacity-100">
      <Action tooltip="Copy" onClick={handleCopy}>
        <CopyIcon className="size-4" />
      </Action>
      {onRegenerate && (
        <Action tooltip="Regenerate" onClick={onRegenerate}>
          <RefreshCwIcon className="size-4" />
        </Action>
      )}
    </Actions>
  );
}

/**
 * AttachmentPreview - Displays file attachments
 */
function AttachmentPreview({
  attachment,
}: {
  attachment: { name: string; contentType: string; url: string };
}) {
  const isImage = attachment.contentType.startsWith('image/');

  if (isImage) {
    return (
      <div className="relative max-w-[200px] overflow-hidden rounded-lg border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name}
          className="h-auto w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
      <span className="truncate">{attachment.name}</span>
    </div>
  );
}

/**
 * Deep equality check for message parts
 */
function partsAreEqual(
  a: ChatMessage['parts'],
  b: ChatMessage['parts']
): boolean {
  if (a.length !== b.length) return false;
  return a.every((partA, index) => {
    const partB = b[index];
    if (!partB) return false;
    if (partA.type !== partB.type) return false;
    if ('text' in partA && 'text' in partB) {
      return (partA as { text?: string }).text === (partB as { text?: string }).text;
    }
    if ('toolCallId' in partA && 'toolCallId' in partB) {
      return (
        (partA as { toolCallId: string }).toolCallId === (partB as { toolCallId: string }).toolCallId &&
        (partA as { state?: string }).state === (partB as { state?: string }).state
      );
    }
    return JSON.stringify(partA) === JSON.stringify(partB);
  });
}

/**
 * PureMessageItem - The core message rendering component
 */
const PureMessageItem = ({
  message,
  isStreaming = false,
  isLatest = false,
}: MessageItemProps) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const attachments = message.parts.filter(
    (part): part is FilePart => part.type === 'file'
  );

  const hasTextContent = message.parts.some(
    (p) => p.type === 'text' && 'text' in p && (p as { text?: string }).text?.trim()
  );

  return (
    <motion.div
      className="group/message w-full"
      data-role={message.role}
      data-message-id={message.id}
      data-testid={`message-${message.role}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div
        className={cn('flex w-full items-start gap-2 md:gap-3', {
          'justify-end': isUser,
          'justify-start': isAssistant,
        })}
      >
        {isAssistant && (
          <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
            <SparklesIcon size={14} />
          </div>
        )}

        <div
          className={cn('flex flex-col', {
            'gap-2 md:gap-4': hasTextContent,
            'w-full': isAssistant && hasTextContent,
            'max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]': isUser,
          })}
        >
          {attachments.length > 0 && (
            <div
              className="flex flex-row justify-end gap-2"
              data-testid="message-attachments"
            >
              {attachments.map((attachment) => (
                <AttachmentPreview
                  key={attachment.url}
                  attachment={{
                    name: attachment.name ?? attachment.filename ?? 'file',
                    contentType: attachment.mediaType,
                    url: attachment.url,
                  }}
                />
              ))}
            </div>
          )}

          {message.parts.map((part, index) => {
            const key = `message-${message.id}-part-${index}`;

            if (part.type === 'reasoning' && 'text' in part) {
              const text = (part as { text?: string }).text;
              if (text?.trim()) {
                return (
                  <MessageReasoning
                    key={key}
                    isStreaming={isStreaming}
                    reasoning={text}
                  />
                );
              }
            }

            if (part.type === 'text' && 'text' in part) {
              const text = (part as { text: string }).text;
              return (
                <div key={key}>
                  <MessageContent
                    className={cn({
                      'w-fit break-words rounded-2xl px-3 py-2 text-right text-white':
                        isUser,
                      'bg-transparent px-0 py-0 text-left': isAssistant,
                    })}
                    data-testid="message-content"
                    style={isUser ? { backgroundColor: '#006cff' } : undefined}
                  >
                    <Response>{sanitizeText(text)}</Response>
                  </MessageContent>
                </div>
              );
            }

            if (part.type.startsWith('tool-') && 'toolCallId' in part) {
              const toolPart = part as {
                type: string;
                toolCallId: string;
                state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
                input?: unknown;
                output?: unknown;
                errorText?: string;
              };

              return (
                <Tool key={toolPart.toolCallId} defaultOpen={true}>
                  <ToolHeader type={toolPart.type as `tool-${string}`} state={toolPart.state} />
                  <ToolContent>
                    {(toolPart.state === 'input-available' ||
                      toolPart.state === 'input-streaming') &&
                      toolPart.input != null && (
                        <ToolInput input={toolPart.input as Record<string, unknown>} />
                      )}
                    {toolPart.state === 'output-available' && toolPart.output != null && (
                      <ToolOutput
                        output={
                          <pre className="whitespace-pre-wrap text-xs">
                            {JSON.stringify(toolPart.output, null, 2)}
                          </pre>
                        }
                        errorText={toolPart.errorText}
                      />
                    )}
                    {toolPart.state === 'output-error' && toolPart.errorText && (
                      <ToolOutput output={null} errorText={toolPart.errorText} />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            return null;
          })}

          {isLatest && isAssistant && !isStreaming && (
            <MessageActions message={message} />
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * MessageItem - Memoized message component for efficient re-rendering
 *
 * Uses deep equality checking to prevent unnecessary re-renders during streaming
 */
export const MessageItem = memo(PureMessageItem, (prevProps, nextProps) => {
  if (prevProps.isStreaming || nextProps.isStreaming) {
    return false;
  }
  if (prevProps.message.id !== nextProps.message.id) {
    return false;
  }
  if (prevProps.isLatest !== nextProps.isLatest) {
    return false;
  }
  if (!partsAreEqual(prevProps.message.parts, nextProps.message.parts)) {
    return false;
  }
  return true;
});

MessageItem.displayName = 'MessageItem';

/**
 * ThinkingMessage - Placeholder shown while waiting for assistant response
 */
export function ThinkingMessage() {
  return (
    <motion.div
      className="group/message w-full"
      data-role="assistant"
      data-testid="message-assistant-loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-start gap-3">
        <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
          <SparklesIcon size={14} />
        </div>
        <div className="flex w-full flex-col gap-2 md:gap-4">
          <div className="p-0 text-sm text-muted-foreground">Thinking...</div>
        </div>
      </div>
    </motion.div>
  );
}
