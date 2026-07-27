import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash, FileText, Receipt, ShieldCheck, Kanban, 
  Trash2, Edit2, AlertCircle, Sparkles, Send, Users, Activity
} from 'lucide-react';
import { Project, SharedTable, AuditLogEntry } from '../types';
import CustomDropdown from './CustomDropdown';
import CustomPromptModal from './CustomPromptModal';
import FlowchartCanvas from './FlowchartCanvas';
import WorkspaceTable from './WorkspaceTable';

// On-the-fly backward-compatibility data migrations
export const migrateFlowchart = (fc: any): any => {
  if (fc.nodes && fc.edges) return fc; // already migrated
  const nodes = (fc.elements || []).filter((e: any) => e.type !== 'arrow').map((e: any) => {
    let type = 'process';
    if (e.type === 'diamond') type = 'decision';
    else if (e.type === 'circle') type = 'terminal';
    return {
      id: e.id,
      type,
      position: { x: e.x || 100, y: e.y || 100 },
      data: {
        label: e.label || '',
        color: e.color || '#14b8a6',
        description: '',
        milestoneStatus: 'pending',
        milestoneAmount: 0,
        milestoneDueDate: new Date().toISOString().split('T')[0]
      },
      width: 140,
      height: 48
    };
  });
  const edges = (fc.elements || [])
    .filter((e: any) => e.type === 'arrow')
    .map((e: any) => ({
      id: e.id,
      source: e.fromId,
      target: e.toId,
      type: 'labeled',
      data: { label: e.label || '' }
    }));
  return {
    id: fc.id,
    name: fc.name,
    nodes,
    edges,
    createdAt: fc.createdAt || new Date().toISOString(),
    createdBy: fc.createdBy || 'freelancer'
  };
};

export const migrateTable = (t: any): any => {
  if (t.columns && typeof t.columns[0] === 'object') return t; // already migrated
  
  const columns = (t.columns || []).map((colName: string, idx: number) => {
    let type = 'text';
    const lower = colName.toLowerCase();
    if (lower.includes('status')) type = 'status';
    else if (lower.includes('priority')) type = 'priority';
    else if (lower.includes('budget') || lower.includes('amount') || lower.includes('price')) type = 'currency';
    else if (lower.includes('date')) type = 'date';
    else if (lower.includes('url') || lower.includes('website') || lower.includes('link')) type = 'url';
    
    return {
      id: `col_${idx}_${Date.now()}`,
      header: colName,
      type: type,
      width: 150
    };
  });

  const rows = (t.rows || []).map((rowValues: string[], rIdx: number) => {
    const cells: Record<string, string> = {};
    columns.forEach((col, cIdx) => {
      cells[col.id] = rowValues[cIdx] || '';
    });
    return {
      id: `row_${rIdx}_${Date.now()}`,
      cells: cells
    };
  });

  return {
    id: t.id,
    name: t.name,
    columns,
    rows,
    createdAt: t.createdAt || new Date().toISOString(),
    createdBy: t.createdBy || 'freelancer'
  };
};

export interface SharedWorkspaceViewProps {
  activeProject: Project;
  onUpdateProject: (updated: Project) => void;
  activeRole: 'client' | 'freelancer';
  showToast: (msg: string) => void;
  layoutMode: 'sidebar' | 'fullscreen';
}

export default function SharedWorkspaceView({
  activeProject,
  onUpdateProject,
  activeRole,
  showToast,
  layoutMode = 'sidebar'
}: SharedWorkspaceViewProps) {
  // Sub-tabs
  const [workspaceSubTab, setWorkspaceSubTab] = useState<'notes' | 'tables' | 'flowchart'>('notes');
  const [mobileNotesView, setMobileNotesView] = useState<'list' | 'editor'>('list');

  // Notes state
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const saveTimeoutRef = useRef<any>(null);

  // Tables state
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Custom Modal state
  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    placeholder?: string;
    defaultValue?: string;
    onConfirm: (val: string) => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  // Flowchart state
  const [selectedFlowchartId, setSelectedFlowchartId] = useState<string | null>(null);

  // Derive current flowcharts with backward-compatibility migration
  const sharedFlowcharts = useMemo(() => {
    const raw = activeProject?.sharedFlowcharts || [];
    return raw.map(migrateFlowchart);
  }, [activeProject?.sharedFlowcharts]);

  const flowchartsList = useMemo(() => {
    if (sharedFlowcharts.length > 0) return sharedFlowcharts;
    const migratedDefault = migrateFlowchart({
      id: 'flowchart_default',
      name: 'Main Flowchart',
      elements: activeProject?.boardElements || []
    });
    return [migratedDefault];
  }, [sharedFlowcharts, activeProject?.boardElements]);

  const activeFlowchart = useMemo(() => {
    return flowchartsList.find(f => f.id === selectedFlowchartId) || flowchartsList[0];
  }, [flowchartsList, selectedFlowchartId]);

  // Derive current tables with backward-compatibility migration
  const sharedTables = useMemo(() => {
    const raw = activeProject?.sharedTables || [];
    return raw.map(migrateTable);
  }, [activeProject?.sharedTables]);

  const activeTable = useMemo(() => {
    return sharedTables.find(t => t.id === selectedTableId) || sharedTables[0];
  }, [sharedTables, selectedTableId]);

  // Sync state with activeProject
  useEffect(() => {
    if (activeProject) {
      // Auto select first note if available, otherwise reset
      const firstNote = activeProject.documents?.[0];
      if (firstNote) {
        if (!selectedNoteId) {
          setSelectedNoteId(firstNote.id);
          setNoteContent(firstNote.content);
        }
      } else {
        setSelectedNoteId(null);
        setNoteContent('');
      }

      // Auto select first table if available
      const firstTable = sharedTables?.[0];
      if (firstTable && !selectedTableId) {
        setSelectedTableId(firstTable.id);
      }

      // Auto select first flowchart if available
      if (!selectedFlowchartId && flowchartsList.length > 0) {
        setSelectedFlowchartId(flowchartsList[0].id);
      }
    }
  }, [activeProject?.id, sharedTables, flowchartsList]);


  // Helper to persist elements changes
  const persistFlowchartChanges = (nodes: any[], edges: any[]) => {
    let nextFlowcharts = [...sharedFlowcharts];
    if (nextFlowcharts.length === 0) {
      nextFlowcharts = [{
        id: 'flowchart_default',
        name: 'Main Flowchart',
        nodes,
        edges,
        createdAt: new Date().toISOString(),
        createdBy: activeRole
      }];
    } else {
      nextFlowcharts = nextFlowcharts.map(f => f.id === activeFlowchart.id ? { ...f, nodes, edges } : f);
    }
    onUpdateProject({
      ...activeProject,
      sharedFlowcharts: nextFlowcharts
    });
  };

  // Open Custom Prompt Modal wrapper
  const openPrompt = (title: string, description: string, placeholder: string, defaultValue: string, onConfirm: (val: string) => void) => {
    setPromptConfig({
      isOpen: true,
      title,
      description,
      placeholder,
      defaultValue,
      onConfirm: (val) => {
        onConfirm(val);
        setPromptConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden ${layoutMode === 'fullscreen' ? 'bg-slate-50/20' : ''}`}>
      
      {/* 1. Sub-tab and actions bar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40 shrink-0">
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg font-sans font-bold text-[10px]">
          {(['notes', 'tables', 'flowchart'] as const).map((sub) => (
            <button
              key={sub}
              onClick={() => setWorkspaceSubTab(sub)}
              className={`px-3 py-1.5 rounded-md capitalize transition cursor-pointer ${
                workspaceSubTab === sub
                  ? 'bg-white text-gh-teal shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Workspace Inner Content Viewport */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        
        {/* 1. NOTES SUB-TAB */}
        {workspaceSubTab === 'notes' && (
          <div className="flex-grow flex gap-3 overflow-hidden h-full min-h-0">
            {/* Notes list */}
            <div className={`${mobileNotesView === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-48 bg-white border border-border rounded-xl p-2.5 flex-col h-full overflow-y-auto space-y-1.5 shrink-0 scrollbar-thin`}>
              <button
                onClick={() => {
                  const newDocId = `doc_${Date.now()}`;
                  const newDoc = {
                    id: newDocId,
                    title: `Note #${(activeProject.documents || []).length + 1}`,
                    content: '',
                    updatedAt: new Date().toISOString(),
                    updatedBy: activeRole === 'freelancer' ? activeProject.freelancerName : activeProject.clientName
                  };
                  const updatedDocs = [...(activeProject.documents || []), newDoc];
                  
                  const newLog = {
                    id: `audit_${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    actor: activeRole === 'freelancer' ? 'Freelancer' : 'Client',
                    action: 'Workspace Note Created',
                    details: `${activeRole === 'freelancer' ? 'Developer' : 'Client'} created workspace note "${newDoc.title}".`
                  };
                  
                  onUpdateProject({
                    ...activeProject,
                    documents: updatedDocs,
                    auditLogs: [newLog, ...(activeProject.auditLogs || [])]
                  });
                  setSelectedNoteId(newDocId);
                  setNoteContent('');
                  setMobileNotesView('editor');
                  showToast(`Created note: ${newDoc.title}`);
                }}
                className="w-full py-1.5 bg-gh-teal hover:bg-gh-teal-hover text-white rounded-lg font-sans font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition"
              >
                <Plus size={11} weight="bold" />
                <span>New Note</span>
              </button>

              <div className="flex-grow overflow-y-auto space-y-1 pr-0.5">
                {(activeProject.documents || []).map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setSelectedNoteId(doc.id);
                      setNoteContent(doc.content);
                      setMobileNotesView('editor');
                    }}
                    className={`w-full text-left p-2 rounded-lg transition border cursor-pointer ${
                      selectedNoteId === doc.id
                        ? 'bg-gh-teal/5 text-gh-teal-hover font-bold border-gh-teal/20'
                        : 'hover:bg-slate-50 text-text-primary border-transparent'
                    }`}
                  >
                    <p className="font-sans text-[11px] truncate leading-tight font-semibold">{doc.title || 'Untitled note'}</p>
                    <span className="text-[8px] font-mono text-text-muted block mt-0.5">
                      Edited: {new Date(doc.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Note Editor */}
            <div className={`${mobileNotesView === 'editor' ? 'flex' : 'hidden'} md:flex flex-1 bg-white border border-border rounded-xl p-3 flex-col h-full overflow-hidden`}>
              {selectedNoteId ? (
                <div className="flex-1 flex flex-col overflow-hidden space-y-2.5">
                  <div className="flex items-center gap-2 shrink-0 pb-1.5 border-b border-border/50">
                    <button
                      onClick={() => setMobileNotesView('list')}
                      className="md:hidden px-2 py-1 bg-slate-100 hover:bg-slate-200 text-text-secondary rounded font-sans font-bold text-[9px] uppercase tracking-wide cursor-pointer transition shrink-0"
                    >
                      ← List
                    </button>
                    <input
                      type="text"
                      value={(activeProject.documents || []).find(d => d.id === selectedNoteId)?.title || ''}
                      onChange={(e) => {
                        const updatedDocs = (activeProject.documents || []).map(d =>
                          d.id === selectedNoteId ? { ...d, title: e.target.value, updatedAt: new Date().toISOString() } : d
                        );
                        onUpdateProject({ ...activeProject, documents: updatedDocs });
                      }}
                      className="font-sans font-bold text-xs text-gh-ink bg-transparent focus:outline-none border-b border-transparent focus:border-border/60 py-0.5 w-1/2 flex-1"
                      placeholder="Note title..."
                    />
                    <button
                      onClick={() => {
                        const docTitle = (activeProject.documents || []).find(d => d.id === selectedNoteId)?.title || 'Note';
                        const updatedDocs = (activeProject.documents || []).filter(d => d.id !== selectedNoteId);
                        const nextDocId = updatedDocs[0]?.id || null;
                        const nextDocContent = updatedDocs[0]?.content || '';
                        
                        onUpdateProject({
                          ...activeProject,
                          documents: updatedDocs
                        });
                        setSelectedNoteId(nextDocId);
                        setNoteContent(nextDocContent);
                        showToast(`Deleted note: ${docTitle}`);
                      }}
                      className="p-1 hover:bg-red-50 text-gh-red rounded transition cursor-pointer"
                      title="Delete note"
                    >
                      <Trash size={12} />
                    </button>
                  </div>

                  <textarea
                    value={noteContent}
                    onChange={(e) => {
                      setNoteContent(e.target.value);
                      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                      saveTimeoutRef.current = setTimeout(() => {
                        const updatedDocs = (activeProject.documents || []).map(d =>
                          d.id === selectedNoteId ? {
                            ...d,
                            content: e.target.value,
                            updatedAt: new Date().toISOString(),
                            updatedBy: activeRole === 'freelancer' ? activeProject.freelancerName : activeProject.clientName
                          } : d
                        );
                        onUpdateProject({ ...activeProject, documents: updatedDocs });
                      }, 300);
                    }}
                    className="flex-grow w-full p-2.5 bg-slate-50/50 border border-border rounded-xl text-[10.5px] font-mono focus:outline-none focus:ring-1 focus:ring-gh-teal resize-none leading-relaxed"
                    placeholder="Type collaborative notes here... auto-saved and synchronized in real-time."
                  />
                  
                  <div className="flex justify-between items-center text-[9px] font-mono text-text-muted select-none">
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={11} className="text-gh-green" />
                      Auto-saved securely
                    </span>
                    <span>
                      Edited by: {(activeProject.documents || []).find(d => d.id === selectedNoteId)?.updatedBy || 'Staging Node'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-text-muted p-6 space-y-1.5">
                  <FileText size={28} className="text-slate-300 animate-pulse" />
                  <p className="font-sans font-bold text-xs text-text-primary">No Active Workspace Note</p>
                  <p className="text-[9px] max-w-xs leading-tight text-text-muted/70">Select or create a collaborative specification note on the left panel to begin drafting specs.</p>
                </div>
              )}
            </div>
          </div>
        )}        {/* 2. TABLES SUB-TAB */}
        {workspaceSubTab === 'tables' && (
          <div className="flex-grow flex flex-col overflow-hidden h-full min-h-0 bg-white border border-border rounded-xl p-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60 shrink-0 select-none">
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-[50%] scrollbar-none">
                {sharedTables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTableId(t.id)}
                    className={`px-3 py-1.5 rounded-lg font-sans text-[10px] font-bold tracking-tight transition cursor-pointer shrink-0 border ${
                      selectedTableId === t.id
                        ? 'bg-gh-teal text-white border-gh-teal shadow-sm'
                        : 'text-text-secondary hover:bg-slate-100 border-border/50 bg-slate-50/50'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    openPrompt(
                      'Create Shared Table',
                      'Specify a collaborative spreadsheet name to share securely with the team.',
                      'Requirements Matrix',
                      'Requirements Matrix',
                      (name) => {
                        if (!name) return;
                        const newTable: SharedTable = {
                          id: `table_${Date.now()}`,
                          name: name,
                          columns: [
                            { id: `col_0_${Date.now()}`, header: 'Feature / Requirement', type: 'text', width: 220 },
                            { id: `col_1_${Date.now()}`, header: 'Owner', type: 'text', width: 120 },
                            { id: `col_2_${Date.now()}`, header: 'Priority', type: 'priority', width: 100 },
                            { id: `col_3_${Date.now()}`, header: 'Status', type: 'status', width: 120 },
                            { id: `col_4_${Date.now()}`, header: 'Target Date', type: 'date', width: 120 }
                          ],
                          rows: [
                            {
                              id: `row_0_${Date.now()}`,
                              cells: {
                                [`col_0_${Date.now()}`]: 'Implement secure GCash webhook response payload',
                                [`col_1_${Date.now()}`]: 'Freelancer',
                                [`col_2_${Date.now()}`]: 'High',
                                [`col_3_${Date.now()}`]: 'In Progress',
                                [`col_4_${Date.now()}`]: new Date().toISOString().split('T')[0]
                              }
                            },
                            {
                              id: `row_1_${Date.now()}`,
                              cells: {
                                [`col_0_${Date.now()}`]: 'Acknowledge production environment variable release',
                                [`col_1_${Date.now()}`]: 'Client',
                                [`col_2_${Date.now()}`]: 'Critical',
                                [`col_3_${Date.now()}`]: 'Pending',
                                [`col_4_${Date.now()}`]: new Date().toISOString().split('T')[0]
                              }
                            }
                          ],
                          createdAt: new Date().toISOString(),
                          createdBy: activeRole
                        };
                        const updated = [...sharedTables, newTable];
                        onUpdateProject({ ...activeProject, sharedTables: updated });
                        setSelectedTableId(newTable.id);
                        showToast(`Sheet "${name}" deployed successfully.`);
                      }
                    );
                  }}
                  className="px-2.5 py-1.5 bg-gh-teal hover:bg-gh-teal-hover text-white text-[10px] font-sans font-bold rounded-lg transition shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <Plus size={12} />
                  <span>Create Table</span>
                </button>

                {selectedTableId && activeTable && (
                  <button
                    onClick={() => {
                      openPrompt(
                        'Rename Table',
                        'Specify a new name for this collaborative spreadsheet.',
                        activeTable.name,
                        activeTable.name,
                        (newName) => {
                          if (!newName || newName === activeTable.name) return;
                          const updated = sharedTables.map(t =>
                            t.id === activeTable.id ? { ...t, name: newName } : t
                          );
                          onUpdateProject({ ...activeProject, sharedTables: updated });
                          showToast(`Table renamed to "${newName}".`);
                        }
                      );
                    }}
                    className="px-2.5 py-1.5 border border-border hover:bg-slate-50 text-text-secondary text-[10px] font-sans font-semibold rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <Edit2 size={11} />
                    <span>Rename</span>
                  </button>
                )}

                {selectedTableId && activeTable && (
                  <button
                    onClick={() => {
                      openPrompt(
                        'Delete Table',
                        `To confirm deleting table "${activeTable.name}", type "DELETE".`,
                        'Type DELETE here...',
                        '',
                        (confirmVal) => {
                          if (confirmVal !== 'DELETE') {
                            showToast('Deletion canceled.');
                            return;
                          }
                          const updated = sharedTables.filter(t => t.id !== activeTable.id);
                          onUpdateProject({ ...activeProject, sharedTables: updated });
                          setSelectedTableId(updated[0]?.id || null);
                          showToast(`Table "${activeTable.name}" permanently deleted.`);
                        }
                      );
                    }}
                    className="px-2.5 py-1.5 border border-red-200 hover:bg-red-50 text-gh-red text-[10px] font-sans font-semibold rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 size={11} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex-grow pt-2 flex flex-col min-h-0">
              {selectedTableId && activeTable ? (
                <WorkspaceTable
                  table={activeTable}
                  onUpdate={(updatedTable) => {
                    const updated = sharedTables.map(t =>
                      t.id === updatedTable.id ? updatedTable : t
                    );
                    onUpdateProject({ ...activeProject, sharedTables: updated });
                  }}
                  onDelete={() => {
                    const updated = sharedTables.filter(t => t.id !== activeTable.id);
                    const nextId = updated[0]?.id || '';
                    onUpdateProject({
                      ...activeProject,
                      sharedTables: updated
                    });
                    setSelectedTableId(nextId);
                    showToast(`Table "${activeTable.name}" deleted.`);
                  }}
                  onRename={(newName) => {
                    const updated = sharedTables.map(t =>
                      t.id === activeTable.id ? { ...t, name: newName } : t
                    );
                    onUpdateProject({ ...activeProject, sharedTables: updated });
                    showToast(`Table renamed to "${newName}".`);
                  }}
                  showToast={showToast}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-text-muted p-6 space-y-1.5">
                  <Receipt size={28} className="text-slate-300 animate-pulse" />
                  <p className="font-sans font-bold text-xs text-text-primary">No shared table active</p>
                  <p className="text-[10px] max-w-xs leading-tight text-text-muted/70">Create a collaborative tracking sheet above to list development tasks or parameters.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. FLOWCHART SUB-TAB */}
        {workspaceSubTab === 'flowchart' && (
          <div className="flex flex-col h-full overflow-hidden select-none">
            {/* Flowcharts sub-navigation & actions */}
            <div className="flex items-center justify-between pb-2 border-b border-border/60 shrink-0 select-none">
              <div className="flex items-center gap-1 overflow-x-auto max-w-[60%] scrollbar-none">
                {flowchartsList.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFlowchartId(f.id)}
                    className={`px-2 py-1 rounded font-sans text-[9px] font-bold tracking-tight transition cursor-pointer shrink-0 border ${
                      selectedFlowchartId === f.id
                        ? 'bg-gh-teal text-white border-gh-teal shadow-sm'
                        : 'text-text-secondary hover:bg-slate-100 border-transparent'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Create Flowchart button */}
                <button
                  onClick={() => {
                    openPrompt(
                      'Create Shared Flowchart',
                      'Specify a flowchart layout name to share securely.',
                      'Architecture Flow',
                      'Architecture Flow',
                      (name) => {
                        if (!name) return;
                        const newFlowId = `flowchart_${Date.now()}`;
                        const newFlowchart = {
                          id: newFlowId,
                          name: name,
                          nodes: [
                            {
                              id: `node_${Date.now()}_1`,
                              type: 'process',
                              position: { x: 80, y: 80 },
                              data: {
                                label: 'Entry Gateway',
                                color: '#14b8a6',
                                description: 'Gateway for handling initial payload',
                                milestoneStatus: 'pending',
                                milestoneAmount: 0,
                                milestoneDueDate: new Date().toISOString().split('T')[0]
                              },
                              width: 140,
                              height: 48
                            },
                            {
                              id: `node_${Date.now()}_2`,
                              type: 'terminal',
                              position: { x: 280, y: 80 },
                              data: {
                                label: 'Success Log',
                                color: '#22c55e',
                                description: 'End process log',
                                milestoneStatus: 'pending',
                                milestoneAmount: 0,
                                milestoneDueDate: new Date().toISOString().split('T')[0]
                              },
                              width: 140,
                              height: 48
                            }
                          ],
                          edges: [],
                          createdAt: new Date().toISOString(),
                          createdBy: activeRole
                        };
                        
                        let updated = [...sharedFlowcharts];
                        if (updated.length === 0) {
                          const defaultMigrated = migrateFlowchart({
                            id: 'flowchart_default',
                            name: 'Main Flowchart',
                            elements: activeProject.boardElements || []
                          });
                          updated.push(defaultMigrated);
                        }
                        updated.push(newFlowchart);
                        
                        onUpdateProject({
                          ...activeProject,
                          sharedFlowcharts: updated
                        });
                        setSelectedFlowchartId(newFlowId);
                        showToast(`Flowchart "${name}" deployed successfully.`);
                      }
                    );
                  }}
                  className="px-2.5 py-1.5 bg-gh-teal hover:bg-gh-teal-hover text-white text-[10px] font-sans font-bold rounded-lg transition shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <Plus size={11} />
                  <span>Create Flowchart</span>
                </button>

                {/* Rename Flowchart button */}
                {selectedFlowchartId && (
                  <button
                    onClick={() => {
                      const currentName = activeFlowchart?.name || 'Main Flowchart';
                      openPrompt(
                        'Rename Flowchart',
                        'Change the name of the selected shared flowchart canvas.',
                        currentName,
                        currentName,
                        (newName) => {
                          if (!newName || newName === currentName) return;
                          
                          let updated = [...sharedFlowcharts];
                          if (updated.length === 0) {
                            const defaultMigrated = migrateFlowchart({
                              id: 'flowchart_default',
                              name: newName,
                              elements: activeProject.boardElements || []
                            });
                            updated = [defaultMigrated];
                          } else {
                            updated = updated.map(f => f.id === activeFlowchart.id ? { ...f, name: newName } : f);
                          }

                          onUpdateProject({
                            ...activeProject,
                            sharedFlowcharts: updated
                          });
                          showToast(`Flowchart renamed to "${newName}".`);
                        }
                      );
                    }}
                    className="px-2.5 py-1.5 border border-border hover:bg-slate-50 text-text-secondary text-[10px] font-sans font-semibold rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <Edit2 size={11} />
                    <span>Rename</span>
                  </button>
                )}

                {/* Delete Flowchart button */}
                {selectedFlowchartId && (sharedFlowcharts.length > 0 || selectedFlowchartId !== 'flowchart_default') && (
                  <button
                    onClick={() => {
                      const currentName = activeFlowchart?.name || 'Flowchart';
                      openPrompt(
                        'Delete Shared Flowchart',
                        `To permanently delete flowchart "${currentName}", type "DELETE". This is irreversible.`,
                        'Type DELETE here...',
                        '',
                        (confirmVal) => {
                          if (confirmVal !== 'DELETE') {
                            showToast('Deletion canceled (confirmation code mismatch).');
                            return;
                          }

                          const updated = sharedFlowcharts.filter(f => f.id !== activeFlowchart.id);
                          const nextId = updated[0]?.id || 'flowchart_default';

                          onUpdateProject({
                            ...activeProject,
                            sharedFlowcharts: updated
                          });
                          setSelectedFlowchartId(nextId);
                          showToast(`Flowchart "${currentName}" permanently deleted.`);
                        }
                      );
                    }}
                    className="px-2.5 py-1.5 border border-red-200 hover:bg-red-50 text-gh-red text-[10px] font-sans font-semibold rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 size={11} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* Reusable Flowchart Canvas */}
            <div className="flex-grow flex flex-col min-h-0 mt-2">
              <FlowchartCanvas
                flowchartId={activeFlowchart.id}
                initialNodes={activeFlowchart.nodes || []}
                initialEdges={activeFlowchart.edges || []}
                onSave={(nodes, edges) => {
                  persistFlowchartChanges(nodes, edges);
                }}
                showToast={showToast}
                activeRole={activeRole}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Reusable Custom prompt modal */}
      <CustomPromptModal
        isOpen={promptConfig.isOpen}
        title={promptConfig.title}
        description={promptConfig.description}
        placeholder={promptConfig.placeholder}
        defaultValue={promptConfig.defaultValue}
        onConfirm={promptConfig.onConfirm}
        onCancel={() => setPromptConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
