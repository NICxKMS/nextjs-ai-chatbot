"use client";

import { useEffect, useRef, useState } from "react";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "./elements/reasoning";

type MessageReasoningProps = {
  isLoading: boolean;
  reasoning: string;
};

const MS_IN_S = 1000;

function useThoughtDuration(isLoading: boolean, reasoning: string) {
  const [duration, setDuration] = useState(0);
  const reasoningStartTimeRef = useRef<number | null>(null);
  const lastReasoningUpdateRef = useRef<number | null>(null);
  const previousReasoningRef = useRef<string>("");

  useEffect(() => {
    const trimmedReasoning = reasoning.trim();
    const previousReasoning = previousReasoningRef.current;

    if (!trimmedReasoning) {
      reasoningStartTimeRef.current = null;
      lastReasoningUpdateRef.current = null;
      setDuration(0);
      previousReasoningRef.current = trimmedReasoning;
      return;
    }

    if (reasoningStartTimeRef.current === null) {
      reasoningStartTimeRef.current = Date.now();
    }

    if (trimmedReasoning !== previousReasoning) {
      lastReasoningUpdateRef.current = Date.now();

      if (
        reasoningStartTimeRef.current !== null &&
        lastReasoningUpdateRef.current !== null
      ) {
        const elapsedMs =
          lastReasoningUpdateRef.current - reasoningStartTimeRef.current;
        setDuration(Math.max(0, Math.round(elapsedMs / MS_IN_S)));
      }
    }

    previousReasoningRef.current = trimmedReasoning;
  }, [reasoning]);

  useEffect(() => {
    if (!isLoading && reasoningStartTimeRef.current !== null) {
      const endTimestamp =
        lastReasoningUpdateRef.current ?? reasoningStartTimeRef.current;
      const elapsedMs = endTimestamp - reasoningStartTimeRef.current;
      setDuration(Math.max(0, Math.round(elapsedMs / MS_IN_S)));

      reasoningStartTimeRef.current = null;
      lastReasoningUpdateRef.current = null;
    }
  }, [isLoading]);

  return duration;
}

export function MessageReasoning({
  isLoading,
  reasoning,
}: MessageReasoningProps) {
  const [hasBeenStreaming, setHasBeenStreaming] = useState(isLoading);
  const thoughtDuration = useThoughtDuration(isLoading, reasoning);

  useEffect(() => {
    if (isLoading) {
      setHasBeenStreaming(true);
    }
  }, [isLoading]);

  return (
    <Reasoning
      data-testid="message-reasoning"
      defaultOpen={hasBeenStreaming}
      duration={thoughtDuration}
      isStreaming={isLoading}
    >
      <ReasoningTrigger />
      <ReasoningContent>{reasoning}</ReasoningContent>
    </Reasoning>
  );
}
