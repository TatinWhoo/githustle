import { useUiStore } from '@/stores/ui.store';

export function PreferencesSection() {
  const motionPref = useUiStore((s) => s.motionPref);
  const setMotionPref = useUiStore((s) => s.setMotionPref);

  return (
    <section id="preferences">
      <h2 className="font-display text-lg mb-3">Preferences</h2>
      <div className="flex flex-col gap-3 text-sm">
        <div>
          <label className="block mb-1 text-xs text-text-muted">Theme</label>
          <select
            disabled
            defaultValue="light"
            className="border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="light">Light</option>
            <option value="dark" disabled>Dark (soon)</option>
          </select>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={motionPref === 'reduce'}
            onChange={(e) => setMotionPref(e.target.checked ? 'reduce' : 'auto')}
          />
          Reduce motion
        </label>
      </div>
    </section>
  );
}
