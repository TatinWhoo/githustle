import type { BoardElement } from '@/types/domain';
export function Whiteboard({ elements }: { elements: BoardElement[] }) {
  return (
    <div className="relative bg-surface-1 border border-border rounded-2xl h-[400px] overflow-hidden">
      {elements.map((el) => (
        <div
          key={el.id}
          style={{ position: 'absolute', top: el.y, left: el.x, width: el.w, height: el.h, background: el.color ?? '#0F1923', color: '#fff' }}
          className={`${el.kind === 'circle' ? 'rounded-full' : 'rounded-md'} text-xs flex items-center justify-center`}
        >{el.label ?? ''}</div>
      ))}
    </div>
  );
}
