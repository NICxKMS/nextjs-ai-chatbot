/**
 * Chat Not Found Page
 *
 * Displayed when a chat session doesn't exist or the user lacks access.
 *
 * @module app/(chat)/chat/[id]/not-found
 */

import Link from 'next/link';

export default function ChatNotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <h2 className="text-xl font-semibold mb-2">Chat not found</h2>
      <p className="text-muted-foreground mb-4">
        This chat doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
      >
        Start new chat
      </Link>
    </div>
  );
}
