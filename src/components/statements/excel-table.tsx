"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Maximize2, Minimize2 } from "lucide-react";
import { getEntityColor, descriptionContainsEntity, ENTITY_EMOJIS } from "@/lib/entity-colors";

interface SheetData {
  columns: string[];
  data: any[];
  row_count: number;
  column_count: number;
}

interface ExcelTableProps {
  data: SheetData | any[];
  sheetName: string;
}

export function ExcelTable({ data, sheetName }: ExcelTableProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<string | null>(null);
  const resizeStartRef = useRef<{ column: string; startX: number; startWidth: number } | null>(null);
  const [entities, setEntities] = useState<any[]>([]);

  // Load entities from Master Panel
  useEffect(() => {
    const loadEntities = () => {
      fetch("/api/ai/entities")
        .then((res) => res.json())
        .then((data) => setEntities(data || []))
        .catch(() => setEntities([]));
    };

    loadEntities();

    // Listen for entity updates from Master Panel
    const handleEntitiesUpdate = () => loadEntities();
    window.addEventListener('entitiesUpdated', handleEntitiesUpdate);

    return () => window.removeEventListener('entitiesUpdated', handleEntitiesUpdate);
  }, []);

  const { columns, rows, stats } = useMemo(() => {
    // Handle both formats: object with {columns, data} or direct array
    let actualData: any[];
    let actualColumns: string[];

    if (data && typeof data === 'object' && 'data' in data && 'columns' in data) {
      // New format from backend: {columns, data, row_count, column_count}
      actualData = data.data || [];
      actualColumns = data.columns || [];
    } else if (Array.isArray(data) && data.length > 0) {
      // Legacy format: direct array
      actualData = data;
      actualColumns = Object.keys(data[0] || {});
    } else {
      return { columns: [], rows: [], stats: { rowCount: 0, columnCount: 0 } };
    }

    return {
      columns: actualColumns,
      rows: actualData,
      stats: {
        rowCount: actualData.length,
        columnCount: actualColumns.length,
      },
    };
  }, [data]);

  // Initialize column widths
  useEffect(() => {
    if (columns.length > 0 && Object.keys(columnWidths).length === 0) {
      const initialWidths: Record<string, number> = {};
      columns.forEach((col) => {
        const lowerCol = col.toLowerCase();
        if (lowerCol.includes("date")) initialWidths[col] = 110;
        else if (lowerCol.includes("description") || lowerCol.includes("particulars")) initialWidths[col] = 250;
        else if (isNumericColumn(col)) initialWidths[col] = 130;
        else if (lowerCol.includes("category")) initialWidths[col] = 140;
        else if (lowerCol.includes("entity")) initialWidths[col] = 140;
        else if (lowerCol.includes("bank")) initialWidths[col] = 100;
        else if (lowerCol.includes("voucher")) initialWidths[col] = 120;
        else initialWidths[col] = 120;
      });
      setColumnWidths(initialWidths);
    }
  }, [columns]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Error toggling fullscreen:", err);
    }
  };

  const handleResizeStart = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setResizing(column);
    resizeStartRef.current = {
      column,
      startX: e.clientX,
      startWidth: columnWidths[column] || 120,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing || !resizeStartRef.current) return;

      const delta = e.clientX - resizeStartRef.current.startX;
      const newWidth = Math.max(60, resizeStartRef.current.startWidth + delta); // Min width 60px

      setColumnWidths((prev) => ({
        ...prev,
        [resizing]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizing(null);
      resizeStartRef.current = null;
    };

    if (resizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing]);

  const formatCellValue = (value: any, columnName: string): string => {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    const lowerCol = columnName.toLowerCase();

    // Format numeric columns
    if (typeof value === "number" &&
        (lowerCol.includes("credit") || lowerCol.includes("debit") ||
         lowerCol.includes("balance") || lowerCol.includes("amount"))) {
      return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }

    return String(value);
  };

  const isNumericColumn = (columnName: string): boolean => {
    const lowerCol = columnName.toLowerCase();
    return lowerCol.includes("credit") ||
           lowerCol.includes("debit") ||
           lowerCol.includes("balance") ||
           lowerCol.includes("amount") ||
           lowerCol.includes("total");
  };

  const isDescriptionColumn = (columnName: string): boolean => {
    const lowerCol = columnName.toLowerCase();
    return lowerCol.includes("description") || lowerCol.includes("particulars");
  };

  const handleExportCSV = () => {
    if (rows.length === 0) return;

    const csvContent = [
      columns.join(","),
      ...rows.map(row =>
        columns.map(col => {
          const value = row[col];
          const stringValue = value === null || value === undefined ? "" : String(value);
          // Escape commas and quotes
          return stringValue.includes(",") || stringValue.includes('"')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${sheetName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border/60 bg-muted/20 py-12 text-center">
        <p className="text-sm text-muted-foreground">No data available in this sheet</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`space-y-4 ${isFullscreen ? "bg-background p-6" : ""}`}>
      {/* Stats and Actions Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {stats.rowCount.toLocaleString('en-IN')} rows
          </Badge>
          <Badge variant="secondary" className="font-mono text-xs">
            {stats.columnCount} columns
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={toggleFullscreen}
            className="gap-2"
            title={isFullscreen ? "Exit fullscreen" : "View fullscreen"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="size-3.5" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="size-3.5" />
                Fullscreen
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="gap-2"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Excel-like Table Container */}
      <div className="relative w-full">
        <div className="overflow-auto rounded-lg border border-border/60 bg-background shadow-sm">
          {/* Scrollable container with max height */}
          <div className={isFullscreen ? "max-h-[calc(100vh-180px)] overflow-auto" : "max-h-[calc(100vh-320px)] overflow-auto"}>
            <table className="w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
              {/* Sticky Header */}
              <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm">
                <tr>
                  {/* Sticky Row Number Column Header */}
                  <th className="sticky left-0 z-30 bg-muted/95 backdrop-blur-sm border-b border-r border-border px-3 py-2.5 text-center font-semibold text-xs text-muted-foreground"
                      style={{ width: '56px' }}>
                    #
                  </th>
                  {/* Regular Headers with Resize Handle */}
                  {columns.map((col) => (
                    <th
                      key={col}
                      className={`relative border-b border-border px-4 py-2.5 font-semibold text-xs ${
                        isNumericColumn(col) ? "text-right" : "text-left"
                      }`}
                      style={{ width: `${columnWidths[col] || 120}px` }}
                    >
                      <div className="truncate pr-2">{col}</div>
                      {/* Resize Handle */}
                      <div
                        className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-primary/50 group"
                        onMouseDown={(e) => handleResizeStart(e, col)}
                      >
                        <div className="absolute top-0 right-0 h-full w-[3px] bg-primary/0 group-hover:bg-primary/80 transition-colors" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={`border-b border-border/40 transition-colors hover:bg-muted/40 ${
                      rowIndex % 2 === 0 ? "bg-background" : "bg-muted/20"
                    }`}
                  >
                    {/* Sticky Row Number Column */}
                    <td className="sticky left-0 z-10 bg-muted/50 backdrop-blur-sm border-r border-border px-3 py-2.5 text-center text-xs font-medium text-muted-foreground"
                        style={{ width: '56px' }}>
                      {rowIndex + 1}
                    </td>
                    {/* Regular Cells */}
                    {columns.map((col) => {
                      const cellValue = row[col];
                      const colLower = col.toLowerCase();
                      const isEntityCol = colLower.includes('entity');
                      const isDescCol = isDescriptionColumn(col);

                      // Check if Entity column has a value
                      const entityInRow = row['Entity'] || row['entity'];
                      const hasEntity = entityInRow && entityInRow !== '-';

                      // Find matching entity from Master Panel
                      let matchedEntity = null;
                      if (hasEntity) {
                        matchedEntity = entities.find(e =>
                          e.name === entityInRow ||
                          (isDescCol && descriptionContainsEntity(cellValue, e.name, e.aliases))
                        );
                      }

                      const color = matchedEntity ? getEntityColor(matchedEntity.name) : null;
                      const emoji = matchedEntity ? (ENTITY_EMOJIS[matchedEntity.type] || "🎯") : null;

                      return (
                        <td
                          key={`${rowIndex}-${col}`}
                          className={`px-4 py-2.5 overflow-hidden ${
                            isNumericColumn(col) ? "text-right font-mono" : "text-left"
                          } ${color && (isEntityCol || isDescCol) ? color.bg : ""} transition-colors`}
                          style={{
                            width: `${columnWidths[col] || 120}px`,
                            wordBreak: isDescCol ? 'break-word' : 'normal',
                            overflowWrap: isDescCol ? 'anywhere' : 'normal',
                          }}
                        >
                          <div className={isDescCol ? "" : "truncate"}>
                            {color && isEntityCol && hasEntity ? (
                              <span className={`inline-flex items-center gap-1.5 font-semibold ${color.text}`}>
                                <span className="text-base">{emoji}</span>
                                {cellValue}
                              </span>
                            ) : color && isDescCol ? (
                              <span className={`font-medium ${color.text}`}>
                                {formatCellValue(cellValue, col)}
                              </span>
                            ) : (
                              <span className={isNumericColumn(col) && cellValue ? "font-medium" : ""}>
                                {formatCellValue(cellValue, col)}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Scroll Hint for Mobile */}
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground md:hidden">
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          <span>Scroll horizontally to view all columns</span>
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </div>
    </div>
  );
}