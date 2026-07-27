import React, { memo, useContext } from 'react';
import { Handle, Position, NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react';
import type { GHNodeData } from '../../lib/flowchart-utils';
import { FlowchartCanvasContext } from '../FlowchartCanvas';
import { Trash, Copy } from '@phosphor-icons/react';

export default memo(function GroupNode({ id, data, selected }: NodeProps) {
  const nodeData = data as GHNodeData;
  const { setNodes } = useReactFlow();
  const context = useContext(FlowchartCanvasContext);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (context) {
      context.onNodeDataChange(id, { label: e.target.value });
    } else {
      setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label: e.target.value } } : n));
    }
  };

  const borderColor = nodeData.color || '#94A3B8';
  const fillColor = nodeData.fillColor || 'rgba(248, 250, 252, 0.6)';

  return (
    <div
      style={{
        borderColor,
        borderWidth: `${nodeData.borderWidth || 2}px`,
        backgroundColor: fillColor,
        width: '100%',
        height: '100%',
        minWidth: 200,
        minHeight: 120,
        opacity: (nodeData.opacity ?? 100) / 100,
        zIndex: selected ? 1000 : undefined,
      }}
      className={`rounded-2xl border-dashed p-3 flex flex-col relative transition-shadow select-none ${
        selected ? 'shadow-md ring-2 ring-gh-teal' : ''
      }`}
    >
      <NodeResizer
        isVisible={!!selected && !context?.isReadOnly}
        minWidth={200}
        minHeight={120}
        lineStyle={{ borderColor, borderWidth: 1 }}
        handleStyle={{ backgroundColor: borderColor, border: '2px solid white', width: 8, height: 8, borderRadius: 2 }}
      />

      {/* Floating Action Bar */}
      {selected && !context?.isReadOnly && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-white border border-border rounded-lg shadow-md px-1.5 py-1 z-50 nodrag nopan">
          <button onClick={() => context?.onNodeDuplicate?.(id)} title="Duplicate" className="p-1 hover:bg-slate-100 rounded text-text-muted hover:text-text-primary transition cursor-pointer">
            <Copy size={11} />
          </button>
          <div className="w-px h-3 bg-border" />
          <button onClick={() => context?.onNodeDelete?.(id)} title="Delete element" className="p-1 hover:bg-red-50 rounded text-text-muted hover:text-red-600 transition cursor-pointer">
            <Trash size={11} />
          </button>
        </div>
      )}

      {/* Header Label */}
      <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-200/60">
        <input
          type="text"
          disabled={context?.isReadOnly}
          value={nodeData.label}
          onChange={handleLabelChange}
          placeholder="Group Title..."
          style={{ fontSize: `${nodeData.fontSize || 12}px`, color: nodeData.textColor || '#334155' }}
          className="font-sans font-bold bg-transparent border-none focus:outline-none w-full nodrag p-0 uppercase tracking-wider text-[11px]"
        />
      </div>

      {/* 4-point handles */}
      <Handle type="target" position={Position.Top}    id="t-top"    className="!bg-slate-500 !border-white !w-3 !h-3" />
      <Handle type="source" position={Position.Top}    id="s-top"    className="!bg-slate-500 !border-white !w-3 !h-3" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="!bg-slate-500 !border-white !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="!bg-slate-500 !border-white !w-3 !h-3" />
      <Handle type="target" position={Position.Left}   id="t-left"   className="!bg-slate-500 !border-white !w-3 !h-3" />
      <Handle type="source" position={Position.Left}   id="s-left"   className="!bg-slate-500 !border-white !w-3 !h-3" />
      <Handle type="target" position={Position.Right}  id="t-right"  className="!bg-slate-500 !border-white !w-3 !h-3" />
      <Handle type="source" position={Position.Right}  id="s-right"  className="!bg-slate-500 !border-white !w-3 !h-3" />
    </div>
  );
});
