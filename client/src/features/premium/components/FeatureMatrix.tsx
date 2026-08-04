const ROWS = [
  { feature: 'Proposals per month', free: '5', pro: 'Unlimited', team: 'Unlimited' },
  { feature: 'Priority placement', free: '—', pro: '✓', team: '✓' },
  { feature: 'Escrow analytics', free: '—', pro: '✓', team: '✓' },
  { feature: 'Team seats', free: '1', pro: '1', team: '5' },
  { feature: 'Custom fields', free: '—', pro: '—', team: '✓' },
  { feature: 'Admin export', free: '—', pro: '—', team: '✓' },
  { feature: 'Priority support', free: '—', pro: '—', team: '✓' },
];

export function FeatureMatrix() {
  return (
    <div className="mt-10 border border-black/10 rounded-2xl overflow-hidden">
      <table className="w-full text-sm font-serif">
        <thead>
          <tr style={{ backgroundColor: 'rgba(253, 251, 247, 0.5)' }}>
            <th className="text-left p-3 sticky left-0 font-medium" style={{ backgroundColor: 'rgba(253, 251, 247, 0.5)' }}>
              Feature
            </th>
            <th className="p-3 font-medium text-center">Free</th>
            <th className="p-3 font-medium text-center" style={{ color: 'var(--color-gh-teal)' }}>Pro</th>
            <th className="p-3 font-medium text-center">Team</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10">
          {ROWS.map((r) => (
            <tr key={r.feature}>
              <td
                className="p-3 sticky left-0"
                style={{ backgroundColor: 'var(--color-cream)', color: 'var(--color-text-primary)' }}
              >
                {r.feature}
              </td>
              <td className="p-3 text-center" style={{ color: 'var(--color-text-secondary)' }}>{r.free}</td>
              <td className="p-3 text-center font-medium" style={{ color: r.pro === '✓' ? 'var(--color-gh-teal)' : 'var(--color-text-secondary)' }}>{r.pro}</td>
              <td className="p-3 text-center font-medium" style={{ color: r.team === '✓' ? 'var(--color-gh-ink)' : 'var(--color-text-secondary)' }}>{r.team}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
