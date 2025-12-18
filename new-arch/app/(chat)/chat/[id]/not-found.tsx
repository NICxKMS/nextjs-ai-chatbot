import { MessageSquareOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Not Found page displayed when a chat doesn't exist or user lacks access.
 * Triggered by calling notFound() from the page component.
 */
export default function ChatNotFound() {
    return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <MessageSquareOff className="mb-4 h-16 w-16 text-muted-foreground" />
            <h1 className="mb-2 font-bold text-2xl">Chat Not Found</h1>
            <p className="mb-6 max-w-md text-muted-foreground">
                This conversation doesn&apos;t exist or you don&apos;t have
                access to it.
            </p>
            <Button asChild>
                <Link href="/">Start New Chat</Link>
            </Button>
        </div>
    );
}
