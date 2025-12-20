'use client';

import { memo, useMemo } from 'react';

export interface SheetPreviewProps {
  /** Sheet content (CSV or JSON) to preview */
  content: string;
  /** Maximum rows to display (default: 5) */
  maxRows?: number;
}

/**
 * Sheet document preview renderer.
 * Shows table snippet with row count.
 */
function SheetPreviewComponent({ content, maxRows = 5 }: SheetPreviewProps) {
  const { headers, rows, totalRows } = useMemo(() => {
    try {
      // Try parsing as JSON first
      const data = JSON.parse(content);
      if (Array.isArray(data) && data.length > 0) {
        const headerRow = Object.keys(data[0]);
        const dataRows = data.slice(0, maxRows).map((row) =>
          headerRow.map((key) => String(row[key] ?? ''))
        );
        return {
          headers: headerRow,
          rows: dataRows,
          totalRows: data.length,
        };
      }
    } catch {
      // Fall back to CSV parsing
      const lines = content.split('\n').filter((line) => line.trim());
      const firstLine = lines[0];
      if (lines.length > 0 && firstLine) {
        const headerRow = firstLine.split(',').map((h) => h.trim());
        const dataRows = lines.slice(1, maxRows + 1).map((line) =>
          line.split(',').map((cell) => cell.trim())
        );
        return {
          headers: headerRow,
          rows: dataRows,
          totalRows: lines.length - 1,
        };
      }
    }
    return { headers: [], rows: [], totalRows: 0 };
  }, [content, maxRows]);

  if (headers.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Empty or invalid sheet data
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded border dark:border-zinc-700">
      <table className="w-full text-xs">
        <thead className="bg-muted">
          <tr>
            {headers.slice(0, 4).map((header, i) => (
              <th
                key={i}
                className="border-b border-r px-2 py-1.5 text-left font-medium dark:border-zinc-700 last:border-r-0"
              >
                {header}
              </th>
            ))}
            {headers.length > 4 && (
              <th className="border-b px-2 py-1.5 text-left text-muted-foreground dark:border-zinc-700">
                +{headers.length - 4}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b last:border-b-0 dark:border-zinc-700">
              {row.slice(0, 4).map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="border-r px-2 py-1.5 dark:border-zinc-700 last:border-r-0 truncate max-w-[120px]"
                >
                  {cell}
                </td>
              ))}
              {row.length > 4 && (
                <td className="px-2 py-1.5 text-muted-foreground">...</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {totalRows > maxRows && (
        <div className="bg-muted px-2 py-1 text-xs text-muted-foreground border-t dark:border-zinc-700">
          Showing {maxRows} of {totalRows} rows
        </div>
      )}
    </div>
  );
}

export const SheetPreview = memo(SheetPreviewComponent);
