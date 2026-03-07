// ── Lazy-loaded artifact editors ─────────────────────────────
// Shared dynamic imports for all artifact editors.
// Editors are heavy (TipTap, CodeMirror, react-data-grid) — only
// load when the artifact panel or preview is actually rendered.
//
// Consumers: artifact-panel.tsx, artifact-preview.tsx

import dynamic from "next/dynamic"

export const TextEditor = dynamic(
	() =>
		import("@/features/artifacts/components/editors/text-editor").then((m) => ({
			default: m.TextEditor,
		})),
	{ ssr: false },
)

export const CodeEditor = dynamic(
	() =>
		import("@/features/artifacts/components/editors/code-editor").then((m) => ({
			default: m.CodeEditor,
		})),
	{ ssr: false },
)

export const SheetEditor = dynamic(
	() =>
		import("@/features/artifacts/components/editors/sheet-editor").then((m) => ({
			default: m.SheetEditor,
		})),
	{ ssr: false },
)

export const ImageEditor = dynamic(
	() =>
		import("@/features/artifacts/components/editors/image-editor").then((m) => ({
			default: m.ImageEditor,
		})),
	{ ssr: false },
)
