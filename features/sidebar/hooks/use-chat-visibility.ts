'use client';

import { useState, useCallback } from 'react';
import type { VisibilityType } from '../types';

export function useChatVisibility(initialVisibility: VisibilityType = 'private') {
  const [visibility, setVisibility] = useState<VisibilityType>(initialVisibility);
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleVisibility = useCallback(
    async (chatId: string) => {
      const newVisibility = visibility === 'public' ? 'private' : 'public';
      setIsUpdating(true);

      try {
        // TODO: Call server action to update visibility
        console.log(`[ChatVisibility] Updating ${chatId} to ${newVisibility}`);
        setVisibility(newVisibility);
      } finally {
        setIsUpdating(false);
      }
    },
    [visibility]
  );

  return { visibility, toggleVisibility, isUpdating };
}
