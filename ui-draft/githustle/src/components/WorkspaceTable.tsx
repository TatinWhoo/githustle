import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash,
  DownloadSimple,
  PencilSimple,
  DotsThreeVertical,
  DotsSixVertical,
  ArrowSquareOut,
  Columns,
  Table,
  Check,
  Calendar,
  LinkSimple,
  Coins,
  Tag,
  ToggleLeft,
  TextT,
  Hash
} from '@phosphor-icons/react';

export type CellType = 'text' | 'status' | 'priority' | 'currency' | 'date' | 'url' | 'number';

export interface ColumnDef {
  id: string;
  header: string;
  type: CellType;
  width: number;  // in pixels
}

export interface TableRow {
  id: string;
  cells: Record<string, string>;  // columnId -> cellValue
}

export interface GHTableData {
  id: string;
  name: string;
  columns: ColumnDef[];
  rows: TableRow[];
  createdAt: string;
  createdBy: 'client' | 'freelancer';
}

export interface WorkspaceTableProps {
  table: GHTableData;
  onUpdate: (updated: GHTableData) => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  showToast: (msg: string) => void;
  isReadOnly?: boolean;
}

export const STATUS_OPTIONS = [
  { label: 'To Do',       value: 'todo',        bg: 'bg-slate-100',     text: 'text-slate-700', border: 'border-slate-300' },
  { label: 'In Progress', value: 'in-progress',  bg: 'bg-blue-50',      text: 'text-blue-700',  border: 'border-blue-300' },
  { label: 'In Review',   value: 'in-review',    bg: 'bg-amber-50',     text: 'text-amber-700', border: 'border-amber-300' },
  { label: 'Done',        value: 'done',         bg: 'bg-emerald-50',    text: 'text-emerald-700', border: 'border-emerald-300' },
  { label: 'Blocked',     value: 'blocked',      bg: 'bg-rose-50',       text: 'text-rose-700',  border: 'border-rose-300' }
];

export const PRIORITY_OPTIONS = [
  { label: 'Critical', value: 'critical', dot: 'bg-red-600', text: 'text-red-700' },
  { label: 'High',     value: 'high',     dot: 'bg-amber-500', text: 'text-amber-700' },
  { label: 'Medium',   value: 'medium',   dot: 'bg-blue-500', text: 'text-blue-700' },
  { label: 'Low',      value: 'low',      dot: 'bg-slate-400', text: 'text-slate-600' }
];

export default function WorkspaceTable({
  table,
  onUpdate,
  onDelete,
  onRename,
  showToast,
  isReadOnly = false
}: WorkspaceTableProps) {
  // Local state for active editing cell to prevent lag
  const [activeCell, setActiveCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [cellEditValue, setCellEditValue] = useState('');
  
  // Column resizing state
  const resizingRef = useRef<{ colId: string; startX: number; startWidth: number } | null>(null);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  // Row Drag-to-Reorder state
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);

  // Modals / Dropdowns state
  const [isNewColModalOpen, setIsNewColModalOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<CellType>('text');

  const [activeMenuColId, setActiveMenuColId] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const [isRenamingTable, setIsRenamingTable] = useState(false);
  const [tableNameInput, setTableNameInput] = useState(table.name);

  // Initialize column widths
  useEffect(() => {
    const widths: Record<string, number> = {};
    table.columns.forEach(col => {
      widths[col.id] = col.width || 150;
    });
    setColWidths(widths);
  }, [table.columns]);

  // Handle column resize drag movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { colId, startX, startWidth } = resizingRef.current;
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(80, startWidth + deltaX);
      setColWidths(prev => ({ ...prev, [colId]: newWidth }));
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        const { colId } = resizingRef.current;
        const finalWidth = colWidths[colId] || 150;
        const updatedColumns = table.columns.map(col =>
          col.id === colId ? { ...col, width: finalWidth } : col
        );
        onUpdate({ ...table, columns: updatedColumns });
        resizingRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [colWidths, table, onUpdate]);

  // PHP currency formatter
  const formatPHP = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    if (isNaN(num)) return '';
    return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Convert date format "YYYY-MM-DD" -> "MMM DD, YYYY"
  const formatDateString = (val: string) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return val;
    }
  };

  // Column operations
  const handleAddColumnSubmit = () => {
    if (!newColName.trim()) {
      showToast('Column name is required.');
      return;
    }
    const newColId = `col_${Date.now()}`;
    const newCol: ColumnDef = {
      id: newColId,
      header: newColName.trim(),
      type: newColType,
      width: 150
    };
    const updatedColumns = [...table.columns, newCol];
    
    // Seed empty cell values for existing rows
    const updatedRows = table.rows.map(row => ({
      ...row,
      cells: { ...row.cells, [newColId]: '' }
    }));

    onUpdate({
      ...table,
      columns: updatedColumns,
      rows: updatedRows
    });

    setIsNewColModalOpen(false);
    setNewColName('');
    showToast(`Column "${newCol.header}" added successfully.`);
  };

  const handleDeleteColumn = (colId: string) => {
    const colName = table.columns.find(c => c.id === colId)?.header || '';
    const updatedColumns = table.columns.filter(c => c.id !== colId);
    const updatedRows = table.rows.map(row => {
      const nextCells = { ...row.cells };
      delete nextCells[colId];
      return { ...row, cells: nextCells };
    });

    onUpdate({
      ...table,
      columns: updatedColumns,
      rows: updatedRows
    });
    setActiveMenuColId(null);
    showToast(`Column "${colName}" removed.`);
  };

  const handleRenameColumn = (colId: string, currentHeader: string) => {
    const newHeader = window.prompt('Enter new column header:', currentHeader);
    if (!newHeader || !newHeader.trim() || newHeader.trim() === currentHeader) return;
    const updatedColumns = table.columns.map(c =>
      c.id === colId ? { ...c, header: newHeader.trim() } : c
    );
    onUpdate({ ...table, columns: updatedColumns });
    setActiveMenuColId(null);
    showToast(`Column renamed to "${newHeader.trim()}".`);
  };

  const handleChangeColumnType = (colId: string, newType: CellType) => {
    const updatedColumns = table.columns.map(col =>
      col.id === colId ? { ...col, type: newType } : col
    );
    onUpdate({ ...table, columns: updatedColumns });
    setActiveMenuColId(null);
    showToast(`Column type changed to ${newType}.`);
  };

  // Row operations
  const handleAddRow = () => {
    if (isReadOnly) return;
    const newRowId = `row_${Date.now()}`;
    const emptyCells: Record<string, string> = {};
    table.columns.forEach(col => {
      emptyCells[col.id] = col.type === 'status' ? 'todo' : col.type === 'priority' ? 'medium' : '';
    });

    const newRow: TableRow = { id: newRowId, cells: emptyCells };
    const updatedRows = [...table.rows, newRow];

    onUpdate({ ...table, rows: updatedRows });
    showToast('Row added.');
  };

  const handleDeleteRow = (rowId: string) => {
    if (isReadOnly) return;
    const updatedRows = table.rows.filter(r => r.id !== rowId);
    onUpdate({ ...table, rows: updatedRows });
    showToast('Row deleted.');
  };

  const handleCellBlur = (rowId: string, colId: string) => {
    const updatedRows = table.rows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          cells: { ...row.cells, [colId]: cellEditValue }
        };
      }
      return row;
    });
    onUpdate({ ...table, rows: updatedRows });
    setActiveCell(null);
  };

  const handleCellSelectChange = (rowId: string, colId: string, value: string) => {
    const updatedRows = table.rows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          cells: { ...row.cells, [colId]: value }
        };
      }
      return row;
    });
    onUpdate({ ...table, rows: updatedRows });
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = table.columns.map(c => `"${c.header}"`).join(',');
    const rows = table.rows.map(row =>
      table.columns.map(c => {
        let val = row.cells[c.id] || '';
        if (c.type === 'currency') {
          val = formatPHP(val);
        }
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${table.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV export downloaded.');
  };

  // Row Drag Handlers
  const handleDragStart = (index: number) => {
    if (isReadOnly) return;
    setDraggedRowIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (isReadOnly) return;
    e.preventDefault();
    setDragOverRowIndex(index);
  };

  const handleDrop = () => {
    if (isReadOnly || draggedRowIndex === null || dragOverRowIndex === null) return;
    const reorderedRows = [...table.rows];
    const [removed] = reorderedRows.splice(draggedRowIndex, 1);
    reorderedRows.splice(dragOverRowIndex, 0, removed);

    onUpdate({ ...table, rows: reorderedRows });
    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
    showToast('Row order rearranged.');
  };

  // Rename table submit
  const handleRenameTableSubmit = () => {
    if (!tableNameInput.trim()) {
      showToast('Table name is required.');
      return;
    }
    onRename(tableNameInput.trim());
    setIsRenamingTable(false);
    showToast('Table renamed successfully.');
  };

  // Delete Table Standardized Confirm action
  const confirmDeleteTable = () => {
    if (deleteInput !== 'DELETE') {
      showToast('Verification keyword incorrect.');
      return;
    }
    onDelete();
    setIsConfirmingDelete(false);
    setDeleteInput('');
  };

  const getColIcon = (type: CellType) => {
    switch (type) {
      case 'text': return <TextT size={12} className="text-slate-500" />;
      case 'status': return <ToggleLeft size={12} className="text-teal-600" />;
      case 'priority': return <Tag size={12} className="text-amber-600" />;
      case 'currency': return <Coins size={12} className="text-emerald-600" />;
      case 'date': return <Calendar size={12} className="text-blue-600" />;
      case 'url': return <LinkSimple size={12} className="text-violet-600" />;
      case 'number': return <Hash size={12} className="text-slate-600" />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-2xl border border-border overflow-hidden select-none relative">
      
      {/* Table Toolbar Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-border shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isRenamingTable ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={tableNameInput}
                onChange={(e) => setTableNameInput(e.target.value)}
                className="px-2.5 py-1 text-[11px] font-sans font-bold border border-gh-teal bg-white rounded-lg focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleRenameTableSubmit}
                className="px-2.5 py-1 bg-gh-teal hover:bg-gh-teal-hover text-white text-[10px] font-bold rounded-lg transition"
              >
                SAVE
              </button>
              <button
                onClick={() => setIsRenamingTable(false)}
                className="px-2 py-1 text-text-secondary hover:bg-slate-100 text-[10px] font-bold rounded-lg"
              >
                CANCEL
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Table size={16} className="text-gh-teal" weight="bold" />
              <h2 className="text-xs font-sans font-bold text-text-primary uppercase tracking-wider">{table.name}</h2>
              {!isReadOnly && (
                <button
                  onClick={() => {
                    setTableNameInput(table.name);
                    setIsRenamingTable(true);
                  }}
                  className="p-1 hover:bg-slate-100 border border-transparent rounded-lg transition text-text-muted"
                  title="Rename Table"
                >
                  <PencilSimple size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-1.5">
          {!isReadOnly && (
            <>
              <button
                onClick={handleAddRow}
                className="px-2.5 py-1.5 bg-gh-teal-light hover:bg-gh-teal hover:text-white text-gh-teal text-[10px] font-mono font-bold rounded-lg border border-gh-teal/10 transition flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Plus size={11} weight="bold" />
                <span>+ ADD ROW</span>
              </button>

              <button
                onClick={() => setIsNewColModalOpen(true)}
                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-[10px] font-mono font-bold rounded-lg border border-blue-200 transition flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Columns size={11} weight="bold" />
                <span>+ ADD COLUMN</span>
              </button>
            </>
          )}

          <div className="h-4 w-[1px] bg-border mx-1" />

          <button
            onClick={handleExportCSV}
            className="p-1.5 hover:bg-slate-100 text-text-primary border border-border bg-white rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm text-[10px] font-bold"
            title="Export data as CSV file"
          >
            <DownloadSimple size={12} weight="bold" />
            <span>EXPORT</span>
          </button>

          {!isReadOnly && (
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="p-1.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 border border-red-100 rounded-lg transition flex items-center cursor-pointer shadow-sm"
              title="Delete entire table"
            >
              <Trash size={12} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table Grid Viewport */}
      <div className="flex-grow overflow-auto min-h-[220px]">
        {table.rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <Table size={36} className="text-slate-200 mb-2" weight="thin" />
            <h3 className="text-xs font-sans font-bold text-text-primary">Blank Workspace Table</h3>
            <p className="text-[10px] text-text-muted mt-1 max-w-[200px] leading-relaxed">Click "+ ADD ROW" to populate interactive metrics and tracks.</p>
            {!isReadOnly && (
              <button
                onClick={handleAddRow}
                className="mt-4 px-4 py-1.5 bg-gh-teal hover:bg-gh-teal-hover text-white text-[10px] font-bold rounded-xl transition cursor-pointer"
              >
                Add First Row
              </button>
            )}
          </div>
        ) : (
          <table className="w-full border-collapse text-left relative table-fixed">
            <thead>
              <tr className="sticky top-0 z-20 shadow-sm">
                {/* Drag Handle Dummy Th */}
                <th className="w-8 !p-0 text-center sticky left-0 z-30 bg-slate-50 border-r border-border" />

                {table.columns.map((col, index) => {
                  const isFirstCol = index === 0;
                  const width = colWidths[col.id] || col.width || 150;

                  return (
                    <th
                      key={col.id}
                      style={{
                        width: `${width}px`,
                        left: isFirstCol ? '32px' : undefined
                      }}
                      className={`relative select-none text-[10px] font-bold text-text-muted bg-slate-50 border-r border-border py-2 px-3 ${
                        isFirstCol ? 'sticky left-[32px] z-30 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <div className="flex items-center gap-1.5 truncate">
                          {getColIcon(col.type)}
                          <span className="truncate text-[10px] text-text-primary font-sans font-black">{col.header}</span>
                        </div>

                        {/* Column menu */}
                        {!isReadOnly && (
                          <div className="relative shrink-0">
                            <button
                              onClick={() => setActiveMenuColId(activeMenuColId === col.id ? null : col.id)}
                              className="p-0.5 text-text-muted hover:text-text-primary hover:bg-slate-200 rounded transition"
                            >
                              <DotsThreeVertical size={11} weight="bold" />
                            </button>

                            {/* Column action dropdown */}
                            {activeMenuColId === col.id && (
                              <div className="absolute right-0 mt-1 w-32 bg-white border border-border rounded-xl shadow-elevated py-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-[10px]">
                                <p className="px-2 py-1 font-bold text-text-muted border-b border-border">COLUMN TYPE</p>
                                <button
                                  onClick={() => handleChangeColumnType(col.id, 'text')}
                                  className={`w-full px-2 py-1 text-left hover:bg-slate-50 flex items-center gap-1 ${col.type === 'text' ? 'font-bold text-gh-teal' : ''}`}
                                >
                                  <TextT size={10} /> <span>Text</span>
                                </button>
                                <button
                                  onClick={() => handleChangeColumnType(col.id, 'status')}
                                  className={`w-full px-2 py-1 text-left hover:bg-slate-50 flex items-center gap-1 ${col.type === 'status' ? 'font-bold text-gh-teal' : ''}`}
                                >
                                  <ToggleLeft size={10} /> <span>Status</span>
                                </button>
                                <button
                                  onClick={() => handleChangeColumnType(col.id, 'priority')}
                                  className={`w-full px-2 py-1 text-left hover:bg-slate-50 flex items-center gap-1 ${col.type === 'priority' ? 'font-bold text-gh-teal' : ''}`}
                                >
                                  <Tag size={10} /> <span>Priority</span>
                                </button>
                                <button
                                  onClick={() => handleChangeColumnType(col.id, 'currency')}
                                  className={`w-full px-2 py-1 text-left hover:bg-slate-50 flex items-center gap-1 ${col.type === 'currency' ? 'font-bold text-gh-teal' : ''}`}
                                >
                                  <Coins size={10} /> <span>Currency (₱)</span>
                                </button>
                                <button
                                  onClick={() => handleChangeColumnType(col.id, 'date')}
                                  className={`w-full px-2 py-1 text-left hover:bg-slate-50 flex items-center gap-1 ${col.type === 'date' ? 'font-bold text-gh-teal' : ''}`}
                                >
                                  <Calendar size={10} /> <span>Date</span>
                                </button>
                                <button
                                  onClick={() => handleChangeColumnType(col.id, 'url')}
                                  className={`w-full px-2 py-1 text-left hover:bg-slate-50 flex items-center gap-1 ${col.type === 'url' ? 'font-bold text-gh-teal' : ''}`}
                                >
                                  <LinkSimple size={10} /> <span>URL Link</span>
                                </button>
                                <button
                                  onClick={() => handleChangeColumnType(col.id, 'number')}
                                  className={`w-full px-2 py-1 text-left hover:bg-slate-50 flex items-center gap-1 ${col.type === 'number' ? 'font-bold text-gh-teal' : ''}`}
                                >
                                  <Hash size={10} /> <span>Number</span>
                                </button>

                                <div className="border-t border-border mt-1 pt-1" />
                                <button
                                  onClick={() => handleRenameColumn(col.id, col.header)}
                                  className="w-full px-2 py-1 text-left hover:bg-slate-50 text-text-primary flex items-center gap-1"
                                >
                                  <PencilSimple size={10} /> <span>Rename Header</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteColumn(col.id)}
                                  className="w-full px-2 py-1 text-left hover:bg-red-50 text-red-600 flex items-center gap-1"
                                >
                                  <Trash size={10} /> <span>Delete Column</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Resize Handle line trigger */}
                      {!isReadOnly && (
                        <div
                          onMouseDown={(e) => {
                            e.preventDefault();
                            resizingRef.current = { colId: col.id, startX: e.clientX, startWidth: width };
                          }}
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-gh-teal/40 transition z-10"
                        />
                      )}
                    </th>
                  );
                })}

                {/* Delete row dummy Th */}
                {!isReadOnly && <th className="w-12 bg-slate-50 border-b border-border" />}
              </tr>
            </thead>

            <tbody>
              {table.rows.map((row, rowIndex) => {
                const isOver = index => index === dragOverRowIndex;
                const isDragging = index => index === draggedRowIndex;

                return (
                  <tr
                    key={row.id}
                    draggable={!isReadOnly}
                    onDragStart={() => handleDragStart(rowIndex)}
                    onDragOver={(e) => handleDragOver(e, rowIndex)}
                    onDrop={handleDrop}
                    className={`h-9 hover:bg-slate-50/50 transition-colors border-b border-border/40 ${
                      isDragging(rowIndex) ? 'opacity-40 bg-slate-100' : ''
                    } ${isOver(rowIndex) ? 'border-t-2 border-t-gh-teal' : ''}`}
                  >
                    {/* Drag Handle cell */}
                    <td className="sticky left-0 bg-white z-10 text-center p-0 w-8 border-r border-border shrink-0">
                      {!isReadOnly ? (
                        <div className="flex items-center justify-center h-full w-full cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                          <DotsSixVertical size={13} weight="bold" />
                        </div>
                      ) : (
                        <span className="text-[10px] text-text-muted font-mono">{rowIndex + 1}</span>
                      )}
                    </td>

                    {/* Render Columns Cell */}
                    {table.columns.map((col, colIndex) => {
                      const isFirstCol = colIndex === 0;
                      const cellValue = row.cells[col.id] || '';
                      const isEditing = activeCell?.rowId === row.id && activeCell?.colId === col.id;

                      return (
                        <td
                          key={col.id}
                          style={{
                            left: isFirstCol ? '32px' : undefined
                          }}
                          className={`p-0 h-9 border-r border-border/40 font-sans relative ${
                            isFirstCol ? 'sticky left-[32px] bg-white z-10 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]' : ''
                          }`}
                        >
                          {/* Render cell according to its specific type */}
                          {col.type === 'status' ? (
                            <div className="px-2.5 h-full flex items-center">
                              <select
                                disabled={isReadOnly}
                                value={cellValue || 'todo'}
                                onChange={(e) => handleCellSelectChange(row.id, col.id, e.target.value)}
                                className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded-full border cursor-pointer outline-none ${
                                  STATUS_OPTIONS.find(o => o.value === cellValue)?.bg || 'bg-slate-100'
                                } ${
                                  STATUS_OPTIONS.find(o => o.value === cellValue)?.text || 'text-slate-600'
                                } ${
                                  STATUS_OPTIONS.find(o => o.value === cellValue)?.border || 'border-slate-300'
                                }`}
                              >
                                {STATUS_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label.toUpperCase()}</option>
                                ))}
                              </select>
                            </div>
                          ) : col.type === 'priority' ? (
                            <div className="px-2.5 h-full flex items-center">
                              <select
                                disabled={isReadOnly}
                                value={cellValue || 'medium'}
                                onChange={(e) => handleCellSelectChange(row.id, col.id, e.target.value)}
                                className="text-[10px] font-sans font-bold text-text-primary bg-slate-50 border border-border rounded-lg py-0.5 px-2 outline-none cursor-pointer"
                              >
                                {PRIORITY_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                          ) : isEditing ? (
                            <input
                              type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                              value={cellEditValue}
                              onChange={(e) => setCellEditValue(e.target.value)}
                              onBlur={() => handleCellBlur(row.id, col.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellBlur(row.id, col.id);
                              }}
                              className="w-full h-full px-3 text-[11px] font-sans text-text-primary focus:outline-none focus:ring-1 focus:ring-gh-teal focus:bg-white"
                              autoFocus
                            />
                          ) : (
                            <div
                              onClick={() => {
                                if (isReadOnly) return;
                                setActiveCell({ rowId: row.id, colId: col.id });
                                setCellEditValue(cellValue);
                              }}
                              className="w-full h-full px-3 flex items-center cursor-text hover:bg-slate-50/50 truncate min-h-[36px]"
                            >
                              {col.type === 'currency' ? (
                                <span className="font-mono text-[11px] font-bold text-emerald-700 truncate">
                                  {cellValue ? formatPHP(cellValue) : <span className="text-text-muted opacity-40">₱0</span>}
                                </span>
                              ) : col.type === 'date' ? (
                                <span className="font-mono text-[10px] text-text-secondary truncate">
                                  {cellValue ? formatDateString(cellValue) : <span className="text-text-muted opacity-40">Set due date...</span>}
                                </span>
                              ) : col.type === 'url' ? (
                                cellValue ? (
                                  <a
                                    href={cellValue.startsWith('http') ? cellValue : `https://${cellValue}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-gh-blue hover:underline text-[10px] font-sans font-bold flex items-center gap-1.5 truncate"
                                  >
                                    <ArrowSquareOut size={10} />
                                    <span className="truncate">{cellValue.replace(/https?:\/\/(www\.)?/, '')}</span>
                                  </a>
                                ) : (
                                  <span className="text-text-muted opacity-40">Add website URL...</span>
                                )
                              ) : (
                                <span className={`truncate text-[11px] ${col.type === 'number' ? 'font-mono' : ''}`}>
                                  {cellValue || <span className="text-text-muted opacity-40">Double-click to edit...</span>}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Delete row action */}
                    {!isReadOnly && (
                      <td className="text-center w-12 p-0 border-r-0">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1 hover:bg-red-50 text-text-muted hover:text-red-600 rounded-lg transition shrink-0"
                          title="Delete row"
                        >
                          <Trash size={12} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* New Column Creator Dialog Modal */}
      {isNewColModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-border shadow-elevated max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-sans font-extrabold text-text-primary mb-1 flex items-center gap-2">
              <Columns size={16} className="text-gh-teal" /> Add New Table Column
            </h3>
            <p className="text-[10px] text-text-muted mb-4">Introduce interactive variables and metric vectors to your grid structure.</p>

            <div className="space-y-4 mb-5 text-[11px]">
              <div>
                <label className="block text-[10px] font-black text-text-primary uppercase mb-1.5">Column Heading *</label>
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g. Budget size, Priority, URL"
                  className="w-full px-3 py-2 border border-border bg-slate-50 rounded-xl focus:ring-2 focus:ring-gh-teal focus:bg-white outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-primary uppercase mb-1.5">Select Data Field Type</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { type: 'text', icon: <TextT size={14} />, label: 'Text' },
                    { type: 'status', icon: <ToggleLeft size={14} />, label: 'Status' },
                    { type: 'priority', icon: <Tag size={14} />, label: 'Priority' },
                    { type: 'currency', icon: <Coins size={14} />, label: 'Currency' },
                    { type: 'date', icon: <Calendar size={14} />, label: 'Date' },
                    { type: 'url', icon: <LinkSimple size={14} />, label: 'URL Link' }
                  ].map((preset) => (
                    <button
                      key={preset.type}
                      type="button"
                      onClick={() => setNewColType(preset.type as CellType)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-center ${
                        newColType === preset.type
                          ? 'border-gh-teal bg-teal-50 text-teal-800'
                          : 'border-border bg-slate-50 text-text-secondary hover:bg-slate-100'
                      }`}
                    >
                      {preset.icon}
                      <span className="text-[9px] font-bold font-sans">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setIsNewColModalOpen(false)}
                className="px-3.5 py-2 hover:bg-slate-100 text-text-secondary text-[10px] font-bold rounded-xl transition"
              >
                CANCEL
              </button>
              <button
                onClick={handleAddColumnSubmit}
                className="px-4 py-2 bg-gh-teal hover:bg-gh-teal-hover text-white text-[10px] font-bold rounded-xl transition"
              >
                CREATE COLUMN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Table Standardized Confirmation Modal */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-border shadow-elevated max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-sans font-extrabold text-text-primary mb-1">Delete Table?</h3>
            <p className="text-[11px] text-text-muted leading-relaxed mb-4">
              To permanently delete "{table.name}" and discard all metrics data, type <span className="font-mono font-bold text-red-600">DELETE</span> below. This cannot be undone.
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="type DELETE"
              className="w-full px-3 py-2 border border-border bg-slate-50 text-[11px] font-mono rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white outline-none mb-4 uppercase text-center"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => {
                  setIsConfirmingDelete(false);
                  setDeleteInput('');
                }}
                className="px-3.5 py-2 hover:bg-slate-100 text-text-secondary text-[11px] font-bold rounded-xl transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                disabled={deleteInput !== 'DELETE'}
                onClick={confirmDeleteTable}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-[11px] font-bold rounded-xl transition cursor-pointer"
              >
                DELETE TABLE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
