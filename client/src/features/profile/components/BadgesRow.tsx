import { GHTag } from '@/components/primitives/GHTag';

export function BadgesRow({ badges = ['Verified', 'Top rated'] }: { badges?: string[] }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {badges.map((b) => (
        <GHTag key={b} tone="teal">
          {b}
        </GHTag>
      ))}
    </div>
  );
}
