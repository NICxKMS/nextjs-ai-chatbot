/**
 * ChatWithSlots Component
 *
 * App-layer wrapper that injects cross-feature components into Chat.
 * This is the composition point where features are wired together.
 *
 * @module app/(chat)/chat-with-slots
 */

"use client";

import { Chat, type FullChatProps } from "@/features/chat";
import { useSettings } from "@/features/settings";
import { SidebarToggle, useOptimisticChats } from "@/features/sidebar";

export type ChatWithSlotsProps = Omit<
    FullChatProps,
    "sidebarToggle" | "settingsButton" | "onAddOptimisticChat" | "onModelChange"
>;

// Lazy import SettingsIconButton to avoid circular dependency
import { SettingsIconButton } from "@/features/settings";

/**
 * Wrapper component that provides cross-feature slot components to Chat.
 *
 * This is the app layer's composition point where:
 * - SidebarToggle (from sidebar feature) is injected
 * - SettingsIconButton (from settings feature) is injected
 * - Optimistic chat callback (from sidebar feature) is wired
 * - Model persistence callback (from settings feature) is wired
 *
 * Features remain decoupled - they only know about interfaces/props,
 * not concrete implementations from other features.
 */
export function ChatWithSlots(props: ChatWithSlotsProps) {
    const { addOptimisticChat } = useOptimisticChats();
    const { setSelectedModelId } = useSettings();

    return (
        <Chat
            {...props}
            onAddOptimisticChat={addOptimisticChat}
            onModelChange={setSelectedModelId}
            settingsButton={<SettingsIconButton />}
            sidebarToggle={<SidebarToggle />}
        />
    );
}
