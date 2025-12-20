import type { ArtifactKind } from './types';

/**
 * All supported artifact kinds.
 */
export const ARTIFACT_KINDS: readonly ArtifactKind[] = [
  'text',
  'code',
  'image',
  'sheet',
] as const;

/**
 * Default content for each artifact kind.
 * Used when creating new artifacts or resetting content.
 */
export const DEFAULT_ARTIFACT_CONTENT: Record<ArtifactKind, string> = {
  text: '',
  code: '',
  image: '',
  sheet: '',
} as const;

/**
 * Human-readable labels for artifact kinds.
 */
export const ARTIFACT_KIND_LABELS: Record<ArtifactKind, string> = {
  text: 'Text Document',
  code: 'Code',
  image: 'Image',
  sheet: 'Spreadsheet',
} as const;
