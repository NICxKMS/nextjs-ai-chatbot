"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { updateChatVisibility } from "@/app/(chat)/actions";
import {
  type ChatHistory,
  getChatHistoryPaginationKey,
} from "@/components/sidebar-history";
import type { VisibilityType } from "@/components/visibility-selector";

export function useChatVisibility({
  chatId,
  initialVisibilityType,
}: {
  chatId: string;
  initialVisibilityType: VisibilityType;
}) {
  const { mutate, cache } = useSWRConfig();
  const history: ChatHistory = cache.get("/api/history")?.data;

  const { data: localVisibility, mutate: setLocalVisibility } = useSWR(
    `${chatId}-visibility`,
    null,
    {
      fallbackData: initialVisibilityType,
    }
  );

  const visibilityType = useMemo(() => {
    if (!history) {
      return localVisibility;
    }
    const chat = history.chats.find((currentChat) => currentChat.id === chatId);
    if (!chat) {
      return "private";
    }
    return chat.visibility;
  }, [history, chatId, localVisibility]);

  const setVisibilityType = (updatedVisibilityType: VisibilityType) => {
    const previousVisibility = visibilityType ?? initialVisibilityType;
    const historyKey = unstable_serialize(getChatHistoryPaginationKey);

    setLocalVisibility(updatedVisibilityType);
    mutate(historyKey);

    updateChatVisibility({
      chatId,
      visibility: updatedVisibilityType,
    }).catch((error) => {
      console.error("Failed to update chat visibility", error);
      setLocalVisibility(previousVisibility);
      mutate(historyKey);
      toast.error("We couldn't change the visibility. Please try again.");
    });
  };

  return { visibilityType, setVisibilityType };
}
