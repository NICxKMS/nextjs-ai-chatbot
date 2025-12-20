'use client';

import { memo } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/shared/components';
import { useArtifact, initialArtifactData } from '../hooks';

function PureArtifactClose() {
  const { setArtifact } = useArtifact();

  return (
    <Button
      className="h-fit p-2 dark:hover:bg-zinc-700"
      data-testid="artifact-close-button"
      onClick={() => {
        setArtifact((currentArtifact) =>
          currentArtifact.status === 'streaming'
            ? {
                ...currentArtifact,
                isVisible: false,
              }
            : { ...initialArtifactData, status: 'idle' }
        );
      }}
      variant="outline"
    >
      <X size={18} />
    </Button>
  );
}

export const ArtifactClose = memo(PureArtifactClose, () => true);
