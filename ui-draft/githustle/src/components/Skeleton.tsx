import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-slate-100 via-slate-200/60 to-slate-100 rounded-lg ${className}`}
      style={{ width, height }}
    />
  );
}
