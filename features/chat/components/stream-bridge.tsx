"use client"

import { useEffect, useRef } from "react"
import { useChatStream } from "@/features/chat/components/chat-stream-provider"
import { DEFAULT_ARTIFACT, processStreamDelta } from "@/features/chat/lib/process-stream-deltas"
import type { UIArtifact } from "@/lib/types/artifact.types"

interface StreamBridgeProps {
	chatId: string
	onArtifactDelta: (artifact: UIArtifact) => void
}

export function StreamBridge({ chatId, onArtifactDelta }: StreamBridgeProps) {
	const { chatStream } = useChatStream()
	const lastProcessedRef = useRef(-1)
	const artifactRef = useRef<UIArtifact>(DEFAULT_ARTIFACT)
	const chatIdRef = useRef(chatId)

	useEffect(() => {
		// Reset on chat ID change
		if (chatIdRef.current !== chatId) {
			chatIdRef.current = chatId
			lastProcessedRef.current = -1
			artifactRef.current = DEFAULT_ARTIFACT
		}
		if (!chatStream.length) {
			lastProcessedRef.current = -1
			return
		}
		if (chatStream.length <= lastProcessedRef.current + 1) return
		const newDeltas = chatStream.slice(lastProcessedRef.current + 1)
		lastProcessedRef.current = chatStream.length - 1
		for (const delta of newDeltas) {
			const { artifact } = processStreamDelta(delta, artifactRef.current)
			artifactRef.current = artifact
			onArtifactDelta(artifact)
		}
	}, [chatId, chatStream, onArtifactDelta])

	return null
}
