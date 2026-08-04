interface Props { value: string; onChange: (v: string) => void }

export function HelpSearch({ value, onChange }: Props) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search help…"
      aria-label="Search help articles"
      className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gh-teal"
    />
  );
}
