import { useState, useCallback, useRef, useEffect, useMemo, createContext, useContext } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  BackgroundVariant,
  Panel,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Square,
  Diamond,
  Circle,
  Database,
  Note,
  Flag,
  ArrowCounterClockwise,
  ArrowClockwise,
  Trash,
  Wind,
  CornersOut,
  GridFour,
  Export,
  X,
  ArrowDown,
  MagnifyingGlass,
  CheckSquare,
  Cursor,
  Sliders,
  CaretDown,
  Question,
  Keyboard,
} from '@phosphor-icons/react';

import {
  type GHNode,
  type GHEdge,
  type GHNodeType,
  NODE_DEFAULTS,
  GH_NODE_COLORS,
  layoutGraph,
  type EdgeStyle,
  type EdgeStroke,
  type GHEdgeData,
  type GHNodeData,
} from '../lib/flowchart-utils';

import ProcessNode from './nodes/ProcessNode';
import DecisionNode from './nodes/DecisionNode';
import TerminalNode from './nodes/TerminalNode';
import DataNode from './nodes/DataNode';
import NoteNode from './nodes/NoteNode';
import MilestoneNode from './nodes/MilestoneNode';
import GroupNode from './nodes/GroupNode';
import InputNode from './nodes/InputNode';
import OutputNode from './nodes/OutputNode';
import DelayNode from './nodes/DelayNode';
import SubprocessNode from './nodes/SubprocessNode';
import LabeledEdge from './edges/LabeledEdge';
import FlowchartDrawer from './FlowchartDrawer';
import GHTooltip from './ui/GHTooltip';

export interface CanvasContext {
  pushHistory: (nodes: GHNode[], edges: GHEdge[]) => void;
  isReadOnly: boolean;
  isPersonal: boolean;
  onEdgeLabelChange: (edgeId: string, label: string) => void;
  onEdgeDelete: (edgeId: string) => void;
  onEdgeDataChange: (edgeId: string, data: Partial<GHEdgeData>) => void;
  onNodeDataChange: (nodeId: string, data: Partial<GHNodeData>) => void;
  onNodeDelete?: (nodeId: string) => void;
  onNodeDuplicate?: (nodeId: string) => void;
  milestones?: any[];
}

export const FlowchartCanvasContext = createContext<CanvasContext | null>(null);

export interface FlowchartCanvasProps {
  flowchartId: string;
  initialNodes: GHNode[];
  initialEdges: GHEdge[];
  onSave: (nodes: GHNode[], edges: GHEdge[]) => void;
  showToast?: (msg: string) => void;
  isReadOnly?: boolean;
  isPersonal?: boolean;
  title?: string;
  activeRole?: 'client' | 'freelancer';
  otherUserName?: string;
}

const nodeTypes: NodeTypes = {
  process: ProcessNode,
  decision: DecisionNode,
  terminal: TerminalNode,
  data: DataNode,
  note: NoteNode,
  milestone: MilestoneNode,
  group: GroupNode,
  input: InputNode,
  output: OutputNode,
  delay: DelayNode,
  subprocess: SubprocessNode,
};

const edgeTypes: EdgeTypes = {
  labeled: LabeledEdge,
};

function FlowchartCanvasInner({
  flowchartId,
  initialNodes,
  initialEdges,
  onSave,
  showToast,
  isReadOnly = false,
  isPersonal = false,
  title = 'Architecture Diagram',
  activeRole = 'freelancer',
  otherUserName,
}: FlowchartCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<GHNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<GHEdge>(initialEdges);
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Track nodes and edges with refs to prevent stale closure bugs
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // History state for Undo/Redo
  const [history, setHistory] = useState<{ nodes: GHNode[]; edges: GHEdge[] }[]>([
    { nodes: initialNodes, edges: initialEdges },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Local feature states
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [clearInput, setClearInput] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);

  // New Drawer & Shortcut states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [layoutDir, setLayoutDir] = useState<'TB' | 'LR' | 'BT' | 'RL'>('TB');
  const [showDirMenu, setShowDirMenu] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Selected element detection
  const selectedNode = useMemo(() => nodes.find(n => n.selected), [nodes]);
  const selectedEdge = useMemo(() => edges.find(e => e.selected), [edges]);

  // Push new snapshot to history
  const pushHistory = useCallback((newNodes: GHNode[], newEdges: GHEdge[]) => {
    setHistory(prev => {
      const nextHistory = prev.slice(0, historyIndex + 1);
      return [...nextHistory, { nodes: newNodes, edges: newEdges }];
    });
    setHistoryIndex(prev => prev + 1);
    setTimeout(() => {
      onSave(newNodes, newEdges);
    }, 0);
  }, [historyIndex, onSave]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setNodes(prev.nodes);
      setEdges(prev.edges);
      setHistoryIndex(historyIndex - 1);
      setTimeout(() => {
        onSave(prev.nodes, prev.edges);
      }, 0);
      showToast?.('Undo step.');
    }
  }, [historyIndex, history, setNodes, setEdges, onSave, showToast]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setNodes(next.nodes);
      setEdges(next.edges);
      setHistoryIndex(historyIndex + 1);
      setTimeout(() => {
        onSave(next.nodes, next.edges);
      }, 0);
      showToast?.('Redo step.');
    }
  }, [historyIndex, history, setNodes, setEdges, onSave, showToast]);

  // Node & Edge mutations
  const onNodeDataChange = useCallback((nodeId: string, updatedData: Partial<GHNodeData>) => {
    const next = nodesRef.current.map(n => (n.id === nodeId ? { ...n, data: { ...n.data, ...updatedData } } : n));
    setNodes(next);
    pushHistory(next, edgesRef.current);
  }, [setNodes, pushHistory]);

  const onEdgeDataChange = useCallback((edgeId: string, updatedData: Partial<GHEdgeData>) => {
    const next = edgesRef.current.map(e => (e.id === edgeId ? { ...e, data: { ...e.data, ...updatedData } } : e));
    setEdges(next);
    pushHistory(nodesRef.current, next);
  }, [setEdges, pushHistory]);

  const onEdgeLabelChange = useCallback((edgeId: string, label: string) => {
    onEdgeDataChange(edgeId, { label });
  }, [onEdgeDataChange]);

  const onEdgeDelete = useCallback((edgeId: string) => {
    const next = edgesRef.current.filter(e => e.id !== edgeId);
    setEdges(next);
    pushHistory(nodesRef.current, next);
    showToast?.('Connection line removed.');
  }, [setEdges, pushHistory, showToast]);

  const onNodeDelete = useCallback((nodeId: string) => {
    const remainingNodes = nodesRef.current.filter(n => n.id !== nodeId);
    const remainingEdges = edgesRef.current.filter(e => e.source !== nodeId && e.target !== nodeId);
    setNodes(remainingNodes);
    setEdges(remainingEdges);
    pushHistory(remainingNodes, remainingEdges);
    showToast?.('Element deleted.');
  }, [setNodes, setEdges, pushHistory, showToast]);

  const onNodeDuplicate = useCallback((nodeId: string) => {
    const source = nodesRef.current.find(n => n.id === nodeId);
    if (!source) return;
    const newNode: GHNode = {
      ...source,
      id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      position: { x: source.position.x + 40, y: source.position.y + 40 },
      selected: true,
    };
    const deselected = nodesRef.current.map(n => ({ ...n, selected: false }));
    const next = [...deselected, newNode];
    setNodes(next);
    pushHistory(next, edgesRef.current);
    showToast?.('Element duplicated.');
  }, [setNodes, pushHistory, showToast]);

  // Handle adding new node
  const addNode = useCallback((type: GHNodeType, label: string, color: string) => {
    const dims = NODE_DEFAULTS[type] || { width: 140, height: 48 };
    const viewportCenter = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    const newNode: GHNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      position: {
        x: viewportCenter.x - dims.width / 2 + (Math.random() * 40 - 20),
        y: viewportCenter.y - dims.height / 2 + (Math.random() * 40 - 20),
      },
      data: {
        label,
        color,
        description: '',
      },
    };

    const next = [...nodesRef.current, newNode];
    setNodes(next);
    pushHistory(next, edgesRef.current);
    showToast?.(`Added ${label}.`);
  }, [screenToFlowPosition, setNodes, pushHistory, showToast]);

  // Connect edges
  const onConnect = useCallback((connection: Connection) => {
    const newEdge: GHEdge = {
      ...connection,
      id: `edge_${Date.now()}`,
      type: 'labeled',
      data: {
        label: '',
        edgeStyle: 'bezier',
        strokeStyle: 'solid',
      },
    };
    const next = addEdge(newEdge, edgesRef.current) as GHEdge[];
    setEdges(next);
    pushHistory(nodesRef.current, next);
    showToast?.('Connected flowchart elements.');
  }, [setEdges, pushHistory, showToast]);

  // Auto-layout using Dagre
  const handleAutoLayout = useCallback((dir: 'TB' | 'LR' | 'BT' | 'RL' = layoutDir) => {
    if (nodes.length === 0) {
      showToast?.('No nodes to arrange.');
      return;
    }
    try {
      const positionedNodes = layoutGraph(nodes, edges, dir);
      setNodes(positionedNodes);
      pushHistory(positionedNodes, edges);
      setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 50);
      showToast?.(`Auto-arranged layout (${dir}).`);
    } catch {
      showToast?.('Failed to arrange layout.');
    }
  }, [nodes, edges, setNodes, pushHistory, fitView, layoutDir, showToast]);

  // Search matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return nodes.filter(n => n.data?.label?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [nodes, searchQuery]);

  const jumpToMatch = useCallback((node: GHNode) => {
    setNodes(nds => nds.map(n => ({ ...n, selected: n.id === node.id })));
    fitView({ nodes: [{ id: node.id }], duration: 600, maxZoom: 1.5 });
  }, [setNodes, fitView]);

  // Export handlers
  const handleExportPNG = useCallback(() => {
    const flowEl = document.querySelector('.react-flow') as HTMLElement;
    if (!flowEl) return;
    import('html-to-image').then(({ toPng }) => {
      toPng(flowEl, { backgroundColor: '#F8FAFC' }).then(dataUrl => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_flowchart.png`;
        a.click();
        showToast?.('Exported flowchart PNG.');
      });
    });
  }, [title, showToast]);

  const handleExportSVG = useCallback(() => {
    const flowEl = document.querySelector('.react-flow') as HTMLElement;
    if (!flowEl) return;
    import('html-to-image').then(({ toSvg }) => {
      toSvg(flowEl, { backgroundColor: '#F8FAFC' }).then(dataUrl => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_flowchart.svg`;
        a.click();
        showToast?.('Exported flowchart SVG.');
      });
    });
  }, [title, showToast]);

  // Confirm Clear
  const confirmClearCanvas = useCallback(() => {
    if (clearInput !== 'DELETE') return;
    setNodes([]);
    setEdges([]);
    pushHistory([], []);
    setIsConfirmingClear(false);
    setClearInput('');
    showToast?.('Cleared flowchart canvas.');
  }, [clearInput, setNodes, setEdges, pushHistory, showToast]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const selectedIds = new Set(nodesRef.current.filter(n => n.selected).map(n => n.id));
        if (selectedIds.size > 0) {
          setNodes(nds => nds.filter(n => !n.selected));
          setEdges(eds => eds.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target)));
          pushHistory(
            nodesRef.current.filter(n => !n.selected),
            edgesRef.current.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target))
          );
          showToast?.('Deleted selected element(s).');
        }
      } else if (e.key === '?') {
        setShortcutsModalOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setDrawerOpen(false);
        setShortcutsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setNodes, setEdges, pushHistory, showToast]);

  return (
    <div className="flex flex-col h-full w-full relative select-none font-sans bg-slate-50 text-text-primary">
      {/* 1. TOP CONTROL TOOLBAR */}
      <div className="px-4 py-2.5 border-b flex items-center justify-between gap-3 shrink-0 flex-wrap z-30 bg-white border-border">
        {/* Left Side: Title & Drawer Open Button */}
        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <GHTooltip content="Open Elements Palette & Inspector">
              <button
                onClick={() => setDrawerOpen(true)}
                className="px-2.5 py-1.5 bg-gh-teal text-white rounded-lg hover:bg-gh-teal-hover transition font-mono font-bold text-[10px] flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Sliders size={14} />
                <span>ELEMENTS</span>
              </button>
            </GHTooltip>
          )}

          <span className="font-sans font-bold text-xs text-text-primary tracking-tight ml-1">
            {title}
          </span>
        </div>

        {/* Right Side: Quick Action Utilities */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {!isReadOnly && (
            <>
              {/* Auto-Arrange with Direction Picker */}
              <div className="relative">
                <GHTooltip content="Auto-arrange flowchart using Dagre">
                  <button
                    onClick={() => setShowDirMenu(s => !s)}
                    className="p-1.5 bg-surface-100 hover:bg-surface-200 border border-border text-text-primary rounded-lg transition flex items-center gap-1 text-[10px] font-bold cursor-pointer font-mono"
                  >
                    <Wind size={12} />
                    <span>ARRANGE</span>
                    <CaretDown size={9} />
                  </button>
                </GHTooltip>

                {showDirMenu && (
                  <div className="absolute top-full mt-1 right-0 bg-white border border-border rounded-xl shadow-xl z-50 py-1 min-w-[150px]">
                    {[
                      { dir: 'TB', label: '↓ Top → Bottom' },
                      { dir: 'LR', label: '→ Left → Right' },
                      { dir: 'BT', label: '↑ Bottom → Top' },
                      { dir: 'RL', label: '← Right → Left' },
                    ].map(({ dir, label }) => (
                      <button
                        key={dir}
                        onClick={() => {
                          setLayoutDir(dir as any);
                          handleAutoLayout(dir as any);
                          setShowDirMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[10px] font-mono hover:bg-slate-100 transition cursor-pointer ${
                          layoutDir === dir ? 'text-gh-teal font-bold' : 'text-text-primary'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Snap Toggle */}
              <GHTooltip content={snapEnabled ? 'Grid Snap ON' : 'Grid Snap OFF'}>
                <button
                  onClick={() => setSnapEnabled(s => !s)}
                  className={`p-1.5 border rounded-lg transition flex items-center gap-1 text-[10px] font-mono font-bold cursor-pointer ${
                    snapEnabled
                      ? 'bg-gh-teal text-white border-gh-teal'
                      : 'bg-white text-text-secondary border-border hover:bg-slate-50'
                  }`}
                >
                  <GridFour size={12} weight={snapEnabled ? 'fill' : 'regular'} />
                  <span>SNAP</span>
                </button>
              </GHTooltip>

              <div className="h-5 w-[1px] bg-border mx-0.5" />

              {/* Undo / Redo */}
              <GHTooltip content="Undo" shortcut="Ctrl+Z">
                <button
                  onClick={undo}
                  className="p-1.5 bg-surface-100 hover:bg-surface-200 border border-border text-text-primary rounded-lg transition flex items-center cursor-pointer"
                >
                  <ArrowCounterClockwise size={13} weight="bold" />
                </button>
              </GHTooltip>

              <GHTooltip content="Redo" shortcut="Ctrl+Y">
                <button
                  onClick={redo}
                  className="p-1.5 bg-surface-100 hover:bg-surface-200 border border-border text-text-primary rounded-lg transition flex items-center cursor-pointer"
                >
                  <ArrowClockwise size={13} weight="bold" />
                </button>
              </GHTooltip>

              {/* Clear Canvas */}
              <GHTooltip content="Clear Canvas">
                <button
                  onClick={() => {
                    if (nodes.length === 0) return;
                    setIsConfirmingClear(true);
                  }}
                  className="p-1.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 border border-red-200 rounded-lg transition flex items-center cursor-pointer"
                >
                  <Trash size={13} weight="bold" />
                </button>
              </GHTooltip>
            </>
          )}

          {/* Export PNG */}
          <GHTooltip content="Export PNG Image">
            <button
              onClick={handleExportPNG}
              className="p-1.5 bg-surface-100 hover:bg-surface-200 border border-border text-text-primary rounded-lg transition flex items-center gap-1 text-[10px] font-mono font-bold cursor-pointer"
            >
              <Export size={12} />
              <span>PNG</span>
            </button>
          </GHTooltip>

          {/* Find */}
          <GHTooltip content="Search Nodes" shortcut="Ctrl+F">
            <button
              onClick={() => setSearchOpen(o => !o)}
              className={`p-1.5 border rounded-lg transition flex items-center gap-1 text-[10px] font-mono font-bold cursor-pointer ${
                searchOpen ? 'bg-gh-teal text-white border-gh-teal' : 'bg-surface-100 border-border text-text-primary hover:bg-surface-200'
              }`}
            >
              <MagnifyingGlass size={12} />
              <span>FIND</span>
            </button>
          </GHTooltip>

          {/* Fit View */}
          <GHTooltip content="Recenter & Fit Canvas">
            <button
              onClick={() => fitView({ duration: 500, padding: 0.15 })}
              className="p-1.5 bg-surface-100 hover:bg-surface-200 border border-border text-text-primary rounded-lg transition flex items-center cursor-pointer"
            >
              <CornersOut size={13} weight="bold" />
            </button>
          </GHTooltip>

          {/* Keyboard Shortcuts Help */}
          <GHTooltip content="Keyboard Shortcuts" shortcut="?">
            <button
              onClick={() => setShortcutsModalOpen(true)}
              className="p-1.5 bg-surface-100 hover:bg-surface-200 border border-border text-text-primary rounded-lg transition flex items-center cursor-pointer"
            >
              <Keyboard size={13} />
            </button>
          </GHTooltip>
        </div>
      </div>

      {/* 2. REACT FLOW CORE ENGINE */}
      <div className="flex-1 min-h-0 relative">
        <FlowchartCanvasContext.Provider value={{
          pushHistory,
          isReadOnly,
          isPersonal,
          onEdgeLabelChange,
          onEdgeDelete,
          onEdgeDataChange,
          onNodeDataChange,
          onNodeDelete,
          onNodeDuplicate,
          milestones: [],
        }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={() => {
              pushHistory(nodesRef.current, edgesRef.current);
            }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{
              type: 'labeled',
              style: { stroke: '#0D9488', strokeWidth: 2 },
              data: { label: '', edgeStyle: 'bezier', strokeStyle: 'solid' },
            }}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable={!isReadOnly}
            nodesConnectable={!isReadOnly}
            elementsSelectable={!isReadOnly}
            snapToGrid={snapEnabled}
            snapGrid={[16, 16]}
            deleteKeyCode=""
            proOptions={{ hideAttribution: true }}
            className="bg-slate-50"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1.2}
              color="#CBD5E1"
            />
            <Controls
              showInteractive={!isReadOnly}
              className="bg-white border border-border rounded-xl shadow-sm overflow-hidden"
            />
            <MiniMap
              pannable={true}
              zoomable={true}
              nodeColor={(node) => {
                const n = node as GHNode;
                return n.data?.color || '#14b8a6';
              }}
              nodeComponent={({ x, y, width, height, color, id }) => {
                const node = nodes.find(n => n.id === id);
                return (
                  <g>
                    <rect x={x} y={y} width={width} height={height} fill={color || '#14b8a6'} rx={3} />
                    <text
                      x={x + width / 2}
                      y={y + height / 2 + 2}
                      textAnchor="middle"
                      fontSize={4}
                      fill="white"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {node?.data?.label?.slice(0, 8) || ''}
                    </text>
                  </g>
                );
              }}
              maskColor="rgba(241, 245, 249, 0.7)"
              className="bg-white border border-border rounded-xl shadow-sm overflow-hidden"
            />

            {/* Collaborative Presence Panel — hidden in personal workspace */}
            {!isPersonal && (otherUserName || activeRole) && (
              <Panel position="top-left" className="pointer-events-auto">
                <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-3 py-1.5 shadow-sm">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-mono text-text-secondary">
                    {otherUserName ?? (activeRole === 'freelancer' ? 'Mia Santos (Client)' : 'Carlo Mendoza (Dev)')} is viewing
                  </span>
                </div>
              </Panel>
            )}

            {/* Search Bar Panel */}
            {searchOpen && (
              <Panel position="top-right" className="pointer-events-auto">
                <div className="bg-white border border-border rounded-xl shadow-md p-2 flex items-center gap-2">
                  <MagnifyingGlass size={13} className="text-text-muted" />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSearchMatchIndex(0); }}
                    placeholder="Find node..."
                    className="text-[11px] font-mono focus:outline-none w-36 text-text-primary bg-transparent"
                  />
                  {searchMatches.length > 0 && (
                    <>
                      <span className="text-[9px] font-mono text-text-muted">
                        {searchMatchIndex + 1}/{searchMatches.length}
                      </span>
                      <button
                        onClick={() => {
                          const next = (searchMatchIndex + 1) % searchMatches.length;
                          setSearchMatchIndex(next);
                          jumpToMatch(searchMatches[next]);
                        }}
                        className="p-0.5 hover:text-gh-teal cursor-pointer"
                      >
                        <ArrowDown size={11} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                    className="text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              </Panel>
            )}

            {/* Multi-Select Badge */}
            {nodes.filter(n => n.selected).length > 1 && (
              <Panel position="top-center">
                <div className="bg-slate-900 text-white text-[10px] font-mono font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                  <CheckSquare size={12} className="text-gh-teal" />
                  {nodes.filter(n => n.selected).length} nodes selected
                  <button
                    onClick={() => {
                      const selectedNodeIds = new Set(nodesRef.current.filter(n => n.selected).map(n => n.id));
                      const remainingNodes = nodesRef.current.filter(n => !n.selected);
                      const remainingEdges = edgesRef.current.filter(e => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target));
                      setNodes(remainingNodes);
                      setEdges(remainingEdges);
                      pushHistory(remainingNodes, remainingEdges);
                      showToast?.('Removed selected elements.');
                    }}
                    className="ml-1 text-red-400 hover:text-red-300 transition cursor-pointer"
                  >
                    <Trash size={11} />
                  </button>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </FlowchartCanvasContext.Provider>
      </div>

      {/* Side Drawer Component */}
      <FlowchartDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAddNode={addNode}
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        onNodeDataChange={onNodeDataChange}
        onEdgeDataChange={onEdgeDataChange}
        onDeleteNode={onNodeDelete}
        onDuplicateNode={onNodeDuplicate}
        onDeleteEdge={onEdgeDelete}
        isReadOnly={isReadOnly}
        isPersonal={isPersonal}
      />

      {/* Clear Canvas Confirmation Modal */}
      {isConfirmingClear && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-border shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-sans font-extrabold text-text-primary mb-1">Clear Flowchart Canvas?</h3>
            <p className="text-[11px] text-text-muted leading-relaxed mb-4">
              To permanently clear "{title}" and discard all diagram processes, type <span className="font-mono font-bold text-red-600">DELETE</span> below. This action cannot be undone.
            </p>
            <input
              type="text"
              value={clearInput}
              onChange={(e) => setClearInput(e.target.value)}
              placeholder="type DELETE"
              className="w-full px-3 py-2 border border-border bg-slate-50 text-[11px] font-mono rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white outline-none mb-4 uppercase text-center"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => {
                  setIsConfirmingClear(false);
                  setClearInput('');
                }}
                className="px-3.5 py-2 hover:bg-slate-100 text-text-secondary text-[11px] font-bold rounded-xl transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                disabled={clearInput !== 'DELETE'}
                onClick={confirmClearCanvas}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-[11px] font-bold rounded-xl transition cursor-pointer"
              >
                CLEAR ALL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {shortcutsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-border shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <Keyboard size={18} className="text-gh-teal" />
                <h3 className="text-sm font-sans font-extrabold text-text-primary">Keyboard Shortcuts</h3>
              </div>
              <button onClick={() => setShortcutsModalOpen(false)} className="text-text-muted hover:text-text-primary p-1">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-[11px] font-mono">
              {[
                { key: 'Ctrl + Z', desc: 'Undo last change' },
                { key: 'Ctrl + Y', desc: 'Redo last change' },
                { key: 'Ctrl + F', desc: 'Find node by label' },
                { key: 'Delete / Backspace', desc: 'Delete selected element(s)' },
                { key: 'Shift + Drag', desc: 'Box multi-select nodes' },
                { key: 'Ctrl + A', desc: 'Select all nodes' },
                { key: 'Escape', desc: 'Close modals / Deselect' },
                { key: '?', desc: 'Open shortcuts guide' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-1.5 px-2 bg-slate-50 rounded-lg">
                  <kbd className="bg-white border border-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700">
                    {item.key}
                  </kbd>
                  <span className="text-text-secondary font-sans font-medium">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FlowchartCanvas(props: FlowchartCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowchartCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
