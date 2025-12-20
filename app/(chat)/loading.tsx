/**
 * Chat Loading State
 *
 * Displays skeleton UI while chat data is being loaded.
 *
 * @module app/(chat)/loading
 */

export default function ChatLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="h-14 border-b flex items-center px-4">
        <div className="w-32 h-6 bg-muted rounded animate-pulse" />
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 p-4 space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Input skeleton */}
      <div className="border-t p-4">
        <div className="h-12 bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
