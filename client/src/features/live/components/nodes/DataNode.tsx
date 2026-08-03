import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GHNode } from '../../lib/flowchart-utils';

export function DataNode({ data }: NodeProps<GHNode>) {
  return (
    <div className="bg-white border border-blue-600 rounded-lg shadow-card px-3 py-2 min-w-[200px]">
      <div className="text-[10px] uppercase tracking-wider text-blue-700">Data</div>
      <div className="font-semibold text-sm">{data.label}</div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
