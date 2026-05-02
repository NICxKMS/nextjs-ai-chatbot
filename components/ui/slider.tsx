import { type ComponentPropsWithoutRef, forwardRef } from "react"
import { cn } from "@/lib/utils/cn"

const Slider = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
	({ className, ...props }, ref) => (
		<input
			className={cn(
				"h-1.5 w-full appearance-none rounded-full bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:transition-colors",
				className,
			)}
			ref={ref}
			type="range"
			{...props}
		/>
	),
)
Slider.displayName = "Slider"

export { Slider }
