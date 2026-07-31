interface Props {
  title: string;
}

export function PlaceholderPage({ title }: Props) {
  return (
    <div className="grid flex-1 place-items-center text-text-muted">
      <p className="text-lg font-semibold">{title}</p>
    </div>
  );
}
