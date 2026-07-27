import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Trash,
  Copy,
  Lock,
  LockOpen,
  Square,
  DiamondsFour,
  Circle,
  Selection,
  Note,
  CheckCircle,
  BoundingBox,
  Tray,
  Signpost,
  Hourglass,
  Browser,
  Palette,
  TextT,
  Sliders,
} from '@phosphor-icons/react';
import {
  GHNodeType,
  GHNode,
  GHEdge,
  GHNodeData,
  GHEdgeData,
  GH_NODE_COLORS,
  GH_NODE_FILLS,
} from '../lib/flowchart-utils';

interface FlowchartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (type: GHNodeType, label: string, color: string) => void;
  selectedNode: GHNode | undefined;
  selectedEdge: GHEdge | undefined;
  onNodeDataChange: (nodeId: string, data: Partial<GHNodeData>) => void;
  onEdgeDataChange: (edgeId: string, data: Partial<GHEdgeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  isReadOnly: boolean;
  isPersonal: boolean;
}

const PALETTE_NODES: { type: GHNodeType; name: string; desc: string; icon: any; defaultColor: string }[] = [
  { type: 'process',    name: 'Process',    desc: 'Standard action or step',        icon: Square,       defaultColor: '#14b8a6' },
  { type: 'decision',   name: 'Decision',   desc: 'Conditional branch / question',   icon: DiamondsFour, defaultColor: '#D97706' },
  { type: 'terminal',   name: 'Start/End',  desc: 'Flow entry or exit point',      icon: Circle,       defaultColor: '#16A34A' },
  { type: 'data',       name: 'Data (I/O)', desc: 'Data input / output source',     icon: Selection,    defaultColor: '#2563EB' },
  { type: 'note',       name: 'Sticky Note',desc: 'Annotation or comment box',      icon: Note,         defaultColor: '#F59E0B' },
  { type: 'milestone',  name: 'Milestone',  desc: 'Deliverable with price & status',icon: CheckCircle,  defaultColor: '#0D9488' },
  { type: 'group',      name: 'Group Box',  desc: 'Container for grouping nodes',   icon: BoundingBox,  defaultColor: '#94A3B8' },
  { type: 'input',      name: 'User Input', desc: 'Form or manual entry step',      icon: Tray,         defaultColor: '#7C3AED' },
  { type: 'output',     name: 'Output',     desc: 'Display, screen or report',      icon: Signpost,     defaultColor: '#0EA5E9' },
  { type: 'delay',      name: 'Delay/Wait', desc: 'Pause or waiting period',        icon: Hourglass,    defaultColor: '#EC4899' },
  { type: 'subprocess', name: 'Subprocess', desc: 'External or modular process',    icon: Browser,      defaultColor: '#1E2D3D' },
];

export function FlowchartDrawer({
  isOpen,
  onClose,
  onAddNode,
  selectedNode,
  selectedEdge,
  onNodeDataChange,
  onEdgeDataChange,
  onDeleteNode,
  onDuplicateNode,
  onDeleteEdge,
  isReadOnly,
  isPersonal,
}: FlowchartDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Subtle backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />

          {/* Side Drawer Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 bottom-0 right-0 w-80 max-w-[90vw] bg-white border-l border-border z-50 shadow-2xl flex flex-col pointer-events-auto"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-slate-50">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-gh-teal" />
                <h3 className="font-sans font-bold text-sm text-text-primary">Elements & Inspector</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-slate-200/60 transition cursor-pointer"
                aria-label="Close Drawer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              
              {/* SECTION A: Selected Element Properties */}
              {selectedNode ? (
                <div className="space-y-4 bg-teal-50/40 p-3.5 rounded-2xl border border-teal-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-gh-teal tracking-wider">
                      Selected: {selectedNode.type}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onDuplicateNode(selectedNode.id)}
                        className="p-1 text-slate-600 hover:text-text-primary hover:bg-white rounded transition cursor-pointer"
                        title="Duplicate"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => onDeleteNode(selectedNode.id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100/60 rounded transition cursor-pointer"
                        title="Delete"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Label & Description */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-sans font-semibold text-text-secondary block mb-1">Label</label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={selectedNode.data?.label || ''}
                        onChange={(e) => onNodeDataChange(selectedNode.id, { label: e.target.value })}
                        className="w-full text-xs font-sans px-2.5 py-1.5 bg-white border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-gh-teal"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-sans font-semibold text-text-secondary block mb-1">Description</label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={selectedNode.data?.description || ''}
                        onChange={(e) => onNodeDataChange(selectedNode.id, { description: e.target.value })}
                        placeholder="Add details..."
                        className="w-full text-xs font-sans px-2.5 py-1.5 bg-white border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-gh-teal"
                      />
                    </div>

                    {!isPersonal && (
                      <div>
                        <label className="text-[10px] font-sans font-semibold text-text-secondary block mb-1">Assign Owner</label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={selectedNode.data?.assignedRole || ''}
                          onChange={(e) => onNodeDataChange(selectedNode.id, { assignedRole: e.target.value })}
                          placeholder="e.g. Lead Developer"
                          className="w-full text-xs font-sans px-2.5 py-1.5 bg-white border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-gh-teal"
                        />
                      </div>
                    )}
                  </div>

                  {/* Appearance Controls */}
                  <div className="pt-2 border-t border-teal-200/50 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Palette size={14} className="text-gh-teal" />
                      <span className="text-[10px] font-mono font-bold uppercase text-text-secondary">Appearance</span>
                    </div>

                    {/* Border Accent Color */}
                    <div>
                      <span className="text-[9px] font-sans text-text-muted block mb-1">Border / Accent Color</span>
                      <div className="flex flex-wrap gap-1.5">
                        {GH_NODE_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => onNodeDataChange(selectedNode.id, { color })}
                            style={{ backgroundColor: color }}
                            className={`w-5 h-5 rounded-full border border-white hover:scale-110 transition cursor-pointer relative ${
                              selectedNode.data?.color === color ? 'ring-2 ring-gh-teal' : ''
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Fill Color */}
                    <div>
                      <span className="text-[9px] font-sans text-text-muted block mb-1">Background Fill</span>
                      <div className="flex flex-wrap gap-1.5">
                        {GH_NODE_FILLS.map(fill => (
                          <button
                            key={fill}
                            onClick={() => onNodeDataChange(selectedNode.id, { fillColor: fill })}
                            style={{ backgroundColor: fill }}
                            className={`w-5 h-5 rounded-full border border-slate-300 hover:scale-110 transition cursor-pointer relative ${
                              selectedNode.data?.fillColor === fill ? 'ring-2 ring-gh-teal' : ''
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Border Width & Opacity */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] font-sans text-text-muted block mb-1">Border Width</span>
                        <div className="flex gap-1 bg-white border border-border rounded-lg p-0.5">
                          {[1, 2, 3].map(w => (
                            <button
                              key={w}
                              onClick={() => onNodeDataChange(selectedNode.id, { borderWidth: w })}
                              className={`flex-1 text-[10px] font-mono py-0.5 rounded font-bold transition cursor-pointer ${
                                (selectedNode.data?.borderWidth || 2) === w ? 'bg-gh-teal text-white' : 'text-text-muted hover:bg-slate-100'
                              }`}
                            >
                              {w}px
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] font-sans text-text-muted block mb-1">
                          Opacity ({selectedNode.data?.opacity ?? 100}%)
                        </span>
                        <input
                          type="range"
                          min="20"
                          max="100"
                          value={selectedNode.data?.opacity ?? 100}
                          onChange={(e) => onNodeDataChange(selectedNode.id, { opacity: parseInt(e.target.value, 10) })}
                          className="w-full accent-gh-teal cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Font Size & Lock */}
                    <div className="pt-2 border-t border-teal-200/50 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <TextT size={13} className="text-text-muted" />
                        <select
                          value={selectedNode.data?.fontSize || 11}
                          onChange={(e) => onNodeDataChange(selectedNode.id, { fontSize: parseInt(e.target.value, 10) })}
                          className="text-[10px] font-mono bg-white border border-border rounded px-1.5 py-1 text-text-primary focus:outline-none"
                        >
                          <option value={9}>9px Font</option>
                          <option value={10}>10px Font</option>
                          <option value={11}>11px Font</option>
                          <option value={12}>12px Font</option>
                        </select>
                      </div>

                      <button
                        onClick={() => onNodeDataChange(selectedNode.id, { locked: !selectedNode.data?.locked })}
                        className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg border transition cursor-pointer ${
                          selectedNode.data?.locked
                            ? 'bg-amber-100 border-amber-300 text-amber-800 font-bold'
                            : 'bg-white border-border text-text-muted hover:bg-slate-50'
                        }`}
                      >
                        {selectedNode.data?.locked ? <Lock size={12} /> : <LockOpen size={12} />}
                        <span>{selectedNode.data?.locked ? 'Locked' : 'Lock'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedEdge ? (
                /* SECTION B: Selected Edge Properties */
                <div className="space-y-4 bg-slate-50 p-3.5 rounded-2xl border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-gh-teal tracking-wider">
                      Selected Connection Line
                    </span>
                    <button
                      onClick={() => onDeleteEdge(selectedEdge.id)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100/60 rounded transition cursor-pointer"
                      title="Delete Connection"
                    >
                      <Trash size={13} />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-sans font-semibold text-text-secondary block mb-1">Edge Label</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={selectedEdge.data?.label || ''}
                      onChange={(e) => onEdgeDataChange(selectedEdge.id, { label: e.target.value })}
                      placeholder="e.g. Yes / No / Next"
                      className="w-full text-xs font-sans px-2.5 py-1.5 bg-white border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-gh-teal"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-sans text-text-muted block mb-1">Line Routing</span>
                      <select
                        value={selectedEdge.data?.edgeStyle || 'bezier'}
                        onChange={(e) => onEdgeDataChange(selectedEdge.id, { edgeStyle: e.target.value as any })}
                        className="w-full text-[10px] font-mono bg-white border border-border rounded px-2 py-1 text-text-primary"
                      >
                        <option value="bezier">Bezier Curve</option>
                        <option value="straight">Straight Line</option>
                        <option value="step">Step Elbow</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[9px] font-sans text-text-muted block mb-1">Stroke Style</span>
                      <select
                        value={selectedEdge.data?.strokeStyle || 'solid'}
                        onChange={(e) => onEdgeDataChange(selectedEdge.id, { strokeStyle: e.target.value as any })}
                        className="w-full text-[10px] font-mono bg-white border border-border rounded px-2 py-1 text-text-primary"
                      >
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="animated">Animated Flow</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <p className="text-[11px] font-sans text-text-muted">
                    Click any node or edge on canvas to inspect and customize its properties.
                  </p>
                </div>
              )}

              {/* SECTION C: Add New Element Palette */}
              {!isReadOnly && (
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-secondary block">
                    Add Element Palette ({PALETTE_NODES.length} Types)
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {PALETTE_NODES.map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.type}
                          onClick={() => onAddNode(item.type, item.name, item.defaultColor)}
                          className="flex flex-col text-left p-2.5 rounded-xl border border-border bg-surface-0 hover:bg-slate-50 hover:border-gh-teal/50 hover:shadow-sm transition cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                              style={{ backgroundColor: item.defaultColor }}
                            >
                              <Icon size={14} weight="bold" />
                            </div>
                            <Plus size={12} className="text-text-muted group-hover:text-gh-teal transition" />
                          </div>
                          <span className="font-sans font-bold text-xs text-text-primary group-hover:text-gh-teal transition">
                            {item.name}
                          </span>
                          <span className="text-[9px] font-sans text-text-muted line-clamp-2 mt-0.5 leading-tight">
                            {item.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default FlowchartDrawer;
