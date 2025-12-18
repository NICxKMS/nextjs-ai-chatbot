import "server-only";

/**
 * Message cache operations.
 *
 * @module cache/message
 */

export {
    deleteMessagesAfter,
    deleteMessagesByTimeRange,
    deleteMessagesFromCache,
} from "./delete";
export {
    getMessageCount,
    getMessagesByTimeRange,
    getMessagesFromCache,
} from "./read";
export { appendMessagesToCache, appendMessageToCache } from "./write";
