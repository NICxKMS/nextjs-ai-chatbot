'use client';

import { memo, useCallback } from 'react';
import { toast } from 'sonner';

import { useArtifact } from '@/features/artifacts';
import type { ArtifactKind } from '@/features/artifacts';

// =============================================================================
// ICONS
// =============================================================================

function FileIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      height={size}
      strokeLinejoin="round"
      style={{ color: 'currentcolor' }}
      viewBox="0 0 16 16"
      width={size}
    >
      <path
        clipRule="evenodd"
        d="M14.5 13.5V6.5V5.41421C14.5 5.149 14.3946 4.89464 14.2071 4.70711L9.79289 0.292893C9.60536 0.105357 9.351 0 9.08579 0H8H3H1.5V1.5V13.5C1.5 14.8807 2.61929 16 4 16H12C13.3807 16 14.5 14.8807 14.5 13.5ZM13 13.5V6.5H9.5H8V5V1.5H3V13.5C3 14.0523 3.44772 14.5 4 14.5H12C12.5523 14.5 13 14.0523 13 13.5ZM9.5 5V2.12132L12.3787 5H9.5ZM5.13 5.00062H4.505V6.25062H5.13H6H6.625V5.00062H6H5.13ZM4.505 8H5.13H11H11.625V9.25H11H5.13H4.505V8ZM5.13 11H4.505V12.25H5.13H11H11.625V11H11H5.13Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

function PencilEditIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      height={size}
      strokeLinejoin="round"
      style={{ color: 'currentcolor' }}
      viewBox="0 0 16 16"
      width={size}
    >
      <path
        clipRule="evenodd"
        d="M11.75 0.189331L12.2803 0.719661L15.2803 3.71966L15.8107 4.24999L15.2803 4.78032L5.15901 14.9016C4.45575 15.6049 3.50192 16 2.50736 16H0.75H0V15.25V13.4926C0 12.4981 0.395088 11.5442 1.09835 10.841L11.2197 0.719661L11.75 0.189331ZM11.75 2.31065L9.81066 4.24999L11.75 6.18933L13.6893 4.24999L11.75 2.31065ZM2.15901 11.9016L8.75 5.31065L10.6893 7.24999L4.09835 13.841C3.67639 14.2629 3.1041 14.5 2.50736 14.5H1.5V13.4926C1.5 12.8959 1.73705 12.3236 2.15901 11.9016ZM9 16H16V14.5H9V16Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

function MessageIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      height={size}
      strokeLinejoin="round"
      style={{ color: 'currentcolor' }}
      viewBox="0 0 16 16"
      width={size}
    >
      <path
        clipRule="evenodd"
        d="M2.8914 10.4028L2.98327 10.6318C3.22909 11.2445 3.5 12.1045 3.5 13C3.5 13.3588 3.4564 13.7131 3.38773 14.0495C3.69637 13.9446 4.01409 13.8159 4.32918 13.6584C4.87888 13.3835 5.33961 13.0611 5.70994 12.7521L6.22471 12.3226L6.88809 12.4196C7.24851 12.4724 7.61994 12.5 8 12.5C11.7843 12.5 14.5 9.85569 14.5 7C14.5 4.14431 11.7843 1.5 8 1.5C4.21574 1.5 1.5 4.14431 1.5 7C1.5 8.18175 1.94229 9.29322 2.73103 10.2153L2.8914 10.4028ZM2.8135 15.7653C1.76096 16 1 16 1 16C1 16 1.43322 15.3097 1.72937 14.4367C1.88317 13.9834 2 13.4808 2 13C2 12.3826 1.80733 11.7292 1.59114 11.1903C0.591845 10.0221 0 8.57152 0 7C0 3.13401 3.58172 0 8 0C12.4183 0 16 3.13401 16 7C16 10.866 12.4183 14 8 14C7.54721 14 7.10321 13.9671 6.67094 13.9038C6.22579 14.2753 5.66881 14.6656 5 15C4.23366 15.3832 3.46733 15.6195 2.8135 15.7653Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

function LoaderIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      height={size}
      strokeLinejoin="round"
      style={{ color: 'currentcolor' }}
      viewBox="0 0 16 16"
      width={size}
    >
      <g clipPath="url(#clip0_2393_1490)">
        <path d="M8 0V4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 16V12" opacity="0.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.29773 1.52783L5.64887 4.7639" opacity="0.9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12.7023 1.52783L10.3511 4.7639" opacity="0.1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12.7023 14.472L10.3511 11.236" opacity="0.4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.29773 14.472L5.64887 11.236" opacity="0.6" stroke="currentColor" strokeWidth="1.5" />
      </g>
      <defs>
        <clipPath id="clip0_2393_1490">
          <rect fill="white" height="16" width="16" />
        </clipPath>
      </defs>
    </svg>
  );
}

// =============================================================================
// TYPES
// =============================================================================

export type DocumentOperationType = 'create' | 'update' | 'request-suggestions';

export interface DocumentToolResultProps {
  type: DocumentOperationType;
  result: {
    id: string;
    title: string;
    kind: ArtifactKind;
  };
  isReadonly?: boolean;
}

export interface DocumentToolCallProps {
  type: DocumentOperationType;
  args:
    | { title: string; kind: ArtifactKind }
    | { id: string; description: string }
    | { documentId: string };
  isReadonly?: boolean;
}

// =============================================================================
// HELPER
// =============================================================================

function getActionText(
  type: DocumentOperationType,
  tense: 'present' | 'past'
): string {
  switch (type) {
    case 'create':
      return tense === 'present' ? 'Creating' : 'Created';
    case 'update':
      return tense === 'present' ? 'Updating' : 'Updated';
    case 'request-suggestions':
      return tense === 'present' ? 'Adding suggestions' : 'Added suggestions to';
    default:
      return '';
  }
}

// =============================================================================
// DOCUMENT TOOL RESULT
// =============================================================================

/**
 * Renders a completed document tool result as a clickable button.
 * Shows the document title and opens it in the artifact panel on click.
 */
function PureDocumentToolResult({
  type,
  result,
  isReadonly,
}: DocumentToolResultProps) {
  const { setArtifact } = useArtifact();

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isReadonly) {
        toast.error('Viewing files in shared chats is currently not supported.');
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const boundingBox = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };

      setArtifact({
        documentId: result.id,
        kind: result.kind,
        content: '',
        title: result.title,
        isVisible: true,
        status: 'idle',
        boundingBox,
      });
    },
    [isReadonly, result, setArtifact]
  );

  return (
    <button
      type="button"
      className="flex w-fit cursor-pointer flex-row items-start gap-3 rounded-xl border bg-background px-3 py-2"
      onClick={handleClick}
    >
      <div className="mt-1 text-muted-foreground">
        {type === 'create' ? (
          <FileIcon />
        ) : type === 'update' ? (
          <PencilEditIcon />
        ) : type === 'request-suggestions' ? (
          <MessageIcon />
        ) : null}
      </div>
      <div className="text-left">
        {`${getActionText(type, 'past')} "${result.title}"`}
      </div>
    </button>
  );
}

export const DocumentToolResult = memo(PureDocumentToolResult, () => true);

// =============================================================================
// DOCUMENT TOOL CALL (IN PROGRESS)
// =============================================================================

/**
 * Renders an in-progress document tool call.
 * Shows the action being performed with a loading spinner.
 */
function PureDocumentToolCall({
  type,
  args,
  isReadonly,
}: DocumentToolCallProps) {
  const { setArtifact } = useArtifact();

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isReadonly) {
        toast.error('Viewing files in shared chats is currently not supported.');
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const boundingBox = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };

      setArtifact((currentArtifact) => ({
        ...currentArtifact,
        isVisible: true,
        boundingBox,
      }));
    },
    [isReadonly, setArtifact]
  );

  const actionDescription = (() => {
    if (type === 'create' && 'title' in args && args.title) {
      return `"${args.title}"`;
    }
    if (type === 'update' && 'description' in args) {
      return `"${args.description}"`;
    }
    if (type === 'request-suggestions') {
      return 'for document';
    }
    return '';
  })();

  return (
    <button
      type="button"
      className="cursor-pointer flex w-fit flex-row items-start justify-between gap-3 rounded-xl border px-3 py-2"
      onClick={handleClick}
    >
      <div className="flex flex-row items-start gap-3">
        <div className="mt-1 text-zinc-500">
          {type === 'create' ? (
            <FileIcon />
          ) : type === 'update' ? (
            <PencilEditIcon />
          ) : type === 'request-suggestions' ? (
            <MessageIcon />
          ) : null}
        </div>

        <div className="text-left">
          {`${getActionText(type, 'present')} ${actionDescription}`}
        </div>
      </div>

      <div className="mt-1 animate-spin">
        <LoaderIcon />
      </div>
    </button>
  );
}

export const DocumentToolCall = memo(PureDocumentToolCall, () => true);
