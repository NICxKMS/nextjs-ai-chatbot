'use client';

import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { parse, unparse } from 'papaparse';
import { memo, useEffect, useMemo, useState } from 'react';
import DataGrid, { textEditor } from 'react-data-grid';

// NOTE: react-data-grid CSS should be imported in app/globals.css for better bundling

// ============================================================================
// Types
// ============================================================================

/** Cell value type for spreadsheet cells */
type CellValue = string | number | boolean | null;

/** Row data structure for DataGrid */
type RowData = Record<string, CellValue> & {
  id: number;
  rowNumber: number;
};

export interface SheetEditorProps {
  /** CSV content to display/edit */
  content: string;
  /** Callback when content changes */
  onContentChange?: (content: string, isCurrentVersion: boolean) => void;
  /** Whether this is the current version being viewed */
  isCurrentVersion: boolean;
  /** Current artifact status */
  status: 'streaming' | 'idle';
}

// ============================================================================
// Constants
// ============================================================================

const MIN_ROWS = 50;
const MIN_COLS = 26;

// ============================================================================
// Editor Implementation
// ============================================================================

function PureSheetEditor({ content, onContentChange, isCurrentVersion }: SheetEditorProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const parseData = useMemo(() => {
    if (!content) {
      return new Array(MIN_ROWS).fill(new Array(MIN_COLS).fill(''));
    }
    const result = parse<string[]>(content, { skipEmptyLines: true });

    const paddedData = result.data.map((row) => {
      const paddedRow = [...row];
      while (paddedRow.length < MIN_COLS) {
        paddedRow.push('');
      }
      return paddedRow;
    });

    while (paddedData.length < MIN_ROWS) {
      paddedData.push(new Array(MIN_COLS).fill(''));
    }

    return paddedData;
  }, [content]);

  const columns = useMemo(() => {
    const rowNumberColumn = {
      key: 'rowNumber',
      name: '',
      frozen: true,
      width: 50,
      renderCell: ({ rowIdx }: { rowIdx: number }) => rowIdx + 1,
      cellClass: 'border-t border-r dark:bg-zinc-950 dark:text-zinc-50',
      headerCellClass: 'border-t border-r dark:bg-zinc-900 dark:text-zinc-50',
    };

    const dataColumns = Array.from({ length: MIN_COLS }, (_, i) => ({
      key: i.toString(),
      name: String.fromCharCode(65 + i),
      renderEditCell: textEditor,
      width: 120,
      cellClass: cn('border-t dark:bg-zinc-950 dark:text-zinc-50', {
        'border-l': i !== 0,
      }),
      headerCellClass: cn('border-t dark:bg-zinc-900 dark:text-zinc-50', {
        'border-l': i !== 0,
      }),
    }));

    return [rowNumberColumn, ...dataColumns];
  }, []);

  const initialRows = useMemo(() => {
    return parseData.map((row, rowIndex) => {
      const rowData: RowData = {
        id: rowIndex,
        rowNumber: rowIndex + 1,
      };

      columns.slice(1).forEach((col, colIndex) => {
        rowData[col.key] = row[colIndex] || '';
      });

      return rowData;
    });
  }, [parseData, columns]);

  const [localRows, setLocalRows] = useState(initialRows);

  useEffect(() => {
    setLocalRows(initialRows);
  }, [initialRows]);

  const generateCsv = (data: CellValue[][]) => {
    return unparse(data);
  };

  const handleRowsChange = (newRows: RowData[]) => {
    setLocalRows(newRows);

    const updatedData = newRows.map((row) => {
      return columns.slice(1).map((col) => row[col.key] || '');
    });

    const newCsvContent = generateCsv(updatedData);
    onContentChange?.(newCsvContent, isCurrentVersion);
  };

  // Use safe default until mounted to prevent hydration mismatch
  const themeClass = mounted && resolvedTheme === 'dark' ? 'rdg-dark' : 'rdg-light';

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
        if (args.column.key !== 'rowNumber') {
          args.selectCell(true);
        }
      }}
      onRowsChange={handleRowsChange}
      rows={localRows}
      style={{ height: '100%' }}
    />
  );
}

// ============================================================================
// Memoization
// ============================================================================

function areEqual(prevProps: SheetEditorProps, nextProps: SheetEditorProps) {
  return (
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    !(prevProps.status === 'streaming' && nextProps.status === 'streaming') &&
    prevProps.content === nextProps.content &&
    prevProps.onContentChange === nextProps.onContentChange
  );
}

export const SheetEditor = memo(PureSheetEditor, areEqual);
