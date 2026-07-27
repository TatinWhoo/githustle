import React, { memo, useContext } from 'react';
import { Handle, Position, NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react';
import type { GHNodeData } from '../../lib/flowchart-utils';
import { FlowchartCanvasContext } from '../FlowchartCanvas';
import { Trash, Copy } from '@phosphor-icons/react';

export default memo(function InputNode({ id, data, selected }: NodeProps) {
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

  const nodeColor = nodeData.color || '#7C3AED';
  const fillColor = nodeData.fillColor || '#ffffff';

  return (
    <div className="relative select-none w-full h-full" style={{ minWidth: 140, minHeight: 48, opacity: (nodeData.opacity ?? 100) / 100, zIndex: selected ? 1000 : undefined }}>
      <NodeResizer
        isVisible={!!selected && !context?.isReadOnly}
        minWidth={100}
        minHeight={36}
        lineStyle={{ borderColor: nodeColor, borderWidth: 1 }}
        handleStyle={{ backgroundColor: nodeColor, border: '2px solid white', width: 8, height: 8, borderRadius: 2 }}
      />

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

      {/* Trapezoid SVG background (wide top, narrow bottom) */}
      <div className="absolute inset-0 pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 140 48" preserveAspectRatio="none">
          <polygon
            points="0,0 140,0 120,48 20,48"
            fill={fillColor}
            stroke={nodeColor}
            strokeWidth={nodeData.borderWidth || 2}
          />
        </svg>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
        <input
          type="text"
          disabled={context?.isReadOnly}
          value={nodeData.label}
          onChange={handleLabelChange}
          style={{ fontSize: `${nodeData.fontSize || 11}px`, color: nodeData.textColor || '#6D28D9' }}
          className="font-sans font-bold bg-transparent border-none focus:outline-none text-center w-full nodrag p-0"
        />
        {!context?.isPersonal && nodeData.assignedRole && !selected && (
          <span className="text-[7px] font-mono text-purple-800 bg-purple-100/60 px-1 py-0.5 rounded border border-purple-200 uppercase font-bold mt-0.5">
            {nodeData.assignedRole}
          </span>
        )}
      </div>

      {/* 4-point handles */}
      <Handle type="target" position={Position.Top}    id="t-top"    className="!bg-purple-600 !border-white !w-3 !h-3" />
      <Handle type="source" position={Position.Top}    id="s-top"    className="!bg-purple-600 !border-white !w-3 !h-3" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="!bg-purple-600 !border-white !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="!bg-purple-600 !border-white !w-3 !h-3" />
      <Handle type="target" position={Position.Left}   id="t-left"   className="!bg-purple-600 !border-white !w-3 !h-3" />
      <Handle type="source" position={Position.Left}   id="s-left"   className="!bg-purple-600 !border-white !w-3 !h-3" />
      <Handle type="target" position={Position.Right}  id="t-right"  className="!bg-purple-600 !border-white !w-3 !h-3" />
      <Handle type="source" position={Position.Right}  id="s-right"  className="!bg-purple-600 !border-white !w-3 !h-3" />
    </div>
  );
});
