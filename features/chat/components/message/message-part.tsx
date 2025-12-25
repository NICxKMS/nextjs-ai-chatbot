/**
 * Message Part Component
 *
 * Re-exports from decomposed message-part folder.
 * This file maintains backward compatibility for existing imports.
 *
 * @module features/chat/components/message/message-part
 * @see ./message-part/index.tsx for the actual implementation
 */

export {
    MessagePart,
    type MessagePartProps,
    ReasoningPartView,
    type ReasoningPartViewProps,
    SourcePartView,
    type SourcePartViewProps,
    // Sub-components for direct access
    TextPartView,
    // Types
    type TextPartViewProps,
    ToolCallPartView,
    type ToolCallPartViewProps,
    ToolResultPartView,
    type ToolResultPartViewProps,
} from "./message-part/index";
