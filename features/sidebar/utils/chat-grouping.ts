import { isAfter, isToday, isYesterday, subWeeks } from "date-fns";
import type { ChatGroup, ChatHistoryItem } from "../types";

const GROUP_LABELS = [
    "Today",
    "Yesterday",
    "Last 7 Days",
    "Last 30 Days",
    "Older",
] as const;

/**
 * Groups chat history items by date ranges for sidebar display.
 *
 * @param chats - Array of chat history items to group
 * @param now - Optional reference date for grouping (defaults to current time)
 * @returns Array of chat groups with labels and associated chats, excluding empty groups
 *
 * @example
 * ```ts
 * const groups = groupChatsByDate(chats);
 * // Returns: [{ label: "Today", chats: [...] }, { label: "Yesterday", chats: [...] }]
 * ```
 */
export function groupChatsByDate(
    chats: ChatHistoryItem[],
    now?: Date
): ChatGroup[] {
    const groups = new Map<string, ChatHistoryItem[]>(
        GROUP_LABELS.map((label) => [label, []])
    );

    // Use provided date or current time - computed at call time, not module load time
    const referenceDate = now ?? new Date();
    const oneWeekAgo = subWeeks(referenceDate, 1);
    const oneMonthAgo = subWeeks(referenceDate, 4);

    for (const chat of chats) {
        const date = new Date(chat.createdAt);
        let groupKey: string;

        if (isToday(date)) {
            groupKey = "Today";
        } else if (isYesterday(date)) {
            groupKey = "Yesterday";
        } else if (isAfter(date, oneWeekAgo)) {
            groupKey = "Last 7 Days";
        } else if (isAfter(date, oneMonthAgo)) {
            groupKey = "Last 30 Days";
        } else {
            groupKey = "Older";
        }

        groups.get(groupKey)?.push(chat);
    }

    // Filter out empty groups and return in order
    return GROUP_LABELS.map((label) => ({
        label,
        chats: groups.get(label)!,
    })).filter((group) => group.chats.length > 0);
}
