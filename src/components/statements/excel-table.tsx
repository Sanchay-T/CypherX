"use client";

import { useMemo, useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Download, Loader2, Maximize2, Minimize2, Pencil } from "lucide-react";
import { getEntityColor, descriptionContainsEntity, ENTITY_EMOJIS } from "@/lib/entity-colors";
import { masterKeywords, type MasterKeyword } from "@/data/master-keywords";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const amountSanitizer = /[^0-9.-]/g;

function parseAmount(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const normalized = value.replace(amountSanitizer, "");
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function normaliseKeyword(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s:-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ExcelTable({ data, sheetName }: ExcelTableProps) {
  const { toast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<string | null>(null);
  const resizeStartRef = useRef<{ column: string; startX: number; startWidth: number } | null>(null);
  const [entities, setEntities] = useState<any[]>([]);

  const { columns, initialRows } = useMemo(() => {
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
      return { columns: [], initialRows: [] };
    }

    return {
      columns: actualColumns,
      initialRows: actualData,
    };
  }, [data]);

  const [rows, setRows] = useState<any[]>(() => initialRows.map((row) => ({ ...row })));
  const [modifiedRowIndexes, setModifiedRowIndexes] = useState<Set<number>>(new Set());
  const [modifiedEntityIndexes, setModifiedEntityIndexes] = useState<Set<number>>(new Set());
  const [masters, setMasters] = useState<MasterKeyword[]>(() => masterKeywords.map((entry) => ({ ...entry })));
  const [modifiedMasterIds, setModifiedMasterIds] = useState<Set<string>>(new Set());
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [ledgerDraft, setLedgerDraft] = useState<string>("");
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [isLedgerDialogOpen, setIsLedgerDialogOpen] = useState(false);
  const [isDecisionDialogOpen, setIsDecisionDialogOpen] = useState(false);
  const [editingEntityRowIndex, setEditingEntityRowIndex] = useState<number | null>(null);
  const [isEntityDialogOpen, setIsEntityDialogOpen] = useState(false);
  const [entitySearchTerm, setEntitySearchTerm] = useState<string>("");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [entityType, setEntityType] = useState<string>("company");
  const [entityAliasesInput, setEntityAliasesInput] = useState<string>("");
  const [entityError, setEntityError] = useState<string | null>(null);
  const [isSavingEntity, setIsSavingEntity] = useState(false);

  const ledgerColumnKey = useMemo(() => {
    const normaliseColumnName = (value: string) =>
      value
        .toLowerCase()
        .trim()
        .replace(/[_\s-]+/g, "");

    const priorityOrder = ["ledger", "ledgername", "ledgercategory", "category", "ledgercode"];

    for (const column of columns) {
      const normalized = normaliseColumnName(column);
      if (priorityOrder.includes(normalized)) {
        return column;
      }
    }

    const fuzzyMatch = columns.find((column) => {
      const normalized = normaliseColumnName(column);
      return normalized.includes("ledger") || normalized.includes("category");
    });

    return fuzzyMatch ?? null;
  }, [columns]);

  const readRowValue = useCallback((row: Record<string, unknown>, key: string) => {
    if (row[key] !== undefined) {
      return row[key];
    }
    const lowerKey = key.toLowerCase();
    return row[lowerKey];
  }, []);

  const entityColumnKey = useMemo(() => {
    const normaliseColumnName = (value: string) =>
      value
        .toLowerCase()
        .trim()
        .replace(/[_\s-]+/g, "");

    for (const column of columns) {
      const normalized = normaliseColumnName(column);
      if (normalized === "entity") {
        return column;
      }
    }

    const fallback = columns.find((column) => {
      const normalized = normaliseColumnName(column);
      return normalized.includes("entity") && !normalized.includes("source");
    });

    return fallback ?? null;
  }, [columns]);

  const entitySourceColumnKey = useMemo(() => {
    const normaliseColumnName = (value: string) =>
      value
        .toLowerCase()
        .trim()
        .replace(/[_\s-]+/g, "");

    return (
      columns.find((column) => {
        const normalized = normaliseColumnName(column);
        return normalized.includes("entitysource");
      }) ?? null
    );
  }, [columns]);

  const startEditing = useCallback(
    (rowIndex: number) => {
      if (!ledgerColumnKey) return;
      const row = rows[rowIndex];
      if (!row) return;
      const currentLedger = readRowValue(row, ledgerColumnKey);
      const displayValue =
        typeof currentLedger === "string"
          ? currentLedger
          : currentLedger !== undefined && currentLedger !== null
            ? String(currentLedger)
            : "";
      setEditingRowIndex(rowIndex);
      setLedgerDraft(displayValue);
      setLedgerError(null);
      setIsLedgerDialogOpen(true);
    },
    [ledgerColumnKey, readRowValue, rows],
  );

  const startEntityEditing = useCallback(
    (rowIndex: number) => {
      if (!entityColumnKey) return;
      const row = rows[rowIndex];
      if (!row) return;

      if (typeof document !== "undefined" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => null);
        setIsFullscreen(false);
      }

      const currentEntity = readRowValue(row, entityColumnKey);
      const displayValue =
        typeof currentEntity === "string"
          ? currentEntity
          : currentEntity !== undefined && currentEntity !== null
            ? String(currentEntity)
            : "";
      const normalisedValue = displayValue === "-" ? "" : displayValue;
      setEditingEntityRowIndex(rowIndex);
      setEntitySearchTerm(normalisedValue);
      const matched = entities.find((entry) => entry.name.toLowerCase() === normalisedValue.toLowerCase());
      setSelectedEntityId(matched ? matched.id : null);
      setEntityType(matched?.type ?? "company");
      setEntityAliasesInput(matched?.aliases?.join(", ") ?? "");
      setEntityError(null);
      setIsEntityDialogOpen(true);
    },
    [entities, entityColumnKey, readRowValue, rows],
  );

  const handleLedgerSubmit = useCallback(() => {
    if (!ledgerDraft.trim()) {
      setLedgerError("Ledger value is required.");
      return;
    }
    setIsDecisionDialogOpen(true);
    setIsLedgerDialogOpen(false);
  }, [ledgerDraft]);

  const handleDecisionBack = useCallback(() => {
    setIsLedgerDialogOpen(true);
    setIsDecisionDialogOpen(false);
  }, []);

  const addNewMasterEntry = useCallback(
    (
      description: string,
      ledgerValue: string,
      debitAmount: number,
      creditAmount: number,
      source: "manual" | "fallback",
    ) => {
      const keywordBase = normaliseKeyword(description) || `custom-${Math.random().toString(36).slice(2, 8)}`;
      const id = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const transactionType: MasterKeyword["transactionType"] =
        creditAmount > 0 && debitAmount > 0
          ? "Both"
          : creditAmount > 0
            ? "Credit"
            : debitAmount > 0
              ? "Debit"
              : "Both";
      const entry: MasterKeyword = {
        id,
        keyword: keywordBase,
        transactionType,
        ledger: ledgerValue,
        particulars: ledgerValue,
        preferences:
          source === "fallback"
            ? "Generated automatically from ledger edit"
            : "Added from statement dashboard",
      };
      setMasters((prev) => [entry, ...prev]);
      setModifiedMasterIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      return entry;
    },
    [],
  );

  const finalizeLedgerUpdate = useCallback(
    (mode: "update" | "add") => {
      if (editingRowIndex === null || !ledgerColumnKey) {
        setIsDecisionDialogOpen(false);
        return;
      }
      const trimmedLedger = ledgerDraft.trim();
      const row = rows[editingRowIndex];
      if (!row) {
        setIsDecisionDialogOpen(false);
        return;
      }

      const rawDescription =
        (readRowValue(row, "Description") ??
          readRowValue(row, "Particulars") ??
          readRowValue(row, "Narration") ??
          readRowValue(row, "description") ??
          "") as string | undefined;
      const description = rawDescription && rawDescription.trim().length > 0 ? rawDescription.trim() : "selected transaction";
      const truncatedDescription =
        description !== "selected transaction" && description.length > 80 ? `${description.slice(0, 77)}…` : description;
      const debitAmount = parseAmount(readRowValue(row, "Debit"));
      const creditAmount = parseAmount(readRowValue(row, "Credit"));

      setRows((prev) => prev.map((entry, index) => (index === editingRowIndex ? { ...entry, [ledgerColumnKey]: trimmedLedger } : entry)));
      setModifiedRowIndexes((prev) => {
        const next = new Set(prev);
        next.add(editingRowIndex);
        return next;
      });

      let masterMessage = "";
      if (mode === "update") {
        const normalized = normaliseKeyword(description);
        const matchIndex = masters.findIndex((entry) => normalized.includes(entry.keyword));
        if (matchIndex !== -1) {
          const current = masters[matchIndex];
          const updated: MasterKeyword = { ...current, ledger: trimmedLedger };
          setMasters((prev) => prev.map((entry, index) => (index === matchIndex ? updated : entry)));
          setModifiedMasterIds((prev) => {
            const next = new Set(prev);
            next.add(updated.id);
            return next;
          });
          masterMessage = `Updated master keyword “${updated.keyword}”.`;
        } else {
          const created = addNewMasterEntry(description, trimmedLedger, debitAmount, creditAmount, "fallback");
          masterMessage = `No existing master matched. Created “${created.keyword}”.`;
        }
      } else {
        const created = addNewMasterEntry(description, trimmedLedger, debitAmount, creditAmount, "manual");
        masterMessage = `Added new master keyword “${created.keyword}”.`;
      }

      toast({
        title: "Ledger classification saved",
        description: `Assigned “${trimmedLedger}” to ${
          truncatedDescription === "selected transaction" ? "the selected transaction" : `“${truncatedDescription}”`
        }. ${masterMessage}`,
      });

      setIsDecisionDialogOpen(false);
    },
    [addNewMasterEntry, editingRowIndex, ledgerColumnKey, ledgerDraft, masters, readRowValue, rows, toast],
  );

  const editingRow = editingRowIndex !== null ? rows[editingRowIndex] ?? null : null;
  const editingDescription = editingRow
    ? readRowValue(editingRow, "Description") ?? readRowValue(editingRow, "Particulars") ?? ""
    : "";

  const editingEntityRow = editingEntityRowIndex !== null ? rows[editingEntityRowIndex] ?? null : null;
  const editingEntityDescription = editingEntityRow
    ? (readRowValue(editingEntityRow, "Description") ?? readRowValue(editingEntityRow, "Particulars") ?? "")
    : "";

  const applyEntityToRow = useCallback(
    (rowIndex: number, entityName: string) => {
      if (!entityColumnKey) return;
      setRows((prev) =>
        prev.map((entry, index) =>
          index === rowIndex
            ? {
                ...entry,
                [entityColumnKey]: entityName,
                ...(entitySourceColumnKey ? { [entitySourceColumnKey]: entityName ? "User Defined" : entry[entitySourceColumnKey] } : {}),
              }
            : entry,
        ),
      );
      setModifiedEntityIndexes((prev) => {
        const next = new Set(prev);
        next.add(rowIndex);
        return next;
      });
    },
    [entityColumnKey, entitySourceColumnKey],
  );

  const handleAssignExistingEntity = useCallback(() => {
    if (editingEntityRowIndex === null || !entityColumnKey) {
      setEntityError("Select a transaction to update.");
      return;
    }
    if (!selectedEntityId) {
      setEntityError("Choose a master entity from the list.");
      return;
    }
    const selected = entities.find((entry) => entry.id === selectedEntityId);
    if (!selected) {
      setEntityError("Selected entity is no longer available.");
      return;
    }

    applyEntityToRow(editingEntityRowIndex, selected.name);

    const truncatedDescription =
      editingEntityDescription && editingEntityDescription.length > 80
        ? `${editingEntityDescription.slice(0, 77)}…`
        : editingEntityDescription;

    toast({
      title: "Entity linked",
      description:
        truncatedDescription && truncatedDescription.length > 0
          ? `Assigned “${selected.name}” to “${truncatedDescription}”.`
          : `Assigned “${selected.name}” to the selected transaction.`,
    });

    setIsEntityDialogOpen(false);
  }, [applyEntityToRow, editingEntityDescription, editingEntityRowIndex, entities, entityColumnKey, selectedEntityId, toast]);

  const handleCreateEntity = useCallback(async () => {
    if (editingEntityRowIndex === null || !entityColumnKey) {
      setEntityError("Select a transaction to update.");
      return;
    }
    const name = entitySearchTerm.trim();
    if (!name) {
      setEntityError("Entity name is required.");
      return;
    }

    const aliases = entityAliasesInput
      .split(",")
      .map((alias) => alias.trim())
      .filter((alias) => alias.length > 0);

    setEntityError(null);
    setIsSavingEntity(true);
    try {
      const response = await fetch("/api/ai/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: entityType,
          aliases,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        const message = payload?.detail || payload?.error || "Failed to create entity";
        throw new Error(message);
      }

      setEntities((prev) => [payload, ...prev]);
      window.dispatchEvent(new CustomEvent("entitiesUpdated"));

      applyEntityToRow(editingEntityRowIndex, payload.name);

      const truncatedDescription =
        editingEntityDescription && editingEntityDescription.length > 80
          ? `${editingEntityDescription.slice(0, 77)}…`
          : editingEntityDescription;

      toast({
        title: "Entity created",
        description:
          truncatedDescription && truncatedDescription.length > 0
            ? `Added “${payload.name}” and linked it to “${truncatedDescription}”.`
            : `Added “${payload.name}” and linked it to the selected transaction.`,
      });

      setIsEntityDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error while creating entity";
      toast({ title: "Entity update failed", description: message, variant: "destructive" });
    } finally {
      setIsSavingEntity(false);
    }
  }, [applyEntityToRow, editingEntityDescription, editingEntityRowIndex, entityAliasesInput, entityColumnKey, entitySearchTerm, entityType, toast]);

  const filteredEntities = useMemo(() => {
    const query = entitySearchTerm.trim().toLowerCase();
    if (!query) {
      return entities;
    }
    return entities.filter((entity) => {
      const nameMatch = entity.name.toLowerCase().includes(query);
      const aliasesMatch = Array.isArray(entity.aliases)
        ? entity.aliases.some((alias: string) => alias.toLowerCase().includes(query))
        : false;
      return nameMatch || aliasesMatch;
    });
  }, [entities, entitySearchTerm]);

  const showEntityActions = useMemo(() => {
    if (!entityColumnKey) {
      return false;
    }
    return rows.some((row) => {
      const entityValueRaw = readRowValue(row, entityColumnKey) ?? row["Entity"] ?? row["entity"];
      const entityValue =
        typeof entityValueRaw === "string"
          ? entityValueRaw
          : entityValueRaw !== undefined && entityValueRaw !== null
            ? String(entityValueRaw)
            : "";
      const hasEntity = entityValue && entityValue !== "-";
      if (!hasEntity) {
        return true;
      }
      if (!Array.isArray(entities)) {
        return false;
      }
      return entities.some((entry) => entry.name === entityValue);
    });
  }, [entities, entityColumnKey, readRowValue, rows]);

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

  useEffect(() => {
    setRows(initialRows.map((row) => ({ ...row })));
    setModifiedRowIndexes(new Set());
    setModifiedEntityIndexes(new Set());
    setMasters(masterKeywords.map((entry) => ({ ...entry })));
    setEditingRowIndex(null);
    setLedgerDraft("");
    setLedgerError(null);
    setIsLedgerDialogOpen(false);
    setIsDecisionDialogOpen(false);
    setModifiedMasterIds(new Set());
    setEditingEntityRowIndex(null);
    setIsEntityDialogOpen(false);
    setEntitySearchTerm("");
    setSelectedEntityId(null);
    setEntityAliasesInput("");
    setEntityError(null);
    setIsSavingEntity(false);
  }, [initialRows]);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }),
    [],
  );

  const resetEditingState = useCallback(() => {
    setEditingRowIndex(null);
    setLedgerDraft("");
    setLedgerError(null);
  }, []);

  useEffect(() => {
    if (!isLedgerDialogOpen && !isDecisionDialogOpen) {
      resetEditingState();
    }
  }, [isDecisionDialogOpen, isLedgerDialogOpen, resetEditingState]);

  const resetEntityEditingState = useCallback(() => {
    setEditingEntityRowIndex(null);
    setEntitySearchTerm("");
    setSelectedEntityId(null);
    setEntityAliasesInput("");
    setEntityError(null);
  }, []);

  useEffect(() => {
    if (!isEntityDialogOpen) {
      resetEntityEditingState();
    }
  }, [isEntityDialogOpen, resetEntityEditingState]);

  const stats = useMemo(
    () => ({ rowCount: rows.length, columnCount: columns.length }),
    [columns.length, rows.length],
  );

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

      {entityColumnKey ? (
        <div className="flex flex-col gap-1 rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
          <div>
            Entity column detected: <span className="font-semibold text-foreground">{entityColumnKey}</span>. Link transactions to
            master entities or create a new record without leaving this view.
          </div>
          {modifiedEntityIndexes.size > 0 ? (
            <div className="text-muted-foreground/80">
              {modifiedEntityIndexes.size} entity {modifiedEntityIndexes.size === 1 ? "assignment" : "assignments"} in this
              session.
            </div>
          ) : null}
        </div>
      ) : null}

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
                  {showEntityActions ? (
                    <th className="sticky right-0 z-10 border-b border-l border-border bg-muted/95 px-4 py-2.5 text-right text-xs font-semibold">
                      Actions
                    </th>
                  ) : null}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {rows.map((row, rowIndex) => {
                  const entityValueRaw = entityColumnKey ? readRowValue(row, entityColumnKey) : row["Entity"] || row["entity"];
                  const entityValue =
                    typeof entityValueRaw === "string"
                      ? entityValueRaw
                      : entityValueRaw !== undefined && entityValueRaw !== null
                        ? String(entityValueRaw)
                        : "";
                  const hasEntity = entityValue && entityValue !== "-";
                  const matchedEntity =
                    hasEntity && Array.isArray(entities)
                      ? entities.find((entry) => entry.name === entityValue)
                      : null;
                  const allowEntityEditing = Boolean(entityColumnKey) && (!hasEntity || matchedEntity);

                  return (
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
                        const normalizedCol = col.toLowerCase().trim();
                        const isEntityCell = entityColumnKey ? entityColumnKey === col : normalizedCol === "entity";
                        const isEntitySourceCell = entitySourceColumnKey ? entitySourceColumnKey === col : normalizedCol.includes("entity source");
                        const isDescCol = isDescriptionColumn(col);
                        const isEntityInteractiveCell = isEntityCell && !isEntitySourceCell && allowEntityEditing;
                        const isEntityModified = isEntityCell && modifiedEntityIndexes.has(rowIndex);

                        const color = matchedEntity && (isEntityCell || (isDescCol && hasEntity)) ? getEntityColor(matchedEntity.name) : null;
                        const emoji = matchedEntity ? (ENTITY_EMOJIS[matchedEntity.type] || "🎯") : null;

                        const cellContent = color
                          ? (
                              <span
                                className={cn(
                                  "font-semibold",
                                  isEntityCell ? "inline-flex items-center gap-1.5" : undefined,
                                  color.text,
                                )}
                              >
                                {isEntityCell ? <span className="text-base">{emoji}</span> : null}
                                {formatCellValue(cellValue, col)}
                              </span>
                            )
                          : (
                              <span className={isNumericColumn(col) && cellValue ? "font-medium" : ""}>
                                {formatCellValue(cellValue, col)}
                              </span>
                            );

                        const handleEntityCellClick = () => {
                          if (isEntityInteractiveCell) {
                            startEntityEditing(rowIndex);
                          }
                        };

                        const handleEntityCellKeyDown = (event: KeyboardEvent<HTMLTableCellElement>) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleEntityCellClick();
                          }
                        };

                        return (
                          <td
                            key={`${rowIndex}-${col}`}
                            className={cn(
                              "px-4 py-2.5 overflow-hidden transition-colors",
                              isNumericColumn(col) ? "text-right font-mono" : "text-left",
                              color ? color.bg : "",
                              isEntityInteractiveCell &&
                                "group/editable cursor-pointer font-medium focus-visible:outline focus-visible:outline-primary/40",
                              isEntityInteractiveCell && !isEntityModified && "hover:bg-primary/5",
                              isEntityModified && isEntityCell && "bg-primary/10",
                            )}
                            style={{
                              width: `${columnWidths[col] || 120}px`,
                              wordBreak: isDescCol ? 'break-word' : 'normal',
                              overflowWrap: isDescCol ? 'anywhere' : 'normal',
                            }}
                            role={isEntityInteractiveCell ? "button" : undefined}
                            tabIndex={isEntityInteractiveCell ? 0 : undefined}
                            title={isEntityInteractiveCell ? "Edit entity assignment" : undefined}
                            onClick={isEntityInteractiveCell ? handleEntityCellClick : undefined}
                            onKeyDown={isEntityInteractiveCell ? handleEntityCellKeyDown : undefined}
                          >
                            <div
                              className={cn(
                                isDescCol ? undefined : "truncate",
                                isEntityInteractiveCell && "flex items-center justify-between gap-2",
                              )}
                            >
                              <span className={cn(isEntityInteractiveCell ? "truncate" : undefined)}>{cellContent}</span>
                              {isEntityInteractiveCell ? (
                                <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground opacity-0 transition-opacity group-hover/editable:opacity-100 group-focus-within/editable:opacity-100">
                                  {isEntityModified ? (
                                    <Badge variant="secondary" className="px-1.5 py-0">
                                      Edited
                                    </Badge>
                                  ) : null}
                                  <Pencil className="size-3 text-muted-foreground/60" />
                                </span>
                              ) : null}
                            </div>
                          </td>
                        );
                      })}
                      {showEntityActions ? (
                        <td className="sticky right-0 z-10 border-l border-border bg-background px-4 py-2.5 text-right">
                          {allowEntityEditing ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => startEntityEditing(rowIndex)}
                            >
                              <Pencil className="size-3 text-muted-foreground" /> Edit entity
                            </Button>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
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

      <Dialog open={isLedgerDialogOpen} onOpenChange={setIsLedgerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit ledger classification</DialogTitle>
            <DialogDescription>
              Choose the ledger name that should apply to this transaction before saving it to masters.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ledger_value">Ledger</Label>
              <Input
                id="ledger_value"
                value={ledgerDraft}
                onChange={(event) => {
                  setLedgerDraft(event.target.value);
                  if (ledgerError) {
                    setLedgerError(null);
                  }
                }}
                placeholder="e.g. Creditor"
              />
              {ledgerError ? <p className="text-xs text-destructive">{ledgerError}</p> : null}
            </div>
            {editingRow ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Transaction context</p>
                <p className="mt-1 text-sm text-foreground">
                  {editingDescription && typeof editingDescription === "string"
                    ? editingDescription
                    : "Unnamed transaction"}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground/80">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide">Debit</p>
                    <p className="text-sm text-foreground">
                      {currencyFormatter.format(parseAmount(readRowValue(editingRow, "Debit")))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide">Credit</p>
                    <p className="text-sm text-foreground">
                      {currencyFormatter.format(parseAmount(readRowValue(editingRow, "Credit")))}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsLedgerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLedgerSubmit}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDecisionDialogOpen} onOpenChange={setIsDecisionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>How should this ledger change apply?</AlertDialogTitle>
            <AlertDialogDescription>
              {ledgerDraft ? (
                <>
                  Apply <span className="font-medium text-foreground">“{ledgerDraft.trim()}”</span> to {""}
                  {editingDescription ? `“${editingDescription}”` : "the selected transaction"}. Decide whether to update an
                  existing master keyword or create a new entry.
                </>
              ) : (
                "Decide whether to update an existing master keyword or create a new entry."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <Button variant="outline" onClick={handleDecisionBack}>
              Back to edit
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" onClick={() => finalizeLedgerUpdate("update")}>
                Update master
              </Button>
              <Button onClick={() => finalizeLedgerUpdate("add")}>
                Add new entry
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEntityDialogOpen} onOpenChange={setIsEntityDialogOpen}>
        <DialogContent className="sm:max-w-[620px] overflow-hidden border-border/60">
          <DialogHeader>
            <DialogTitle>Update entity assignment</DialogTitle>
            <DialogDescription>
              Link this transaction to an existing master entity or create a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-[minmax(0,0.58fr)_minmax(0,0.42fr)] md:gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="entity_search">Search or create</Label>
                <Input
                  id="entity_search"
                  value={entitySearchTerm}
                  onChange={(event) => {
                    setEntitySearchTerm(event.target.value);
                    setEntityError(null);
                  }}
                  placeholder="e.g. Alpha Corp"
                  autoFocus
                />
                {entityError ? <p className="text-xs text-destructive">{entityError}</p> : null}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">Matches in master entities</p>
                <ScrollArea className="max-h-56 rounded-md border border-border/60 bg-muted/10">
                  <div className="space-y-2 p-1.5">
                    {filteredEntities.length > 0 ? (
                      filteredEntities.map((entity) => (
                        <button
                          key={entity.id}
                          type="button"
                          onClick={() => {
                            setSelectedEntityId(entity.id);
                            setEntitySearchTerm(entity.name);
                            setEntityType(entity.type ?? "company");
                            setEntityAliasesInput(Array.isArray(entity.aliases) ? entity.aliases.join(", ") : "");
                            setEntityError(null);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            selectedEntityId === entity.id
                              ? "bg-primary/10 text-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-background",
                          )}
                        >
                          <span className="flex flex-col">
                            <span className="font-medium text-foreground">{entity.name}</span>
                            <span className="text-xs text-muted-foreground/80">
                              {entity.type}
                              {entity.aliases && entity.aliases.length > 0
                                ? ` • ${entity.aliases.slice(0, 2).join(", ")}${entity.aliases.length > 2 ? "…" : ""}`
                                : ""}
                            </span>
                          </span>
                          {selectedEntityId === entity.id ? (
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase tracking-wide">
                              Selected
                            </Badge>
                          ) : null}
                        </button>
                      ))
                    ) : (
                      <div className="rounded-md bg-background/70 px-3 py-4 text-center text-xs text-muted-foreground">
                        No matching entities. Populate the fields on the right to add a new record.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="entity_type">Entity type</Label>
                <Select value={entityType} onValueChange={(value) => setEntityType(value)}>
                  <SelectTrigger id="entity_type" className="bg-background">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="person">Person</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="entity_aliases">Aliases (optional)</Label>
                <Input
                  id="entity_aliases"
                  value={entityAliasesInput}
                  onChange={(event) => setEntityAliasesInput(event.target.value)}
                  placeholder="Comma separated keywords"
                />
              </div>

              {editingEntityRow ? (
                <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Transaction context</p>
                  <p className="mt-1 line-clamp-6 text-sm text-foreground">
                    {editingEntityDescription && typeof editingEntityDescription === "string"
                      ? editingEntityDescription
                      : "Unnamed transaction"}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEntityDialogOpen(false)}>
              Cancel
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" onClick={handleAssignExistingEntity} disabled={!selectedEntityId}>
                Link existing
              </Button>
              <Button onClick={handleCreateEntity} disabled={isSavingEntity || !entitySearchTerm.trim()}>
                {isSavingEntity ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Create & link
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
