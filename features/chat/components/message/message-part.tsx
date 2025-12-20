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
import { MarkdownRenderer } from '../markdown-renderer';
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from '../reasoning';
import {
  DocumentPreview,
  DocumentToolCall,
  DocumentToolResult,
} from '@/features/documents';
import type { ArtifactKind } from '@/features/artifacts';
import { Weather, type WeatherAtLocation } from '../weather';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Document-related tool names */
const DOCUMENT_TOOL_NAMES = [
  'createDocument',
  'updateDocument',
  'requestSuggestions',
] as const;

/** Weather tool name */
const WEATHER_TOOL_NAME = 'getWeather' as const;

type DocumentToolName = (typeof DOCUMENT_TOOL_NAMES)[number];

// =============================================================================
// TYPES
// =============================================================================

export interface MessagePartProps {
  /** The message part to render */
  part: MessagePartType;
  /** Whether this part is currently being streamed */
  isStreaming?: boolean;
  /** Whether the chat is in readonly mode (e.g., shared chat) */
  isReadonly?: boolean;
  /** Optional additional class names */
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Check if a tool name is a document tool */
function isDocumentTool(toolName: string): toolName is DocumentToolName {
  return DOCUMENT_TOOL_NAMES.includes(toolName as DocumentToolName);
}

/** Check if a tool name is the weather tool */
function isWeatherTool(toolName: string): boolean {
  return toolName === WEATHER_TOOL_NAME;
}

/** Get document operation type from tool name */
function getDocumentOperationType(
  toolName: DocumentToolName
): 'create' | 'update' | 'request-suggestions' {
  switch (toolName) {
    case 'createDocument':
      return 'create';
    case 'updateDocument':
      return 'update';
    case 'requestSuggestions':
      return 'request-suggestions';
  }
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
 * Renders text content with markdown/LaTeX support.
 */
function TextPartView({
  text,
  className,
}: {
  text: string;
  isStreaming?: boolean;
  className?: string;
}) {
  return (
    <MarkdownRenderer
      className={cn(
        'break-words',
        className
      )}
    >
      {text}
    </MarkdownRenderer>
  );
}

/**
 * Renders a tool call invocation display.
 * For document tools, delegates to DocumentToolCall component.
 */
function ToolCallPartView({
  toolCallId,
  toolName,
  args,
  isReadonly,
  className,
}: ToolCallPart & { isReadonly?: boolean; className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle document tool calls specially
  if (isDocumentTool(toolName)) {
    const operationType = getDocumentOperationType(toolName);

    // Build args based on tool type
    const docArgs =
      toolName === 'createDocument'
        ? {
            title: (args as Record<string, unknown>).title as string,
            kind: (args as Record<string, unknown>).kind as ArtifactKind,
          }
        : toolName === 'updateDocument'
          ? {
              id: (args as Record<string, unknown>).id as string,
              description: (args as Record<string, unknown>)
                .description as string,
            }
          : { documentId: (args as Record<string, unknown>).documentId as string };

    return (
      <DocumentToolCall
        type={operationType}
        args={docArgs}
        isReadonly={isReadonly}
      />
    );
  }

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
 * For document tools, renders DocumentPreview or DocumentToolResult.
 * For weather tool, renders Weather component.
 */
function ToolResultPartView({
  toolCallId,
  toolName,
  result,
  isError,
  isReadonly,
  className,
}: ToolResultPart & { isReadonly?: boolean; className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle weather tool results
  if (isWeatherTool(toolName)) {
    const resultObj = result as Record<string, unknown> | null;

    // Check for error in result
    if (resultObj && 'error' in resultObj) {
      return (
        <div
          className={cn(
            'rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:border-red-800 dark:bg-red-950/50',
            className
          )}
        >
          Weather Error: {String(resultObj.error)}
        </div>
      );
    }

    // Render Weather component with the data
    if (resultObj) {
      return <Weather weatherAtLocation={resultObj as WeatherAtLocation} />;
    }
  }

  // Handle document tool results specially
  if (isDocumentTool(toolName)) {
    const resultObj = result as Record<string, unknown> | null;

    // Check for error in result
    if (resultObj && 'error' in resultObj) {
      return (
        <div
          className={cn(
            'rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:border-red-800 dark:bg-red-950/50',
            className
          )}
        >
          Error with document: {String(resultObj.error)}
        </div>
      );
    }

    // For createDocument and updateDocument, show DocumentPreview
    if (toolName === 'createDocument' || toolName === 'updateDocument') {
      return (
        <DocumentPreview
          isReadonly={isReadonly}
          result={
            resultObj
              ? {
                  id: resultObj.id as string | undefined,
                  title: resultObj.title as string | undefined,
                  kind: resultObj.kind as string | undefined,
                }
              : undefined
          }
        />
      );
    }

    // For requestSuggestions, show DocumentToolResult
    if (toolName === 'requestSuggestions' && resultObj) {
      return (
        <DocumentToolResult
          type="request-suggestions"
          result={{
            id: resultObj.id as string,
            title: resultObj.title as string,
            kind: resultObj.kind as ArtifactKind,
          }}
          isReadonly={isReadonly}
        />
      );
    }
  }

  // Default tool result display
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
 * Renders chain-of-thought reasoning display with collapsible UI and duration tracking.
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
  return (
    <Reasoning
      className={className}
      isStreaming={isStreaming}
      defaultOpen={true}
    >
      <ReasoningTrigger />
      <ReasoningContent>{reasoning}</ReasoningContent>
    </Reasoning>
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
 * Document-related tool calls (createDocument, updateDocument, requestSuggestions)
 * are rendered using specialized DocumentPreview and DocumentToolCall components.
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
  isReadonly,
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
          isReadonly={isReadonly}
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
          isReadonly={isReadonly}
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
