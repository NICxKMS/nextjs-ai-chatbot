/**
 * AttachmentPreviews Component
 *
 * Displays a list of file attachment previews with remove functionality.
 *
 * @module features/chat/components/input/attachment-previews
 */

'use client';

import Image from 'next/image';
import { X, File } from 'lucide-react';
import type { Attachment } from '../../types';

/**
 * Props for the AttachmentPreview component.
 */
export interface AttachmentPreviewProps {
  /** The attachment to preview */
  attachment: Attachment;
  /** Callback to remove this attachment */
  onRemove: () => void;
  /** Whether the attachment is currently uploading */
  isUploading?: boolean;
}

/**
 * Individual attachment preview with image or file icon display.
 *
 * @remarks
 * For images, displays a thumbnail. For other files, shows a file icon.
 * Matches the visual style of oldapp/components/preview-attachment.tsx
 */
export function AttachmentPreview({
  attachment,
  onRemove,
  isUploading = false,
}: AttachmentPreviewProps) {
  const isImage = attachment.contentType?.startsWith('image/');

  return (
    <div
      className="group relative size-16 overflow-hidden rounded-lg border bg-muted"
      data-testid="input-attachment-preview"
    >
      {isImage && attachment.url ? (
        <Image
          src={attachment.url}
          alt={attachment.name ?? 'An image attachment'}
          width={64}
          height={64}
          sizes="64px"
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <File className="h-8 w-8" />
        </div>
      )}

      {/* Loading overlay */}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}

      {/* Remove button */}
      {!isUploading && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-0.5 right-0.5 size-4 rounded-full bg-destructive p-0 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center"
          aria-label={`Remove ${attachment.name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Filename label */}
      <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5 text-[10px] text-white">
        {attachment.name}
      </div>
    </div>
  );
}

/**
 * Props for the AttachmentPreviews component.
 */
export interface AttachmentPreviewsProps {
  /** Array of attachments to display */
  attachments: Attachment[];
  /** Callback to remove an attachment by index */
  onRemove: (index: number) => void;
  /** Array of filenames currently uploading */
  uploadQueue?: string[];
}

/**
 * Container component for displaying multiple attachment previews.
 *
 * @remarks
 * Renders a horizontal scrollable list of attachment previews.
 * Includes both uploaded attachments and pending uploads.
 *
 * @example
 * ```tsx
 * <AttachmentPreviews
 *   attachments={attachments}
 *   onRemove={(index) => removeAttachment(index)}
 *   uploadQueue={['file1.png', 'file2.pdf']}
 * />
 * ```
 */
export function AttachmentPreviews({
  attachments,
  onRemove,
  uploadQueue = [],
}: AttachmentPreviewsProps) {
  if (attachments.length === 0 && uploadQueue.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-row items-end gap-2 overflow-x-auto pb-2"
      data-testid="attachments-preview"
    >
      {attachments.map((attachment, index) => (
        <AttachmentPreview
          key={attachment.url || `${attachment.name}-${index}`}
          attachment={attachment}
          onRemove={() => onRemove(index)}
        />
      ))}

      {uploadQueue.map((filename) => (
        <AttachmentPreview
          key={`uploading-${filename}`}
          attachment={{
            url: '',
            name: filename,
            contentType: '',
          }}
          onRemove={() => {}}
          isUploading
        />
      ))}
    </div>
  );
}
