/**
 * Carousel Component
 *
 * A carousel component with navigation using Embla Carousel.
 *
 * @module components/ui/carousel
 */

"use client"

import useEmblaCarousel, {
	type UseEmblaCarouselType,
} from "embla-carousel-react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import {
	type ComponentProps,
	createContext,
	forwardRef,
	type HTMLAttributes,
	type KeyboardEvent,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react"

import { AppError } from "@/lib/errors"
import { cn } from "@/lib/utils"

import { Button } from "./button"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
	opts?: CarouselOptions
	plugins?: CarouselPlugin
	orientation?: "horizontal" | "vertical"
	setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
	carouselRef: ReturnType<typeof useEmblaCarousel>[0]
	api: ReturnType<typeof useEmblaCarousel>[1]
	scrollPrev: () => void
	scrollNext: () => void
	canScrollPrev: boolean
	canScrollNext: boolean
} & CarouselProps

const CarouselContext = createContext<CarouselContextProps | null>(null)

/**
 * Hook to access carousel context
 * @throws AppError if used outside Carousel provider
 */
function useCarousel() {
	const context = useContext(CarouselContext)

	if (!context) {
		throw new AppError(
			"bad_request:ui",
			"useCarousel must be used within a Carousel provider",
			400,
		)
	}

	return context
}

/**
 * Carousel container component
 */
const Carousel = forwardRef<
	HTMLDivElement,
	HTMLAttributes<HTMLDivElement> & CarouselProps
>(
	(
		{
			orientation = "horizontal",
			opts,
			setApi,
			plugins,
			className,
			children,
			...props
		},
		ref,
	) => {
		const [carouselRef, api] = useEmblaCarousel(
			{
				...opts,
				axis: orientation === "horizontal" ? "x" : "y",
			},
			plugins,
		)
		const [canScrollPrev, setCanScrollPrev] = useState(false)
		const [canScrollNext, setCanScrollNext] = useState(false)

		const onSelect = useCallback((emblaApi: CarouselApi) => {
			if (!emblaApi) {
				return
			}

			setCanScrollPrev(emblaApi.canScrollPrev())
			setCanScrollNext(emblaApi.canScrollNext())
		}, [])

		const scrollPrev = useCallback(() => {
			api?.scrollPrev()
		}, [api])

		const scrollNext = useCallback(() => {
			api?.scrollNext()
		}, [api])

		const handleKeyDown = useCallback(
			(event: KeyboardEvent<HTMLDivElement>) => {
				if (event.key === "ArrowLeft") {
					event.preventDefault()
					scrollPrev()
				} else if (event.key === "ArrowRight") {
					event.preventDefault()
					scrollNext()
				}
			},
			[scrollPrev, scrollNext],
		)

		useEffect(() => {
			if (!api || !setApi) {
				return
			}

			setApi(api)
		}, [api, setApi])

		useEffect(() => {
			if (!api) {
				return
			}

			onSelect(api)
			api.on("reInit", onSelect)
			api.on("select", onSelect)

			return () => {
				api?.off("select", onSelect)
			}
		}, [api, onSelect])

		return (
			<CarouselContext.Provider
				value={{
					carouselRef,
					api,
					opts,
					orientation:
						orientation ||
						(opts?.axis === "y" ? "vertical" : "horizontal"),
					scrollPrev,
					scrollNext,
					canScrollPrev,
					canScrollNext,
				}}
			>
				{/* biome-ignore lint/a11y/useSemanticElements: aria-roledescription requires div */}
				<div
					aria-roledescription="carousel"
					className={cn("relative", className)}
					onKeyDownCapture={handleKeyDown}
					ref={ref}
					role="region"
					{...props}
				>
					{children}
				</div>
			</CarouselContext.Provider>
		)
	},
)
Carousel.displayName = "Carousel"

/**
 * Carousel content wrapper
 */
const CarouselContent = forwardRef<
	HTMLDivElement,
	HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
	const { carouselRef, orientation } = useCarousel()

	return (
		<div className="overflow-hidden" ref={carouselRef}>
			<div
				className={cn(
					"flex",
					orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
					className,
				)}
				ref={ref}
				{...props}
			/>
		</div>
	)
})
CarouselContent.displayName = "CarouselContent"

/**
 * Carousel item component
 */
const CarouselItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => {
		const { orientation } = useCarousel()

		return (
			// biome-ignore lint/a11y/useSemanticElements: aria-roledescription requires div
			<div
				aria-roledescription="slide"
				className={cn(
					"min-w-0 shrink-0 grow-0 basis-full",
					orientation === "horizontal" ? "pl-4" : "pt-4",
					className,
				)}
				ref={ref}
				role="group"
				{...props}
			/>
		)
	},
)
CarouselItem.displayName = "CarouselItem"

/**
 * Carousel previous button
 */
const CarouselPrevious = forwardRef<
	HTMLButtonElement,
	ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
	const { orientation, scrollPrev, canScrollPrev } = useCarousel()

	return (
		<Button
			className={cn(
				"absolute h-8 w-8 rounded-full",
				orientation === "horizontal"
					? "-left-12 -translate-y-1/2 top-1/2"
					: "-top-12 -translate-x-1/2 left-1/2 rotate-90",
				className,
			)}
			disabled={!canScrollPrev}
			onClick={scrollPrev}
			ref={ref}
			size={size}
			variant={variant}
			{...props}
		>
			<ArrowLeft className="h-4 w-4" />
			<span className="sr-only">Previous slide</span>
		</Button>
	)
})
CarouselPrevious.displayName = "CarouselPrevious"

/**
 * Carousel next button
 */
const CarouselNext = forwardRef<
	HTMLButtonElement,
	ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
	const { orientation, scrollNext, canScrollNext } = useCarousel()

	return (
		<Button
			className={cn(
				"absolute h-8 w-8 rounded-full",
				orientation === "horizontal"
					? "-right-12 -translate-y-1/2 top-1/2"
					: "-bottom-12 -translate-x-1/2 left-1/2 rotate-90",
				className,
			)}
			disabled={!canScrollNext}
			onClick={scrollNext}
			ref={ref}
			size={size}
			variant={variant}
			{...props}
		>
			<ArrowRight className="h-4 w-4" />
			<span className="sr-only">Next slide</span>
		</Button>
	)
})
CarouselNext.displayName = "CarouselNext"

export {
	type CarouselApi,
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselPrevious,
	CarouselNext,
}
