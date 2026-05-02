"use client"

import { useTheme } from "next-themes"
import { parse, unparse } from "papaparse"
import { memo, useEffect, useMemo, useRef, useState } from "react"
import { type CellMouseArgs, DataGrid, renderTextEditor } from "react-data-grid"

import "react-data-grid/lib/styles.css"

import type { EditorSaveCallback } from "@/features/artifacts/types/artifact.types"
import { cn } from "@/lib/utils/cn"

// ── Constants ────────────────────────────────────────────────

const MIN_ROWS = 50
const MIN_COLS = 26

/** Local debounce for cell edits — batches rapid changes before forwarding to save handler. */
const CELL_CHANGE_DEBOUNCE_MS = 300

// ── Types ────────────────────────────────────────────────────

type CellValue = string | number | boolean | null

type RowData = Record<string, CellValue> & {
	id: number
	rowNumber: number
}

type SheetEditorProps = {
	content: string
	onSaveContent: EditorSaveCallback
	status: string
	isCurrentVersion: boolean
	currentVersionIndex: number
}

// ── Column definitions ───────────────────────────────────────

function buildColumns(readOnly: boolean) {
	const rowNumberColumn = {
		key: "rowNumber" as const,
		name: "",
		frozen: true,
		width: 50,
		renderCell: ({ rowIdx }: { rowIdx: number }) => rowIdx + 1,
		cellClass: "border-t border-r dark:bg-zinc-950 dark:text-zinc-50 bg-zinc-50 text-zinc-500",
		headerCellClass: "border-t border-r dark:bg-zinc-900 dark:text-zinc-50 bg-zinc-100",
	}

	const dataColumns = Array.from({ length: MIN_COLS }, (_, i) => ({
		key: i.toString(),
		name: String.fromCharCode(65 + i),
		renderEditCell: readOnly ? undefined : renderTextEditor,
		width: 120,
		cellClass: cn("border-t dark:bg-zinc-950 dark:text-zinc-50", {
			"border-l": i !== 0,
		}),
		headerCellClass: cn("border-t dark:bg-zinc-900 dark:text-zinc-50", {
			"border-l": i !== 0,
		}),
	}))

	return [rowNumberColumn, ...dataColumns]
}

// ── Helpers ──────────────────────────────────────────────────

function parseCSV(content: string): string[][] {
	if (!content) {
		return Array.from({ length: MIN_ROWS }, () => Array.from({ length: MIN_COLS }, () => ""))
	}

	const result = parse<string[]>(content, { skipEmptyLines: true })

	const paddedData = result.data.map((row) => {
		const padded = [...row]
		while (padded.length < MIN_COLS) {
			padded.push("")
		}
		return padded
	})

	while (paddedData.length < MIN_ROWS) {
		paddedData.push(Array.from({ length: MIN_COLS }, () => ""))
	}

	return paddedData
}

function toRows(data: string[][], dataColumns: { key: string }[]): RowData[] {
	return data.map((row, rowIndex) => {
		const rowData: RowData = {
			id: rowIndex,
			rowNumber: rowIndex + 1,
		}
		for (let colIndex = 0; colIndex < dataColumns.length; colIndex++) {
			const col = dataColumns[colIndex]
			if (col) {
				rowData[col.key] = row[colIndex] || ""
			}
		}
		return rowData
	})
}

// ── Component ────────────────────────────────────────────────

function PureSheetEditor({ content, onSaveContent, isCurrentVersion }: SheetEditorProps) {
	const { resolvedTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	// Stable ref for onSaveContent — prevents stale closure in debounced callback
	const onSaveContentRef = useRef(onSaveContent)
	onSaveContentRef.current = onSaveContent

	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		setMounted(true)
	}, [])

	const readOnly = !isCurrentVersion

	const columns = useMemo(() => buildColumns(readOnly), [readOnly])
	const dataColumns = useMemo(() => columns.slice(1), [columns])

	const parsedData = useMemo(() => parseCSV(content), [content])

	const initialRows = useMemo(() => toRows(parsedData, dataColumns), [parsedData, dataColumns])

	const [localRows, setLocalRows] = useState(initialRows)

	useEffect(() => {
		setLocalRows(initialRows)
	}, [initialRows])

	const handleRowsChange = (newRows: RowData[]) => {
		setLocalRows(newRows)

		// Debounce to batch rapid cell edits instead of firing per-keystroke
		if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
		saveTimerRef.current = setTimeout(() => {
			const updatedData = newRows.map((row) => dataColumns.map((col) => row[col.key] || ""))
			const csv = unparse(updatedData)
			onSaveContentRef.current(csv, { debounce: true })
		}, CELL_CHANGE_DEBOUNCE_MS)
	}

	// Cleanup debounce timer on unmount
	useEffect(() => {
		return () => {
			if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
		}
	}, [])

	// Prevent hydration mismatch — resolve theme only after mount
	const themeClass = mounted && resolvedTheme === "dark" ? "rdg-dark" : "rdg-light"

	return (
		<DataGrid
			className={themeClass}
			columns={columns}
			defaultColumnOptions={{
				resizable: true,
				sortable: true,
			}}
			enableVirtualization
			onCellClick={(args: CellMouseArgs<RowData>) => {
				if (args.column.key !== "rowNumber" && !readOnly) {
					args.selectCell(true)
				}
			}}
			onRowsChange={readOnly ? undefined : handleRowsChange}
			rows={localRows}
			style={{ height: "100%" }}
		/>
	)
}

// ── Memo comparison ──────────────────────────────────────────
// Skip re-render when props are structurally equal.
// Content comparison handles streaming changes — no streaming bypass needed.

function arePropsEqual(prev: SheetEditorProps, next: SheetEditorProps): boolean {
	return (
		prev.currentVersionIndex === next.currentVersionIndex &&
		prev.isCurrentVersion === next.isCurrentVersion &&
		prev.content === next.content &&
		prev.onSaveContent === next.onSaveContent
	)
}

export const SheetEditor = memo(PureSheetEditor, arePropsEqual)
