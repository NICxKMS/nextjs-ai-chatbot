import { Skeleton } from "@/components/ui/skeleton"

/** Staggered widths for message skeletons to create visual variety. */
const MESSAGE_SKELETONS = [
	{ id: "u1", role: "user" as const, widths: ["75%"] },
	{ id: "a1", role: "assistant" as const, widths: ["90%", "60%", "45%"] },
	{ id: "u2", role: "user" as const, widths: ["50%"] },
	{ id: "a2", role: "assistant" as const, widths: ["85%", "70%"] },
] as const

/**
 * Loading skeleton for an existing chat conversation.
 *
 * Mirrors ChatShell structure: sticky header, message list
 * with alternating user/assistant bubble skeletons, and a
 * bottom-anchored input skeleton.
 */
export default function Loading() {
	return (
		<div className="flex h-dvh min-w-0 flex-col bg-background">
			{/* Header skeleton — matches ChatHeader layout */}
			<header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
				<Skeleton className="size-8 rounded-md" />
				<Skeleton className="h-8 w-32 rounded-md" />
				<Skeleton className="hidden h-8 w-20 rounded-md md:block" />
				<div className="ml-auto flex items-center gap-1">
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-8 w-8 rounded-md" />
				</div>
			</header>

			{/* Message list skeletons */}
			<div className="flex flex-1 flex-col gap-6 overflow-hidden px-4 pt-4 md:mx-auto md:max-w-3xl md:px-0">
				{MESSAGE_SKELETONS.map((msg) => (
					<div
						key={msg.id}
						className={`flex flex-col gap-2 ${
							msg.role === "user" ? "items-end" : "items-start"
						}`}
					>
						{msg.role === "assistant" && <Skeleton className="size-6 rounded-full" />}
						{msg.widths.map((w) => (
							<Skeleton
								key={`${msg.id}-${w}`}
								className="h-4 rounded-md"
								style={{ width: w }}
							/>
						))}
					</div>
				))}
			</div>

			{/* Input skeleton — matches MultimodalInput position */}
			<div className="sticky bottom-0 mx-auto flex w-full max-w-4xl px-2 pb-3 md:px-4 md:pb-4">
				<Skeleton className="h-[52px] w-full rounded-2xl" />
			</div>

			<span className="sr-only">Loading conversation…</span>
		</div>
	)
}
