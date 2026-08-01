import { useUiStore } from '@/stores/ui.store';

const roles = ['freelancer', 'client', 'admin'] as const;

export function RoleSimulator() {
  if (import.meta.env.VITE_ENABLE_ROLE_SIMULATOR !== 'true') return null;
  const sim = useUiStore((s) => s.roleSimulator);
  const set = useUiStore((s) => s.setSimulatedRole);
  const current = sim.isSimulating ? sim.simulatedRole : null;
  return (
    <div className="flex items-center gap-1 text-[10px] font-medium">
      <span className="uppercase tracking-wider text-white/50">Simulate</span>
      {roles.map((r) => (
        <button
          key={r}
          onClick={() => set(current === r ? null : r)}
          aria-pressed={current === r}
          className={`px-1.5 py-0.5 rounded ${current === r ? 'bg-gh-teal text-white' : 'text-white/70 hover:bg-white/10'}`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
