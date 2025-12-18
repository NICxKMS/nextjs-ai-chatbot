"use client";

import { useCallback, useEffect } from "react";
import type { Shortcut } from "../types";

export function useToolbarShortcuts(shortcuts: Shortcut[]) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            for (const shortcut of shortcuts) {
                const matchKey =
                    e.key.toLowerCase() === shortcut.key.toLowerCase();
                const matchCtrl = shortcut.ctrl
                    ? e.ctrlKey || e.metaKey
                    : !(e.ctrlKey || e.metaKey);
                const matchShift = shortcut.shift ? e.shiftKey : !e.shiftKey;
                const matchAlt = shortcut.alt ? e.altKey : !e.altKey;

                if (matchKey && matchCtrl && matchShift && matchAlt) {
                    e.preventDefault();
                    shortcut.action();
                    return;
                }
            }
        },
        [shortcuts]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);
}
