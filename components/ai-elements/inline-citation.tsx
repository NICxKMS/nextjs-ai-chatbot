/**
 * Inline Citation Element Components
 *
 * Components for displaying inline citations with source references.
 * Used for AI responses that cite external sources.
 *
 * @module components/ai-elements/inline-citation
 */

"use client"

import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import {
	type ComponentProps,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react"
import { Badge } from "@/components/ui/badge"
import {
	Carousel,
	type CarouselApi,
	CarouselContent,
	CarouselItem,
} from "@/components/ui/carousel"
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn } from "@/lib/utils/index"

export type InlineCitationProps = ComponentProps<"span">

/**
 * Root inline citation container.
 */
export const InlineCitation = ({
	className,
	...props
}: InlineCitationProps) => (
	<span
		className={cn("group inline items-center gap-1", className)}
		{...props}
	/>
)

export type InlineCitationTextProps = ComponentProps<"span">

/**
 * Citation text with hover highlight.
 */
export const InlineCitationText = ({
	className,
	...props
}: InlineCitationTextProps) => (
	<span
		className={cn("transition-colors group-hover:bg-accent", className)}
		{...props}
	/>
)

export type InlineCitationCardProps = ComponentProps<typeof HoverCard>

/**
 * Citation hover card for displaying source details.
 */
export const InlineCitationCard = (props: InlineCitationCardProps) => (
	<HoverCard closeDelay={0} openDelay={0} {...props} />
)

export type InlineCitationCardTriggerProps = ComponentProps<typeof Badge> & {
	sources: string[]
}

/**
 * Citation badge showing source domain.
 */
export const InlineCitationCardTrigger = ({
	sources,
	className,
	...props
}: InlineCitationCardTriggerProps) => (
	<HoverCardTrigger asChild>
		<Badge
			className={cn("ml-1 rounded-full", className)}
			variant="secondary"
			{...props}
		>
			{sources[0] ? (
				<>
					{new URL(sources[0]).hostname}{" "}
					{sources.length > 1 && `+${sources.length - 1}`}
				</>
			) : (
				"unknown"
			)}
		</Badge>
	</HoverCardTrigger>
)

export type InlineCitationCardBodyProps = ComponentProps<"div">

/**
 * Citation card body container.
 */
export const InlineCitationCardBody = ({
	className,
	...props
}: InlineCitationCardBodyProps) => (
	<HoverCardContent
		className={cn("relative w-80 p-0", className)}
		{...props}
	/>
)

const CarouselApiContext = createContext<CarouselApi | undefined>(undefined)

const useCarouselApi = () => {
	const context = useContext(CarouselApiContext)
	return context
}

export type InlineCitationCarouselProps = ComponentProps<typeof Carousel>

/**
 * Carousel for browsing multiple sources.
 */
export const InlineCitationCarousel = ({
	className,
	children,
	...props
}: InlineCitationCarouselProps) => {
	const [api, setApi] = useState<CarouselApi>()

	return (
		<CarouselApiContext.Provider value={api}>
			<Carousel
				className={cn("w-full", className)}
				setApi={setApi}
				{...props}
			>
				{children}
			</Carousel>
		</CarouselApiContext.Provider>
	)
}

export type InlineCitationCarouselContentProps = ComponentProps<"div">

/**
 * Carousel content container.
 */
export const InlineCitationCarouselContent = (
	props: InlineCitationCarouselContentProps,
) => <CarouselContent {...props} />

export type InlineCitationCarouselItemProps = ComponentProps<"div">

/**
 * Individual carousel item for a source.
 */
export const InlineCitationCarouselItem = ({
	className,
	...props
}: InlineCitationCarouselItemProps) => (
	<CarouselItem
		className={cn("w-full space-y-2 p-4 pl-8", className)}
		{...props}
	/>
)

export type InlineCitationCarouselHeaderProps = ComponentProps<"div">

/**
 * Carousel header with navigation.
 */
export const InlineCitationCarouselHeader = ({
	className,
	...props
}: InlineCitationCarouselHeaderProps) => (
	<div
		className={cn(
			"flex items-center justify-between gap-2 rounded-t-md bg-secondary p-2",
			className,
		)}
		{...props}
	/>
)

export type InlineCitationCarouselIndexProps = ComponentProps<"div">

/**
 * Carousel index indicator (e.g., "1/3").
 */
export const InlineCitationCarouselIndex = ({
	children,
	className,
	...props
}: InlineCitationCarouselIndexProps) => {
	const api = useCarouselApi()
	const [current, setCurrent] = useState(0)
	const [count, setCount] = useState(0)

	useEffect(() => {
		if (!api) {
			return
		}

		setCount(api.scrollSnapList().length)
		setCurrent(api.selectedScrollSnap() + 1)

		api.on("select", () => {
			setCurrent(api.selectedScrollSnap() + 1)
		})
	}, [api])

	return (
		<div
			className={cn(
				"flex flex-1 items-center justify-end px-3 py-1 text-muted-foreground text-xs",
				className,
			)}
			{...props}
		>
			{children ?? `${current}/${count}`}
		</div>
	)
}

export type InlineCitationCarouselPrevProps = ComponentProps<"button">

/**
 * Previous source button.
 */
export const InlineCitationCarouselPrev = ({
	className,
	...props
}: InlineCitationCarouselPrevProps) => {
	const api = useCarouselApi()

	const handleClick = useCallback(() => {
		if (api) {
			api.scrollPrev()
		}
	}, [api])

	return (
		<button
			aria-label="Previous"
			className={cn("shrink-0", className)}
			onClick={handleClick}
			type="button"
			{...props}
		>
			<ArrowLeftIcon className="size-4 text-muted-foreground" />
		</button>
	)
}

export type InlineCitationCarouselNextProps = ComponentProps<"button">

/**
 * Next source button.
 */
export const InlineCitationCarouselNext = ({
	className,
	...props
}: InlineCitationCarouselNextProps) => {
	const api = useCarouselApi()

	const handleClick = useCallback(() => {
		if (api) {
			api.scrollNext()
		}
	}, [api])

	return (
		<button
			aria-label="Next"
			className={cn("shrink-0", className)}
			onClick={handleClick}
			type="button"
			{...props}
		>
			<ArrowRightIcon className="size-4 text-muted-foreground" />
		</button>
	)
}

export type InlineCitationSourceProps = ComponentProps<"div"> & {
	title?: string
	url?: string
	description?: string
}

/**
 * Individual source display component.
 */
export const InlineCitationSource = ({
	title,
	url,
	description,
	className,
	children,
	...props
}: InlineCitationSourceProps) => (
	<div className={cn("space-y-1", className)} {...props}>
		{title && (
			<h4 className="truncate font-medium text-sm leading-tight">
				{title}
			</h4>
		)}
		{url && (
			<p className="truncate break-all text-muted-foreground text-xs">
				{url}
			</p>
		)}
		{description && (
			<p className="line-clamp-3 text-muted-foreground text-sm leading-relaxed">
				{description}
			</p>
		)}
		{children}
	</div>
)

export type InlineCitationQuoteProps = ComponentProps<"blockquote">

/**
 * Quote display from source.
 */
export const InlineCitationQuote = ({
	children,
	className,
	...props
}: InlineCitationQuoteProps) => (
	<blockquote
		className={cn(
			"border-muted border-l-2 pl-3 text-muted-foreground text-sm italic",
			className,
		)}
		{...props}
	>
		{children}
	</blockquote>
)
