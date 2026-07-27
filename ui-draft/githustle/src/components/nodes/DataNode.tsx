import React, { memo, useContext } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { GHNodeData } from '../../lib/flowchart-utils';
import { FlowchartCanvasContext } from '../FlowchartCanvas';

export default memo(function DataNode({ id, data, selected }: NodeProps) {
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

  const nodeColor = nodeData.color || '#2563EB';

  return (
    <div className="relative min-w-[140px] min-h-[48px] select-none">
      {/* Parallelogram background via CSS skew */}
      <div
        style={{
          transform: 'skewX(-15deg)',
          borderColor: nodeColor,
          borderWidth: '2px',
        }}
        className={`
          absolute inset-0 bg-white rounded-md transition-shadow shadow-sm
          ${selected ? 'shadow-md ring-2 ring-gh-teal' : ''}
        `}
      />

      {/* Un-skewed content container */}
      <div
        style={{ transform: 'skewX(15deg)' }}
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10"
      >
        <input
          type="text"
          disabled={context?.isReadOnly}
          value={nodeData.label}
          onChange={handleLabelChange}
          className="text-[11px] font-sans font-bold text-blue-700 bg-transparent 
                     border-none focus:outline-none text-center w-full nodrag p-0"
        />
        {nodeData.assignedRole && !selected && (
          <span className="text-[7px] font-mono text-blue-800 bg-blue-100/60 px-1 py-0.5 rounded border border-blue-200 uppercase font-bold mt-1 scale-90">
            {nodeData.assignedRole}
          </span>
        )}
      </div>

      {selected && !context?.isReadOnly && (
        <div className="absolute top-[52px] left-0 right-0 bg-white border border-border shadow-md rounded-xl p-2 z-50 nodrag nopan flex flex-col gap-1 w-44">
          <span className="text-[8px] font-mono font-bold text-blue-700">DATA SOURCE CONFIG</span>
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

      <Handle type="target" position={Position.Top} className="!bg-blue-600 !border-white !w-3 !h-3 animate-pulse" />
      <Handle type="source" position={Position.Bottom} className="!bg-blue-600 !border-white !w-3 !h-3" />
    </div>
  );
});
