// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("react-jsx-parser", () => ({
	default: ({ jsx, onError }: { jsx: string; onError?: (error: Error) => void }) => {
		if (jsx.includes("THROW")) {
			onError?.(new Error(`JSX parse failed: ${jsx}`))
		}
		return React.createElement("div", { "data-testid": "jsx-parser-output" }, jsx)
	},
}))

import {
	ChainOfThought,
	ChainOfThoughtContent,
	ChainOfThoughtHeader,
	ChainOfThoughtImage,
	ChainOfThoughtSearchResult,
	ChainOfThoughtSearchResults,
	ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought"
import {
	EnvironmentVariable,
	EnvironmentVariableCopyButton,
	EnvironmentVariableGroup,
	EnvironmentVariableName,
	EnvironmentVariableRequired,
	EnvironmentVariables,
	EnvironmentVariablesContent,
	EnvironmentVariablesHeader,
	EnvironmentVariablesTitle,
	EnvironmentVariablesToggle,
	EnvironmentVariableValue,
} from "@/components/ai-elements/environment-variables"
import {
	FileTree,
	FileTreeActions,
	FileTreeFile,
	FileTreeFolder,
} from "@/components/ai-elements/file-tree"
import {
	JSXPreview,
	JSXPreviewContent,
	JSXPreviewError,
} from "@/components/ai-elements/jsx-preview"
import {
	ModelSelector,
	ModelSelectorContent,
	ModelSelectorDialog,
	ModelSelectorEmpty,
	ModelSelectorGroup,
	ModelSelectorInput,
	ModelSelectorItem,
	ModelSelectorList,
	ModelSelectorLogo,
	ModelSelectorLogoGroup,
	ModelSelectorName,
	ModelSelectorSeparator,
	ModelSelectorShortcut,
	ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector"
import {
	OpenIn,
	OpenInChatGPT,
	OpenInClaude,
	OpenInContent,
	OpenInCursor,
	OpenInLabel,
	OpenInScira,
	OpenInSeparator,
	OpenInT3,
	OpenInTrigger,
	OpenInv0,
} from "@/components/ai-elements/open-in-chat"
import {
	PackageInfo,
	PackageInfoChangeType,
	PackageInfoContent,
	PackageInfoDependencies,
	PackageInfoDependency,
	PackageInfoDescription,
	PackageInfoHeader,
	PackageInfoName,
	PackageInfoVersion,
} from "@/components/ai-elements/package-info"
import {
	Queue,
	QueueItem,
	QueueItemAction,
	QueueItemActions,
	QueueItemAttachment,
	QueueItemFile,
	QueueItemImage,
	QueueList,
	QueueSection,
	QueueSectionContent,
	QueueSectionLabel,
	QueueSectionTrigger,
} from "@/components/ai-elements/queue"
import {
	SchemaDisplay,
	SchemaDisplayExample,
	SchemaDisplayProperty,
} from "@/components/ai-elements/schema-display"

describe("ai-elements targeted deep coverage", () => {
	it("environment-variables: toggles visibility and copies values", async () => {
		const onShowValuesChange = vi.fn()
		const onCopy = vi.fn()
		const writeText = vi.fn().mockResolvedValue(undefined)

		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: {
				writeText,
			},
		})

		render(
			<EnvironmentVariables defaultShowValues={false} onShowValuesChange={onShowValuesChange}>
				<EnvironmentVariablesHeader>
					<EnvironmentVariablesTitle />
					<EnvironmentVariablesToggle />
				</EnvironmentVariablesHeader>
				<EnvironmentVariablesContent>
					<EnvironmentVariable name="API_KEY" value="secret-value">
						<EnvironmentVariableGroup>
							<EnvironmentVariableName />
							<EnvironmentVariableRequired />
						</EnvironmentVariableGroup>
						<EnvironmentVariableValue />
						<EnvironmentVariableCopyButton data-testid="copy-value" onCopy={onCopy} />
					</EnvironmentVariable>
				</EnvironmentVariablesContent>
			</EnvironmentVariables>,
		)

		expect(screen.getByText("Environment Variables")).toBeInTheDocument()
		expect(screen.getByText("API_KEY")).toBeInTheDocument()
		expect(screen.getByText("Required")).toBeInTheDocument()
		expect(screen.getByText("••••••••••••")).toBeInTheDocument()

		fireEvent.click(screen.getByRole("switch", { name: /toggle value visibility/i }))
		expect(onShowValuesChange).toHaveBeenCalledWith(true)
		expect(screen.getByText("secret-value")).toBeInTheDocument()

		fireEvent.click(screen.getByTestId("copy-value"))
		expect(writeText).toHaveBeenCalledWith("secret-value")
		await waitFor(() => {
			expect(onCopy).toHaveBeenCalled()
		})
	})

	it("environment-variables: reports clipboard API errors", () => {
		const onError = vi.fn()

		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: undefined,
		})

		render(
			<EnvironmentVariables showValues>
				<EnvironmentVariablesContent>
					<EnvironmentVariable name="TOKEN" value="abc">
						<EnvironmentVariableCopyButton copyFormat="export" onError={onError} />
					</EnvironmentVariable>
				</EnvironmentVariablesContent>
			</EnvironmentVariables>,
		)

		fireEvent.click(screen.getByRole("button"))
		expect(onError).toHaveBeenCalledWith(expect.any(Error))
	})

	it("file-tree: expands folders, selects files, and stops action propagation", () => {
		const onExpandedChange = vi.fn()
		const onSelect = vi.fn()

		render(
			<FileTree onExpandedChange={onExpandedChange} onSelect={onSelect}>
				<FileTreeFolder name="src" path="/src" />
				<FileTreeFile name="index.ts" path="/src/index.ts">
					<span>index.ts</span>
					<FileTreeActions>
						<button type="button">Action</button>
					</FileTreeActions>
				</FileTreeFile>
			</FileTree>,
		)

		expect(screen.getByRole("tree")).toBeInTheDocument()
		expect(screen.getByText("src")).toBeInTheDocument()

		fireEvent.click(screen.getByText("src"))
		expect(onExpandedChange).toHaveBeenCalled()
		expect(screen.getByText(/index\.ts/i)).toBeInTheDocument()

		fireEvent.click(screen.getByText(/index\.ts/i))
		expect(onSelect).toHaveBeenCalledWith("/src/index.ts")

		const treeItems = screen.getAllByRole("treeitem")
		const fileTreeItem = treeItems.at(-1)
		if (!fileTreeItem) {
			throw new Error("Expected file tree item")
		}

		fireEvent.keyDown(fileTreeItem, { key: "Enter" })
		expect(onSelect).toHaveBeenCalledWith("/src/index.ts")

		const selectedBeforeAction = onSelect.mock.calls.length
		fireEvent.click(screen.getByRole("button", { name: "Action" }))
		expect(onSelect.mock.calls.length).toBe(selectedBeforeAction)
	})

	it("jsx-preview: validates context usage and streaming completion", () => {
		expect(() => render(<JSXPreviewContent />)).toThrow(
			"JSXPreview components must be used within JSXPreview",
		)

		render(
			<JSXPreview isStreaming jsx="<article><p>Hello">
				<JSXPreviewContent />
			</JSXPreview>,
		)

		expect(screen.getByTestId("jsx-parser-output")).toHaveTextContent(
			"<article><p>Hello</p></article>",
		)
	})

	it("jsx-preview: reports errors once per JSX payload and renders custom fallback", () => {
		const onError = vi.fn()
		const { rerender } = render(
			<JSXPreview jsx="<THROW />" onError={onError}>
				<JSXPreviewContent />
				<JSXPreviewError>
					<span>Custom preview error</span>
				</JSXPreviewError>
			</JSXPreview>,
		)

		const initialErrorCalls = onError.mock.calls.length
		expect(initialErrorCalls).toBeGreaterThan(0)
		expect(screen.getByText("Custom preview error")).toBeInTheDocument()

		rerender(
			<JSXPreview jsx="<THROW />" onError={onError}>
				<JSXPreviewContent />
				<JSXPreviewError>
					<span>Custom preview error</span>
				</JSXPreviewError>
			</JSXPreview>,
		)
		expect(onError).toHaveBeenCalledTimes(initialErrorCalls)

		rerender(
			<JSXPreview jsx="<THROW_NEXT />" onError={onError}>
				<JSXPreviewContent />
				<JSXPreviewError>
					<span>Custom preview error</span>
				</JSXPreviewError>
			</JSXPreview>,
		)
		expect(onError.mock.calls.length).toBeGreaterThan(initialErrorCalls)
	})

	it("open-in-chat: enforces provider usage and renders provider links", () => {
		expect(() => render(<OpenInChatGPT />)).toThrow(
			"OpenIn components must be used within an OpenIn provider",
		)

		render(
			<OpenIn open query="ship tests">
				<OpenInTrigger />
				<OpenInContent>
					<OpenInLabel>Destinations</OpenInLabel>
					<OpenInSeparator />
					<OpenInChatGPT />
					<OpenInClaude />
					<OpenInT3 />
					<OpenInScira />
					<OpenInv0 />
					<OpenInCursor />
				</OpenInContent>
			</OpenIn>,
		)

		const chatgpt = screen.getByRole("menuitem", { name: /open in chatgpt/i })
		const claude = screen.getByRole("menuitem", { name: /open in claude/i })
		const t3 = screen.getByRole("menuitem", { name: /open in t3 chat/i })
		const scira = screen.getByRole("menuitem", { name: /open in scira/i })
		const v0 = screen.getByRole("menuitem", { name: /open in v0/i })
		const cursor = screen.getByRole("menuitem", { name: /open in cursor/i })

		expect(chatgpt).toHaveAttribute("href", expect.stringContaining("chatgpt.com"))
		expect(claude).toHaveAttribute("href", expect.stringContaining("claude.ai"))
		expect(t3).toHaveAttribute("href", expect.stringContaining("t3.chat"))
		expect(scira).toHaveAttribute("href", expect.stringContaining("scira.ai"))
		expect(v0).toHaveAttribute("href", expect.stringContaining("v0.app"))
		expect(cursor).toHaveAttribute("href", expect.stringContaining("cursor.com"))
	})

	it("chain-of-thought: toggles content and renders step utilities", () => {
		expect(() => render(<ChainOfThoughtHeader />)).toThrow(
			"ChainOfThought components must be used within ChainOfThought",
		)

		render(
			<ChainOfThought defaultOpen={false}>
				<ChainOfThoughtHeader />
				<ChainOfThoughtContent>
					<ChainOfThoughtStep description="working" label="Step one" status="active">
						<span>Nested output</span>
					</ChainOfThoughtStep>
					<ChainOfThoughtSearchResults>
						<ChainOfThoughtSearchResult>source-1</ChainOfThoughtSearchResult>
					</ChainOfThoughtSearchResults>
					<ChainOfThoughtImage caption="diagram">
						<div data-testid="diagram-content">diagram body</div>
					</ChainOfThoughtImage>
				</ChainOfThoughtContent>
			</ChainOfThought>,
		)

		expect(screen.queryByText("Step one")).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /chain of thought/i }))

		expect(screen.getByText("Step one")).toBeInTheDocument()
		expect(screen.getByText("working")).toBeInTheDocument()
		expect(screen.getByText("source-1")).toBeInTheDocument()
		expect(screen.getByText("diagram")).toBeInTheDocument()
	})

	it("model-selector: renders dialog wrappers, logos, and command utilities", () => {
		render(
			<>
				<ModelSelector open>
					<ModelSelectorTrigger asChild>
						<button type="button">Open models</button>
					</ModelSelectorTrigger>
					<ModelSelectorContent title="Choose model">
						<ModelSelectorInput placeholder="Search models" />
						<ModelSelectorList>
							<ModelSelectorEmpty>No models found</ModelSelectorEmpty>
							<ModelSelectorGroup heading="Popular">
								<ModelSelectorItem value="gpt-4o">
									<ModelSelectorLogoGroup data-testid="logo-group">
										<ModelSelectorLogo
											data-testid="openai-logo"
											provider="openai"
										/>
										<ModelSelectorLogo provider="anthropic" />
									</ModelSelectorLogoGroup>
									<ModelSelectorName>GPT-4o</ModelSelectorName>
									<ModelSelectorShortcut>CMD+1</ModelSelectorShortcut>
								</ModelSelectorItem>
							</ModelSelectorGroup>
							<ModelSelectorSeparator />
						</ModelSelectorList>
					</ModelSelectorContent>
				</ModelSelector>

				<ModelSelectorDialog open>
					<div>Dialog command shell</div>
				</ModelSelectorDialog>
			</>,
		)

		expect(screen.getByText("Choose model")).toBeInTheDocument()
		expect(screen.getByPlaceholderText("Search models")).toBeInTheDocument()
		expect(screen.getByText("GPT-4o")).toBeInTheDocument()
		expect(screen.getByText("CMD+1")).toBeInTheDocument()
		expect(screen.getByText("Dialog command shell")).toBeInTheDocument()

		const openaiLogo = screen.getByTestId("openai-logo")
		expect(openaiLogo).toHaveAttribute("src", expect.stringContaining("/openai.svg"))
		expect(openaiLogo).toHaveAttribute("alt", "openai logo")
		expect(screen.getByTestId("logo-group").className).toContain("-space-x-1")
	})

	it("package-info: renders fallback and composable dependency blocks", () => {
		render(
			<div>
				<PackageInfo
					changeType="removed"
					currentVersion="2.0.0"
					name="next"
					newVersion="1.0.0"
				/>

				<PackageInfo changeType="minor" name="zod">
					<PackageInfoHeader>
						<PackageInfoName>zod-custom</PackageInfoName>
						<PackageInfoChangeType />
					</PackageInfoHeader>
					<PackageInfoVersion />
					<PackageInfoDescription>Validation library</PackageInfoDescription>
					<PackageInfoContent>
						<PackageInfoDependencies>
							<PackageInfoDependency name="@types/node" version="22.0.0" />
							<PackageInfoDependency name="vitest" />
						</PackageInfoDependencies>
					</PackageInfoContent>
				</PackageInfo>
			</div>,
		)

		expect(screen.getByText("next")).toBeInTheDocument()
		expect(screen.getByText("removed")).toBeInTheDocument()
		expect(screen.getByText("2.0.0")).toBeInTheDocument()
		expect(screen.getByText("1.0.0")).toBeInTheDocument()
		expect(screen.getByText("zod-custom")).toBeInTheDocument()
		expect(screen.getByText("minor")).toBeInTheDocument()
		expect(screen.getByText("Validation library")).toBeInTheDocument()
		expect(screen.getByText("Dependencies")).toBeInTheDocument()
		expect(screen.getByText("@types/node")).toBeInTheDocument()
		expect(screen.getByText("22.0.0")).toBeInTheDocument()
		expect(screen.getByText("vitest")).toBeInTheDocument()
	})

	it("package-info: returns null when context values are absent", () => {
		render(
			<div>
				<PackageInfoChangeType data-testid="missing-change" />
				<PackageInfoVersion data-testid="missing-version" />
			</div>,
		)

		expect(screen.queryByTestId("missing-change")).not.toBeInTheDocument()
		expect(screen.queryByTestId("missing-version")).not.toBeInTheDocument()
	})

	it("queue: renders attachment and action helpers in expanded sections", () => {
		render(
			<Queue>
				<QueueSection>
					<QueueSectionTrigger>
						<QueueSectionLabel count={2} label="tasks" />
					</QueueSectionTrigger>
					<QueueSectionContent>
						<QueueList>
							<QueueItem>
								<QueueItemAttachment>
									<QueueItemImage
										data-testid="queue-image"
										src="https://example.com/file.png"
									/>
									<QueueItemFile>report.pdf</QueueItemFile>
								</QueueItemAttachment>
								<QueueItemActions>
									<QueueItemAction data-testid="queue-action">
										Retry
									</QueueItemAction>
								</QueueItemActions>
							</QueueItem>
						</QueueList>
					</QueueSectionContent>
				</QueueSection>
			</Queue>,
		)

		expect(screen.getByText("2 tasks")).toBeInTheDocument()
		expect(screen.getByText("report.pdf")).toBeInTheDocument()
		expect(screen.getByTestId("queue-action")).toHaveAttribute("type", "button")
		expect(screen.getByTestId("queue-action").className).toContain("opacity-0")
		expect(screen.getByTestId("queue-image")).toHaveAttribute("alt", "")
	})

	it("schema-display: renders nested request/response structures and examples", () => {
		const { container } = render(
			<div>
				<SchemaDisplay
					description="Creates a user"
					method="POST"
					parameters={[
						{
							description: "User identifier",
							location: "path",
							name: "id",
							required: true,
							type: "string",
						},
					]}
					path="/api/users/{id}"
					requestBody={[
						{
							name: "user",
							type: "object",
							properties: [
								{ name: "name", required: true, type: "string" },
								{
									name: "roles",
									type: "array",
									items: { name: "role", type: "string" },
								},
							],
						},
					]}
					responseBody={[{ description: "created user", name: "id", type: "string" }]}
				/>
				<SchemaDisplayProperty description="Leaf property" name="status" type="string" />
				<SchemaDisplayExample>{'{"id":"1"}'}</SchemaDisplayExample>
			</div>,
		)

		expect(screen.getByText("Creates a user")).toBeInTheDocument()
		expect(screen.getByText("POST")).toBeInTheDocument()
		expect(screen.getByText("Parameters")).toBeInTheDocument()
		expect(screen.getByText("Request Body")).toBeInTheDocument()
		expect(screen.getByText("Response")).toBeInTheDocument()
		expect(screen.getAllByText("required").length).toBeGreaterThan(0)
		expect(screen.getByText("Leaf property")).toBeInTheDocument()
		expect(screen.getByText('{"id":"1"}')).toBeInTheDocument()

		const highlightedPath = Array.from(container.querySelectorAll("span.font-mono")).find(
			(element) => element.textContent?.includes("/api/users/") === true,
		)
		expect(highlightedPath?.innerHTML).toContain("text-blue-600")
	})
})
