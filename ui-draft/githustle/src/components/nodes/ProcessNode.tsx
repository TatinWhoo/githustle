import React, { memo, useContext } from 'react';
import { Handle, Position, NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react';
import type { GHNodeData } from '../../lib/flowchart-utils';
import { FlowchartCanvasContext } from '../FlowchartCanvas';
import { Trash, Copy } from '@phosphor-icons/react';

export default memo(function ProcessNode({ id, data, selected }: NodeProps) {
  const nodeData = data as GHNodeData;
  const { setNodes } = useReactFlow();
  const context = useContext(FlowchartCanvasContext);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (context) {
      context.onNodeDataChange(id, { label: e.target.value });
    } else {
      setNodes(nds =>
        nds.map(n => (n.id === id ? { ...n, data: { ...n.data, label: e.target.value } } : n))
      );
    }
  };

  const borderColor = nodeData.color || '#14b8a6';
  const fillColor = nodeData.fillColor || '#ffffff';

  return (
    <div
      style={{
        borderColor,
        borderWidth: `${nodeData.borderWidth || 2}px`,
        backgroundColor: fillColor,
        opacity: (nodeData.opacity ?? 100) / 100,
        zIndex: selected ? 1000 : undefined,
        width: '100%',
        height: '100%',
      }}
      className={`
        min-w-[140px] min-h-[48px] px-3 py-2 rounded-md border
        flex flex-col items-center justify-center text-center
        shadow-sm transition-shadow relative select-none
        ${selected ? 'shadow-md ring-2 ring-gh-teal' : ''}
      `}
    >
      <NodeResizer
        isVisible={!!selected && !context?.isReadOnly}
        minWidth={100}
        minHeight={36}
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

      <input
        type="text"
        disabled={context?.isReadOnly}
        value={nodeData.label}
        onChange={handleLabelChange}
        style={{ fontSize: `${nodeData.fontSize || 11}px`, color: nodeData.textColor || undefined }}
        className="font-sans font-semibold text-text-primary bg-transparent 
                   border-none focus:outline-none text-center w-full nodrag p-0"
      />
      {nodeData.description && !selected && (
        <p className="text-[9px] text-text-muted mt-0.5 max-w-[120px] truncate">{nodeData.description}</p>
      )}
      {!context?.isPersonal && nodeData.assignedRole && !selected && (
        <span className="text-[8px] font-mono text-gh-teal bg-teal-50 px-1 py-0.5 rounded border border-teal-200/50 uppercase font-bold mt-1">
          {nodeData.assignedRole}
        </span>
      )}

      {selected && !context?.isReadOnly && (
        <div className="mt-2 w-full pt-2 border-t border-slate-100 flex flex-col gap-1 nodrag nopan">
          <input
            type="text"
            placeholder="Description..."
            value={nodeData.description || ''}
            onChange={(e) => context?.onNodeDataChange(id, { description: e.target.value })}
            className="text-[9px] font-sans text-text-secondary bg-slate-50 border border-slate-200/80 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-gh-teal w-full text-left"
          />
          {!context?.isPersonal && (
            <input
              type="text"
              placeholder="Assign Owner..."
              value={nodeData.assignedRole || ''}
              onChange={(e) => context?.onNodeDataChange(id, { assignedRole: e.target.value })}
              className="text-[8px] font-sans text-text-secondary bg-slate-50 border border-slate-200/80 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-gh-teal w-full text-left"
            />
          )}
        </div>
      )}

      {/* 4-Point Source & Target Handles */}
      <Handle type="target" position={Position.Top}    id="t-top"    className="!bg-gh-teal !border-white !w-3 !h-3" />
      <Handle type="source" position={Position.Top}    id="s-top"    className="!bg-gh-teal !border-white !w-3 !h-3" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="!bg-gh-teal !border-white !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="!bg-gh-teal !border-white !w-3 !h-3" />
      <Handle type="target" position={Position.Left}   id="t-left"   className="!bg-gh-teal !border-white !w-3 !h-3" />
      <Handle type="source" position={Position.Left}   id="s-left"   className="!bg-gh-teal !border-white !w-3 !h-3" />
      <Handle type="target" position={Position.Right}  id="t-right"  className="!bg-gh-teal !border-white !w-3 !h-3" />
      <Handle type="source" position={Position.Right}  id="s-right"  className="!bg-gh-teal !border-white !w-3 !h-3" />
    </div>
  );
});
