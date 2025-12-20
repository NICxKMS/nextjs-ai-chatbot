'use client';

import { memo } from 'react';

export interface CodePreviewProps {
  /** Code content to preview */
  content: string;
  /** Maximum lines to display (default: 8) */
  maxLines?: number;
}

/**
 * Code document preview renderer.
 * Shows syntax-styled code snippet.
 */
function CodePreviewComponent({ content, maxLines = 8 }: CodePreviewProps) {
  const lines = content.split('\n');
  const displayLines = lines.slice(0, maxLines);
  const truncated = displayLines.join('\n');
  const hasMore = lines.length > maxLines;

  return (
    <div className="relative font-mono text-xs">
      <pre className="overflow-hidden rounded bg-zinc-900 p-3 text-zinc-100">
        <code className="block whitespace-pre-wrap break-all">
          {truncated}
        </code>
        {hasMore && (
          <div className="mt-2 text-zinc-500 text-xs">
            +{lines.length - maxLines} more lines
          </div>
        )}
      </pre>
    </div>
  );
}

export const CodePreview = memo(CodePreviewComponent);
