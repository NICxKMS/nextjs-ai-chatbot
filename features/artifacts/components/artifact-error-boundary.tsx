"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"

import { Button } from "@/components/ui/button"

interface ArtifactErrorBoundaryProps {
	children: ReactNode
}

interface ArtifactErrorBoundaryState {
	hasError: boolean
	error: Error | null
}

/**
 * Error boundary for artifact editor content.
 *
 * Wraps only the editor area inside the artifact panel so that
 * panel chrome (close button, actions, version footer) remains
 * functional when an editor crashes.
 */
export class ArtifactErrorBoundary extends Component<
	ArtifactErrorBoundaryProps,
	ArtifactErrorBoundaryState
> {
	constructor(props: ArtifactErrorBoundaryProps) {
		super(props)
		this.state = { hasError: false, error: null }
	}

	static getDerivedStateFromError(error: Error): ArtifactErrorBoundaryState {
		return { hasError: true, error }
	}

	override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		console.error("[ArtifactErrorBoundary]", error, errorInfo)
	}

	private handleRetry = () => {
		this.setState({ hasError: false, error: null })
	}

	override render(): ReactNode {
		if (this.state.hasError) {
			const errorCode =
				this.state.error &&
				"code" in this.state.error &&
				typeof (this.state.error as { code: unknown }).code === "string"
					? (this.state.error as { code: string }).code
					: undefined

			return (
				<div
					className="flex h-full w-full flex-col items-center justify-center gap-4 p-6"
					role="alert"
				>
					<div className="font-medium text-destructive text-sm">
						Failed to render artifact
					</div>
					<p className="max-w-md text-center text-muted-foreground text-xs">
						An error occurred while rendering this content.
					</p>
					{errorCode && (
						<code className="rounded bg-muted px-2 py-1 text-muted-foreground text-xs">
							{errorCode}
						</code>
					)}
					{this.state.error && !errorCode && (
						<code className="max-w-full overflow-auto rounded bg-muted px-2 py-1 text-xs">
							{this.state.error.message}
						</code>
					)}
					<Button variant="outline" size="sm" onClick={this.handleRetry}>
						Retry
					</Button>
				</div>
			)
		}

		return this.props.children
	}
}
