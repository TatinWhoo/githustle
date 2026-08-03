import { useCallback, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, addEdge, useNodesState, useEdgesState, type Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { layoutGraph, type GHNode, type GHEdge } from '../../lib/flowchart-utils';
import { MilestoneNode } from '../nodes/MilestoneNode';
import { ProcessNode } from '../nodes/ProcessNode';
import { DecisionNode } from '../nodes/DecisionNode';
import { DataNode } from '../nodes/DataNode';
import { InputNode } from '../nodes/InputNode';
import { OutputNode } from '../nodes/OutputNode';
import { DelayNode } from '../nodes/DelayNode';
import { SubprocessNode } from '../nodes/SubprocessNode';
import { TerminalNode } from '../nodes/TerminalNode';
import { NoteNode } from '../nodes/NoteNode';
import { GroupNode } from '../nodes/GroupNode';
import { LabeledEdge } from '../edges/LabeledEdge';
import { FlowchartDrawer } from './FlowchartDrawer';

const nodeTypes = { milestone: MilestoneNode, process: ProcessNode, decision: DecisionNode, data: DataNode, input: InputNode, output: OutputNode, delay: DelayNode, subprocess: SubprocessNode, terminal: TerminalNode, note: NoteNode, group: GroupNode };
const edgeTypes = { labeled: LabeledEdge };

interface Props { initialNodes: GHNode[]; initialEdges: GHEdge[] }
export function FlowchartCanvas({ initialNodes, initialEdges }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<GHNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<GHEdge>(initialEdges);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const onConnect = useCallback((c: Connection) => setEdges((eds) => addEdge({ ...c, type: 'labeled' }, eds)), [setEdges]);
  const tidy = useCallback(() => {
    const laid = layoutGraph(nodes, edges);
    setNodes(laid.nodes);
    setEdges(laid.edges);
  }, [nodes, edges, setNodes, setEdges]);

  return (
    <ReactFlowProvider>
      <div className="h-[500px] border border-border rounded-2xl relative">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView>
          <Background /><Controls />
        </ReactFlow>
        <div className="absolute top-2 right-2 flex gap-2 z-10">
          <button onClick={tidy} className="bg-white border border-border rounded-md px-3 py-1 text-xs">Tidy</button>
          <button onClick={() => setDrawerOpen((v) => !v)} className="bg-gh-teal text-white rounded-md px-3 py-1 text-xs">Nodes</button>
        </div>
        <FlowchartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onInsert={(type) => setNodes((ns) => [...ns, { id: `n_${Date.now()}`, type, position: { x: 100, y: 100 }, data: { label: `${type} node` } }])} />
      </div>
    </ReactFlowProvider>
  );
}
