/**
 * React Hook for Cache Invalidation
 *
 * Provides React integration for the invalidation system.
 *
 * @module lib/cache/use-invalidation
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import {
    type InvalidationScope,
    invalidateChats,
    invalidateOnLogout,
    invalidateSession,
    registerInvalidationHandler,
} from "./invalidation";

/**
 * Hook to register a component's invalidation handler
 *
 * @param name - Handler name for debugging
 * @param scope - Scope(s) to respond to
 * @param handler - Cleanup function
 *
 * @example
 * ```tsx
 * function ChatHistory() {
 *   const [history, setHistory] = useState([]);
 *
 *   useInvalidation('chatHistory', 'chats', () => {
 *     setHistory([]);
 *   });
 *
 *   // ...
 * }
 * ```
 */
export function useInvalidation(
    name: string,
    scope: InvalidationScope | InvalidationScope[],
    handler: () => void | Promise<void>
): void {
    // Use ref to track if handler is registered
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        // Wrap handler to always use latest ref
        const wrappedHandler = () => handlerRef.current();

        const unregister = registerInvalidationHandler(
            name,
            scope,
            wrappedHandler
        );

        return unregister;
    }, [name, scope]);
}

/**
 * Hook providing invalidation actions
 *
 * @returns Object with invalidation methods
 *
 * @example
 * ```tsx
 * function LogoutButton() {
 *   const { onLogout } = useInvalidationActions();
 *
 *   const handleLogout = async () => {
 *     await supabase.auth.signOut();
 *     await onLogout();
 *     router.push('/login');
 *   };
 *
 *   return <button onClick={handleLogout}>Sign Out</button>;
 * }
 * ```
 */
export function useInvalidationActions() {
    const onLogout = useCallback(async () => {
        return invalidateOnLogout();
    }, []);

    const onSessionChange = useCallback(async () => {
        return invalidateSession();
    }, []);

    const onChatDelete = useCallback(async (chatId?: string) => {
        return invalidateChats(chatId);
    }, []);

    return {
        /** Call when user logs out */
        onLogout,
        /** Call when session changes (e.g., account switch) */
        onSessionChange,
        /** Call when a chat is deleted */
        onChatDelete,
    };
}
