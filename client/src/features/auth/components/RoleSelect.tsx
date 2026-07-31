import type { UserRole } from '@/types/user';

type SelectableRole = Exclude<UserRole, 'admin'>;

export function RoleSelect({ value, onChange }: { value: SelectableRole; onChange: (r: SelectableRole) => void }) {
  const roles: { id: SelectableRole; label: string; desc: string }[] = [
    { id: 'freelancer', label: 'Freelancer', desc: 'I offer services' },
    { id: 'client', label: 'Client', desc: 'I hire talent' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {roles.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className={`text-left p-3 rounded-md border transition cursor-pointer ${value === r.id ? 'border-gh-teal bg-gh-teal/5' : 'border-border hover:border-gh-teal/50'}`}
        >
          <p className="text-sm font-semibold text-text-primary">{r.label}</p>
          <p className="text-[11px] text-text-muted">{r.desc}</p>
        </button>
      ))}
    </div>
  );
}
