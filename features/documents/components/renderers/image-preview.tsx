'use client';

import { memo } from 'react';

export interface ImagePreviewProps {
  /** Image content (base64 data URI or URL) */
  content: string;
  /** Image title for alt text */
  title?: string;
}

/**
 * Image document preview renderer.
 * Shows thumbnail preview of image.
 */
function ImagePreviewComponent({ content, title }: ImagePreviewProps) {
  // Handle both base64 data URIs and URLs
  const src = content.startsWith('data:') || content.startsWith('http')
    ? content
    : `data:image/png;base64,${content}`;

  return (
    <div className="flex items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={title ?? 'Document image preview'}
        className="max-h-[200px] max-w-full rounded object-contain"
      />
    </div>
  );
}

export const ImagePreview = memo(ImagePreviewComponent);
