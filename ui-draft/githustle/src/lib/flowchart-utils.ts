import type { Node, Edge } from '@xyflow/react';
import dagre from '@dagrejs/dagre';

// GitHustle node types — 6 original + 5 new extended types
export type GHNodeType =
  | 'process'    // Rectangle (standard step)
  | 'decision'   // Diamond (branch/condition)
  | 'terminal'   // Stadium/pill (start/end)
  | 'data'       // Parallelogram (I/O)
  | 'note'       // Sticky note
  | 'milestone'  // Milestone card with status
  | 'group'      // Container/swimlane
  | 'input'      // Trapezoid wide-top (user input)
  | 'output'     // Trapezoid wide-bottom (display/output)
  | 'delay'      // D-shape / half-rounded rect
  | 'subprocess'; // Double-border rectangle (sub-process)

export type GHNodeData = {
  label: string;
  // Appearance
  color?: string;          // border/accent color
  fillColor?: string;      // background fill color
  borderWidth?: number;    // 1 | 2 | 3
  opacity?: number;        // 0–100
  fontSize?: number;       // 9 | 10 | 11 | 12
  fontWeight?: 'normal' | 'medium' | 'bold';
  textColor?: string;
  // Content
  description?: string;
  assignedRole?: string;
  locked?: boolean;        // prevent dragging
  // Milestone-specific
  milestoneStatus?: 'pending' | 'in-review' | 'approved' | 'overdue' | 'submitted' | 'rejected' | 'revision_requested';
  milestoneAmount?: number;
  milestoneDueDate?: string;
};

export type EdgeStyle = 'bezier' | 'straight' | 'step';
export type EdgeStroke = 'solid' | 'dashed' | 'animated';

export type GHEdgeData = {
  label?: string;
  edgeStyle?: EdgeStyle;
  strokeStyle?: EdgeStroke;
  edgeColor?: string;      // custom stroke color
};

export type GHNode = Node<GHNodeData, GHNodeType>;
export type GHEdge = Edge<GHEdgeData>;

export const NODE_DEFAULTS: Record<GHNodeType, { width: number; height: number }> = {
  process:    { width: 140, height: 48  },
  decision:   { width: 110, height: 110 },
  terminal:   { width: 120, height: 44  },
  data:       { width: 140, height: 48  },
  note:       { width: 160, height: 80  },
  milestone:  { width: 200, height: 80  },
  group:      { width: 300, height: 200 },
  input:      { width: 140, height: 48  },
  output:     { width: 140, height: 48  },
  delay:      { width: 140, height: 48  },
  subprocess: { width: 160, height: 52  },
};

export const GH_NODE_COLORS = [
  '#14b8a6', // teal (default)
  '#D97706', // amber
  '#16A34A', // green
  '#DC2626', // red
  '#2563EB', // blue
  '#7C3AED', // violet
  '#1E2D3D', // ink
  '#F59E0B', // yellow
  '#EC4899', // pink
  '#0EA5E9', // sky
];

export const GH_NODE_FILLS = [
  '#ffffff',   // white (default)
  '#F0FDFA',   // teal-50
  '#FFF7ED',   // amber-50
  '#F0FDF4',   // green-50
  '#FEF2F2',   // red-50
  '#EFF6FF',   // blue-50
  '#F5F3FF',   // violet-50
  '#FEF3C7',   // yellow-100
  '#FDF2F8',   // pink-50
  '#F0F9FF',   // sky-50
];

/**
 * Auto-layout graph using Dagre.
 * @param direction 'TB' | 'LR' | 'BT' | 'RL'
 */
export function layoutGraph(
  nodes: GHNode[],
  edges: GHEdge[],
  direction: 'TB' | 'LR' | 'BT' | 'RL' = 'TB'
): GHNode[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80 });

  nodes.forEach(node => {
    const dims = NODE_DEFAULTS[node.type as GHNodeType] || { width: 140, height: 48 };
    dagreGraph.setNode(node.id, {
      width: node.width || dims.width,
      height: node.height || dims.height,
    });
  });

  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map(node => {
    const pos = dagreGraph.node(node.id);
    const dims = NODE_DEFAULTS[node.type as GHNodeType] || { width: 140, height: 48 };
    return {
      ...node,
      position: {
        x: pos.x - (node.width || dims.width) / 2,
        y: pos.y - (node.height || dims.height) / 2,
      },
    };
  });
}
