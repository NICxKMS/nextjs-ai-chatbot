'use client';

import { useChatTitle, useIsStreaming } from '../hooks';
import { useModelState, useCurrentModel } from '../hooks';

export function ChatHeader() {
  const title = useChatTitle();
  const isStreaming = useIsStreaming();
  const currentModel = useCurrentModel();
  const { setModelId, availableModels } = useModelState();

  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">
          {title || 'New Chat'}
        </h1>
        {isStreaming && (
          <span className="text-sm text-muted-foreground">
            (Generating...)
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <select
          value={currentModel?.id}
          onChange={(e) => setModelId(e.target.value)}
          className="rounded border bg-background px-2 py-1 text-sm"
          disabled={isStreaming}
        >
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
