import React, { memo, useContext } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { GHNodeData } from '../../lib/flowchart-utils';
import { FlowchartCanvasContext } from '../FlowchartCanvas';

export default memo(function DecisionNode({ id, data, selected }: NodeProps) {
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

  return (
    <div className="relative" style={{ width: 110, height: 110 }}>
      {/* Diamond shape via SVG background */}
      <div className="absolute inset-0 pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 110 110">
          <polygon
            points="55,2 108,55 55,108 2,55"
            fill="#FEF3C7"
            stroke={nodeData.color || '#D97706'}
            strokeWidth={selected ? "4" : "2"}
          />
        </svg>
      </div>

      {/* Label sits on top, centered, NO rotation */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4 select-none">
        <input
          type="text"
          disabled={context?.isReadOnly}
          value={nodeData.label}
          onChange={handleLabelChange}
          className="text-[10px] font-bold text-amber-700 bg-transparent border-none 
                     focus:outline-none text-center w-full nodrag p-0"
        />
        {nodeData.assignedRole && !selected && (
          <span className="text-[7px] font-mono text-amber-800 bg-amber-100/60 px-1 py-0.5 rounded border border-amber-300 uppercase font-bold mt-1 scale-90">
            {nodeData.assignedRole}
          </span>
        )}
      </div>

      {selected && !context?.isReadOnly && (
        <div className="absolute top-[115px] left-0 right-0 bg-white border border-border shadow-md rounded-xl p-2 z-50 nodrag nopan flex flex-col gap-1 w-44 -translate-x-[35px]">
          <span className="text-[8px] font-mono font-bold text-amber-700">DECISION CONFIG</span>
          <input
            type="text"
            placeholder="Description..."
            value={nodeData.description || ''}
            onChange={(e) => context?.onNodeDataChange(id, { description: e.target.value })}
            className="text-[9px] font-sans text-text-secondary bg-slate-50 border border-slate-200/80 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-gh-teal w-full text-left"
          />
          <input
            type="text"
            placeholder="Assign Owner..."
            value={nodeData.assignedRole || ''}
            onChange={(e) => context?.onNodeDataChange(id, { assignedRole: e.target.value })}
            className="text-[8px] font-sans text-text-secondary bg-slate-50 border border-slate-200/80 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-gh-teal w-full text-left"
          />
        </div>
      )}

      {/* Handles at 4 points of diamond */}
      <Handle type="target" position={Position.Top} style={{ top: 0, left: '50%' }}
        className="!bg-amber-600 !border-white !w-3 !h-3" />
      <Handle type="source" position={Position.Right} style={{ top: '50%', right: 0 }}
        className="!bg-amber-600 !border-white !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} style={{ bottom: 0, left: '50%' }}
        className="!bg-amber-600 !border-white !w-3 !h-3" />
      <Handle type="target" position={Position.Left} style={{ top: '50%', left: 0 }}
        className="!bg-amber-600 !border-white !w-3 !h-3" />
    </div>
  );
});
