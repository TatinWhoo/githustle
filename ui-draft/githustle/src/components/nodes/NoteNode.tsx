import React, { memo, useContext } from 'react';
import { Handle, Position, useReactFlow, NodeResizer, type NodeProps } from '@xyflow/react';
import type { GHNodeData } from '../../lib/flowchart-utils';
import { FlowchartCanvasContext } from '../FlowchartCanvas';

export default memo(function NoteNode({ id, data, selected }: NodeProps) {
  const nodeData = data as GHNodeData;
  const { setNodes } = useReactFlow();
  const context = useContext(FlowchartCanvasContext);

  const handleLabelChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (context) {
      context.onNodeDataChange(id, { label: e.target.value });
    } else {
      setNodes(nds =>
        nds.map(n => (n.id === id ? { ...n, data: { ...n.data, label: e.target.value } } : n))
      );
    }
  };

  const nodeColor = nodeData.color || '#F59E0B';

  return (
    <div
      style={{
        backgroundColor: '#FEF08A', // soft yellow sticky
        borderColor: nodeColor,
        borderWidth: '1px',
        width: '100%',
        height: '100%',
      }}
      className={`
        p-2.5 rounded-lg flex flex-col shadow-sm relative transition-shadow min-w-[120px] min-h-[60px] select-none
        ${selected ? 'shadow-md ring-2 ring-gh-teal' : ''}
      `}
    >
      <NodeResizer minWidth={120} minHeight={60} isVisible={!!selected} />
      
      {/* Dog-ear corner fold style */}
      <div className="absolute top-0 right-0 w-3 h-3 bg-amber-200 rounded-bl-md border-l border-b border-amber-300" />
      
      <textarea
        disabled={context?.isReadOnly}
        value={nodeData.label}
        onChange={handleLabelChange}
        placeholder="Enter note..."
        className="w-full h-full text-[10px] font-mono leading-relaxed text-amber-900 bg-transparent 
                   border-none focus:outline-none resize-none nodrag p-0"
      />

      {nodeData.assignedRole && !selected && (
        <span className="text-[7px] font-mono text-amber-800 bg-amber-100/60 px-1 py-0.5 rounded border border-amber-300 uppercase font-bold mt-1 max-w-max">
          {nodeData.assignedRole}
        </span>
      )}

      {selected && !context?.isReadOnly && (
        <div className="absolute bottom-[100%] mb-1 left-0 right-0 bg-white border border-border shadow-md rounded-xl p-1.5 z-50 nodrag nopan flex flex-col gap-1 w-full">
          <input
            type="text"
            placeholder="Assign Owner..."
            value={nodeData.assignedRole || ''}
            onChange={(e) => context?.onNodeDataChange(id, { assignedRole: e.target.value })}
            className="text-[8px] font-sans text-text-secondary bg-slate-50 border border-slate-200/80 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-gh-teal w-full text-left"
          />
        </div>
      )}

      <Handle type="target" position={Position.Top} className="!bg-amber-600 !border-white !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Bottom} className="!bg-amber-600 !border-white !w-2.5 !h-2.5" />
    </div>
  );
});
