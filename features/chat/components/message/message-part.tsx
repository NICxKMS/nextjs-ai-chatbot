/**
 * Message Part Component
 *
 * Renders individual message parts based on AI SDK UIMessage part types.
 * Supports text, tool calls, tool results, reasoning, and source citations.
 *
 * @module features/chat/components/message/message-part
 */

'use client';

import { memo, useState } from 'react';
import type {
  MessagePart as MessagePartType,
  TextPart,
  ToolCallPart,
  ToolResultPart,
  ReasoningPart,
  SourcePart,
} from '../../types';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface MessagePartProps {
  /** The message part to render */
  part: MessagePartType;
  /** Whether this part is currently being streamed */
  isStreaming?: boolean;
  /** Optional additional class names */
  className?: string;
}

// =============================================================================
// ICONS (inline SVG to avoid external dependencies)
// =============================================================================

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Renders text content with prose styling.
 */
function TextPartView({
  text,
  isStreaming,
  className,
}: {
  text: string;
  isStreaming?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none break-words',
        isStreaming && 'animate-pulse',
        className
      )}
    >
      {/* Simple text for now - markdown rendering can be added later */}
      {text}
    </div>
  );
}

/**
 * Renders a tool call invocation display.
 */
function ToolCallPartView({
  toolCallId,
  toolName,
  args,
  className,
}: ToolCallPart & { className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        'rounded-lg border bg-muted/50 my-2 overflow-hidden',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-muted/70 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <WrenchIcon className="h-4 w-4 text-muted-foreground" />
          <span>{toolName}</span>
        </div>
        <ChevronDownIcon
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>
      {isExpanded && (
        <div className="border-t bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Parameters
          </div>
          <pre className="text-xs overflow-x-auto bg-background/50 rounded p-2">
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * Renders a tool result display.
 */
function ToolResultPartView({
  toolCallId,
  toolName,
  result,
  isError,
  className,
}: ToolResultPart & { className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        'rounded-lg border my-2 overflow-hidden',
        isError ? 'border-destructive bg-destructive/10' : 'bg-muted/50',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex w-full items-center justify-between gap-2 p-3 text-left transition-colors',
          isError ? 'hover:bg-destructive/20' : 'hover:bg-muted/70'
        )}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          {isError ? (
            <AlertCircleIcon className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
          )}
          <span>{toolName} result</span>
        </div>
        <ChevronDownIcon
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>
      {isExpanded && (
        <div className="border-t p-3">
          <pre className="text-xs overflow-x-auto bg-background/50 rounded p-2">
            {typeof result === 'string'
              ? result
              : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * Renders chain-of-thought reasoning display.
 */
function ReasoningPartView({
  reasoning,
  isStreaming,
  className,
}: {
  reasoning: string;
  isStreaming?: boolean;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className={cn(
        'rounded-lg border border-dashed bg-amber-50 dark:bg-amber-950/20 my-2 overflow-hidden',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 p-3 text-left hover:bg-amber-100/50 dark:hover:bg-amber-950/30 transition-colors"
      >
        <BrainIcon className="h-4 w-4 text-amber-700 dark:text-amber-400" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
          {isStreaming ? 'Thinking...' : 'Reasoning'}
        </span>
        <ChevronDownIcon
          className={cn(
            'h-4 w-4 text-amber-700 dark:text-amber-400 transition-transform ml-auto',
            isExpanded && 'rotate-180'
          )}
        />
      </button>
      {isExpanded && (
        <div className="border-t border-dashed border-amber-200 dark:border-amber-800 p-3">
          <div
            className={cn(
              'text-sm text-muted-foreground whitespace-pre-wrap',
              isStreaming && 'animate-pulse'
            )}
          >
            {reasoning}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Renders a source citation reference.
 */
function SourcePartView({
  source,
  className,
}: {
  source: SourcePart['source'];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 text-xs text-muted-foreground',
        className
      )}
    >
      <LinkIcon className="h-3 w-3" />
      {source.url ? (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline hover:text-foreground transition-colors"
        >
          {source.title || source.url}
        </a>
      ) : (
        <span>{source.title || source.id}</span>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Renders a single message part based on its type.
 *
 * Supports:
 * - `text`: Plain text content with prose styling
 * - `tool-call`: Tool invocation display with expandable parameters
 * - `tool-result`: Tool execution results with expandable output
 * - `reasoning`: Chain-of-thought reasoning display (collapsible)
 * - `source`: Citation/source references with links
 *
 * @example
 * ```tsx
 * <MessagePart part={{ type: 'text', text: 'Hello!' }} />
 * <MessagePart part={{ type: 'reasoning', reasoning: 'Thinking about...' }} isStreaming />
 * <MessagePart part={{ type: 'tool-call', toolCallId: '1', toolName: 'search', args: { q: 'test' } }} />
 * ```
 */
export const MessagePart = memo(function MessagePart({
  part,
  isStreaming,
  className,
}: MessagePartProps) {
  switch (part.type) {
    case 'text':
      return (
        <TextPartView
          text={part.text}
          isStreaming={isStreaming}
          className={className}
        />
      );

    case 'tool-call':
      return (
        <ToolCallPartView
          type={part.type}
          toolCallId={part.toolCallId}
          toolName={part.toolName}
          args={part.args}
          className={className}
        />
      );

    case 'tool-result':
      return (
        <ToolResultPartView
          type={part.type}
          toolCallId={part.toolCallId}
          toolName={part.toolName}
          result={part.result}
          isError={part.isError}
          className={className}
        />
      );

    case 'reasoning':
      return (
        <ReasoningPartView
          reasoning={part.reasoning}
          isStreaming={isStreaming}
          className={className}
        />
      );

    case 'source':
      return <SourcePartView source={part.source} className={className} />;

    default:
      // Unknown part type - return null for safety
      return null;
  }
});
