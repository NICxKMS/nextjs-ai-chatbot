/**
 * Message Components
 *
 * Exports all message-related components for rendering chat messages.
 *
 * @module features/chat/components/message
 */

export type { MessageItemProps } from "../../types";
export type { MessageActionsProps } from "./message-actions";
export { MessageActions } from "./message-actions";
export type { MessageAvatarProps } from "./message-avatar";
// Sub-components
export { MessageAvatar } from "./message-avatar";
export type { MessageContentProps } from "./message-content";
export { MessageContent } from "./message-content";
// Main message component
export { MessageItem } from "./message-item";
export type { MessagePartProps } from "./message-part";
export { MessagePart } from "./message-part";
