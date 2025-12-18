// =============================================================================
// MESSAGE DATA MODULE
// =============================================================================

// Mutations
export {
    type CreateMessageInput,
    createMessage,
    createMessages,
    deleteMessagesAfterTimestamp,
    deleteMessagesByChatId,
    updateMessage,
} from "./mutations";
// Queries
export { getMessageById, getMessagesByChatId } from "./queries";
