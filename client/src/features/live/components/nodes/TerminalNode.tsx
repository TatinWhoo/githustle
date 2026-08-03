import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GHNode } from '../../lib/flowchart-utils';

export function TerminalNode({ data }: NodeProps<GHNode>) {
  return (
    <div className="bg-white border border-emerald-600 rounded-full shadow-card px-4 py-2 min-w-[200px]">
      <div className="text-[10px] uppercase tracking-wider text-emerald-700">Terminal</div>
      <div className="font-semibold text-sm">{data.label}</div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
