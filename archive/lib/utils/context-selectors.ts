/**
 * Context Selectors Utility
 *
 * Provides utilities for creating optimized context selectors that prevent
 * unnecessary re-renders by selecting only specific slices of context state.
 *
 * @module lib/utils/context-selectors
 */

"use client";

import { type Context, useContext, useRef, useSyncExternalStore } from "react";

/**
 * Equality function type for comparing selected values.
 */
export type EqualityFn<T> = (a: T, b: T) => boolean;

/**
 * Default shallow equality check.
 * Uses Object.is for primitive values.
 */
export const shallowEqual: EqualityFn<unknown> = (a, b) => {
    if (Object.is(a, b)) {
        return true;
    }
    if (typeof a !== "object" || typeof b !== "object") {
        return false;
    }
    if (a === null || b === null) {
        return false;
    }

    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);

    if (keysA.length !== keysB.length) {
        return false;
    }

    for (const key of keysA) {
        if (
            !(key in (b as Record<string, unknown>)) ||
            !Object.is(
                (a as Record<string, unknown>)[key],
                (b as Record<string, unknown>)[key]
            )
        ) {
            return false;
        }
    }

    return true;
};

/**
 * Creates a selector hook for extracting a specific slice from context.
 *
 * This utility helps prevent unnecessary re-renders by only triggering
 * updates when the selected slice actually changes.
 *
 * @param context - The React context to select from
 * @param selector - Function to extract the desired slice from context state
 * @param equalityFn - Optional custom equality function (defaults to Object.is)
 *
 * @example
 * ```tsx
 * // Define a selector hook
 * const useUserName = createContextSelector(
 *   UserContext,
 *   (state) => state.name
 * );
 *
 * // Use in component - only re-renders when name changes
 * function UserGreeting() {
 *   const name = useUserName();
 *   return <span>Hello, {name}</span>;
 * }
 * ```
 */
export function createContextSelector<T, S>(
    context: Context<T>,
    selector: (state: T) => S,
    equalityFn: EqualityFn<S> = Object.is
): () => S {
    return function useContextSelector(): S {
        const contextValue = useContext(context);
        const selectedRef = useRef<S | undefined>(undefined);

        const selected = selector(contextValue);

        // Only update ref if value actually changed
        if (
            selectedRef.current === undefined ||
            !equalityFn(selectedRef.current, selected)
        ) {
            selectedRef.current = selected;
        }

        return selectedRef.current;
    };
}

/**
 * Hook for selecting a slice of context with inline selector.
 *
 * Unlike createContextSelector, this allows dynamic selectors but requires
 * the selector to be memoized externally for optimal performance.
 *
 * @param context - The React context to select from
 * @param selector - Function to extract the desired slice
 * @param equalityFn - Optional custom equality function
 *
 * @example
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   const user = useContextSlice(
 *     UsersContext,
 *     useCallback((state) => state.users[userId], [userId])
 *   );
 *   return <div>{user.name}</div>;
 * }
 * ```
 */
export function useContextSlice<T, S>(
    context: Context<T>,
    selector: (state: T) => S,
    equalityFn: EqualityFn<S> = Object.is
): S {
    const contextValue = useContext(context);
    const selectedRef = useRef<S | undefined>(undefined);

    const selected = selector(contextValue);

    if (
        selectedRef.current === undefined ||
        !equalityFn(selectedRef.current, selected)
    ) {
        selectedRef.current = selected;
    }

    return selectedRef.current;
}

/**
 * Creates multiple selector hooks from a single context.
 *
 * Useful for creating a set of fine-grained selectors for a complex context.
 *
 * @param context - The React context to select from
 * @param selectors - Object mapping selector names to selector functions
 *
 * @example
 * ```tsx
 * const selectors = createContextSelectors(ChatContext, {
 *   messages: (state) => state.messages,
 *   status: (state) => state.status,
 *   sendMessage: (state) => state.sendMessage,
 * });
 *
 * // Use individual selectors
 * const messages = selectors.useMessages();
 * const status = selectors.useStatus();
 * ```
 */
export function createContextSelectors<
    T,
    Selectors extends Record<string, (state: T) => unknown>,
>(
    context: Context<T>,
    selectors: Selectors
): {
    [K in keyof Selectors as `use${Capitalize<string & K>}`]: () => ReturnType<
        Selectors[K]
    >;
} {
    const result = {} as {
        [K in keyof Selectors as `use${Capitalize<string & K>}`]: () => ReturnType<
            Selectors[K]
        >;
    };

    for (const [key, selector] of Object.entries(selectors)) {
        const hookName =
            `use${key.charAt(0).toUpperCase()}${key.slice(1)}` as keyof typeof result;
        (result as Record<string, () => unknown>)[hookName] =
            createContextSelector(
                context,
                selector as (state: T) => ReturnType<Selectors[keyof Selectors]>
            );
    }

    return result;
}

/**
 * Subscription-based context selector using useSyncExternalStore.
 *
 * This is a more advanced pattern for contexts that support subscriptions.
 * It provides better concurrent mode support.
 *
 * @param subscribe - Function to subscribe to context changes
 * @param getSnapshot - Function to get current snapshot
 * @param selector - Function to extract desired slice
 * @param equalityFn - Optional equality function
 *
 * @example
 * ```tsx
 * // For stores that support subscriptions (like Zustand)
 * const count = useSubscriptionSelector(
 *   store.subscribe,
 *   store.getState,
 *   (state) => state.count
 * );
 * ```
 */
export function useSubscriptionSelector<T, S>(
    subscribe: (callback: () => void) => () => void,
    getSnapshot: () => T,
    selector: (state: T) => S,
    equalityFn: EqualityFn<S> = Object.is
): S {
    const selectedRef = useRef<S | undefined>(undefined);

    const getSelectedSnapshot = () => {
        const state = getSnapshot();
        const selected = selector(state);

        if (
            selectedRef.current === undefined ||
            !equalityFn(selectedRef.current, selected)
        ) {
            selectedRef.current = selected;
        }

        return selectedRef.current;
    };

    return useSyncExternalStore(subscribe, getSelectedSnapshot);
}
