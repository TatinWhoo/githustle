import React, { memo, useContext } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import type { GHEdgeData, EdgeStyle, EdgeStroke } from '../../lib/flowchart-utils';
import { FlowchartCanvasContext } from '../FlowchartCanvas';

export default memo(function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
  style,
}: EdgeProps) {
  const edgeData = data as GHEdgeData | undefined;
  const { setEdges } = useReactFlow();
  const context = useContext(FlowchartCanvasContext);

  const pathStyle = edgeData?.edgeStyle || 'bezier';
  let edgePath = '';
  let labelX = 0;
  let labelY = 0;

  if (pathStyle === 'straight') {
    [edgePath, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
  } else if (pathStyle === 'step') {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  } else {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  }

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (context) {
      context.onEdgeLabelChange(id, e.target.value);
    } else {
      setEdges(eds =>
        eds.map(edge =>
          edge.id === id ? { ...edge, data: { ...edge.data, label: e.target.value } } : edge
        )
      );
    }
  };

  const handleDelete = () => {
    if (context) {
      context.onEdgeDelete(id);
    } else {
      setEdges(eds => eds.filter(edge => edge.id !== id));
    }
  };

  const isAnimated = edgeData?.strokeStyle === 'animated';
  const isDashed = edgeData?.strokeStyle === 'dashed';

  return (
    <>
      <style>{`
        @keyframes gh-edge-dash {
          to {
            stroke-dashoffset: -20;
          }
        }
      `}</style>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? '#0D9488' : (edgeData?.edgeColor || '#94A3B8'),
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray: isDashed || isAnimated ? '5,5' : undefined,
          animation: isAnimated ? 'gh-edge-dash 1s linear infinite' : undefined,
        }}
      />
      <EdgeLabelRenderer>
        {(selected || (edgeData?.label && edgeData.label.trim().length > 0)) && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan flex items-center gap-0.5 z-50 select-none"
          >
            {context?.isReadOnly ? (
              edgeData?.label ? (
                <span className="bg-white border border-gh-teal/30 rounded px-1.5 py-0.5 text-[9px] font-mono text-center shadow-sm text-text-primary">
                  {edgeData.label}
                </span>
              ) : null
            ) : (
              <input
                type="text"
                value={edgeData?.label || ''}
                onChange={handleLabelChange}
                placeholder="label"
                className={`
                  bg-white border rounded px-1.5 py-0.5 text-[9px] font-mono text-center 
                  w-20 shadow-sm focus:outline-none focus:ring-1 focus:ring-gh-teal transition
                  ${edgeData?.label ? 'border-gh-teal/40 text-text-primary' : 'border-border/60 opacity-70 text-text-muted'}
                `}
              />
            )}

            {/* Styling menu popup */}
            {selected && !context?.isReadOnly && (
              <div className="flex items-center gap-1 bg-white border border-border shadow-md rounded-lg px-1.5 py-0.5 ml-1">
                <select
                  value={edgeData?.edgeStyle || 'bezier'}
                  onChange={(e) => context?.onEdgeDataChange?.(id, { edgeStyle: e.target.value as EdgeStyle })}
                  className="text-[8px] font-mono bg-transparent border-0 outline-none cursor-pointer text-text-primary py-0"
                >
                  <option value="bezier">Bezier</option>
                  <option value="straight">Line</option>
                  <option value="step">Step</option>
                </select>
                <div className="w-[1px] h-3 bg-border" />
                <select
                  value={edgeData?.strokeStyle || 'solid'}
                  onChange={(e) => context?.onEdgeDataChange?.(id, { strokeStyle: e.target.value as EdgeStroke })}
                  className="text-[8px] font-mono bg-transparent border-0 outline-none cursor-pointer text-text-primary py-0"
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dash</option>
                  <option value="animated">Flow</option>
                </select>
              </div>
            )}

            {/* Delete edge button */}
            {selected && !context?.isReadOnly && (
              <button
                onClick={handleDelete}
                className="bg-white hover:bg-red-50 hover:text-red-600 text-red-500 border border-border 
                           w-4 h-4 rounded-full flex items-center justify-center 
                           text-[8px] font-bold shadow-sm transition cursor-pointer ml-0.5"
                title="Remove connection"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
});
