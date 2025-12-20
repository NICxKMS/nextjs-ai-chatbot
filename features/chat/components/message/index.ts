/**
 * Message Components
 *
 * Exports all message-related components for rendering chat messages.
 *
 * @module features/chat/components/message
 */

// Main message component
export { MessageItem } from './message-item';
export type { MessageItemProps } from '../../types';

// Sub-components
export { MessageAvatar } from './message-avatar';
export type { MessageAvatarProps } from './message-avatar';

export { MessageContent } from './message-content';
export type { MessageContentProps } from './message-content';

export { MessagePart } from './message-part';
export type { MessagePartProps } from './message-part';

export { MessageActions } from './message-actions';
export type { MessageActionsProps } from './message-actions';
