/**
 * Sheet Editor Component
 *
 * react-data-grid based spreadsheet editor for sheet artifacts.
 * Migrated from archive/oldapp/components/sheet-editor.tsx
 *
 * @module features/artifact/components/editors/sheet-editor
 */
"use client"

import { useTheme } from "next-themes"
import { parse, unparse } from "papaparse"
import { memo, useEffect, useMemo, useState } from "react"
import DataGrid, { textEditor } from "react-data-grid"

import { cn } from "@/lib/utils"

// NOTE: react-data-grid CSS is imported in app/globals.css for better bundling

/**
 * Cell value type for spreadsheet cells
 */
type CellValue = string | number | boolean | null

/**
 * Row data structure for DataGrid
 */
type RowData = Record<string, CellValue> & {
	id: number
	rowNumber: number
}

/**
 * Props for the SheetEditor component
 */
export interface SheetEditorProps {
	/** CSV content to edit */
	content: string
	/** Callback when content is saved */
	onSaveContent: (content: string, debounce: boolean) => void
	/** Index of the current version */
	currentVersionIndex: number
	/** Whether this is the current version */
	isCurrentVersion: boolean
	/** Current streaming status */
	status: "streaming" | "idle"
}

const MIN_ROWS = 50
const MIN_COLS = 26

/**
 * Pure editor component for memoization
 */
function PureSheetEditor({ content, onSaveContent }: SheetEditorProps) {
	const { resolvedTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	const parseData = useMemo(() => {
		if (!content) {
			return new Array(MIN_ROWS).fill(new Array(MIN_COLS).fill(""))
		}
		const result = parse<string[]>(content, { skipEmptyLines: true })

		const paddedData = result.data.map((row) => {
			const paddedRow = [...row]
			while (paddedRow.length < MIN_COLS) {
				paddedRow.push("")
			}
			return paddedRow
		})

		while (paddedData.length < MIN_ROWS) {
			paddedData.push(new Array(MIN_COLS).fill(""))
		}

		return paddedData
	}, [content])

	const columns = useMemo(() => {
		const rowNumberColumn = {
			key: "rowNumber",
			name: "",
			frozen: true,
			width: 50,
			renderCell: ({ rowIdx }: { rowIdx: number }) => rowIdx + 1,
			cellClass: "border-t border-r dark:bg-zinc-950 dark:text-zinc-50",
			headerCellClass:
				"border-t border-r dark:bg-zinc-900 dark:text-zinc-50",
		}

		const dataColumns = Array.from({ length: MIN_COLS }, (_, i) => ({
			key: i.toString(),
			name: String.fromCharCode(65 + i),
			renderEditCell: textEditor,
			width: 120,
			cellClass: cn("border-t dark:bg-zinc-950 dark:text-zinc-50", {
				"border-l": i !== 0,
			}),
			headerCellClass: cn("border-t dark:bg-zinc-900 dark:text-zinc-50", {
				"border-l": i !== 0,
			}),
		}))

		return [rowNumberColumn, ...dataColumns]
	}, [])

	const initialRows = useMemo(() => {
		return parseData.map((row, rowIndex) => {
			const rowData: RowData = {
				id: rowIndex,
				rowNumber: rowIndex + 1,
			}

			columns.slice(1).forEach((col, colIndex) => {
				rowData[col.key] = row[colIndex] || ""
			})

			return rowData
		})
	}, [parseData, columns])

	const [localRows, setLocalRows] = useState(initialRows)

	useEffect(() => {
		setLocalRows(initialRows)
	}, [initialRows])

	const generateCsv = (data: CellValue[][]) => {
		return unparse(data)
	}

	const handleRowsChange = (newRows: RowData[]) => {
		setLocalRows(newRows)

		const updatedData = newRows.map((row) => {
			return columns.slice(1).map((col) => row[col.key] || "")
		})

		const newCsvContent = generateCsv(updatedData)
		onSaveContent(newCsvContent, true)
	}

	// Use safe default until mounted to prevent hydration mismatch
	const themeClass =
		mounted && resolvedTheme === "dark" ? "rdg-dark" : "rdg-light"

	return (
		<DataGrid
			className={themeClass}
			columns={columns}
			defaultColumnOptions={{
				resizable: true,
				sortable: true,
			}}
			enableVirtualization
			onCellClick={(args) => {
				if (args.column.key !== "rowNumber") {
					args.selectCell(true)
				}
			}}
			onRowsChange={handleRowsChange}
			rows={localRows}
			style={{ height: "100%" }}
		/>
	)
}

/**
 * Custom comparison function for memoization
 */
function areEqual(prevProps: SheetEditorProps, nextProps: SheetEditorProps) {
	return (
		prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
		prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
		!(
			prevProps.status === "streaming" && nextProps.status === "streaming"
		) &&
		prevProps.content === nextProps.content &&
		prevProps.onSaveContent === nextProps.onSaveContent
	)
}

/**
 * react-data-grid based spreadsheet editor for sheet artifacts
 *
 * Features:
 * - CSV parsing and generation with papaparse
 * - Virtualized grid for performance
 * - Dark/light theme support
 * - Resizable and sortable columns
 * - Auto-save on cell changes
 *
 * @example
 * ```tsx
 * <SheetEditor
 *   content="Name,Age\nJohn,30\nJane,25"
 *   onSaveContent={(csv, debounce) => saveCsv(csv)}
 *   status="idle"
 *   isCurrentVersion={true}
 *   currentVersionIndex={0}
 * />
 * ```
 */
export const SheetEditor = memo(PureSheetEditor, areEqual)
