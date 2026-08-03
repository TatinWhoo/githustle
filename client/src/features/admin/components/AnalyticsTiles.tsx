import { GHCard } from '@/components/primitives/GHCard';
import { MoneyPHP } from '@/components/primitives/MoneyPHP';
import { useAnalytics } from '../hooks/useAdminData';

export function AnalyticsTiles() {
  const { data } = useAnalytics();
  if (!data) return null;
  const items = [
    {
      label: 'Total users',
      value: data.totalUsers.toLocaleString(),
      delta: `${data.totalUsersWow >= 0 ? '+' : ''}${data.totalUsersWow}% WoW`,
    },
    {
      label: 'GMV (month)',
      value: <MoneyPHP amount={data.gmvMonth} />,
      delta: `${data.gmvMonthWow >= 0 ? '+' : ''}${data.gmvMonthWow}% WoW`,
    },
    {
      label: 'Disputes',
      value: `${data.disputesTotal} (${data.disputesOpen} open)`,
      delta: '',
    },
    {
      label: 'Uptime',
      value: `${data.uptimePct.toFixed(2)}%`,
      delta: '',
    },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((i) => (
        <GHCard key={i.label} className="p-4">
          <div className="text-xs text-text-muted">{i.label}</div>
          <div className="text-lg font-semibold mt-1">{i.value}</div>
          {i.delta && <div className="text-[11px] text-text-secondary mt-1">{i.delta}</div>}
        </GHCard>
      ))}
    </div>
  );
}
