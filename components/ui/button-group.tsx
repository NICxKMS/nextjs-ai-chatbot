"use client"

import type { ComponentProps, HTMLAttributes } from "react"

import { cn } from "@/lib/utils/cn"

export type ButtonGroupProps = HTMLAttributes<HTMLDivElement> & {
	orientation?: "horizontal" | "vertical"
}

export function ButtonGroup({ className, orientation = "horizontal", ...props }: ButtonGroupProps) {
	return (
		<div
			className={cn(
				"inline-flex items-center",
				orientation === "vertical" && "flex-col",
				className,
			)}
			{...props}
		/>
	)
}

export type ButtonGroupTextProps = ComponentProps<"span">

export function ButtonGroupText({ className, ...props }: ButtonGroupTextProps) {
	return (
		<span
			className={cn("inline-flex items-center justify-center px-2 text-sm", className)}
			{...props}
		/>
	)
}
