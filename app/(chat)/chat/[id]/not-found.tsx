/**
 * Chat Not Found Page
 *
 * Displayed when a chat session doesn't exist or the user lacks access.
 *
 * @module app/(chat)/chat/[id]/not-found
 */

import Link from "next/link";

export default function ChatNotFound() {
    return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <h2 className="mb-2 font-semibold text-xl">Chat not found</h2>
            <p className="mb-4 text-muted-foreground">
                This chat doesn&apos;t exist or you don&apos;t have access to
                it.
            </p>
            <Link
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
                href="/"
            >
                Start new chat
            </Link>
        </div>
    );
}
