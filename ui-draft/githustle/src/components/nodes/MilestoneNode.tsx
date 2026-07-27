import { memo, useContext } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { GHNodeData } from '../../lib/flowchart-utils';
import { FlowchartCanvasContext } from '../FlowchartCanvas';

export default memo(function MilestoneNode({ id, data, selected }: NodeProps) {
  const nodeData = data as GHNodeData;
  const { setNodes } = useReactFlow();
  const context = useContext(FlowchartCanvasContext);

  const handleFieldChange = (field: keyof GHNodeData, value: any) => {
    if (context) {
      context.onNodeDataChange(id, { [field]: value });
    } else {
      setNodes(nds =>
        nds.map(n => (n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n))
      );
    }
  };

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'approved':
        return { bg: 'bg-green-50', text: 'text-emerald-700', border: 'border-emerald-200' };
      case 'submitted':
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
      case 'rejected':
        return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
      case 'revision_requested':
        return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
      default:
        return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
    }
  };

  const statusStyle = getStatusStyle(nodeData.milestoneStatus);

  return (
    <div
      style={{ borderColor: '#0D9488' }}
      className={`
        min-w-[200px] px-3.5 py-2.5 bg-white rounded-2xl border-2 shadow-sm relative transition-shadow select-none
        ${selected ? 'shadow-md ring-2 ring-gh-teal' : ''}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-teal-700 !border-white !w-3 !h-3" />
      
      {/* Title */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[11px] text-teal-600 font-bold">✓</span>
        <input
          type="text"
          disabled={context?.isReadOnly}
          value={nodeData.label}
          onChange={(e) => handleFieldChange('label', e.target.value)}
          placeholder="Milestone Title"
          className="text-[11px] font-sans font-bold text-text-primary bg-transparent 
                     border-none focus:outline-none w-full nodrag p-0"
        />
      </div>

      {/* Amount and Status Pill */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] font-mono font-bold text-teal-700">₱</span>
          <input
            type="text"
            disabled={context?.isReadOnly}
            value={nodeData.milestoneAmount !== undefined ? nodeData.milestoneAmount.toLocaleString('en-PH') : ''}
            onChange={(e) => {
              const num = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
              handleFieldChange('milestoneAmount', isNaN(num) ? 0 : num);
            }}
            placeholder="0"
            className="text-[10px] font-mono font-bold text-teal-700 bg-transparent border-none focus:outline-none w-20 nodrag p-0"
          />
        </div>

        <select
          disabled={context?.isReadOnly}
          value={nodeData.milestoneStatus || 'pending'}
          onChange={(e) => handleFieldChange('milestoneStatus', e.target.value)}
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border nodrag cursor-pointer outline-none ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
        >
          <option value="pending">PENDING</option>
          <option value="submitted">SUBMITTED</option>
          <option value="approved">APPROVED</option>
          <option value="rejected">REJECTED</option>
          <option value="revision_requested">REVISION</option>
        </select>
      </div>

      {/* Due Date */}
      <div className="flex items-center gap-1 mt-1 text-[9px] text-text-muted">
        <span className="font-medium">Due:</span>
        <input
          type="date"
          disabled={context?.isReadOnly}
          value={nodeData.milestoneDueDate || ''}
          onChange={(e) => handleFieldChange('milestoneDueDate', e.target.value)}
          className="bg-transparent border-none font-mono text-[9px] text-text-primary focus:outline-none nodrag p-0 w-24"
        />
      </div>

      {!context?.isPersonal && nodeData.assignedRole && !selected && (
        <span className="text-[8px] font-mono text-teal-700 bg-teal-50 px-1 py-0.5 rounded border border-teal-200 uppercase font-bold mt-2 inline-block">
          {nodeData.assignedRole}
        </span>
      )}

      {!context?.isPersonal && selected && !context?.isReadOnly && (
        <div className="mt-2.5 w-full pt-2 border-t border-slate-100 flex flex-col gap-1 nodrag nopan">
          <input
            type="text"
            placeholder="Assign Owner..."
            value={nodeData.assignedRole || ''}
            onChange={(e) => handleFieldChange('assignedRole', e.target.value)}
            className="text-[8px] font-sans text-text-secondary bg-slate-50 border border-slate-200/80 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-gh-teal w-full text-left"
          />
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-teal-700 !border-white !w-3 !h-3" />
    </div>
  );
});
